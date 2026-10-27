// Only encrypted envelopes cross this boundary. Credentials remain in memory.
export const GITHUB_TARGET=Object.freeze({owner:'cantinbruno',repo:'wolfguard-data',branch:'main',path:'workspace.wgweb'});
export function createGitHubSync(validateEnvelope) {
  const target=GITHUB_TARGET, base='https://api.github.com/repos/'+target.owner+'/'+target.repo;
  const MAX_WIRE=48*1024*1024;
  let token='',generation=0,expires=0,expiryTimer=null;
  const error=(code,message)=>Object.assign(new Error(message),{code});
  function disconnect() {token='';expires=0;generation++;clearTimeout(expiryTimer);expiryTimer=null;}
  const connected=()=>!!token && Date.now()<expires;
  async function text(response,limit) {
    if(Number(response.headers.get('Content-Length'))>limit)throw error('SIZE','Le fichier GitHub est trop volumineux.');
    const reader=response.body.getReader(),chunks=[];
    let size=0;
    try {
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw error('SIZE','Le fichier GitHub est trop volumineux.');}chunks.push(value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    } finally {reader.releaseLock();}
  }
  async function api(suffix,options={}) {
    if(!connected()){disconnect();throw error('AUTH','Reconnecte ton accès GitHub.');}
    const current=generation;
    let response;
    try {
      response=await fetch(base+suffix,{method:options.method||'GET',headers:{Accept:options.raw?'application/vnd.github.raw+json':options.object?'application/vnd.github.object+json':'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',...(options.body?{'Content-Type':'application/json'}:{})},body:options.body?JSON.stringify(options.body):undefined,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error',signal:AbortSignal.timeout(20000)});
    } catch {throw error('NETWORK','GitHub est inaccessible. Tes modifications restent sur cet appareil.');}
    if(current!==generation || !connected())throw error('AUTH','Reconnecte ton accès GitHub.');
    if(response.status===409 || response.status===422)throw error('CONFLICT','Un autre appareil a modifié le coffre. Aucune version n’a été écrasée.');
    if(response.status===429 || (response.status===403 && response.headers.get('X-RateLimit-Remaining')==='0'))throw error('RATE','La limite GitHub est atteinte. Réessaie plus tard ; tes modifications restent ici.');
    if(response.status===401 || response.status===403){disconnect();throw error('AUTH','Accès GitHub expiré ou insuffisant. Autorise uniquement wolfguard-data, avec Contents en lecture et écriture.');}
    if(response.status===404 && options.missing)return null;
    if(!response.ok)throw error('GITHUB','Le dépôt privé GitHub est indisponible ou inaccessible.');
    const body=await text(response,options.raw?MAX_WIRE:2*1024*1024);
    try{return options.raw?body:JSON.parse(body);}catch{throw error('FORMAT','Réponse GitHub invalide.');}
  }
  async function privacy() {
    const repo=await api('');
    if(repo.private!==true || repo.full_name?.toLowerCase()!==(target.owner+'/'+target.repo).toLowerCase()){
      disconnect();throw error('PRIVACY','La synchronisation exige le dépôt privé wolfguard-data. Aucun coffre n’a été envoyé.');
    }
  }
  async function connect(value) {
    disconnect();
    if(typeof value!=='string' || !/^github_pat_[A-Za-z0-9_]{20,255}$/.test(value))throw error('TOKEN','Utilise une autorisation GitHub fine-grained, commençant par github_pat_.');
    token=value;expires=Date.now()+15*60*1000;
    expiryTimer=setTimeout(disconnect,15*60*1000);expiryTimer.unref?.();
    try{await privacy();}catch(failure){disconnect();throw failure;}
  }
  const validSHA=value=>typeof value==='string' && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value);
  async function inspect() {
    const meta=await api('/contents/'+target.path+'?ref='+target.branch,{missing:true,object:true});
    if(!meta){
      const root=await api('/contents/?ref='+target.branch,{object:true});
      if(!Array.isArray(root) && !Array.isArray(root?.entries))throw error('AUTH','La lecture du dépôt privé n’est pas autorisée. Vérifie la permission Contents.');
      return null;
    }
    if(meta.type!=='file' || !validSHA(meta.sha) || !Number.isSafeInteger(meta.size) || meta.size>MAX_WIRE)throw error('FORMAT','Le fichier privé de synchronisation est invalide.');
    return {sha:meta.sha,size:meta.size};
  }
  async function read() {
    const meta=await inspect();if(!meta)return null;
    const raw=await api('/git/blobs/'+meta.sha,{raw:true});
    let envelope;
    try{envelope=validateEnvelope(JSON.parse(raw));}catch{throw error('FORMAT','Le fichier GitHub ne contient pas un coffre chiffré compatible.');}
    return {envelope,sha:meta.sha};
  }
  async function write(envelope,sha) {
    const safe=validateEnvelope(envelope);
    if(sha!==null && !validSHA(sha))throw error('FORMAT','Version de synchronisation invalide.');
    await privacy();
    const bytes=new TextEncoder().encode(JSON.stringify(safe));
    if(bytes.length>MAX_WIRE)throw error('SIZE','Le coffre dépasse la limite de synchronisation.');
    let binary='';for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
    const result=await api('/contents/'+target.path,{method:'PUT',body:{message:'Synchronize encrypted WolfGuard workspace',branch:target.branch,content:btoa(binary),...(sha?{sha}:{})}});
    if(!validSHA(result.content?.sha))throw error('FORMAT','GitHub n’a pas confirmé la sauvegarde.');
    return {sha:result.content.sha,envelope:safe};
  }
  return Object.freeze({connect,disconnect,connected,inspect,read,write,target});
}
