import {googleLoginConfig} from '@/lib/customer-auth';
import {AUTH_CSRF_COOKIE,AUTH_CSRF_SECONDS,randomAuthToken,secretCookie} from '@/lib/customer-auth-core';
import {reply,sameOrigin} from '@/lib/server';
export async function GET(req:Request){
 if(!sameOrigin(req))return reply({error:'Origem não permitida.'},403);
 if(!googleLoginConfig())return reply({error:'O acesso com Google está em configuração. Você pode comprar como visitante.'},503);
 const csrf=randomAuthToken(),response=reply({csrf});response.headers.append('Set-Cookie',secretCookie(AUTH_CSRF_COOKIE,csrf,AUTH_CSRF_SECONDS));return response;
}
