'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {ANALYTICS_CONSENT_KEY,analyticsConsent,analyticsPath,validMeasurementId,flushCommerceEvents,setRuntimeAnalyticsConsent} from '@/lib/analytics';
import {SITE_URL} from '@/lib/seo';

export function Analytics({measurementId}:{measurementId:string|null}){
 const id=validMeasurementId(measurementId),pathname=usePathname(),params=useSearchParams();
 const path=analyticsPath(pathname,params.get('categoria'));
 const [consent,setConsent]=useState<boolean|null>(null),[preferences,setPreferences]=useState(false),[loaded,setLoaded]=useState(false);
 const lastPage=useRef('');
 useEffect(()=>{
  if(!id)return;
  try{const saved=analyticsConsent(localStorage.getItem(ANALYTICS_CONSENT_KEY));setRuntimeAnalyticsConsent(saved);setConsent(saved);setPreferences(saved===null);}catch{setPreferences(true);}
  const open=()=>setPreferences(true);window.addEventListener('tyrex:analytics-preferences',open);
  return()=>window.removeEventListener('tyrex:analytics-preferences',open);
 },[id]);
 useEffect(()=>{
  if(!id||consent===null)return;
  const disabledWindow=window as unknown as Record<string,unknown>;
  disabledWindow['ga-disable-'+id]=!consent;
  if(!consent){lastPage.current='';return;}
  if(pathname==='/gestao')return;
  if(document.getElementById('tyrex-ga4')){setLoaded(true);return;}
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer!.push(arguments);};
  window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  window.gtag('js',new Date());
  window.gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:SITE_URL+(path||'/'),page_referrer:SITE_URL+'/',ignore_referrer:true});
  const script=document.createElement('script');script.id='tyrex-ga4';script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);script.onload=()=>{setLoaded(true);flushCommerceEvents();};script.onerror=()=>{script.remove();setLoaded(false);};document.head.appendChild(script);
 },[id,consent,pathname,path]);
 useEffect(()=>{
  if(!id||consent!==true||!loaded||!path||lastPage.current===path)return;
  const previous=lastPage.current;lastPage.current=path;
  window.gtag?.('event','page_view',{send_to:id,page_location:SITE_URL+path,page_title:document.title,page_referrer:SITE_URL+(previous||'/')});
 },[id,consent,loaded,path]);
 function choose(accepted:boolean){
  setRuntimeAnalyticsConsent(accepted);
  try{localStorage.setItem(ANALYTICS_CONSENT_KEY,JSON.stringify({version:1,accepted,updatedAt:new Date().toISOString()}));}catch{}
  if(id){(window as unknown as Record<string,unknown>)['ga-disable-'+id]=!accepted;window.gtag?.('consent','update',{analytics_storage:accepted?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});}
  if(!accepted)flushCommerceEvents();setConsent(accepted);setPreferences(false);
 }
 if(!id||!preferences)return null;
 return <section className="analytics-consent" aria-label="Preferências de cookies de análise"><div><strong>Cookies de análise</strong><p>Com sua permissão, usamos o Google Analytics para entender o uso da loja. Você pode mudar essa escolha no rodapé.</p><Link href="/politicas/privacidade">Política de privacidade</Link></div><div className="analytics-consent-actions"><button className="btn secondary" onClick={()=>choose(false)}>Recusar</button><button className="btn secondary" onClick={()=>choose(true)}>Aceitar análise</button></div></section>;
}
