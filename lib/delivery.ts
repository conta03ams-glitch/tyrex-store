import {env} from 'cloudflare:workers';
import {eq} from 'drizzle-orm';
import {getDb} from '@/db';
import {orders,deliveryPolicies,digitalStock} from '@/db/schema';
import {decryptDelivery,deliveryExpiry,CLAIM_KEY_SQL} from './delivery-crypto';
// Each atomic UPDATE claims a single key only if this paid order still owns an unfilled unit.
// The unique unit_ref makes repeated reconciliation and concurrent webhooks idempotent.
export async function fulfillOrder(order:typeof orders.$inferSelect){
 if(order.status!=='paid'||!env.DB||!env.DELIVERY_ENCRYPTION_KEY)return order;
 const lines=JSON.parse(order.items),policies=await getDb().select().from(deliveryPolicies),now=new Date().toISOString();
 const statements=[];
 for(const line of lines){const p=policies.find(p=>p.variantId===line.variantId&&p.enabled===1);if(!p)continue;
  for(let unit=0;unit<line.quantity;unit++){const ref=order.id+':'+line.variantId+':'+unit;
   statements.push(env.DB.prepare(CLAIM_KEY_SQL).bind(order.id,ref,now,deliveryExpiry(now,p.durationDays),p.instructions,p.downloadUrl,line.variantId,order.environment,ref,order.id,order.userId));
  }
 }
 for(let i=0;i<statements.length;i+=50)await env.DB.batch(statements.slice(i,i+50));
 const assigned=await getDb().select({id:digitalStock.id}).from(digitalStock).where(eq(digitalStock.orderId,order.id));
 const total=lines.reduce((n:number,l:any)=>n+l.quantity,0);
 if(assigned.length>=total&&total>0){await getDb().update(orders).set({fulfillment:'entregue',updatedAt:now}).where(eq(orders.id,order.id));return {...order,fulfillment:'entregue',updatedAt:now};}
 return order;
}
export async function customerDeliveries(order:typeof orders.$inferSelect){
 if(order.status!=='paid'||!env.DELIVERY_ENCRYPTION_KEY)return [];
 const rows=await getDb().select().from(digitalStock).where(eq(digitalStock.orderId,order.id));
 return Promise.all(rows.map(async row=>({id:row.id,variantId:row.variantId,key:await decryptDelivery(row.payload,env.DELIVERY_ENCRYPTION_KEY!,row.variantId+':'+row.environment),deliveredAt:row.deliveredAt,expiresAt:row.expiresAt,instructions:row.instructions,downloadUrl:row.downloadUrl,environment:row.environment})));
}
