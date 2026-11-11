import {open} from './access.mjs';
import {can,vaultHomeId} from './permissions.mjs';
export function vaultHome(user){return {id:vaultHomeId(user.id),name:user.username,section:'vault',parentId:null,ownerUserId:user.id,systemVaultHome:true};}
// The account registry is the source of truth: a stable home exists as soon as
// an account exists, including pending/disabled accounts. No snapshot race or
// one-off backfill is needed to create it.
export async function allVaultHomes(env){
  const rows=await env.DB.prepare("SELECT id,name_cipher FROM users ORDER BY CASE WHEN role='admin' THEN 0 ELSE 1 END,created_at,id").all();
  return Promise.all(rows.results.map(async row=>vaultHome({id:row.id,username:await open(row.name_cipher,'WolfGuard users v1:name:'+row.id,env)})));
}
export async function addVaultIdentity(user,env,now,includeAll=true){
  if(!user.id)return user;
  user.vaultHome=vaultHome(user);user.vaultFolders=[user.vaultHome];return user;
}
export function withVaultHomes(payload,homes){
  const valid=new Set(homes.map(home=>home.id)),removed=new Set(payload.folders.filter(folder=>/^vault-user-[a-f0-9]{32}$/.test(folder.id)&&!valid.has(folder.id)).map(folder=>folder.id));
  let changed=true;while(changed){changed=false;for(const folder of payload.folders)if(removed.has(folder.parentId)&&!removed.has(folder.id)){removed.add(folder.id);changed=true;}}
  const deleted=new Set(payload.items.filter(item=>removed.has(item.folderId)).map(item=>item.id));
  const map=new Map(payload.folders.filter(folder=>!removed.has(folder.id)).map(folder=>[folder.id,folder]));for(const home of homes)map.set(home.id,structuredClone(home));
  // Existing unowned vault records belong to the original workspace owner.
  const owner=homes[0];if(owner){for(const folder of map.values())if(folder.section==='vault'&&!folder.parentId&&!valid.has(folder.id))map.set(folder.id,{...folder,parentId:owner.id});}
  return {...payload,items:payload.items.filter(item=>!deleted.has(item.id)).map(item=>item.type==='vault'&&!item.folderId&&owner?{...item,folderId:owner.id}:item),activity:payload.activity.filter(event=>!deleted.has(event.itemId)),folders:[...map.values()]};
}
