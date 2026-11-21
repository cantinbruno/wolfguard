'use strict';

window.WolfGuardFleetGroups=(()=>{
  const key='agents-custom-groups',validId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
  function normalize(value){
    const used=new Set(),groups=[];
    for(const row of Array.isArray(value?.groups)?value.groups:[]){
      if(groups.length>=250)break;
      if(!row||!validId(row.id)||row.id==='ungrouped'||used.has(row.id)||typeof row.name!=='string')continue;
      const name=row.name.trim().slice(0,60);if(!name)continue;used.add(row.id);groups.push({id:row.id,name,...(/^#[a-f0-9]{6}$/i.test(row.color||'')?{color:row.color}:{})});
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
  function create({read=readPreference,write=value=>setSetting(key,value),request=(path,body)=>WolfGuardCloud.agentRequest('agents/groups'+path,body)}={}){
    let data=normalize(null),busy=false,revision=0,manage=false,initialized=false,loading=null,epoch=0;
    function accept(snapshot){revision=snapshot.revision;manage=snapshot.canManage;initialized=snapshot.initialized;data=normalize({...data,groups:snapshot.groups,assignments:snapshot.assignments});}
    async function remote(action,payload={}){
      if(busy)throw new Error('Enregistrement des sections en cours.');
      if(!manage||!initialized)throw new Error('La gestion des sections est réservée aux administrateurs.');
      busy=true;epoch++;try{accept(await request('/'+action,{...payload,revision}));}finally{busy=false;}
    }
    async function preference(fn){const next=structuredClone(data);fn(next);await write(next);data={...data,collapsed:next.collapsed,view:next.view};}
    const api={
      async load(){
        if(loading)return loading;
        const run=epoch;
        loading=(async()=>{const legacy=await read();let snapshot=await request('');if(!snapshot.initialized&&WolfGuardCloud.isAdmin())snapshot=await request('/bootstrap',{legacy});if(run!==epoch||busy)return;if(!initialized)data=normalize(legacy);if(snapshot.revision>=revision)accept(snapshot);})().finally(()=>{loading=null;});
        return loading;
      },
      canManage:()=>manage&&initialized,
      list:()=>structuredClone(data.groups),
      name:id=>data.groups.find(row=>row.id===id)?.name||'Sans section',
      groupOf:id=>data.assignments[id]||'ungrouped',
      closed:id=>data.collapsed.includes(id),view:()=>data.view,
      setView:view=>preference(next=>{next.view=view==='flat'?'flat':'groups';}),
      buckets:rows=>[...data.groups,{id:'ungrouped',name:'Sans section'}].map(group=>({...group,rows:rows.filter(row=>(data.assignments[row.id]||'ungrouped')===group.id)})),
      add:(name,ids=[])=>remote('create',{name,ids}),
      duplicate:(id,name)=>remote('duplicate',{id,name}),
      rename:(id,name)=>remote('rename',{id,name}),remove:id=>remote('remove',{id}),
      color:(id,color)=>remote('color',{id,color}),
      assign:(ids,target)=>remote('move',{ids,target}),
      toggle:id=>preference(next=>{next.collapsed=next.collapsed.includes(id)?next.collapsed.filter(group=>group!==id):[...next.collapsed,id];}),
      expandAll:()=>preference(next=>{next.collapsed=[];}),
      collapseAll:()=>preference(next=>{next.collapsed=[...next.groups.map(group=>group.id),'ungrouped'];})
    };return api;
  }
  return {create,normalize};
})();
