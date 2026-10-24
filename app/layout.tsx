import {getCustomer} from '@/lib/customer-auth';
import type { Metadata,Viewport } from 'next';
import {Shell} from '@/components/store';
import {Suspense} from 'react';
import {Analytics} from '@/components/analytics';
import {config} from '@/lib/server';
import {validMeasurementId} from '@/lib/analytics';
import {SITE_URL,SITE_NAME,pageMetadata,pages} from '@/lib/seo';
import './globals.css';
export const metadata:Metadata={...pageMetadata(pages.home),metadataBase:new URL(SITE_URL),applicationName:SITE_NAME,icons:{icon:'/favicon.svg'},formatDetection:{telephone:false}};
export const viewport:Viewport={colorScheme:'dark',themeColor:'#080b11'};
export const dynamic='force-dynamic';
export default async function RootLayout({children}:{children:React.ReactNode}){const user=await getCustomer();const c=config();const measurementId=c.GA4_ENABLED==='true'?validMeasurementId(c.GA4_MEASUREMENT_ID):null;return <html lang="pt-BR" style={{colorScheme:'only dark'}}><body><a className="skip-link" href="#main-content">Pular para o conteúdo</a><Shell signedIn={!!user}><div id="main-content">{children}</div></Shell><Suspense fallback={null}><Analytics measurementId={measurementId}/></Suspense></body></html>;}
