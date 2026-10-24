import history from './historical-metrics.json' with {type:'json'};

type HistoricalRow={sold:number;reviews:number;stars:number[]};
const rows:Record<string,HistoricalRow>=history.products;
export const HISTORY_LABEL='Histórico estimado informado pela loja';
export const HISTORY_NOTE='Estimativa histórica de um período de vendas informada pela TYREX. Resumo agregado, separado das avaliações publicadas neste site.';

export function historicalMetrics(productId:string){
 if(!Object.hasOwn(rows,productId))return null;
 const row=rows[productId],total=row.stars.reduce((sum,count)=>sum+count,0);
 if(!Number.isInteger(row.sold)||row.sold<0||row.stars.length!==5||row.stars.some(n=>!Number.isInteger(n)||n<0)||total!==row.reviews||total===0)return null;
 return {sold:row.sold,total,average:row.stars.reduce((sum,count,index)=>sum+count*(index+1),0)/total,distribution:Object.fromEntries(row.stars.map((count,index)=>[index+1,count])) as Record<number,number>};
}

export function historicalRating(value:number){return value.toFixed(2).replace('.',',');}
