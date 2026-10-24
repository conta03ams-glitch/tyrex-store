export function reviewInput(data:{rating:unknown;comment:unknown;name:unknown}){
 const rating=Number(data.rating),comment=String(data.comment??'').trim(),name=String(data.name??'').trim();
 if(!Number.isInteger(rating)||rating<1||rating>5)throw Error('Escolha de 1 a 5 estrelas.');
 if(comment.length<3||comment.length>2000)throw Error('Escreva um comentário entre 3 e 2.000 caracteres.');
 if(name.length<2||name.length>60||/[\r\n]/.test(name))throw Error('Informe um nome público entre 2 e 60 caracteres.');
 return {rating,comment,name};
}
export function validReviewPhoto(bytes:Uint8Array){return bytes.length>=12&&bytes.length<=2*1024*1024&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;}
export function purchasedProduct(items:string,productId:string){try{const rows=JSON.parse(items);return Array.isArray(rows)&&rows.some((p:any)=>p?.productId===productId);}catch{return false;}}
