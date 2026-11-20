'use strict';

window.WolfGuardFleetGroups=(()=>{
  const key='agents-custom-groups',validId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
  function normalize(value){
    const used=new Set(),groups=[];
    for(const row of Array.isArray(value?.groups)?value.groups:[]){
      if(groups.length>=50)break;
      if(!row||!validId(row.id)||row.id==='ungrouped'||used.has(row.id)||typeof row.name!=='string')continue;
      const name=row.name.trim().slice(0,60);if(!name)continue;used.add(row.id);groups.push({id:row.id,name});
    }
    const assignments=Object.fromEntries(Object.entries(value?.assignments&&typeof value.assignments==='object'?value.assignments:{}).filter(([id,group])=>validId(id)&&used.has(group)).slice(0,2000));
    const collapsed=[...new Set(Array.isArray(value?.collapsed)?value.collapsed:[])].filter(id=>used.has(id)||id==='ungrouped');
    return {version:1,groups,assignments,collapsed,view:value?.view==='flat'?'flat':'groups'};
  }
  function readPreference(){
    let fallback=null;
    try{const cloud=window.WolfGuardCloud;if(cloud?.enabled&&!cloud.isAdmin())fallback=JSON.parse(sessionStorage.getItem('wolfguard-pref:'+cloud.currentUser().id+':'+key)||'null');}catch{}
    return setting(key,fallback);
  }
  function create({read=readPreference,write=value=>setSetting(key,value)}={}){
    let data=normalize(null),busy=false;
    async function change(fn){
      if(busy)throw new Error('Enregistrement des groupes en cours.');busy=true;
      try{const next=structuredClone(data),result=fn(next);await write(next);data=normalize(next);return result;}finally{busy=false;}
    }
    function nameOf(value,id){
      const name=String(value||'').trim();if(!name||name.length>60)throw new Error('Choisis un nom de groupe de 1 à 60 caractères.');
      if(data.groups.some(row=>row.id!==id&&row.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('Un groupe porte déjà ce nom.');return name;
    }
    return {
      async load(){data=normalize(await read());},
      list:()=>structuredClone(data.groups),
      name:id=>data.groups.find(row=>row.id===id)?.name||'Sans groupe',
      groupOf:id=>data.assignments[id]||'ungrouped',
      closed:id=>data.collapsed.includes(id),
      view:()=>data.view,
      setView:view=>change(next=>{next.view=view==='flat'?'flat':'groups';}),
      buckets:rows=>[...data.groups,{id:'ungrouped',name:'Sans groupe'}].map(group=>({...group,rows:rows.filter(row=>(data.assignments[row.id]||'ungrouped')===group.id)})),
      add(value,ids=[]){const name=nameOf(value),id='group-'+crypto.randomUUID();if(data.groups.length>=50)return Promise.reject(new Error('La limite de 50 groupes est atteinte.'));return change(next=>{next.groups.push({id,name});for(const agent of ids)if(validId(agent))next.assignments[agent]=id;return id;});},
      rename(id,value){const name=nameOf(value,id);return change(next=>{const group=next.groups.find(row=>row.id===id);if(!group)throw new Error('Groupe introuvable.');group.name=name;});},
      remove(id){return change(next=>{if(!next.groups.some(row=>row.id===id))throw new Error('Groupe introuvable.');next.groups=next.groups.filter(row=>row.id!==id);next.assignments=Object.fromEntries(Object.entries(next.assignments).filter(([,group])=>group!==id));next.collapsed=next.collapsed.filter(group=>group!==id);});},
      assign(ids,id){return change(next=>{if(id!=='ungrouped'&&!next.groups.some(row=>row.id===id))throw new Error('Groupe introuvable.');for(const agent of ids){if(!validId(agent))continue;if(id==='ungrouped')delete next.assignments[agent];else next.assignments[agent]=id;}});},
      toggle(id){return change(next=>{if(id!=='ungrouped'&&!next.groups.some(row=>row.id===id))throw new Error('Groupe introuvable.');next.collapsed=next.collapsed.includes(id)?next.collapsed.filter(group=>group!==id):[...next.collapsed,id];});}
    };
  }
  return {create,normalize};
})();
