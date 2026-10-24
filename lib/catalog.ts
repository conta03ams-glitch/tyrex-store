import referencePrices from './catalog-reference.json' with {type:'json'};
import productVideos from './product-videos.json' with {type:'json'};
import galleries from './product-galleries.json' with {type:'json'};
import coverOverrides from './product-art.json' with {type:'json'};
const coverFor=(slug:string)=>(coverOverrides as Record<string,string>)[slug]||'/assets/products/v4/'+slug+'.webp';
export type Variant = { id: string; name: string; price: number; stock: number | null; unlimited: boolean; index: number };
export type Product = { id: string; slug: string; name: string; category: string; platform: string; price: number; maxPrice?: number; variationCount: number; image: string; art: string; color: string; tag?: string; description: string; variants: Variant[]; live: boolean; blocked?: boolean; publicId?: string; imageFit?:'contain'|'cover'; gallery?:string[];videos?:{src:string;poster:string;title:string}[]; legacySlugs?:string[]; unavailableReason?:string; deliveryType?: string };
export const categories = [
 {id:'standoff-2',name:'Standoff 2',icon:'standoff',color:'#ebae55',emoji:'1559363805757186168'},
 {id:'roblox',name:'Roblox',icon:'roblox',color:'#64b9ff',emoji:'1559366702570020935'},
 {id:'free-fire',name:'Free Fire',icon:'freefire',color:'#ff9762',emoji:'1559356435475734618'},
 {id:'gift-card',name:'Gift cards',icon:'gift',color:'#c0a4ff',emoji:'1559362048524156948'},
 {id:'fivem',name:'FiveM',icon:'fivem',color:'#ff835e',emoji:'1559356463799865385'},
 {id:'cs-2',name:'Counter-Strike 2',icon:'cs2',color:'#dda567',emoji:'1559365449387479130'},
 {id:'assinaturas',name:'Assinaturas',icon:'subscriptions',color:'#60d5a9',emoji:'1559360084268552272'},
 {id:'valorant',name:'Valorant',icon:'valorant',color:'#ff6577',emoji:'1559356407176888381'},
 {id:'8-ball-pool',name:'8 Ball Pool',icon:'pool',color:'#69c7a5',emoji:'1559356500793884802'},
];
export const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v/100);
export const normalized=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function product(name:string,category:string,platform:string,price:number,maxPrice:number|undefined,count:number,art:string,color:string,description:string,tag?:string): Product {
 const slug=normalized(name),reference=(referencePrices as Record<string,{price:number;maxPrice:number;count:number}>)[slug];price=reference?.price??price;maxPrice=reference?.maxPrice??maxPrice;count=reference?.count??count;return {id:slug,slug,name,category,platform,price,maxPrice,variationCount:count,image:coverFor(slug),art:'catalog-image',imageFit:'contain',gallery:[coverFor(slug),...((galleries as Record<string,string[]>)[slug]||[])],videos:(productVideos as Record<string,{src:string;poster:string;title:string}[]>)[slug]||[],color,description,tag,live:false,variants:[{id:'preview',name:count>1?'Opção de entrada':'Opção padrão',price,stock:null,unlimited:true,index:0}]};
}
export const initialProducts:Product[]=[
 product('Executor Tyrex','roblox','Android',1000,undefined,1,'executor','#237cff','Explore scripts e organize sua experiência com o Executor Tyrex. Confira os requisitos e a finalidade da versão escolhida antes da instalação.','TYREX ORIGINAL'),
 product('SkinChanger CS2','cs-2','Windows',2636,4899,2,'skin-changer','#ad5aff','Conheça o SkinChanger CS2 e explore as opções disponíveis para sua experiência visual. Consulte a compatibilidade da versão antes de escolher.','EM DESTAQUE'),
 product('Zimo Rage Android','free-fire','Android',3520,6000,3,'zimo','#f14d9c','O Zimo Rage em sua versão para Android. Escolha a opção que combina com seu dispositivo e confira os detalhes de ativação.','SELEÇÃO TYREX'),
 product('GOLDS','standoff-2','Digital',2400,29999,6,'gold','#f3b95f','Escolha seu pacote de Golds e confira a quantidade e as condições da opção selecionada. Tudo organizado em um só pedido.','6 OPÇÕES'),
 product('Spotify Anual','assinaturas','Multiplataforma',2210,undefined,1,'spotify','#48db98','Uma opção de assinatura anual para quem quer levar a trilha sonora para o dia a dia. Verifique modalidade, elegibilidade e condições de ativação.'),
 product('Gift Card PlayStation','gift-card','PlayStation',7900,26000,4,'playstation','#668bff','Mais possibilidades para sua biblioteca. Selecione o cartão PlayStation e confira valor de resgate, região e condições de uso.'),
 product('Gift Card Apple Store','gift-card','Apple',3000,13500,3,'apple','#bca1f7','Escolha seu cartão Apple para usar nos serviços compatíveis. Confira a região, o saldo de resgate e as condições da opção selecionada.'),
 product('Gift Card Free Fire','gift-card','Free Fire',3000,12500,3,'freefire-card','#ff9959','Escolha o Gift Card Free Fire e confira os detalhes de resgate. A opção selecionada define o conteúdo e as condições de utilização.'),
 product('Gift Card Google Play','gift-card','Android',3000,20000,4,'googleplay','#72d9c0','Seu próximo conteúdo está a uma escolha de distância. Confira a região e o valor de resgate do cartão Google Play antes de comprar.'),
 product('Gift Card Steam','gift-card','Steam',3000,17500,3,'steam','#5cb3df','Encontre uma nova possibilidade para sua biblioteca Steam. Selecione o cartão e confirme sua região e o saldo de resgate.'),
 product('Conta C/ Premier','cs-2','Windows',4500,undefined,1,'cs-account','#e5b164','Conta com Premier conforme a oferta da loja. Consulte conteúdo, condições de acesso e procedimentos de entrega antes da compra.'),
 product('Radar WEB','cs-2','Web',3900,6810,2,'radar','#7b91f9','Radar WEB disponível nas opções da TYREX. Confira a documentação, os requisitos e as condições da versão escolhida.'),
 product('Raio XXXX','cs-2','Windows',3512,9999,3,'skin-changer','#b582fb','Conheça as opções do Raio XXXX. Verifique a compatibilidade e os detalhes da licença selecionada antes da instalação.'),
 ...['Emulador','Android','iOS'].map(p=>product('Tyrex Rage AP '+p,'free-fire',p,4215,13985,3,'zimo','#cf62fb','A linha Tyrex Rage AP na versão '+p+'. Consulte as opções de licença e os requisitos da versão antes de selecionar.')),
 product('Zimo Emulador','free-fire','Emulador',3520,6000,3,'zimo','#f14d9c','A linha Zimo para emulador. Confira a compatibilidade do seu ambiente e os detalhes da opção escolhida.'),
 product('Zimo Rage iOS','free-fire','iOS',3520,6000,3,'zimo','#f14d9c','Conheça o Zimo Rage na versão iOS. Confira os requisitos e as opções disponíveis para seu dispositivo.'),
 product('Astral','free-fire','Emulador',6000,60000,2,'astral','#8c89ff','Explore as opções do Astral para emulador e confira os detalhes de cada modalidade antes de escolher.'),
 ...['Android','Emulador','iOS'].map(p=>product('Bypass '+p,'free-fire',p,1510,2979,2,'bypass','#4d9bff','Bypass na versão '+p+'. Confira os requisitos e as condições de ativação; a compatibilidade depende da versão escolhida.')),
 ...['Android','Emulador','iOS'].map(p=>product('DLL '+p,'standoff-2',p,3989,undefined,1,'dll','#69b4f9','DLL na versão '+p+'. Verifique os requisitos e a documentação da licença antes da instalação.')),
 ...['Android','Emulador','iOS'].map(p=>product('XSkinChanger '+p,'standoff-2',p,3989,undefined,1,'skin-changer','#ad5aff','A linha XSkinChanger para '+p+'. Conheça a opção disponível e consulte os requisitos da versão.')),
 ...['Android','Emulador','iOS'].map(p=>product('XCheat '+p,'standoff-2',p,3989,5000,2,'xcheat','#6f9bff','Conheça as opções de licença do XCheat para '+p+'. Confira a documentação e a compatibilidade antes de escolher.')),
 product('Plutonium','standoff-2','Android',4990,24990,3,'plutonium','#ef954e','Plutonium em três opções de catálogo. Consulte os requisitos e os detalhes da licença selecionada.'),
 {...product("Shark Menu","fivem","Windows",2921,9999,3,"catalog-image","#18a9df","Shark Menu para FiveM. Confira as opções de licença, a compatibilidade e as instruções da versão escolhida antes de comprar.","NOVO"),imageFit:"contain",gallery:[coverFor("shark-menu"), "/assets/products/v3/shark-menu-logo.webp"],legacySlugs:["shark-menu-6adabcc95a7aae21dd5e5744"]},
 {...product("Spoofer Tyrex","fivem","Windows",799,8910,4,"catalog-image","#267cff","Spoofer Tyrex para FiveM. Compare os períodos disponíveis e consulte os requisitos, as condições de uso e as instruções da licença selecionada.","NOVO"),imageFit:"contain",gallery:[coverFor("spoofer-tyrex")],legacySlugs:["spoofer-tyrex-6adb67365ca4d8b7e13cfc1d"]},
 {...product("Felipe Menu","fivem","Windows",2999,15000,3,"catalog-image","#ef3648","Felipe Menu para FiveM. Escolha o período da licença e confirme os requisitos de instalação e a compatibilidade da opção antes da compra.","NOVO"),imageFit:"contain",gallery:[coverFor("felipe-menu")],legacySlugs:["felipe-menu-6adb72d15ca4d8b7e144f278"]},
 {...product("EZ 8 Ball Pool","8-ball-pool","Android / iOS",3741,5000,4,"catalog-image","#39a9ff","EZ 8 Ball Pool com opções para Android e iOS. Selecione a plataforma e o período da licença e confira as condições de instalação e ativação.","NOVO"),imageFit:"contain",gallery:[coverFor("ez-8-ball-pool"),...galleries["ez-8-ball-pool"]],legacySlugs:["ez-8-ball-pool-6adb6b7e5ca4d8b7e13fdfc4"]},
 {...product('Script Robux','roblox','Android',4000,undefined,1,'executor','#3c9bff','Produto indisponível enquanto sua finalidade e documentação são verificadas. Não há oferta de geração ou transferência de Robux.'),blocked:true},
];
export function categoryName(id:string){return categories.find(c=>c.id===id)?.name||(id==='outros'?'Outros produtos':id);}
export function technicalSpecs(p:Product){return [['Plataforma',p.platform],['Categoria',categoryName(p.category)],['Formato','Produto digital'],['Opções',`${p.variationCount} ${p.variationCount===1?'opção':'opções'}`],['Compatibilidade','Consultar requisitos da versão'],['Entrega',p.deliveryType==='automatica'?'Conforme instruções da opção':'Digital • confira as instruções do pedido']];}
