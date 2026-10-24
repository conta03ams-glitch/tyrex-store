import {getCustomer} from '@/lib/customer-auth';
import {getDb} from '@/db';
import {orders} from '@/db/schema';
import {eq,desc,and,lt} from 'drizzle-orm';
import {reply,publicOrder,limit} from '@/lib/server';
export async function GET(req:Request){try{const user=await getCustomer();if(!user)return reply({error:'Entre na sua conta.'},401);if(!await limit(req,'account',60))return reply({error:'Aguarde um minuto.'},429);const cursor=new URL(req.url).searchParams.get('antes');const query=cursor&&/^\d{4}-\d{2}-\d{2}T/.test(cursor)?and(eq(orders.userId,user.userId),lt(orders.createdAt,cursor)):eq(orders.userId,user.userId);const rows=await getDb().select().from(orders).where(query).orderBy(desc(orders.createdAt)).limit(21);return reply({orders:rows.slice(0,20).map(publicOrder),next:rows.length>20?rows[19].createdAt:null});}catch{return reply({error:'Não foi possível carregar as compras.'},503)}}
