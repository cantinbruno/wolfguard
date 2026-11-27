// One-time secret links. The browser encrypts the secret with a random key that
// stays in the link fragment; the server keeps only the ciphertext and a hash
// of the link id, and deletes the row the moment it is opened or expires.
import {requirePermission} from './permissions.mjs';
import {logEvent} from './journal.mjs';

export const SHARE_DURATIONS=[3600000,86400000,604800000];
const MAX_ACTIVE=20,GONE='Ce lien est expiré ou a déjà été utilisé.';
const idHash=(id,digest)=>digest('WolfGuard share v1:'+id);

export async function handleShareAPI(request,env,now,session,h){
  const {fail,json,body,digest,random}=h,path=new URL(request.url).pathname;
  if(request.method!=='POST')fail(404,'Adresse inconnue.');
  if(path==='/api/share/open'){
    const data=await body();
    if(typeof data.id!=='string'||!/^[a-f0-9]{32}$/.test(data.id))fail(404,GONE);
    // Reading and deleting are one statement: the link works exactly once.
    const row=await env.DB.prepare('DELETE FROM shared_secrets WHERE id_hash=? AND expires_at>? RETURNING cipher,created_at').bind(await idHash(data.id,digest),now).first();
    if(!row)fail(404,GONE);
    await logEvent(env,now,{kind:'share-opened',details:{createdAt:row.created_at}});
    return json({cipher:row.cipher});
  }
  if(!session)fail(401,'Saisis à nouveau ton code.');
  requirePermission(session.user,'vault.secrets',fail,now);
  const owner=session.user.id||'owner';
  if(path==='/api/share/create'){
    const data=await body();
    if(typeof data.cipher!=='string'||!/^[A-Za-z0-9_-]{40,24000}$/.test(data.cipher)||!SHARE_DURATIONS.includes(data.duration))fail(400,'Partage invalide.');
    const id=random(16),expiresAt=now+data.duration;
    // The count and the insert are one statement, so concurrent requests cannot exceed the limit.
    const added=await env.DB.prepare('INSERT INTO shared_secrets(id_hash,cipher,created_by,created_at,expires_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM shared_secrets WHERE created_by=? AND expires_at>?)<? RETURNING id_hash')
      .bind(await idHash(id,digest),data.cipher,owner,now,expiresAt,owner,now,MAX_ACTIVE).first();
    if(!added)fail(429,'Tu as déjà '+MAX_ACTIVE+' liens de partage actifs. Attends qu’ils soient ouverts ou expirés.');
    await logEvent(env,now,{kind:'share-created',details:{by:session.user.username,hours:data.duration/3600000}});
    return json({id,expiresAt});
  }
  if(path==='/api/share/revoke'){
    const data=await body();
    if(typeof data.id!=='string'||!/^[a-f0-9]{32}$/.test(data.id))fail(400,'Lien invalide.');
    const removed=await env.DB.prepare('DELETE FROM shared_secrets WHERE id_hash=? AND created_by=? RETURNING id_hash').bind(await idHash(data.id,digest),owner).first();
    return json({revoked:!!removed});
  }
  fail(404,'Adresse inconnue.');
}
