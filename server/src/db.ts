import pg from "pg";
import { config } from "./config.js";
import type { Project } from "../../shared/types.js";
export const embeddedDatabase = config.NODE_ENV === 'development' && process.env.DATABASE_MODE === 'pglite';
export const databaseConfigured = embeddedDatabase || !!config.DATABASE_URL;
async function createPool(): Promise<pg.Pool> {
  if (!embeddedDatabase) return new pg.Pool({connectionString: config.DATABASE_URL,max:8,connectionTimeoutMillis:4000});
  const {PGlite} = await import('@electric-sql/pglite');
  const {readFile,mkdir} = await import('node:fs/promises');
  await mkdir('data',{recursive:true});
  const {randomUUID} = await import('node:crypto');
  const database = new PGlite('data/local-postgres');
  await database.waitReady;
  await database.exec(await readFile('server/migrations/001_initial.sql','utf8'));
  const username=process.env.OWNER_LOGIN;
  const hash=process.env.OWNER_PASSWORD_HASH;
  if(username&&hash?.startsWith('$argon2id$')) await database.query('INSERT INTO owners(id,username,password_hash) VALUES($1,$2,$3) ON CONFLICT(singleton) DO UPDATE SET username=EXCLUDED.username,password_hash=EXCLUDED.password_hash',[randomUUID(),username,hash]);
  return {
    query: async (sql: string, values?: unknown[]) => {
      if (!values && sql.split(';').filter(v=>v.trim()).length>1) {await database.exec(sql);return {rows:[],rowCount:0};}
      const result=await database.query(sql,values);
      return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};
    },
    end:()=>database.close(),
    on:()=>{},
  } as unknown as pg.Pool;
}
export const pool = await createPool();

export async function projects(all = false): Promise<Project[]> {
  const r = await pool.query(
    "SELECT data FROM projects ORDER BY updated_at DESC",
  );
  return r.rows
    .map((x) => x.data)
    .filter((p: Project) => all || (p.published && p.verified && !p.excluded))
    .sort((a: Project, b: Project) => b.featured - a.featured);
}
export async function save(p: Project) {
  await pool.query(
    "INSERT INTO projects(id,slug,data) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET slug=$2,data=$3,updated_at=now()",
    [p.id, p.slug, p],
  );
}
export async function job(kind: string, status: string, details: unknown) {
  await pool.query(
    "INSERT INTO jobs(id,kind,status,details) VALUES(gen_random_uuid(),$1,$2,$3)",
    [kind, status, JSON.stringify(details)],
  );
}
