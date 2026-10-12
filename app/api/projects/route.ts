import {env} from 'cloudflare:workers';import {getAccount,type Database} from '../../../lib/account-core';import projects from '../../../data/projects.json';
export const dynamic='force-dynamic';
export async function GET(request:Request){if(!env.DB)return Response.json({error:'Account service unavailable'},{status:503});if(!await getAccount(request,env.DB as unknown as Database))return Response.json({error:'Please log in to explore projects.'},{status:401,headers:{'Cache-Control':'no-store'}});return Response.json({projects},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}})}
