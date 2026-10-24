import {customerDeliveries} from '@/lib/delivery';
import {authorizedOrder,reconcile,publicOrder,reply,limit} from '@/lib/server';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 try{if(!await limit(req,'order',30))return reply({error:'Aguarde para consultar novamente.'},429);
 const {id}=await params;const o=await authorizedOrder(id,req);if(!o)return reply({error:'Pedido não encontrado neste acesso.'},404);
 let current=o;let syncDelayed=false;try{current=await reconcile(o)}catch{syncDelayed=true}
 return reply({order:publicOrder(current),deliveries:await customerDeliveries(current),syncDelayed});
 }catch{return reply({error:'Não foi possível consultar seu pedido.'},503);}
}
