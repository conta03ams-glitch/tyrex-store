import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {and,eq,gt} from 'drizzle-orm';
import {getDb} from '@/db';
import {customerSessions} from '@/db/schema';
import {customerSignInPath,firebasePublicConfig,resolveCustomerSession,type Customer} from './customer-auth-core';

export function googleLoginConfig(){return firebasePublicConfig(env as Cloudflare.Env);}

// Storefront identity deliberately ignores Sites/ChatGPT identity headers.
export async function getCustomer(req?:Request):Promise<Customer|null>{
 const firebase=googleLoginConfig();if(!firebase)return null;
 const requestHeaders=req?.headers||await headers();
 return resolveCustomerSession(requestHeaders,firebase.projectId,async hash=>{
  const [session]=await getDb().select().from(customerSessions).where(and(eq(customerSessions.sessionHash,hash),eq(customerSessions.projectId,firebase.projectId),gt(customerSessions.expiresAt,Date.now()))).limit(1);return session;
 });
}
export async function requireCustomer(returnTo:string):Promise<Customer>{const user=await getCustomer();if(user)return user;redirect(customerSignInPath(returnTo));}
