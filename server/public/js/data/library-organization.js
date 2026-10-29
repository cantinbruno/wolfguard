'use strict';

// A folder-only, repeatable migration. Document bodies and vault records are
// deliberately excluded. The caller commits the plan as one encrypted snapshot.
function buildMemoFolderOrganization(snapshot, stamp = new Date().toISOString()) {
  const versionKey='memo-folder-organization-version';
  const empty={operations:[],summary:{movedItems:0,mergedFolders:0,updatedFolders:0,emptyFolders:0}};
  if(snapshot.settings?.some(row=>row.key===versionKey && Number(row.value)>=2))return empty;
  const sections=new Set(['library','memo','personal','command','template']);
  const types=new Set(['memo','procedure','personal','command','mail','report','template']);
  const active=record=>!record.deletedAt;
  const key=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLocaleLowerCase('fr');
  const unnumber=value=>String(value||'').replace(/^\s*\d{1,2}\s*[·.:\-–—]\s*/,'').trim();
  const roots=['01 · Réseaux','02 · Systèmes','03 · Identité et accès','04 · Sécurité','05 · Virtualisation','06 · Cloud et DevOps','07 · Données et stockage','08 · Supervision','09 · Collaboration','10 · Support et exploitation','99 · Archives et anciennes versions'];
  const rootAliases=new Map([
    ['reseau',[0]],['reseaux',[0]],['systemes',[1]],['identite et acces',[2]],['identites et acces',[2]],
    ['securite',[3]],['securite et identite',[3]],['virtualisation',[4]],['cloud et devops',[5]],
    ['donnees et stockage',[6]],['sauvegarde et reprise',[6,'Sauvegarde et restauration']],
    ['sauvegarde et restauration',[6,'Sauvegarde et restauration']],['supervision',[7]],['collaboration',[8]],
    ['support et exploitation',[9]],['support',[9,'Support utilisateurs']],['exploitation',[9,'Exploitation']],
    ['documentation',[9,'Documentation']],['archives et anciennes versions',[10]]
  ]);
  function targetPath(names){
    const first=key(unnumber(names[0])),alias=rootAliases.get(first);
    if(!alias)return {names,recognized:false};
    let path=[roots[alias[0]],...alias.slice(1),...names.slice(1)];
    const second=key(names[1]);
    if(first==='securite et identite'){
      if(['acces','active directory','microsoft entra id','ldap','cisco ise et aaa','identity collector','strategies de groupe'].includes(second))path=[roots[2],...(second==='acces'?['Gestion des accès']:names.slice(1))];
      else if(second==='certificats')path=[roots[3],'TLS et certificats',...names.slice(2)];
      else if(second==='audits')path=[roots[3],'Audit autorisé',...names.slice(2)];
      else if(second==='incidents')path=[roots[3],'Réponse aux incidents',...names.slice(2)];
    }
    if(first==='documentation' && second==='bases de donnees')path=[roots[6],'Bases de données',...names.slice(2)];
    if(first==='support' && second==='messagerie')path=[roots[8],'Messagerie',...names.slice(2)];
    if(alias[0]===0 && second==="controle d'acces")path=[roots[0],'Contrôle d’accès au réseau',...names.slice(2)];
    if(alias[0]===5){
      if(['ansible','terraform'].includes(second))path=[roots[5],'Infrastructure en code',...names.slice(1)];
      else if(['kubernetes','docker'].includes(second))path=[roots[5],'Conteneurs',...names.slice(1)];
      else if(second==='infrastructure')path=[roots[5],'Infrastructure en code',...names.slice(2)];
      else if(second==='revue de code')path=[roots[5],'Git et collaboration',...names.slice(1)];
    }
    if(alias[0]===3){
      if(second==='chiffrement')path=[roots[3],'Chiffrement des postes',...names.slice(2)];
      else if(second==='conteneurs')path=[roots[3],'Conteneurs et chaîne logicielle',...names.slice(2)];
    }
    // Retire the old 09/10 catch-all roots and classify their useful documents
    // under the existing eight technical themes instead.
    if(path[0]===roots[8]){
      const subject=key(path[1]);
      if(subject==='microsoft 365')path=[roots[5],...path.slice(1)];
      else if(subject==='telephonie')path=[roots[0],...path.slice(1)];
      else if(subject==='messagerie')path=[roots[1],...path.slice(1)];
      else path=[roots[5],'Collaboration',...path.slice(1)];
    }
    if(path[0]===roots[9]){
      const subject=key(path[1]),detail=key(path[2]);
      if(['applications et deploiement','navigateurs','impression'].includes(subject))path=[roots[1],...path.slice(1)];
      else if(subject==='documentation'){
        if(detail==='inventaire')path=[roots[7],...path.slice(2)];
        else if(detail==='procedures')path=[roots[7],'Exploitation',...path.slice(2)];
        else path=[roots[5],'Documentation et projets',...path.slice(2)];
      }else if(subject==='collecte et restitution')path=[roots[7],'Diagnostic',...path.slice(1)];
      else if(subject==='exploitation')path=[roots[7],...path.slice(1)];
      else path=[roots[7],'Exploitation',...path.slice(1)];
    }
    return {names:path,recognized:true};
  }
  const folders=snapshot.folders||[],items=snapshot.items||[],byId=new Map(folders.map(row=>[row.id,row]));
  // A misplaced vault/task link must not be changed by a memo migration.
  const protectedIds=new Set(items.filter(item=>!types.has(item.type)).map(item=>item.folderId));
  const candidates=folders.filter(folder=>active(folder)&&sections.has(folder.section)&&!protectedIds.has(folder.id));
  const eligible=new Map(candidates.map(row=>[row.id,row])),paths=new Map(),targets=new Map(),groups=new Map();
  const pathKey=names=>JSON.stringify(names.map(key));
  function originalPath(folder,seen=new Set()){
    if(paths.has(folder.id))return paths.get(folder.id);
    if(seen.has(folder.id))throw new Error('Cycle dans les dossiers : rangement annulé.');
    seen.add(folder.id);
    const parent=eligible.get(folder.parentId);
    // Keep folders beneath a protected or foreign-section parent in place.
    if(!parent && byId.has(folder.parentId))return null;
    const prefix=parent?originalPath(parent,seen):[];
    if(prefix===null)return null;
    const names=[...prefix,String(folder.name||'Sans nom').trim().replace(/\s+/g,' ')];paths.set(folder.id,names);return names;
  }
  let recognized=false;
  for(const folder of candidates){
    const original=originalPath(folder);if(!original)continue;
    const target=targetPath(original);recognized ||= target.recognized;targets.set(folder.id,target.names);
    const groupKey=pathKey(target.names);if(!groups.has(groupKey))groups.set(groupKey,{names:target.names,folders:[]});groups.get(groupKey).folders.push(folder);
  }
  if(!recognized)return empty;
  // Add missing parents, without generating unused thematic roots.
  for(const group of [...groups.values()])for(let length=1;length<group.names.length;length++){
    const names=group.names.slice(0,length),id=pathKey(names);if(!groups.has(id))groups.set(id,{names,folders:[]});
  }
  const ordered=[...groups.entries()].sort(([a,x],[b,y])=>x.names.length-y.names.length||a.localeCompare(b,'fr'));
  const usedIds=new Set(folders.map(row=>row.id)),canonical=new Map(),redirects=new Map(),planned=new Map();
  const summary={movedItems:0,mergedFolders:0,updatedFolders:0,emptyFolders:0};
  function newId(path){
    let hash=2166136261;for(let i=0;i<path.length;i++)hash=Math.imul(hash^path.charCodeAt(i),16777619)>>>0;
    const base='wg-memo-folder-'+hash.toString(16).padStart(8,'0');let id=base,n=0;while(usedIds.has(id))id=base+'-'+(++n);usedIds.add(id);return id;
  }
  for(const [groupKey,group] of ordered){
    group.folders.sort((a,b)=>Number(pathKey(paths.get(b.id))===groupKey)-Number(pathKey(paths.get(a.id))===groupKey)||Number(b.section==='library')-Number(a.section==='library')||a.id.localeCompare(b.id));
    const source=group.folders[0],id=source?.id||newId(groupKey);
    const record={...(source||{id,createdAt:stamp}),name:group.names.at(-1),section:'library',parentId:group.names.length>1?canonical.get(pathKey(group.names.slice(0,-1))):null};
    if(!source || source.name!==record.name || source.parentId!==record.parentId || source.section!=='library')record.updatedAt=stamp;
    canonical.set(groupKey,id);planned.set(id,record);
    for(const folder of group.folders)redirects.set(folder.id,id);
  }
  const itemOperations=[];
  function redirected(id){const seen=new Set();while(id&&!seen.has(id)){seen.add(id);if(redirects.has(id))return redirects.get(id);const old=byId.get(id);if(!old?.mergedInto)break;id=old.mergedInto;}return null;}
  const occupied=new Set();
  for(const item of items){
    const target=types.has(item.type)?redirected(item.folderId):null;
    // Trashed notes can be restored later, so their destination must survive.
    const folderId=target||item.folderId;occupied.add(folderId);
    if(target && target!==item.folderId){itemOperations.push({action:'put',store:'items',record:{...item,folderId:target}});summary.movedItems++;}
  }
  // Only retire empty folders supplied by the bundled technical library.
  // User-created empty folders remain available for future notes.
  for(const [,group] of [...ordered].reverse()){
    const id=canonical.get(pathKey(group.names)),folder=planned.get(id);
    if(/^(?:tech-folder-|wg-memo-folder-)/.test(folder.id)&&!occupied.has(id)&&![...planned.values()].some(child=>!child.deletedAt&&child.parentId===id)){
      planned.set(id,{...folder,deletedAt:stamp,organizationEmpty:true});summary.emptyFolders++;
    }
  }
  const operations=[];
  for(const [id,target] of redirects)if(id!==target){
    const folder=eligible.get(id);planned.set(id,{...folder,deletedAt:stamp,mergedInto:target});summary.mergedFolders++;
  }
  for(const [id,record] of planned){
    const previous=byId.get(id);if(JSON.stringify(previous)!==JSON.stringify(record)){operations.push({action:'put',store:'folders',record});summary.updatedFolders++;}
  }
  operations.push(...itemOperations);
  operations.push({action:'put',store:'settings',record:{key:versionKey,value:2}});
  operations.push({action:'put',store:'settings',record:{key:'memo-folder-organization-report',value:{at:stamp,...summary}}});
  return {operations,summary};
}
