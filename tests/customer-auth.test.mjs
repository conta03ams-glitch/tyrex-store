import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {generateKeyPair,SignJWT} from 'jose';
import {firebasePublicConfig,verifyFirebaseGoogleToken,resolveCustomerSession,authHash,randomAuthToken,cookieValue,matchingAuthCsrf,secretCookie,CUSTOMER_COOKIE,SESSION_SECONDS,safeCustomerReturnPath,customerSignInPath} from '../lib/customer-auth-core.ts';

const project='tyrex-auth-test',now=new Date('2026-10-24T00:00:00Z'),seconds=now.getTime()/1000;
const keys=await generateKeyPair('RS256');
const claims={sub:'firebase-google-user',email:'cliente@example.test',email_verified:true,name:'Cliente Tyrex',auth_time:seconds-20,firebase:{sign_in_provider:'google.com'}};
async function signed(changes={},signingKey=keys.privateKey){return new SignJWT({...claims,...changes}).setProtectedHeader({alg:'RS256',kid:'google-fixture-key'}).setIssuer('https://securetoken.google.com/'+project).setAudience(project).setIssuedAt(seconds-10).setExpirationTime(seconds+3600).sign(signingKey);}
const options={now,resolveKey:async header=>{assert.equal(header.kid,'google-fixture-key');return keys.publicKey;}};

test('configuração Google só é ativada com os identificadores reais e flag explícita',()=>{
 const config={FIREBASE_GOOGLE_ENABLED:'true',FIREBASE_API_KEY:'AIza'+'x'.repeat(35),FIREBASE_PROJECT_ID:project,FIREBASE_AUTH_DOMAIN:project+'.firebaseapp.com'};
 assert.deepEqual(firebasePublicConfig(config),{apiKey:config.FIREBASE_API_KEY,projectId:project,authDomain:project+'.firebaseapp.com'});
 for(const change of [{FIREBASE_GOOGLE_ENABLED:'false'},{FIREBASE_API_KEY:''},{FIREBASE_AUTH_DOMAIN:'attacker.example.test'},{FIREBASE_PROJECT_ID:'../wrong'}])assert.equal(firebasePublicConfig({...config,...change}),null);
});
test('aceita apenas identidade Google assinada para o projeto configurado',async()=>{
 const token=await signed(),user=await verifyFirebaseGoogleToken(token,project,options);
 assert.equal(user.email,claims.email);assert.match(user.userId,/^google:[a-f0-9]{64}$/);assert.equal(user.fullName,'Cliente Tyrex');
 assert.equal((await verifyFirebaseGoogleToken(await signed({email:'outro@example.test'}),project,options)).userId,user.userId);
 assert.notEqual((await verifyFirebaseGoogleToken(await signed({sub:'different-user'}),project,options)).userId,user.userId);
 await assert.rejects(()=>verifyFirebaseGoogleToken(token,'wrong-project',options));
 const wrongKeys=await generateKeyPair('RS256');await assert.rejects(async()=>verifyFirebaseGoogleToken(await signed({},wrongKeys.privateKey),project,options));
 const parts=token.split('.');parts[1]=Buffer.from(JSON.stringify({...claims,email:'attacker@example.test'})).toString('base64url');await assert.rejects(()=>verifyFirebaseGoogleToken(parts.join('.'),project,options));
 await assert.rejects(()=>verifyFirebaseGoogleToken('eyJhbGciOiJub25lIn0.e30.',project,options));
});
test('recusa provedor diferente, e-mail não verificado, tenants e autenticação antiga ou futura',async()=>{
 for(const change of [
  {email_verified:false},{email:'invalid'},{sub:''},{auth_time:seconds-301},{auth_time:seconds+1},{auth_time:undefined},
  {firebase:{sign_in_provider:'custom'}},{firebase:{sign_in_provider:'anonymous'}},
  {firebase:{sign_in_provider:'google.com',tenant:'another-tenant'}},
 ])await assert.rejects(()=>signed(change).then(token=>verifyFirebaseGoogleToken(token,project,options)));
 const expired=await new SignJWT(claims).setProtectedHeader({alg:'RS256',kid:'google-fixture-key'}).setIssuer('https://securetoken.google.com/'+project).setAudience(project).setIssuedAt(seconds-4000).setExpirationTime(seconds-1).sign(keys.privateKey);
 await assert.rejects(()=>verifyFirebaseGoogleToken(expired,project,options));
 const future=await new SignJWT(claims).setProtectedHeader({alg:'RS256',kid:'google-fixture-key'}).setIssuer('https://securetoken.google.com/'+project).setAudience(project).setIssuedAt(seconds+1).setExpirationTime(seconds+3600).sign(keys.privateKey);
 await assert.rejects(()=>verifyFirebaseGoogleToken(future,project,options));
});
test('cabeçalhos ChatGPT nunca autenticam o cliente; sessão exige cookie e registro válido',async()=>{
 const user=await verifyFirebaseGoogleToken(await signed(),project,options),token=randomAuthToken(),hash=await authHash(token),sessions=new Map([[hash,{...user,projectId:project,expiresAt:1001}]]);
 let calls=0;const lookup=async key=>{calls++;return sessions.get(key)};
 const platform=new Headers({'oai-authenticated-user-id':user.userId,'oai-authenticated-user-email':user.email});
 assert.equal(await resolveCustomerSession(platform,project,lookup,1000),null);assert.equal(calls,0);
 const headers=new Headers({cookie:CUSTOMER_COOKIE+'='+token});assert.deepEqual(await resolveCustomerSession(headers,project,lookup,1000),user);
 assert.equal(await resolveCustomerSession(headers,project,lookup,1001),null);
 assert.equal(await resolveCustomerSession(headers,'other-project',lookup,1000),null);
 sessions.delete(hash);assert.equal(await resolveCustomerSession(headers,project,lookup,1000),null);
});
test('cookies são opacos, protegidos e limitados; CSRF rejeita valores ausentes, alterados e duplicados',()=>{
 const token=randomAuthToken(),cookie=secretCookie(CUSTOMER_COOKIE,token,SESSION_SECONDS);assert.equal(token.length,64);
 for(const flag of ['Path=/','Secure','HttpOnly','SameSite=Lax','Max-Age=28800'])assert.ok(cookie.includes(flag));assert.ok(!cookie.includes('Domain='));
 assert.ok(secretCookie(CUSTOMER_COOKIE,'',0).includes('Max-Age=0'));
 assert.equal(cookieValue(CUSTOMER_COOKIE+'='+token,CUSTOMER_COOKIE),token);
 assert.equal(cookieValue(CUSTOMER_COOKIE+'='+token+'; '+CUSTOMER_COOKIE+'='+token,CUSTOMER_COOKIE),null);
 assert.equal(matchingAuthCsrf(token,token),true);
 for(const bad of [null,'','wrong','b'.repeat(64)])assert.equal(matchingAuthCsrf(token,bad),false);
 assert.equal(matchingAuthCsrf('',token),false);assert.equal(matchingAuthCsrf('bad',token),false);
});
test('retorno de login impede redirecionamento externo e preserva a compra',()=>{
 assert.equal(safeCustomerReturnPath('/checkout'),'/checkout');assert.equal(customerSignInPath('/checkout'),'/entrar?retorno=%2Fcheckout');
 for(const value of ['https://evil.example','//evil.example','/\\evil.example','/%2f%2fevil.example','/%0a/evil','/api/auth/logout','/signin-with-chatgpt','/callback','/entrar'])assert.equal(safeCustomerReturnPath(value),'/minha-conta');
});
test('migração adiciona sessões sem alterar pedidos e deduplica o token Firebase de entrada',()=>{
 const sql=fs.readFileSync('drizzle/0004_cool_microchip.sql','utf8');assert.ok(!/DROP|ALTER|INSERT|UPDATE|DELETE/i.test(sql));
 const script="import sqlite3,sys,json\nc=sqlite3.connect(':memory:')\nc.executescript(sys.argv[1])\nq='INSERT INTO customer_sessions VALUES(?,?,?,?,?,?,?,?)'\nr=('hash1','google:user','project','cliente@example.test',None,'firebase-token-hash',1000,'date')\nc.execute(q,r)\ntry:\n c.execute(q,('hash2',)+r[1:])\nexcept sqlite3.IntegrityError:\n print('deduplicated')";
 assert.equal(execFileSync('python3',['-c',script,sql],{encoding:'utf8'}).trim(),'deduplicated');
});
test('compra antiga exige chave original e uma compra Google não é transferida',()=>{
 const sql="UPDATE orders SET user_id=? WHERE id=? AND token_hash=? AND (user_id IS NULL OR user_id NOT LIKE 'google:%') RETURNING id";
 const script="import sqlite3,sys,json\nc=sqlite3.connect(':memory:')\nc.execute('CREATE TABLE orders(id TEXT,user_id TEXT,token_hash TEXT)')\nc.executemany('INSERT INTO orders VALUES(?,?,?)',[('guest',None,'secret'),('legacy','old-platform-id','secret'),('google','google:another','secret')])\nresults=[]\nfor id,key in [('guest','wrong'),('guest','secret'),('legacy','secret'),('google','secret'),('legacy','secret')]:results.append(len(c.execute(sys.argv[1],('google:current',id,key)).fetchall()))\nprint(json.dumps(results))";
 assert.deepEqual(JSON.parse(execFileSync('python3',['-c',script,sql],{encoding:'utf8'})),[0,1,1,0,0]);
});

test('e-mail e senha exige confirmação e mantém a mesma identidade Firebase entre provedores',async()=>{const google=await verifyFirebaseGoogleToken(await signed(),project,options);const password=await verifyFirebaseGoogleToken(await signed({firebase:{sign_in_provider:'password'}}),project,options);assert.equal(password.userId,google.userId);await assert.rejects(()=>signed({firebase:{sign_in_provider:'password'},email_verified:false}).then(token=>verifyFirebaseGoogleToken(token,project,options)));});
