import {requireCustomer} from '@/lib/customer-auth';
import {Account} from '@/components/account';
import {pageMetadata,pages} from '@/lib/seo';
export const dynamic='force-dynamic';
export const metadata=pageMetadata(pages.account);
export default async function Page(){const user=await requireCustomer('/minha-conta');return <Account customer={{email:user.email,name:user.fullName||'',userId:user.userId}}/>;}
