import {and,eq,lt} from 'drizzle-orm';
import {getDb} from '@/db';
import {customerSessions} from '@/db/schema';
import {googleLoginConfig} from '@/lib/customer-auth';
import {AUTH_CSRF_COOKIE,CUSTOMER_COOKIE,SESSION_SECONDS,authHash,cookieValue,matchingAuthCsrf,randomAuthToken,secretCookie,verifyFirebaseGoogleToken} from '@/lib/customer-auth-core';
import {RequestBodyError,readJsonLimited} from '@/lib/request-security';
import {reply,sameOrigin,limit} from '@/lib/server';

export async function POST(req:Request){
 if(!sameOrigin(req))return reply({error:'Origem não permitida.'},403);
 const firebase=googleLoginConfig();if(!firebase)return reply({error:'O acesso com Google está em configuração. Você pode comprar como visitante.'},503);
 try{
  if(!await limit(req,'google-login',10))return reply({error:'Aguarde um minuto antes de tentar novamente.'},429);
  const body=await readJsonLimited(req,16384) as {idToken?:unknown;csrf?:unknown};
  if(!body||!matchingAuthCsrf(cookieValue(req.headers.get('cookie'),AUTH_CSRF_COOKIE),body.csrf))return reply({error:'Sua tentativa expirou. Atualize a página e tente novamente.'},403);
  let user;try{user=await verifyFirebaseGoogleToken(body.idToken,firebase.projectId)}catch{return reply({error:'Não foi possível confirmar sua conta Google. Entre novamente.'},401)}
  const db=getDb(),token=randomAuthToken(),now=Date.now(),firebaseTokenHash=await authHash(body.idToken as string);
  await db.delete(customerSessions).where(lt(customerSessions.expiresAt,now));
  const rows=await db.insert(customerSessions).values({sessionHash:await authHash(token),userId:user.userId,projectId:firebase.projectId,email:user.email,fullName:user.fullName,firebaseTokenHash,expiresAt:now+SESSION_SECONDS*1000,createdAt:new Date(now).toISOString()}).onConflictDoNothing().returning({userId:customerSessions.userId});
  if(!rows.length)return reply({error:'Esta tentativa já foi utilizada. Entre novamente com o Google.'},409);
  const previous=cookieValue(req.headers.get('cookie'),CUSTOMER_COOKIE);
  if(previous)await db.delete(customerSessions).where(and(eq(customerSessions.sessionHash,await authHash(previous)),eq(customerSessions.projectId,firebase.projectId)));
  const response=reply({ok:true});response.headers.append('Set-Cookie',secretCookie(CUSTOMER_COOKIE,token,SESSION_SECONDS));response.headers.append('Set-Cookie',secretCookie(AUTH_CSRF_COOKIE,'',0));return response;
 }catch(error){if(error instanceof RequestBodyError)return reply({error:error.message},error.status);return reply({error:'Não foi possível entrar agora. Tente novamente.'},503)}
}
