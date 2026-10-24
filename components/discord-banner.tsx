import {responsiveImage} from '@/lib/responsive-images';
import {DISCORD_URL} from '@/lib/community';

export function DiscordMark({className=''}:{className?:string}){
 return <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.042-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.095.252-.194.372-.294a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.1.246.2.373.295a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.89.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .031-.057c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.946 2.418-2.157 2.418Z"/></svg>;
}
export function DiscordBanner(){
 return <section id="comunidade" className="container discord-banner" aria-labelledby="discord-title" data-reveal>
  <div className="discord-banner-grid" aria-hidden="true"/>
  <div className="discord-banner-copy">
   <span className="discord-badge"><DiscordMark/> COMUNIDADE OFICIAL</span>
   <h2 id="discord-title">Entre no Discord<br/>da <span className="magic-word">TYREX.</span></h2>
   <p>Fale com nossa equipe, tire dúvidas sobre os produtos e receba suporte para o seu pedido.</p>
   <a className="btn discord-join" href={DISCORD_URL} target="_blank" rel="noreferrer"><DiscordMark/>Entrar no servidor </a>
   <span className="discord-address">discord.gg/cNgnAXhWjw</span>
  </div>
  <div className="discord-banner-art"><img {...responsiveImage('/assets/brand/discord-palace.webp','(max-width: 760px) 100vw, 800px')} src="/assets/brand/discord-palace.webp" alt="Gênio azul da TYREX em um palácio com lâmpada mágica e símbolo do Discord" loading="lazy" width={1536} height={1024}/></div>
 </section>;
}
