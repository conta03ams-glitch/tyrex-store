import bindings from './provider-bindings.json' with {type:'json'};
const providerBindings=bindings as Record<string,{id:string;publicId:string}>;
import type {Product} from './catalog';
export function cents(v:unknown):number{
 if(typeof v==='number')return Number.isFinite(v)?Math.round(v*100):0;
 if(typeof v!=='string')return 0;const n=v.trim().replace(/R\$\s*/,'');
 if(!/^\d+(?:[.,]\d+)*$/.test(n))return 0;
 return Math.round(Number(n.includes(',')?n.replace(/\./g,'').replace(',','.'):n)*100);
}
export function catalogIdentity(value:unknown){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').replace(/-(?:ff|free-fire|cs-?2|standoff-2)$/,'');}
export function storeCatalog(data:unknown,base:Product[]):Product[]{
 if(!data||typeof data!=='object'||!Array.isArray((data as any).products))throw new Error('INVALID_CATALOG');
 const key=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const remote=(data as any).products.filter((p:any)=>p&&typeof p.name==='string').sort((a:any,b:any)=>Number(b.active!==false)-Number(a.active!==false));
 const represented=new Set<string>();
 const used=new Set<any>();
 const unavailable=(p:Product,unavailableReason='not_linked'):Product=>({...p,live:false,unavailableReason,variants:p.variants.map(v=>({...v,stock:0,unlimited:false}))});
 function merge(p:any,product:Product):Product{
  used.add(p);represented.add(catalogIdentity(p.name));
  if(typeof p.description==='string')product={...product,description:p.description};
  if(product.blocked)return unavailable(product,'blocked');
  if(p.active===false)return unavailable(product,'inactive');
  const source=Array.isArray(p.variations)?p.variations:[];
  const variants=source.map((v:any,index:number)=>({id:typeof v?.id==='string'?v.id:'',name:String(v?.name||'Opção padrão').slice(0,180),price:cents(v?.price??p.price),stock:Number.isInteger(v?.stock)?Math.max(0,v.stock):null,unlimited:v?.unlimited===true,index})).filter((v:any)=>v.id&&Number.isSafeInteger(v.price)&&v.price>0);
  if(!variants.length)return unavailable(product,'no_variants');
  return {...product,unavailableReason:undefined,variants,variationCount:variants.length,price:Math.min(...variants.map((v:any)=>v.price)),maxPrice:Math.max(...variants.map((v:any)=>v.price)),live:true,publicId:typeof p.publicId==='string'?p.publicId:undefined,deliveryType:typeof p.deliveryType==='string'?p.deliveryType:undefined};
 }
 const products=base.map(product=>{
  const binding=providerBindings[catalogIdentity(product.name)];
  const match=(binding&&remote.find((p:any)=>!used.has(p)&&(p.id===binding.id||!!binding.publicId&&p.publicId===binding.publicId)))||remote.find((p:any)=>!used.has(p)&&catalogIdentity(p.name)===catalogIdentity(product.name));
  return match?merge(match,product):unavailable(product);
 });
 for(const p of remote){
  if(used.has(p)||represented.has(catalogIdentity(p.name))||p.active===false||!p.id||!key(p.name))continue;
  const text=key(p.name+' '+(p.category||''));
  const category=/gift|google-play|playstation|apple-store|steam/.test(text)?'gift-card':/spotify|netflix|assinatura/.test(text)?'assinaturas':/standoff|golds|xskin|xcheat|plutonium|(^|-)dll(-|$)/.test(text)?'standoff-2':/free-fire|zimo|tyrex-rage|bypass|astral/.test(text)?'free-fire':/roblox|robux|executor/.test(text)?'roblox':/counter-strike|cs-?2|premier|radar|raio/.test(text)?'cs-2':/fivem/.test(text)?'fivem':/valorant/.test(text)?'valorant':/8-ball|pool/.test(text)?'8-ball-pool':'outros';
  const icon:Record<string,string>={'gift-card':'gift',assinaturas:'subscriptions','standoff-2':'standoff','free-fire':'freefire',roblox:'roblox','cs-2':'cs2',fivem:'fivem',valorant:'valorant','8-ball-pool':'pool'};
  const platform=/android/.test(text)?'Android':/ios/.test(text)?'iOS':/emulador/.test(text)?'Emulador':category==='cs-2'?'Windows':'Digital';
  const id='purin-'+String(p.id),slug=key(p.name)+'-'+key(p.id);
  const product:Product={id,slug,name:p.name.slice(0,200),category,platform,price:cents(p.price),variationCount:1,image:icon[category]?'/assets/category-'+icon[category]+'.webp':'/assets/brand.webp',art:'catalog-image',color:'#2779ff',description:typeof p.description==='string'?p.description:'Confira as opções disponíveis e as condições de entrega deste produto.',variants:[{id:'unavailable',name:'Indisponível',price:cents(p.price),stock:0,unlimited:false,index:0}],live:false,blocked:/script.*robux|robux.*script/.test(text)};
  products.push(merge(p,product));
 }
 return products;
}
export function validateCart(items:unknown,products:Product[],expectedTotal:unknown){
 if(!Array.isArray(items)||!items.length||items.length>50)throw new Error('Revise os itens do seu carrinho.');
 const seen=new Set<string>();const lines=[];let total=0;
 for(const item of items){
  if(!item||typeof item!=='object')throw new Error('Opção inválida no carrinho.');
  const p=products.find(p=>p.id===item.productId),v=p?.variants.find(v=>v.id===item.variantId),key=item.productId+':'+item.variantId;
  if(!p||!v||!p.live||p.blocked||seen.has(key)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99)throw new Error('Uma opção do carrinho mudou. Volte ao produto para selecionar novamente.');
  seen.add(key);
  if(!v.unlimited&&(v.stock===null||item.quantity>v.stock))throw new Error(p.name+': quantidade indisponível. Atualize seu carrinho.');
  if(item.price!==v.price)throw new Error(p.name+': o preço foi atualizado. Selecione a opção novamente.');
  total+=v.price*item.quantity;lines.push({productId:p.id,variantId:v.id,name:p.name,variant:v.name,price:v.price,quantity:item.quantity,image:p.image,art:p.art,color:p.color});
 }
 if(!Number.isSafeInteger(total)||total<80||total>10000000||total!==expectedTotal)throw new Error('O total do carrinho foi atualizado. Confira os valores.');
 return {lines,total};
}
export function confirmedStatus(current:string,payment:{status?:unknown;amountCents?:unknown;amount?:unknown},total:number){
 const amount=payment.amountCents??Math.round(Number(payment.amount)*100);
 if(amount!==total)throw new Error('PAYMENT_AMOUNT_MISMATCH');
 const status=String(payment.status);
 if(!['pending','paid','expired','refunded','cancelled','failed'].includes(status))return current;
 if(current==='paid'&&status==='pending')return current;
 return status;
}
