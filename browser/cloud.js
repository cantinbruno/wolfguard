// Public API location, never a credential. Reload tickets are scoped to one tab.
export const API_ORIGIN = 'https://wolfguard-web-cantin.cantin-bruno.chatgpt.site';
const local = ['127.0.0.1','localhost'].includes(location.hostname);
export const enabled = location.hostname==='wolfguard.wavetools.fr' || (local && new URLSearchParams(location.search).has('sync-test'));
let token='',version=0,initialized=null,activation='',user=null,usersEnabled=false,accountTicket='';
function captureActivation(){
  const match=/^#activate=([a-f0-9]{64})$/.exec(location.hash);
  if(match){activation=match[1];history.replaceState(null,'',location.pathname+location.search);}
}
if(enabled){const match=/^#account=([a-f0-9]{64})$/.exec(location.hash);if(match){accountTicket=match[1];history.replaceState(null,'',location.pathname+location.search);}captureActivation();window.addEventListener('hashchange',captureActivation);}
export const isInitialized = () => initialized;
export const canActivate = () => !!activation;
export const hasSession = () => !!token;
export const currentVersion = () => version;
export const currentUser=()=>user;
export const hasUsers=()=>usersEnabled;
export const isAdmin=()=>!enabled||user?.role==='admin';
export function sessionState() { return token ? {token, version,user,usersEnabled} : null; }
export function restoreSession(value) {
  if (!enabled || !/^[a-f0-9]{64}$/.test(value?.token || '') || !Number.isSafeInteger(value.version) || value.version < 1) throw new Error('Session de reprise invalide.');
  token = value.token; version = value.version; initialized = true;
  user=value.user||null;usersEnabled=!!value.usersEnabled;
}
export function detach() { token = ''; version = 0;user=null;usersEnabled=false; }
async function request(path,{method='GET',body,headers={},anonymous=false,signal,skipVersion}={}) {
  const credential=token,controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
  const cancel=()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});
  if(signal?.aborted)cancel();
  let response;
  try{
    if(controller.signal.aborted)throw new DOMException('Requête annulée.','AbortError');
    response=await fetch(API_ORIGIN+'/api/'+path,{method,headers:{...(credential&&!anonymous?{Authorization:'Bearer '+credential}:{}),...headers},...(body===undefined?{}:{body}),credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});
    if(!response.ok){
      const data=await response.json().catch(()=>({}));
      const error=new Error(data.error || 'Le stockage partagé est indisponible. Réessaie.');
      error.code=response.status===409?'CLOUD_CONFLICT':response.status===401||response.status===403&&['ACCESS_BLOCKED','ACCOUNT_DISABLED'].includes(data.code)?'CLOUD_ACCESS':'CLOUD_ERROR';
      if(data.retryAfter)error.retryAfter=Number(data.retryAfter);
      if(error.code==='CLOUD_ACCESS'&&credential&&!anonymous)window.dispatchEvent?.(new CustomEvent('wolfguard-access-revoked',{detail:error.message}));
      throw error;
    }
    if (skipVersion!==undefined && Number(response.headers.get('X-WG-Version'))===skipVersion) {
      await response.body?.cancel();return {data:null,headers:response.headers};
    }
    // Keep the deadline and cancellation active while the response body arrives too.
    return {data:await response.json(),headers:response.headers};
  }catch(error){
    if(signal?.aborted)throw new DOMException('Requête annulée.','AbortError');
    if(error.name==='AbortError'||error instanceof TypeError)throw new Error('Connexion au stockage partagé impossible. Tes données existantes sont conservées.');throw error;
  }
  finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
}
const post = async(path,value,options={}) => (await request(path,{...options,method:'POST',body:JSON.stringify(value),headers:{'Content-Type':'application/json',...options.headers}})).data;
export async function status(){const {data}=await request('status',{anonymous:true});initialized=!!data.initialized;return initialized;}
function acceptIdentity(data){
  if(Object.hasOwn(data,'user'))user=data.user;
  if(Object.hasOwn(data,'usersEnabled'))usersEnabled=!!data.usersEnabled;
  window.dispatchEvent?.(new CustomEvent('wolfguard-user-changed'));
}
export const hasAccountInvitation=()=>!!accountTicket;
export function clearAccountInvitation(){accountTicket='';}
export async function inspectAccountInvitation(){return post('account/inspect',{ticket:accountTicket},{anonymous:true});}
export async function completeAccountInvitation(username,code){const result=await post('account/complete',{ticket:accountTicket,username,code},{anonymous:true});accountTicket='';return result;}
export async function login(code,username){
  const data=await post('login',{code,username},{anonymous:true});token=data.token;version=data.version;initialized=true;acceptIdentity(data);return data;
}
export async function initialize(code){
  if(!activation)throw new Error('Le partage doit être activé une seule fois depuis le lien privé sur ton appareil principal.');
  const data=await post('setup',{code},{anonymous:true,headers:{'Content-Type':'application/json','X-WG-Activation':activation}});
  token=data.token;version=data.version;initialized=true;activation='';return data;
}
export async function load(){
  const response=await request('vault'),data=response.data;
  const remoteVersion=Number(response.headers.get('X-WG-Version'));
  if(!Number.isSafeInteger(remoteVersion)||remoteVersion<1)throw new Error('Version distante invalide.');
  version=remoteVersion;return data;
}
export async function refresh(since){
  const response=await request('vault',{skipVersion:since});
  const latest=Number(response.headers.get('X-WG-Version'));
  if(!Number.isSafeInteger(latest)||latest<1)throw new Error('Version distante invalide.');
  if(response.data===null)return null;
  version=latest;return response.data;
}
export async function save(envelope,rotation){
  if(!token)throw new Error('Saisis à nouveau ton code pour enregistrer.');
  const body=JSON.stringify(envelope),size=new TextEncoder().encode(body).length;
  const {data}=await request('vault',{method:'PUT',body,headers:{'Content-Type':'application/json','X-WG-Version':String(version),'X-WG-Size':String(size),...(rotation?{'X-WG-Rotation':rotation}:{})}});
  if(!Number.isSafeInteger(data.version)||data.version!==version+1)throw new Error('Confirmation distante invalide.');
  version=data.version;if(data.token)token=data.token;
}
export async function prepareRotation(oldCode,newCode){return (await post('rotation',{oldCode,newCode,version})).rotation;}
export async function me(){const data=(await request('me')).data;acceptIdentity(data);return data;}
export async function initializeUsers(value){const data=await post('users/initialize',{...value,version});acceptIdentity(data);return data;}
export async function changePersonalCode(oldCode,code){const data=await post('users/change-code',{oldCode,code});token=data.token;acceptIdentity(data);return data;}
export async function touch(){if(token)acceptIdentity(await post('touch',{}));}
export async function agentRequest(path,value,{signal}={}){
  if(!enabled||!token)throw new Error('Ouvre WolfGuard sur le site et saisis ton code pour utiliser les agents.');
    if(!/^(?:users(?:\/(?:create|invite|revoke-invitation|update|reset-code|delete|disconnect|verify-code))?|access(?:\/(?:disconnect|block|unblock))?|agents(?:\/(?:pair|revoke))?|scans(?:\/(?:result|cancel|delete))?|remote\/(?:start|session|input|stop))(?:\?[a-zA-Z0-9=&_-]+)?$/.test(path))throw new Error('Adresse agent invalide.');
  return value===undefined?(await request(path,{signal})).data:post(path,value,{signal});
}
export function clear(){
  if(token)request('logout',{method:'POST'}).catch(()=>{});
  token='';version=0;user=null;usersEnabled=false;
}
