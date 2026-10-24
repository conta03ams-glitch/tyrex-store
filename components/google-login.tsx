'use client';
import {useEffect,useRef,useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import type {FirebasePublicConfig} from '@/lib/customer-auth-core';
import {safeCustomerReturnPath} from '@/lib/customer-auth-core';
import type {prepareGoogleLogin} from '@/lib/firebase-browser';

type Runtime=Awaited<ReturnType<typeof prepareGoogleLogin>>;
function loginError(error:unknown){
 const code=(error as {code?:string})?.code;
 if(['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/user-disabled'].includes(code||''))return 'Não foi possível entrar. Confira seu e-mail e senha.';
 if(code==='auth/email-already-in-use')return 'Não foi possível criar a conta. Tente entrar ou recuperar sua senha.';
 if(code==='auth/weak-password')return 'Escolha uma senha mais forte, com pelo menos 8 caracteres.';
 if(code==='auth/too-many-requests')return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
 if(code==='auth/popup-closed-by-user'||code==='auth/cancelled-popup-request')return 'Login cancelado. Você pode tentar novamente quando quiser.';
 if(code==='auth/popup-blocked')return 'Seu navegador bloqueou a janela do Google. Permita a abertura e tente novamente.';
 if(code==='auth/unauthorized-domain'||code==='auth/operation-not-allowed'||code==='auth/invalid-api-key')return 'O acesso com Google está temporariamente indisponível. Você pode comprar como visitante.';
 if(code==='auth/operation-not-supported-in-this-environment'||code==='auth/web-storage-unsupported')return 'Abra a loja no Chrome ou Safari para entrar com Google.';
 if(code==='auth/network-request-failed')return 'Não foi possível conectar ao Google. Confira sua conexão e tente novamente.';
 return error instanceof Error&&!code?error.message:'Não foi possível entrar. Tente novamente em instantes.';
}
export function GoogleLogin({config,returnTo}:{config:FirebasePublicConfig|null;returnTo:string}){
 const runtime=useRef<Runtime|null>(null),csrf=useRef('');
 const [mode,setMode]=useState<'login'|'register'|'reset'>('login'),[notice,setNotice]=useState('');
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!config)return;let cancelled=false;setReady(false);setError('');
  Promise.all([import('@/lib/firebase-browser').then(sdk=>sdk.prepareGoogleLogin(config)),fetch('/api/auth/csrf',{credentials:'same-origin',cache:'no-store'}).then(async response=>{const data=await response.json() as {error?:string;csrf?:string};if(!response.ok||!data.csrf)throw Error(data.error||'Não foi possível iniciar o acesso.');return data.csrf;})])
   .then(([sdk,token])=>{if(!cancelled){runtime.current=sdk;csrf.current=token;setReady(true)}})
   .catch(error=>{if(!cancelled)setError(loginError(error))});
  return()=>{cancelled=true;};
 },[config,attempt]);
 async function finish(credential:{user:import('firebase/auth').User}){
  const sdk=runtime.current!;
  if(!credential.user.emailVerified){await sdk.sendEmailVerification(credential.user);setNotice('Confirme seu e-mail pelo link enviado. Depois volte e entre com sua senha.');return;}
  const idToken=await credential.user.getIdToken(true);
  const response=await fetch('/api/auth/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken,csrf:csrf.current})});
  const data=await response.json() as {error?:string;ok?:boolean};if(!response.ok||!data.ok){if(response.status===403)setReady(false);throw Error(data.error||'Não foi possível entrar.');}
  window.location.assign(safeCustomerReturnPath(returnTo));
 }
 async function login(){
  const sdk=runtime.current;if(!sdk||!ready||busy)return;
  const popup=sdk.signInWithPopup(sdk.auth,sdk.provider);setBusy(true);setError('');setNotice('');
  try{await finish(await popup)}catch(error){setError(loginError(error))}finally{await sdk.signOut(sdk.auth).catch(()=>{});setBusy(false)}
 }
 async function emailLogin(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();const sdk=runtime.current;if(!sdk||!ready||busy)return;
  const form=event.currentTarget,fields=new FormData(form),email=String(fields.get('email')||'').trim(),password=String(fields.get('password')||'');
  setBusy(true);setError('');setNotice('');
  try{
   if(mode==='reset'){try{await sdk.sendPasswordResetEmail(sdk.auth,email)}catch(error){if((error as {code?:string}).code!=='auth/user-not-found')throw error}setNotice('Se houver uma conta com esse e-mail, você receberá as instruções para redefinir a senha.');}
   else {const credential=mode==='register'?await sdk.createUserWithEmailAndPassword(sdk.auth,email,password):await sdk.signInWithEmailAndPassword(sdk.auth,email,password);await finish(credential);}
   form.reset();
  }catch(error){setError(loginError(error))}finally{await sdk.signOut(sdk.auth).catch(()=>{});setBusy(false)}
 }
 return <div className="google-login"><button type="button" className="google-login-button" onClick={login} disabled={!config||!ready||busy}>{busy||config&&!ready&&!error?<LoaderCircle size={20} className="spin"/>:<img src="/assets/google-signin-g.webp" width="20" height="20" alt=""/>}<span>{busy?'Conectando…':'Entrar com Google'}</span></button>{!config?<p className="login-method-note" role="status">O acesso com Google está em configuração. Você pode continuar comprando como visitante.</p>:<p className="login-method-note">Escolha sua conta Google. A TYREX não recebe sua senha.</p>}{config&&<section className="email-access"><div className="login-divider"><span>ou use seu e-mail</span></div><h3>{mode==='register'?'Criar minha conta':mode==='reset'?'Recuperar senha':'Entrar com e-mail'}</h3><form onSubmit={emailLogin}><label>E-mail<input className="field" name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy}/></label>{mode!=='reset'&&<label>Senha<input className="field" name="password" type="password" autoComplete={mode==='register'?'new-password':'current-password'} minLength={mode==='register'?8:1} maxLength={128} required disabled={busy}/></label>}<button className="btn primary full" disabled={!ready||busy}>{busy?'Aguarde…':mode==='register'?'Criar conta':mode==='reset'?'Enviar instruções':'Entrar'}</button></form><div className="email-access-links"><button type="button" disabled={busy} onClick={()=>{setMode(mode==='register'?'login':'register');setError('');setNotice('')}}>{mode==='register'?'Já tenho conta':'Criar conta'}</button><button type="button" disabled={busy} onClick={()=>{setMode(mode==='reset'?'login':'reset');setError('');setNotice('')}}>{mode==='reset'?'Voltar para entrar':'Esqueci minha senha'}</button></div>{mode==='register'&&<p className="login-method-note">Crie uma senha para sua conta TYREX. Enviaremos um link para confirmar seu e-mail.</p>}</section>}{notice&&<p className="google-login-feedback" role="status">{notice}</p>}{error&&<div className="google-login-feedback" role="alert"><p>{error}</p>{!ready&&<button className="text-button" type="button" onClick={()=>setAttempt(a=>a+1)}>Tentar novamente</button>}</div>}<noscript>Ative o JavaScript para entrar com Google. A navegação da loja continua disponível.</noscript></div>;
}
