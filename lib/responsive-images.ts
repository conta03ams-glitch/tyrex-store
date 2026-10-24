import manifest from './responsive-images.json' with {type:'json'};
export function responsiveImage(src:string,sizes:string){const entries=(manifest as Record<string,{src:string;width:number}[]>)[src];return entries?{srcSet:entries.map(e=>e.src+' '+e.width+'w').join(', '),sizes}:{};}
