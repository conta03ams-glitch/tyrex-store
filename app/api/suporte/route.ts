import {reply} from '@/lib/server';
import {DISCORD_URL} from '@/lib/community';
export async function POST(){return reply({error:'O atendimento da TYREX é realizado no Discord.',discordUrl:DISCORD_URL},410);}
