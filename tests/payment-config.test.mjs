import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentEnvironment,paymentReadiness,requireOrderEnvironment,validatePaymentEnvironment,paymentWebhookReference} from '../lib/payment-config.ts';

test('somente os prefixos oficiais habilitam o checkout e a produção fica explícita',()=>{
 for(const key of [undefined,null,'','placeholder','ps_live_','ps_test_','ps_live_bad value'])assert.equal(paymentEnvironment(key),null);
 assert.equal(paymentEnvironment('  ps_test_fixture  '),'sandbox');
 assert.equal(paymentEnvironment('ps_live_fixture'),'live');
 assert.deepEqual(paymentReadiness({PURINCASH_API_KEY:'invalid',STORE_CHECKOUT_ENABLED:'true'}),{paymentEnvironment:null,paymentsConfigured:false,productionConfigured:false,checkoutEnabled:false,sandbox:false});
 assert.equal(paymentReadiness({PURINCASH_API_KEY:'ps_test_fixture',STORE_CHECKOUT_ENABLED:'true'}).productionConfigured,false);
 assert.equal(paymentReadiness({PURINCASH_API_KEY:'ps_live_fixture',STORE_CHECKOUT_ENABLED:'false'}).checkoutEnabled,false);
 const ready=paymentReadiness({PURINCASH_API_KEY:'ps_live_fixture',STORE_CHECKOUT_ENABLED:'true'});
 assert.equal(ready.productionConfigured,true);assert.equal(ready.checkoutEnabled,true);
 assert.ok(!Object.values(ready).includes('ps_live_fixture'));
});
test('uma troca de chave não consulta pedidos de teste como pagamentos reais',()=>{
 assert.equal(requireOrderEnvironment('live','ps_live_fixture'),'live');
 assert.equal(requireOrderEnvironment('sandbox','ps_test_fixture'),'sandbox');
 for(const [environment,key] of [['sandbox','ps_live_fixture'],['live','ps_test_fixture'],['live',undefined],['unknown','ps_live_fixture']])assert.throws(()=>requireOrderEnvironment(environment,key),/ENVIRONMENT_MISMATCH/);
});
test('respostas da Purin preservam o ambiente e a moeda antes de confirmar ou entregar',()=>{
 assert.doesNotThrow(()=>validatePaymentEnvironment({environment:'live',currency:'BRL'},'live'));
 assert.doesNotThrow(()=>validatePaymentEnvironment({currency:'BRL',orderCode:'fixture'},'live'));
 assert.doesNotThrow(()=>validatePaymentEnvironment({sandbox:true},'sandbox'));
 assert.throws(()=>validatePaymentEnvironment({environment:'sandbox'},'live'),/ENVIRONMENT_MISMATCH/);
 assert.throws(()=>validatePaymentEnvironment({sandbox:true},'live'),/ENVIRONMENT_MISMATCH/);
 assert.throws(()=>validatePaymentEnvironment({environment:'live'},'sandbox'),/ENVIRONMENT_MISMATCH/);
 assert.throws(()=>validatePaymentEnvironment({currency:'USD'},'live'),/CURRENCY_MISMATCH/);
 assert.throws(()=>validatePaymentEnvironment(null,'live'),/INVALID/);
});
test('normaliza os contratos oficiais de PIX, PIX de teste e cartão sem misturar ambientes',()=>{
 const pix={event:'charge.paid',paymentId:'psc_fixture',status:'paid',amountCents:3989};
 assert.deepEqual(paymentWebhookReference(pix),{paymentId:'psc_fixture',method:'pix',environment:'live',amountCents:3989});
 assert.deepEqual(paymentWebhookReference({...pix,event:'payment.paid',sandbox:true}),{paymentId:'psc_fixture',method:'pix',environment:'sandbox',amountCents:3989});
 assert.deepEqual(paymentWebhookReference({event:'card_payment.paid',orderCode:'CARD_FIXTURE',amount:49.90,status:'paid'}),{paymentId:'CARD_FIXTURE',method:'card',environment:'live',amountCents:4990});
 for(const event of [{...pix,sandbox:'true'},{...pix,amountCents:'3989'},{...pix,amountCents:1},{...pix,status:'pending'},{...pix,event:'withdrawal.completed'},{...pix,sandbox:true,environment:'live'},{event:'card_payment.paid',orderCode:'x',amount:49.9,status:'paid',sandbox:true}])assert.equal(paymentWebhookReference(event),null);
});
