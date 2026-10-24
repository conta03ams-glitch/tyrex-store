import {pageMetadata,pages} from '@/lib/seo';
import {CartPage} from '@/components/cart-page';
export const metadata=pageMetadata(pages.cart);
export default function Page(){return <CartPage/>;}
