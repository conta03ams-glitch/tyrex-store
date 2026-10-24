// Called only with verified Google customer identity or a SHA-256 hash of a validated consultation token.
export function orderAccessAllowed(order:{userId:string|null;tokenHash:string},userId:string|null,consultationHash:string|null){
 return !!(userId&&order.userId===userId)||!!(consultationHash&&/^[a-f0-9]{64}$/.test(consultationHash)&&order.tokenHash===consultationHash);
}
