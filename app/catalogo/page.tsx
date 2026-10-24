import {pageMetadata,catalogPageInfo} from '@/lib/seo';
import {catalog} from '@/lib/server';
import {categories} from '@/lib/catalog';
import {Suspense} from 'react';
import {CatalogPage} from '@/components/catalog-page';
export async function generateMetadata({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const {products}=await catalog();return pageMetadata(catalogPageInfo(await searchParams,categories,products));}
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;return <Suspense fallback={<div className="container loading-page">Carregando catálogo...</div>}><CatalogPage initialCategory={typeof params.categoria==='string'?params.categoria:'todos'}/></Suspense>;}
