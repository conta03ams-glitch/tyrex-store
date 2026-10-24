import {descriptionSummary} from './description-format.mjs';
import type {Metadata} from 'next';
import type {Product} from './catalog';

export const SITE_URL='https://tyrex-store.fuzzygnat18.chatgpt.site';
export const SITE_NAME='TYREX STORE';
export const SOCIAL_IMAGE='/assets/tyrex-opengraph.png';
export const SOCIAL_IMAGE_WIDTH=1734;
export const SOCIAL_IMAGE_HEIGHT=907;
export const pages={
 home:{path:'/',title:'TYREX STORE | Produtos digitais, gift cards e assinaturas',description:'Produtos digitais para seus games, gift cards e assinaturas na TYREX STORE. Confira as opções, monte seu carrinho e receba suporte pelo Discord.'},
 catalog:{path:'/catalogo',title:'Catálogo de produtos digitais',description:'Explore os produtos da TYREX STORE por jogo e plataforma. Encontre opções para Standoff 2, Roblox, Free Fire, CS2, gift cards e assinaturas.'},
 about:{path:'/sobre',title:'Sobre a TYREX',description:'Conheça a TYREX STORE, sua loja de produtos digitais, gift cards e assinaturas. Explore o catálogo e encontre nossa comunidade e equipe no Discord.'},
 terms:{path:'/politicas/termos',title:'Termos e condições de compra',description:'Consulte as condições de compra da TYREX STORE: opções de pagamento, entrega digital, disponibilidade dos produtos e atendimento pelo Discord.'},
 privacy:{path:'/politicas/privacidade',title:'Política de privacidade',description:'Saiba como a TYREX STORE utiliza dados de pedidos, preferências do navegador e análise de acessos, e como entrar em contato para solicitações de privacidade.'},
 cart:{path:'/carrinho',title:'Meu carrinho',description:'Confira os produtos e quantidades selecionados na TYREX STORE, ajuste suas opções e siga para o pagamento com a PurinCash.',index:false},
 checkout:{path:'/checkout',title:'Finalizar compra',description:'Finalize sua compra na TYREX STORE com ou sem login. Confira seu carrinho, informe seus dados e escolha um meio de pagamento disponível.',index:false},
 orders:{path:'/pedidos',title:'Meus pedidos',description:'Consulte o status de pagamento e os detalhes dos seus pedidos na TYREX STORE usando o código do pedido e sua chave de consulta.',index:false},
 account:{path:'/minha-conta',title:'Minha conta e produtos',description:'Consulte suas compras, keys, instruções de acesso e prazos dos produtos na sua área pessoal da TYREX STORE.',index:false},
 login:{path:'/entrar',title:'Entrar com Google ou e-mail',description:'Entre com Google ou e-mail e senha na TYREX STORE para consultar compras, produtos e keys. Você também pode comprar como visitante.',index:false},
 admin:{path:'/gestao',title:'Gestão da loja',description:'Área restrita do responsável pela TYREX STORE para acompanhar pedidos, pagamentos e o andamento das entregas digitais.',index:false},
 help:{path:'/ajuda',title:'Suporte no Discord',description:'O suporte oficial da TYREX STORE está no Discord. Fale com a equipe sobre produtos, pedidos, pagamentos e entrega digital.',index:false},
 missing:{path:'/404',title:'Página não encontrada',description:'Não encontramos esta página na TYREX STORE. Volte ao catálogo para explorar os produtos digitais, gift cards e assinaturas disponíveis.',index:false},
} as const;
export type PageInfo={path:string;title:string;description:string;index?:boolean};
export function absoluteUrl(path:string){return new URL(path,SITE_URL).href;}
export function conciseDescription(value:string){const clean=descriptionSummary(value);return clean.length<=160?clean:clean.slice(0,157).replace(/\s+\S*$/,'')+'…';}
export function pageMetadata(info:PageInfo):Metadata{
 const title=info.title.includes(SITE_NAME)?info.title:info.title+' | '+SITE_NAME;
 const description=conciseDescription(info.description),url=absoluteUrl(info.path),image={url:absoluteUrl(SOCIAL_IMAGE),width:SOCIAL_IMAGE_WIDTH,height:SOCIAL_IMAGE_HEIGHT,type:'image/png',alt:'TYREX STORE · produtos digitais, gift cards e assinaturas, com o mascote azul da loja'};
 return {title:{absolute:title},description,alternates:{canonical:url},robots:info.index===false?{index:false,follow:false,googleBot:{index:false,follow:false}}:{index:true,follow:true,googleBot:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1}},openGraph:{type:'website',locale:'pt_BR',siteName:SITE_NAME,title,description,url,images:[image]},twitter:{card:'summary_large_image',title,description,images:[image.url]}};
}
export function productPageInfo(product:Product):PageInfo{
 return {path:'/produto/'+product.slug,title:product.name.length>48?product.name.slice(0,45)+'…':product.name,description:product.description||`${product.name} para ${product.platform}: confira opções, preços e informações antes de comprar na TYREX STORE.`,index:!product.blocked};
}
export function categoryPageInfo(category:{id:string;name:string},count:number):PageInfo{
 return {path:'/catalogo?categoria='+encodeURIComponent(category.id),title:category.name+' · Produtos e opções',description:`Encontre produtos de ${category.name} na TYREX STORE. Confira plataformas, opções, preços e detalhes de cada produto e tire dúvidas com a equipe no Discord.`,index:count>0};
}
export function catalogPageInfo(params:Record<string,string|string[]|undefined>,categories:readonly {id:string;name:string}[],products:Product[]):PageInfo{
 const id=typeof params.categoria==='string'?params.categoria:'',category=categories.find(c=>c.id===id);
 const info=category?categoryPageInfo(category,products.filter(p=>p.category===id&&!p.blocked).length):{...pages.catalog};
 if(params.q||params.favoritos||Object.keys(params).some(k=>k!=='categoria')||(id&&!category))return {...info,index:false};
 return info;
}
const escapeXml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
export function sitemapXml(products:Product[],categories:readonly {id:string;name:string}[]){
 const paths=[pages.home.path,pages.catalog.path,pages.about.path,pages.terms.path,pages.privacy.path,...categories.filter(c=>products.some(p=>p.category===c.id&&!p.blocked)).map(c=>categoryPageInfo(c,1).path),...products.filter(p=>!p.blocked).map(p=>productPageInfo(p).path)];
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+Array.from(new Set(paths)).map(path=>'  <url><loc>'+escapeXml(absoluteUrl(path))+'</loc></url>').join('\n')+'\n</urlset>\n';
}
export function robotsText(){return [
 '# TYREX STORE · regras de rastreamento',
 '# Páginas públicas, imagens, CSS e JavaScript podem ser rastreados.',
 '# Compra, pedidos, gestão e buscas possuem noindex em suas próprias páginas.',
 '# Mantemos essas páginas HTML rastreáveis para que o noindex seja lido.',
 '# O controle de acesso é feito pela aplicação e pela hospedagem.',
 'User-agent: *','Allow: /','Disallow: /api/','Disallow: /.well-known/','Disallow: /cdn-cgi/','',
 'Sitemap: '+absoluteUrl('/sitemap.xml'),''
 ].join('\n');}
