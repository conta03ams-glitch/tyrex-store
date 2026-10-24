import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {encryptDelivery,decryptDelivery,deliveryExpiry,safeDownloadUrl,CLAIM_KEY_SQL} from '../lib/delivery-crypto.ts';
test('keys são cifradas com IV independente e protegidas contra alteração e troca de opção',async()=>{const secret=randomBytes(32).toString('hex'),text='FIXTURE-KEY-NOT-REAL';const a=await encryptDelivery(text,secret,'v1:live'),b=await encryptDelivery(text,secret,'v1:live');assert.notEqual(a,b);assert.ok(!a.includes(text));assert.equal(await decryptDelivery(a,secret,'v1:live'),text);await assert.rejects(()=>decryptDelivery(a,secret,'v1:sandbox'));await assert.rejects(()=>decryptDelivery(a,randomBytes(32).toString('hex'),'v1:live'));await assert.rejects(()=>encryptDelivery(text,'invalid','v1:live'));});
test('validade usa somente prazo explícito e downloads aceitam somente HTTPS',()=>{assert.equal(deliveryExpiry('2026-10-22T12:00:00.000Z',7),'2026-10-29T12:00:00.000Z');assert.equal(deliveryExpiry('2026-10-22T12:00:00.000Z',null),null);for(const u of ['javascript:alert(1)','http://a.com','https://user:pass@a.com'])assert.equal(safeDownloadUrl(u),'');assert.equal(safeDownloadUrl('https://example.com/download'),'https://example.com/download')});
test('alocação SQL é idempotente, exclusiva, vinculada ao pedido pago de visitante ou usuário e separa estoque real do teste',()=>{const migrations=fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort().map(f=>fs.readFileSync('drizzle/'+f,'utf8'));const result=spawnSync('python3',['-c',`
import sqlite3,json,sys
p=json.load(sys.stdin);db=sqlite3.connect(':memory:')
for sql in p['migrations']:db.executescript(sql)
def order(id,user,status):
 db.execute("INSERT INTO orders(id,token_hash,request_key,user_id,email,name,items,total,status,payment_method,environment,created_at,updated_at) VALUES(?,?,?,?,?,?,?,100,?,'pix','live','now','now')",(id,'hash',id,user,'fixture@example.com','Fixture','[]',status))
for args in [('A','u1','paid'),('B','u2','paid'),('P','u1','pending'),('G',None,'paid'),('GP',None,'pending')]:order(*args)
for id,env in [('L1','live'),('L2','live'),('T1','sandbox'),('G1','live')]:db.execute("INSERT INTO digital_stock(id,variant_id,environment,payload,fingerprint,created_at) VALUES(?,'v1',?,'encrypted',?,'now')",(id,env,id))
def claim(o,user,unit,env='live'):
 ref=o+':v1:'+str(unit)
 db.execute(p['sql'],(o,ref,'2026-10-22',None,'instructions','','v1',env,ref,o,user))
claim('P','u1',0);claim('A','wrong-user',0);claim('GP',None,0);claim('G','wrong-user',0)
assert db.execute('SELECT count(*) FROM digital_stock WHERE order_id IS NOT NULL').fetchone()[0]==0
claim('A','u1',0);claim('A','u1',0);claim('B','u2',0)
assert db.execute("SELECT count(*) FROM digital_stock WHERE order_id='A'").fetchone()[0]==1
assert db.execute("SELECT count(*) FROM digital_stock WHERE order_id='B'").fetchone()[0]==1
claim('G',None,0);claim('G',None,0)
assert db.execute("SELECT count(*) FROM digital_stock WHERE order_id='G'").fetchone()[0]==1
claim('A','u1',1)
assert db.execute("SELECT order_id FROM digital_stock WHERE id='T1'").fetchone()[0] is None
assert db.execute("SELECT count(DISTINCT unit_ref) FROM digital_stock WHERE order_id IS NOT NULL").fetchone()[0]==3
print('ok')
`],{input:JSON.stringify({migrations,sql:CLAIM_KEY_SQL}),encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'ok');});
