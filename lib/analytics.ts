export const ANALYTICS_CONSENT_KEY='tyrex:analytics-consent:v1';
export function validMeasurementId(value:unknown):string|null{return typeof value==='string'&&/^G-[A-Z0-9]{6,20}$/.test(value.trim())?value.trim():null;}
export function analyticsPath(pathname:string,category?:string|null):string|null{
 if(pathname==='/checkout'||pathname==='/pedidos'||pathname==='/gestao'||pathname==='/ajuda'||pathname.startsWith('/api/')||pathname.startsWith('/.'))return null;
 if(pathname==='/'||pathname==='/sobre'||pathname==='/politicas/termos'||pathname==='/politicas/privacidade')return pathname;
 if(pathname==='/catalogo')return category&&['standoff-2','roblox','free-fire','gift-card','fivem','cs-2','assinaturas','valorant','8-ball-pool','outros'].includes(category)?'/catalogo?categoria='+encodeURIComponent(category):'/catalogo';
 return /^\/produto\/[a-z0-9-]+$/.test(pathname)?pathname:null;
}
export function analyticsConsent(value:string|null):boolean|null{
 try{const data=JSON.parse(value||'null');return data?.version===1&&typeof data.accepted==='boolean'?data.accepted:null;}catch{return null;}
}
let runtimeConsent:boolean|null=null;
export function setRuntimeAnalyticsConsent(value:boolean|null){runtimeConsent=value;}
function allowed(){if(runtimeConsent!==null)return runtimeConsent;try{return analyticsConsent(localStorage.getItem(ANALYTICS_CONSENT_KEY))===true;}catch{return false;}}
declare global {interface Window {dataLayer?:unknown[];gtag?:(...args:unknown[])=>void;}}
const pendingEvents:Array<{name:string;payload:unknown}>=[];
export function flushCommerceEvents(){if(typeof window==='undefined')return;if(!allowed()){pendingEvents.length=0;return;}if(!window.gtag)return;for(const event of pendingEvents.splice(0))window.gtag('event',event.name,event.payload);}
type Item={productId:string;name:string;variant?:string;price:number;quantity:number};
export function commerceItems(items:Item[]){return items.map(item=>({item_id:item.productId,item_name:item.name,item_variant:item.variant||undefined,price:item.price/100,quantity:item.quantity}));}
export function trackCommerce(name:'view_item'|'add_to_cart'|'begin_checkout'|'purchase',items:Item[],total:number,transactionId?:string){
 if(typeof window==='undefined'||!Number.isSafeInteger(total)||total<0)return false;
 if(!allowed())return false;
 const payload={currency:'BRL',value:total/100,items:commerceItems(items),...(name==='purchase'&&transactionId?{transaction_id:transactionId}:{})};
 if(window.gtag)window.gtag('event',name,payload);else pendingEvents.push({name,payload});return true;
}
