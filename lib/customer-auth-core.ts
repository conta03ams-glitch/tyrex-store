import {importX509, jwtVerify, type JWTVerifyGetKey} from 'jose';

export type FirebasePublicConfig = {apiKey:string; authDomain:string; projectId:string; appId?:string};
export type Customer = {userId:string; email:string; fullName:string|null; displayName:string};
export const CUSTOMER_COOKIE='__Host-tyrex-customer';
export const AUTH_CSRF_COOKIE='__Host-tyrex-auth-csrf';
export const SESSION_SECONDS=8*60*60;
export const AUTH_CSRF_SECONDS=10*60;
export const FIREBASE_CERTIFICATES='https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// These Firebase web settings are public identifiers, never a service-account private key.
export function firebasePublicConfig(values:{FIREBASE_GOOGLE_ENABLED?:string;FIREBASE_API_KEY?:string;FIREBASE_AUTH_DOMAIN?:string;FIREBASE_PROJECT_ID?:string;FIREBASE_APP_ID?:string}):FirebasePublicConfig|null {
 const projectId=values.FIREBASE_PROJECT_ID?.trim()||'',apiKey=values.FIREBASE_API_KEY?.trim()||'',authDomain=values.FIREBASE_AUTH_DOMAIN?.trim()||'';
 if(values.FIREBASE_GOOGLE_ENABLED!=='true'||!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)||!/^AIza[A-Za-z0-9_-]{35}$/.test(apiKey))return null;
 // Use Firebase's own OAuth handler; a custom handler needs a separate verified setup.
 if(authDomain!==projectId+'.firebaseapp.com')return null;
 return {apiKey,projectId,authDomain,...(values.FIREBASE_APP_ID?.trim()?{appId:values.FIREBASE_APP_ID.trim()}:{})};
}

export function safeCustomerReturnPath(value:unknown):string {
 if(typeof value!=='string'||value.length>2000||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value))return '/minha-conta';
 try{
  const url=new URL(value,'https://return.invalid'),decoded=decodeURIComponent(url.pathname);
  if(url.origin!=='https://return.invalid'||/[\\\u0000-\u0020]/.test(decoded)||decoded.startsWith('//'))return '/minha-conta';
  if(decoded.startsWith('/api/')||['/entrar','/signin-with-chatgpt','/signout-with-chatgpt','/callback'].includes(decoded.replace(/\/$/,'')))return '/minha-conta';
  return url.pathname+url.search;
 }catch{return '/minha-conta';}
}
export function customerSignInPath(returnTo='/minha-conta'){return '/entrar?retorno='+encodeURIComponent(safeCustomerReturnPath(returnTo));}
export function cookieValue(header:string|null,name:string):string|null {
 const entries=(header||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'='));
 if(entries.length!==1)return null;
 const value=entries[0].slice(name.length+1);
 return /^[a-f0-9]{64}$/.test(value)?value:null;
}
export function secretCookie(name:string,value:string,maxAge:number){return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;}
export function randomAuthToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function authHash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
type CustomerSession={userId:string;projectId:string;email:string;fullName:string|null;expiresAt:number};
export async function resolveCustomerSession(requestHeaders:Pick<Headers,'get'>,projectId:string,lookup:(hash:string)=>Promise<CustomerSession|null|undefined>,now=Date.now()):Promise<Customer|null>{
 const token=cookieValue(requestHeaders.get('cookie'),CUSTOMER_COOKIE);if(!token)return null;
 const session=await lookup(await authHash(token));
 if(!session||session.projectId!==projectId||session.expiresAt<=now||!/^google:[a-f0-9]{64}$/.test(session.userId))return null;
 return {userId:session.userId,email:session.email,fullName:session.fullName,displayName:session.fullName||session.email};
}
export function matchingAuthCsrf(cookie:string|null,submitted:unknown){
 if(!cookie||!/^[a-f0-9]{64}$/.test(cookie)||typeof submitted!=='string'||!/^[a-f0-9]{64}$/.test(submitted))return false;
 let mismatch=0;for(let i=0;i<64;i++)mismatch|=cookie.charCodeAt(i)^submitted.charCodeAt(i);return mismatch===0;
}

let certificates:{expires:number;values:Record<string,string>}|undefined;
const firebaseSigningKey:JWTVerifyGetKey=async header=>{
 if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>200)throw Error('INVALID_GOOGLE_TOKEN');
 if(!certificates||Date.now()>=certificates.expires){
  const response=await fetch(FIREBASE_CERTIFICATES,{signal:AbortSignal.timeout(6000),redirect:'error'});
  if(!response.ok)throw Error('GOOGLE_KEYS_UNAVAILABLE');
  const text=await response.text();if(text.length>100000)throw Error('INVALID_GOOGLE_KEYS');
  const values=JSON.parse(text);if(!values||typeof values!=='object'||Array.isArray(values))throw Error('INVALID_GOOGLE_KEYS');
  const maxAge=Number(response.headers.get('Cache-Control')?.match(/max-age=(\d+)/)?.[1]||300);
  certificates={values,expires:Date.now()+Math.min(Math.max(maxAge,30),21600)*1000};
 }
 const certificate=certificates.values[header.kid];
 if(typeof certificate!=='string'||!certificate.startsWith('-----BEGIN CERTIFICATE-----'))throw Error('UNKNOWN_GOOGLE_KEY');
 return importX509(certificate,'RS256');
};

// The optional key resolver is for cryptographic regression tests, never supplied by a request.
export async function verifyFirebaseGoogleToken(idToken:unknown,projectId:string,options:{resolveKey?:JWTVerifyGetKey;now?:Date}={}):Promise<Customer> {
 if(typeof idToken!=='string'||idToken.length>12000)throw Error('INVALID_GOOGLE_TOKEN');
 const now=options.now||new Date(),seconds=Math.floor(now.getTime()/1000);
 const {payload}=await jwtVerify(idToken,options.resolveKey||firebaseSigningKey,{
  algorithms:['RS256'],audience:projectId,issuer:'https://securetoken.google.com/'+projectId,
  requiredClaims:['exp','iat','sub','auth_time'],currentDate:now,clockTolerance:0,
 });
 const firebase=payload.firebase as {sign_in_provider?:unknown;tenant?:unknown}|undefined;
 if(payload.aud!==projectId||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>128||/[\u0000-\u001f]/.test(payload.sub)||typeof payload.iat!=='number'||payload.iat>seconds||typeof payload.auth_time!=='number'||payload.auth_time>seconds||payload.auth_time<seconds-300||!firebase||!['google.com','password'].includes(String(firebase.sign_in_provider))||firebase.tenant!==undefined||payload.email_verified!==true||typeof payload.email!=='string'||payload.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))throw Error('INVALID_GOOGLE_IDENTITY');
 const fullName=typeof payload.name==='string'?payload.name.replace(/[\u0000-\u001f]/g,'').trim().slice(0,120)||null:null;
 return {userId:'google:'+await authHash(projectId+':'+payload.sub),email:payload.email,fullName,displayName:fullName||payload.email};
}
