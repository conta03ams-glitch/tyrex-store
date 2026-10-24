import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../lib/historical-metrics.json' with {type:'json'};
import {historicalMetrics,historicalRating} from '../lib/historical-metrics.ts';
import {initialProducts} from '../lib/catalog.ts';

test('os 36 históricos correspondem aos produtos fornecidos, sem vincular itens indisponíveis',()=>{
 assert.equal(Object.keys(data.products).length,36);
 for(const id of Object.keys(data.products))assert.ok(initialProducts.some(p=>p.id===id&&!p.blocked),id);
 for(const id of ['script-robux','netflix','canva-plus','chat-gpt-plus','missing','__proto__'])assert.equal(historicalMetrics(id),null,id);
 assert.equal(data.source,'owner-reported');
 assert.equal(data.precision,'estimate');
 assert.equal(data.periodStart,null);
 assert.equal(data.periodEnd,null);
});
test('a transferência conserva todos os totais e cada distribuição fecha com as avaliações',()=>{
 let sales=0,reviews=0;
 for(const [id,row] of Object.entries(data.products)){
  assert.ok(Number.isInteger(row.sold)&&row.sold>=0,id);
  assert.equal(row.stars.length,5,id);
  assert.ok(row.stars.every(n=>Number.isInteger(n)&&n>=0),id);
  assert.equal(row.stars.reduce((a,b)=>a+b,0),row.reviews,id);
  assert.ok(row.reviews<row.sold,id);
  sales+=row.sold;reviews+=row.reviews;
 }
 assert.equal(sales,8090);assert.equal(reviews,6755);
});
test('a média é ponderada pelas estrelas e só é arredondada na exibição',()=>{
 const gold=historicalMetrics('golds');
 assert.equal(gold.sold,342);assert.equal(gold.total,294);
 assert.equal(gold.distribution[5],277);
 assert.equal(gold.average,1451/294);
 assert.equal(historicalRating(gold.average),'4,94');
 assert.equal(historicalRating(historicalMetrics('dll-android').average),'4,95');
 assert.equal(historicalRating(historicalMetrics('bypass-ios').average),'4,82');
});
