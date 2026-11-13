import {open as openLegacy} from './access.mjs';

const context='WolfGuard workspace key wrapping v2';
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const hex=value=>Array.from(value,n=>n.toString(16).padStart(2,'0')).join('');
const fromHex=value=>Uint8Array.from(value.match(/../g)||[],n=>parseInt(n,16));
function material(value){
  try{if(value&&typeof value.key==='string'&&typeof value.salt==='string'&&atob(value.key).length===32&&atob(value.salt).length===16&&btoa(atob(value.key))===value.key&&btoa(atob(value.salt))===value.salt)return {key:value.key,salt:value.salt};}catch{}
  throw new Error('Clé de partage invalide.');
}
async function wrappingKey(env){
  const value=env.WORKSPACE_KEY_ENCRYPTION_KEY;
  if(!/^[a-f0-9]{64}$/.test(value||'')||value===env.STORAGE_KEY||value===env.AUTH_PEPPER)throw new Error('Protection des clés de partage indisponible.');
  const bytes=fromHex(value);
  try{return await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);}finally{bytes.fill(0);}
}
export async function sealWorkspaceKey(value,env){
  const key=await wrappingKey(env),iv=crypto.getRandomValues(new Uint8Array(12)),plain=encoder.encode(JSON.stringify(material(value)));
  try{
    const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(context),tagLength:128},key,plain));
    return 'wgkey2:'+hex(iv)+':'+btoa(String.fromCharCode(...encrypted));
  }finally{plain.fill(0);}
}
export async function openWorkspaceKey(row,env,attempt=0){
  const key=await wrappingKey(env),value=row.workspace_key_cipher;
  if(typeof value!=='string')throw new Error('Clé de partage absente.');
  if(value.startsWith('wgkey2:')){
    const parts=value.split(':');
    if(parts.length!==3||!/^[a-f0-9]{24}$/.test(parts[1])||!/^[A-Za-z0-9+/]+={0,2}$/.test(parts[2])||parts[2].length>1024)throw new Error('Clé de partage altérée.');
    const plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromHex(parts[1]),additionalData:encoder.encode(context),tagLength:128},key,Uint8Array.from(atob(parts[2]),c=>c.charCodeAt(0))));
    try{return material(JSON.parse(decoder.decode(plain)));}finally{plain.fill(0);}
  }
  // Migrate only this key's wrapping, preserving the workspace key and data.
  const clear=material(await openLegacy(value,'WolfGuard users v1:workspace-key',env));
  const encrypted=await sealWorkspaceKey(clear,env);
  const result=await env.DB.prepare('UPDATE vault SET workspace_key_cipher=? WHERE id=1 AND workspace_key_cipher=?').bind(encrypted,value).run();
  if(Number(result?.meta?.changes)===1){row.workspace_key_cipher=encrypted;return clear;}
  if(attempt>=2)throw new Error('La clé de partage a changé. Reconnecte-toi.');
  const current=await env.DB.prepare('SELECT workspace_key_cipher FROM vault WHERE id=1').first();
  if(!current)throw new Error('Clé de partage absente.');
  return openWorkspaceKey(current,env,attempt+1);
}
