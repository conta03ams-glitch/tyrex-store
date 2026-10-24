import {catalog} from '@/lib/server';
import {categories} from '@/lib/catalog';
import {sitemapXml} from '@/lib/seo';
export async function GET(){const {products}=await catalog();return new Response(sitemapXml(products,categories),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});}
