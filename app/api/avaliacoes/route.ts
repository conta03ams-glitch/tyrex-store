import {RequestBodyError,readFormLimited} from '@/lib/request-security';
import {getCustomer} from '@/lib/customer-auth';
import {getDb} from '@/db';
import {orders,productReviews} from '@/db/schema';
import {and,eq,desc,lt,sql} from 'drizzle-orm';
import {catalog,reply,sameOrigin,limit,sha} from '@/lib/server';
import {reviewInput,validReviewPhoto,purchasedProduct} from '@/lib/reviews';
import {orderAccessAllowed} from '@/lib/order-access';
import {env} from 'cloudflare:workers';
const bucket=()=> (env as unknown as {BUCKET:R2Bucket}).BUCKET;
export async function GET(req:Request){try{
 const url=new URL(req.url),productId=url.searchParams.get('produto')||'',cursor=url.searchParams.get('antes');
 if(!productId||productId.length>200)return reply({error:'Produto inválido.'},400);
 const user=await getCustomer(),mine=user?await sha('review:user:'+user.userId):null;
 const filter=cursor&&/^\d{4}-\d{2}-\d{2}T/.test(cursor)?and(eq(productReviews.productId,productId),lt(productReviews.createdAt,cursor)):eq(productReviews.productId,productId);
 const db=getDb();const [rows,stats,groups]=await Promise.all([db.select().from(productReviews).where(filter).orderBy(desc(productReviews.createdAt)).limit(21),db.select({count:sql<number>`count(*)`,average:sql<number>`avg(${productReviews.rating})`}).from(productReviews).where(eq(productReviews.productId,productId)),db.select({rating:productReviews.rating,count:sql<number>`count(*)`}).from(productReviews).where(eq(productReviews.productId,productId)).groupBy(productReviews.rating)]);
 return reply({distribution:Object.fromEntries(groups.map(g=>[g.rating,Number(g.count)])),signedIn:!!user,total:Number(stats[0]?.count||0),average:stats[0]?.average?Number(stats[0].average):null,next:rows.length>20?rows[19].createdAt:null,reviews:rows.slice(0,20).map(r=>({id:r.id,name:r.displayName,rating:r.rating,comment:r.comment,photo:r.photoKey?'/api/avaliacoes/foto/'+r.id:null,verified:r.verified===1,createdAt:r.createdAt,mine:mine===r.authorKey}))});
 }catch{return reply({error:'Não foi possível carregar as avaliações. Tente novamente.'},503);}}
export async function POST(req:Request){let photoKey:string|null=null;try{
 if(!sameOrigin(req))return reply({error:'Origem inválida.'},403);
 if(Number(req.headers.get('content-length')||0)>2300000)return reply({error:'A foto deve ter até 2 MB.'},413);
 if(!await limit(req,'review-write',6))return reply({error:'Aguarde um minuto antes de tentar novamente.'},429);
 const form=await readFormLimited(req,2300000),productId=String(form.get('productId')||''),input=reviewInput({rating:form.get('rating'),comment:form.get('comment'),name:form.get('name')});
 const {products}=await catalog();if(!products.some(p=>p.id===productId&&!p.blocked))return reply({error:'Produto não encontrado.'},404);
 const db=getDb(),user=await getCustomer();let authorKey:string,verified=false;
 if(user){authorKey=await sha('review:user:'+user.userId);const paid=await db.select({items:orders.items}).from(orders).where(and(eq(orders.userId,user.userId),eq(orders.status,'paid'),eq(orders.environment,'live'))).limit(100);verified=paid.some(o=>purchasedProduct(o.items,productId));}
 else{
  const id=String(form.get('orderId')||''),token=String(form.get('orderToken')||'');
  const row=id.length<=100?(await db.select().from(orders).where(eq(orders.id,id)).limit(1))[0]:null;
  const hash=/^[a-f0-9]{48}$/.test(token)?await sha(token):null;
  if(!row||!orderAccessAllowed(row,null,hash)||row.status!=='paid'||row.environment!=='live'||!purchasedProduct(row.items,productId))return reply({error:'Entre na sua conta ou informe um pedido pago deste produto e sua chave de consulta.'},401);
  authorKey=await sha('review:guest:'+row.id);verified=true;
 }
 const dedupeKey=await sha(productId+':'+authorKey);if((await db.select({id:productReviews.id}).from(productReviews).where(eq(productReviews.dedupeKey,dedupeKey)).limit(1)).length)return reply({error:'Você já avaliou este produto.'},409);
 const file=form.get('photo');if(file instanceof File&&file.size){if(file.size>2*1024*1024)return reply({error:'A foto deve ter até 2 MB.'},413);const bytes=new Uint8Array(await file.arrayBuffer());if(file.type!=='image/jpeg'||!validReviewPhoto(bytes))return reply({error:'Envie uma foto JPEG válida.'},400);if(!bucket())return reply({error:'O envio de fotos está temporariamente indisponível.'},503);photoKey='reviews/'+crypto.randomUUID()+'.jpg';await bucket().put(photoKey,bytes,{httpMetadata:{contentType:'image/jpeg'}});}
 const id=crypto.randomUUID();await db.insert(productReviews).values({id,productId,authorKey,dedupeKey,displayName:input.name,rating:input.rating,comment:input.comment,photoKey,verified:verified?1:0,createdAt:new Date().toISOString()});
 return reply({ok:true,id},201);
 }catch(error){if(error instanceof RequestBodyError)return reply({error:error.message},error.status);if(photoKey)await bucket()?.delete(photoKey).catch(()=>{});const message=error instanceof Error?error.message:'';return reply({error:/Escolha de|Escreva um|Informe um/.test(message)?message:'Não foi possível publicar a avaliação. Tente novamente.'},/Escolha de|Escreva um|Informe um/.test(message)?400:503);}}
export async function DELETE(req:Request){try{if(!sameOrigin(req))return reply({error:'Origem inválida.'},403);const user=await getCustomer();if(!user)return reply({error:'Entre na sua conta.'},401);const id=new URL(req.url).searchParams.get('id')||'',authorKey=await sha('review:user:'+user.userId),db=getDb();const rows=await db.delete(productReviews).where(and(eq(productReviews.id,id),eq(productReviews.authorKey,authorKey))).returning({photoKey:productReviews.photoKey});if(!rows.length)return reply({error:'Avaliação não encontrada.'},404);if(rows[0].photoKey)await bucket()?.delete(rows[0].photoKey);return reply({ok:true});}catch{return reply({error:'Não foi possível remover a avaliação.'},503);}}
