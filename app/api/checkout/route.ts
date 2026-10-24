import {RequestBodyError,readJsonLimited} from '@/lib/request-security';
import {getCustomer} from '@/lib/customer-auth';
import {eq} from 'drizzle-orm';
import {validateCart} from '@/lib/commerce';
import {validatePaymentEnvironment} from '@/lib/payment-config';
import {getDb} from '@/db';
import {orders} from '@/db/schema';
import {catalog,config,readiness,reply,sameOrigin,limit,purin,sha,publicOrder} from '@/lib/server';
export async function POST(req:Request){
 if(!sameOrigin(req))return reply({error:'Origem não permitida.'},403);
 if(!readiness().checkoutEnabled)return reply({error:'Os pagamentos ainda não foram ativados pela loja. Seu carrinho continua salvo.'},503);
 try{
  const user=await getCustomer();
  if(!await limit(req,'checkout',8))return reply({error:'Aguarde um minuto antes de tentar novamente.'},429);
  const b=await readJsonLimited(req,65536) as any;
  if(!Array.isArray(b.items)||!b.items.length||b.items.length>50||!['pix','card'].includes(b.method)||b.accepted!==true)return reply({error:'Revise seu carrinho e aceite as condições de compra.'},400);
  if(!/^[a-f0-9]{48}$/.test(b.accessToken||'')||!/^[a-zA-Z0-9-]{16,80}$/.test(b.requestKey||''))return reply({error:'Atualize a página e tente novamente.'},400);
  const name=String(b.name||'').trim(),email=String(b.email||'').trim().toLowerCase();
  if(name.length<3||name.length>100||email.length>180||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply({error:'Informe seu nome (até 100 caracteres) e um e-mail válido.'},400);
  if(b.method==='card'&&readiness().sandbox)return reply({error:'Cartão não está disponível no ambiente de testes da PurinCash.'},400);
  const tokenHash=await sha(b.accessToken),db=getDb();
  const prior=(await db.select().from(orders).where(eq(orders.requestKey,b.requestKey)).limit(1))[0];
  if(prior){if(prior.tokenHash!==tokenHash)return reply({error:'Pedido não autorizado.'},403);return reply({order:publicOrder(prior)},prior.status==='creating'?202:200);}
  const {products}=await catalog(true);
  let lines,total;
  try{({lines,total}=validateCart(b.items,products,b.total));}catch(error){return reply({error:(error as Error).message},409);}
  const id='TX-'+crypto.randomUUID().replace(/-/g,'').slice(0,16).toUpperCase(),now=new Date().toISOString();
  await db.insert(orders).values({id,tokenHash,requestKey:b.requestKey,userId:user?.userId||null,email,name,discord:String(b.discord||'').slice(0,80),items:JSON.stringify(lines),total,status:'creating',paymentMethod:b.method,environment:readiness().sandbox?'sandbox':'live',createdAt:now,updatedAt:now});
  const origin=new URL(req.url).origin;
  const payload:any={valueCents:total,description:'TYREX STORE • '+id,customer:{name,email,externalId:id},metadata:JSON.stringify({orderId:id}),...(config().PURINCASH_WEBHOOK_ENABLED==='true'&&config().PURINCASH_WEBHOOK_SECRET?{callbackUrl:origin+'/api/webhooks/purincash'}:{})};
  if(b.method==='card'){payload.successUrl=origin+'/pedidos?pedido='+id;payload.cancelUrl=origin+'/pedidos?pedido='+id;}else payload.expiresIn=1800;
  try{
   const p=await purin(b.method==='card'?'/card-payments':'/charges',payload);
   validatePaymentEnvironment(p,readiness().sandbox?'sandbox':'live');
   const paymentId=b.method==='card'?p.orderCode:p.paymentId;
   if(!paymentId||p.amountCents!==total)throw new Error('INVALID_PAYMENT_RESPONSE');
   if(b.method==='card'){const u=new URL(p.checkoutUrl);if(u.protocol!=='https:'||!(u.hostname==='checkout.stripe.com'||u.hostname.endsWith('.purincash.com')))throw new Error('INVALID_CHECKOUT_URL');}
   const data={expiresAt:p.expiresAt,brCode:p.pix?.brCode||null,qrCodeImage:typeof p.pix?.qrCodeImage==='string'&&/^data:image\/(png|webp|jpeg);base64,/.test(p.pix.qrCodeImage)?p.pix.qrCodeImage:null,checkoutUrl:b.method==='card'?p.checkoutUrl:null};
   await db.update(orders).set({paymentId:String(paymentId),paymentData:JSON.stringify(data),status:'pending',updatedAt:new Date().toISOString()}).where(eq(orders.id,id));
   const o=(await db.select().from(orders).where(eq(orders.id,id)))[0];return reply({order:publicOrder(o)},201);
  }catch{
   await db.update(orders).set({status:'verificacao',updatedAt:new Date().toISOString()}).where(eq(orders.id,id));
   return reply({error:'Não foi possível confirmar a criação da cobrança. Consulte este pedido antes de tentar novamente.',order:{id,status:'verificacao',total,items:lines,environment:readiness().sandbox?'sandbox':'live'}},502);
  }
 }catch(error){if(error instanceof RequestBodyError)return reply({error:error.message},error.status);return reply({error:'Não foi possível iniciar o pagamento. Seu carrinho está salvo; tente novamente em instantes.'},502);}
}
