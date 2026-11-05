const WolfGuardSharedWorkspace = (() => {
// Three-way merge of decrypted snapshots, in memory only. Rich text, arrays and
// encrypted fields remain indivisible: concurrent edits must never be guessed.
const stores = ['items','folders','settings','activity'];
function sameValue(a,b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys=Object.keys(a);
  return keys.length===Object.keys(b).length && keys.every(key=>Object.hasOwn(b,key)&&sameValue(a[key],b[key]));
}
function sharedConflict() {
  const error=new Error('Une autre personne a modifié les mêmes données. Ton brouillon est conservé ; enregistre-le en copie ou rouvre la fiche pour voir sa version actuelle.');
  error.code='SHARED_CONFLICT';return error;
}
function mergeRecord(base,local,remote,store) {
  if (sameValue(local,base)) return remote;
  if (sameValue(remote,base)||sameValue(local,remote)) return local;
  if (!base || !local || !remote) throw sharedConflict();
  const result={};
  for (const key of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])) {
    let value;
    if (sameValue(local[key],base[key])) value=remote[key];
    else if (sameValue(remote[key],base[key])||sameValue(local[key],remote[key])) value=local[key];
    else if (store==='items' && key==='viewCount' && [base[key],local[key],remote[key]].every(Number.isSafeInteger) && local[key]>=base[key] && remote[key]>=base[key]) value=local[key]+remote[key]-base[key];
    else if (store==='items' && ['updatedAt','lastViewedAt'].includes(key) && [local[key],remote[key]].every(value=>typeof value==='string'&&Number.isFinite(Date.parse(value)))) value=Date.parse(local[key])>Date.parse(remote[key])?local[key]:remote[key];
    else throw sharedConflict();
    if (value!==undefined) Object.defineProperty(result,key,{value,enumerable:true,writable:true,configurable:true});
  }
  // Moving a record to the trash while someone edits it is also a conflict.
  if (!!local.deletedAt!==!!remote.deletedAt && (!!local.deletedAt!==!!base.deletedAt || !!remote.deletedAt!==!!base.deletedAt)) throw sharedConflict();
  return result;
}
function mergeWorkspace(base,local,remote) {
  const result=structuredClone(remote);
  for (const store of stores) {
    const field=store==='settings'?'key':'id';
    const before=new Map(base[store].map(row=>[row[field],row]));
    const wanted=new Map(local[store].map(row=>[row[field],row]));
    const latest=new Map(remote[store].map(row=>[row[field],row]));
    const merged=[];
    for (const id of new Set([...latest.keys(),...wanted.keys(),...before.keys()])) {
      const value=mergeRecord(before.get(id),wanted.get(id),latest.get(id),store);
      if (value!==undefined) merged.push(structuredClone(value));
    }
    result[store]=merged;
  }
  const folders=new Set(result.folders.filter(row=>!row.deletedAt).map(row=>row.id));
  const known=new Set([...base.folders,...local.folders,...remote.folders].map(row=>row.id));
  for (const row of [...result.folders,...result.items]) {
    const parent=Object.hasOwn(row,'parentId')?row.parentId:row.folderId;
    if (!row.deletedAt && parent && known.has(parent) && !folders.has(parent)) throw sharedConflict();
  }
  return result;
}

return Object.freeze({sameValue,sharedConflict,mergeWorkspace});
})();
