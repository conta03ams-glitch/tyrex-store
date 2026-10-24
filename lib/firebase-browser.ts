import type {FirebasePublicConfig} from './customer-auth-core';

let prepared:ReturnType<typeof createRuntime>|undefined;
async function createRuntime(config:FirebasePublicConfig){
 const [appSdk,authSdk]=await Promise.all([import('firebase/app'),import('firebase/auth')]);
 const name='tyrex-google-'+config.projectId;
 const app=appSdk.getApps().find(app=>app.name===name)||appSdk.initializeApp(config,name);
 const auth=authSdk.initializeAuth(app,{persistence:authSdk.inMemoryPersistence,popupRedirectResolver:authSdk.browserPopupRedirectResolver});
 const provider=new authSdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 return {auth,provider,signInWithPopup:authSdk.signInWithPopup,signOut:authSdk.signOut,signInWithEmailAndPassword:authSdk.signInWithEmailAndPassword,createUserWithEmailAndPassword:authSdk.createUserWithEmailAndPassword,sendEmailVerification:authSdk.sendEmailVerification,sendPasswordResetEmail:authSdk.sendPasswordResetEmail};
}
// Only imported on the login screen. Firebase credentials never persist in localStorage.
export function prepareGoogleLogin(config:FirebasePublicConfig){
 if(!prepared)prepared=createRuntime(config).catch(error=>{prepared=undefined;throw error});
 return prepared;
}
