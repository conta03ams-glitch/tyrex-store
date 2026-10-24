import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {orderAccessAllowed} from '../lib/order-access.ts';
const hash=v=>createHash('sha256').update(v).digest('hex'),secret='a'.repeat(48),guest={userId:null,tokenHash:hash(secret)};
test('visitante só acessa pedido e entrega com a chave correta',()=>{assert.equal(orderAccessAllowed(guest,null,hash(secret)),true);for(const user of [null,'other-user'])for(const token of [null,'',hash('wrong')])assert.equal(orderAccessAllowed(guest,user,token),false);});
test('pedido com conta continua restrito ao proprietário ou à chave secreta',()=>{const order={...guest,userId:'owner'};assert.equal(orderAccessAllowed(order,'owner',null),true);assert.equal(orderAccessAllowed(order,'other',null),false);assert.equal(orderAccessAllowed(order,null,null),false);assert.equal(orderAccessAllowed(order,null,hash(secret)),true);});
