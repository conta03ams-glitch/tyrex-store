import { catalog, reply } from '@/lib/server';
import {getDb} from '@/db';
import {sql} from 'drizzle-orm';
import {salesSql} from '@/lib/product-metrics';
let cachedSales:{at:number;value:Record<string,number>}|undefined;
export async function GET(){const result=await catalog();let sales:Record<string,number>|null=null;try{if(cachedSales&&Date.now()-cachedSales.at<30000)return reply({...result,sales:cachedSales.value});const rows=await getDb().all<{productId:string;sold:number}>(sql.raw(salesSql));sales=Object.fromEntries(result.products.map(p=>[p.id,0]));for(const row of rows)if(Object.hasOwn(sales,row.productId))sales[row.productId]=Number(row.sold);cachedSales={at:Date.now(),value:sales};}catch{}return reply({...result,sales});}
