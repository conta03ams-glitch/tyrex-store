import {pageMetadata,pages} from '@/lib/seo';
import {Admin} from '@/components/admin';
import {getCustomer} from '@/lib/customer-auth';
export const dynamic='force-dynamic';
export const metadata=pageMetadata(pages.admin);
export default async function Page(){const user=await getCustomer();return <Admin userId={user?.userId||null}/>}
