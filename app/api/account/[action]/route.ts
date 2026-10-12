import {env} from 'cloudflare:workers';
import {accountAction,type Database} from '../../../../lib/account-core';
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{action:string}>}){const {action}=await context.params;if(!env.DB)return Response.json({error:'Account service is not configured.'},{status:503,headers:{'Cache-Control':'no-store'}});try{return await accountAction(request,env.DB as unknown as Database,action)}catch(error){console.error('Account service failure',error instanceof Error?error.message:'Unknown error');return Response.json({error:'Account service is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}})}}
export const GET=handle;export const POST=handle;
