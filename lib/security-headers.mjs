export const securityHeaders=[
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=()'},
 {key:'Strict-Transport-Security',value:'max-age=31536000'},
 {key:'Content-Security-Policy',value:"object-src 'none'; base-uri 'self'; form-action 'self'"},
];
export const reviewPhotoCSP="default-src 'none'; sandbox";

export function secureResponse(response){
 if(response.status===101)return response;
 const headers=new Headers(response.headers);
 for(const {key,value} of securityHeaders){
  if(key==='Content-Security-Policy'&&headers.has(key))continue;
  headers.set(key,value);
 }
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
