import {pageMetadata,pages} from '@/lib/seo';
import {OrdersPage} from '@/components/checkout';
export const metadata=pageMetadata(pages.orders);
export default function Page(){return <OrdersPage/>;}
