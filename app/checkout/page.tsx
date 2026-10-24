import {pageMetadata,pages} from '@/lib/seo';
import {getCustomer} from '@/lib/customer-auth';
import {Checkout} from '@/components/checkout';
export const metadata=pageMetadata(pages.checkout);
export const dynamic='force-dynamic';
export default async function Page(){const user=await getCustomer();return <Checkout customer={user?{email:user.email,name:user.fullName||''}:null}/>;}
