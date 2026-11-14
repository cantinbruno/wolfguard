// Public API location, never a credential. Reload tickets are scoped to one tab.
export const API_ORIGIN = 'https://wolfguard-web-cantin.cantin-bruno.chatgpt.site';
const local = ['127.0.0.1','localhost'].includes(location.hostname);
export const enabled = location.hostname==='wolfguard.wavetools.fr' || (local && new URLSearchParams(location.search).has('sync-test'));
let token='',version=0,initialized=null,activation='',user=null,usersEnabled=false,accountTicket='';
let changingFactor=null;
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
export const can=key=>!enabled||(typeof WolfGuardPermissions!=='undefined'?WolfGuardPermissions.can(user,key):user?.role==='admin');
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
      if(response.status===401&&data.retryAfter&&path.startsWith('users/otp/'))error.code='CLOUD_ERROR';
      if(error.code==='CLOUD_ACCESS'&&credential&&(credential!==token||changingFactor?.credential===credential&&path!=='users/otp/replace/confirm'))error.code='CLOUD_STALE_SESSION';
      if(data.retryAfter)error.retryAfter=Number(data.retryAfter);
      if(error.code==='CLOUD_ACCESS'&&credential&&credential===token&&!anonymous)window.dispatchEvent?.(new CustomEvent('wolfguard-access-revoked',{detail:error.message}));
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
function acceptLogin(data){
  if(data.accountSelection||data.otpRequired||data.otpSetupRequired){detach();return data;}
  token=data.token;version=data.version;initialized=true;acceptIdentity(data);return data;
}
export async function login(code,username,otp){
  const data=await post('login',{code,...(username===undefined?{}:{username}),...(otp===undefined?{}:{otp})},{anonymous:true});
  return acceptLogin(data);
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
export async function me(withWorkspace=false){const data=(await request(withWorkspace?'me?workspace=1':'me')).data;acceptIdentity(data);return data;}
export async function initializeUsers(value){const data=await post('users/initialize',{...value,version});acceptIdentity(data);return data;}
export async function changePersonalCode(oldCode,code){const data=await post('users/change-code',{oldCode,code});token=data.token;acceptIdentity(data);return data;}
export async function touch({activityAge}={}){
  if(!token)return;
  const credential=token,headers=Number.isSafeInteger(activityAge)&&activityAge>=0&&activityAge<4*3600000?{'X-WG-Activity':String(activityAge)}:{};
  const data=await post('touch',{}, {headers});
  if(token===credential)acceptIdentity(data);
}
export async function agentRequest(path,value,{signal}={}){
  if(!enabled||!token)throw new Error('Ouvre WolfGuard sur le site et saisis ton code pour utiliser les agents.');
    if(!/^(?:edr(?:\/(?:events|policy|command|acknowledge))?|users(?:\/(?:permissions(?:\/audit)?|create|invite|revoke-invitation|update|reset-code|reset-otp|delete|disconnect|verify-code|restricted|push(?:\/(?:register|remove|test))?|otp(?:\/(?:setup|enable|disable|replace(?:\/(?:confirm|cancel))?))?))?|ai(?:\/cancel)?|access(?:\/(?:disconnect|block|unblock))?|agents(?:\/(?:pair|revoke|restricted))?|scans(?:\/(?:result|intelligence|cancel|delete))?|remote\/(?:start|session|input|stop|files\/(?:command|result)|terminal\/(?:command|cancel)))(?:\?[a-zA-Z0-9=&_-]+)?$/.test(path))throw new Error('Adresse agent invalide.');
  const credential=token,replacement=path==='users/otp/replace/confirm'?{credential}:null;
  if(replacement)changingFactor=replacement;
  try{
    const result=value===undefined?(await request(path,{signal})).data:await post(path,value,{signal});
    if(replacement&&credential===token&&/^[a-f0-9]{64}$/.test(result.token||''))token=result.token;
    return result;
  }finally{if(changingFactor===replacement)changingFactor=null;}
}
export async function chatHistory(action='',value){
  if(!enabled||!token)throw new Error('Connecte-toi pour retrouver ton historique.');
  if(!/^(?:\?id=[a-f0-9]{32}|\/(?:save|delete|purge))?$/.test(action))throw new Error('Adresse d’historique invalide.');
  return value===undefined?(await request('chat/history'+action)).data:post('chat/history'+action,value);
}
export async function chatSettings(value){
  if(!enabled||!token)throw new Error('Connecte-toi pour utiliser le chatbot.');
  return value===undefined?(await request('chat/settings')).data:post('chat/settings',value);
}
export async function chatCompletion(messages,{signal,onToken=()=>{}}={}){
  if(!enabled||!token)throw new Error('Connecte-toi pour utiliser le chatbot.');
  const credential=token,controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),95000);
  const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  let reader,content='',done=false,truncated=false;
  try{
    if(controller.signal.aborted)throw new DOMException('Réponse arrêtée.','AbortError');
    const response=await fetch(API_ORIGIN+'/api/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body:JSON.stringify({messages}),credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});
    if(!response.ok){const data=await response.json().catch(()=>({})),error=new Error(data.error||'Le service IA est indisponible.');error.code=response.status===401||response.status===403&&['ACCESS_BLOCKED','ACCOUNT_DISABLED'].includes(data.code)?'CLOUD_ACCESS':'CLOUD_ERROR';if(error.code==='CLOUD_ACCESS'&&credential===token)window.dispatchEvent?.(new CustomEvent('wolfguard-access-revoked',{detail:error.message}));throw error;}
    if(!response.headers.get('Content-Type')?.includes('text/event-stream')||!response.body)throw new Error('Réponse du service IA invalide.');
    reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';
    while(!done){
      const part=await reader.read();if(signal?.aborted||credential!==token)throw new DOMException('Réponse arrêtée.','AbortError');
      buffer+=part.done?decoder.decode():decoder.decode(part.value,{stream:true});if(buffer.length>262144)throw new Error('Réponse du service IA invalide.');
      let index;while((index=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,index).replace(/\r$/,'');buffer=buffer.slice(index+1);if(!line.startsWith('data:'))continue;const data=JSON.parse(line.slice(5));
        if(data.type==='error')throw new Error(data.message||'La réponse a été interrompue.');
        if(data.type==='token'&&typeof data.content==='string'){content+=data.content;if(content.length>12000)throw new Error('Réponse trop longue.');onToken({type:'token',content});}
        if(data.type==='done'){done=true;truncated=!!data.truncated;break;}
      }
      if(part.done&&!done)throw new Error('La réponse a été interrompue. Réessaie.');
    }
    if(!content.trim())throw new Error('Le service IA a renvoyé une réponse vide.');
    return {content,truncated};
  }catch(error){if(signal?.aborted||credential!==token)throw new DOMException('Réponse arrêtée.','AbortError');if(error.name==='AbortError')throw new Error('Le service IA a mis trop de temps à répondre. Réessaie.');if(error instanceof TypeError)throw new Error('Connexion à l’API IA impossible. Vérifie ta connexion.');throw error;}
  finally{controller.abort();await reader?.cancel().catch(()=>{});reader?.releaseLock();clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}
export function clear(){
  if(token)request('logout',{method:'POST'}).catch(()=>{});
  token='';version=0;user=null;usersEnabled=false;
}
