import {env} from 'cloudflare:workers';
import {getDb} from '@/db';
import {productReviews} from '@/db/schema';
import {eq} from 'drizzle-orm';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response(null,{status:404});const row=(await getDb().select({key:productReviews.photoKey}).from(productReviews).where(eq(productReviews.id,id)).limit(1))[0];if(!row?.key)return new Response(null,{status:404});const image=await (env as unknown as {BUCKET:R2Bucket}).BUCKET.get(row.key);if(!image)return new Response(null,{status:404});return new Response(image.body,{headers:{'Content-Type':'image/jpeg','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});}catch{return new Response(null,{status:503});}}
