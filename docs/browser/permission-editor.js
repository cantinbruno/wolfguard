'use strict';
window.WolfGuardPermissionEditor=(()=>{
  const securitySections=['agents','scan.passive','scan.active','scan.map','scan.vulnerability','edr','remote'];
  let editorGeneration=0;
  const hostFor=root=>root.querySelector('#wgPermissionHost');
  const request=(path,value,signal)=>WolfGuardCloud.agentRequest('users/permissions'+path,value,{signal});
  const date=value=>new Date(value).toLocaleString('fr-FR');
  async function open(root,user,{signal,onSaved,embedded=false}){
    const host=hostFor(root),generation=++editorGeneration;if(!host)return;
    host.dataset.dirty='false';host.dataset.saving='false';host.innerHTML='<p role="status">Chargement des droits…</p>';
    const live=()=>!signal.aborted&&host.isConnected&&generation===editorGeneration;
    if(user.role==='admin'){host.innerHTML='<section class="permission-editor permission-embedded"><header><div><span class="users-eyebrow">ACCÈS AU COMPTE</span><h4>Droits d’accès</h4></div></header><div class="permission-owner"><strong>Propriétaire · accès complet</strong><p>Ce compte conserve tous les droits. Son accès ne peut pas être réduit.</p></div><p class="permission-preview">Toutes les sections sont en écriture.</p></section>';return;}
    try{
      const [catalog,fleet]=await Promise.all([request('',undefined,signal),WolfGuardCloud.agentRequest('agents',undefined,{signal}).catch(()=>null)]);
      if(!live())return;
      let policy=structuredClone(user.permissions),saving=false,reasonDraft='',savedMessage='';
      const model=WolfGuardPermissions;
      let initial=JSON.stringify(model.normalizePolicy(policy));
      function dirty(){
        host.dataset.dirty=String(JSON.stringify(model.normalizePolicy(policy))!==initial||!!host.querySelector('#wgPermissionReason')?.value.trim());
        const save=host.querySelector('#wgPermissionSave');if(save)save.disabled=saving||host.dataset.dirty!=='true';
      }
      function levelBadge(section){
        const level=policy.sections[section];
        return level==='write'?'Écriture':level==='read'?'Lecture':'Invisible';
      }
      function setLevel(sections,level){
        for(const section of sections)policy.sections[section]=level;
        // Preserve unrelated legacy grants and folder restrictions.
        if(policy.legacyGrants)policy.legacyGrants=[...policy.legacyGrants.filter(key=>!sections.some(section=>key.startsWith(section+'.'))),...sections.flatMap(section=>model.LEVEL_ACTIONS[level]?.[section]||[])];
        policy.admin=false;policy.profile='custom';savedMessage='';
      }
      function securityHTML(){
        const levels=securitySections.map(section=>policy.sections[section]);
        const uniform=levels.every(level=>level===levels[0]);
        const legacyMixed=policy.legacyGrants&&securitySections.some(section=>{
          const actual=policy.legacyGrants.filter(key=>key.startsWith(section+'.')).sort();
          const expected=[...(model.LEVEL_ACTIONS[policy.sections[section]]?.[section]||[])].sort();
          return JSON.stringify(actual)!==JSON.stringify(expected);
        });
        const current=uniform&&!legacyMixed?levels[0]:'custom';
        const agents=new Map((fleet?.agents||[]).map(agent=>[agent.id,agent]));
        for(const id of policy.agents||[])if(!agents.has(id))agents.set(id,{id,name:'Poste indisponible · '+id.slice(0,8)});
        return `<section class="permission-security" aria-labelledby="wgSecurityRightsTitle">
          <header><div><span class="users-eyebrow">AGENTS ET OUTILS</span><h5 id="wgSecurityRightsTitle">Sécurité des postes</h5></div><span class="permission-security-badge">${policy.admin?'Administrateur':current==='custom'?'Personnalisé':current==='write'?'Écriture':current==='read'?'Lecture':'Invisible'}</span></header>
          <p>Un même niveau pour les agents, les scans, la cartographie, les vulnérabilités, l’EDR et la prise en main.</p>
          <fieldset ${policy.admin?'disabled':''}>
            <div class="permission-row permission-security-level" data-permission-section="security"><span class="permission-row-name">Niveau commun</span><div class="permission-row-levels" role="group" aria-label="Niveau de sécurité des postes">${catalog.levels.map(([value,label])=>'<button type="button" data-security-level="'+value+'" aria-pressed="'+(current===value)+'">'+esc(label)+'</button>').join('')}</div></div>
            <p class="permission-security-explanation">${policy.admin?'Le mode administrateur donne tous les droits sur tous les postes.':current==='custom'?'Les droits actuels diffèrent selon les outils et sont conservés. Choisir un niveau les harmonise.':current==='write'?'Permet d’associer et de révoquer les agents, lancer les scans, administrer la protection et prendre la main sur les postes autorisés.':current==='read'?'Permet de consulter les postes et leurs résultats. Aucun lancement de scan, contrôle à distance ou changement sur un agent.':'Les agents et leurs outils sont masqués pour ce compte.'}</p>
            <div class="permission-agent-scope"><h6>Postes autorisés</h6><p>${policy.admin?'Le mode administrateur donne accès à tous les postes, y compris ceux réservés aux administrateurs.':'La même liste s’applique à tous les outils de sécurité. Les postes réservés aux administrateurs restent protégés.'}</p><fieldset ${fleet?'':'disabled'}><div class="permission-agent-modes"><label><input type="radio" name="securityAgentScope" data-agent-scope="all" ${policy.admin||policy.agents===null?'checked':''}>Tous les postes</label><label><input type="radio" name="securityAgentScope" data-agent-scope="selected" ${!policy.admin&&policy.agents!==null?'checked':''}>Choisir les postes</label></div>
            ${!policy.admin&&policy.agents!==null?'<div class="permission-agent-list">'+[...agents.values()].map(agent=>'<label><input type="checkbox" data-permission-agent="'+esc(agent.id)+'" '+(policy.agents.includes(agent.id)?'checked':'')+'><span>'+esc(agent.name)+'</span></label>').join('')+(!agents.size?'<p>Aucun poste disponible. Aucun poste ne sera autorisé.</p>':'')+'</div>':''}</fieldset>${policy.admin?'':!fleet?'<p role="status">Liste des postes indisponible. Le périmètre actuel est conservé.</p>':policy.agents!==null?'<small>'+policy.agents.length+' poste(s) autorisé(s). Les nouveaux postes restent exclus.</small>':'<small>Les nouveaux postes seront aussi accessibles, sauf ceux réservés aux administrateurs.</small>'}</div>
            <details class="permission-security-summary"><summary>Droits actuels par outil</summary><dl>${catalog.sections.filter(([section])=>securitySections.includes(section)).map(([section,name])=>'<div><dt>'+esc(name)+'</dt><dd>'+esc(levelBadge(section))+'</dd></div>').join('')}</dl></details>
          </fieldset></section>`;
      }
      function render(focusSelector){
        const opened=new Set([...host.querySelectorAll('details[open]')].map(row=>row.querySelector('summary')?.textContent));
        reasonDraft=host.querySelector('#wgPermissionReason')?.value??reasonDraft;
        host.innerHTML=`<form class="permission-editor${embedded?' permission-embedded':''}" id="wgPermissionForm">
          <header><div><span class="users-eyebrow">ACCÈS AU COMPTE</span><h4>Droits d’accès</h4></div>${embedded?'':'<button type="button" class="settings-btn" data-close-permissions>Fermer</button>'}</header>
          <p class="access-feedback permission-save-notice" data-permission-save-notice role="status">${esc(savedMessage)}</p>
          <fieldset ${saving?'disabled':''}>
            <label class="users-checkbox permission-admin-switch"><input type="checkbox" id="wgPermissionAdmin" ${policy.admin?'checked':''}><span>Administrateur — écriture sur toutes les sections</span></label>
            <p class="access-help">La case administrateur donne l’écriture partout. Sinon, chaque section reçoit un niveau : lecture, écriture ou invisible.</p>
            <div hidden class="permission-profile-choices" aria-label="Profils d’accès">${catalog.profiles.filter(row=>row.id!=='legacy').map(row=>'<button type="button" data-permission-profile="'+esc(row.id)+'" aria-pressed="'+(policy.admin&&row.id==='admin'||!policy.admin&&JSON.stringify(model.profilePolicy(row.id).sections)===JSON.stringify(policy.sections)+'')+'"><strong>'+esc(row.name)+'</strong><span>'+esc(row.description)+'</span></button>').join('')}</div>
            <div class="permission-matrix">${catalog.sections.filter(([section])=>!securitySections.includes(section)).map(([section,name])=>{
              const current=policy.sections[section];
              return '<div class="permission-row" data-permission-section="'+esc(section)+'"><span class="permission-row-name">'+esc(name)+'</span><div class="permission-row-levels" role="group" aria-label="Niveau pour '+esc(name)+'">'+
                catalog.levels.map(([value,label])=>'<button type="button" data-section="'+esc(section)+'" data-level="'+value+'" aria-pressed="'+(current===value)+'">'+esc(label)+'</button>').join('')+
                '</div></div>';
            }).join('')}</div>
            ${securityHTML()}
            <details class="permission-advanced"><summary>Durée et motif du changement</summary><label>Fin des autorisations (facultatif)<input id="wgPermissionExpiry" type="datetime-local" value="${policy.expiresAt?new Date(policy.expiresAt-new Date(policy.expiresAt).getTimezoneOffset()*60000).toISOString().slice(0,16):''}"></label><label>Motif du changement<input id="wgPermissionReason" maxlength="500" placeholder="Ex. Accès temporaire pour une intervention"></label></details>
            <div class="permission-save-bar"><p>Enregistrer les droits déconnecte les sessions de ce compte.</p><div class="actions"><button type="button" class="settings-btn" data-close-permissions>Annuler les modifications</button><button type="submit" class="settings-btn primary" id="wgPermissionSave" disabled>${saving?'Enregistrement…':'Enregistrer les droits'}</button></div></div>
          </fieldset><p data-permission-error class="access-error" role="alert"></p></form>`;
        host.querySelectorAll('details').forEach(row=>{row.open=opened.has(row.querySelector('summary')?.textContent);});
        host.querySelectorAll('[data-close-permissions]').forEach(button=>button.onclick=()=>{if(saving)return;if(embedded){policy=structuredClone(user.permissions);reasonDraft='';savedMessage='';render();}else reset(root);});
        if(user.role==='admin')return;
        host.querySelector('#wgPermissionReason').value=reasonDraft;
        host.querySelector('#wgPermissionAdmin').onchange=event=>{delete policy.legacyGrants;delete policy.scopes;policy.admin=event.target.checked;savedMessage='';render();};
        host.querySelectorAll('[data-permission-profile]').forEach(button=>button.onclick=()=>{policy=model.profilePolicy(button.dataset.permissionProfile);savedMessage='';render();});
        host.querySelectorAll('[data-section]').forEach(button=>button.onclick=()=>{setLevel([button.dataset.section],button.dataset.level);render('[data-section="'+button.dataset.section+'"][data-level="'+button.dataset.level+'"]');});
        host.querySelectorAll('[data-security-level]').forEach(button=>button.onclick=()=>{setLevel(securitySections,button.dataset.securityLevel);render('[data-security-level="'+button.dataset.securityLevel+'"]');});
        host.querySelectorAll('[data-agent-scope]').forEach(input=>input.onchange=()=>{policy.agents=input.dataset.agentScope==='all'?null:policy.agents||[];savedMessage='';render('[data-agent-scope="'+input.dataset.agentScope+'"]');});
        host.querySelectorAll('[data-permission-agent]').forEach(input=>input.onchange=()=>{const selected=new Set(policy.agents||[]);if(input.checked)selected.add(input.dataset.permissionAgent);else selected.delete(input.dataset.permissionAgent);policy.agents=[...selected];savedMessage='';render('[data-permission-agent="'+input.dataset.permissionAgent+'"]');});
        host.querySelector('#wgPermissionExpiry').onchange=event=>{policy.expiresAt=event.target.value?new Date(event.target.value).getTime():null;dirty();};
        host.querySelector('#wgPermissionForm').onsubmit=async event=>{
          event.preventDefault();if(saving)return;const error=host.querySelector('[data-permission-error]');
          if(policy.expiresAt!==null&&policy.expiresAt<=Date.now()){error.textContent='Choisis une date de fin future ou laisse ce champ vide.';return;}
          saving=true;host.dataset.saving='true';host.querySelector('fieldset').disabled=true;
          try{const saved=await request('',{id:user.id,revision:user.permission_revision,policy:model.normalizePolicy(policy),reason:host.querySelector('#wgPermissionReason').value},signal);if(saved.reconnect){await lockApplication();return;}if(!live())return;user={...user,permissions:model.normalizePolicy(policy),permission_revision:saved.revision};policy=structuredClone(user.permissions);initial=JSON.stringify(model.normalizePolicy(policy));savedMessage='Droits enregistrés. Les sessions de ce compte ont été déconnectées.';saving=false;host.dataset.saving='false';host.dataset.dirty='false';render();await onSaved(saved);}
          catch(problem){if(live()){error.textContent=problem.message;host.querySelector('fieldset').disabled=false;}}
          finally{saving=false;if(live())host.dataset.saving='false';}
        };
        dirty();
        if(focusSelector)host.querySelector(focusSelector)?.focus({preventScroll:true});
      }
      render();if(!embedded)host.scrollIntoView({block:'start'});
    }catch(error){if(live())host.innerHTML='<p class="access-error" role="alert">'+esc(error.message)+'</p>';}
  }
  async function audit(root,{signal,onClose}){
    const host=hostFor(root),generation=++editorGeneration;if(!host)return;host.innerHTML='<p role="status">Chargement du journal…</p>';
    try{const result=await request('/audit',undefined,signal);if(signal.aborted||generation!==editorGeneration||!host.isConnected)return;
      host.innerHTML='<section class="permission-editor"><header><h4>Journal des droits</h4><button type="button" class="settings-btn" data-close-audit>Fermer</button></header><p class="access-help">Les 100 changements les plus récents.</p>'+result.events.map(event=>{
        const summary=Object.entries(event.after.sections).filter(([section])=>event.before.sections[section]!==event.after.sections[section]).map(([section,level])=>section+' → '+level).join(', ');
        const scopeChanged=JSON.stringify(event.before.agents===null?null:[...(event.before.agents||[])].sort())!==JSON.stringify(event.after.agents===null?null:[...(event.after.agents||[])].sort());
        const scope=scopeChanged?' Postes autorisés : '+(event.after.agents===null?'tous les postes':(event.after.agents||[]).length+' poste(s) sélectionné(s)')+'.':'';
        return '<article class="permission-audit"><strong>'+esc(event.user)+'</strong><small>'+esc(date(event.createdAt))+' · '+esc(event.actor)+' · révision '+event.revision+'</small>'+(event.reason?'<p>'+esc(event.reason)+'</p>':'')+'<p>'+(event.after.admin?'Administrateur activé. ':event.before.admin?'Administrateur retiré. ':'')+(summary?'Niveaux modifiés : '+esc(summary)+'.':'Aucun changement de niveau.')+esc(scope)+'</p></article>';
      }).join('')+(!result.events.length?'<p>Aucun changement de droits enregistré.</p>':'')+'</section>';
      host.querySelector('[data-close-audit]').onclick=()=>{reset(root);onClose?.();};host.scrollIntoView({block:'start'});
    }catch(error){if(!signal.aborted&&generation===editorGeneration)host.textContent=error.message;}
  }
  function reset(root){editorGeneration++;const host=hostFor(root);if(host){host.dataset.dirty='false';host.dataset.saving='false';host.replaceChildren();}}
  return {open,audit,reset,isDirty:root=>hostFor(root)?.dataset.dirty==='true',isSaving:root=>hostFor(root)?.dataset.saving==='true'};
})();
