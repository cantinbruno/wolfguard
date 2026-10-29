'use strict';

// One-time removal of blank worksheets, including previously unified memos.
// Command examples and completed documents remain useful reference material.
function buildMemoFormCleanup(snapshot, stamp = new Date().toISOString()) {
  const marker='memo-form-cleanup-version',summary={removedItems:0,updatedLinks:0,removedActivity:0,emptyFolders:0};
  if(snapshot.settings?.some(row=>row.key===marker&&Number(row.value)>=1))return {operations:[],summary};
  const types=new Set(['memo','personal','report','template']);
  const fold=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function isBlankForm(item){
    if(!types.has(item.type))return false;
    const kind=item.originalType||item.type;
    if(['command','procedure','mail'].includes(kind))return false;
    if(/<(?:pre|code|kbd|samp)\b/i.test(item.content||'')||item.commandBlocks?.some(block=>String(block.code||'').trim()))return false;
    const body=String(item.content||'').replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi,' ').replace(/<[^>]*>/g,' ')
      .replace(/&#(?:x([\da-f]+)|(\d+));/gi,(_,hex,decimal)=>{const point=parseInt(hex||decimal,hex?16:10);return point<=0x10ffff?String.fromCodePoint(point):' ';})
      .replace(/&(?:lbrace|lcub);/gi,'{').replace(/&(?:rbrace|rcub);/gi,'}').replace(/&(?:lbrack|lsqb);/gi,'[').replace(/&(?:rbrack|rsqb);/gi,']').replace(/&nbsp;/gi,' ');
    const tokens=[...body.matchAll(/\{([^{}\n]{2,100})\}|\[([^\[\]\n]{2,100})\]/g)].map(match=>(match[1]||match[2]).trim());
    const fields=new Set(tokens.filter(value=>/^[\p{L}][\p{L}\p{N}_ /-]*$/u.test(value)&&!/^\s*(?:RFC|CVE|KB|ISO|IEEE|IETF)\b/i.test(value)).map(fold));
    if(fields.size<3)return false;
    const instruction=/\b(?:completer|renseigner|remplir)\s+(?:les\s+)?(?:champs|rubriques|informations)|\b(?:formulaire|trame|modele)\s+a\s+(?:completer|renseigner|remplir)\b/.test(fold(body));
    return ['report','template'].includes(kind)||instruction;
  }
  const removed=new Set((snapshot.items||[]).filter(isBlankForm).map(item=>item.id)),operations=[];
  for(const id of removed)operations.push({action:'delete',store:'items',id});
  const occupied=new Set();
  for(const item of snapshot.items||[]){
    if(removed.has(item.id))continue;occupied.add(item.folderId);
    if(Array.isArray(item.linkedItemIds)){const links=item.linkedItemIds.filter(id=>!removed.has(id));if(links.length!==item.linkedItemIds.length){operations.push({action:'put',store:'items',record:{...item,linkedItemIds:links}});summary.updatedLinks++;}}
  }
  for(const entry of snapshot.activity||[])if(removed.has(entry.itemId)){operations.push({action:'delete',store:'activity',id:entry.id});summary.removedActivity++;}
  // Retire generated empty containers, leaving personal folders and trash paths.
  const folders=(snapshot.folders||[]).filter(folder=>!folder.deletedAt),retired=new Set();let changed=true;
  while(changed){changed=false;for(const folder of folders){
    if(retired.has(folder.id)||!['library','memo','personal','command','template'].includes(folder.section)||!/^(?:tech-folder-|wg-memo-folder-)/.test(folder.id)||occupied.has(folder.id))continue;
    if(folders.some(child=>child.parentId===folder.id&&!retired.has(child.id)))continue;
    retired.add(folder.id);operations.push({action:'put',store:'folders',record:{...folder,deletedAt:stamp,formCleanupEmpty:true}});changed=true;
  }}
  summary.removedItems=removed.size;summary.emptyFolders=retired.size;
  operations.push({action:'put',store:'settings',record:{key:marker,value:1}});
  operations.push({action:'put',store:'settings',record:{key:'memo-form-cleanup-report',value:{at:stamp,...summary}}});
  return {operations,summary};
}
