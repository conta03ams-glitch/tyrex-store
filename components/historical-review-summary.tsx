import {Star} from 'lucide-react';
import {historicalMetrics,historicalRating,HISTORY_LABEL,HISTORY_NOTE} from '@/lib/historical-metrics';

export function HistoricalReviewSummary({productId,compact=false,onOpen}:{productId:string;compact?:boolean;onOpen?:()=>void}){
 const history=historicalMetrics(productId);
 if(!history)return null;
 return <section className={'historical-reviews'+(compact?' compact-history':'')} aria-label={HISTORY_LABEL}>
  <div className="historical-reviews-heading"><span className="eyebrow">HISTÓRICO TYREX</span><h3>Avaliações informadas pela loja</h3></div>
  <div className="historical-reviews-layout">
   <div className="historical-review-score"><strong>{historicalRating(history.average)}</strong><div className="review-stars" aria-label={historicalRating(history.average)+' de 5 estrelas no histórico informado pela loja'}>{[1,2,3,4,5].map(n=><Star key={n} size={18} fill={n<=Math.round(history.average)?'currentColor':'none'} aria-hidden="true"/>)}</div><span>{history.total} avaliações no histórico</span></div>
   <div className="review-distribution">{[5,4,3,2,1].map(n=><div className="rating-bar-row" key={n}><span>{n}</span><div role="meter" aria-label={n+' estrelas no histórico informado pela loja'} aria-valuemin={0} aria-valuemax={history.total} aria-valuenow={history.distribution[n]}><i style={{width:100*history.distribution[n]/history.total+'%'}}/></div><Star size={13} aria-hidden="true"/><small>{history.distribution[n]}</small></div>)}</div>
  </div>
  <p className="historical-source-note">{HISTORY_NOTE}</p>
  {compact&&<button type="button" className="text-link" onClick={onOpen}>Ver avaliações e avaliar</button>}
 </section>;
}
