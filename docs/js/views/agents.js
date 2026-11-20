'use strict';

const agentsWorkspace = (() => {
  let generation = 0, timer = 0, current = null, remoteMode = 'desktop', controller = null;
  const actions = [
    {id:'passive', section:'scan-passive', label:'Scan passif', description:'Observer les connexions et les voisins du poste.', capability:'network-scan-v3'},
    {id:'active', section:'scan-active', label:'Scan actif', description:'Identifier les ports et services d’une cible.', capability:'network-scan-v3'},
    {id:'map', section:'scan-map', label:'Cartographie', description:'Explorer les équipements et les liens du réseau.', capability:['network-topology-v1','network-auto-map-v1']},
    {id:'vulnerability', section:'scan-vulnerability', label:'Vulnérabilités', description:'Examiner les contrôles et les risques du poste.', capability:'security-audit-v1'},
    {id:'edr', section:'edr', label:'Protection EDR', description:'Consulter les protections, alertes et événements.', capability:'endpoint-protection-v1', offline:true},
    {id:'desktop', section:'remote', mode:'desktop', label:'Bureau distant', description:'Ouvrir la prise en main du bureau.', capability:'remote-desktop-v1'},
    {id:'terminal', section:'remote', mode:'terminal', label:'Terminal', description:'Ouvrir un terminal sur ce poste.', capability:'remote-terminal-v1'},
    {id:'files', section:'remote', mode:'files', label:'Fichiers', description:'Parcourir et transférer les fichiers du poste.', capability:'remote-files-v1'}
  ];
  function reset() { generation++; clearTimeout(timer); controller?.abort(); current?.closeMenu(); current?.dismissDetails(); current?.dismissTool(); current = null; }
  async function render() {
    if (current?.root.isConnected && current.key === state.vaultKey) return current.renderTool();
    reset();
    controller = new AbortController();
    const signal = controller.signal;
    const token = generation, key = state.vaultKey;
    const root = document.createElement('section');
    root.className = 'agents-workspace';
    $('#content').replaceChildren(root);
    const live = () => token === generation && root.isConnected && isSecurityWorkspace(state.section) && state.vaultKey === key && !$('#app').classList.contains('hidden');
    const find = selector => root.querySelector(selector);
    const can = (right,agent=null) => !window.WolfGuardAccess || WolfGuardAccess.can(right)&&(!agent||!WolfGuardAccess.canAgent||WolfGuardAccess.canAgent(agent.id,right));
    let agents = [], selected = null, query = '', filter = 'all', platform = 'all', protectionFilter = 'all', sort = 'name', descending = false, stale = false, busy = false, selecting = false, protections = new Map(), protectionStale = false, publishedRelease = null, releaseStale = false;
    let menu = null, menuAgentId = null, menuPoint = null, pressTimer = 0, touchStart = null, suppressClick = false;
    const journal=WolfGuardAgentJournal.create({signal});
    let detailAgentId = null, detailHTML = '', detailTab = 'overview';
    let visibilitySaving = false, visibilityNotice = null, revoking = false, revokeError = null;
    const groups=WolfGuardFleetGroups.create();let groupsReady=false,groupsBusy=false,menuPage='main';
    const checked = new Set();
    let selectionAnchor = '', bulkBusy = false, bulkCancel = false, bulkResults = [], bulkMessage = '';
    const timestamp = value => value ? new Date(value).toLocaleString('fr-FR') : 'Aucun contact';
    const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    const columns = [['name','Poste'],['online','Connexion'],['health','Protection du poste'],['alerts','Alertes'],['version','Agent'],['lastSeen','Dernier contact']];
    const mobileTable=matchMedia('(max-width:700px)');
    function tableKeyboard(){root.querySelectorAll('[data-agent-sort]').forEach(button=>{button.tabIndex=mobileTable.matches?-1:0;});find('.agent-record-tabs')?.setAttribute('aria-orientation',mobileTable.matches?'horizontal':'vertical');}
    mobileTable.addEventListener('change',tableKeyboard,{signal});
    root.innerHTML = `<header class="agents-heading">
      <div class="agents-heading-intro"><span class="agents-heading-icon" aria-hidden="true">${settingsIcon('shield-check')}</span><div><span class="agents-eyebrow">PARC INFORMATIQUE</span><h1>Sécurité des postes</h1></div></div>
      <div class="agents-heading-actions"><button type="button" id="agentsManage" class="agents-primary">${settingsIcon('plus')}Ajouter un poste</button><button type="button" id="agentsUninstall">${settingsIcon('trash-2')}Désinstaller</button></div>
    </header>
    <div id="agentsMetrics" class="agents-metrics"></div><div class="agents-status-bar"><div class="agents-fleet-summary" id="agentsFleetSummary"></div><p id="agentsStatus" role="status" aria-live="polite">Chargement des agents…</p></div>
    <div class="agents-console">
      <section class="agents-fleet" aria-label="Liste des agents">
        <div class="agents-fleet-filters">
          <div class="agents-search-filter"><label for="agentsSearch">Rechercher</label><div class="agents-search">${settingsIcon('search')}<input id="agentsSearch" type="search" placeholder="Nom du poste, système, version…"></div></div>
          <div><label for="agentsFilter">Connexion</label><select id="agentsFilter"><option value="all">Toutes les connexions</option><option value="online">Connectés</option><option value="offline">Hors ligne</option></select></div>
          <div><label for="agentsPlatform">Système</label><select id="agentsPlatform"><option value="all">Tous les systèmes</option><option value="win32">Windows</option><option value="linux">Linux</option><option value="darwin">macOS</option></select></div>
          <div><label for="agentsProtection">Protection EDR</label><select id="agentsProtection"><option value="all">Tous les états</option><option value="protected">Protégés</option><option value="attention">À protéger</option><option value="unknown">À confirmer</option><option value="unsupported">Non intégrée</option><option value="alerts">Avec alertes</option></select></div>
          <div class="agents-filter-actions"><button type="button" id="agentsRefresh" aria-label="Actualiser les agents" title="Actualiser les agents">${settingsIcon('refresh-cw')}</button><button type="button" id="agentsClearFilters" title="Effacer les filtres" aria-label="Effacer les filtres">${settingsIcon('x')}</button></div>
        </div>
        <div id="agentsActiveFilters" class="agents-active-filters" aria-label="Filtres appliqués" hidden></div>
        <div class="agents-group-toolbar"><label>Organisation<select id="agentsView"><option value="groups">Groupes personnalisés</option><option value="flat">Tableau simple</option></select></label><span id="agentsGroupCount"></span><button type="button" id="agentsGroupCreate">${settingsIcon('folder-plus')}Nouveau groupe</button></div>
        <div class="agents-mobile-sort"><label for="agentsMobileSort">Trier par</label><select id="agentsMobileSort">${columns.map(([field,label])=>'<option value="'+field+'">'+label+'</option>').join('')}</select><button type="button" id="agentsMobileDirection" aria-label="Inverser le sens du tri">↑</button></div>
        <div class="agents-selection-bar"><label class="agents-select-all"><input type="checkbox" id="agentsSelectAll"><span id="agentsSelectionCount" role="status" aria-live="polite">Sélectionner les postes affichés</span></label><div class="agents-selection-actions" id="agentsSelectionActions" hidden><select id="agentsBulkCommand" aria-label="Commande pour les postes sélectionnés"><option value="">Action groupée…</option><option value="update">Mettre à jour les agents</option><option value="uninstall">Désinstaller les agents</option><option value="restrict">Réserver aux administrateurs</option><option value="unrestrict">Retirer la réservation administrateur</option><option value="export">Exporter la sélection en CSV</option></select><button type="button" id="agentsBulkRun" disabled>Appliquer</button><button type="button" id="agentsClearSelection">Effacer</button></div></div>
        <div class="agents-bulk-feedback" id="agentsBulkFeedback" hidden><div><p id="agentsBulkStatus" role="status" aria-live="polite"></p><button type="button" id="agentsBulkCancel" hidden>Arrêter la file</button></div><details id="agentsBulkResults" hidden><summary>Résultats par poste</summary><ul></ul></details></div>
        <div class="agents-table-scroll" tabindex="0" role="region" aria-label="Liste des postes, défilement vertical et horizontal">
          <table class="agents-table"><caption class="agents-visually-hidden">Agents associés et derniers états de protection. Sélectionne un poste pour utiliser ses outils.</caption><thead><tr>${columns.map(([field,label])=>'<th scope="col" data-agent-column="'+field+'" aria-sort="'+(field==='name'?'ascending':'none')+'"><button type="button" data-agent-sort="'+field+'">'+label+'<span class="agents-sort-indicator" aria-hidden="true">'+(field==='name'?'↑':'↕')+'</span></button></th>').join('')}</tr></thead><tbody id="agentsList"></tbody></table>
        </div>
        <footer class="agents-table-footer"><span id="agentsCount">0 poste</span><span class="agents-check-legend" aria-label="Légende des protections"><span data-check="enabled">✓ Activé</span><span data-check="disabled">! À traiter</span><span data-check="unknown">? À confirmer</span></span><span>Clic : fiche · Clic droit : options · Ctrl/⌘ + clic : sélectionner · Maj : plage.</span></footer>
      </section>
      <div class="agents-main">
        <dialog id="agentToolPanel" class="agents-tool-panel" aria-labelledby="agentToolTitle" aria-describedby="agentToolTarget" hidden><header class="agents-tool-heading"><div><span class="agents-eyebrow" id="agentToolTarget"></span><h2 id="agentToolTitle"></h2></div><button type="button" id="agentToolClose" autofocus>${settingsIcon('x')}Retour aux postes</button></header><div id="agentToolHost"></div></dialog>
      </div>
    </div><dialog id="agentDetailsPanel" class="agents-tool-panel agent-details-panel" aria-labelledby="agentDetailsTitle" aria-describedby="agentDetailsTarget" hidden><header class="agents-tool-heading agent-record-heading"><span class="agent-record-heading-icon" aria-hidden="true">${settingsIcon('monitor')}</span><div><span class="agents-eyebrow">PARC INFORMATIQUE / FICHE DU POSTE</span><span class="agents-visually-hidden" id="agentDetailsTarget"></span><h2 id="agentDetailsTitle"></h2></div><div class="agent-record-heading-actions"><button type="button" id="agentDetailsJournal" aria-controls="agentRecord-journal">${settingsIcon('list')}<span>Journal</span></button><button type="button" id="agentDetailsRefresh">${settingsIcon('refresh-cw')}<span>Actualiser</span></button><button type="button" id="agentDetailsClose" autofocus>${settingsIcon('x')}<span>Retour aux postes</span></button></div></header><div id="agentDetailsBody" class="agent-details-body"></div></dialog>`;
    find('#agentsManage').hidden = !can('agents.pair');
    find('#agentsUninstall').hidden = !can('agents.revoke');
    find('#agentsUninstall').onclick = () => openAgentRemovalInterface();
    find('#agentsManage').onclick = () => openAgentsInterface({onAdded:agent=>{if(!live())return;if(!agents.some(row=>row.id===agent.id))agents.push(agent);draw();openDetails(agent.id);}});

    function protection(agent) {
      const endpoint = protections.get(agent.id);
      const unknown = {health:'unknown', label:'À confirmer', alerts:null, snapshot:null, collectedAt:null};
      if (!can('edr.read') || !workspaceModules.allows('edr')) return {...unknown, label:'Accès non accordé'};
      if (stale || protectionStale || !endpoint?.collectedAt) return unknown;
      const age = Date.now() - endpoint.collectedAt;
      const fresh = agent.online && age >= -300000 && age < 120000 && (!endpoint.receivedAt || Date.now() - endpoint.receivedAt < 120000);
      const labels = {protected:'Protégé', attention:'À protéger', unknown:'À confirmer', unsupported:'Non intégrée'};
      return {health:fresh && labels[endpoint.health] ? endpoint.health : 'unknown', label:fresh ? labels[endpoint.health] || labels.unknown : 'État non confirmé', alerts:Number.isSafeInteger(endpoint.alerts) && endpoint.alerts >= 0 ? endpoint.alerts : null, snapshot:fresh ? endpoint.snapshot : null, collectedAt:endpoint.collectedAt};
    }
    function protectionHTML(agent) {
      const status = protection(agent), unavailable = reason(actions.find(action => action.id === 'edr'), agent);
      const labels = {enabled:'Activé',disabled:'Désactivé / à actualiser',passive:'Passif · antivirus tiers',unsupported:'Non intégré',unknown:'À confirmer'};
      return '<div class="agents-protection-summary"><button type="button" class="agents-health" data-agent-security="' + esc(agent.id) + '" data-health="' + status.health + '" title="' + esc(unavailable || 'Voir la protection et les événements de ce poste') + '" ' + (unavailable || selecting ? 'disabled' : '') + '>' + status.label + '</button><span class="agents-provider" title="' + esc(status.snapshot?.provider || (status.collectedAt ? 'Dernier relev\u00e9 : ' + timestamp(status.collectedAt) : 'En attente de relev\u00e9')) + '">' + esc(status.snapshot?.provider || (status.collectedAt ? 'Dernier relevé : ' + timestamp(status.collectedAt) : 'En attente de relevé')) + '</span></div><div class="agents-protection-checks">' + [['antivirus','Antivirus'],['realtime','Temps réel'],['firewall','Pare-feu'],['signatures','Signatures']].map(([field,label]) => {
        const value = Object.hasOwn(labels,status.snapshot?.[field]) ? status.snapshot[field] : 'unknown';
        return '<span data-agent-check="' + field + '" data-check="' + value + '" title="' + label + ' : ' + labels[value] + '" aria-label="' + label + ' : ' + labels[value] + '"><i aria-hidden="true"></i>' + label + '</span>';
      }).join('') + '</div>';
    }
    function updateInfo(agent) {
      const task = WolfGuardAgentUpdates.state(agent.id), current = !stale && !releaseStale && !!publishedRelease && agent.version === publishedRelease.version;
      const reason = stale ? 'Connexion au service à vérifier' : !can('agents.write',agent) || !can('remote.write',agent) ? 'Droits Agents et Prise en main en écriture nécessaires' : !publishedRelease || releaseStale ? 'Version publiée indisponible' : !agent.online ? 'Le poste doit être connecté' : !agent.capabilities?.includes('remote-terminal-v1') ? 'Installer une première fois un agent récent sur ce poste' : !['win32','linux','darwin'].includes(agent.platform) ? 'Système non pris en charge' : '';
      return {task,current,reason,canUpdate:!reason && !current && !task?.running, outdated:!!publishedRelease && !releaseStale && !stale && !!agent.version && agent.version!==publishedRelease.version};
    }
    function updateHTML(agent,{record=false}={}) {
      const info = updateInfo(agent);
      const label = info.task?.running ? 'Mise à jour…' : info.current ? 'À jour' : 'Mettre à jour';
      const message = info.task?.running || info.task?.status === 'failed' && !info.current ? info.task.message : info.current ? 'Version confirmée par le poste' : info.reason || 'Mise à jour automatique dès que le poste est disponible';
      const manual = agent.online && !agent.capabilities?.includes('remote-terminal-v1') && ['win32','linux','darwin'].includes(agent.platform);
      const file = {win32:'WolfGuard-Agent-Windows.exe',linux:'WolfGuard-Agent-Linux.zip',darwin:'WolfGuard-Agent-macOS.zip'}[agent.platform];
      const control=manual ? '<a class="agents-update-button" href="downloads/' + file + '" download title="Télécharger l’agent récent à installer sur ce poste">Installer</a>' : '<button type="button" class="agents-update-button" data-agent-install-update="' + esc(agent.id) + '" data-current="' + info.current + '" ' + (!info.canUpdate ? 'disabled' : '') + ' title="' + esc(message) + '">' + label + '</button>';
      const feedback='<small class="agents-update-status" data-agent-update-status="' + esc(agent.id) + '" data-state="' + (info.current ? 'completed' : info.task?.status || 'idle') + '" title="' + esc(message) + '" role="status">' + esc(message) + '</small>';
      if(record)return '<div class="agent-record-update" data-update="'+(info.current?'current':info.task?.running?'running':info.task?.status==='failed'?'failed':info.outdated?'available':'unknown')+'"><div><span>Maintenance</span><strong data-current="'+info.current+'">'+(info.current?'Agent à jour':info.task?.running?'Mise à jour en cours':info.outdated?'Mise à jour disponible':'Version à vérifier')+'</strong></div>'+control+'</div>'+(info.task?.running||!info.current&&(info.task?.status==='failed'||info.reason)?feedback:'');
      return '<div class="agents-version-line"><code title="' + esc(agent.version || 'Version non remontée') + '">' + esc(agent.version?.slice(0,8) || 'Non remontée') + '</code>' + control + '</div>' + feedback;
    }
    function contactHTML(value){
      const date=new Date(value);if(!value||!Number.isFinite(date.getTime()))return '<span>Aucun contact</span>';
      const day=date.toDateString()===new Date().toDateString()?'Aujourd’hui':date.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});
      return '<time datetime="'+date.toISOString()+'" title="'+esc(timestamp(value))+'">'+esc(day)+'<small>'+esc(date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}))+'</small></time>';
    }
    async function updateAgent(id) {
      const agent = agents.find(item => item.id === id);
      if (!live() || !agent || !updateInfo(agent).canUpdate) return;
      closeMenu();
      try {
        const operation = WolfGuardAgentUpdates.start(agent,{onChange:()=>{ if(live()){ draw(); if(!WolfGuardAgentUpdates.state(id)?.running) refresh(); } }});
        draw(); await operation;
      } catch (error) { if(live())find('#agentsStatus').textContent = error.message; }
      finally { if(live())await refresh(); }
    }
    function filteredAgents() {
      const rows = agents.filter(agent => {
        const status = protection(agent);
        return normalized(agent.name + ' ' + workspaceAgents.platformName(agent.platform) + ' ' + (agent.version || '')).includes(normalized(query))
          && (filter === 'all' || !stale && (filter === 'online' ? agent.online : !agent.online))
          && (platform === 'all' || agent.platform === platform)
          && (protectionFilter === 'all' || (protectionFilter === 'alerts' ? status.alerts > 0 : status.health === protectionFilter));
      });
      const value = agent => sort === 'health' ? protection(agent).label : sort === 'alerts' ? protection(agent).alerts : agent[sort];
      return rows.sort((a,b) => {
        const left = value(a), right = value(b);
        if (left == null || right == null) return left == null && right == null ? a.name.localeCompare(b.name, 'fr') : left == null ? 1 : -1;
        const result = typeof left === 'string' ? left.localeCompare(right, 'fr', {numeric:true, sensitivity:'base'}) : Number(left) - Number(right);
        return (descending ? -result : result) || a.name.localeCompare(b.name, 'fr');
      });
    }

    function reason(action, agent) {
      if (!workspaceModules.allows(action.section) || (action.mode && !can('remote.write',agent))) return 'Droit d’accès non accordé';
      if (stale) return 'Connexion au service à vérifier';
      if (action.id !== 'edr' && WolfGuardAgentUpdates.state(agent.id)?.running) return 'Mise à jour de l’agent en cours';
      if (!action.offline && !agent.online) return 'Le poste doit être connecté';
      if (agent.local && !['active','passive'].includes(action.id)) return 'Associe un agent pour utiliser cet outil';
      const capabilities = Array.isArray(action.capability) ? action.capability : [action.capability];
      if (!capabilities.some(value => agent.capabilities?.includes(value))) return 'Mise à jour de l’agent nécessaire';
      return '';
    }
    const filterControls = {query:'#agentsSearch', filter:'#agentsFilter', platform:'#agentsPlatform', protection:'#agentsProtection'};
    function clearFilters(field = null) {
      if (!field || field === 'query') query = '';
      if (!field || field === 'filter') filter = 'all';
      if (!field || field === 'platform') platform = 'all';
      if (!field || field === 'protection') protectionFilter = 'all';
      find('#agentsSearch').value = query; find('#agentsFilter').value = filter;
      find('#agentsPlatform').value = platform; find('#agentsProtection').value = protectionFilter;
      draw();
    }
    const hasFilters=()=>!!query||filter!=='all'||platform!=='all'||protectionFilter!=='all';
    const displayedRows=()=>groups.view()==='flat'?filteredAgents():groups.buckets(filteredAgents()).flatMap(group=>groups.closed(group.id)?[]:group.rows);
    function groupHeading(group){
      const total=groups.buckets(agents).find(row=>row.id===group.id)?.rows.length||0;
      return '<tr class="agents-group-heading" data-agent-group="'+esc(group.id)+'"><td colspan="6"><div><input type="checkbox" data-group-check="'+esc(group.id)+'" aria-label="Sélectionner les postes du groupe '+esc(group.name)+'"><button type="button" data-group-toggle="'+esc(group.id)+'" aria-expanded="'+!groups.closed(group.id)+'">'+settingsIcon(groups.closed(group.id)?'chevron-right':'chevron-down')+'<strong>'+esc(group.name)+'</strong><span>'+group.rows.length+(group.rows.length!==total?' / '+total:'')+' poste(s)</span></button>'+(group.id!=='ungrouped'?'<div class="agents-group-actions"><button type="button" data-group-rename="'+esc(group.id)+'" aria-label="Renommer le groupe '+esc(group.name)+'">Renommer</button><button type="button" data-group-remove="'+esc(group.id)+'" aria-label="Supprimer le groupe '+esc(group.name)+'">'+settingsIcon('x')+'</button></div>':'')+'</div></td></tr>';
    }
    function syncGroups(){
      root.dataset.grouped=String(groups.view()==='groups');find('#agentsView').value=groups.view();find('#agentsView').disabled=!groupsReady||groupsBusy||bulkBusy;
      find('#agentsGroupCreate').disabled=!groupsReady||groupsBusy||bulkBusy;
      find('#agentsGroupCount').textContent=groups.list().length+' groupe(s)';
      for(const input of root.querySelectorAll('[data-group-check]')){
        const rows=(groups.buckets(filteredAgents()).find(group=>group.id===input.dataset.groupCheck)?.rows||[]).filter(agent=>!agent.local),count=rows.filter(agent=>checked.has(agent.id)).length;
        input.checked=!!rows.length&&count===rows.length;input.indeterminate=count>0&&count<rows.length;input.disabled=!groupsReady||groupsBusy||bulkBusy||!rows.length;
      }
      for(const button of root.querySelectorAll('[data-group-toggle],[data-group-rename],[data-group-remove]'))button.disabled=!groupsReady||groupsBusy||bulkBusy;
    }
    async function groupChange(action,message='Organisation enregistrée.'){
      if(!live()||!groupsReady||groupsBusy||bulkBusy)return;
      groupsBusy=true;closeMenu();syncGroups();
      try{await action();if(live())find('#agentsStatus').textContent=message;}
      catch(error){if(live())find('#agentsStatus').textContent='Modification non enregistrée : '+error.message;}
      finally{groupsBusy=false;if(live())draw();}
    }
    async function newGroup(ids=[]){
      if(!live()||!groupsReady||groupsBusy||bulkBusy)return;
      const name=await appPrompt('Nom du nouveau groupe', '',{title:'Créer un groupe de postes',confirmLabel:'Créer',placeholder:'Ex. Atelier, Bureau, Serveurs'});
      if(name===null||!live())return;
      await groupChange(()=>groups.add(name,ids),'Groupe créé'+(ids.length?' avec '+ids.length+' poste(s)':'')+'.');
    }
    async function renameGroup(id){
      const name=await appPrompt('Nouveau nom du groupe',groups.name(id),{title:'Renommer le groupe',confirmLabel:'Renommer'});
      if(name!==null&&live())await groupChange(()=>groups.rename(id,name),'Groupe renommé.');
    }
    async function removeGroup(id){
      if(!await appConfirm('Supprimer le groupe « '+groups.name(id)+' » ? Ses postes seront remis dans « Sans groupe ». Aucun agent ne sera supprimé.',{title:'Supprimer ce groupe',confirmLabel:'Supprimer le groupe'})||!live())return;
      await groupChange(()=>groups.remove(id),'Groupe supprimé ; ses postes restent dans le parc.');
    }
    const checkedAgents = () => agents.filter(agent => checked.has(agent.id));
    function bulkReason(command, agent) {
      if(agent.local)return 'Poste local non associé';
      if(command==='export')return '';
      if(stale)return 'Connexion au service à vérifier';
      if(command==='update'){
        const info=updateInfo(agent);
        return info.current?'Agent déjà à jour':info.reason||(!info.canUpdate?'Une mise à jour est déjà en cours':'');
      }
      if(command==='uninstall')return WolfGuardAgentRemoval.reason(agent);
      if(!['restrict','unrestrict'].includes(command))return 'Choisis une commande';
      if(!Object.hasOwn(agent,'restricted')||!can('agents.write',agent))return 'Réservé aux administrateurs et au propriétaire';
      return agent.restricted===(command==='restrict')?'Visibilité déjà conforme':'';
    }
    function syncSelection() {
      const rows=filteredAgents().filter(agent=>!agent.local), targets=checkedAgents(), visible=new Set(rows.map(agent=>agent.id));
      const count=rows.filter(agent=>checked.has(agent.id)).length, hidden=targets.filter(agent=>!visible.has(agent.id)).length;
      const all=find('#agentsSelectAll');all.checked=!!rows.length&&count===rows.length;all.indeterminate=count>0&&count<rows.length;all.disabled=bulkBusy||groupsBusy||!rows.length;
      find('#agentsSelectionCount').textContent=targets.length?targets.length+' sélectionné'+(targets.length>1?'s':'')+(hidden?' · '+hidden+' hors filtre':''):'Sélectionner les postes affichés';
      find('#agentsSelectionActions').hidden=!targets.length;
      find('#agentsClearSelection').disabled=bulkBusy;find('#agentsBulkCommand').disabled=bulkBusy;
      root.dataset.bulkSelection=String(!!targets.length);
      for(const option of find('#agentsBulkCommand').options){
        if(!option.value)continue;
        const eligible=targets.filter(agent=>!bulkReason(option.value,agent)).length;
        option.disabled=!eligible;
        option.hidden=['restrict','unrestrict'].includes(option.value)&&!targets.some(agent=>Object.hasOwn(agent,'restricted'));
      }
      const command=find('#agentsBulkCommand').value;
      const eligible=targets.filter(agent=>!bulkReason(command,agent)).length;
      find('#agentsBulkRun').disabled=bulkBusy||groupsBusy||busy||!command||!eligible;
      find('#agentsBulkRun').title=command?eligible+' poste(s) éligible(s) sur '+targets.length:'';
      root.querySelectorAll('[data-agent-row]').forEach(row=>{
        const chosen=checked.has(row.dataset.agentRow),input=row.querySelector('[data-fleet-check]');
        row.dataset.checked=String(chosen);input.checked=chosen;input.disabled=bulkBusy||!!agents.find(agent=>agent.id===row.dataset.agentRow)?.local;
      });
      find('#agentsBulkFeedback').hidden=!bulkMessage;
      find('#agentsBulkStatus').textContent=bulkMessage;
      find('#agentsBulkCancel').hidden=!bulkBusy;find('#agentsBulkCancel').disabled=bulkCancel;
      find('#agentsBulkCancel').textContent=bulkCancel?'Arrêt après ce poste…':'Arrêter la file';
      find('#agentsBulkResults').hidden=!bulkResults.length;
      find('#agentsBulkResults ul').innerHTML=bulkResults.map(result=>'<li data-result="'+result.status+'"><strong>'+esc(result.name)+'</strong><span>'+esc(result.message)+'</span></li>').join('');
      syncGroups();
    }
    function selectRange(id, value, range=false) {
      if(bulkBusy)return;
      const rows=displayedRows().filter(agent=>!agent.local), start=rows.findIndex(agent=>agent.id===selectionAnchor), end=rows.findIndex(agent=>agent.id===id);
      if(end<0)return;
      const targets=range&&start>=0?rows.slice(Math.min(start,end),Math.max(start,end)+1):[rows[end]];
      for(const agent of targets)if(value)checked.add(agent.id);else checked.delete(agent.id);
      selectionAnchor=id;syncSelection();
    }
    function exportSelection(targets) {
      const cell=value=>'"'+String(value??'').replace(/^(\s*[=+@-]|[\t\r\n])/,"'$1").replaceAll('"','""')+'"';
      const lines=[['Poste','Système','Connexion','Version de l’agent','Dernier contact'],...targets.map(agent=>[agent.name,workspaceAgents.platformName(agent.platform),agent.online?'Connecté':'Hors ligne',agent.version||'',agent.lastSeen&&Number.isFinite(new Date(agent.lastSeen).getTime())?new Date(agent.lastSeen).toISOString():''])];
      const url=URL.createObjectURL(new Blob(['\ufeff'+lines.map(row=>row.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
      const link=document.createElement('a');link.href=url;link.download='WolfGuard-postes-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    async function runBulk(commandOverride=null,targetsOverride=null) {
      const command=commandOverride||find('#agentsBulkCommand').value, targets=targetsOverride||checkedAgents();
      if(!live()||bulkBusy||groupsBusy||busy||!targets.length||!['update','uninstall','restrict','unrestrict','export'].includes(command)||!targets.some(agent=>!bulkReason(command,agent)))return;
      if(command==='export'){exportSelection(targets);bulkMessage=targets.length+' poste(s) exporté(s).';bulkResults=[];syncSelection();return;}
      bulkBusy=true;bulkCancel=false;syncSelection();
      const titles={update:'Mettre à jour les agents',uninstall:'Désinstaller les agents',restrict:'Réserver les postes aux administrateurs',unrestrict:'Retirer la réservation administrateur'};
      const available=targets.filter(agent=>!bulkReason(command,agent)).length;
      const names=targets.slice(0,8).map(agent=>'• '+agent.name).join('\n')+(targets.length>8?'\n… et '+(targets.length-8)+' autre(s) poste(s).':'');
      const warning=command==='uninstall'?' Les scans, la protection assurée par ces agents et la prise en main s’arrêteront.':command==='restrict'?' Ces postes deviendront invisibles pour les autres rôles.':command==='unrestrict'?' Les rôles et les droits individuels s’appliqueront de nouveau.':'';
      const confirmed=await appConfirm(titles[command]+' sur '+targets.length+' poste(s) sélectionné(s) ?'+warning+'\n'+available+' poste(s) éligible(s) ; les autres seront ignorés.\n\n'+names,{title:titles[command],confirmLabel:'Confirmer pour '+available+' poste(s)',danger:command==='uninstall'||command==='restrict'});
      if(!live())return;
      if(!confirmed){bulkBusy=false;syncSelection();find('#agentsBulkRun').focus();return;}
      bulkResults=[];
      try{
        for(const target of targets){
          if(!live())return;
          if(bulkCancel)break;
          const agent=agents.find(item=>item.id===target.id), unavailable=agent?bulkReason(command,agent):'Poste devenu inaccessible';
          if(unavailable){bulkResults.push({name:target.name,status:'skip',message:'Ignoré · '+unavailable});syncSelection();continue;}
          bulkMessage='Traitement '+(bulkResults.length+1)+' / '+targets.length+' · '+agent.name;syncSelection();
          try{
            if(command==='update'){
              await WolfGuardAgentUpdates.start(agent,{onChange:value=>{if(live()){bulkMessage=agent.name+' · '+value.message;syncSelection();}}});
              const result=WolfGuardAgentUpdates.state(agent.id);
              if(result?.status!=='completed')throw new Error(result?.message||'Mise à jour non confirmée');
              bulkResults.push({name:agent.name,status:'success',message:'Agent mis à jour'});
            }else if(command==='uninstall'){
              const result=await WolfGuardAgentRemoval.start(agent,{onChange:value=>{if(live()){bulkMessage=agent.name+' · '+value.message;syncSelection();}}});
              if(result?.status!=='launched')throw new Error(result?.message||'Lancement non confirmé');
              bulkResults.push({name:agent.name,status:'success',message:'Désinstallation lancée sur le poste'});
            }else{
              const result=await WolfGuardCloud.agentRequest('agents/restricted',{id:agent.id,restricted:command==='restrict'},{signal});
              agent.restricted=result.restricted;
              bulkResults.push({name:agent.name,status:'success',message:agent.restricted?'Réservé aux administrateurs et au propriétaire':'Droits habituels rétablis'});
            }
          }catch(error){bulkResults.push({name:agent.name,status:'error',message:error.message});}
          if(live())syncSelection();
        }
      }finally{
        bulkBusy=false;
        if(live()){
          const successes=bulkResults.filter(result=>result.status==='success').length, errors=bulkResults.filter(result=>result.status==='error').length, skipped=bulkResults.filter(result=>result.status==='skip').length;
          bulkMessage=(bulkCancel?'File arrêtée. ':'Traitement terminé. ')+successes+' réussi(s) · '+errors+' erreur(s) · '+skipped+' ignoré(s)'+(bulkCancel?' · '+(targets.length-bulkResults.length)+' non traité(s)':'');
          draw();await refresh();
        }
      }
    }
    function alertsHTML(agent,status){
      const attributes='class="agents-alerts" data-alert="'+(status.alerts>0)+'"',count=status.alerts??'—';
      return !agent.local&&can('edr.read',agent)&&workspaceModules.allows('edr')?'<button type="button" '+attributes+' data-open-agent-journal="'+esc(agent.id)+'" aria-label="Voir le journal de '+esc(agent.name)+'" title="Voir les logs de ce poste">'+count+'</button>':'<span '+attributes+'>'+count+'</span>';
    }
    function openJournal(id){
      const agent=agents.find(row=>row.id===id);if(!agent||agent.local||!can('edr.read',agent)||!workspaceModules.allows('edr'))return;
      openDetails(id);selectRecordTab('journal',true);
    }
    function draw(preserveRows = false) {
      if (!live()) return;
      const online = agents.filter(agent => agent.online).length;
      const protectionAvailable = !stale && !protectionStale && can('edr.read') && workspaceModules.allows('edr');
      root.dataset.stale = String(stale);
      find('#agentsMetrics').innerHTML = [['Agents associés', agents.length, 'all', 'monitor'], ['Protégés confirmés', !protectionAvailable ? '—' : agents.filter(agent => protection(agent).health === 'protected').length, 'online', 'shield-check'], ['Alertes ouvertes', !protectionAvailable ? '—' : agents.reduce((total,agent) => total + (protection(agent).alerts || 0),0), 'attention', 'circle-alert'], ['Mises à jour disponibles', !publishedRelease || releaseStale || stale ? '—' : agents.filter(agent => updateInfo(agent).outdated).length, 'updates', 'refresh-cw']].map(([label, value, status, icon]) => '<article data-state="' + status + '"><span class="agents-metric-icon" aria-hidden="true">' + settingsIcon(icon) + '</span><div><span>' + label + '</span><strong>' + value + '</strong></div></article>').join('');
      const unknown = agents.filter(agent => protection(agent).health === 'unknown').length;
      find('#agentsFleetSummary').textContent = stale ? 'Disponibilité des postes à confirmer' : online + ' connecté' + (online === 1 ? '' : 's') + ' · ' + (agents.length - online) + ' hors ligne · ' + unknown + ' protection' + (unknown === 1 ? '' : 's') + ' à confirmer';
      const rows = filteredAgents();
      root.dataset.empty = String(!rows.length);
      const focusId = document.activeElement?.dataset.fleetAgent, focusedUpdate = document.activeElement?.dataset.agentInstallUpdate, focusedCheck=document.activeElement?.dataset.fleetCheck;
      find('#agentsCount').textContent = rows.length + ' poste' + (rows.length === 1 ? '' : 's') + (rows.length !== agents.length ? ' sur ' + agents.length : '') + (selected&&!rows.some(agent=>agent.id===selected.id)?' · Poste actif (hors filtre)':'');
      const applied = Object.entries({query,filter,platform,protection:protectionFilter}).filter(([field,value]) => field === 'query' ? value : value !== 'all');
      find('#agentsActiveFilters').hidden = !applied.length;
      find('#agentsActiveFilters').innerHTML = applied.map(([field,value]) => {
        const control = find(filterControls[field]), label = field === 'query' ? 'Recherche : ' + value : control.options[control.selectedIndex].text;
        return '<button type="button" data-agent-clear="' + field + '" aria-label="' + esc('Retirer le filtre ' + label) + '"><span>' + esc(label) + '</span>' + settingsIcon('x') + '</button>';
      }).join('');
      find('#agentsProtection').disabled = !can('edr.read') || !workspaceModules.allows('edr');
      find('#agentsClearFilters').disabled = !query && filter === 'all' && platform === 'all' && protectionFilter === 'all';
      if (preserveRows) root.querySelectorAll('[data-agent-row]').forEach(row => {
        const chosen = row.dataset.agentRow === selected?.id;
        row.dataset.selected = String(chosen);
        row.querySelector('[data-fleet-agent]').setAttribute('aria-pressed', String(chosen));
        row.querySelector('.agents-row-selector').textContent = chosen ? '✓' : '';
      });
      else {
        const renderRows=list=>list.map(agent => {
        const status = protection(agent), chosen = agent.id === selected?.id;
        return '<tr class="agents-fleet-row" data-agent-group-id="'+esc(groups.groupOf(agent.id))+'" data-agent-row="' + esc(agent.id) + '" data-selected="' + chosen + '"><td data-label="Poste"><div class="agents-post-cell"><input type="checkbox" class="agents-row-check" title="Maj + clic : sélectionner une plage" data-fleet-check="' + esc(agent.id) + '" aria-label="' + esc('Sélectionner ' + agent.name) + '" ' + (checked.has(agent.id) ? 'checked ' : '') + (bulkBusy ? 'disabled' : '') + '><button type="button" class="agents-endpoint" title="' + esc(agent.name) + '" data-fleet-agent="' + esc(agent.id) + '" aria-haspopup="dialog" aria-keyshortcuts="Shift+F10" aria-pressed="' + chosen + '" ' + (selecting ? 'disabled' : '') + '><span class="agents-row-selector" aria-hidden="true">' + (chosen ? '✓' : '') + '</span><span class="agents-device-icon" aria-hidden="true">' + settingsIcon('monitor') + '</span><span class="agents-endpoint-name"><strong>' + esc(agent.name) + '</strong><small>' + esc(workspaceAgents.platformName(agent.platform)) + (agent.restricted?' · Accès réservé':'') + '</small></span><span class="agents-row-open" aria-hidden="true">↗</span></button></div></td><td data-label="Connexion"><span class="agents-presence" data-state="' + (stale ? 'unknown' : agent.online ? 'online' : 'offline') + '">' + (stale ? 'À vérifier' : agent.online ? 'Connecté' : 'Hors ligne') + '</span></td><td data-label="Protection">' + protectionHTML(agent) + '</td><td data-label="Alertes">' + alertsHTML(agent,status) + '</td><td data-label="Agent">' + updateHTML(agent) + '</td><td data-label="Dernier contact" class="agents-last-contact">' + contactHTML(agent.lastSeen) + '</td></tr>';
      }).join('');
        find('#agentsList').innerHTML=groups.view()==='groups'&&agents.length&&(!hasFilters()||rows.length)?groups.buckets(rows).filter(group=>!hasFilters()||group.rows.length).map(group=>groupHeading(group)+(groups.closed(group.id)?'':renderRows(group.rows)||(hasFilters()?'':'<tr class="agents-group-empty"><td colspan="6">Aucun poste dans ce groupe. Utilise le clic droit pour y déplacer des postes.</td></tr>'))).join(''):renderRows(rows)||'<tr><td colspan="6"><div class="agents-empty"><span class="agents-empty-icon" aria-hidden="true">' + settingsIcon('monitor') + '</span><h2>' + (agents.length ? 'Aucun poste pour ces filtres' : 'Aucun agent associé') + '</h2><p>' + (agents.length ? 'Modifie ou efface les filtres pour retrouver tes postes.' : 'Ajoute un agent Windows, Linux ou macOS pour retrouver ce poste et ses actions ici.') + '</p></div></td></tr>';
      }
      root.querySelectorAll('[data-agent-column]').forEach(heading => {
        const active = heading.dataset.agentColumn === sort;
        heading.setAttribute('aria-sort', active ? descending ? 'descending' : 'ascending' : 'none');
        heading.querySelector('.agents-sort-indicator').textContent = active ? descending ? '↓' : '↑' : '↕';
      });
      find('#agentsMobileSort').value=sort;find('#agentsMobileDirection').textContent=descending?'↓':'↑';find('#agentsMobileDirection').setAttribute('aria-label',descending?'Passer au tri croissant':'Passer au tri décroissant');
      tableKeyboard();
      syncSelection();
      if (focusId) find('[data-fleet-agent="' + CSS.escape(focusId) + '"]')?.focus({preventScroll:true});
      if (focusedUpdate) find('[data-agent-install-update="' + CSS.escape(focusedUpdate) + '"]:not(:disabled)')?.focus({preventScroll:true});
      if (focusedCheck) find('[data-fleet-check="' + CSS.escape(focusedCheck) + '"]:not(:disabled)')?.focus({preventScroll:true});
      const agent = selected;
      find('#agentToolTarget').textContent = agent?.name || 'Aucun agent sélectionné';
      renderMenu();
      renderDetails();
    }
    function closeMenu(restore = false) {
      clearTimeout(pressTimer); touchStart = null;
      const id = menuAgentId;
      menu?.remove(); menu = null; menuAgentId = null;
      root.querySelectorAll('[data-context]').forEach(row => row.removeAttribute('data-context'));
      if (restore) find('[data-fleet-agent="' + CSS.escape(id || '') + '"]')?.focus({preventScroll:true});
    }
    function menuTargets(){
      const agent=agents.find(row=>row.id===menuAgentId);
      return agent?(checked.has(agent.id)&&checked.size>1?checkedAgents():[agent]):[];
    }
    function menuButton(id,label,icon,disabled=false,help='',danger=false){
      return '<button type="button" role="menuitem" data-fleet-action="'+esc(id)+'" '+(disabled?'disabled aria-disabled="true"':'')+' '+(danger?'class="agents-menu-danger"':'')+'><span class="agents-menu-icon" aria-hidden="true">'+(['terminal','files'].includes(icon)?workspaceNavigationIcon(icon):settingsIcon(icon))+'</span><span class="agents-menu-copy"><strong>'+esc(label)+'</strong>'+(help?'<small>'+esc(help)+'</small>':'')+'</span></button>';
    }
    function renderMenu() {
      if(!menu)return;
      const agent=agents.find(item=>item.id===menuAgentId),targets=menuTargets();
      if(!live()||!agent||!filteredAgents().some(item=>item.id===agent.id)){closeMenu();return;}
      const focused=menu.contains(document.activeElement),focusedAction=document.activeElement?.dataset.fleetAction,multiple=targets.length>1;
      const title=multiple?targets.length+' postes sélectionnés':agent.name;
      const section=label=>'<div class="agents-menu-section" role="presentation">'+label+'</div>';
      let html='<header class="agents-menu-heading"><span>'+(multiple?'ACTIONS GROUPÉES':'OPTIONS DU POSTE')+'</span><h2>'+esc(title)+'</h2><small>'+(multiple?'Les actions portent sur les postes cochés.':esc(workspaceAgents.platformName(agent.platform))+(agent.restricted?' · Accès réservé':''))+'</small></header>';
      const organizationDisabled=!groupsReady||groupsBusy||bulkBusy;
      if(menuPage==='groups'){
        html+=menuButton('back','Retour aux actions','arrow-left')+section('DÉPLACER VERS');
        for(const group of groups.list())html+=menuButton('group:'+group.id,group.name,'folder',organizationDisabled);
        html+=menuButton('group:ungrouped','Sans groupe','folder-open',organizationDisabled)+menuButton('new-group','Nouveau groupe…','folder-plus',organizationDisabled);
      }else if(menuPage==='tools'){
        html+=menuButton('back','Retour aux actions','arrow-left')+section('OUTILS DU POSTE');
        html+=actions.map(action=>{const unavailable=reason(action,agent);return menuButton(action.id,action.label,['terminal','files'].includes(action.mode)?action.mode:action.id==='desktop'?'monitor':action.id==='edr'?'shield-check':'search',!!unavailable||selecting||bulkBusy,unavailable||'');}).join('');
      }else{
        if(!multiple){
          html+=menuButton('details','Fiche du poste','monitor')+menuButton('journal','Journal et alertes','list',agent.local||!can('edr.read',agent)||!workspaceModules.allows('edr'));
          html+=menuButton('tools','Outils et diagnostics','wrench');
        }
        html+=section('ORGANISATION')+menuButton('groups','Déplacer '+(multiple?'la sélection':'ce poste')+' vers…','folder',organizationDisabled);
        html+=menuButton('select',checked.has(agent.id)?'Retirer ce poste de la sélection':'Ajouter ce poste à la sélection','check-square',bulkBusy||!!agent.local);
        if(checked.size)html+=menuButton('clear','Effacer la sélection','x',bulkBusy);
        html+=section(multiple?'GESTION DES POSTES SÉLECTIONNÉS':'GESTION DU POSTE');
        for(const [command,label,icon] of [['update','Mettre à jour les agents','refresh-cw'],['restrict','Réserver aux administrateurs','lock'],['unrestrict','Retirer la réservation','unlock'],['export','Exporter en CSV','download'],['uninstall','Désinstaller les agents','trash-2']]){
          const eligible=targets.filter(row=>!bulkReason(command,row)).length;
          if(['restrict','unrestrict'].includes(command)&&(!targets.some(row=>Object.hasOwn(row,'restricted'))||!multiple&&!eligible))continue;
          const help=multiple?eligible+' / '+targets.length+' poste(s) éligible(s)':eligible?'':bulkReason(command,agent);
          html+=menuButton('bulk:'+command,label,icon,!eligible||busy||bulkBusy||groupsBusy,help,command==='uninstall');
        }
      }
      menu.innerHTML=html;menu.setAttribute('aria-label','Options pour '+title);
      const box=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(menuPoint.x,innerWidth-box.width-8))+'px';menu.style.top=Math.max(8,Math.min(menuPoint.y,innerHeight-box.height-8))+'px';
      root.querySelectorAll('[data-agent-row]').forEach(row=>row.toggleAttribute('data-context',row.dataset.agentRow===menuAgentId));
      if(focused)(menu.querySelector('[data-fleet-action="'+CSS.escape(focusedAction||'')+'"]:not(:disabled)')||menu.querySelector('button:not(:disabled)')||menu).focus({preventScroll:true});
    }
    function openMenu(id,point){
      if(!live()||selecting||!agents.some(agent=>agent.id===id))return;
      closeMenu();closeContextMenu();menuAgentId=id;menuPoint=point;menuPage='main';
      menu=document.createElement('div');menu.id='agentActions';menu.className='context-menu agents-context-menu';menu.tabIndex=-1;menu.setAttribute('role','menu');
      menu.onclick=async event=>{
        const button=event.target.closest('[data-fleet-action]');if(!button||button.disabled)return;
        const action=button.dataset.fleetAction,targets=menuTargets(),ids=targets.map(row=>row.id),target=menuAgentId;
        if(['groups','tools','back'].includes(action)){menuPage=action==='back'?'main':action;renderMenu();menu?.querySelector('button:not(:disabled)')?.focus({preventScroll:true});return;}
        if(action==='select'){if(checked.has(target))checked.delete(target);else checked.add(target);syncSelection();renderMenu();return;}
        closeMenu();
        if(action==='clear'){checked.clear();syncSelection();return;}
        if(action==='new-group'){await newGroup(ids);return;}
        if(action.startsWith('group:')){const group=action.slice(6);await groupChange(()=>groups.assign(ids,group),ids.length+' poste(s) déplacé(s) vers '+groups.name(group)+'.');return;}
        if(action.startsWith('bulk:')){await runBulk(action.slice(5),targets);return;}
        if(action==='journal'){openJournal(target);return;}
        runAction(action,target);
      };
      document.body.appendChild(menu);renderMenu();(menu?.querySelector('button:not(:disabled)')||menu)?.focus({preventScroll:true});
    }
    async function runAction(actionId, id) {
      if (actionId === 'details') { openDetails(id); return; }
      const action = actions.find(item => item.id === actionId), agent = agents.find(item => item.id === id);
      if (!live() || !action || !agent || selecting || bulkBusy || reason(action, agent)) return;
      dismissDetails();
      closeMenu(); selecting = true; draw();
      try {
        await setSetting('scanAgentId', id);
        if (!live()) return;
        const unavailable = reason(action, agent);
        if (unavailable) throw new Error(unavailable);
        selected = agent;
        if (action.mode) remoteMode = action.mode;
        await openSection(action.section);
      } catch (error) { if (live()) find('#agentsStatus').textContent = error.message; }
      finally { selecting = false; draw(); }
    }
    async function choose(id) {
      const agent = agents.find(item => item.id === id);
      if (!agent || selecting || !live() || selected?.id === id) return;
      // Keep the clicked row available while its selection is being saved.
      selecting = true;
      try { await setSetting('scanAgentId', id); if (live()) { selected = agent; if (state.section !== 'security') await renderTool(true); } }
      catch (error) { if (live()) find('#agentsStatus').textContent = error.message; }
      finally { selecting = false; draw(state.section === 'security'); }
    }
    function dismissDetails(restore = false) {
      const id = detailAgentId, panel = find('#agentDetailsPanel');
      journal.close();detailAgentId = null; detailHTML = '';
      if (panel.open) panel.close();
      panel.hidden = true; find('#agentDetailsBody').replaceChildren();
      if (restore && live()) (find('[data-fleet-agent="' + CSS.escape(id || '') + '"]') || find('#agentsSearch')).focus({preventScroll:true});
    }
    function openDetails(id) {
      if (!live() || !agents.some(agent => agent.id === id)) return;
      closeMenu();
      if(detailAgentId!==id)detailTab='overview';
      detailAgentId = id; renderDetails();
      const panel = find('#agentDetailsPanel'); panel.hidden = false;
      if (!panel.open) panel.showModal();
      find('#agentDetailsClose').focus({preventScroll:true});
    }
    function selectRecordTab(id,focus=false){
      if(!find('[data-record-tab="'+id+'"]'))return;
      detailTab=id;
      for(const button of find('#agentDetailsBody').querySelectorAll('[data-record-tab]')){const active=button.dataset.recordTab===id;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;if(active&&focus)button.focus({preventScroll:true});}
      for(const panel of find('#agentDetailsBody').querySelectorAll('[role="tabpanel"]'))panel.hidden=panel.id!=='agentRecord-'+id;
      syncJournal();
    }
    function syncJournal(){
      const agent=agents.find(item=>item.id===detailAgentId);
      if(detailTab==='journal'&&agent&&!agent.local&&can('edr.read',agent)&&workspaceModules.allows('edr'))journal.show(find('[data-agent-journal]'),agent);else journal.hide();
    }
    function renderDetails() {
      if (!detailAgentId || !live()) return;
      const agent = agents.find(item => item.id === detailAgentId);
      if (!agent) { dismissDetails(true); return; }
      const status = protection(agent);
      const edrAllowed = can('edr.read',agent) && workspaceModules.allows('edr');
      find('#agentDetailsJournal').hidden=!edrAllowed||!!agent.local;
      const endpoint = edrAllowed && !protectionStale && !stale ? protections.get(agent.id) : null;
      const snapshot = status.snapshot, policy = endpoint?.policy;
      const checks = {enabled:'Activé',disabled:'Désactivé',passive:'Antivirus tiers',unsupported:'Non intégré',unknown:'À confirmer'};
      const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 'Non renseigné';
      const metric = value => Number.isSafeInteger(value) && value >= 0 ? value : '—';
      const fields = rows => '<dl>' + rows.map(([label,value,format]) => '<div><dt>' + esc(label) + '</dt><dd>' + (format==='version'?'<code class="agent-record-code">'+esc(String(value??'Non remontée'))+'</code>':format?'<span class="agent-record-value" data-tone="'+esc(format)+'">'+esc(String(value??'Non renseigné'))+'</span>':esc(String(value??'Non renseigné'))) + '</dd></div>').join('') + '</dl>';
      const tool = action => {
        const unavailable = reason(action,agent);
        const icon = ['terminal','files'].includes(action.mode) ? workspaceNavigationIcon(action.mode) : workspaceSectionIcon(action.section);
        return '<button type="button" data-detail-action="'+action.id+'" '+(unavailable||selecting?'disabled':'')+'><i aria-hidden="true">'+icon+'</i><span><strong>'+action.label+'</strong><small>'+esc(unavailable||action.description)+'</small></span><span class="agent-record-tool-state">'+(unavailable?'Indisponible':'Ouvrir')+'</span></button>';
      };
      const own = snapshot?.wolfguardAntivirus;
      const ownState=!snapshot||!own?'unknown':!own.installed?'missing':!own.enabled?'paused':own.state==='error'?'error':own.state==='ready'?'ready':['scanning','updating','installing'].includes(own.state)?'running':'unknown';
      const ownLabel = !snapshot ? 'État non confirmé' : !own ? 'Agent à mettre à jour' : !own.installed ? 'Moteur à installer' : !own.enabled ? 'Surveillance suspendue' : ({ready:'Surveillance réactive',scanning:'Analyse en cours',updating:'Signatures en cours',installing:'Installation en cours',error:'Intervention nécessaire'})[own.state]||'État à confirmer';
      const connected = stale ? 'À confirmer' : agent.online ? 'Connecté' : 'Hors ligne';
      const detailsOpen = find('#agentDetailsTechnical')?.open, policyOpen = find('#agentDetailsPolicy')?.open;
      find('#agentDetailsTarget').textContent = agent.name;
      find('#agentDetailsTitle').textContent = agent.name;
      const tabs=[['overview','Vue d’ensemble','layout-dashboard'],['tools','Outils','wrench'],['details','Détails','sliders-horizontal']];
      if(edrAllowed&&!agent.local)tabs.splice(1,0,['journal','Journal','list']);
      if(!tabs.some(([id])=>id===detailTab)){detailTab='overview';journal.close();}
      const panel=name=>'id="agentRecord-'+name+'" role="tabpanel" aria-labelledby="agentRecordTab-'+name+'" '+(detailTab===name?'':'hidden');
      const sectionHeading=(icon,title,extra='')=>'<header><h3><span aria-hidden="true">'+settingsIcon(icon)+'</span>'+title+'</h3>'+extra+'</header>';
      const html = `<div class="agent-record-layout">
        <aside class="agent-record-sidebar" aria-label="Navigation du poste">
          <div class="agent-record-profile" data-connection="${stale?'unknown':agent.online?'online':'offline'}">
            <span class="agent-record-avatar" aria-hidden="true">${settingsIcon(agent.platform==='darwin'?'laptop':agent.platform==='linux'?'server':'monitor')}</span>
            <div><strong>${esc(workspaceAgents.platformName(agent.platform))}</strong><span class="agent-record-presence"><i aria-hidden="true"></i>${connected}</span></div>
          </div>
          <nav class="agent-record-tabs" role="tablist" aria-label="Fiche du poste" aria-orientation="${mobileTable.matches?'horizontal':'vertical'}">
            ${tabs.map(([id,label,icon])=>'<button type="button" role="tab" id="agentRecordTab-'+id+'" data-record-tab="'+id+'" aria-controls="agentRecord-'+id+'" aria-selected="'+(detailTab===id)+'" tabindex="'+(detailTab===id?'0':'-1')+'"><span aria-hidden="true">'+settingsIcon(icon)+'</span>'+label+'</button>').join('')}
          </nav>
          <div class="agent-record-sidebar-info"><span class="agents-eyebrow">ACCÈS AU POSTE</span><p>${agent.restricted?'Administrateurs et propriétaire uniquement':'Selon le rôle du compte'}</p></div>
        </aside>
        <div class="agent-record-content">
          ${stale||!agent.online?'<p class="agent-record-notice">'+(stale?'Le service est indisponible. Les états restent à confirmer.':'Poste hors ligne. Les protections actuelles ne sont pas confirmées.')+'</p>':''}
          <section ${panel('overview')}>
            <div class="agent-record-page-heading"><h3>Vue d’ensemble</h3><span class="agent-record-report-time">${settingsIcon('clock')}<span>${esc(status.collectedAt?timestamp(status.collectedAt):'Aucun relevé de protection')}</span></span></div>
            ${!agent.local&&Object.hasOwn(agent,'restricted')?'<label class="agent-access-setting"><span class="agent-access-icon" aria-hidden="true">'+settingsIcon('lock')+'</span><span><strong>Réservé aux administrateurs et au propriétaire</strong><small>Les éditeurs, observateurs et invités ne voient pas ce poste et ne peuvent pas y accéder.</small></span><input type="checkbox" role="switch" data-record-restricted="'+esc(agent.id)+'" aria-label="Réserver ce poste aux administrateurs et au propriétaire" '+(agent.restricted?'checked':'')+' '+(busy||stale||visibilitySaving?'disabled':'')+'></label>':''}
            ${visibilityNotice?.id===agent.id?'<p class="agent-access-feedback" role="'+(visibilityNotice.error?'alert':'status')+'" data-error="'+visibilityNotice.error+'">'+esc(visibilityNotice.message)+'</p>':''}
            <div class="agent-record-summary">
              <div class="agent-record-health-strip" data-health="${status.health}">
                <span class="agent-record-health-icon" aria-hidden="true">${settingsIcon(status.health==='protected'?'shield-check':status.health==='attention'?'shield-alert':'shield')}</span>
                <div><span>État des protections</span><strong>${esc(status.label)}</strong></div>
              </div>
              <div class="agent-record-counters">
                <div data-metric="alerts" data-alert="${status.alerts>0}" data-known="${Number.isSafeInteger(status.alerts)&&status.alerts>=0}"><strong>${metric(status.alerts)}</strong><span>${settingsIcon('circle-alert')}Alertes ouvertes</span></div>
                <div data-metric="blocks" data-known="${Number.isSafeInteger(endpoint?.blocks)&&endpoint.blocks>=0}"><strong>${metric(endpoint?.blocks)}</strong><span>${settingsIcon('lock')}Blocages · 24 h</span></div>
                <div data-metric="threats" data-alert="${snapshot?.activeThreats>0}" data-known="${Number.isSafeInteger(snapshot?.activeThreats)&&snapshot.activeThreats>=0}"><strong>${metric(snapshot?.activeThreats)}</strong><span>${settingsIcon('shield-alert')}Menaces actives</span></div>
              </div>
            </div>
            <div class="agent-record-overview">
              <section class="agent-record-card agent-record-protection">
                ${sectionHeading('shield-check','Protection du poste','<button type="button" class="agent-record-events" data-record-journal '+(reason(actions.find(a=>a.id==='edr'),agent)||selecting?'disabled':'')+'>'+settingsIcon('list')+'Voir le journal</button>')}
                <div class="agent-record-section-label"><h4>Protection du système</h4><span>${esc(snapshot?.provider||'Fournisseur non confirmé')}</span></div>
                <div class="agent-record-checks">
                  ${[['Antivirus','antivirus'],['Temps réel','realtime'],['Pare-feu','firewall'],['Signatures','signatures']].map(([label,field])=>{const value=Object.hasOwn(checks,snapshot?.[field])?snapshot[field]:'unknown';return '<div data-check="'+value+'"><span>'+label+'</span><strong><i aria-hidden="true">'+(value==='enabled'?'✓':value==='disabled'?'!':'?')+'</i>'+esc(field==='signatures'&&value==='disabled'?'À actualiser':checks[value])+'</strong></div>';}).join('')}
                </div>
                <section class="agent-record-antivirus">
                  <div class="agent-record-section-label"><h4>WolfGuard Antivirus</h4><span>ClamAV</span></div>
                  <div class="agent-record-antivirus-state" data-av-state="${ownState}"><span aria-hidden="true">${settingsIcon('shield')}</span><strong>${esc(ownLabel)}</strong></div>
                  ${fields([['Moteur',own?.installed?own.engineVersion||'Version non renseignée':own?'Non installé':'Non confirmé'],['Dernière analyse',own?.lastScanAt?timestamp(own.lastScanAt):'Non renseignée'],['Signatures mises à jour',own?.signatureAt?timestamp(own.signatureAt):'Non renseignées']])}
                </section>
              </section>
              <section class="agent-record-card agent-record-general agent-record-maintenance">
                ${sectionHeading('monitor','Poste et agent')}
                ${fields([['Nom du poste',agent.name],['Système',workspaceAgents.platformName(agent.platform),'info'],['Version',agent.version?.slice(0,12)||'Non remontée','version'],['Mises à jour',agent.capabilities?.includes('auto-update-v1')?'Automatiques (5 min)':'Manuelles'],['Politique configurée',policy?policy.mode==='protect'?'Protection':'Observation':edrAllowed?'Non renseignée':'Accès non accordé',policy?'info':null],['Dernier contact',timestamp(agent.lastSeen)]])}
                ${updateHTML(agent,{record:true})}
              </section>
            </div>
            ${(snapshot?.warnings||[]).map(message=>'<p class="agent-record-notice">'+esc(message)+'</p>').join('')}
          </section>
          ${edrAllowed&&!agent.local?'<section '+panel('journal')+'><div class="agent-record-page-heading"><h3>Journal de l’agent</h3><button type="button" class="agent-record-events" data-record-edr>Gérer dans EDR</button></div><div data-agent-journal></div></section>':''}
          <section ${panel('tools')} class="agent-record-tools">
            <div class="agent-record-page-heading"><h3>Outils et diagnostics</h3></div>
            <section class="agent-record-card">${sectionHeading('monitor','Accès à distance')}<div class="agent-details-actions">${actions.filter(a=>a.mode).map(tool).join('')}</div></section>
            <section class="agent-record-card">${sectionHeading('scan','Analyse et protection')}<div class="agent-details-actions">${actions.filter(a=>!a.mode).map(tool).join('')}</div></section>
          </section>
          <section ${panel('details')} class="agent-record-details">
            <div class="agent-record-page-heading"><h3>Configuration et détails</h3></div>
            <details id="agentDetailsPolicy" class="agent-record-disclosure" ${policyOpen?'open':''}>
              <summary>Politique EDR configurée</summary>
              ${fields([['Mode demandé',policy?policy.mode==='protect'?'Protéger et maintenir les protections':'Observer les protections existantes':edrAllowed?'Non renseigné':'Accès non accordé'],['Maintien du temps réel',policy?policy.realtime?'Demandé':'Non demandé':'Non renseigné'],['Maintien du pare-feu',policy?policy.firewall?'Demandé':'Non demandé':'Non renseigné'],['Révision demandée',count(endpoint?.revision)],['Révision appliquée confirmée',count(snapshot?.appliedRevision)]])}
              <p class="agent-record-caption">Les réglages demandés ne prouvent pas leur application par l’agent.</p>
            </details>
            <details id="agentDetailsTechnical" class="agent-record-disclosure" ${detailsOpen?'open':''}>
              <summary>Informations techniques et identifiants</summary>
              ${fields([['Identifiant du poste',agent.id],['Version installée',agent.version||'Non remontée'],['Version publiée',!releaseStale?publishedRelease?.version||'Indisponible':'Indisponible'],['Version des signatures',snapshot?.signatureVersion||'Non confirmée'],['Réception du relevé',timestamp(endpoint?.receivedAt)],['Actions sur les protections',snapshot?snapshot.canEnforce?'Prises en charge par le composant système':'Privilèges système nécessaires':'Non confirmées']])}
              <p class="agent-record-caption">Les informations matérielles et les adresses réseau ne sont pas remontées par cet inventaire.</p>
            </details>
            ${!agent.local&&can('agents.revoke',agent)?'<section class="agent-record-removal"><div><h3>Retirer ce poste</h3><p>Révoquer son accès arrête ses scans et ses partages en cours. Une nouvelle association sera nécessaire pour le reconnecter.</p></div><div class="agent-record-removal-actions"><button type="button" class="settings-btn" data-record-uninstall="'+esc(agent.id)+'">Désinstaller l’agent</button><button type="button" data-record-revoke="'+esc(agent.id)+'" '+(busy||stale||revoking?'disabled':'')+'>'+esc(revoking?'Révocation…':'Révoquer l’accès')+'</button></div>'+(revokeError?.id===agent.id?'<p class="access-error" role="alert">'+esc(revokeError.message)+'</p>':'')+'</section>':''}
          </section>
        </div>
      </div>`;
      if (html !== detailHTML) {
        const scrollTop=find('.agent-record-content')?.scrollTop||0;
        const focused = document.activeElement, action = focused?.dataset.detailAction, update = focused?.dataset.agentInstallUpdate, tab = focused?.dataset.recordTab, edr = focused?.hasAttribute('data-record-edr'), log = focused?.hasAttribute('data-record-journal'), restriction = focused?.hasAttribute('data-record-restricted'), revoke = focused?.dataset.recordRevoke, disclosure = focused?.tagName==='SUMMARY'&&focused.parentElement?.id;
        find('#agentDetailsBody').innerHTML = html; detailHTML = html;
        find('.agent-record-content').scrollTop=scrollTop;
        if (action) (find('[data-detail-action="' + CSS.escape(action) + '"]:not(:disabled)') || find('#agentDetailsClose')).focus({preventScroll:true});
        else if (update || edr || log) (find(log?'[data-record-journal]:not(:disabled)':edr?'[data-record-edr]:not(:disabled)':'#agentRecord-overview [data-agent-install-update="'+CSS.escape(update)+'"]:not(:disabled)') || find('#agentDetailsClose')).focus({preventScroll:true});
        else if(restriction)find('[data-record-restricted]:not(:disabled)')?.focus({preventScroll:true});
        else if(revoke)find('[data-record-revoke="'+CSS.escape(revoke)+'"]:not(:disabled)')?.focus({preventScroll:true});
        else if(tab)find('[data-record-tab="'+CSS.escape(tab)+'"]')?.focus({preventScroll:true});
        else if(disclosure)find('#'+CSS.escape(disclosure)+' summary')?.focus({preventScroll:true});
      }
      syncJournal();
    }
    async function refresh() {
      if (!live() || busy || selecting || visibilitySaving || revoking || bulkBusy || groupsBusy) return;
      busy = true; find('#agentsRefresh').disabled = true; find('#agentDetailsRefresh').disabled = true;
      root.dataset.refreshing = 'true';
      find('.agents-table-scroll').setAttribute('aria-busy', 'true');
      try {
        const [data, summary, release] = await Promise.all([
          workspaceAgents.snapshot(),
          workspaceAgents.available() && can('edr.read') && workspaceModules.allows('edr')
            ? WolfGuardCloud.agentRequest('edr', undefined, {signal}).then(data => ({data}), () => ({failed:true}))
            : Promise.resolve(null),
          WolfGuardAgentUpdates.release().then(data => ({data}), () => ({failed:true}))
        ]);
        if (!live()) return;
        protections = new Map((summary?.data?.endpoints || []).map(endpoint => [endpoint.id, endpoint]));
        protectionStale = !!summary?.failed;
        publishedRelease = release.data || null; releaseStale = !!release.failed;
        if (!data.agents.length && summary?.data?.endpoints?.length) {
          const serverTime = summary.data.serverTime || Date.now(), preferred = await setting('scanAgentId','');
          if (!live()) return;
          data.agents = summary.data.endpoints.map(endpoint => ({...endpoint, online:endpoint.online && endpoint.lastSeen > serverTime - 20000}));
          data.selected = data.agents.find(agent => agent.id === preferred) || data.agents.at(-1);
        }
        if (desktopBridge.available && !data.agents.length) {
          const local = {id:'local-desktop', name:'Ce PC', platform:'win32', online:true, local:true, capabilities:['network-scan-v3']};
          data.agents = [local]; data.selected = local;
        }
        const previous = selected?.id;
        agents = data.agents; selected = data.selected; stale = false;
        for(const id of checked)if(!agents.some(agent=>agent.id===id))checked.delete(id);
        if (previous !== selected?.id) await renderTool(true);
        find('#agentsStatus').textContent = selected?.local ? 'Les scans de ce PC sont disponibles localement.' : workspaceAgents.available() ? 'Liste actualisée à ' + new Date().toLocaleTimeString('fr-FR') : 'Connecte-toi au service pour retrouver tes agents associés.';
        if (protectionStale) find('#agentsStatus').textContent += ' · Les relevés de protection ne sont pas disponibles.';
      } catch (error) {
        if (!live()) return;
        stale = true; find('#agentsStatus').textContent = error.message + ' La disponibilité des postes n’est plus confirmée.';
      } finally {
        busy = false;
        if (live()) { root.dataset.refreshing = 'false'; find('.agents-table-scroll').setAttribute('aria-busy', 'false'); find('#agentsRefresh').disabled = false; find('#agentDetailsRefresh').disabled = false; draw(); if(!bulkBusy&&!stale&&!releaseStale)WolfGuardAgentUpdates.automatic(agents,{onChange:()=>{if(live())draw();}}); clearTimeout(timer); timer = setTimeout(refresh, 10000); }
      }
    }
    find('#agentsSearch').oninput = event => { query = event.target.value.trim(); draw(); };
    find('#agentsFilter').onchange = event => { filter = event.target.value; draw(); };
    find('#agentsPlatform').onchange = event => { platform = event.target.value; draw(); };
    find('#agentsProtection').onchange = event => { protectionFilter = event.target.value; draw(); };
    find('#agentsClearFilters').onclick = () => { clearFilters(); find('#agentsSearch').focus(); };
    find('#agentsActiveFilters').onclick = event => {
      const field = event.target.closest('[data-agent-clear]')?.dataset.agentClear;
      if (!Object.hasOwn(filterControls, field)) return;
      clearFilters(field); find(filterControls[field]).focus();
    };
    find('.agents-table thead').onclick = event => {
      const button = event.target.closest('[data-agent-sort]');
      if (!button) return;
      descending = sort === button.dataset.agentSort ? !descending : false;
      sort = button.dataset.agentSort; draw();
    };
    find('#agentsRefresh').onclick = refresh;
    find('#agentsMobileSort').onchange=event=>{sort=event.target.value;draw();};
    find('#agentsMobileDirection').onclick=()=>{descending=!descending;draw();};
    find('#agentsSelectAll').onchange=event=>{if(bulkBusy)return;for(const agent of filteredAgents().filter(agent=>!agent.local))if(event.target.checked)checked.add(agent.id);else checked.delete(agent.id);syncSelection();};
    find('#agentsClearSelection').onclick=()=>{if(bulkBusy)return;checked.clear();selectionAnchor='';syncSelection();find('#agentsSelectAll').focus();};
    find('#agentsBulkCommand').onchange=syncSelection;
    find('#agentsBulkRun').onclick=()=>runBulk();
    find('#agentsBulkCancel').onclick=()=>{bulkCancel=true;syncSelection();};
    find('.agents-fleet').addEventListener('keydown',event=>{
      if(bulkBusy||event.target.closest('input:not([type="checkbox"]),select,textarea'))return;
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'){
        event.preventDefault();event.stopPropagation();for(const agent of filteredAgents().filter(agent=>!agent.local))checked.add(agent.id);syncSelection();
      }else if(event.key==='Escape'&&checked.size){event.preventDefault();event.stopPropagation();checked.clear();syncSelection();}
    },{signal});
    find('#agentsGroupCreate').onclick=()=>newGroup();
    find('#agentsView').onchange=event=>{const view=event.target.value;groupChange(()=>groups.setView(view));};
    find('#agentsList').onclick = event => {
      const groupToggle=event.target.closest('[data-group-toggle]');if(groupToggle){groupChange(()=>groups.toggle(groupToggle.dataset.groupToggle));return;}
      const rename=event.target.closest('[data-group-rename]');if(rename){renameGroup(rename.dataset.groupRename);return;}
      const remove=event.target.closest('[data-group-remove]');if(remove){removeGroup(remove.dataset.groupRemove);return;}
      const groupCheck=event.target.closest('[data-group-check]');if(groupCheck){if(!bulkBusy&&!groupsBusy){for(const agent of groups.buckets(filteredAgents()).find(group=>group.id===groupCheck.dataset.groupCheck)?.rows||[])if(!agent.local){if(groupCheck.checked)checked.add(agent.id);else checked.delete(agent.id);}syncSelection();}return;}
      const checkbox=event.target.closest('[data-fleet-check]');if(checkbox){selectRange(checkbox.dataset.fleetCheck,checkbox.checked,event.shiftKey);return;}
      const log=event.target.closest('[data-open-agent-journal]');if(log){openJournal(log.dataset.openAgentJournal);return;}
      const update = event.target.closest('[data-agent-install-update]'); if(update){ if(!update.disabled)updateAgent(update.dataset.agentInstallUpdate); return; }
      if(event.target.closest('a[download]'))return;
      const security = event.target.closest('[data-agent-security]'); if(security){ if(!security.disabled)runAction('edr',security.dataset.agentSecurity); return; }
      if (event.target.closest('a,select,input')) return;
      const row = event.target.closest('[data-agent-row]');
      if (row) {
        if(event.ctrlKey||event.metaKey||event.shiftKey){selectRange(row.dataset.agentRow,event.shiftKey||!checked.has(row.dataset.agentRow),event.shiftKey);return;}
        choose(row.dataset.agentRow); openDetails(row.dataset.agentRow);
      }
    };
    find('#agentsList').oncontextmenu = event => {
      const row = event.target.closest('[data-agent-row]');
      if (!row) return;
      event.preventDefault(); event.stopPropagation();
      const box = row.getBoundingClientRect();
      openMenu(row.dataset.agentRow, {x:event.clientX || box.left + 24, y:event.clientY || box.bottom});
    };
    find('#agentsList').onkeydown = event => {
      if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
      const row = event.target.closest('[data-agent-row]');
      if (!row) return;
      event.preventDefault(); event.stopPropagation();
      const box = row.getBoundingClientRect(); openMenu(row.dataset.agentRow, {x:box.left + 24, y:box.bottom});
    };
    document.addEventListener('pointerdown', event => {
      suppressClick = false;
      if (menu && !menu.contains(event.target)) closeMenu();
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      const row = event.target.closest('[data-agent-row]');
      if (!row || !root.contains(row)) return;
      const id = row.dataset.agentRow, point = {x:event.clientX, y:event.clientY};
      touchStart = point;
      pressTimer = setTimeout(() => { openMenu(id, point); suppressClick = true; }, 550);
    }, {signal, capture:true});
    document.addEventListener('pointermove', event => {
      if (touchStart && Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) > 10) { clearTimeout(pressTimer); touchStart = null; }
    }, {signal, capture:true});
    for (const type of ['pointerup','pointercancel']) document.addEventListener(type, () => { clearTimeout(pressTimer); touchStart = null; }, {signal, capture:true});
    document.addEventListener('click', event => {
      if (!suppressClick || !event.detail) return;
      suppressClick = false; event.preventDefault(); event.stopPropagation();
    }, {signal, capture:true});
    document.addEventListener('focusin', event => { if (menu && !menu.contains(event.target)) closeMenu(); }, {signal});
    document.addEventListener('keydown', event => {
      if (!menu) return;
      if (event.key === 'Escape' || event.key === 'Tab') {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); }
        closeMenu(true); return;
      }
      if (!menu.contains(document.activeElement)) return;
      const buttons = [...menu.querySelectorAll('button:not(:disabled)')];
      let index = buttons.indexOf(document.activeElement);
      if (event.key === 'ArrowDown') index = (index + 1) % buttons.length;
      else if (event.key === 'ArrowUp') index = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = buttons.length - 1;
      else return;
      event.preventDefault(); buttons[index]?.focus();
    }, {signal, capture:true});
    document.addEventListener('scroll', event => { if (menu && !menu.contains(event.target)) closeMenu(); }, {signal, capture:true});
    window.addEventListener('resize', () => closeMenu(true), {signal});
    let renderedSection = null, renderedAgent = null, renderedMode = null;
    function dismissTool() {
      const panel = find('#agentToolPanel');
      if (panel.open) panel.close();
      panel.hidden = true;
    }
    async function closeTool() {
      if (!live()) return;
      try {
        if (!await openSection('security') || !live()) return;
        (find('[data-fleet-agent="' + CSS.escape(selected?.id || '') + '"]') || find('#agentsSearch')).focus({preventScroll:true});
      } catch (error) { if (live()) find('#agentsStatus').textContent = error.message; }
    }
    async function renderTool(force = false) {
      if (!live()) return;
      const action = actions.find(item => item.section === state.section && (!item.mode || item.mode === remoteMode));
      const panel = find('#agentToolPanel'), host = find('#agentToolHost');
      root.dataset.activeAction = action?.id || '';
      if (!action) {
        dismissTool();
        host.replaceChildren(); renderedSection = null; draw(); return;
      }
      find('#agentToolTitle').textContent = action.label;
      panel.hidden = false;
      if (!panel.open) { panel.showModal(); find('#agentToolClose').focus({preventScroll:true}); }
      if (!force && renderedSection === state.section && renderedAgent === selected?.id && renderedMode === remoteMode && host.firstChild) { draw(); return; }
      renderedSection = state.section; renderedAgent = selected?.id; renderedMode = remoteMode;
      host.className = ''; host.replaceChildren();
      draw();
      if (isScanSection(state.section)) await renderScanWorkspace(host);
      else if (state.section === 'edr') {
        if (selected) await edrWorkspace.render(host, selected.id);
        else host.textContent = 'Choisis un agent dans la liste pour consulter sa protection.';
      }
      else if (state.section === 'remote') { remoteDesktopWorkspace.preferMode(remoteMode); await remoteDesktopWorkspace.render(host); }
    }
    find('#agentToolClose').onclick = closeTool;
    find('#agentDetailsJournal').onclick=()=>openJournal(detailAgentId);
    find('#agentDetailsClose').onclick = () => dismissDetails(true);
    find('#agentDetailsRefresh').onclick = refresh;
    find('#agentDetailsBody').addEventListener('change',async event=>{
      const input=event.target.closest('[data-record-restricted]');
      if(!input||visibilitySaving||busy||stale||!live())return;
      const agent=agents.find(row=>row.id===input.dataset.recordRestricted);if(!agent)return;
      const restricted=input.checked;visibilitySaving=true;visibilityNotice=null;renderDetails();
      try{
        const result=await WolfGuardCloud.agentRequest('agents/restricted',{id:agent.id,restricted},{signal});
        if(!live())return;agent.restricted=result.restricted;
        visibilityNotice={id:agent.id,error:false,message:restricted?'Poste masqué pour les autres rôles. Accès réservé aux administrateurs et au propriétaire.':'Restriction retirée. Le poste est accessible selon le rôle de chaque compte.'};
      }catch(error){if(live())visibilityNotice={id:agent.id,error:true,message:'Modification non enregistrée. '+error.message};}
      finally{visibilitySaving=false;if(live()){draw();if(detailAgentId===agent.id)find('[data-record-restricted]')?.focus({preventScroll:true});clearTimeout(timer);timer=setTimeout(refresh,10000);}}
    },{signal});
    find('#agentDetailsPanel').addEventListener('cancel', event => { event.preventDefault(); dismissDetails(true); }, {signal});
    find('#agentDetailsPanel').addEventListener('keydown', event => event.stopPropagation(), {signal});
    find('#agentDetailsBody').onclick = event => {
      const tab=event.target.closest('[data-record-tab]');if(tab){selectRecordTab(tab.dataset.recordTab);return;}
      const log=event.target.closest('[data-record-journal]');if(log){if(!log.disabled)openJournal(detailAgentId);return;}
      const edr=event.target.closest('[data-record-edr]');if(edr){if(!edr.disabled)runAction('edr',detailAgentId);return;}
      const update = event.target.closest('[data-agent-install-update]');
      if(update){if(!update.disabled)updateAgent(update.dataset.agentInstallUpdate);return;}
      const uninstall=event.target.closest('[data-record-uninstall]');if(uninstall){const id=uninstall.dataset.recordUninstall;dismissDetails();openAgentRemovalInterface({agentId:id,onClose:()=>{if(live())openDetails(id);}});return;}
      const revoke=event.target.closest('[data-record-revoke]');if(revoke){if(!revoke.disabled)revokeAgent(revoke.dataset.recordRevoke);return;}
      const button = event.target.closest('[data-detail-action]');
      if (button && !button.disabled) runAction(button.dataset.detailAction,detailAgentId);
    };
    async function revokeAgent(id){
      const agent=agents.find(row=>row.id===id);
      if(!agent||!live()||busy||stale||revoking||!can('agents.revoke',agent))return;
      const confirmed=await appConfirm('Révoquer l’accès de « '+agent.name+' » ? Ses scans et partages en cours seront arrêtés.',{title:'Révoquer ce poste',confirmLabel:'Révoquer l’accès',danger:true});
      if(!confirmed||!live()||revoking||stale||!can('agents.revoke',agent))return;
      revoking=true;revokeError=null;renderDetails();
      try{
        await WolfGuardCloud.agentRequest('agents/revoke',{id},{signal});if(!live())return;
        agents=agents.filter(row=>row.id!==id);protections.delete(id);
        if(selected?.id===id){selected=null;try{await setSetting('scanAgentId','');}catch{}dismissTool();}
        dismissDetails(true);draw();find('#agentsStatus').textContent='Accès de « '+agent.name+' » révoqué.';
      }catch(error){if(live())revokeError={id,message:error.message};}
      finally{revoking=false;if(live()){renderDetails();if(detailAgentId===id)find('[data-record-revoke]')?.focus({preventScroll:true});clearTimeout(timer);timer=setTimeout(refresh,10000);}}
    }
    find('#agentDetailsBody').addEventListener('keydown',event=>{
      const tab=event.target.closest('[data-record-tab]');if(!tab||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
      event.preventDefault();const tabs=[...find('#agentDetailsBody').querySelectorAll('[data-record-tab]')].map(button=>button.dataset.recordTab),index=tabs.indexOf(tab.dataset.recordTab);
      selectRecordTab(tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:tabs.length-1))%tabs.length],true);
    },{signal});
    find('#agentToolPanel').addEventListener('cancel', event => { event.preventDefault(); closeTool(); }, {signal});
    find('#agentToolPanel').addEventListener('keydown', event => event.stopPropagation(), {signal});
    groups.load().then(()=>{if(live()){groupsReady=true;draw();}}).catch(error=>{if(live())find('#agentsStatus').textContent='Groupes indisponibles : '+error.message;});
    current = {root, key, renderTool, closeMenu, dismissTool, dismissDetails};
    // The fleet shell is usable immediately. Its server refresh must not hold
    // the shared navigation queue or prevent leaving the Security section.
    if(state.section==='security'){refresh().catch(console.error);return;}
    await refresh();
    await renderTool();
  }
  return {render, reset};
})();
