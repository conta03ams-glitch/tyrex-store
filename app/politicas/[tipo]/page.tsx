import {pageMetadata,pages} from '@/lib/seo';
import {PoliciesPage} from '@/components/info-pages';
import {notFound} from 'next/navigation';
export async function generateMetadata({params}:{params:Promise<{tipo:string}>}){const {tipo}=await params;return pageMetadata(tipo==='termos'?pages.terms:tipo==='privacidade'?pages.privacy:pages.missing);}
export default async function Page({params}:{params:Promise<{tipo:string}>}){const {tipo}=await params;if(!['termos','privacidade'].includes(tipo))notFound();return <PoliciesPage type={tipo}/>}
