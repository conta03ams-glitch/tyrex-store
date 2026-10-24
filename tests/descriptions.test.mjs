import test from 'node:test';
import assert from 'node:assert/strict';
import {storeCatalog} from '../lib/commerce.ts';
import {initialProducts} from '../lib/catalog.ts';
test('descrição da Purin substitui texto antigo sem truncar ou alterar conteúdo e mantém plataforma',()=>{
 const product=initialProducts[0];const description='## Funções\n**Detalhes**\n'+('Texto do fornecedor. '.repeat(150));
 const remote={products:[{name:product.name,id:'source',description,variations:[{id:'variant',price:10,unlimited:true}]}]};
 const updated=storeCatalog(remote,[product])[0];assert.equal(updated.description,description);assert.equal(updated.platform,product.platform);
 remote.products[0].description='';assert.equal(storeCatalog(remote,[product])[0].description,'');
 remote.products[0].active=false;remote.products[0].description=description;const inactive=storeCatalog(remote,[product])[0];assert.equal(inactive.description,description);assert.equal(inactive.live,false);
});
