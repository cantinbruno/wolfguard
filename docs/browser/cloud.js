// Public API location, never a credential. Login sessions live in memory only.
export const API_ORIGIN = 'https://wolfguard-web-cantin.paledove36.chatgpt.site';
const local = ['127.0.0.1','localhost'].includes(location.hostname);
export const enabled = ['wolfguard.wavetools.fr','cantinbruno.github.io'].includes(location.hostname) || (local && new URLSearchParams(location.search).has('sync-test'));
let token='',version=0,initialized=null,activation='';
if(enabled){
  const match=/^#activate=([a-f0-9]{64})$/.exec(location.hash);
  if(match){activation=match[1];history.replaceState(null,'',location.pathname+location.search);}
}
export const isInitialized = () => initialized;
export const canActivate = () => !!activation;
export const hasSession = () => !!token;
export const currentVersion = () => version;
async function request(path,{method='GET',body,headers={},anonymous=false}={}) {
  const credential=token,controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
  let response;
  try{
    response=await fetch(API_ORIGIN+'/api/'+path,{method,headers:{...(credential&&!anonymous?{Authorization:'Bearer '+credential}:{}),...headers},...(body===undefined?{}:{body}),credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});
    if(!response.ok){
      const data=await response.json().catch(()=>({}));
      const error=new Error(data.error || 'Le stockage partagé est indisponible. Réessaie.');
      error.code=response.status===409?'CLOUD_CONFLICT':response.status===401?'CLOUD_ACCESS':'CLOUD_ERROR';
      if(data.retryAfter)error.retryAfter=Number(data.retryAfter);
      throw error;
    }
    return response;
  }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw new Error('Connexion au stockage partagé impossible. Tes données existantes sont conservées.');throw error;}
  finally{clearTimeout(timeout);}
}
const post = async(path,value,options={}) => (await request(path,{method:'POST',body:JSON.stringify(value),headers:{'Content-Type':'application/json',...options.headers},...options})).json();
export async function status(){const data=await (await request('status',{anonymous:true})).json();initialized=!!data.initialized;return initialized;}
export async function login(code){
  const data=await post('login',{code},{anonymous:true});token=data.token;version=data.version;initialized=true;return data;
}
export async function initialize(code){
  if(!activation)throw new Error('Le partage doit être activé une seule fois depuis le lien privé sur ton appareil principal.');
  const data=await post('setup',{code},{anonymous:true,headers:{'Content-Type':'application/json','X-WG-Activation':activation}});
  token=data.token;version=data.version;initialized=true;activation='';return data;
}
export async function load(){
  const response=await request('vault'),data=await response.json();
  const remoteVersion=Number(response.headers.get('X-WG-Version'));
  if(!Number.isSafeInteger(remoteVersion)||remoteVersion<1)throw new Error('Version distante invalide.');
  version=remoteVersion;return data;
}
export async function save(envelope,rotation){
  if(!token)throw new Error('Saisis à nouveau ton code pour enregistrer.');
  const body=JSON.stringify(envelope),size=new TextEncoder().encode(body).length;
  const data=await (await request('vault',{method:'PUT',body,headers:{'Content-Type':'application/json','X-WG-Version':String(version),'X-WG-Size':String(size),...(rotation?{'X-WG-Rotation':rotation}:{})}})).json();
  if(!Number.isSafeInteger(data.version)||data.version!==version+1)throw new Error('Confirmation distante invalide.');
  version=data.version;if(data.token)token=data.token;
}
export async function prepareRotation(oldCode,newCode){return (await post('rotation',{oldCode,newCode,version})).rotation;}
export async function touch(){if(token)await post('touch',{});}
export function clear(){
  if(token)request('logout',{method:'POST'}).catch(()=>{});
  token='';version=0;
}
