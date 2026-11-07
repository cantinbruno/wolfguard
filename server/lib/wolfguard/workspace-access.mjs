import {open as openRecord} from './access.mjs';
import {can,recordLevel,recordSection,isVaultHome} from './permissions.mjs';
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const from64=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const to64=value=>{let text='';const bytes=new Uint8Array(value);for(let i=0;i<bytes.length;i+=16000)text+=String.fromCharCode(...bytes.subarray(i,i+16000));return btoa(text);};
const keyFor=material=>crypto.subtle.importKey('raw',from64(material.key),'AES-GCM',false,['encrypt','decrypt']);
const aad=env=>encoder.encode(env.version===3?JSON.stringify([env.format,env.version,env.cipher,env.kdf,env.iterations,env.revision,env.salt,env.iv]):`${env.format}|${env.version}|AES-256-GCM|PBKDF2-SHA256`);
export async function canonicalMaterial(row,env){return openRecord(row.workspace_key_cipher,'WolfGuard users v1:workspace-key',env);}
export async function deliveryMaterial(row,user,env){
  const material=await canonicalMaterial(row,env);if(!user||user.role==='admin')return material;
  const raw=await crypto.subtle.importKey('raw',from64(material.key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const derive=label=>crypto.subtle.sign('HMAC',raw,encoder.encode('WolfGuard scoped workspace v1:'+user.id+':'+(user.permission_revision||1)+':'+label));
  return {key:to64(await derive('key')),salt:to64((new Uint8Array(await derive('salt'))).slice(0,16))};
}
export async function openEnvelope(envelope,material){
  if(!envelope||envelope.format!=='wolfguard-workspace'||![2,3].includes(envelope.version)||envelope.cipher!=='AES-256-GCM'||envelope.kdf!=='PBKDF2-SHA256'||envelope.salt!==material.salt||!Number.isSafeInteger(envelope.revision)||envelope.revision<1||from64(envelope.iv).length!==12)throw new Error('Copie chiffrée invalide.');
  const bytes=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(envelope.iv),additionalData:aad(envelope)},await keyFor(material),from64(envelope.data)));
  try{return JSON.parse(decoder.decode(bytes));}finally{bytes.fill(0);}
}
export async function sealEnvelope(payload,material,revision){
  const envelope={format:'wolfguard-workspace',version:3,cipher:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:600000,revision,salt:material.salt,iv:to64(crypto.getRandomValues(new Uint8Array(12)))};
  const bytes=encoder.encode(JSON.stringify(payload));try{return {...envelope,data:to64(await crypto.subtle.encrypt({name:'AES-GCM',iv:from64(envelope.iv),additionalData:aad(envelope)},await keyFor(material),bytes))};}finally{bytes.fill(0);}
}
async function rewrap(blob,from,to,stable=false){
  if(!blob)return blob;
  const plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(blob.iv)},await keyFor(from),new Uint8Array(blob.data)));
  try{
    // Stable scoped ciphertext avoids false shared-edit conflicts. The keyed hash
    // includes the entire authenticated source blob; changed content changes IV.
    const hmac=stable?await crypto.subtle.importKey('raw',from64(to.key),{name:'HMAC',hash:'SHA-256'},false,['sign']):null;
    const iv=stable?(new Uint8Array(await crypto.subtle.sign('HMAC',hmac,encoder.encode('WolfGuard nested projection v1:'+JSON.stringify(blob))))).slice(0,12):crypto.getRandomValues(new Uint8Array(12));
    return {iv:[...iv],data:[...new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await keyFor(to),plain))]};
  }finally{plain.fill(0);}
}
const secretFields=['vaultBlobEnc','passwordEnc','username','password','url','host','notes','custom'];
export const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));return value;}
export function validateWorkspace(payload){
  if(!payload||payload.version!==2||!['items','folders','settings','activity'].every(k=>Array.isArray(payload[k])))throw new Error('Le propriétaire doit mettre à jour cette copie de WolfGuard.');
  for(const collection of ['items','folders','activity']){const seen=new Set();for(const row of payload[collection]){if(!row||typeof row!=='object'||typeof row.id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(row.id)||seen.has(row.id))throw new Error('Identifiant de donnée invalide.');seen.add(row.id);}}
  return payload;
}
export async function projectWorkspace(source,user,master,delivery,now){
  validateWorkspace(source);
  const folders=source.folders.filter(row=>recordLevel(user,row,'folders',source.folders,now)!=='deny').map(row=>structuredClone(row)),folderIds=new Set(folders.map(row=>row.id));
  const items=source.items.filter(row=>recordLevel(user,row,'items',source.folders,now)!=='deny').map(row=>structuredClone(row)),itemIds=new Set(items.map(row=>row.id));
  for(const row of folders){row.accessLevel=recordLevel(user,row,'folders',source.folders,now);if(row.parentId&&!folderIds.has(row.parentId))row.parentId=null;}
  for(const row of items){
    row.accessLevel=recordLevel(user,row,'items',source.folders,now);
    if(row.folderId&&!folderIds.has(row.folderId))row.folderId=null;
    if(row.linkedItemIds)row.linkedItemIds=row.linkedItemIds.filter(id=>itemIds.has(id));
    if(row.type==='vault'){
      if(!can(user,'vault.secrets',now)){for(const field of secretFields)delete row[field];row.secretsRestricted=true;}
      else {if(row.vaultBlobEnc)row.vaultBlobEnc=await rewrap(row.vaultBlobEnc,master,delivery,true);if(row.passwordEnc)row.passwordEnc=await rewrap(row.passwordEnc,master,delivery,true);}
    }
  }
  return {version:2,items,folders,settings:source.settings.filter(row=>/^(?:memo-[a-z-]+-version|procedure-[a-z-]+-version|autoLockMinutes|theme|fontSize|density)$/.test(row.key)).map(row=>structuredClone(row)),activity:source.activity.filter(row=>row.itemId&&itemIds.has(row.itemId)).map(row=>structuredClone(row))};
}
function denied(fail){fail(403,'Cette modification dépasse les droits accordés à ton compte.',{code:'PERMISSION_DENIED'});}
export async function mergeScopedWorkspace(source,visible,wanted,user,master,delivery,now,fail){
  try{validateWorkspace(wanted);}catch(error){fail(400,error.message);}
  const output={...source,items:[...source.items],folders:[...source.folders],activity:[...source.activity]};
  const visibleIds=new Set(visible.items.map(row=>row.id));
  for(const collection of ['folders','items']){
    const oldMap=new Map(visible[collection].map(row=>[row.id,row])),newMap=new Map(wanted[collection].map(row=>[row.id,row])),canonical=new Map(source[collection].map(row=>[row.id,row]));
    for(const id of new Set([...oldMap.keys(),...newMap.keys()])){
      const before=oldMap.get(id),after=newMap.get(id);if(same(before,after))continue;
      if(isVaultHome(id))denied(fail);
      if(after&&['systemVaultHome','ownerUserId'].some(field=>!same(before?.[field],after[field])))denied(fail);
      if(!before&&canonical.has(id))denied(fail);
      const section=recordSection(before||after,collection);
      if(before&&after&&recordSection(after,collection)!==section)denied(fail);
      const action=!before?'create':!after||!!before.deletedAt!==!!after.deletedAt?'delete':'edit';
      if(!can(user,section+'.'+action,now)||before&&recordLevel(user,canonical.get(id),collection,source.folders,now)!=='write'||after&&recordLevel(user,after,collection,wanted.folders,now)!=='write')denied(fail);
      const parentField=collection==='folders'?'parentId':'folderId';
      if(after?.[parentField]&&after[parentField]!==before?.[parentField]){const destination=wanted.folders.find(row=>row.id===after[parentField]);if(!destination||recordLevel(user,destination,'folders',wanted.folders,now)!=='write'||recordSection(destination,'folders')!==section)denied(fail);}
      // A folder operation must never move, delete or expose hidden descendants.
      if(collection==='folders'&&before&&(!after||before.parentId!==after.parentId||!!before.deletedAt!==!!after.deletedAt)){
        for(const [kind,rows]of [['folders',source.folders],['items',source.items]])for(const row of rows){
          let parent=kind==='folders'?row.parentId:row.folderId;const seen=new Set();while(parent&&!seen.has(parent)){if(parent===id){if(recordLevel(user,row,kind,source.folders,now)!=='write'||!can(user,recordSection(row,kind)+'.'+(action==='delete'?'delete':'edit'),now))denied(fail);break;}seen.add(parent);parent=source.folders.find(f=>f.id===parent)?.parentId;}
        }
      }
      const index=output[collection].findIndex(row=>row.id===id);
      if(!after){output[collection].splice(index,1);continue;}
      const next=structuredClone(after),original=canonical.get(id);
      delete next.accessLevel;
      delete next.secretsRestricted;
      if(before&&after[collection==='items'?'folderId':'parentId']===before[collection==='items'?'folderId':'parentId']){
        const field=collection==='items'?'folderId':'parentId';if(original?.[field]&&!before[field])next[field]=original[field];
      }
      if(collection==='items'){
        if(after.linkedItemIds)next.linkedItemIds=[...new Set([...after.linkedItemIds.filter(target=>visibleIds.has(target)),...(original?.linkedItemIds||[]).filter(target=>!visibleIds.has(target))])];
        if(section==='vault')for(const field of secretFields){
          if(same(before?.[field],after[field])){if(original&&field in original)next[field]=original[field];else delete next[field];}
          else {if(!can(user,'vault.secrets',now))denied(fail);if(['vaultBlobEnc','passwordEnc'].includes(field)&&after[field]){try{next[field]=await rewrap(after[field],delivery,master);}catch{fail(400,'Secret chiffré invalide.');}}}
        }
      }
      if(index<0)output[collection].push(next);else output[collection][index]=next;
    }
  }
  // Preferences remain local for members. Shared settings are owner-controlled.
  const knownActivity=new Set(source.activity.map(row=>row.id));
  output.activity.push(...wanted.activity.filter(row=>!knownActivity.has(row.id)&&visibleIds.has(row.itemId)).map(row=>structuredClone(row)));
  const folderMap=new Map(output.folders.map(row=>[row.id,row]));
  for(const folder of output.folders){let id=folder.parentId;const seen=new Set([folder.id]);while(id){if(seen.has(id)||!folderMap.has(id)||recordSection(folderMap.get(id),'folders')!==recordSection(folder,'folders'))fail(400,'Hiérarchie de dossiers invalide.');seen.add(id);id=folderMap.get(id).parentId;}}
  for(const row of output.items)if(row.folderId&&(!folderMap.has(row.folderId)||recordSection(folderMap.get(row.folderId),'folders')!==recordSection(row)))fail(400,'Dossier de destination invalide.');
  return output;
}
