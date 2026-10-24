import {getCustomer} from './customer-auth';
import {orderAccessAllowed} from './order-access';
import {requestIsSameOrigin} from './request-security';
import {fulfillOrder} from './delivery';
import { env } from 'cloudflare:workers';
import snapshot from './catalog-snapshot.json';
import { confirmedStatus,storeCatalog } from './commerce';
import {DISCORD_URL} from './community';
import {validMeasurementId} from './analytics';
import {paymentEnvironment,paymentReadiness,requireOrderEnvironment,validatePaymentEnvironment} from './payment-config';
import { eq,lt,sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { orders, rateLimits } from '@/db/schema';
import { initialProducts, type Product } from './catalog';
export function config(){return env as Cloudflare.Env;}
export function reply(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export function sameOrigin(req:Request){return requestIsSameOrigin(req);}
export async function sha(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function token(){return Array.from(crypto.getRandomValues(new Uint8Array(24))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function limit(req:Request,scope:string,max=12){
 const minute=Math.floor(Date.now()/60000);const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'local';
 const key=scope+':'+minute+':'+await sha(ip);
 const db=getDb();await db.delete(rateLimits).where(lt(rateLimits.expires,Date.now()));const row=await db.insert(rateLimits).values({key,count:1,expires:Date.now()+120000}).onConflictDoUpdate({target:rateLimits.key,set:{count:sql`${rateLimits.count} + 1`}}).returning();
 return row[0].count<=max;
}
export async function purin(path:string,body?:unknown){
 const key=config().PURINCASH_API_KEY?.trim();if(!paymentEnvironment(key))throw new Error('PAYMENTS_NOT_CONFIGURED');
 const res=await fetch('https://api.purincash.com/v1'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw new Error('PURINCASH_'+res.status);
 return res.json() as Promise<any>;
}
let cached:{at:number;products:Product[]}|undefined;
export async function catalog(force=false):Promise<{products:Product[];connected:boolean}>{
 if(!config().PURINCASH_API_KEY)return {products:storeCatalog(snapshot,initialProducts).map(p=>({...p,live:false,unavailableReason:'sync_failed'})),connected:false};
 if(!force&&cached&&Date.now()-cached.at<30000)return {products:cached.products,connected:true};
 try{
  const data=await purin('/store/products');
  const products=storeCatalog(data,initialProducts);
  cached={at:Date.now(),products};return {products,connected:true};
 }catch(error){if(force)throw error;return {products:storeCatalog(snapshot,initialProducts).map(p=>({...p,live:false,unavailableReason:'sync_failed'})),connected:false};}
}
export function readiness(){const c=config();return {...paymentReadiness(c),analyticsConfigured:c.GA4_ENABLED==='true'&&!!validMeasurementId(c.GA4_MEASUREMENT_ID),webhookConfigured:!!c.PURINCASH_WEBHOOK_SECRET,webhookEnabled:c.PURINCASH_WEBHOOK_ENABLED==='true'&&!!c.PURINCASH_WEBHOOK_SECRET,ownerConfigured:!!c.STORE_OWNER_USER_ID,discordUrl:DISCORD_URL,supportEmail:c.STORE_SUPPORT_EMAIL&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.STORE_SUPPORT_EMAIL)?c.STORE_SUPPORT_EMAIL:null};}
export async function authorizedOrder(id:string,req:Request){const rows=await getDb().select().from(orders).where(eq(orders.id,id)).limit(1);const o=rows[0];if(!o)return null;const access=req.headers.get('x-order-token')||'',hash=/^[a-f0-9]{48}$/.test(access)?await sha(access):null;return orderAccessAllowed(o,(await getCustomer(req))?.userId||null,hash)?o:null;}
export async function reconcile(o:typeof orders.$inferSelect){
 if(!o.paymentId||['creating','verificacao','payment_error'].includes(o.status))return o;
 const environment=requireOrderEnvironment(o.environment,config().PURINCASH_API_KEY);
 const p=await purin((o.paymentMethod==='card'?'/card-payments/':'/charges/')+encodeURIComponent(o.paymentId));
 validatePaymentEnvironment(p,environment);
 const status=confirmedStatus(o.status,p,o.total);
 if(['pending','paid','expired','refunded','cancelled','failed'].includes(status)&&!(o.status==='paid'&&status==='pending')&&status!==o.status){
  const updatedAt=new Date().toISOString();await getDb().update(orders).set({status,updatedAt}).where(eq(orders.id,o.id));return fulfillOrder({...o,status,updatedAt});
 }
 return fulfillOrder(o);
}
export function publicOrder(o:typeof orders.$inferSelect){let p:any={};try{p=JSON.parse(o.paymentData||'{}')}catch{}return {id:o.id,items:JSON.parse(o.items),total:o.total,status:o.status,method:o.paymentMethod,environment:o.environment,fulfillment:o.fulfillment,createdAt:o.createdAt,...p};}
