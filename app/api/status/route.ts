import { readiness, reply } from '@/lib/server';
export async function GET(){return reply(readiness());}
