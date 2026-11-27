/* js/ui/workspace-groups.js */
'use strict';

const workspaceGroups=(()=>{
  let controller=null,leave=async()=>true;
  const request=(path='',value,signal)=>WolfGuardCloud.agentRequest('users/groups'+path,value,{signal});
  async function ensure(signal){
    await WolfGuardFleetGroups.create().load();
    let state=await request('',undefined,signal);
    if(!state.initialized&&WolfGuardCloud.isAdmin())state=await request('/bootstrap',{},signal);
    if(state.initialized&&!state.prepared&&WolfGuardCloud.isAdmin())state=await request('/prepare',{revision:state.revision},signal);
    if(!state.initialized)throw new Error('Le propriétaire doit ouvrir les paramètres Groupes pour initialiser les autorisations.');
    return state;
  }
  function unmount(){controller?.abort();controller=null;leave=async()=>true;}
  async function mount(root){
    unmount();controller=new AbortController();const signal=controller.signal;
    let state=null,users=[],selected=null,busy=false;
    const live=()=>!signal.aborted&&root.isConnected,find=selector=>root.querySelector(selector),editor=()=>window.WolfGuardPermissionEditor;
    root.classList.add('users-manager','groups-manager');
    root.innerHTML=`<header class="settings-panel-head"><div><div class="settings-heading">${settingsIcon('users')}<h3>Groupes</h3></div><p>Quelques groupes métier suffisent : ajoute les membres et règle leurs autorisations. Les droits automatiques restent dans les catégories avancées.</p></div><div class="actions"><button type="button" class="settings-btn" id="wgGroupsAudit">Journal des droits</button><button type="button" class="settings-btn" id="wgGroupsRefresh">Actualiser</button><button type="button" class="settings-btn primary" id="wgGroupCreate">Nouveau groupe</button></div></header><p id="wgGroupsMessage" role="status"></p><div class="users-management-layout access-groups-workspace"><aside class="users-directory"><label>Rechercher un groupe<input type="search" id="wgGroupsSearch" placeholder="Nom du groupe"></label><label>Catégorie<select id="wgGroupCategory"><option value="custom">Groupes métier</option><optgroup label="Avancé · Groupes automatiques"><option value="admin">Administrateurs</option><option value="section">Droits par section</option><option value="fleet">Droits des postes</option><option value="action">Droits par action</option><option value="all">Tous les groupes</option></optgroup></select></label><p id="wgGroupsCount" class="access-feedback"></p><div id="wgGroupsList" class="users-account-list"></div></aside><section class="users-detail" id="wgAccessGroupDetail"><header class="access-group-heading"><h4 id="wgGroupName"></h4><div class="actions"><button type="button" class="settings-btn" id="wgGroupRename">Renommer</button><button type="button" class="settings-btn" id="wgGroupDuplicate">Dupliquer</button><button type="button" class="settings-btn" id="wgGroupRemove">Supprimer</button></div></header><div id="wgGroupOverview" class="group-overview"></div><nav class="group-pane-tabs" role="tablist" aria-label="Gestion du groupe"><button type="button" role="tab" data-group-pane="members" aria-controls="wgGroupMembers">Membres</button><button type="button" role="tab" data-group-pane="links" aria-controls="wgGroupNesting">Groupes liés</button><button type="button" role="tab" data-group-pane="permissions" aria-controls="wgGroupPermissionHost">Autorisations</button><button type="button" role="tab" data-group-pane="effective" aria-controls="wgGroupEffective">Vérifier un accès</button></nav><details class="access-group-members" id="wgGroupMembers"><summary>Membres du groupe</summary><p>Un utilisateur peut appartenir à plusieurs groupes. Chaque changement déconnecte ses sessions.</p><div id="wgGroupMemberList"></div><div class="actions"><select id="wgGroupAddMember" aria-label="Ajouter un membre"></select><button type="button" class="settings-btn" id="wgGroupAssign">Ajouter au groupe</button></div></details><details class="access-group-members" id="wgGroupNesting"><summary>Groupes membres et appartenance</summary><p>Les membres d’un groupe inclus reçoivent les autorisations du groupe qui le contient.</p><h5>Groupes membres</h5><div id="wgGroupNestedList"></div><div class="actions"><select id="wgGroupAddNested" aria-label="Inclure un groupe"></select><button type="button" class="settings-btn" id="wgGroupNest">Inclure</button></div><h5>Membre de</h5><div id="wgGroupParentList"></div><div class="actions"><select id="wgGroupAddParent" aria-label="Ajouter à un groupe d’accès"></select><button type="button" class="settings-btn" id="wgGroupJoin">Ajouter à ce groupe</button></div></details><details class="access-group-members" id="wgGroupEffective"><summary>Accès effectifs d’un utilisateur</summary><div class="actions"><select id="wgGroupEffectiveUser" aria-label="Utilisateur à vérifier"></select><button type="button" class="settings-btn" id="wgGroupCheckEffective">Vérifier les accès</button></div><div id="wgGroupEffectiveResult" aria-live="polite"></div></details><div id="wgGroupPermissionHost" data-permission-host></div></section></div>`;
    let pane='members',category='custom';
    const panels={members:'wgGroupMembers',links:'wgGroupNesting',permissions:'wgGroupPermissionHost',effective:'wgGroupEffective'};
    function showPane(value){
      pane=value;
      for(const [name,id]of Object.entries(panels)){const panel=find('#'+id);panel.hidden=name!==pane;panel.setAttribute('role','tabpanel');if(panel.tagName==='DETAILS')panel.open=true;}
      root.querySelectorAll('[data-group-pane]').forEach(button=>{const active=button.dataset.groupPane===pane;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    }
    find('.group-pane-tabs').onclick=event=>{const button=event.target.closest('[data-group-pane]');if(button)showPane(button.dataset.groupPane);};
    find('.group-pane-tabs').onkeydown=event=>{const tabs=[...root.querySelectorAll('[data-group-pane]')],index=tabs.indexOf(event.target);if(index<0)return;const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;if(next!==null){event.preventDefault();showPane(tabs[next].dataset.groupPane);tabs[next].focus();}};
    for(const [id,label]of [['wgGroupAddMember','Rechercher un utilisateur'],['wgGroupAddNested','Rechercher un groupe à inclure'],['wgGroupAddParent','Rechercher un groupe d’accès'],['wgGroupEffectiveUser','Rechercher le compte à vérifier']]){
      const select=find('#'+id),input=document.createElement('input');input.type='search';input.placeholder=label;input.setAttribute('aria-label',label);input.className='group-selector-search';select.before(input);
      input.oninput=()=>{const query=input.value.trim().toLocaleLowerCase();for(const option of select.options)option.hidden=!!option.value&&!option.textContent.toLocaleLowerCase().includes(query);select.value=[...select.options].find(option=>option.value&&!option.hidden)?.value||'';};
    }
    showPane(pane);
    const message=(value,error=false)=>{if(live()){find('#wgGroupsMessage').textContent=value;find('#wgGroupsMessage').className=error?'access-error':'access-feedback';}};
    leave=async()=>{if(busy||editor()?.isSaving(root))return false;return !editor()?.isDirty(root)||await appConfirm('Quitter les modifications non enregistrées du groupe ?', {title:'Modifications en cours',confirmLabel:'Quitter sans enregistrer'});};
    const visibleGroups=()=>state.groups.filter(group=>(find('#wgGroupCategory').value==='all'||(group.presetKind||'custom')===find('#wgGroupCategory').value)&&group.name.toLocaleLowerCase().includes(find('#wgGroupsSearch').value.trim().toLocaleLowerCase()));
    function list(){
      const custom=state.groups.filter(group=>!group.preset).length;find('#wgGroupsCount').textContent=custom+' groupe(s) métier · '+(state.groups.length-custom)+' automatique(s) en vue avancée';
      find('#wgGroupsList').innerHTML=visibleGroups().map(group=>'<button type="button" class="user-card users-account-row" data-access-group="'+esc(group.id)+'" aria-pressed="'+(selected===group.id)+'"><span class="users-account-copy"><strong>'+esc(group.name)+'</strong><small>'+group.memberIds.length+' membre(s) direct(s) · '+(group.effectiveMemberIds||group.memberIds).length+' effectif(s)</small></span></button>').join('')||'<p class="access-empty">Aucun groupe métier ici. Crée un groupe pour ton équipe ou choisis une catégorie avancée.</p>';
    }
    async function select(id){
      if(!live()||busy||!await leave()||!live())return;
      const group=state.groups.find(group=>group.id===id);if(!group)return;
      selected=id;find('#wgAccessGroupDetail').hidden=false;editor().reset(root);list();find('#wgGroupName').textContent=group.name;find('#wgAccessGroupDetail').scrollTop=0;requestAnimationFrame(()=>{if(live())root.style.setProperty('--group-heading-height',find('.access-group-heading').offsetHeight+'px');});
      find('#wgGroupOverview').innerHTML='<span class="group-kind">'+(group.preset?'Groupe d’accès automatique':'Groupe métier')+'</span><span><b>'+group.memberIds.length+'</b> membre(s) direct(s)</span><span><b>'+(group.effectiveMemberIds||group.memberIds).length+'</b> membre(s) effectif(s)</span>';
      root.querySelectorAll('.group-selector-search').forEach(input=>{input.value='';});showPane(pane);
      for(const name of ['Rename','Remove'])find('#wgGroup'+name).disabled=!!group.preset;
      find('#wgGroupMemberList').innerHTML=users.filter(user=>group.memberIds.includes(user.id)).map(user=>'<div class="access-group-member"><span>'+esc(user.username)+'</span><button type="button" class="settings-btn" data-remove-group-member="'+esc(user.id)+'">Retirer</button></div>').join('')||'<p>Aucun membre.</p>';
      find('#wgGroupAddMember').innerHTML='<option value="">Choisir un utilisateur…</option>'+users.filter(user=>user.role!=='admin'&&!group.memberIds.includes(user.id)).map(user=>'<option value="'+esc(user.id)+'">'+esc(user.username)+'</option>').join('');
      find('#wgGroupAssign').disabled=find('#wgGroupAddMember').options.length<2;
      const names=ids=>state.groups.filter(row=>ids.includes(row.id));
      find('#wgGroupNestedList').innerHTML=names(group.includedGroupIds||[]).map(row=>'<div class="access-group-member"><span>'+esc(row.name)+'</span><button type="button" class="settings-btn" data-remove-nested="'+esc(row.id)+'">Retirer</button></div>').join('')||'<p>Aucun groupe inclus.</p>';
      find('#wgGroupParentList').innerHTML=names(group.parentGroupIds||[]).map(row=>'<div class="access-group-member"><span>'+esc(row.name)+'</span><button type="button" class="settings-btn" data-remove-parent="'+esc(row.id)+'">Retirer l’appartenance</button></div>').join('')||'<p>Aucune appartenance.</p>';
      function options(selector,ids){find(selector).innerHTML='<option value="">Choisir un groupe…</option>'+state.groups.filter(row=>row.id!==group.id&&!ids.includes(row.id)).map(row=>'<option value="'+esc(row.id)+'">'+esc(row.name)+'</option>').join('');}
      options('#wgGroupAddNested',group.includedGroupIds||[]);options('#wgGroupAddParent',group.parentGroupIds||[]);
      find('#wgGroupEffectiveUser').innerHTML='<option value="">Choisir un utilisateur…</option>'+users.map(user=>'<option value="'+esc(user.id)+'">'+esc(user.username)+'</option>').join('');
      find('#wgGroupEffectiveResult')?.replaceChildren();
      const inherited=users.filter(user=>(group.effectiveMemberIds||[]).includes(user.id)&&!group.memberIds.includes(user.id));
      if(inherited.length)find('#wgGroupMemberList').insertAdjacentHTML('beforeend','<h5>Membres par imbrication</h5>'+inherited.map(user=>'<p>'+esc(user.username)+' <small>· hérité des groupes membres</small></p>').join(''));

      if(group.preset){find('#wgGroupPermissionHost').innerHTML='<section class="access-group-preset"><h5>Groupe automatique</h5><p>'+(group.presetKind==='admin'?'Accès administrateur complet à l’application.':group.presetKind==='action'?'Autorisation : '+esc(group.actionLabel)+'. La consultation de la section est incluse.':group.presetKind==='fleet'?'Accès '+(group.level==='write'?'en écriture':'en lecture')+' à la section de postes correspondante.':'Accès '+(group.level==='write'?'en écriture':'en lecture')+' à cette section de l’application.')+'</p><small>Son nom et ses droits suivent automatiquement la section. Gère ses membres et ses groupes inclus.</small></section>';return;}
      await editor().open(root,{id:group.id,username:group.name,role:'member',permissions:group.policy,permission_revision:state.revision},{signal,group:true,onSaved:async result=>{state=result;list();message('Droits du groupe enregistrés pour tous ses membres.');}});
    }
    async function refresh(){
      if(busy||!await leave())return;
      try{const values=await Promise.all([ensure(signal),WolfGuardCloud.agentRequest('users',undefined,{signal})]);if(!live())return;state=values[0];users=values[1].users;editor().reset(root);const rows=visibleGroups(),id=rows.some(group=>group.id===selected)?selected:rows[0]?.id;if(id)await select(id);else{selected=null;find('#wgAccessGroupDetail').hidden=true;list();}message('');}catch(error){message(error.message,true);}
    }
    async function change(operation,value,success){
      if(busy||!state||!await leave())return;busy=true;const controls=new Map([...root.querySelectorAll('button,input,select')].map(element=>[element,element.disabled]));for(const element of controls.keys())element.disabled=true;find('#wgAccessGroupDetail').setAttribute('aria-busy','true');
      try{const result=await request('/'+operation,{...value,revision:state.revision},signal);if(!live())return;if(result.reconnect){await lockApplication();return;}if(['create','duplicate'].includes(operation)){find('#wgGroupCategory').value='custom';selected=result.groups.find(group=>!state.groups.some(old=>old.id===group.id))?.id||selected;}state=result;editor().reset(root);busy=false;const next=visibleGroups().find(group=>group.id===selected)||visibleGroups()[0];if(next)await select(next.id);else{selected=null;find('#wgAccessGroupDetail').hidden=true;list();}message(success);}catch(error){message(error.message,true);}finally{busy=false;for(const [element,disabled]of controls)if(element.isConnected)element.disabled=disabled;if(live())find('#wgAccessGroupDetail').removeAttribute('aria-busy');}
    }
    find('#wgGroupNest').onclick=()=>{const id=find('#wgGroupAddNested').value;if(id)change('nest',{id:selected,groupIds:[id]},'Groupe inclus. Les membres héritent des autorisations.');};
    find('#wgGroupJoin').onclick=()=>{const id=find('#wgGroupAddParent').value;if(id)change('nest',{id,groupIds:[selected]},'Appartenance ajoutée au groupe d’accès.');};
    find('#wgGroupNestedList').onclick=event=>{const button=event.target.closest('[data-remove-nested]');if(button)change('unnest',{id:selected,groupIds:[button.dataset.removeNested]},'Groupe retiré.');};
    find('#wgGroupParentList').onclick=event=>{const button=event.target.closest('[data-remove-parent]');if(button)change('unnest',{id:button.dataset.removeParent,groupIds:[selected]},'Appartenance retirée.');};
    find('#wgGroupCheckEffective').onclick=async()=>{
      const userId=find('#wgGroupEffectiveUser').value;if(!userId||busy)return;const button=find('#wgGroupCheckEffective');button.disabled=true;
      try{const result=await request('/effective?userId='+encodeURIComponent(userId),undefined,signal);if(!live()||find('#wgGroupEffectiveUser').value!==userId)return;
        find('#wgGroupEffectiveResult').innerHTML=(result.owner?'<p>Propriétaire protégé · tous les droits.</p>':'<p>'+result.groups.map(group=>esc(group.name)+' <small>('+(group.expired?'expiré':group.direct?'direct':'hérité')+')</small>').join(', ')+'</p>')+'<div class="permission-action-list">'+result.actions.map(action=>'<div class="permission-action-row" data-effective-action="'+esc(action.key)+'" data-allowed="'+action.allowed+'"><span><strong>'+esc(action.sectionLabel)+' · '+esc(action.label)+'</strong><small>'+esc(action.sources.map(source=>source.name+(source.effect==='deny'?' (refus)':'')).join(', ')||'Aucun groupe autorisant cette action')+'</small></span><strong>'+(result.owner?'Autorisé':action.denied?'Refus explicite':action.allowed?'Autorisé':'Non accordé')+'</strong></div>').join('')+'</div><h5>Périmètre des postes</h5>'+result.fleet.map(section=>'<p>'+esc(section.name)+' : '+esc(({read:'Lecture',write:'Écriture',deny:'Aucun accès'})[section.level])+'</p>').join('');
      }catch(error){message(error.message,true);}finally{if(button.isConnected)button.disabled=false;}
    };
    find('#wgGroupCategory').onchange=async()=>{if(!state)return;if(!await leave()){find('#wgGroupCategory').value=category;return;}category=find('#wgGroupCategory').value;editor().reset(root);const next=visibleGroups()[0];if(next)await select(next.id);else{find('#wgAccessGroupDetail').hidden=true;list();}};
    find('#wgGroupsSearch').oninput=()=>{if(state)list();};
    find('#wgGroupsList').onclick=event=>{const button=event.target.closest('[data-access-group]');if(button)select(button.dataset.accessGroup);};
    find('#wgGroupsRefresh').onclick=refresh;
    find('#wgGroupsAudit').onclick=async()=>{
      if(!await leave())return;
      const previousPane=pane;editor().reset(root);find('#wgAccessGroupDetail').hidden=false;showPane('permissions');
      await editor().audit(root,{signal,onClose:()=>{showPane(previousPane);if(selected)select(selected);else find('#wgAccessGroupDetail').hidden=true;}});
    };
    find('#wgGroupCreate').onclick=async()=>{const name=await appPrompt('Nom du groupe','',{title:'Nouveau groupe',confirmLabel:'Créer'});if(name!==null)await change('create',{name},'Groupe métier créé sans droits. Ajoute ses utilisateurs, puis rends-le membre des groupes d’accès nécessaires.');};
    find('#wgGroupRename').onclick=async()=>{const group=state.groups.find(group=>group.id===selected),name=await appPrompt('Nom du groupe',group.name,{title:'Renommer',confirmLabel:'Enregistrer'});if(name!==null)await change('rename',{id:selected,name},'Groupe renommé.');};
    find('#wgGroupDuplicate').onclick=async()=>{const group=state.groups.find(group=>group.id===selected),name=await appPrompt('Nom de la copie',group.name+' (copie)',{title:'Dupliquer le groupe',confirmLabel:'Créer'});if(name!==null)await change('duplicate',{id:selected,name},'Groupe dupliqué avec ses droits, sans membres.');};
    find('#wgGroupRemove').onclick=async()=>{if(await appConfirm('Supprimer ce groupe vide ?',{title:'Supprimer le groupe',confirmLabel:'Supprimer'}))await change('remove',{id:selected},'Groupe supprimé.');};
    find('#wgGroupAssign').onclick=()=>{const id=find('#wgGroupAddMember').value;if(id)change('assign',{id:selected,userIds:[id]},'Membre ajouté. Ses droits sont hérités du groupe.');};
    find('#wgGroupMemberList').onclick=event=>{const button=event.target.closest('[data-remove-group-member]');if(button)change('unassign',{id:selected,userIds:[button.dataset.removeGroupMember]},'Membre retiré de ce groupe. Ses autres groupes restent actifs.');};
    await refresh();
  }
  return {mount,unmount,ensure,beforeLeave:()=>leave()};
})();

;
/* js/search/engine.js */
'use strict';

// MiniSearch is bundled locally: the index never leaves this browser session.
window.WorkspaceSearch = class WorkspaceSearch {
  static aliases = {
    cp: 'checkpoint',
    nxos: 'nexus',
    n2k: 'fex',
    h5: 'f5',
    authentificator: 'authenticator',
    fortios: 'fortigate',
    ad: 'activedirectory',
    ztsa: 'ztna',
    interfaces: 'interface',
    vlans: 'vlan',
    routes: 'route',
    logs: 'log',
    sauvegardes: 'backup',
    sauvegarde: 'backup',
    parefeu: 'firewall',
    routage: 'routing',
    commutateur: 'switch',
    commutateurs: 'switch',
    reseaux: 'reseau'
  };
  constructor(options) {
    this.options = options;
    this.input = document.getElementById('globalSearch');
    this.box = document.getElementById('searchResults');
    this.clear = document.getElementById('clearGlobalSearch');
    this.scope = 'all';
    this.revision = 0;
    this.request = 0;
    this.cache = null;
    this.resultCache = new Map();
    this.pending = null;
    this.rows = [];
    this.selected = -1;
    this.limit = 20;
    this.timer = null;
    this.input.oninput = () => this.schedule();
    this.input.onfocus = () => this.search(this.input.value);
    this.input.onclick = () => {
      if (this.box.hidden) this.search(this.input.value);
    };
    this.input.onkeydown = event => this.onKey(event);
    this.input.addEventListener('compositionstart', () => {
      this.composing = true;
      clearTimeout(this.timer);
    });
    this.input.addEventListener('compositionend', () => {
      this.composing = false;
      this.schedule();
    });
    this.clear.onclick = () => {
      this.input.value = '';
      this.input.focus();
      this.search('');
    };
    this.box.onclick = event => {
      const result = event.target.closest('[data-search-index]');
      if (result) return this.open(Number(result.dataset.searchIndex));
      const suggestion = event.target.closest('[data-search-suggestion]');
      if (suggestion) {
        this.input.value = suggestion.dataset.searchSuggestion;
        this.input.focus();
        this.search(this.input.value);
      }
      if (event.target.closest('[data-search-more]')) {
        this.limit += 20;
        this.render();
      }
    };
    this.box.onchange = event => {
      if (event.target.id !== 'globalSearchScope') return;
      this.scope = event.target.value;
      this.search(this.input.value);
    };
    this.box.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.input.focus();
        this.hide();
      }
    });
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && this.options.isUnlocked() && !document.querySelector('#modalRoot > *')) {
        event.preventDefault();
        this.input.focus();
        this.input.select();
        this.search(this.input.value);
      }
    });
    document.addEventListener('focusin', event => {
      if (!event.target.closest('.search')) this.hide();
    });
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    this.hide();
  }

  static fold(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  static canonical(value) {
    return this.fold(value)
      .replace(/\bcheck[ -]+point\b/g, 'checkpoint')
      .replace(/\bnx[ -]?os\b/g, 'nexus')
      .replace(/\bfabric[ -]+extender\b/g, 'fex')
      .replace(/\bnexus[ -]+2000\b/g, 'fex')
      .replace(/\bios[ -]?xe\b/g, 'catalyst')
      .replace(/\bactive[ -]+directory\b/g, 'activedirectory')
      .replace(/\bforti[ -]+(gate|web|client)\b/g, 'forti$1')
      .replace(/\bvision[ -]+one\b/g, 'visionone')
      .replace(/\befficient[ -]+ip\b/g, 'efficientip')
      .replace(/\btipping[ -]+point\b/g, 'tippingpoint')
      .replace(/\bcatalyst[ -]+center\b/g, 'dna')
      .replace(/\bpare[ -]+feu\b/g, 'firewall')
      .replace(/\bwi[ -]+fi\b/g, 'wifi');
  }

  static tokens(value) {
    return this.canonical(value).match(/[a-z0-9]+(?:[._-][a-z0-9]+)*/g) || [];
  }

  static term(value) {
    const term = WorkspaceSearch.fold(value);
    return WorkspaceSearch.aliases[term] || term;
  }

  static plain(value, html = false) {
    if (!html || !/[<&]/.test(String(value ?? ''))) return String(value ?? '').replace(/\s+/g, ' ').trim();
    // Parse in an inert template, without loading images or executing markup.
    const template = document.createElement('template');
    template.innerHTML = String(value ?? '');
    template.content.querySelectorAll('script,style,template,noscript,iframe,object').forEach(node => node.remove());
    template.content.querySelectorAll('br,p,div,li,tr,td,th,h1,h2,h3,h4,pre,blockquote').forEach(node => node.appendChild(document.createTextNode(' ')));
    return (template.content.textContent || '').replace(/\s+/g, ' ').trim();
  }

  static fingerprint(item) {
    const fields = [item.type, item.title, item.folderId, item.tags, item.deletedAt];
    if (item.type !== 'vault') fields.push(item.facets, item.commandBlocks, item.documentType, item.content, item.description, item.context, item.example, item.vendor, item.platform,
      (item.attachments || []).map(attachment => attachment.name),
      item.protocol?.service, item.protocol?.port, item.protocol?.transport, item.protocol?.usage, item.protocol?.security);
    return JSON.stringify(fields);
  }

  invalidate(store, item) {
    const existing = store === 'items' && item ? this.cache?.documents.get(item.id) : null;
    if (existing && existing.fingerprint === WorkspaceSearch.fingerprint(item)) {
      this.resultCache.clear();
      existing.favorite = !!item.favorite;
      existing.updatedAt = item.updatedAt || item.createdAt || '';
      return;
    }
    this.revision++;
    this.resultCache.clear();
    this.cache = null;
    this.hide();
  }

  reset() {
    this.invalidate();
    this.input.value = '';
    this.scope = 'all';
    this.clear.hidden = true;
  }

  hide() {
    clearTimeout(this.timer);
    this.request++;
    this.box.hidden = true;
    this.box.classList.add('hidden');
    this.box.replaceChildren();
    this.rows = [];
    this.selected = -1;
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
    this.input.removeAttribute('aria-busy');
  }

  schedule() {
    this.request++;
    clearTimeout(this.timer);
    this.clear.hidden = !this.input.value;
    // Never leave results from the previous query actionable while typing.
    this.rows = [];
    this.box.querySelector('#globalSearchList')?.replaceChildren();
    this.input.removeAttribute('aria-activedescendant');
    if (!this.composing) this.timer = setTimeout(() => this.search(this.input.value), 75);
  }

  async index() {
    if (this.cache) return this.cache;
    if (this.pending?.revision === this.revision) return this.pending.promise;
    const revision = this.revision;
    const promise = (async () => {
      const items = await this.options.readItems();
      const folders = new Map((await this.options.readFolders()).map(folder => [folder.id, folder]));
      const documents = new Map();
      const engine = new MiniSearch({
        fields: ['title', 'technology', 'keywords', 'port', 'path', 'body'],
        storeFields: ['title','path','port'],
        tokenize: text => WorkspaceSearch.tokens(text),
        processTerm: term => WorkspaceSearch.term(term),
        searchOptions: {
          combineWith: 'AND',
          boost: {
            title: 10,
            technology: 6,
            keywords: 4,
            port: 12,
            path: 5,
            body: 1
          },
          prefix: term => term.length >= 2 && !/^\d/.test(term),
          fuzzy: term => /^[a-z][a-z-]{3,}$/.test(term) ? (term.length >= 8 ? 2 : 1) : false,
          maxFuzzy: 2,
          weights: {
            fuzzy: 0.35,
            prefix: 0.7
          }
        }
      });
      for (let offset = 0; offset < items.length; offset += 60) {
        if (revision !== this.revision || !this.options.isUnlocked()) throw new DOMException('Search cancelled', 'AbortError');
        const batch = [];
        for (const item of items.slice(offset, offset + 60)) {
          if (item.deletedAt) continue;
          const path = [],
            seen = new Set();
          let folder = folders.get(item.folderId);
          while (folder && !seen.has(folder.id)) {
            if (item.type === 'vault' && folder.systemVaultHome) break;
            seen.add(folder.id);
            path.unshift(String(folder.name || ''));
            folder = folders.get(folder.parentId);
          }
          const vault = item.type === 'vault';
          const rich = !vault && item.type !== 'command';
          const title = String(item.title || 'Sans titre');
          const tags = (item.tags || []).filter(tag => typeof tag === 'string').join(' ');
          const technology = [path.join(' / '), vault ? '' : item.vendor, vault ? '' : item.platform].filter(Boolean).join(' ');
          const protocol = item.type === 'protocol' ? this.options.protocolMetadata(item) : null;
          const body = vault ? '' : [
            (sectionForItem(item) === 'library' ? libraryText(item) : WorkspaceSearch.plain(item.content, rich)), WorkspaceSearch.plain(item.description, true),
            WorkspaceSearch.plain(item.context, true), WorkspaceSearch.plain(item.example, true), protocol?.usage, protocol?.security
          ].filter(Boolean).join(' ');
          const document = {
            id: item.id,
            type: item.type,
            facets: sectionForItem(item) === 'library' ? libraryFacets(item) : [],
            section: this.options.sectionForItem(item),
            title,
            technology,
            body,
            path: path.join(' / '),
            port: String(protocol?.port || ''),
            keywords: [tags, protocol?.service, protocol?.transport, vault ? '' : (item.attachments || []).map(attachment => attachment.name).join(' ')].filter(Boolean).join(' '),
            pathIndexed: path.join(' / '),
            favorite: !!item.favorite,
            updatedAt: item.updatedAt || item.createdAt || '',
            fingerprint: WorkspaceSearch.fingerprint(item),
            titleFold: WorkspaceSearch.canonical(title),
            technologyTerms: WorkspaceSearch.tokens(technology).map(WorkspaceSearch.term)
          };
          documents.set(item.id, document);
          batch.push(document);
        }
        engine.addAll(batch);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      // Settings tabs are searchable too; opening one shows that tab.
      const settingsDocuments = (this.options.settingsEntries?.() || []).map(entry => ({
        id: 'settings:' + entry.tab, type: 'setting', facets: [], section: 'settings', title: entry.title, technology: '', body: entry.keywords,
        path: 'Paramètres', port: '', keywords: entry.keywords, pathIndexed: 'Paramètres', favorite: false, updatedAt: '',
        fingerprint: 'settings:' + entry.tab, titleFold: WorkspaceSearch.canonical(entry.title), technologyTerms: []
      }));
      for (const document of settingsDocuments) documents.set(document.id, document);
      engine.addAll(settingsDocuments);
      if (revision !== this.revision) throw new DOMException('Search cancelled', 'AbortError');
      const cache = {
        engine,
        documents
      };
      this.cache = cache;
      return cache;
    })();
    this.pending = {
      revision,
      promise
    };
    try {
      return await promise;
    } finally {
      if (this.pending?.promise === promise) this.pending = null;
    }
  }

  parse(query) {
    const types = {
      commande: 'command',
      commandes: 'command',
      command: 'command',
      memo: 'memo',
      memos: 'memo',
      note: 'memo',
      procedure: 'memo',
      perso: 'personal',
      personnel: 'personal',
      personnelle: 'personal',
      personal: 'personal',
      protocole: 'protocol',
      protocoles: 'protocol',
      protocol: 'protocol',
      coffre: 'vault',
      vault: 'vault',
      template: 'template',
      templates: 'template',
      mail: 'template',
      rapport: 'template'
    };
    const filters = {
      types: [],
      tech: [],
      ports: [],
      phrases: []
    };
    let text = query.trim().slice(0, 200);
    text = text.replace(/\b(type|tech|port):(?:"([^"]+)"|([^\s]+))/gi, (whole, key, quoted, single) => {
      const value = quoted || single;
      if (key.toLowerCase() === 'type') {
        const type = types[WorkspaceSearch.fold(value)];
        if (!type) return whole;
        filters.types.push(type);
      } else if (key.toLowerCase() === 'tech') filters.tech.push(...WorkspaceSearch.tokens(value).map(WorkspaceSearch.term));
      else filters.ports.push(value);
      return ' ';
    });
    text = text.replace(/"([^"]+)"/g, (whole, phrase) => {
      filters.phrases.push(WorkspaceSearch.fold(phrase));
      return phrase;
    });
    const stop = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'ou', 'pour', 'sur', 'dans', 'avec', 'comment', 'quel', 'quelle', 'quels', 'quelles', 'je', 'veux', 'voir', 'afficher', 'trouver', 'est', 'ce', 'que', 'moi', 'mes']);
    let terms = [...new Set(WorkspaceSearch.tokens(text).map(WorkspaceSearch.term).filter(term => !stop.has(term)))];
    const intents = {
      commande: 'command',
      commandes: 'command',
      memo: 'memo',
      memos: 'memo',
      template: 'template',
      templates: 'template'
    };
    if (!filters.phrases.length && !filters.types.length && terms.length > 1 && intents[terms[0]]) {
      filters.types.push(intents[terms.shift()]);
    }
    return {
      text,
      terms,
      filters
    };
  }

  matches(document, parsed) {
    const filters = parsed.filters;
    if (this.scope !== 'all' && (document.section === 'settings' ? 'settings' : primarySectionFor(document.section)) !== this.scope) return false;
    if (filters.types.some(type => ['command', 'memo', 'template', 'personal'].includes(type) ? !(document.facets || []).includes(type === 'personal' ? 'reference' : type) : document.section !== type)) return false;
    if (filters.ports.some(port => !document.port.split(/[^\d]+/).includes(port))) return false;
    if (filters.tech.some(term => !document.technologyTerms.some(word => word === term || (term.length >= 2 && !/^\d/.test(term) && word.startsWith(term))))) return false;
    if (!filters.phrases.length) return true;
    const plain = WorkspaceSearch.fold([document.title, document.technology, document.keywords, document.body].join(' '));
    return filters.phrases.every(phrase => plain.includes(phrase));
  }

  find(cache, parsed) {
    const key=JSON.stringify([this.revision,this.scope,parsed]);
    if(this.resultCache.has(key))return this.resultCache.get(key);
    const rows = parsed.terms.length ? cache.engine.search(parsed.terms.join(' ')) : [...cache.documents.keys()].map(id => ({
      id,
      score: 0,
      terms: []
    }));
    const phrase = WorkspaceSearch.canonical(parsed.text).trim();
    const ranked=rows.map(row => {
      const document = cache.documents.get(row.id);
      const titleTerms = WorkspaceSearch.tokens(document.title).map(WorkspaceSearch.term);
      const pathTerms = WorkspaceSearch.tokens(document.path || '').map(WorkspaceSearch.term);
      let score = row.score;
      if (phrase && document.titleFold === phrase) score += 5000;
      else if (phrase && document.titleFold.includes(phrase)) score += 500;
      if (parsed.terms.length && parsed.terms.every(term => titleTerms.includes(term))) score += 150;
      if (parsed.terms.length > 1) {
        // Proximity boost: every term found inside the folder path means the
        // entry is a strong structural match (like navigating the tree).
        const pathHits = parsed.terms.filter(term => pathTerms.includes(term)).length;
        score += pathHits * 60;
      }
      if (document.favorite) score += 40;
      if (parsed.terms.length === 1 && /^\d+$/.test(parsed.terms[0]) && document.port.split(/[^\d]+/).includes(parsed.terms[0])) score += 1000;
      return {
        ...row,
        document,
        score
      };
    }).filter(row => this.matches(row.document, parsed)).sort((a, b) => b.score - a.score || Number(b.document.favorite) - Number(a.document.favorite) || a.document.title.localeCompare(b.document.title, 'fr'));
    this.resultCache.set(key,ranked);if(this.resultCache.size>30)this.resultCache.delete(this.resultCache.keys().next().value);return ranked;
  }

  async search(query) {
    clearTimeout(this.timer);
    const request = ++this.request;
    if (!this.options.isUnlocked()) return this.hide();
    const revision = this.revision;
    this.clear.hidden = !this.input.value;
    this.input.setAttribute('aria-busy', 'true');
    try {
      const cache = await this.index();
      let parsed = this.parse(String(query || ''));
      const recent = !String(query || '').trim();
      let rows = this.find(cache, parsed),
        label = '';
      if (recent) {
        const activity = (await this.options.readActivity()).sort((a, b) => String(b.at).localeCompare(String(a.at)));
        const byId = new Map(rows.map(row => [row.id, row])),
          seen = new Set();
        rows = activity.filter(entry => byId.has(entry.itemId) && !seen.has(entry.itemId) && seen.add(entry.itemId)).map(entry => byId.get(entry.itemId)).slice(0, 10);
        label = 'R\u00e9cents';
        if (!rows.length) {
          rows = this.find(cache, parsed).filter(row => row.document.favorite).slice(0, 10);
          label = 'Favoris';
        }
        if (!rows.length) {
          rows = this.find(cache, parsed).sort((a, b) => b.document.updatedAt.localeCompare(a.document.updatedAt)).slice(0, 10);
          label = 'Biblioth\u00e8que';
        }
      }
      if (request !== this.request || revision !== this.revision || !this.options.isUnlocked()) return;
      this.rows = rows;
      this.parsed = parsed;
      this.label = label;
      this.limit = 20;
      this.selected = rows.length ? 0 : -1;
      this.suggestions = !rows.length && parsed.terms.length && !parsed.filters.phrases.length ? cache.engine.autoSuggest(parsed.terms.join(' '), {
        fuzzy: 0.2,
        maxFuzzy: 1,
        filter: result => this.matches(cache.documents.get(result.id), parsed)
      }).slice(0, 3).map(suggestion => suggestion.suggestion) : [];
      this.render();
    } catch (error) {
      if (error.name === 'AbortError' || request !== this.request) return;
      console.error('Workspace search:', error);
      this.rows = [];
      this.selected = -1;
      this.box.innerHTML = '<div class="search-empty" role="status">Recherche indisponible. Recharge la page.</div>';
      this.show();
    } finally {
      if (request === this.request) this.input.removeAttribute('aria-busy');
    }
  }

  highlight(text, terms) {
    const matches = new Set(terms);
    let last = 0,
      html = '';
    for (const match of String(text).matchAll(/[\p{L}\p{N}]+(?:[._-][\p{L}\p{N}]+)*/gu)) {
      html += this.options.escape(text.slice(last, match.index));
      const token = WorkspaceSearch.term(WorkspaceSearch.canonical(match[0]));
      const matched = matches.has(token) || [...matches].some(term => term.length >= 2 && !/^\d/.test(term) && token.startsWith(term));
      const word = this.options.escape(match[0]);
      html += matched ? '<mark>' + word + '</mark>' : word;
      last = match.index + match[0].length;
    }
    return html + this.options.escape(text.slice(last));
  }

  snippet(document, terms) {
    if (!document.body) return '';
    const body = document.body,
      folded = WorkspaceSearch.canonical(body);
    const positions = terms.map(term => folded.indexOf(term)).filter(position => position >= 0);
    const start = Math.max(0, (positions.length ? Math.min(...positions) : 0) - 45);
    const snippet = (start ? '\u2026' : '') + body.slice(start, start + 180) + (body.length > start + 180 ? '\u2026' : '');
    return this.highlight(snippet, terms);
  }

  render() {
    const escape = this.options.escape;
    const scopes = {
      all: 'Tout',
      library: 'Mes fiches',
      vault: 'Coffre-fort',
      tools: 'Outils',
      settings: 'Paramètres'
    };
    const count = this.rows.length;
    const status = this.label || `${count} r\u00e9sultat${count === 1 ? '' : 's'}`;
    const previousScroll = this.box.querySelector('.search-list')?.scrollTop || 0;
    const focusedScope = document.activeElement?.id === 'globalSearchScope';
    this.box.innerHTML = `<div class="search-toolbar"><span id="globalSearchStatus" role="status" aria-live="polite">${escape(status)}</span><select id="globalSearchScope" aria-label="Filtrer la recherche par section">${Object.entries(scopes).map(([value,label]) => `<option value="${value}" ${value === this.scope ? 'selected' : ''}>${escape(label)}</option>`).join('')}</select></div>
      <div id="globalSearchList" class="search-list" role="listbox" aria-label="R\u00e9sultats de recherche">${this.rows.slice(0,this.limit).map((row,index) => {
        const document = row.document, terms = [...new Set([...(row.terms || []), ...this.parsed.terms])];
        const snippet = this.snippet(document, terms);
        return `<div id="global-search-option-${index}" class="search-result ${index === this.selected ? 'is-active' : ''}" role="option" aria-selected="${index === this.selected}" data-search-index="${index}"><span class="search-type-icon search-type-${document.section}">${this.options.icon(document.section)}</span><div class="search-result-copy"><div class="search-result-title">${this.highlight(document.title, terms)}</div><div class="search-result-meta"><span>${escape(this.options.typeLabel(document.type))}</span>${document.path ? `<span class="search-result-path">${this.highlight(document.path, terms)}</span>` : ''}</div>${snippet ? `<div class="search-snippet ${document.section === 'command' ? 'search-command-snippet' : ''}">${snippet}</div>` : ''}</div><span class="search-open-icon">${this.options.icon('open')}</span></div>`;
      }).join('')}${!count ? '<div class="search-empty">Aucun r\u00e9sultat</div>' : ''}</div>
      ${this.suggestions?.length ? `<div class="search-suggestions"><span>Suggestions</span>${this.suggestions.map(suggestion => `<button type="button" data-search-suggestion="${escape(suggestion)}">${escape(suggestion)}</button>`).join('')}</div>` : ''}
      ${count > this.limit ? `<button type="button" class="search-more" data-search-more>Afficher plus <span>${Math.min(this.limit,count)} / ${count}</span></button>` : ''}`;
    this.box.querySelector('.search-list').scrollTop = previousScroll;
    this.show();
    this.select(this.selected, false);
    if (focusedScope) this.box.querySelector('#globalSearchScope').focus();
  }

  show() {
    this.box.hidden = false;
    this.box.classList.remove('hidden');
    this.input.setAttribute('aria-expanded', 'true');
    this.resize();
  }

  resize() {
    if (this.box.hidden) return;
    const viewport = window.visualViewport;
    const bottom = viewport ? viewport.offsetTop + viewport.height : innerHeight;
    const top = this.input.closest('.search').getBoundingClientRect().bottom + 8;
    this.box.style.setProperty('--search-space', Math.max(80, bottom - top - 12) + 'px');
  }

  select(index, scroll = true) {
    this.selected = index;
    this.box.querySelectorAll('[data-search-index]').forEach(row => {
      const selected = Number(row.dataset.searchIndex) === index;
      row.classList.toggle('is-active', selected);
      row.setAttribute('aria-selected', String(selected));
    });
    const active = document.getElementById('global-search-option-' + index);
    if (active) {
      this.input.setAttribute('aria-activedescendant', active.id);
      if (scroll) active.scrollIntoView({
        block: 'nearest'
      });
    } else this.input.removeAttribute('aria-activedescendant');
  }

  onKey(event) {
    if (this.composing || event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.hide();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (this.box.hidden) {
      this.search(this.input.value);
      return;
    }
    if (event.key === 'Enter') {
      if (this.rows.length) this.open(this.selected);
      return;
    }
    if (!this.rows.length) return;
    const index = Math.max(0, Math.min(this.rows.length - 1, this.selected + (event.key === 'ArrowDown' ? 1 : -1)));
    if (index >= this.limit) {
      this.limit += 20;
      this.render();
    }
    this.select(index);
  }

  open(index) {
    const row = this.rows[index];
    if (!row || !this.options.isUnlocked()) return;
    this.hide();
    this.input.blur();
    this.options.openItem(row.id);
  }
};

;
/* js/search/controller.js */
'use strict';

/* SEARCH */
window.workspaceSearch = new WorkspaceSearch({
  readItems: async () => (await readForDisplay('items')).filter(item=>!isDeleted(item)&&!item.consolidatedInto&&workspaceModules.allowsItem(item)),
  readFolders: async () => (await readForDisplay('folders')).filter(folder=>!isDeleted(folder)&&!folder.consolidatedFolder),
  readActivity: () => readForDisplay('activity'),
  sectionForItem,
  typeLabel,
  escape: esc,
  protocolMetadata: item => item.documentType === 'procedure' ? null : protocolData(item),
  isUnlocked: () => !$('#app').classList.contains('hidden'),
  openItem: id => String(id).startsWith('settings:') ? openSettings(String(id).slice(9)) : openById(id),
  icon: name => name === 'open' ? PROTOCOL_ICONS.open : name === 'settings' ? settingsIcon('sliders-horizontal') : workspaceSectionIcon(name),
  // Only the tabs this account can open are offered.
  settingsEntries: () => {
    const cloud = typeof WolfGuardCloud === 'undefined' ? null : WolfGuardCloud, admin = !cloud || cloud.isAdmin();
    const can = key => admin || !!cloud?.can?.(key);
    return [
      {tab: 'account', title: 'Mon compte', keywords: 'compte identité code personnel authenticator mfa double authentification téléphone session verrouillage'},
      {tab: 'data', title: 'Données', keywords: 'données import export transfert stockage espace'},
      {tab: 'interface', title: 'Interface', keywords: 'interface ambiance thème couleurs densité taille du texte animations'},
      {tab: 'modules', title: 'Sections', keywords: 'sections modules'},
      can('users.read') && {tab: 'users', title: 'Utilisateurs', keywords: 'utilisateurs comptes invitations droits effectifs'},
      can('users.permissions') && {tab: 'groups', title: 'Groupes', keywords: 'groupes droits autorisations permissions accès'},
      can('access.read') && {tab: 'access', title: 'Connexions', keywords: 'connexions sessions appareils adresses ip'},
      can('access.read') && {tab: 'blocking', title: 'Blocage', keywords: 'blocage adresses ip spamhaus réputation'},
      admin && {tab: 'journal', title: 'Journal', keywords: 'journal logs événements erreurs connexions échecs'},
      {tab: 'about', title: 'À propos', keywords: 'à propos wolfguard'}
    ].filter(Boolean);
  }
});

function searchGlobal(query) {
  return window.workspaceSearch.search(query)
}
window.hideSearch = () => window.workspaceSearch.hide();
