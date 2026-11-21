'use strict';
window.WolfGuardPermissionEditor=(()=>{
  const securitySections=['agents','scan.passive','scan.active','scan.map','scan.vulnerability','edr','remote'];
  let editorGeneration=0;
  const hostFor=root=>root.querySelector('[data-permission-host],#wgPermissionHost');
  const request=(path,value,signal)=>WolfGuardCloud.agentRequest('users/permissions'+path,value,{signal});
  const date=value=>new Date(value).toLocaleString('fr-FR');
  function setView(root,view){
    const host=hostFor(root);if(!host)return;host.dataset.view=view;
    host.querySelectorAll('[data-permission-pane]').forEach(pane=>{pane.hidden=pane.dataset.permissionPane!==view;});
    const heading=host.querySelector('.permission-role-heading h4');if(heading)heading.textContent=view==='posts'?'Accès par groupe':'Rôle et accès';
  }
  async function open(root,user,{signal,onSaved,embedded=false,group=false}){
    const host=hostFor(root),generation=++editorGeneration;if(!host)return;
    host.dataset.dirty='false';host.dataset.saving='false';host.innerHTML='<p role="status">Chargement des droits…</p>';
    const live=()=>!signal.aborted&&host.isConnected&&generation===editorGeneration;
    if(!group&&user.role!=='admin'){host.innerHTML='<p>Les droits sont hérités du groupe. Modifie-les dans Paramètres → Groupes.</p>';return;}
    if(user.role==='admin'){host.innerHTML='<section class="permission-editor permission-embedded"><header><div><span class="users-eyebrow">ACCÈS AU COMPTE</span><h4>Droits d’accès</h4></div></header><div class="permission-owner"><strong>Propriétaire · accès complet</strong><p>Ce compte conserve tous les droits. Son accès ne peut pas être réduit.</p></div><p class="permission-preview">Toutes les sections sont en écriture.</p></section>';return;}
    try{
      await WolfGuardFleetGroups.create().load();
      const [catalog,fleet]=await Promise.all([request('',undefined,signal),WolfGuardCloud.agentRequest('agents/groups',undefined,{signal})]);
      if(!live())return;
      if(!fleet.initialized)throw new Error('Ouvre la section Sécurité avec le compte propriétaire pour initialiser les sections de postes.');
      for(const section of fleet.groups)if(section.id==='ungrouped')section.name='Sans section';
      let policy=structuredClone(user.permissions),saving=false,reasonDraft='',savedMessage='';
      const roleIcons={admin:'shield-check',editor:'pencil',observer:'eye',guest:'user'};
      const roleNotes={admin:'Tous les droits',editor:'Écriture du contenu',observer:'Lecture seule',guest:'Aucun accès'};
      const model=WolfGuardPermissions;
      let initial=JSON.stringify(model.normalizePolicy(policy));
      function dirty(){
        host.dataset.dirty=String(JSON.stringify(model.normalizePolicy(policy))!==initial||!!host.querySelector('#wgPermissionReason')?.value.trim());
        const save=host.querySelector('#wgPermissionSave');if(save)save.disabled=saving||host.dataset.dirty!=='true';
        const bar=host.querySelector('.permission-save-bar');if(bar)bar.hidden=host.dataset.dirty!=='true';
        const notice=host.querySelector('[data-permission-draft]');if(notice)notice.textContent=host.dataset.dirty==='true'?'Modifications en attente':'';
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
        const assigned=id=>policy.groupLevels?.[id]??'deny';
        return `<section class="permission-security" data-level-state="${current}" aria-labelledby="wgSecurityRightsTitle">
          <header><div><span class="users-eyebrow">AGENTS ET OUTILS</span><h5 id="wgSecurityRightsTitle">Sécurité des postes</h5></div><span class="permission-security-badge">${policy.admin?'Administrateur':current==='custom'?'Personnalisé':current==='write'?'Écriture':current==='read'?'Lecture':'Invisible'}</span></header>
          <p>Définis les autorisations des outils, puis définis les accès de ce groupe d’utilisateurs aux sections de postes. Ces mêmes utilisateurs reçoivent aussi les droits des autres sections ci-dessus.</p>
          <fieldset ${policy.admin?'disabled':''}>
            <div class="permission-row permission-security-level" data-permission-section="security"><span class="permission-row-name">Sécurité des postes</span><div class="permission-row-levels" role="group" aria-label="Niveau de sécurité des postes">${catalog.levels.map(([value,label])=>'<button type="button" data-security-level="'+value+'" aria-pressed="'+(current===value)+'">'+esc(label)+'</button>').join('')}</div></div>
            <p class="permission-security-explanation">${policy.admin?'Le mode administrateur donne tous les droits sur tous les postes.':current==='custom'?'Les droits actuels diffèrent selon les outils et sont conservés. Choisir un niveau les harmonise.':current==='write'?'Permet d’associer et de révoquer les agents, lancer les scans, administrer la protection et prendre la main sur les postes autorisés.':current==='read'?'Permet de consulter les postes et leurs résultats. Aucun lancement de scan, contrôle à distance ou changement sur un agent.':'Les agents et leurs outils sont masqués pour ce compte.'}</p>
            <${embedded?'section':'details'} class="permission-agent-scope" id="wgPermissionAgentScope">${embedded?'<h5>Sections de postes</h5>':'<summary>Sections de postes</summary>'}<p>${policy.admin?'Le groupe administrateur accède à toutes les sections de postes.':'Définis les droits du groupe d’utilisateurs sélectionné sur chaque section de postes. Ces accès restent limités par ses droits sur les outils ci-dessus. Déplacer un poste applique les droits de sa section d’arrivée.'}</p>
            <div class="permission-agent-list permission-agent-rights">${fleet.groups.map(group=>'<div class="permission-agent-right" data-group-right="'+esc(group.id)+'"><strong>'+esc(group.name)+'<small> · '+Object.values(fleet.assignments).filter(id=>id===group.id).length+' poste(s)</small></strong><div class="permission-row-levels" role="group" aria-label="Droits sur la section '+esc(group.name)+'">'+catalog.levels.map(([value,label])=>'<button type="button" data-group-right-id="'+esc(group.id)+'" data-group-level="'+value+'" aria-pressed="'+(assigned(group.id)===value)+'">'+esc(label)+'</button>').join('')+'</div></div>').join('')}</div><small>Les nouvelles sections de postes sont invisibles pour ce groupe par défaut. Aucun droit individuel par poste.</small>
            <details class="permission-security-summary"><summary>Droits actuels par outil</summary><dl>${catalog.sections.filter(([section])=>securitySections.includes(section)).map(([section,name])=>'<div><dt>'+esc(name)+'</dt><dd>'+esc(levelBadge(section))+'</dd></div>').join('')}</dl></details></${embedded?'section':'details'}>
          </fieldset></section>`;
      }
      function render(focusSelector){
        const opened=new Set([...host.querySelectorAll('details[open]')].map(row=>row.querySelector('summary')?.textContent));
        const role=model.policyProfile(policy),activeRole=catalog.profiles.find(row=>row.id===role);
        const exceptions=Object.keys(policy.groupLevels||{}).length>0||!!policy.scopes;
        reasonDraft=host.querySelector('#wgPermissionReason')?.value??reasonDraft;
        host.innerHTML=`<form class="permission-editor${embedded?' permission-embedded':''}" id="wgPermissionForm">
          <header class="permission-role-heading"><h4>Rôle et accès</h4>${embedded||group?'':'<button type="button" class="settings-btn" data-close-permissions>Fermer</button>'}</header>
          <p class="access-feedback permission-save-notice" data-permission-save-notice role="status">${esc(savedMessage)}</p>
          <fieldset ${saving?'disabled':''}>
            <div ${embedded?'data-permission-pane="rights"':''}>
            <div class="permission-profile-choices" role="group" aria-label="Rôle du compte" aria-describedby="wgPermissionRoleHelp">${catalog.profiles.filter(row=>!row.legacy).map(row=>'<button type="button" data-permission-profile="'+esc(row.id)+'" aria-pressed="'+(role===row.id)+'" title="'+esc(row.description)+'"><span class="permission-role-icon" aria-hidden="true">'+settingsIcon(roleIcons[row.id]||'user')+'</span><span class="permission-role-copy"><strong>'+esc(row.name)+'</strong><span>'+esc(roleNotes[row.id]||row.description)+'</span></span><span class="permission-role-check" aria-hidden="true">'+(role===row.id?'✓':'')+'</span></button>').join('')}</div>
            <p class="permission-role-help" id="wgPermissionRoleHelp">${esc(activeRole?.description||'Droits personnalisés. Choisis un rôle pour les simplifier.')}${exceptions&&!policy.admin?' Les droits des groupes sont conservés.':''}</p>
            <details class="permission-customization" id="wgPermissionCustomization"><summary>Personnaliser les droits <span>Sections et durée</span></summary>
            <p class="permission-scope-help">${embedded?'Les accès aux postes se règlent dans « Groupes ». ':''}Le niveau ci-dessous s’applique à toutes les sections, sécurité comprise.</p>
            <label class="permission-bulk"><span>Appliquer à toutes les sections</span><select data-permission-bulk aria-label="Appliquer un niveau à toutes les sections"><option value="">Choisir un niveau…</option>${catalog.levels.map(([value,label])=>'<option value="'+value+'">'+esc(label)+'</option>').join('')}</select></label>
            <fieldset class="permission-section-settings" ${policy.admin?'disabled':''}>
            <div class="permission-matrix">${catalog.sections.filter(([section])=>!securitySections.includes(section)).map(([section,name])=>{
              const current=policy.sections[section];
              return '<div class="permission-row" data-permission-section="'+esc(section)+'"><span class="permission-row-name">'+esc(name)+'</span><div class="permission-row-levels" role="group" aria-label="Niveau pour '+esc(name)+'">'+
                catalog.levels.map(([value,label])=>'<button type="button" data-section="'+esc(section)+'" data-level="'+value+'" aria-pressed="'+(current===value)+'">'+esc(label)+'</button>').join('')+
                '</div></div>';
            }).join('')}</div>
            ${embedded?'':securityHTML()}
            </fieldset>
            <details class="permission-advanced"><summary>Durée et motif du changement</summary><label>Fin des autorisations (facultatif)<input id="wgPermissionExpiry" type="datetime-local" value="${policy.expiresAt?new Date(policy.expiresAt-new Date(policy.expiresAt).getTimezoneOffset()*60000).toISOString().slice(0,16):''}"></label><label>Motif du changement<input id="wgPermissionReason" maxlength="500" placeholder="Ex. Accès temporaire pour une intervention"></label></details>
            </details>
            </div>
            ${embedded?'<div data-permission-pane="posts" hidden>'+securityHTML()+'</div>':''}
            <div class="permission-save-bar" hidden><div><span data-permission-draft role="status"></span><p>Les membres du groupe devront se reconnecter.</p></div><div class="actions"><button type="button" class="settings-btn" data-close-permissions>Annuler</button><button type="submit" class="settings-btn primary" id="wgPermissionSave" disabled>${saving?'Enregistrement…':'Enregistrer'}</button></div></div>
          </fieldset><p data-permission-error class="access-error" role="alert"></p></form>`;
        host.querySelectorAll('details').forEach(row=>{row.open=opened.has(row.querySelector('summary')?.textContent);});
        if(embedded)setView(root,host.dataset.view||'rights');else if(group){host.querySelector('#wgPermissionCustomization').open=true;const scope=host.querySelector('#wgPermissionAgentScope');if(scope)scope.open=true;}
        host.querySelectorAll('[data-close-permissions]').forEach(button=>button.onclick=()=>{if(saving)return;if(embedded||group){policy=structuredClone(user.permissions);reasonDraft='';host.querySelector('#wgPermissionReason').value='';savedMessage='';render();}else reset(root);});
        if(user.role==='admin')return;
        host.querySelector('#wgPermissionReason').value=reasonDraft;
        host.querySelector('#wgPermissionReason').oninput=dirty;
        host.querySelector('[data-permission-bulk]').onchange=event=>{if(event.target.value){setLevel(catalog.sections.map(([section])=>section),event.target.value);render();}};
        host.querySelectorAll('[data-permission-profile]').forEach(button=>button.onclick=()=>{const {groupLevels,expiresAt}=policy;policy={...model.profilePolicy(button.dataset.permissionProfile),groupLevels:groupLevels||{},expiresAt};savedMessage='';render('[data-permission-profile="'+button.dataset.permissionProfile+'"]');});
        host.querySelectorAll('[data-section]').forEach(button=>button.onclick=()=>{setLevel([button.dataset.section],button.dataset.level);render('[data-section="'+button.dataset.section+'"][data-level="'+button.dataset.level+'"]');});
        host.querySelectorAll('[data-security-level]').forEach(button=>button.onclick=()=>{setLevel(securitySections,button.dataset.securityLevel);render('[data-security-level="'+button.dataset.securityLevel+'"]');});
        host.querySelectorAll('[data-group-right-id]').forEach(button=>button.onclick=()=>{const id=button.dataset.groupRightId,level=button.dataset.groupLevel;policy.groupLevels={...policy.groupLevels,[id]:level};savedMessage='';render('[data-group-right-id="'+id+'"][data-group-level="'+level+'"]');});
        host.querySelector('#wgPermissionExpiry').onchange=event=>{policy.expiresAt=event.target.value?new Date(event.target.value).getTime():null;dirty();};
        host.querySelector('#wgPermissionForm').onsubmit=async event=>{
          event.preventDefault();if(saving)return;const error=host.querySelector('[data-permission-error]');
          if(policy.expiresAt!==null&&policy.expiresAt<=Date.now()){error.textContent='Choisis une date de fin future ou laisse ce champ vide.';return;}
          saving=true;host.dataset.saving='true';host.querySelector('fieldset').disabled=true;
          try{const saved=await WolfGuardCloud.agentRequest('users/groups/policy',{id:user.id,revision:user.permission_revision,policy:model.normalizePolicy(policy),reason:host.querySelector('#wgPermissionReason').value},{signal});if(saved.reconnect){await lockApplication();return;}if(!live())return;user={...user,permissions:model.normalizePolicy(policy),permission_revision:saved.revision};policy=structuredClone(user.permissions);initial=JSON.stringify(model.normalizePolicy(policy));reasonDraft='';host.querySelector('#wgPermissionReason').value='';savedMessage='Droits enregistrés. Les sessions des membres ont été déconnectées.';saving=false;host.dataset.saving='false';host.dataset.dirty='false';render();await onSaved(saved);}
          catch(problem){if(live()){error.textContent=problem.message;host.querySelector('fieldset').disabled=false;}}
          finally{saving=false;if(live()){host.dataset.saving='false';dirty();}}
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
        if(event.kind==='access-group')return '<article class="permission-audit"><strong>'+esc(event.user)+'</strong><small>'+esc(date(event.createdAt))+' · '+esc(event.actor)+'</small><p>Groupe d’autorisations · '+esc(({create:'Création',duplicate:'Duplication',rename:'Renommage',remove:'Suppression',assign:'Ajout de membres',unassign:'Retrait de membres',memberships:'Groupes appliqués',prepare:'Groupes par section préparés',reconcile:'Groupes de section synchronisés',policy:'Modification des droits'})[event.operation]||event.operation)+' · '+event.count+' membre(s)</p>'+(event.reason?'<p>'+esc(event.reason)+'</p>':'')+'</article>';
        if(event.kind==='fleet-group')return '<article class="permission-audit"><strong>Sections de postes</strong><small>'+esc(date(event.createdAt))+' · '+esc(event.actor)+'</small><p>'+esc(({create:'Section créée',duplicate:'Section dupliquée',rename:'Section renommée',remove:'Section supprimée',move:'Postes déplacés'})[event.operation]||event.operation)+(event.name?' : '+esc(event.name):'')+(event.count?' · '+event.count+' poste(s)':'')+'</p></article>';
        const summary=Object.entries(event.after.sections).filter(([section])=>event.before.sections[section]!==event.after.sections[section]).map(([section,level])=>section+' → '+level).join(', ');
        const scopeChanged=JSON.stringify(event.before.agents===null?null:[...(event.before.agents||[])].sort())!==JSON.stringify(event.after.agents===null?null:[...(event.after.agents||[])].sort());
        const scope=scopeChanged?' Postes autorisés : '+(event.after.agents===null?'tous les postes':(event.after.agents||[]).length+' poste(s) sélectionné(s)')+'.':'';
        const changedPosts=[...new Set([...Object.keys(event.before.agentLevels||{}),...Object.keys(event.after.agentLevels||{})])].filter(id=>(event.before.agentLevels?.[id]||'write')!==(event.after.agentLevels?.[id]||'write'));
        const changedGroups=[...new Set([...Object.keys(event.before.groupLevels||{}),...Object.keys(event.after.groupLevels||{})])].filter(id=>(event.before.groupLevels?.[id]??'deny')!==(event.after.groupLevels?.[id]??'deny'));
        const individual=changedGroups.length?' Droits modifiés pour '+changedGroups.length+' groupe(s).':changedPosts.length?' Ancien changement individuel : '+changedPosts.length+' poste(s).':'';
        return '<article class="permission-audit"><strong>'+esc(event.user)+'</strong><small>'+esc(date(event.createdAt))+' · '+esc(event.actor)+' · révision '+event.revision+'</small>'+(event.reason?'<p>'+esc(event.reason)+'</p>':'')+'<p>'+(event.after.admin?'Administrateur activé. ':event.before.admin?'Administrateur retiré. ':'')+(summary?'Niveaux modifiés : '+esc(summary)+'.':'Aucun changement de niveau commun.')+esc(scope+individual)+'</p></article>';
      }).join('')+(!result.events.length?'<p>Aucun changement de droits enregistré.</p>':'')+'</section>';
      host.querySelector('[data-close-audit]').onclick=()=>{reset(root);onClose?.();};host.scrollIntoView({block:'start'});
    }catch(error){if(!signal.aborted&&generation===editorGeneration)host.textContent=error.message;}
  }
  function reset(root){editorGeneration++;const host=hostFor(root);if(host){host.dataset.dirty='false';host.dataset.saving='false';host.replaceChildren();}}
  return {open,audit,reset,setView,isDirty:root=>hostFor(root)?.dataset.dirty==='true',isSaving:root=>hostFor(root)?.dataset.saving==='true'};
})();
