import {open} from './access.mjs';
import {can,vaultHomeId} from './permissions.mjs';
export function vaultHome(user){return {id:vaultHomeId(user.id),name:user.username,section:'vault',parentId:null,ownerUserId:user.id,systemVaultHome:true};}
// The account registry is the source of truth: a stable home exists as soon as
// an account exists, including pending/disabled accounts. No snapshot race or
// one-off backfill is needed to create it.
export async function allVaultHomes(env){
  const rows=await env.DB.prepare('SELECT id,name_cipher FROM users ORDER BY created_at,id').all();
  return Promise.all(rows.results.map(async row=>vaultHome({id:row.id,username:await open(row.name_cipher,'WolfGuard users v1:name:'+row.id,env)})));
}
export async function addVaultIdentity(user,env,now,includeAll=true){
  if(!user.id)return user;
  user.vaultHome=vaultHome(user);user.vaultFolders=includeAll&&can(user,'vault.all',now)?await allVaultHomes(env):[user.vaultHome];return user;
}
export function withVaultHomes(payload,homes){
  const map=new Map(payload.folders.map(folder=>[folder.id,folder]));for(const home of homes)map.set(home.id,structuredClone(home));
  return {...payload,folders:[...map.values()]};
}
