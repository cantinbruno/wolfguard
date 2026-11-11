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
    if(user.role==='admin'){host.innerHTML='<section class="permission-editor permission-embedded"><header><div><span class="users-eyebrow">ACCÈS AU COMPTE</span><h4>Droits d’accès</h4></div></header><div class="permission-owner"><strong>Propriétaire · accès complet</strong><p>Ce compte conserve tous les droits. Son accès ne peut pas être réduit.</p></div><p class="permission-preview">Toutes les sections sont en écriture.</p></section>';return;}
    try{
      const [catalog]=await Promise.all([request('',undefined,signal)]);
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
      function render(){
        const opened=new Set([...host.querySelectorAll('details[open]')].map(row=>row.querySelector('summary')?.textContent));
        reasonDraft=host.querySelector('#wgPermissionReason')?.value??reasonDraft;
        host.innerHTML=`<form class="permission-editor${embedded?' permission-embedded':''}" id="wgPermissionForm">
          <header><div><span class="users-eyebrow">ACCÈS AU COMPTE</span><h4>Droits d’accès</h4></div>${embedded?'':'<button type="button" class="settings-btn" data-close-permissions>Fermer</button>'}</header>
          <p class="access-feedback permission-save-notice" data-permission-save-notice role="status">${esc(savedMessage)}</p>
          <fieldset ${saving?'disabled':''}>
            <label class="users-checkbox permission-admin-switch"><input type="checkbox" id="wgPermissionAdmin" ${policy.admin?'checked':''}><span>Administrateur — écriture sur toutes les sections</span></label>
            <p class="access-help">La case administrateur donne l’écriture partout. Sinon, chaque section reçoit un niveau : lecture, écriture ou invisible.</p>
            <div hidden class="permission-profile-choices" aria-label="Profils d’accès">${catalog.profiles.filter(row=>row.id!=='legacy').map(row=>'<button type="button" data-permission-profile="'+esc(row.id)+'" aria-pressed="'+(policy.admin&&row.id==='admin'||!policy.admin&&JSON.stringify(model.profilePolicy(row.id).sections)===JSON.stringify(policy.sections)+'')+'"><strong>'+esc(row.name)+'</strong><span>'+esc(row.description)+'</span></button>').join('')}</div>
            <div class="permission-matrix">${catalog.sections.map(([section,name])=>{
              const current=policy.sections[section];
              return '<div class="permission-row" data-permission-section="'+esc(section)+'"><span class="permission-row-name">'+esc(name)+'</span><div class="permission-row-levels" role="group" aria-label="Niveau pour '+esc(name)+'">'+
                catalog.levels.map(([value,label])=>'<button type="button" data-section="'+esc(section)+'" data-level="'+value+'" aria-pressed="'+(current===value)+'">'+esc(label)+'</button>').join('')+
                '</div></div>';
            }).join('')}</div>
            <details class="permission-advanced"><summary>Durée et motif du changement</summary><label>Fin des autorisations (facultatif)<input id="wgPermissionExpiry" type="datetime-local" value="${policy.expiresAt?new Date(policy.expiresAt-new Date(policy.expiresAt).getTimezoneOffset()*60000).toISOString().slice(0,16):''}"></label><label>Motif du changement<input id="wgPermissionReason" maxlength="500" placeholder="Ex. Accès temporaire pour une intervention"></label></details>
            <div class="permission-save-bar"><p>Enregistrer les droits déconnecte les sessions de ce compte.</p><div class="actions"><button type="button" class="settings-btn" data-close-permissions>Annuler les modifications</button><button type="submit" class="settings-btn primary" id="wgPermissionSave" disabled>${saving?'Enregistrement…':'Enregistrer les droits'}</button></div></div>
          </fieldset><p data-permission-error class="access-error" role="alert"></p></form>`;
        host.querySelectorAll('details').forEach(row=>{row.open=opened.has(row.querySelector('summary')?.textContent);});
        host.querySelectorAll('[data-close-permissions]').forEach(button=>button.onclick=()=>{if(saving)return;if(embedded){policy=structuredClone(user.permissions);reasonDraft='';savedMessage='';render();}else reset(root);});
        if(user.role==='admin')return;
        host.querySelector('#wgPermissionReason').value=reasonDraft;
        host.querySelector('#wgPermissionAdmin').onchange=event=>{delete policy.legacyGrants;delete policy.scopes;policy.admin=event.target.checked;savedMessage='';render();};
        host.querySelectorAll('[data-permission-profile]').forEach(button=>button.onclick=()=>{policy=model.profilePolicy(button.dataset.permissionProfile);savedMessage='';render();});
        host.querySelectorAll('[data-section]').forEach(button=>button.onclick=()=>{delete policy.legacyGrants;delete policy.scopes;policy.sections[button.dataset.section]=button.dataset.level;policy.admin=false;savedMessage='';dirty();render();});
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
      }
      render();if(!embedded)host.scrollIntoView({block:'start'});
    }catch(error){if(live())host.innerHTML='<p class="access-error" role="alert">'+esc(error.message)+'</p>';}
  }
  async function audit(root,{signal,onClose}){
    const host=hostFor(root),generation=++editorGeneration;if(!host)return;host.innerHTML='<p role="status">Chargement du journal…</p>';
    try{const result=await request('/audit',undefined,signal);if(signal.aborted||generation!==editorGeneration||!host.isConnected)return;
      host.innerHTML='<section class="permission-editor"><header><h4>Journal des droits</h4><button type="button" class="settings-btn" data-close-audit>Fermer</button></header><p class="access-help">Les 100 changements les plus récents.</p>'+result.events.map(event=>{
        const summary=Object.entries(event.after.sections).filter(([section])=>event.before.sections[section]!==event.after.sections[section]).map(([section,level])=>section+' → '+level).join(', ');
        return '<article class="permission-audit"><strong>'+esc(event.user)+'</strong><small>'+esc(date(event.createdAt))+' · '+esc(event.actor)+' · révision '+event.revision+'</small>'+(event.reason?'<p>'+esc(event.reason)+'</p>':'')+'<p>'+(event.after.admin?'Administrateur activé. ':event.before.admin?'Administrateur retiré. ':'')+(summary?'Niveaux modifiés : '+esc(summary)+'.':'Aucun changement de niveau.')+'</p></article>';
      }).join('')+(!result.events.length?'<p>Aucun changement de droits enregistré.</p>':'')+'</section>';
      host.querySelector('[data-close-audit]').onclick=()=>{reset(root);onClose?.();};host.scrollIntoView({block:'start'});
    }catch(error){if(!signal.aborted&&generation===editorGeneration)host.textContent=error.message;}
  }
  function reset(root){editorGeneration++;const host=hostFor(root);if(host){host.dataset.dirty='false';host.dataset.saving='false';host.replaceChildren();}}
  return {open,audit,reset,isDirty:root=>hostFor(root)?.dataset.dirty==='true',isSaving:root=>hostFor(root)?.dataset.saving==='true'};
})();
