import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {initialProducts} from '../lib/catalog.ts';
import {addCartLine,canonicalCart,cartLimit,cartProduct,replacementVariant,replaceCartLine,lineKey} from '../lib/cart.ts';
import {storeCatalog,validateCart} from '../lib/commerce.ts';

const base=initialProducts.find(p=>p.name==='Executor Tyrex');
const variant={id:'real-option',name:'Licença',price:1000,stock:null,unlimited:true,index:0};
test('carrinho adiciona itens diferentes, acumula quantidades e respeita estoque',()=>{
 let cart=addCartLine([],base,variant,2);
 cart=addCartLine(cart,base,variant,3);
 cart=addCartLine(cart,base,{...variant,id:'other-option',stock:2,unlimited:false},5);
 assert.equal(cart.length,2);assert.equal(cart[0].quantity,5);assert.equal(cart[1].quantity,2);
 cart=addCartLine(cart,base,{...variant,price:1200},1);
 assert.equal(cart[0].price,1200);assert.equal(cart[0].quantity,6);
});
test('carrinho aceita navegação sem chave e rejeita estoque zero, desconhecido e item bloqueado',()=>{
 assert.equal(addCartLine([],base,base.variants[0]).length,1);
 for(const v of [{...variant,unlimited:false,stock:0},{...variant,unlimited:false,stock:null}])assert.equal(cartLimit(base,v),0);
 assert.equal(addCartLine([],{...base,blocked:true},variant).length,0);
 for(const quantity of [0,-1,1.5,NaN])assert.equal(addCartLine([],base,variant,quantity).length,0);
});
test('sincronização usa identificadores, preços e estoque da Purin e mantém páginas conhecidas',()=>{
 const products=storeCatalog({products:[{id:'provider-product',name:'EXECUTOR TYREX',publicId:'executor',active:true,variations:[{...variant,price:'12,34',stock:3,unlimited:false}]}]},initialProducts);
 const p=products.find(p=>p.id===base.id);
 assert.equal(p.slug,base.slug);assert.equal(p.live,true);assert.equal(p.price,1234);assert.equal(p.variants[0].id,'real-option');
 assert.equal(validateCart([{productId:p.id,variantId:'real-option',price:1234,quantity:2}],products,2468).total,2468);
 assert.equal(products.find(p=>p.name==='Spotify Anual').variants[0].unlimited,false);
 assert.throws(()=>validateCart([{productId:p.id,variantId:'preview',price:1000,quantity:1}],products,1000));
});
test('novos produtos reais entram no catálogo com páginas e variações próprias',()=>{
 const products=storeCatalog({products:[{id:'new-provider-id',name:'Gift Card Steam Novo',active:true,description:'Saldo digital',variations:[{id:'steam-v',name:'R$ 50',price:'50,00',stock:null,unlimited:true}]}]},initialProducts);
 const added=products.find(p=>p.id==='purin-new-provider-id');
 assert.ok(added);assert.equal(added.category,'gift-card');assert.equal(added.live,true);assert.equal(added.price,5000);assert.ok(added.slug.endsWith('new-provider-id'));
 assert.equal(products.length,initialProducts.length+1);
});
test('sincronização falha com resposta inválida e não vende opções inválidas ou produtos inativos',()=>{
 assert.throws(()=>storeCatalog({},initialProducts),/INVALID_CATALOG/);
 for(const entry of [{active:false,variations:[variant]},{active:true,variations:[]},{active:true,variations:[{...variant,id:'',price:'inválido'}]}]){
  const p=storeCatalog({products:[{id:'remote',name:base.name,...entry}]},initialProducts).find(p=>p.id===base.id);
  assert.equal(p.live,false);assert.equal(cartLimit(p,p.variants[0]),0);
 }
});

test('linhas preservam o endereço próprio do produto após navegar',()=>{const line=addCartLine([],base,variant)[0];assert.equal(line.slug,base.slug);assert.equal(line.variantId,variant.id);});

test('sufixos FF e CS2 não duplicam os produtos e preservam capas e plataformas',()=>{
 const names=['Zimo Emulador','Zimo Rage Android','Zimo Rage iOS','Tyrex Rage AP Emulador','Tyrex Rage AP Android','Tyrex Rage AP iOS','Radar WEB','Raio XXXX','Conta C/ Premier'];
 const remote=names.map((name,i)=>({id:'remote-'+i,name:name+(/WEB|XXXX|Premier/.test(name)?' CS2':' FF'),active:true,variations:[{id:'option-'+i,name:'Semanal',price:'35,20',stock:10,unlimited:false}]}));
 remote.push({...remote[0],id:'duplicate-emulator'});
 const products=storeCatalog({products:remote},initialProducts);
 assert.equal(products.length,initialProducts.length);
 for(const name of names){const original=initialProducts.find(p=>p.name===name),p=products.find(p=>p.name===name);assert.equal(p.live,true,name);assert.equal(p.image,original.image);assert.equal(p.slug,original.slug);assert.equal(p.platform,original.platform);assert.equal(p.variants.length,1)}
 assert.notEqual(products.find(p=>p.name==='Zimo Rage Android').id,products.find(p=>p.name==='Zimo Rage iOS').id);
});

test('carrinho antigo mantém quantidades e preço visível ao unificar um produto duplicado',()=>{const product={...base,live:true,variants:[variant]},old={...addCartLine([],product,variant,2)[0],productId:'purin-legacy',slug:'legacy',price:1200};const current=addCartLine([],product,variant,1)[0];const cart=canonicalCart([old,current],[product]);assert.equal(cart.length,1);assert.equal(cart[0].quantity,3);assert.equal(cart[0].slug,product.slug);assert.equal(cart[0].price,1200);});

test('Spotify de seleção antiga é atualizado no carrinho e passa na validação de compra',()=>{
 const products=storeCatalog(JSON.parse(fs.readFileSync('lib/catalog-snapshot.json','utf8')),initialProducts),spotify=products.find(p=>p.id==='spotify-anual');
 const old={productId:'spotify-anual',slug:'spotify-anual',variantId:'preview',name:'Spotify Anual',variant:'Opção padrão',price:1000,quantity:1,image:'old',art:'catalog-image',color:'#fff',max:99};
 const canonical=canonicalCart([old],products);assert.equal(canonical[0].productId,'spotify-anual');assert.equal(canonical[0].price,1000);
 const option=replacementVariant(old,spotify);assert.equal(option.name,'ANUAL');
 const repaired=replaceCartLine(canonical,lineKey(old),spotify,option);assert.equal(repaired[0].price,2210);assert.equal(repaired[0].variantId,option.id);assert.equal(repaired[0].quantity,1);
 assert.equal(validateCart(repaired,products,2210).total,2210);
});
test('IDs genéricos não associam produtos diferentes e opções múltiplas exigem escolha',()=>{
 const p={...base,live:true,variants:[variant,{...variant,id:'second',name:'Anual'}]},old={...addCartLine([],p,variant)[0],productId:'missing',slug:'missing',variantId:'preview',variant:'Opção padrão'};
 assert.equal(cartProduct(old,[{...p,variants:[{...variant,id:'preview'}]}]),undefined);
 assert.equal(replacementVariant(old,p),undefined);
});
test('atualização preserva os demais itens e ajusta a quantidade ao estoque real',()=>{
 const p={...base,live:true},old=addCartLine([],p,variant,3)[0],other={...old,productId:'other',variantId:'other-v'};
 const updated=replaceCartLine([old,other],lineKey(old),p,{...variant,price:1300,unlimited:false,stock:1});
 assert.equal(updated.length,2);assert.deepEqual(updated.find(l=>l.productId==='other'),other);assert.equal(updated.find(l=>l.productId===p.id).quantity,1);assert.equal(updated.find(l=>l.productId===p.id).price,1300);
});

test('renomear Spotify na Purin mantém o mesmo produto comprável, com sua capa e página',()=>{
 const snapshot=JSON.parse(fs.readFileSync('lib/catalog-snapshot.json','utf8'));const remote=snapshot.products.find(p=>p.name==='Spotify Anual');remote.name='Assinatura Spotify Anual';
 const products=storeCatalog(snapshot,initialProducts),spotify=products.find(p=>p.id==='spotify-anual');
 assert.equal(products.length,initialProducts.length);assert.equal(spotify.live,true);assert.equal(spotify.variants[0].stock,10);assert.equal(spotify.price,2210);assert.equal(spotify.image,initialProducts.find(p=>p.id==='spotify-anual').image);assert.equal(spotify.slug,'spotify-anual');
 assert.equal(validateCart([{productId:spotify.id,variantId:spotify.variants[0].id,price:2210,quantity:1}],products,2210).total,2210);
});
test('vínculo estável não libera produto desativado nem fabrica estoque',()=>{
 const snapshot=JSON.parse(fs.readFileSync('lib/catalog-snapshot.json','utf8'));const remote=snapshot.products.find(p=>p.name==='Spotify Anual');remote.name='Assinatura Spotify Anual';remote.active=false;
 let spotify=storeCatalog(snapshot,initialProducts).find(p=>p.id==='spotify-anual');assert.equal(spotify.live,false);assert.equal(spotify.unavailableReason,'inactive');
 remote.active=true;remote.variations[0].stock=0;spotify=storeCatalog(snapshot,initialProducts).find(p=>p.id==='spotify-anual');assert.equal(spotify.live,true);assert.equal(cartLimit(spotify,spotify.variants[0]),0);
 remote.variations=[];spotify=storeCatalog(snapshot,initialProducts).find(p=>p.id==='spotify-anual');assert.equal(spotify.live,false);assert.equal(spotify.unavailableReason,'no_variants');
});

test('catálogo revisado mantém todos os preços, estoques e IDs de opção da Purin',()=>{
 const snapshot=JSON.parse(fs.readFileSync('lib/catalog-snapshot.json','utf8')),products=storeCatalog(snapshot,initialProducts);
 assert.equal(products.length,initialProducts.length);assert.equal(new Set(products.map(p=>p.id)).size,products.length);
 for(const source of snapshot.products){if(/script.*robux/i.test(source.name))continue;const product=products.find(p=>p.variants.some(v=>v.id===source.variations[0]?.id));assert.ok(product,source.name);assert.equal(product.live,true,source.name);assert.equal(product.variants.length,source.variations.length);
  for(const variation of source.variations){const v=product.variants.find(v=>v.id===variation.id);assert.ok(v,source.name);assert.equal(v.price,Math.round(Number(variation.price)*100));assert.equal(v.stock,variation.stock);assert.equal(v.unlimited,variation.unlimited);if(v.unlimited||v.stock>0)assert.equal(validateCart([{productId:product.id,variantId:v.id,quantity:1,price:v.price}],products,v.price).total,v.price);}
 }
 for(const id of ['shark-menu','spoofer-tyrex','felipe-menu'])assert.equal(products.find(p=>p.id===id).category,'fivem');assert.equal(products.find(p=>p.id==='ez-8-ball-pool').category,'8-ball-pool');
 assert.equal(products.filter(p=>p.category==='fivem').length,3);
});
