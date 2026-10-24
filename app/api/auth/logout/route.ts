import {eq} from 'drizzle-orm';
import {getDb} from '@/db';
import {customerSessions} from '@/db/schema';
import {AUTH_CSRF_COOKIE,CUSTOMER_COOKIE,authHash,cookieValue,secretCookie} from '@/lib/customer-auth-core';
import {reply,sameOrigin} from '@/lib/server';
export async function POST(req:Request){
 if(!sameOrigin(req))return reply({error:'Origem não permitida.'},403);
 try{
  const token=cookieValue(req.headers.get('cookie'),CUSTOMER_COOKIE);
  if(token)await getDb().delete(customerSessions).where(eq(customerSessions.sessionHash,await authHash(token)));
  const response=new Response(null,{status:303,headers:{Location:'/entrar','Cache-Control':'no-store'}});
  response.headers.append('Set-Cookie',secretCookie(CUSTOMER_COOKIE,'',0));response.headers.append('Set-Cookie',secretCookie(AUTH_CSRF_COOKIE,'',0));return response;
 }catch{return reply({error:'Não foi possível encerrar sua sessão. Tente novamente.'},503)}
}
