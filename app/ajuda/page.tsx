import {pageMetadata,pages} from '@/lib/seo';
import {redirect} from 'next/navigation';
import {DISCORD_URL} from '@/lib/community';
export const metadata=pageMetadata(pages.help);
export default function Page(){redirect(DISCORD_URL);}
