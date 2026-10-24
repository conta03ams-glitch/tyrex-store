import type {Product, Variant} from './catalog';

export type CartLine = {productId:string;slug?:string;variantId:string;name:string;variant:string;price:number;quantity:number;image:string;art:string;color:string;max:number};
export const lineKey = (line:Pick<CartLine,'productId'|'variantId'>) => line.productId+':'+line.variantId;
export function cartLimit(product:Product, variant:Variant):number {
  if(product.blocked || !variant || !Number.isSafeInteger(variant.price) || variant.price<=0) return 0;
  return variant.unlimited ? 99 : Number.isInteger(variant.stock) ? Math.max(0,Math.min(variant.stock!,99)) : 0;
}
export function addCartLine(cart:CartLine[],product:Product,variant:Variant,quantity=1):CartLine[] {
  const max=cartLimit(product,variant);
  if(!max || !Number.isInteger(quantity) || quantity<1) return cart;
  const key=lineKey({productId:product.id,variantId:variant.id});
  const existing=cart.find(line=>lineKey(line)===key);
  const line:CartLine={productId:product.id,slug:product.slug,variantId:variant.id,name:product.name,variant:variant.name,price:variant.price,quantity:Math.min((existing?.quantity||0)+quantity,max),image:product.image,art:product.art,color:product.color,max};
  return existing ? cart.map(item=>lineKey(item)===key?line:item) : [...cart,line];
}

// Preserve an existing basket when provider aliases are merged into curated products.
export function canonicalCart(cart:CartLine[],products:Product[]):CartLine[]{
 const result:CartLine[]=[];
 for(const line of cart){const product=cartProduct(line,products);if(!product){result.push(line);continue;}const key=lineKey({productId:product.id,variantId:line.variantId}),prior=result.find(x=>lineKey(x)===key),updated={...line,productId:product.id,slug:product.slug,name:product.name,image:product.image,art:product.art,color:product.color};
 if(prior)prior.quantity=Math.min(99,prior.quantity+line.quantity);else result.push(updated);
 }
 return result;
}

export function cartProduct(line:CartLine,products:Product[]):Product|undefined{
 const known=products.find(p=>p.id===line.productId||!!line.slug&&p.slug===line.slug);if(known)return known;
 if(['preview','unavailable',''].includes(line.variantId))return undefined;
 const matches=products.filter(p=>p.variants.some(v=>v.id===line.variantId));return matches.length===1?matches[0]:undefined;
}
export function replacementVariant(line:CartLine,product:Product):Variant|undefined{
 const exact=product.variants.find(v=>v.id===line.variantId&&!['preview','unavailable'].includes(v.id));if(exact)return exact;
 const named=product.variants.filter(v=>v.name.trim().toLowerCase()===String(line.variant||'').trim().toLowerCase());
 return named.length===1?named[0]:product.variants.length===1?product.variants[0]:undefined;
}
export function replaceCartLine(cart:CartLine[],oldKey:string,product:Product,variant:Variant):CartLine[]{
 const old=cart.find(l=>lineKey(l)===oldKey);if(!old||!product.live||!cartLimit(product,variant))return cart;
 return addCartLine(cart.filter(l=>lineKey(l)!==oldKey),product,variant,old.quantity);
}
