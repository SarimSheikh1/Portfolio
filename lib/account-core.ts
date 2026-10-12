export type Statement={bind(...values:unknown[]):Statement;first<T=Record<string,unknown>>():Promise<T|null>;run():Promise<unknown>};
export type Database={prepare(sql:string):Statement;batch(statements:Statement[]):Promise<unknown>};
export type Account={id:string;name:string;email:string;role?:string};
type StoredUser=Account&{password_hash:string;salt:string;iterations:number};
const SESSION_COOKIE='wa_session';const SESSION_SECONDS=60*60*24*7;const ITERATIONS=100000;
const encoder=new TextEncoder();
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const fromHex=(value:string)=>new Uint8Array(value.match(/.{2}/g)!.map(v=>parseInt(v,16)));
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export async function digest(value:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))))}
export async function passwordHash(password:string,salt:string,iterations=ITERATIONS){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:fromHex(salt),iterations,hash:'SHA-256'},key,256)))}
function same(a:string,b:string){if(a.length!==b.length)return false;let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0}
function sessionToken(request:Request){const cookie=request.headers.get('cookie')||'';const token=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(SESSION_COOKIE+'='))?.slice(SESSION_COOKIE.length+1);return token&&/^[a-f0-9]{64}$/.test(token)?token:null}
function json(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}})}
function cookie(request:Request,token:string,age=SESSION_SECONDS){const secure=new URL(request.url).protocol==='https:'?'; Secure':'';return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure}`}
export async function getAccount(request:Request,db:Database):Promise<Account|null>{const token=sessionToken(request);if(!token)return null;const account=await db.prepare('SELECT u.id, u.name, u.email, u.role FROM wa_sessions s JOIN wa_users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?').bind(await digest(token),Date.now()).first<Account>();return account||null}
async function allowedAttempt(request:Request,db:Database,email:string){const ip=request.headers.get('cf-connecting-ip')||'local';const bucket=Math.floor(Date.now()/(15*60*1000));const keys=[await digest(`ip:${ip}:${bucket}`),await digest(`email:${email}:${bucket}`)];for(const key of keys){const row=await db.prepare('INSERT INTO wa_auth_limits (key, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 RETURNING attempts').bind(key,Date.now()+30*60*1000).first<{attempts:number}>();if((row?.attempts||0)>10)return false}return true}
export async function accountAction(request:Request,db:Database,action:string):Promise<Response>{
if(request.method==='GET'&&action==='session')return json({user:await getAccount(request,db)});
if(request.method!=='POST'||!['signup','login','logout'].includes(action))return json({error:'Not found'},404);
if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Request origin rejected'},403);
if(action==='logout'){const token=sessionToken(request);if(token)await db.prepare('DELETE FROM wa_sessions WHERE token_hash = ?').bind(await digest(token)).run();return json({user:null},200,{'Set-Cookie':cookie(request,'',0)})}
if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Expected a JSON request'},415);
if(Number(request.headers.get('content-length')||0)>4096)return json({error:'Request too large'},413);
let data:any;try{const text=await request.text();if(text.length>4096)return json({error:'Request too large'},413);data=JSON.parse(text)}catch{return json({error:'Invalid request'},400)}
const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';const password=typeof data.password==='string'?data.password:'';const name=typeof data.name==='string'?data.name.trim():'';
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<8||password.length>128||(action==='signup'&&(name.length<2||name.length>80)))return json({error:'Enter a valid email, a password of 8–128 characters, and your name for signup.'},400);
if(!await allowedAttempt(request,db,email))return json({error:'Too many attempts. Please try again in 15 minutes.'},429,{'Retry-After':'900'});
let stored=await db.prepare('SELECT id, name, email, role, password_hash, salt, iterations FROM wa_users WHERE email = ?').bind(email).first<StoredUser>();
if(action==='signup'){if(stored)return json({error:'An account already exists for this email. Please log in.'},409);const salt=random();stored={id:crypto.randomUUID(),name,email,role:'member',password_hash:await passwordHash(password,salt),salt,iterations:ITERATIONS};try{await db.prepare('INSERT INTO wa_users (id, name, email, password_hash, salt, iterations, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(stored.id,name,email,stored.password_hash,salt,ITERATIONS,Date.now()).run()}catch{return json({error:'Could not create this account. Try logging in or contact the admin.'},409)}}else{const actual=await passwordHash(password,stored?.salt||'0'.repeat(64),stored?.iterations||ITERATIONS);if(!stored||!same(actual,stored.password_hash))return json({error:'Email or password is incorrect.'},401)}
const user={id:stored.id,name:stored.name,email:stored.email,role:stored.role||'member'};const token=random();const old=sessionToken(request);const statements=[db.prepare('INSERT INTO wa_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await digest(token),user.id,Date.now()+SESSION_SECONDS*1000),db.prepare('DELETE FROM wa_sessions WHERE expires_at <= ?').bind(Date.now()),db.prepare('DELETE FROM wa_auth_limits WHERE expires_at <= ?').bind(Date.now())];if(old)statements.push(db.prepare('DELETE FROM wa_sessions WHERE token_hash = ?').bind(await digest(old)));await db.batch(statements);return json({user},action==='signup'?201:200,{'Set-Cookie':cookie(request,token)});
}
