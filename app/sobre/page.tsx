import {pageMetadata,pages} from '@/lib/seo';
import {AboutPage} from '@/components/info-pages';
export const metadata=pageMetadata(pages.about);
export default function Page(){return <AboutPage/>}
