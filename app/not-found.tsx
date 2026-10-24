import {pageMetadata,pages} from '@/lib/seo';
import Link from 'next/link';
import {ArrowUpRight,Gamepad2} from 'lucide-react';
export const metadata=pageMetadata(pages.missing);
export default function NotFound(){return <main className="container empty-state"><Gamepad2 size={48} strokeWidth={1}/><span className="eyebrow">ESSA FASE AINDA NÃO EXISTE</span><h1>Vamos voltar ao universo TYREX?</h1><p>Não encontramos essa página. Seu próximo produto pode estar no catálogo.</p><Link className="btn primary" href="/catalogo">Explorar produtos <ArrowUpRight size={17}/></Link></main>}
