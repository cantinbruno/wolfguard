'use strict';
window.WolfGuardAccess=(()=>{
  const cloud=()=>typeof WolfGuardCloud==='undefined'?null:WolfGuardCloud;
  const user=()=>cloud()?.currentUser();
  const restricted=()=>!!(cloud()?.enabled&&cloud()?.hasUsers()&&user()?.role!=='admin');
  const can=key=>!cloud()?.enabled||!cloud()?.hasUsers()||WolfGuardPermissions.can(user(),key);
  const sectionKey=section=>section==='vault'?'vault.read':section==='remote'?'remote':section.startsWith('scan-')?'scan.'+section.slice(5)+'.read':section==='tools'?'tools.use':'library.read';
  function allows(section){if(section==='modules')return true;if(section==='edr')return can('agents.read')&&can('scan.vulnerability.read');if(section==='chatbot')return can('ai.use');const key=sectionKey(section);return key==='remote'?can('remote.desktop')||can('remote.terminal'):can(key);}
  const level=(record,kind,folders)=>!restricted()?'write':WolfGuardPermissions.recordLevel(user(),record,kind,folders);
  const action=(record,verb,kind='items',folders=[])=>can(WolfGuardPermissions.recordSection(record,kind)+'.'+verb)&&(verb==='read'?level(record,kind,folders)!=='deny':level(record,kind,folders)==='write');
  const reject=()=>{const error=new Error('Ton compte ne dispose pas du droit nécessaire pour cette action.');error.code='PERMISSION_DENIED';throw error;};
  function assertChanges(before,after){
    if(!restricted())return;
    for(const kind of ['folders','items']){
      const old=new Map(before[kind].map(row=>[row.id,row])),next=new Map(after[kind].map(row=>[row.id,row]));
      for(const id of new Set([...old.keys(),...next.keys()])){
        const a=old.get(id),b=next.get(id);if(WolfGuardSharedWorkspace.sameValue(a,b))continue;
        const verb=!a?'create':!b||!!a.deletedAt!==!!b.deletedAt?'delete':'edit';
        if(a&&!action(a,verb,kind,before.folders)||b&&!action(b,verb,kind,after.folders))reject();
        if(kind==='items'&&b?.type==='vault'&&!can('vault.secrets')&&['vaultBlobEnc','passwordEnc','password','username','url','notes','custom','host'].some(field=>!WolfGuardSharedWorkspace.sameValue(a?.[field],b[field])))reject();
      }
    }
  }
  const clickRules={newMemo:'library.create',newItem:'library.create',newProcedure:'library.create',newVault:'vault.create',saveVault:'vault.edit',saveMemo:'library.edit',exportScanPDF:'scan-export',exportScanJSON:'scan-export',generatePairing:'agents.pair'};
  function paint(){
    if(!cloud()?.hasSession())return;
    const agentsButton=document.querySelector('#agentsBtn');if(agentsButton)agentsButton.hidden=!can('agents.read');
    const current=state.section==='vault'?'vault':'library';
    for(const button of document.querySelectorAll('[data-wg-click]')){
      const expression=button.getAttribute('data-wg-click')||'',name=/^([\w.]+)\(/.exec(expression)?.[1];let key=clickRules[name];
      if(name==='newFolder')key=current+'.create';
      if(['deleteItem','deleteFolderDirect'].includes(name))key=current+'.delete';
      if(['setMode','editItemById','toggleFavorite','duplicateItem'].includes(name)&&(!expression.includes("'view'")&&name!=='duplicateItem'))key=current+'.edit';
      if(name==='duplicateItem')key=current+'.create';
      if(key==='scan-export')key='scan.'+(state.section?.slice(5)||'passive')+'.export';
      if(key&&!can(key)){if(button.dataset.permissionDisabled!=='1'){button.dataset.permissionDisabled='1';button.dataset.permissionWasDisabled=String(!!button.disabled);button.disabled=true;button.title='Droit non accordé : '+key;}}
      else if(button.dataset.permissionDisabled==='1'){button.disabled=button.dataset.permissionWasDisabled==='true';delete button.dataset.permissionDisabled;delete button.dataset.permissionWasDisabled;}
    }
    document.documentElement.dataset.restricted=restricted()?'true':'false';
  }
  let scheduled=false;const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;paint();});};
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  let expiryTimer=0,expiryUser=null,expiryAt=null;
  function watchExpiry(){
    clearTimeout(expiryTimer);const current=user(),expiry=current?.role!=='admin'?current?.permissions?.expiresAt:null;
    if(expiry&&expiry<=Date.now()){if(expiryUser===current.id&&expiryAt===expiry&&!document.querySelector('#app')?.classList.contains('hidden'))lockApplication();expiryAt=null;return;}
    expiryUser=current?.id;expiryAt=expiry;
    if(expiry)expiryTimer=setTimeout(()=>{if(user()?.id===expiryUser&&Date.now()>=expiry)lockApplication();else watchExpiry();},Math.min(2147483647,expiry-Date.now()+25));
  }
  window.addEventListener('wolfguard-user-changed',()=>{topNavigation.refresh?.();watchExpiry();schedule();});
  return Object.freeze({can,allows,restricted,level,action,assertChanges,reject,paint});
})();
