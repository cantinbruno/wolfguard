'use strict';
window.WolfGuardPermissionEditor=(()=>{
  let editorGeneration=0;
  const hostFor=root=>root.querySelector('#wgPermissionHost');
  const request=(path,value,signal)=>WolfGuardCloud.agentRequest('users/permissions'+path,value,{signal});
  const date=value=>new Date(value).toLocaleString('fr-FR');
  async function open(root,user,{signal,onSaved,embedded=false}){
    const host=hostFor(root),generation=++editorGeneration;if(!host)return;
    host.dataset.dirty='false';host.dataset.saving='false';host.innerHTML='<p role="status">Chargement des droits…</p>';
    const live=()=>!signal.aborted&&host.isConnected&&generation===editorGeneration;
    if(user.role==='admin'){host.innerHTML='<section class="permission-editor permission-embedded"><header><div><span class="users-eyebrow">ACCÈS AU COMPTE</span><h4>Droits d’accès</h4></div></header><div class="permission-owner"><strong>Propriétaire · accès complet</strong><p>Ce compte conserve tous les droits. Son accès ne peut pas être réduit.</p></div><p class="permission-preview">Tous les espaces et toutes les actions sont autorisés.</p></section>';return;}
    try{
      const [catalog,posts,folders,items]=await Promise.all([request('',undefined,signal),WolfGuardCloud.agentRequest('agents',undefined,{signal}),all('folders'),all('items')]);
      if(!live())return;
      let policy=structuredClone(user.permissions),saving=false,reasonDraft='',savedMessage='';const owner=user.role==='admin',model=WolfGuardPermissions;
      let initial=JSON.stringify(model.normalizePolicy(policy));
      function dirty(){host.dataset.dirty=String(JSON.stringify(model.normalizePolicy(policy))!==initial||!!host.querySelector('#wgPermissionReason')?.value.trim());const save=host.querySelector('#wgPermissionSave');if(save)save.disabled=saving||host.dataset.dirty!=='true';preview();}
      const recordLabel=(row,kind)=>kind==='folders'?row.name||row.id:row.title||row.id;
      const sectionRows=(section,kind)=>(kind==='folders'?folders:items).filter(row=>model.recordSection(row,kind)===section&&!row.deletedAt);
      let countCache=null,countKey='';
      const allowedCount=()=>{
        const next=JSON.stringify([policy.scopes,policy.grants.filter(key=>key.startsWith('library.')||key.startsWith('vault.'))]);
        if(countCache&&countKey===next)return countCache;
        countKey=next;countCache={items:items.filter(row=>model.recordLevel({id:user.id,role:'member',permissions:policy},row,'items',folders)!=='deny').length,folders:folders.filter(row=>model.recordLevel({id:user.id,role:'member',permissions:policy},row,'folders',folders)!=='deny').length};return countCache;
      };

      function preview(){
        const count=allowedCount(),summary=host.querySelector('[data-permission-preview]');
        if(summary)summary.textContent=owner?'Tous les espaces et toutes les actions sont autorisés.':policy.grants.length+' actions accordées · '+count.items+' fiches et '+count.folders+' dossiers visibles · '+(policy.agents===null?'tous les postes':policy.agents.length+' postes')+(policy.expiresAt?' · jusqu’au '+date(policy.expiresAt):'');
        host.querySelectorAll('[data-permission-profile]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.permissionProfile===policy.profile)));
        host.querySelectorAll('[data-group-count]').forEach(node=>{const group=catalog.groups.find(([id])=>id===node.dataset.groupCount),total=group[2].length,count=group[2].filter(([action])=>policy.grants.includes(group[0]+'.'+action)).length;node.textContent=count===0?'Aucun accès':count===total?'Accès complet':count+' / '+total+' actions';});
      }
      function scopeHTML(section){
        const scope=policy.scopes[section];
        return '<details class="permission-scope"><summary>'+esc(section==='vault'?'Périmètre du coffre-fort':'Périmètre de la bibliothèque')+'</summary><label>Accès de départ<select data-scope-mode="'+section+'"><option value="all" '+(scope.mode==='all'?'selected':'')+'>Tous les dossiers et fiches</option><option value="selected" '+(scope.mode==='selected'?'selected':'')+'>Uniquement les dossiers et fiches autorisés ci-dessous</option></select></label><p class="access-help">Une règle de fiche prime sur celle du dossier. Le coffre personnel reste isolé tant que le droit d’accès à tous les coffres n’est pas accordé. Les sous-dossiers héritent du dossier parent. « Modification » nécessite aussi les droits d’action cochés plus haut.</p>'+['folders','items'].map(kind=>'<div class="permission-rule-group"><h5>'+(kind==='folders'?'Dossiers et sous-dossiers':'Exceptions par fiche')+'</h5>'+Object.entries(scope[kind]).map(([id,level])=>{const row=(kind==='folders'?folders:items).find(r=>r.id===id);return '<div class="permission-rule"><span>'+esc(row?recordLabel(row,kind):id==='root'?'Règle à la racine':id+' (indisponible)')+'</span><select aria-label="Niveau de '+esc(row?recordLabel(row,kind):id)+'" data-rule-section="'+section+'" data-rule-kind="'+kind+'" data-rule-id="'+esc(id)+'">'+[['deny','Aucun accès'],['read','Lecture seule'],['write','Modification']].map(([value,label])=>'<option value="'+value+'" '+(level===value?'selected':'')+'>'+label+'</option>').join('')+'</select><button type="button" class="settings-btn" data-remove-rule="'+section+'" data-kind="'+kind+'" data-id="'+esc(id)+'" aria-label="Retirer la règle">Retirer</button></div>';}).join('')+'<div class="permission-add-rule"><select aria-label="Choisir '+(kind==='folders'?'un dossier':'une fiche')+'" data-add-target="'+section+'-'+kind+'"><option value="">Choisir '+(kind==='folders'?'un dossier':'une fiche')+'…</option>'+sectionRows(section,kind).filter(row=>!Object.hasOwn(scope[kind],row.id)).sort((a,b)=>recordLabel(a,kind).localeCompare(recordLabel(b,kind),'fr')).map(row=>'<option value="'+esc(row.id)+'">'+esc(recordLabel(row,kind))+'</option>').join('')+'</select><button type="button" class="settings-btn" data-add-rule="'+section+'" data-kind="'+kind+'">Ajouter une règle</button></div></div>').join('')+'</details>';
      }
      function render(){
        const opened=new Set([...host.querySelectorAll('details[open]')].map(row=>row.querySelector('summary')?.textContent));
        reasonDraft=host.querySelector('#wgPermissionReason')?.value??reasonDraft;
        host.innerHTML=`<form class="permission-editor${embedded?' permission-embedded':''}" id="wgPermissionForm">
          <header><div><span class="users-eyebrow">ACCÈS AU COMPTE</span><h4>Droits d’accès</h4></div>${embedded?'':'<button type="button" class="settings-btn" data-close-permissions>Fermer</button>'}</header>
          <p class="access-feedback permission-save-notice" data-permission-save-notice role="status">${esc(savedMessage)}</p>
          ${owner?'<div class="permission-owner"><strong>Propriétaire · accès complet</strong><p>Ce compte conserve tous les droits. Son accès ne peut pas être réduit.</p></div><p data-permission-preview class="permission-preview"></p>':`
          <fieldset ${saving?'disabled':''}>
            <label class="permission-profile-select">Profil d’accès<select id="wgPermissionProfile"><option value="custom" ${policy.profile==='custom'?'selected':''}>Personnalisé</option>${catalog.profiles.map(row=>'<option value="'+esc(row.id)+'" '+(!model.canManagePolicy(WolfGuardCloud.currentUser(),model.profilePolicy(row.id))?'disabled ':'')+(policy.profile===row.id?'selected':'')+'>'+esc(row.name)+'</option>').join('')}</select></label>
            <div class="permission-profile-choices" aria-label="Profils d’accès">${catalog.profiles.filter(row=>row.id!=='legacy').map(row=>'<button type="button" '+(!model.canManagePolicy(WolfGuardCloud.currentUser(),model.profilePolicy(row.id))?'disabled ':'')+'data-permission-profile="'+esc(row.id)+'" aria-pressed="'+(policy.profile===row.id)+'"><strong>'+esc(row.name)+'</strong><span>'+esc(row.description)+'</span></button>').join('')}</div>
            <p class="access-help" data-profile-description></p><p data-permission-preview class="permission-preview" role="status"></p>
            <details class="permission-advanced" data-custom-rights><summary>Personnaliser les droits par section</summary><div class="permission-matrix">${catalog.groups.filter(([group])=>group!=='ai').map(([group,name,actions])=>'<details class="permission-group"><summary><span>'+esc(name)+'</span><small data-group-count="'+group+'"></small></summary><div class="permission-group-head"><button type="button" class="settings-btn" data-group-all="'+group+'">Tout autoriser</button><button type="button" class="settings-btn" data-group-none="'+group+'">Tout retirer</button></div>'+actions.map(([action,label])=>'<label class="permission-check"><input type="checkbox" data-permission="'+group+'.'+action+'" '+(policy.grants.includes(group+'.'+action)?'checked':'')+'><span>'+esc(label)+'</span></label>').join('')+'</details>').join('')}</div></details>
            <details class="permission-advanced" data-permission-scopes><summary>Limiter les dossiers et les postes</summary><p class="access-help">Les droits ci-dessus définissent les actions possibles. Les périmètres ci-dessous limitent les données et les postes accessibles.</p><details class="permission-scope"><summary>Postes autorisés</summary><label class="permission-check"><input type="checkbox" id="wgPermissionAllAgents" ${policy.agents===null?'checked':''}>Tous les postes, y compris les futurs</label><div id="wgPermissionAgents">${posts.agents.map(agent=>'<label class="permission-check"><input type="checkbox" data-permission-agent="'+esc(agent.id)+'" '+(policy.agents===null||policy.agents.includes(agent.id)?'checked':'')+' '+(policy.agents===null?'disabled':'')+'>'+esc(agent.name||agent.id)+'</label>').join('')||'<p>Aucun poste associé.</p>'}</div></details>${scopeHTML('library')}${scopeHTML('vault')}</details>
            <details class="permission-advanced"><summary>Durée et motif du changement</summary><label>Fin des autorisations (facultatif)<input id="wgPermissionExpiry" type="datetime-local" value="${policy.expiresAt?new Date(policy.expiresAt-new Date(policy.expiresAt).getTimezoneOffset()*60000).toISOString().slice(0,16):''}"></label><label>Motif du changement<input id="wgPermissionReason" maxlength="500" placeholder="Ex. Accès temporaire pour une intervention"></label></details>
            <div class="permission-save-bar"><p>Enregistrer les droits déconnecte les sessions de ce compte.</p><div class="actions"><button type="button" class="settings-btn" data-close-permissions>Annuler les modifications</button><button type="submit" class="settings-btn primary" id="wgPermissionSave" disabled>${saving?'Enregistrement…':'Enregistrer les droits'}</button></div></div>
          </fieldset>`}<p data-permission-error class="access-error" role="alert"></p></form>`;
        host.querySelectorAll('details').forEach(row=>{row.open=opened.has(row.querySelector('summary')?.textContent);});
        preview();const description=host.querySelector('[data-profile-description]');if(description)description.textContent=catalog.profiles.find(p=>p.id===policy.profile)?.description||'Droits définis action par action.';
        host.querySelectorAll('[data-close-permissions]').forEach(button=>button.onclick=()=>{if(saving)return;if(embedded){policy=structuredClone(user.permissions);reasonDraft='';const reason=host.querySelector('#wgPermissionReason');if(reason)reason.value='';savedMessage='';render();}else{reset(root);}});
        if(owner)return;
        host.querySelector('#wgPermissionReason').value=reasonDraft;
        const markCustom=()=>{policy.profile='custom';host.querySelector('#wgPermissionProfile').value='custom';savedMessage='';dirty();};
        host.querySelectorAll('[data-permission-profile]').forEach(button=>button.onclick=()=>{policy=model.profilePolicy(button.dataset.permissionProfile);savedMessage='';render();});
        host.querySelector('#wgPermissionReason').oninput=dirty;
        host.querySelector('#wgPermissionProfile').onchange=event=>{if(event.target.value==='custom'){markCustom();return;}policy=model.profilePolicy(event.target.value);render();};
        host.querySelectorAll('[data-permission]').forEach(input=>input.onchange=()=>{
          const key=input.dataset.permission;policy.grants=input.checked?[...new Set([...policy.grants,key])]:policy.grants.filter(k=>k!==key);
          if(input.checked&&key!=='tools.use'&&!key.startsWith('remote.')&&!key.startsWith('access.')){const group=key.slice(0,key.lastIndexOf('.')),read=group+'.read';if(model.PERMISSION_KEYS.includes(read)&&!policy.grants.includes(read)){policy.grants.push(read);const parent=host.querySelector('[data-permission="'+read+'"]');if(parent)parent.checked=true;}}
          markCustom();
        });
        for(const mode of ['all','none'])host.querySelectorAll('[data-group-'+mode+']').forEach(button=>button.onclick=()=>{const group=button.getAttribute('data-group-'+mode),keys=model.PERMISSION_KEYS.filter(k=>k.startsWith(group+'.'));policy.grants=policy.grants.filter(k=>!keys.includes(k));if(mode==='all')policy.grants.push(...keys);policy.profile='custom';render();});
        host.querySelector('#wgPermissionAllAgents').onchange=event=>{policy.agents=event.target.checked?null:[];policy.profile='custom';render();};
        host.querySelectorAll('[data-permission-agent]').forEach(input=>input.onchange=()=>{policy.agents=[...host.querySelectorAll('[data-permission-agent]:checked')].map(row=>row.dataset.permissionAgent);markCustom();});
        host.querySelectorAll('[data-scope-mode]').forEach(select=>select.onchange=()=>{policy.scopes[select.dataset.scopeMode].mode=select.value;markCustom();});
        host.querySelectorAll('[data-rule-id]').forEach(select=>select.onchange=()=>{policy.scopes[select.dataset.ruleSection][select.dataset.ruleKind][select.dataset.ruleId]=select.value;markCustom();});
        host.querySelectorAll('[data-remove-rule]').forEach(button=>button.onclick=()=>{delete policy.scopes[button.dataset.removeRule][button.dataset.kind][button.dataset.id];policy.profile='custom';render();});
        host.querySelectorAll('[data-add-rule]').forEach(button=>button.onclick=()=>{const section=button.dataset.addRule,kind=button.dataset.kind,id=host.querySelector('[data-add-target="'+section+'-'+kind+'"]').value;if(!id)return;policy.scopes[section][kind][id]='read';policy.profile='custom';render();});
        host.querySelector('#wgPermissionExpiry').onchange=event=>{policy.expiresAt=event.target.value?new Date(event.target.value).getTime():null;markCustom();};
        host.querySelector('#wgPermissionForm').onsubmit=async event=>{
          event.preventDefault();if(saving)return;const error=host.querySelector('[data-permission-error]'),reason=host.querySelector('#wgPermissionReason').value;
          if(policy.expiresAt!==null&&policy.expiresAt<=Date.now()){error.textContent='Choisis une date de fin future ou laisse ce champ vide.';return;}
          saving=true;host.dataset.saving='true';host.querySelector('fieldset').disabled=true;
          try{const saved=await request('',{id:user.id,revision:user.permission_revision,policy:model.normalizePolicy(policy),reason},signal);if(saved.reconnect){await lockApplication();return;}if(!live())return;user={...user,permissions:model.normalizePolicy(policy),permission_revision:saved.revision};policy=structuredClone(user.permissions);initial=JSON.stringify(model.normalizePolicy(policy));reasonDraft='';host.querySelector('#wgPermissionReason').value='';savedMessage='Droits enregistrés. Les sessions de ce compte ont été déconnectées.';saving=false;host.dataset.saving='false';host.dataset.dirty='false';render();await onSaved(saved);}
          catch(problem){if(live()){error.textContent=problem.message;host.querySelector('fieldset').disabled=false;}}
          finally{saving=false;if(live())host.dataset.saving='false';}
        };
        dirty();
      }
      render();if(!embedded)host.scrollIntoView({block:'start'});if(!embedded)host.querySelector('[data-close-permissions]')?.focus({preventScroll:true});
    }catch(error){if(live())host.innerHTML='<p class="access-error" role="alert">'+esc(error.message)+'</p>';}
  }
  async function audit(root,{signal,onClose}){
    const host=hostFor(root),generation=++editorGeneration;if(!host)return;host.innerHTML='<p role="status">Chargement du journal…</p>';
    try{const result=await request('/audit',undefined,signal);if(signal.aborted||generation!==editorGeneration||!host.isConnected)return;
      host.innerHTML='<section class="permission-editor"><header><h4>Journal des droits</h4><button type="button" class="settings-btn" data-close-audit>Fermer</button></header><p class="access-help">Les 100 changements les plus récents. Les administrateurs autorisés peuvent attribuer les profils et les droits.</p>'+result.events.map(event=>{
        const added=event.after.grants.filter(k=>!event.before.grants.includes(k)),removed=event.before.grants.filter(k=>!event.after.grants.includes(k));
        return '<article class="permission-audit"><strong>'+esc(event.user)+'</strong><small>'+esc(date(event.createdAt))+' · '+esc(event.actor)+' · révision '+event.revision+'</small>'+(event.reason?'<p>'+esc(event.reason)+'</p>':'')+'<p>'+(added.length?'Ajout : '+esc(added.join(', '))+'. ':'')+(removed.length?'Retrait : '+esc(removed.join(', '))+'.':'')+'</p><details><summary>Périmètres et état enregistré</summary><pre>'+esc(JSON.stringify({avant:event.before,après:event.after},null,2))+'</pre></details></article>';
      }).join('')+(!result.events.length?'<p>Aucun changement de droits enregistré.</p>':'')+'</section>';
      host.querySelector('[data-close-audit]').onclick=()=>{reset(root);onClose?.();};host.scrollIntoView({block:'start'});
    }catch(error){if(!signal.aborted&&generation===editorGeneration)host.textContent=error.message;}
  }
  function reset(root){editorGeneration++;const host=hostFor(root);if(host){host.dataset.dirty='false';host.dataset.saving='false';host.replaceChildren();}}
  return {open,audit,reset,isDirty:root=>hostFor(root)?.dataset.dirty==='true',isSaving:root=>hostFor(root)?.dataset.saving==='true'};
})();
