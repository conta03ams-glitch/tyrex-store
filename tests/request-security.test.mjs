import test from 'node:test';
import assert from 'node:assert/strict';
import {requestIsSameOrigin,readLimitedBytes,readTextLimited,readJsonLimited,readFormLimited} from '../lib/request-security.ts';
import {securityHeaders,reviewPhotoCSP,secureResponse} from '../lib/security-headers.mjs';
const url='https://store.example.test/api/checkout';
const status=code=>error=>error.status===code;

test('requisições de origem estrangeira são rejeitadas, incluindo Fetch Metadata sem Origin',()=>{
 assert.equal(requestIsSameOrigin(new Request(url,{headers:{origin:'https://attacker.example.test'}})),false);
 assert.equal(requestIsSameOrigin(new Request(url,{headers:{origin:'null'}})),false);
 assert.equal(requestIsSameOrigin(new Request(url,{headers:{'sec-fetch-site':'cross-site'}})),false);
 assert.equal(requestIsSameOrigin(new Request(url,{headers:{origin:'https://store.example.test','sec-fetch-site':'same-origin'}})),true);
 assert.equal(requestIsSameOrigin(new Request(url)),true);
});
test('o limite real interrompe streaming mesmo com Content-Length pequeno ou ausente',async()=>{
 for(const headers of [{},{'content-length':'1'}]){
  let cancelled=false;
  const body=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(8));},cancel(){cancelled=true;}});
  const req=new Request(url,{method:'POST',headers,body,duplex:'half'});
  await assert.rejects(()=>readLimitedBytes(req,10),status(413));
  assert.equal(cancelled,true);
 }
 await assert.rejects(()=>readLimitedBytes(new Request(url,{method:'POST',headers:{'content-length':'99999999'},body:'{}'}),100),status(413));
});
test('JSON aceita somente o formato esperado e respeita bytes UTF-8, sem arredondar pelo tamanho textual',async()=>{
 assert.deepEqual(await readJsonLimited(new Request(url,{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:'{"items":[]}'})),{items:[]});
 await assert.rejects(()=>readJsonLimited(new Request(url,{method:'POST',body:'{}'})),status(415));
 await assert.rejects(()=>readJsonLimited(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:'broken'})),status(400));
 await assert.rejects(()=>readTextLimited(new Request(url,{method:'POST',body:'ééé'}),4),status(413));
 assert.equal(await readTextLimited(new Request(url,{method:'POST',body:'ééé'}),6),'ééé');
});
test('o leitor de formulários conserva o arquivo e rejeita o upload antes do parser exceder o limite',async()=>{
 const form=new FormData();form.set('name','Cliente');form.set('photo',new File([new Uint8Array([255,216,255,1])],'foto.jpg',{type:'image/jpeg'}));
 const parsed=await readFormLimited(new Request(url,{method:'POST',body:form}),4096);
 assert.equal(parsed.get('name'),'Cliente');assert.deepEqual(new Uint8Array(await parsed.get('photo').arrayBuffer()),new Uint8Array([255,216,255,1]));
 const large=new FormData();large.set('photo',new File([new Uint8Array(5000)],'foto.jpg',{type:'image/jpeg'}));
 const encoded=new Request(url,{method:'POST',body:large}),contentType=encoded.headers.get('content-type'),bytes=await encoded.arrayBuffer();
 await assert.rejects(()=>readFormLimited(new Request(url,{method:'POST',headers:{'content-type':contentType},body:bytes}),512),status(413));
});
test('os cabeçalhos preservam a CSP restrita de fotos e não exigem criptografar segredos no navegador',()=>{
 const headers=Object.fromEntries(securityHeaders.map(h=>[h.key,h.value]));
 assert.equal(headers['X-Content-Type-Options'],'nosniff');
 assert.match(headers['Content-Security-Policy'],/object-src 'none'/);
 assert.match(headers['Content-Security-Policy'],/form-action 'self'/);
 assert.equal(reviewPhotoCSP,"default-src 'none'; sandbox");
});

test('a resposta final conserva corpo, redirects, cookies e a política mais restrita',async()=>{
 const original=new Response('<p>TYREX</p>',{headers:{'Content-Type':'text/html','Set-Cookie':'session=fixture; Secure; HttpOnly'}});
 const html=secureResponse(original);
 assert.equal(await html.text(),'<p>TYREX</p>');
 assert.equal(html.headers.get('X-Content-Type-Options'),'nosniff');
 assert.match(html.headers.get('Content-Security-Policy'),/form-action 'self'/);
 assert.equal(html.headers.get('Set-Cookie'),'session=fixture; Secure; HttpOnly');
 const redirect=secureResponse(new Response(null,{status:302,headers:{Location:'/entrar'}}));
 assert.equal(redirect.status,302);assert.equal(redirect.headers.get('Location'),'/entrar');
 const photo=secureResponse(new Response(null,{headers:{'Content-Security-Policy':reviewPhotoCSP}}));
 assert.equal(photo.headers.get('Content-Security-Policy'),reviewPhotoCSP);
});
