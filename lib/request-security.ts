export class RequestBodyError extends Error{
 status:number;
 constructor(message:string,status:number){super(message);this.name='RequestBodyError';this.status=status;}
}

export function requestIsSameOrigin(request:Request){
 if(request.headers.get('sec-fetch-site')==='cross-site')return false;
 const origin=request.headers.get('origin');
 return !origin||origin===new URL(request.url).origin;
}

export async function readLimitedBytes(request:Request,maximum:number){
 const declared=request.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>maximum)){
  await request.body?.cancel().catch(()=>{});
  throw new RequestBodyError('O envio ultrapassou o tamanho permitido.',413);
 }
 if(!request.body)return new Uint8Array(0);
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let total=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   total+=value.byteLength;
   if(total>maximum){await reader.cancel().catch(()=>{});throw new RequestBodyError('O envio ultrapassou o tamanho permitido.',413);}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const result=new Uint8Array(total);let offset=0;
 for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}
 return result;
}

export async function readTextLimited(request:Request,maximum:number){
 const bytes=await readLimitedBytes(request,maximum);
 try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new RequestBodyError('Conteúdo inválido.',400);}
}

export async function readJsonLimited(request:Request,maximum=16384){
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new RequestBodyError('Envie os dados no formato JSON.',415);
 const text=await readTextLimited(request,maximum);
 try{return JSON.parse(text);}catch{throw new RequestBodyError('Dados JSON inválidos.',400);}
}

export async function readFormLimited(request:Request,maximum:number){
 const contentType=request.headers.get('content-type')||'';
 if(!/^multipart\/form-data\s*;/i.test(contentType))throw new RequestBodyError('Formato de envio inválido.',415);
 const bytes=await readLimitedBytes(request,maximum);
 try{return await new Response(bytes,{headers:{'Content-Type':contentType}}).formData();}catch{throw new RequestBodyError('Formulário inválido.',400);}
}
