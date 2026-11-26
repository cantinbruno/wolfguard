'use strict';

window.WolfGuardAgentProtection=(()=>{
  const names={'av-install':'Installation du moteur','av-scan':'Analyse des disques','av-update':'Actualisation des signatures','av-pause':'Suspension de la surveillance','av-resume':'Activation de la surveillance',refresh:'Collecte de l’état'};
  const states={queued:'En attente du poste',running:'En cours',completed:'Confirmée par le poste',failed:'Échec signalé par le poste',expired:'Expirée',cancelled:'Annulée'};
  const time=value=>value?new Date(value).toLocaleString('fr-FR'):'Non renseigné';
  function create({signal,can,onRefresh}){
    let host=null,mode='protection',model=null,id=null,controller=null,revision=0,busy=false,confirming=false,draft=null,draftRevision=0,commands=[],last=0,loading=false,historyWork=null,historyStale=true,message='',error='',query='',submittedId=null;
    const active=()=>!signal.aborted&&id&&can('edr.read',model?.agent);
    const live=()=>active()&&host?.isConnected;
    const find=selector=>host?.querySelector(selector);
    const fresh=()=>active()&&!model.stale&&model.agent?.online&&model.endpoint?.online&&Date.now()-model.endpoint.receivedAt<120000&&Date.now()-model.endpoint.collectedAt<120000;
    const manage=()=>active()&&can('edr.manage',model.agent);
    const request=(path,value)=>WolfGuardCloud.agentRequest('edr'+path,value,{signal:AbortSignal.any([signal,controller.signal])});
    const actionName=action=>names[action]||(action.startsWith('av-restore:')?'Restauration du fichier':action.startsWith('av-delete:')?'Suppression de la copie':action);
    function close(){revision++;controller?.abort();controller=null;host=null;model=null;id=null;busy=false;confirming=false;draft=null;commands=[];last=0;loading=false;historyWork=null;historyStale=true;message='';error='';query='';submittedId=null;}
    function hide(){host=null;}
    async function beforeLeave(){
      if(busy||confirming){if(live()){error='Une action est en cours. Patientez un instant.';draw();}return false;}
      return !draft||await appConfirm('Quitter les modifications de protection non enregistrées ?', {title:'Politique du poste',confirmLabel:'Quitter sans enregistrer'});
    }
    function button(action,label,disabled=false,danger=false){return '<button type="button" class="settings-btn'+(danger?' agent-protection-danger':'')+'" data-protection-action="'+esc(action)+'" '+(!manage()||!fresh()||historyStale||busy||disabled?'disabled':'')+'>'+label+'</button>';}
    function draw(){
      if(!live())return;
      const oldFocus=host.contains(document.activeElement)?document.activeElement:null;
      const focusKey=oldFocus?.dataset.protectionAction||oldFocus?.dataset.protectionField,selection=typeof oldFocus?.selectionStart==='number'?[oldFocus.selectionStart,oldFocus.selectionEnd]:null;
      const opened=new Set([...host.querySelectorAll('details[open]')].map(node=>node.dataset.protectionDisclosure));
      const row=model.endpoint,av=row?.snapshot?.wolfguardAntivirus,known=fresh(),working=av&&['installing','updating','scanning'].includes(av.state);
      const queued=commands.some(command=>command.action.startsWith('av-')&&['queued','running'].includes(command.status));
      const pauseQueued=commands.some(command=>command.action==='av-pause'&&['queued','running'].includes(command.status));
      const label=!known?'État à confirmer':!av?'Agent à mettre à jour':({ready:'Surveillance active',paused:'Surveillance suspendue',missing:'Installation en attente',installing:'Installation en cours',updating:'Signatures en cours',scanning:'Analyse en cours',error:'Intervention nécessaire'})[av.state]||'État à confirmer';
      let html='<div class="agent-protection-feedback"><p role="status" data-protection-feedback>'+esc(message)+'</p><p role="alert" data-protection-error>'+esc(error)+'</p></div>';
      if(!known)html+='<p class="agent-record-notice">'+(model.stale?'Les relevés sont indisponibles. Les dernières informations ne sont plus confirmées.':'Un poste connecté et un relevé récent sont nécessaires pour envoyer une action.')+'</p>';
      if(mode==='quarantine'){
        const all=av?.quarantine||[],rows=all.filter(file=>!query||[file.path,file.threat].some(value=>String(value).toLocaleLowerCase().includes(query)));
        html+='<div class="agent-quarantine-intro"><p>Les fichiers isolés sont conservés sous forme chiffrée sur ce poste. Restaurer remet le fichier à son emplacement initial ; supprimer la copie est définitif.</p><span>'+all.length+' fichier(s) affiché(s)</span></div><label class="agent-quarantine-search">Rechercher un fichier<input type="search" data-protection-field="search" placeholder="Nom, chemin ou détection…" value="'+esc(query)+'"></label><div class="agent-quarantine-list">';
        html+=rows.map(file=>'<article class="agent-quarantine-file"><div class="agent-quarantine-file-heading"><span class="agent-protection-state" data-state="'+esc(file.status)+'">'+esc(({quarantined:'En quarantaine',detected:'Déplacement non confirmé',restored:'Restauré'})[file.status]||file.status)+'</span><time>'+esc(time(file.detectedAt))+'</time></div><h4>'+esc(file.threat)+'</h4><p class="agent-quarantine-path">'+esc(file.path)+'</p>'+(file.message?'<p>'+esc(file.message)+'</p>':'')+'<div class="agent-protection-actions">'+(manage()?button('av-restore:'+file.id,'Restaurer',working||queued||file.status==='restored')+button('av-delete:'+file.id,'Supprimer la copie',working||queued,true):'<span>Consultation uniquement</span>')+'</div></article>').join('');
        if(!rows.length)html+='<p class="agent-protection-empty">'+(!av?'Aucun relevé de quarantaine disponible.':all.length?'Aucun fichier ne correspond à votre recherche.':'Aucun fichier en quarantaine remonté par ce poste.')+'</p>';
        html+='</div>'+(av?.quarantineTotal>all.length?'<p class="agent-record-caption">Le relevé est limité : '+av.quarantineTotal+' entrée(s) sur le poste.</p>':'');
      }else{
        html+='<section class="agent-record-card agent-protection-engine"><header><h3>'+settingsIcon('shield-check')+'WolfGuard Antivirus</h3><span class="agent-protection-state" data-state="'+(!known?'unknown':av?.state||'unknown')+'">'+esc(label)+'</span></header><dl>'+[['Moteur',av?.installed?av.engineVersion||'ClamAV installé':av?'Non installé':'Non confirmé'],['Signatures',av?.signatureVersion||'Non renseignées'],['Signatures mises à jour',time(av?.signatureAt)],['Dernière analyse',time(av?.lastScanAt)],['Dernier passage',av?av.scannedFiles+' fichier(s) analysé(s)'+(av.errors?' · '+av.errors+' non confirmé(s)':''):'Non renseigné']].map(([name,value])=>'<div><dt>'+name+'</dt><dd>'+esc(String(value))+'</dd></div>').join('')+'</dl>';
        if(av?.message)html+='<p class="agent-protection-description">'+esc(av.message)+'</p>';
        if(av?.scope?.length)html+='<p class="agent-protection-description"><strong>Disques surveillés</strong> '+av.scope.map(path=>'<code>'+esc(path)+'</code>').join(' ')+'</p>';
        if(!av)html+='<p class="agent-protection-description">Mettez à jour l’agent pour disposer des commandes antivirus.</p>';
        else if(manage())html+='<div class="agent-protection-actions">'+(!av.installed?button('av-install','Réessayer l’installation',working||queued)+(working?button('av-pause','Annuler l’opération',pauseQueued):''):button('av-scan','Analyser les disques',working||queued)+button('av-update','Actualiser les signatures',working||queued)+button(av.enabled?'av-pause':'av-resume',av.enabled?'Suspendre la surveillance':'Activer la surveillance',av.enabled?pauseQueued:working||queued||row?.policy.mode==='observe'))+button('refresh','Collecter l’état',queued)+'</div>';
        html+='<p class="agent-record-caption">Analyse progressive des fichiers nouveaux ou modifiés, sans blocage avant ouverture. Les protections du système restent actives. Les signatures sont vérifiées chaque heure.</p></section>';
        const policy=draft||row?.policy||{mode:'protect',realtime:true,firewall:true},disabled=!manage()||!known||busy||!model.agent.capabilities?.includes('endpoint-protection-v1');
        html+='<section class="agent-record-card agent-protection-policy"><header><h3>'+settingsIcon('sliders-horizontal')+'Politique du poste</h3></header><form data-protection-policy><fieldset '+(disabled?'disabled':'')+'><label>Mode de protection<select data-protection-field="mode"><option value="protect" '+(policy.mode==='protect'?'selected':'')+'>Protéger</option><option value="observe" '+(policy.mode==='observe'?'selected':'')+'>Observer</option></select></label><label class="agent-protection-checkbox"><input type="checkbox" data-protection-field="realtime" '+(policy.realtime?'checked':'')+'>Maintenir la surveillance WolfGuard</label><label class="agent-protection-checkbox"><input type="checkbox" data-protection-field="firewall" '+(policy.firewall?'checked':'')+'>Maintenir le pare-feu activé</label><p class="agent-record-caption">Observer suspend les analyses automatiques WolfGuard et conserve les protections du système.</p><div class="agent-protection-actions"><button type="submit" class="settings-btn primary" '+(!draft?'disabled':'')+'>Enregistrer la politique</button>'+(draft?'<button type="button" class="settings-btn" data-discard-protection>Annuler les modifications</button>':'')+'</div></fieldset></form>'+(draft&&row?.revision!==draftRevision?'<p class="agent-record-notice">La politique a changé sur le serveur. Annulez les modifications pour recharger sa nouvelle version.</p>':'')+'</section>';
        const monitor=row?.snapshot?.systemMonitor;
        if(monitor)html+='<details class="agent-record-disclosure" data-protection-disclosure="system" '+(opened.has('system')?'open':'')+'><summary>Surveillance système</summary><dl>'+[['Processus',monitor.processes],['Services',monitor.services],['Connexions',monitor.connections],['Éléments au démarrage',monitor.startupEntries],['Journaux accessibles',(monitor.eventLogs||[]).join(', ')||'Aucun confirmé']].map(([name,value])=>'<div><dt>'+name+'</dt><dd>'+esc(String(value))+'</dd></div>').join('')+'</dl>'+(monitor.limitations||[]).map(value=>'<p class="agent-record-caption">'+esc(value)+'</p>').join('')+'</details>';
        if(commands.length)html+='<section class="agent-protection-history"><h4>Dernières actions</h4>'+commands.map(command=>'<div><span><strong>'+esc(actionName(command.action))+'</strong><small>'+esc(command.result?.message||time(command.createdAt))+'</small></span><span class="agent-protection-state" data-state="'+esc(command.status)+'">'+esc(states[command.status]||command.status)+'</span></div>').join('')+'</section>';
      }
      if(host.innerHTML===html)return;
      host.innerHTML=html;
      if(focusKey){const target=host.querySelector('[data-protection-action="'+CSS.escape(focusKey)+'"],[data-protection-field="'+CSS.escape(focusKey)+'"]');target?.focus({preventScroll:true});if(selection&&target?.type==='search')target.setSelectionRange(...selection);}
    }
    function history(force=false){
      if(!active())return Promise.resolve();
      if(historyWork)return force?historyWork.then(()=>history(true)):historyWork;
      if(!force&&Date.now()-last<8000)return Promise.resolve();
      const current=revision,target=id;loading=true;
      historyWork=(async()=>{
        try{const result=await request('/events?agentId='+encodeURIComponent(target));if(!active()||current!==revision||target!==id)return;commands=result.commands||[];last=Date.now();historyStale=false;if(error.startsWith('Suivi des actions'))error='';const sent=commands.find(command=>command.id===submittedId);if(sent&&['completed','failed','expired','cancelled'].includes(sent.status)){message=actionName(sent.action)+' : '+states[sent.status]+'.';if(sent.status==='failed')error=sent.result?.message||'Le poste n’a pas confirmé cette action.';submittedId=null;}}
        catch(problem){if(active()&&current===revision&&problem.name!=='AbortError'){historyStale=true;error='Suivi des actions indisponible : '+problem.message;}}
        finally{if(current===revision){loading=false;draw();}}
      })().finally(()=>{if(current===revision)historyWork=null;});
      return historyWork;
    }
    async function execute(action){
      if(!manage()||!fresh()||historyStale||busy||confirming)return;
      const target=id,current=revision;
      const prompt=action.startsWith('av-restore:')?'Restaurer ce fichier à son emplacement initial ? Il peut être détecté à nouveau. Aucun fichier existant ne sera écrasé.':action.startsWith('av-delete:')?'Supprimer définitivement cette copie chiffrée de quarantaine ?':action==='av-install'?'Installer le moteur ClamAV et ses signatures sur ce poste ?':action==='av-pause'?'Suspendre la surveillance WolfGuard sur ce poste ? Le pare-feu et les protections du système restent actifs.':null;
      if(prompt){confirming=true;message='';draw();try{if(!await appConfirm(prompt,{title:model.agent.name,confirmLabel:action.startsWith('av-delete:')?'Supprimer':'Confirmer',danger:action.startsWith('av-delete:')||action.startsWith('av-restore:')}))return;}finally{confirming=false;}}
      if(!active()||target!==id||current!==revision||!manage()||!fresh()||historyStale)return;
      busy=true;error='';message='Envoi au poste…';draw();
      try{const result=await request('/command',{agentId:target,action});if(!active()||current!==revision)return;submittedId=result.id;message='Action transmise. En attente de confirmation par le poste.';await history(true);}
      catch(problem){if(active()&&current===revision)error=problem.message;}
      finally{if(current===revision){busy=false;draw();}}
    }
    async function savePolicy(event){
      event.preventDefault();if(!draft||busy||confirming||!manage()||!fresh())return;
      const target=id,current=revision,policy={...draft},expected=draftRevision;
      confirming=true;try{if(!await appConfirm('Appliquer cette politique de protection au poste ?', {title:model.agent.name,confirmLabel:'Appliquer'}))return;}finally{confirming=false;}
      if(!active()||current!==revision||target!==id||!manage()||!fresh())return;
      busy=true;error='';draw();
      try{const result=await request('/policy',{agentId:target,revision:expected,policy});if(!active()||current!==revision)return;draft=null;if(model.endpoint){model.endpoint.policy=result.policy;model.endpoint.revision=result.revision;}message='Politique enregistrée. L’agent doit encore confirmer son application.';await onRefresh();}
      catch(problem){if(active()&&current===revision)error=problem.message;}
      finally{if(current===revision){busy=false;draw();}}
    }
    function show(target,value,pane='protection'){
      if(!target||signal.aborted)return;
      if(id!==value.agent.id){close();id=value.agent.id;controller=new AbortController();}
      model=value;mode=pane;
      if(!active()){close();return;}
      if(host!==target){host=target;host.classList.add('agent-protection-panel');
        host.onclick=event=>{const action=event.target.closest('[data-protection-action]');if(action&&!action.disabled){execute(action.dataset.protectionAction);return;}if(event.target.closest('[data-discard-protection]')){draft=null;draw();}};
        host.oninput=event=>{const field=event.target.dataset.protectionField;if(field==='search'){query=event.target.value.toLocaleLowerCase();draw();return;}if(!['mode','realtime','firewall'].includes(field)||!manage()||busy)return;if(!draft){draft={...model.endpoint.policy};draftRevision=model.endpoint.revision;}draft[field]=field==='mode'?event.target.value:event.target.checked;draw();};
        host.onsubmit=savePolicy;
      }
      draw();history();
    }
    signal.addEventListener('abort',close,{once:true});
    return {show,hide,close,beforeLeave,refresh:()=>live()?history(true):Promise.resolve()};
  }
  return {create};
})();
