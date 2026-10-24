import {robotsText} from '@/lib/seo';
export function GET(){return new Response(robotsText(),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});}
