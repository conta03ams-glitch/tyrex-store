import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import coverOverrides from '../lib/product-art.json' with {type:'json'};
import categoryArtwork from '../lib/category-art.json' with {type:'json'};
import {initialProducts} from '../lib/catalog.ts';
test('cada produto tem capa exclusiva, comprimida sem perda e com enquadramento preservado',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../.openai/image-optimization.json',import.meta.url),'utf8'));
 const seen=new Set();
 for(const p of initialProducts){
  assert.equal(p.art,'catalog-image');assert.equal(p.image,coverOverrides[p.slug]||'/assets/products/v4/'+p.slug+'.webp');
  const file='public'+p.image;assert.ok(fs.existsSync(new URL('../'+file,import.meta.url)),p.name);
  const image=report.images[file];assert.ok(image?.pixelVerified,p.name);assert.ok(image.width/image.height>=1.4&&image.width/image.height<=(p.imageFit==='contain'?1.9:1.6),p.name+' enquadramento horizontal');
  assert.ok(!seen.has(image.sha256),p.name+' deve ter capa exclusiva');seen.add(image.sha256);
 }
 assert.equal(seen.size,initialProducts.length);
});

test('as novas artes e o logo Shark estão nas galerias com compressão verificada',()=>{const report=JSON.parse(fs.readFileSync('.openai/image-optimization.json','utf8'));for(const id of ['shark-menu','spoofer-tyrex','felipe-menu','ez-8-ball-pool']){const p=initialProducts.find(p=>p.id===id);assert.equal(p.imageFit,'contain');assert.ok(p.gallery.includes(p.image));for(const path of p.gallery)assert.equal(report.images['public'+path]?.pixelVerified,true,path);}assert.ok(initialProducts.find(p=>p.id==='shark-menu').gallery.some(path=>path.endsWith('shark-menu-logo.webp')));});


test('seleções do proprietário e revisões de painel mantêm os arquivos e pixels verificados',()=>{
 const manifest=JSON.parse(fs.readFileSync('design/product-art-v5.json','utf8'));
 const report=JSON.parse(fs.readFileSync('.openai/image-optimization.json','utf8'));
 assert.equal(manifest.assets.filter(a=>a.ownerSelected).length,3);
 for(const asset of manifest.assets){
  const path='public'+asset.asset;
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),asset.sha256,asset.slug);
  assert.equal(report.images[path].decodedPixelSha256,asset.decodedPixelSha256,asset.slug);
  if(!asset.slug.startsWith('category-'))assert.equal(initialProducts.find(p=>p.slug===asset.slug)?.image,asset.asset,asset.slug);
 }
 for(const slug of ['ez-8-ball-pool','spoofer-tyrex','shark-menu'])assert.ok(manifest.assets.find(a=>a.slug===slug)?.ownerSelected);
});

test('categorias preservam as cenas e incluem Standoff 2 e FiveM revisados',()=>{
 const kept={roblox:'executor-tyrex','gift-card':'gift-card-steam','cs-2':'skinchanger-cs2',assinaturas:'spotify-anual','8-ball-pool':'ez-8-ball-pool'};
 for(const [id,slug] of Object.entries(kept))assert.equal(categoryArtwork[id],'/assets/products/v4/'+slug+'.webp');
 for(const id of ['standoff-2','fivem']){assert.equal(categoryArtwork[id],'/assets/categories/v3/'+id+'.webp');assert.ok(fs.existsSync('public'+categoryArtwork[id]));}
 for(const id of ['free-fire','valorant']){assert.equal(categoryArtwork[id],'/assets/categories/v2/'+id+'.webp');assert.ok(fs.existsSync('public'+categoryArtwork[id]));}
});
