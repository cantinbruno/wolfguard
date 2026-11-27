'use strict';

// Settings → Journal: connections, failed codes, IP blocks and server errors of
// the last 30 days. Reserved to administrators; the server enforces it too.
const workspaceJournal=(()=>{
  const LABELS={
    'login':'Connexion','login-failed':'Code ou OTP incorrect','logout':'Déconnexion',
    'ip-blocked':'Adresse IP bloquée','ip-unblocked':'Adresse IP débloquée',
    'session-revoked':'Session déconnectée','error':'Erreur du serveur'
  };
  const LEVELS={info:'Information',warning:'Avertissement',error:'Erreur'};
  let generation=0,controller=null,mountedRoot=null;
  function unmount(){generation++;controller?.abort();controller=null;mountedRoot?.replaceChildren();mountedRoot=null;}
  function describe(event){
    const d=event.details||{},parts=[];
    if(d.user)parts.push(d.user);
    if(d.by)parts.push('par '+d.by);
    if(d.ip)parts.push('IP '+d.ip);
    if(Number.isSafeInteger(d.failures))parts.push(d.failures+' échec'+(d.failures>1?'s':'')+' de suite');
    if(Number.isSafeInteger(d.disconnected)&&d.disconnected)parts.push(d.disconnected+' session'+(d.disconnected>1?'s':'')+' fermée'+(d.disconnected>1?'s':''));
    if(d.reference)parts.push('référence '+d.reference);
    if(d.path)parts.push(d.path);
    return parts.join(' · ');
  }
  function mount(root){
    unmount();mountedRoot=root;const token=generation;controller=new AbortController();const signal=controller.signal;
    const live=()=>generation===token&&root.isConnected;
    const cloud=typeof WolfGuardCloud==='undefined'?null:WolfGuardCloud;
    let kind='',events=[],done=false,busy=false;
    root.innerHTML='<header class="settings-panel-head"><div class="settings-heading">'+settingsIcon('history')+'<h3>Journal</h3></div>'
      +'<button type="button" class="settings-btn settings-btn-icon" id="wgJournalRefresh" aria-label="Actualiser le journal" title="Actualiser le journal">'+settingsIcon('refresh-cw')+'</button></header>'
      +'<p class="access-intro">Connexions, codes incorrects, blocages d’adresses et erreurs du serveur. Les événements sont supprimés automatiquement après 30 jours.</p>'
      +'<label class="reputation-search" for="wgJournalKind">Type d’événement<select id="wgJournalKind"><option value="">Tous</option>'
      +Object.entries(LABELS).map(([value,label])=>'<option value="'+value+'">'+esc(label)+'</option>').join('')+'</select></label>'
      +'<p class="access-error" id="wgJournalError" role="alert"></p><div class="access-list" id="wgJournalList" aria-live="polite"></div>'
      +'<div class="reputation-pagination"><span id="wgJournalCount"></span><button type="button" class="settings-btn" id="wgJournalMore" hidden>Plus ancien</button></div>';
    const find=selector=>root.querySelector(selector);
    function render(){
      const list=find('#wgJournalList');list.replaceChildren();
      if(!events.length){const empty=document.createElement('p');empty.className='access-empty';empty.textContent=busy?'Chargement…':'Aucun événement sur cette période.';list.append(empty);}
      for(const event of events){
        const card=document.createElement('article');card.className='access-card';
        const head=document.createElement('div');head.className='access-card-heading';
        const title=document.createElement('strong');title.textContent=LABELS[event.kind]||event.kind;
        const level=document.createElement('span');level.className='access-badge';level.textContent=LEVELS[event.level]||event.level;
        if(event.level!=='info')level.classList.add('access-danger');
        const when=document.createElement('span');when.className='access-presence';when.textContent=new Date(event.createdAt).toLocaleString('fr-FR');
        head.append(title,level,when);
        const details=document.createElement('p');details.className='access-details';details.textContent=describe(event)||'—';
        card.append(head,details);list.append(card);
      }
      find('#wgJournalCount').textContent=events.length?events.length+' événement'+(events.length>1?'s':'')+' affiché'+(events.length>1?'s':''):'';
      find('#wgJournalMore').hidden=done||!events.length;
    }
    async function load(more=false){
      if(busy||!cloud?.enabled||!cloud.hasSession())return;
      busy=true;find('#wgJournalError').textContent='';if(!more){events=[];done=false;}render();
      const params=[];if(more&&events.length)params.push('before='+events[events.length-1].createdAt);if(kind)params.push('kind='+kind);
      try{
        const result=await cloud.agentRequest('logs'+(params.length?'?'+params.join('&'):''),undefined,{signal});
        if(!live())return;
        events=more?events.concat(result.events):result.events;done=result.events.length<100;
      }catch(error){if(!live()||error.name==='AbortError')return;find('#wgJournalError').textContent=error.message||'Journal indisponible.';}
      finally{if(live()){busy=false;render();}}
    }
    find('#wgJournalRefresh').addEventListener('click',()=>load());
    find('#wgJournalMore').addEventListener('click',()=>load(true));
    find('#wgJournalKind').addEventListener('change',event=>{kind=event.target.value;load();});
    load();
  }
  return {mount,unmount};
})();
