'use strict';

const PROCEDURE_CATALOG_SETTING='procedureCatalogVersion';
const PROCEDURE_CATALOG_VERSION=PROCEDURE_CATALOG_DATA.version;
function procedureTitleKey(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim().toLowerCase();
}
function procedureCommandKey(value){
  return String(value||'').replace(/\r\n/g,'\n').split('\n').map(line=>line.trim()).join('\n').trim();
}
function enrichProcedureLibrary(data,stamp=now()){
  data.items??=[];data.folders??=[];data.settings??=[];
  const marker=data.settings.find(record=>record.key===PROCEDURE_CATALOG_SETTING);
  if(Number(marker?.value)>=PROCEDURE_CATALOG_VERSION)return data;
  const ids=new Set([...data.items,...data.folders].map(record=>record.id)),folderNames=new Map(data.folders.map(folder=>[folder.id,folder.name]));
  const documents=new Map(data.items.filter(item=>['memo','procedure'].includes(item.type)).map(item=>[procedureTitleKey(item.title),item]));
  const commands=new Map(data.items.filter(item=>item.type==='command').map(item=>[procedureTitleKey(folderNames.get(item.folderId))+'\0'+procedureCommandKey(item.content),item]));
  const catalogIds=new Map(data.items.filter(item=>item.procedureCatalogId).map(item=>[item.procedureCatalogId,item])),folders=new Map(),commandIds=new Map();
  const uniqueId=preferred=>{const id=ids.has(preferred)?uid():preferred;ids.add(id);return id};
  const folderFor=(tech,section)=>{
    const [name]=PROCEDURE_CATALOG_DATA.technologies[tech],key=section+'\0'+name;
    if(folders.has(key))return folders.get(key);
    let folder=data.folders.find(record=>record.section===section&&!record.deletedAt&&!record.parentId&&procedureTitleKey(record.name)===procedureTitleKey(name));
    if(!folder){folder={id:uniqueId('procedure-folder-'+tech+'-'+section),section,name,parentId:null,createdAt:stamp,updatedAt:stamp};data.folders.push(folder)}
    folders.set(key,folder);return folder;
  };
  // Tombstones and stable catalog identities also prevent reintroducing renamed or deleted user records.
  for(const row of [...PROCEDURE_CATALOG_DATA.commands,...PROCEDURE_CATALOG_DATA.documents]){
    const {slug,tech,commandSlugs,warning,impact,...fields}=row,isCommand=!commandSlugs;
    const [folderName,vendor,platform]=PROCEDURE_CATALOG_DATA.technologies[tech],catalogId=(isCommand?'command:':'document:')+slug;
    const key=isCommand?procedureTitleKey(folderName)+'\0'+procedureCommandKey(row.content):procedureTitleKey(row.title);
    const existing=catalogIds.get(catalogId)||(isCommand?commands:documents).get(key);
    if(existing){if(isCommand&&!existing.deletedAt)commandIds.set(slug,existing.id);continue}
    const record={...structuredClone(fields),id:uniqueId('procedure-'+(isCommand?'command-':'document-')+slug),type:isCommand?'command':row.type,
      procedureCatalogId:catalogId,folderId:folderFor(tech,isCommand?'command':'memo').id,vendor,platform,tags:[tech,'procedure-locale',isCommand?'commande':'procedure'],
      quality:{reviewedAt:PROCEDURE_CATALOG_DATA.reviewedAt,validation:'adaptation-source-locale',impact:impact||'R\u00e9f\u00e9rence'},favorite:false,viewCount:0,attachments:[],createdAt:stamp,updatedAt:stamp};
    if(isCommand){
      record.context=platform+'. Impact : '+impact+'. '+warning+' Remplacer les param\u00e8tres entre chevrons. Origine locale : '+row.sourceDocuments.map(source=>source.relativePath).join('; ')+'. Syntaxe \u00e0 confirmer sur la version install\u00e9e ; commande non ex\u00e9cut\u00e9e sur l\u2019infrastructure.';
      commandIds.set(slug,record.id);commands.set(key,record);
    }else{
      record.linkedItemIds=[...new Set(commandSlugs.map(command=>commandIds.get(command)).filter(Boolean))];documents.set(key,record);
    }
    data.items.push(record);
  }
  if(marker)marker.value=PROCEDURE_CATALOG_VERSION;else data.settings.push({key:PROCEDURE_CATALOG_SETTING,value:PROCEDURE_CATALOG_VERSION});
  data.updatedAt=stamp;return data;
}
async function enrichLocalProcedureLibrary(){
  return new Promise((resolve,reject)=>{
    const stores=['items','folders','settings'],transaction=db.transaction(stores,'readwrite'),records={};let failure,changed=false;
    transaction.oncomplete=()=>{if(changed){window.workspaceSearch?.invalidate();if(!portableBusy)schedulePortableSave()}resolve(changed)};
    transaction.onerror=transaction.onabort=()=>reject(failure||transaction.error||new Error('Import des proc\u00e9dures interrompu'));
    const merge=()=>{
      if(stores.some(store=>!records[store])||!records.items.length)return;
      try{
        const payload=enrichProcedureLibrary(structuredClone(records));
        for(const store of stores){
          const previous=new Map(records[store].map(record=>[record.id||record.key,JSON.stringify(record)]));
          for(const record of payload[store])if(previous.get(record.id||record.key)!==JSON.stringify(record)){transaction.objectStore(store).put(record);changed=true}
        }
      }catch(error){failure=error;transaction.abort()}
    };
    for(const store of stores){const request=transaction.objectStore(store).getAll();request.onsuccess=()=>{records[store]=request.result;merge()}}
  });
}
