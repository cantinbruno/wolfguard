'use strict';

const BASIC_COMMANDS_SETTING='basicCommandsVersion';
const BASIC_COMMANDS_VERSION=BASIC_COMMANDS_DATA.version;
const BASIC_RETIRED_CONTENTS=new Set(BASIC_COMMANDS_DATA.retiredContents.map(procedureCommandKey));
function isVersionOnlyCommand(item){return item.type==='command'&&BASIC_RETIRED_CONTENTS.has(procedureCommandKey(item.content))}
function enrichBasicCommandLibrary(data,stamp=now()){
  data.items??=[];data.folders??=[];data.settings??=[];
  let changed=false;
  // Old imports may reintroduce version-only commands even when the baseline marker is current.
  for(const item of data.items)if(!item.deletedAt&&isVersionOnlyCommand(item)){
    item.deletedAt=stamp;item.updatedAt=stamp;item.basicCommandRetired='version-only';changed=true;
  }
  const marker=data.settings.find(record=>record.key===BASIC_COMMANDS_SETTING);
  if(!(Number(marker?.value)>=BASIC_COMMANDS_VERSION)){
    const occupied=new Set([...data.items,...data.folders].map(record=>record.id));
    const names=new Map(data.folders.map(folder=>[folder.id,folder.name]));
    const existing=new Set(data.items.filter(item=>item.type==='command').map(item=>procedureTitleKey(names.get(item.folderId))+'\0'+procedureCommandKey(item.content)));
    const identities=new Set(data.items.map(item=>item.basicCommandId).filter(Boolean)),folders=new Map();
    const uniqueId=preferred=>{let id=preferred;while(occupied.has(id))id=uid();occupied.add(id);return id};
    for(const row of BASIC_COMMANDS_DATA.commands){
      const {tech,...fields}=row,name=BASIC_COMMANDS_DATA.technologies[tech].name,key=procedureTitleKey(name)+'\0'+procedureCommandKey(row.content);
      if(identities.has(row.basicCommandId)||existing.has(key))continue;
      if(!folders.has(tech)){
        let folder=data.folders.find(record=>record.section==='command'&&!record.deletedAt&&!record.parentId&&procedureTitleKey(record.name)===procedureTitleKey(name));
        if(!folder){folder={id:uniqueId('basic-folder-'+tech),section:'command',name,parentId:null,createdAt:stamp,updatedAt:stamp};data.folders.push(folder)}
        folders.set(tech,folder);
      }
      data.items.push({...structuredClone(fields),id:uniqueId(row.id),folderId:folders.get(tech).id,createdAt:stamp,updatedAt:stamp});
      existing.add(key);identities.add(row.basicCommandId);changed=true;
    }
    if(marker)marker.value=BASIC_COMMANDS_VERSION;else data.settings.push({key:BASIC_COMMANDS_SETTING,value:BASIC_COMMANDS_VERSION});
    changed=true;
  }
  if(changed)data.updatedAt=stamp;
  return data;
}
async function enrichLocalBasicCommands(){
  return new Promise((resolve,reject)=>{
    const stores=['items','folders','settings'],transaction=db.transaction(stores,'readwrite'),records={};let failure,changed=false;
    transaction.oncomplete=()=>{if(changed){window.workspaceSearch?.invalidate();if(!portableBusy)schedulePortableSave()}resolve(changed)};
    transaction.onerror=transaction.onabort=()=>reject(failure||transaction.error||new Error('Mise a jour des commandes interrompue'));
    const merge=()=>{
      if(stores.some(store=>!records[store])||!records.items.length)return;
      try{
        const payload=enrichBasicCommandLibrary(structuredClone(records));
        for(const store of stores){
          const previous=new Map(records[store].map(record=>[record.id||record.key,JSON.stringify(record)]));
          for(const record of payload[store])if(previous.get(record.id||record.key)!==JSON.stringify(record)){transaction.objectStore(store).put(record);changed=true}
        }
      }catch(error){failure=error;transaction.abort()}
    };
    for(const store of stores){const request=transaction.objectStore(store).getAll();request.onsuccess=()=>{records[store]=request.result;merge()}}
  });
}
