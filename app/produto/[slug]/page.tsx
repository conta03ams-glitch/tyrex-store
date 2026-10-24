import {pageMetadata,productPageInfo,pages} from '@/lib/seo';
import {ProductPage} from '@/components/product-page';
import {catalog} from '@/lib/server';
import {notFound,redirect} from 'next/navigation';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {products}=await catalog();const p=products.find(p=>p.slug===slug||p.legacySlugs?.includes(slug));return pageMetadata(p?productPageInfo(p):pages.missing);}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {products}=await catalog();const product=products.find(p=>p.slug===slug||p.legacySlugs?.includes(slug));if(!product)notFound();if(product.slug!==slug)redirect('/produto/'+product.slug);return <ProductPage key={product.id} slug={slug} initialProduct={product}/>;}
