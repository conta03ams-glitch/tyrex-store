import {pageMetadata,pages} from '@/lib/seo';
import {Home} from '@/components/home';
export const metadata=pageMetadata(pages.home);
export default function Page(){return <Home/>;}
