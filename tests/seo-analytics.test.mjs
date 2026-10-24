import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {initialProducts,categories} from '../lib/catalog.ts';
import {pages,pageMetadata,productPageInfo,categoryPageInfo,catalogPageInfo,sitemapXml,robotsText,SITE_URL,SOCIAL_IMAGE,SOCIAL_IMAGE_WIDTH,SOCIAL_IMAGE_HEIGHT} from '../lib/seo.ts';
import {analyticsPath,analyticsConsent,validMeasurementId,commerceItems,trackCommerce,ANALYTICS_CONSENT_KEY,setRuntimeAnalyticsConsent,flushCommerceEvents} from '../lib/analytics.ts';

test('cada rota de conteúdo usa metadados e cada página estática tem título e descrição próprios',()=>{
 const titles=new Set(),descriptions=new Set();
 for(const info of Object.values(pages)){
  const metadata=pageMetadata(info);
  assert.ok(metadata.title.absolute.includes('TYREX STORE'));
  assert.ok(metadata.description.length>=40&&metadata.description.length<=160);
  assert.equal(metadata.alternates.canonical,new URL(info.path,SITE_URL).href);
  assert.equal(metadata.openGraph.title,metadata.title.absolute);
  assert.equal(metadata.openGraph.description,metadata.description);
  assert.equal(metadata.twitter.card,'summary_large_image');
  titles.add(metadata.title.absolute);descriptions.add(metadata.description);
 }
 assert.equal(titles.size,Object.keys(pages).length);assert.equal(descriptions.size,Object.keys(pages).length);
 function check(directory){for(const item of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,item.name);if(item.isDirectory())check(file);else if(item.name==='page.tsx'){const source=fs.readFileSync(file,'utf8');assert.match(source,/export (?:const metadata|async function generateMetadata)/,file);assert.match(source,/pageMetadata/,file);}}}
 check(fileURLToPath(new URL('../app',import.meta.url)));
});
test('cada produto recebe título, descrição, URL canônica e imagem social absolutos',()=>{
 const titles=new Set();
 for(const product of initialProducts){
  const metadata=pageMetadata(productPageInfo(product));
  assert.ok(metadata.description.length>30);assert.ok(metadata.description.length<=160);
  assert.equal(metadata.alternates.canonical,SITE_URL+'/produto/'+product.slug);
  assert.ok(metadata.openGraph.images[0].url.startsWith(SITE_URL));
  assert.equal(metadata.robots.index,!product.blocked);titles.add(metadata.title.absolute);
 }
 assert.equal(titles.size,initialProducts.length);
});
test('categorias têm metadados próprios; busca e favoritos não criam páginas indexáveis duplicadas',()=>{
 const category=categories.find(c=>c.id==='free-fire');
 const normal=catalogPageInfo({categoria:category.id},categories,initialProducts);
 assert.equal(normal.title,categoryPageInfo(category,10).title);assert.equal(normal.index,true);
 for(const params of [{q:'consulta pessoal'},{favoritos:'1'},{categoria:'free-fire',q:'busca'},{categoria:'inexistente'},{ordenar:'menor-preco'}]){
  const info=catalogPageInfo(params,categories,initialProducts);assert.equal(info.index,false);assert.ok(!info.path.includes('consulta'));assert.ok(!info.path.includes('favoritos'));
 }
 assert.equal(catalogPageInfo({categoria:'valorant'},categories,initialProducts).index,false);
});
test('compra, pedidos, administração, redirecionamentos e erros possuem noindex explícito',()=>{
 for(const key of ['checkout','orders','admin','account','login','help','missing']){
  const metadata=pageMetadata(pages[key]);assert.equal(metadata.robots.index,false);assert.equal(metadata.robots.googleBot.index,false);
 }
});
test('sitemap inclui todas as páginas elegíveis e acompanha novos produtos automaticamente',()=>{
 const xml=sitemapXml(initialProducts,categories);
 assert.match(xml,/xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
 const eligible=initialProducts.filter(p=>!p.blocked),populated=categories.filter(c=>eligible.some(p=>p.category===c.id));
 assert.equal((xml.match(/<loc>/g)||[]).length,5+eligible.length+populated.length);
 for(const product of eligible)assert.ok(xml.includes(SITE_URL+'/produto/'+product.slug));
 for(const value of ['/checkout','/pedidos','/gestao','/minha-conta','/entrar','/ajuda','script-robux','favoritos=','q=','<lastmod>'])assert.ok(!xml.includes(value));
 const next=sitemapXml([...initialProducts,{...initialProducts[0],id:'future',slug:'produto-futuro'}],categories);assert.ok(next.includes('/produto/produto-futuro'));
 const escaped=sitemapXml([{...initialProducts[0],slug:'a&b'}],categories);assert.ok(escaped.includes('/produto/a&amp;b'));
});
test('robots aponta ao sitemap e não bloqueia assets ou HTML que precisa expor noindex',()=>{
 const text=robotsText();assert.match(text,/User-agent: \*/);assert.match(text,/Allow: \//);assert.ok(text.includes('Sitemap: '+SITE_URL+'/sitemap.xml'));
 for(const route of ['/checkout','/pedidos','/gestao','/minha-conta','/entrar','/catalogo','/assets','/_next/static'])assert.ok(!text.includes('Disallow: '+route));
 assert.ok(text.includes('Disallow: /api/'));
});
test('imagem Open Graph existe e declara as dimensões reais do PNG',()=>{
 const image=fs.readFileSync(new URL('../public'+SOCIAL_IMAGE,import.meta.url));
 assert.equal(image.subarray(1,4).toString(),'PNG');assert.equal(image.readUInt32BE(16),SOCIAL_IMAGE_WIDTH);assert.equal(image.readUInt32BE(20),SOCIAL_IMAGE_HEIGHT);
 assert.ok(SOCIAL_IMAGE_WIDTH/SOCIAL_IMAGE_HEIGHT>1.85&&SOCIAL_IMAGE_WIDTH/SOCIAL_IMAGE_HEIGHT<2.0);assert.ok(image.length<8_000_000);
});
test('todas as imagens entregues possuem relatório atual de compressão sem perda',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../.openai/image-optimization.json',import.meta.url),'utf8'));
 function check(directory){for(const item of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,item.name);if(item.isDirectory())check(file);else if(/\.(png|webp|jpe?g)$/i.test(item.name)){
  const relative=path.relative(new URL('../',import.meta.url).pathname,file),record=report.images[relative];
  assert.ok(record,relative);assert.equal(record.pixelVerified,true);assert.equal(record.sha256,createHash('sha256').update(fs.readFileSync(file)).digest('hex'));assert.ok(record.afterBytes<=record.beforeBytes);
 }}}
 check(fileURLToPath(new URL('../public',import.meta.url)));
});
test('Analytics recusa ID inválido e não expõe parâmetros de busca, pedidos ou gestão',()=>{
 assert.equal(validMeasurementId('G-TEST123456'),'G-TEST123456');
 for(const id of [undefined,'G-','UA-123456','G-abc123','<script>'])assert.equal(validMeasurementId(id),null);
 for(const route of ['/checkout','/pedidos','/gestao','/api/status','/ajuda','/.well-known/test'])assert.equal(analyticsPath(route),null);
 assert.equal(analyticsPath('/catalogo','free-fire'),'/catalogo?categoria=free-fire');assert.equal(analyticsPath('/catalogo','nome-pessoal'),'/catalogo');assert.equal(analyticsPath('/produto/executor-tyrex'),'/produto/executor-tyrex');
});
test('eventos de comércio dependem de consentimento e incluem somente dados dos itens',()=>{
 const items=[{productId:'test-product',name:'Produto de teste',variant:'Padrão',price:1234,quantity:2,email:'never@example.test',accessToken:'never-send',discord:'never-send'}];
 const mapped=commerceItems(items);assert.deepEqual(mapped,[{item_id:'test-product',item_name:'Produto de teste',item_variant:'Padrão',price:12.34,quantity:2}]);
 assert.equal(analyticsConsent(null),null);assert.equal(analyticsConsent('broken'),null);assert.equal(analyticsConsent('{"version":1,"accepted":false}'),false);
 const originalWindow=globalThis.window,originalStorage=globalThis.localStorage;
 const events=[];let accepted=false;
 globalThis.window={gtag:(...args)=>events.push(args)};globalThis.localStorage={getItem:key=>key===ANALYTICS_CONSENT_KEY?JSON.stringify({version:1,accepted}):null};
 try{
  assert.equal(trackCommerce('add_to_cart',items,2468),false);assert.equal(events.length,0);
  accepted=true;assert.equal(trackCommerce('purchase',items,2468,'TX-TEST'),true);assert.equal(events[0][2].transaction_id,'TX-TEST');assert.equal(events[0][2].value,24.68);
  assert.ok(!JSON.stringify(events).includes('never-send'));assert.ok(!JSON.stringify(events).includes('never@example'));
  setRuntimeAnalyticsConsent(false);assert.equal(trackCommerce('add_to_cart',items,2468),false);assert.equal(events.length,1);
  setRuntimeAnalyticsConsent(true);delete window.gtag;assert.equal(trackCommerce('add_to_cart',items,2468),true);assert.equal(events.length,1);window.gtag=(...args)=>events.push(args);flushCommerceEvents();assert.equal(events.length,2);
 }finally{setRuntimeAnalyticsConsent(null);if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;}
});

test('carrinho dedicado tem metadados, noindex e fica fora de sitemap e Analytics',()=>{assert.equal(pageMetadata(pages.cart).robots.index,false);assert.ok(!sitemapXml(initialProducts,categories).includes('/carrinho'));assert.equal(analyticsPath('/carrinho'),null);});

 test('a área pessoal não gera page views e fica fora do sitemap',()=>{for(const route of ['/minha-conta','/entrar']){assert.equal(analyticsPath(route),null);assert.ok(!sitemapXml(initialProducts,categories).includes(SITE_URL+route));}assert.equal(pageMetadata(pages.account).robots.index,false);assert.equal(pageMetadata(pages.login).robots.index,false);});
