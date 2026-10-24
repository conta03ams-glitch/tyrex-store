export type PaymentEnvironment='live'|'sandbox';

export function paymentEnvironment(apiKey:unknown):PaymentEnvironment|null{
 if(typeof apiKey!=='string')return null;
 const match=/^ps_(live|test)_[A-Za-z0-9_-]+$/.exec(apiKey.trim());
 return match?(match[1]==='live'?'live':'sandbox'):null;
}

export function paymentReadiness(config:{PURINCASH_API_KEY?:string;STORE_CHECKOUT_ENABLED?:string}){
 const environment=paymentEnvironment(config.PURINCASH_API_KEY);
 return {paymentEnvironment:environment,paymentsConfigured:environment!==null,productionConfigured:environment==='live',checkoutEnabled:environment!==null&&config.STORE_CHECKOUT_ENABLED==='true',sandbox:environment==='sandbox'};
}

export function requireOrderEnvironment(orderEnvironment:string,apiKey:unknown){
 const current=paymentEnvironment(apiKey);
 if(!current||orderEnvironment!==current)throw Error('PAYMENT_ENVIRONMENT_MISMATCH');
 return current;
}

export function validatePaymentEnvironment(payment:unknown,environment:PaymentEnvironment){
 if(!payment||typeof payment!=='object')throw Error('INVALID_PAYMENT_RESPONSE');
 const p=payment as Record<string,unknown>;
 if(p.environment!==undefined&&p.environment!==environment)throw Error('PAYMENT_ENVIRONMENT_MISMATCH');
 if(typeof p.sandbox==='boolean'&&p.sandbox!==(environment==='sandbox'))throw Error('PAYMENT_ENVIRONMENT_MISMATCH');
 if(p.currency!==undefined&&p.currency!=='BRL')throw Error('PAYMENT_CURRENCY_MISMATCH');
}

export function paymentWebhookReference(value:unknown){
 if(!value||typeof value!=='object')return null;
 const e=value as Record<string,unknown>;
 if(!['payment.paid','charge.paid','card_payment.paid'].includes(String(e.event))||e.status!=='paid')return null;
 if(e.sandbox!==undefined&&typeof e.sandbox!=='boolean')return null;
 const method=e.event==='card_payment.paid'?'card':'pix',id=method==='card'?e.orderCode:e.paymentId;
 const environment:PaymentEnvironment=e.sandbox===true?'sandbox':'live';
 if(method==='card'&&environment==='sandbox')return null;
 if(e.environment!==undefined&&e.environment!==environment)return null;
 const amountCents=method==='card'&&typeof e.amount==='number'?Math.round(e.amount*100):e.amountCents;
 if(typeof id!=='string'||!id||id.length>200||typeof amountCents!=='number'||!Number.isSafeInteger(amountCents)||amountCents<80)return null;
 return {paymentId:id,method,environment,amountCents};
}
