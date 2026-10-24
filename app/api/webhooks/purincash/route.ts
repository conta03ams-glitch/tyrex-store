import {RequestBodyError,readTextLimited} from '@/lib/request-security';
import {validWebhook} from '@/lib/webhook-security';
import {paymentWebhookReference} from '@/lib/payment-config';
import {eq} from 'drizzle-orm';
import {getDb} from '@/db';
import {orders,webhookEvents} from '@/db/schema';
import {config,reply,reconcile,sha} from '@/lib/server';
export async function POST(req:Request){
 const secret=config().PURINCASH_WEBHOOK_SECRET;if(!secret)return reply({error:'Webhook não configurado.'},503);
 let raw:string;try{raw=await readTextLimited(req,100000);}catch(error){if(error instanceof RequestBodyError)return reply({error:error.message},error.status);return reply({error:'Payload inválido.'},400);}
 const signature=req.headers.get('x-webhook-signature')||'';
 if(!validWebhook(raw,signature,secret))return reply({error:'Assinatura inválida.'},401);
 try{
  const payment=paymentWebhookReference(JSON.parse(raw));if(!payment)return reply({ok:true,ignored:true});
  const id=payment.environment+':'+(req.headers.get('x-webhook-id')||await sha(raw)),db=getDb();
  if((await db.select().from(webhookEvents).where(eq(webhookEvents.id,id)).limit(1)).length)return reply({ok:true});
  const paymentId=payment.paymentId;
  const o=(await db.select().from(orders).where(eq(orders.paymentId,paymentId)).limit(1))[0];
  if(o&&(o.environment!==payment.environment||o.paymentMethod!==payment.method||o.total!==payment.amountCents))return reply({error:'Evento incompatível com o pedido.'},400);
  if(o)await reconcile(o);
  await db.insert(webhookEvents).values({id,receivedAt:new Date().toISOString()}).onConflictDoNothing();
  return reply({ok:true});
 }catch{return reply({error:'Tente novamente.'},503);}
}
