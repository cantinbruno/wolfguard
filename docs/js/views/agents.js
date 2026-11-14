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
    let detailAgentId = null, detailHTML = '', detailTab = 'overview';
    const timestamp = value => value ? new Date(value).toLocaleString('fr-FR') : 'Aucun contact';
    const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    const columns = [['name','Poste'],['online','Connexion'],['health','Protection du poste'],['alerts','Alertes'],['version','Agent'],['lastSeen','Dernier contact']];
    const mobileTable=matchMedia('(max-width:700px)');
    function tableKeyboard(){root.querySelectorAll('[data-agent-sort]').forEach(button=>{button.tabIndex=mobileTable.matches?-1:0;});}
    mobileTable.addEventListener('change',tableKeyboard,{signal});
    root.innerHTML = `<header class="agents-heading">
      <div class="agents-heading-intro"><span class="agents-heading-icon" aria-hidden="true">${settingsIcon('shield-check')}</span><div><span class="agents-eyebrow">PARC INFORMATIQUE</span><h1>Sécurité des postes</h1></div></div>
      <div class="agents-heading-actions"><button type="button" id="agentsManage" class="agents-primary">${settingsIcon('sliders-horizontal')}Gérer les agents</button></div>
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
        <div class="agents-mobile-sort"><label for="agentsMobileSort">Trier par</label><select id="agentsMobileSort">${columns.map(([field,label])=>'<option value="'+field+'">'+label+'</option>').join('')}</select><button type="button" id="agentsMobileDirection" aria-label="Inverser le sens du tri">↑</button></div>
        <div class="agents-table-scroll" tabindex="0" role="region" aria-label="Tableau des postes, défilement horizontal si nécessaire">
          <table class="agents-table"><caption class="agents-visually-hidden">Agents associés et derniers états de protection. Sélectionne un poste pour utiliser ses outils.</caption><thead><tr>${columns.map(([field,label])=>'<th scope="col" data-agent-column="'+field+'" aria-sort="'+(field==='name'?'ascending':'none')+'"><button type="button" data-agent-sort="'+field+'">'+label+'<span class="agents-sort-indicator" aria-hidden="true">'+(field==='name'?'↑':'↕')+'</span></button></th>').join('')}</tr></thead><tbody id="agentsList"></tbody></table>
        </div>
        <footer class="agents-table-footer"><span id="agentsCount">0 poste</span><span class="agents-check-legend" aria-label="Légende des protections"><span data-check="enabled">✓ Activé</span><span data-check="disabled">! À traiter</span><span data-check="unknown">? À confirmer</span></span><span>Clic pour ouvrir la fiche · Clic droit ou appui long pour les options.</span></footer>
      </section>
      <div class="agents-main">
        <dialog id="agentToolPanel" class="agents-tool-panel" aria-labelledby="agentToolTitle" aria-describedby="agentToolTarget" hidden><header class="agents-tool-heading"><div><span class="agents-eyebrow" id="agentToolTarget"></span><h2 id="agentToolTitle"></h2></div><button type="button" id="agentToolClose" autofocus>${settingsIcon('x')}Retour aux postes</button></header><div id="agentToolHost"></div></dialog>
      </div>
    </div><dialog id="agentDetailsPanel" class="agents-tool-panel agent-details-panel" aria-labelledby="agentDetailsTitle" aria-describedby="agentDetailsTarget" hidden><header class="agents-tool-heading"><div><span class="agents-eyebrow">FICHE DU POSTE</span><span class="agents-visually-hidden" id="agentDetailsTarget"></span><h2 id="agentDetailsTitle"></h2></div><button type="button" id="agentDetailsClose" autofocus>${settingsIcon('x')}Retour aux postes</button></header><div id="agentDetailsBody" class="agent-details-body"></div></dialog>`;
    find('#agentsManage').hidden = !can('agents.read') && !can('agents.pair');
    find('#agentsManage').onclick = () => openAgentsInterface({tab:can('agents.read')?'fleet':'connect'});

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
    function updateHTML(agent) {
      const info = updateInfo(agent);
      const label = info.task?.running ? 'Mise à jour…' : info.current ? 'À jour' : 'Mettre à jour';
      const message = info.task?.running || info.task?.status === 'failed' && !info.current ? info.task.message : info.current ? 'Version confirmée par le poste' : info.reason || 'Mise à jour automatique dès que le poste est disponible';
      const manual = agent.online && !agent.capabilities?.includes('remote-terminal-v1') && ['win32','linux','darwin'].includes(agent.platform);
      const file = {win32:'WolfGuard-Agent-Windows.exe',linux:'WolfGuard-Agent-Linux.zip',darwin:'WolfGuard-Agent-macOS.zip'}[agent.platform];
      return '<div class="agents-version-line"><code title="' + esc(agent.version || 'Version non remontée') + '">' + esc(agent.version?.slice(0,8) || 'Non remontée') + '</code>' + (manual ? '<a class="agents-update-button" href="downloads/' + file + '" download title="Télécharger l’agent récent à installer sur ce poste">Installer</a>' : '<button type="button" class="agents-update-button" data-agent-install-update="' + esc(agent.id) + '" data-current="' + info.current + '" ' + (!info.canUpdate ? 'disabled' : '') + ' title="' + esc(message) + '">' + label + '</button>') + '</div><small class="agents-update-status" data-agent-update-status="' + esc(agent.id) + '" data-state="' + (info.current ? 'completed' : info.task?.status || 'idle') + '" title="' + esc(message) + '" role="status">' + esc(message) + '</small>';
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
      const focusId = document.activeElement?.dataset.fleetAgent, focusedUpdate = document.activeElement?.dataset.agentInstallUpdate;
      const selectedHidden = selected && !rows.some(agent => agent.id === selected.id);
      find('#agentsCount').textContent = rows.length + ' poste' + (rows.length === 1 ? '' : 's') + (rows.length !== agents.length ? ' sur ' + agents.length : '') + (selected ? ' · 1 sélectionné' + (selectedHidden ? ' (hors filtre)' : '') : '');
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
      else find('#agentsList').innerHTML = rows.map(agent => {
        const status = protection(agent), chosen = agent.id === selected?.id;
        return '<tr class="agents-fleet-row" data-agent-row="' + esc(agent.id) + '" data-selected="' + chosen + '"><td data-label="Poste"><button type="button" class="agents-endpoint" title="' + esc(agent.name) + '" data-fleet-agent="' + esc(agent.id) + '" aria-haspopup="dialog" aria-keyshortcuts="Shift+F10" aria-pressed="' + chosen + '" ' + (selecting ? 'disabled' : '') + '><span class="agents-row-selector" aria-hidden="true">' + (chosen ? '✓' : '') + '</span><span class="agents-device-icon" aria-hidden="true">' + settingsIcon('monitor') + '</span><span class="agents-endpoint-name"><strong>' + esc(agent.name) + '</strong><small>' + esc(workspaceAgents.platformName(agent.platform)) + '</small></span><span class="agents-row-open" aria-hidden="true">↗</span></button></td><td data-label="Connexion"><span class="agents-presence" data-state="' + (stale ? 'unknown' : agent.online ? 'online' : 'offline') + '">' + (stale ? 'À vérifier' : agent.online ? 'Connecté' : 'Hors ligne') + '</span></td><td data-label="Protection">' + protectionHTML(agent) + '</td><td data-label="Alertes"><span class="agents-alerts" data-alert="' + (status.alerts > 0) + '" title="Alertes non acquittées dans les derniers relevés">' + (status.alerts ?? '—') + '</span></td><td data-label="Agent">' + updateHTML(agent) + '</td><td data-label="Dernier contact" class="agents-last-contact">' + contactHTML(agent.lastSeen) + '</td></tr>';
      }).join('') || '<tr><td colspan="6"><div class="agents-empty"><span class="agents-empty-icon" aria-hidden="true">' + settingsIcon('monitor') + '</span><h2>' + (agents.length ? 'Aucun poste pour ces filtres' : 'Aucun agent associé') + '</h2><p>' + (agents.length ? 'Modifie ou efface les filtres pour retrouver tes postes.' : 'Ajoute un agent Windows, Linux ou macOS pour retrouver ce poste et ses actions ici.') + '</p></div></td></tr>';
      root.querySelectorAll('[data-agent-column]').forEach(heading => {
        const active = heading.dataset.agentColumn === sort;
        heading.setAttribute('aria-sort', active ? descending ? 'descending' : 'ascending' : 'none');
        heading.querySelector('.agents-sort-indicator').textContent = active ? descending ? '↓' : '↑' : '↕';
      });
      find('#agentsMobileSort').value=sort;find('#agentsMobileDirection').textContent=descending?'↓':'↑';find('#agentsMobileDirection').setAttribute('aria-label',descending?'Passer au tri croissant':'Passer au tri décroissant');
      tableKeyboard();
      if (focusId) find('[data-fleet-agent="' + CSS.escape(focusId) + '"]')?.focus({preventScroll:true});
      if (focusedUpdate) find('[data-agent-install-update="' + CSS.escape(focusedUpdate) + '"]:not(:disabled)')?.focus({preventScroll:true});
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
    function renderMenu() {
      if (!menu) return;
      const agent = agents.find(item => item.id === menuAgentId);
      if (!live() || !agent || !filteredAgents().some(item => item.id === agent.id)) { closeMenu(); return; }
      const focused = menu.contains(document.activeElement), focusedAction = document.activeElement?.dataset.fleetAction;
      menu.innerHTML = '<header class="agents-menu-heading"><span>OPTIONS DU POSTE</span><h2>' + esc(agent.name) + '</h2><small>' + esc(workspaceAgents.platformName(agent.platform)) + '</small></header><button type="button" role="menuitem" data-fleet-action="details"><span class="agents-menu-icon" aria-hidden="true">' + settingsIcon('monitor') + '</span><span class="agents-menu-copy"><strong>Fiche du poste</strong><small>Identité, connexion, agent et protections.</small></span></button>' + actions.map(action => {
        const unavailable = reason(action, agent), icon = ['terminal','files'].includes(action.mode) ? workspaceNavigationIcon(action.mode) : workspaceSectionIcon(action.section);
        return '<button type="button" role="menuitem" data-fleet-action="' + action.id + '" ' + (unavailable || selecting ? 'disabled aria-disabled="true"' : '') + '><span class="agents-menu-icon" aria-hidden="true">' + icon + '</span><span class="agents-menu-copy"><strong>' + action.label + '</strong><small>' + esc(unavailable || action.description) + '</small></span></button>';
      }).join('');
      const box = menu.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(menuPoint.x, innerWidth - box.width - 8)) + 'px';
      menu.style.top = Math.max(8, Math.min(menuPoint.y, innerHeight - box.height - 8)) + 'px';
      root.querySelectorAll('[data-agent-row]').forEach(row => row.toggleAttribute('data-context', row.dataset.agentRow === menuAgentId));
      if (focused) (menu.querySelector('[data-fleet-action="' + CSS.escape(focusedAction || '') + '"]:not(:disabled)') || menu.querySelector('button:not(:disabled)') || menu).focus({preventScroll:true});
    }
    function openMenu(id, point) {
      if (!live() || selecting || !agents.some(agent => agent.id === id)) return;
      closeMenu(); closeContextMenu();
      menuAgentId = id; menuPoint = point;
      menu = document.createElement('div'); menu.id = 'agentActions';
      menu.className = 'context-menu agents-context-menu'; menu.tabIndex = -1;
      menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Options pour ' + agents.find(agent => agent.id === id).name);
      menu.onclick = event => {
        const button = event.target.closest('[data-fleet-action]');
        if (button && !button.disabled) runAction(button.dataset.fleetAction, id);
      };
      document.body.appendChild(menu); renderMenu();
      (menu?.querySelector('button:not(:disabled)') || menu)?.focus({preventScroll:true});
    }
    async function runAction(actionId, id) {
      if (actionId === 'details') { openDetails(id); return; }
      const action = actions.find(item => item.id === actionId), agent = agents.find(item => item.id === id);
      if (!live() || !action || !agent || selecting || reason(action, agent)) return;
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
      detailAgentId = null; detailHTML = '';
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
      if(!['overview','tools','details'].includes(id))return;
      detailTab=id;
      for(const button of find('#agentDetailsBody').querySelectorAll('[data-record-tab]')){const active=button.dataset.recordTab===id;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;if(active&&focus)button.focus({preventScroll:true});}
      for(const panel of find('#agentDetailsBody').querySelectorAll('[role="tabpanel"]'))panel.hidden=panel.id!=='agentRecord-'+id;
    }
    function renderDetails() {
      if (!detailAgentId || !live()) return;
      const agent = agents.find(item => item.id === detailAgentId);
      if (!agent) { dismissDetails(true); return; }
      const status = protection(agent), info = updateInfo(agent);
      const edrAllowed = can('edr.read') && workspaceModules.allows('edr');
      const endpoint = edrAllowed && !protectionStale && !stale ? protections.get(agent.id) : null;
      const snapshot = status.snapshot, policy = endpoint?.policy;
      const checks = {enabled:'Activé',disabled:'Désactivé / à actualiser',passive:'Passif · antivirus tiers',unsupported:'Non intégré',unknown:'À confirmer'};
      const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 'Non renseigné';
      const metric = value => Number.isSafeInteger(value) && value >= 0 ? value : '—';
      const fields = rows => '<dl>' + rows.map(([label,value]) => '<div><dt>' + esc(label) + '</dt><dd>' + esc(String(value ?? 'Non renseigné')) + '</dd></div>').join('') + '</dl>';
      const tool = action => {
        const unavailable = reason(action,agent);
        const icon = ['terminal','files'].includes(action.mode) ? workspaceNavigationIcon(action.mode) : workspaceSectionIcon(action.section);
        return '<button type="button" data-detail-action="'+action.id+'" '+(unavailable||selecting?'disabled':'')+'><i aria-hidden="true">'+icon+'</i><span><strong>'+action.label+'</strong><small>'+esc(unavailable||action.description)+'</small></span><b aria-hidden="true">↗</b></button>';
      };
      const own = snapshot?.wolfguardAntivirus;
      const ownLabel = !snapshot ? 'État non confirmé' : !own ? 'Agent à mettre à jour' : !own.installed ? 'Moteur à installer' : !own.enabled ? 'Surveillance suspendue' : ({ready:'Surveillance réactive',scanning:'Analyse en cours',updating:'Signatures en cours',installing:'Installation en cours',error:'Intervention nécessaire'})[own.state]||'État à confirmer';
      const connected = stale ? 'À confirmer' : agent.online ? 'Connecté' : 'Hors ligne';
      const detailsOpen = find('#agentDetailsTechnical')?.open, policyOpen = find('#agentDetailsPolicy')?.open;
      find('#agentDetailsTarget').textContent = agent.name;
      find('#agentDetailsTitle').textContent = agent.name;
      const tabs=[['overview','Vue d’ensemble'],['tools','Outils'],['details','Détails']];
      const panel=name=>'id="agentRecord-'+name+'" role="tabpanel" aria-labelledby="agentRecordTab-'+name+'" '+(detailTab===name?'':'hidden');
      const html = `<div class="agent-record-profile" data-connection="${stale?'unknown':agent.online?'online':'offline'}"><span class="agent-record-avatar" aria-hidden="true">${settingsIcon('monitor')}</span><div><strong>${esc(workspaceAgents.platformName(agent.platform))}</strong><span>${agent.local?'Poste local':'Agent WolfGuard associé'}${agent.restricted?' · Accès réservé aux administrateurs':''}</span></div><div class="agent-record-badges"><span class="agent-record-presence"><i></i>${connected}</span><span class="agents-health" data-health="${status.health}">${status.label}</span></div></div>
      <nav class="agent-record-tabs" role="tablist" aria-label="Fiche du poste">${tabs.map(([id,label])=>'<button type="button" role="tab" id="agentRecordTab-'+id+'" data-record-tab="'+id+'" aria-controls="agentRecord-'+id+'" aria-selected="'+(detailTab===id)+'" tabindex="'+(detailTab===id?'0':'-1')+'">'+label+'</button>').join('')}</nav>
      ${stale||!agent.online?'<p class="agent-record-notice">'+(stale?'Le service est indisponible. Les états affichés restent à confirmer.':'Ce poste est hors ligne. Ses protections actuelles ne peuvent pas être confirmées.')+'</p>':''}
      <section ${panel('overview')}><div class="agent-record-overview">
        <section class="agent-record-card"><header><div><span class="agents-eyebrow">SÉCURITÉ DU POSTE</span><h3>Les protections en un regard</h3></div></header>
        <div class="agent-record-checks">${[['Antivirus','antivirus'],['Temps réel','realtime'],['Pare-feu','firewall'],['Signatures','signatures']].map(([label,field])=>{const value=Object.hasOwn(checks,snapshot?.[field])?snapshot[field]:'unknown';return '<div data-check="'+value+'"><i aria-hidden="true">'+(value==='enabled'?'✓':value==='disabled'?'!':'?')+'</i><span>'+label+'<strong>'+esc(checks[value])+'</strong></span></div>';}).join('')}</div>
        <p class="agent-record-provider">${esc(snapshot?.provider||'Fournisseur non confirmé')}</p>
        <div class="agent-record-antivirus"><span class="agent-record-app-icon" aria-hidden="true">${settingsIcon('shield-check')}</span><div><strong>WolfGuard Antivirus</strong><p>${esc(ownLabel)}</p></div>${own?.engineVersion?'<code>'+esc(own.engineVersion)+'</code>':''}</div>
        <div class="agent-record-counters"><div><strong>${metric(status.alerts)}</strong><span>Alertes ouvertes</span></div><div><strong>${metric(endpoint?.blocks)}</strong><span>Blocages · 24 h</span></div><div><strong>${metric(snapshot?.activeThreats)}</strong><span>Menaces actives</span></div></div>
        <button type="button" class="agent-record-events" data-record-edr ${reason(actions.find(a=>a.id==='edr'),agent)||selecting?'disabled':''}>Voir les événements de protection <span aria-hidden="true">↗</span></button>
        ${(snapshot?.warnings||[]).map(message=>'<p class="agent-record-notice">'+esc(message)+'</p>').join('')}
        </section>
      <aside class="agent-record-side">
        <section class="agent-record-card agent-record-maintenance"><header><div><span class="agents-eyebrow">MAINTENANCE</span><h3>Agent et mises à jour</h3></div>${settingsIcon('refresh-cw')}</header><span class="agent-record-version" data-current="${info.current}">${info.current?'Agent à jour':info.task?.running?'Mise à jour en cours':info.outdated?'Mise à jour disponible':'Version à vérifier'}</span>${updateHTML(agent)}<p class="agent-record-caption">${agent.capabilities?.includes('auto-update-v1')?'Vérification automatique toutes les 5 minutes, même lorsque le site est fermé.':'La mise à jour conserve l’association du poste.'}</p></section>
        <section class="agent-record-activity"><span class="agents-eyebrow">DERNIÈRE ACTIVITÉ</span>${fields([['Contact du poste',timestamp(agent.lastSeen)],['Relevé de protection',timestamp(status.collectedAt)]])}<p>Seul un relevé récent d’un poste connecté confirme ses protections.</p></section>
      </aside></div></section>
      <section ${panel('tools')} class="agent-record-tools"><header><span class="agents-eyebrow">AGIR SUR CE POSTE</span><h3>Outils et diagnostics</h3></header><h4>Accès à distance</h4><div class="agent-details-actions">${actions.filter(a=>a.mode).map(tool).join('')}</div><h4>Analyse et protection</h4><div class="agent-details-actions">${actions.filter(a=>!a.mode).map(tool).join('')}</div></section>
      <section ${panel('details')} class="agent-record-details">
      <details id="agentDetailsPolicy" class="agent-record-disclosure" ${policyOpen?'open':''}><summary>Politique EDR configurée</summary>${fields([['Mode demandé',policy?policy.mode==='protect'?'Protéger et maintenir les protections':'Observer les protections existantes':edrAllowed?'Non renseigné':'Accès non accordé'],['Maintien du temps réel',policy?policy.realtime?'Demandé':'Non demandé':'Non renseigné'],['Maintien du pare-feu',policy?policy.firewall?'Demandé':'Non demandé':'Non renseigné'],['Révision demandée',count(endpoint?.revision)],['Révision appliquée confirmée',count(snapshot?.appliedRevision)]])}<p class="agent-record-caption">Les réglages demandés ne prouvent pas leur application par l’agent.</p></details>
      <details id="agentDetailsTechnical" class="agent-record-disclosure" ${detailsOpen?'open':''}><summary>Informations techniques et identifiants</summary>${fields([['Identifiant du poste',agent.id],['Version installée',agent.version||'Non remontée'],['Version publiée',!releaseStale?publishedRelease?.version||'Indisponible':'Indisponible'],['Version des signatures',snapshot?.signatureVersion||'Non confirmée'],['Réception du relevé',timestamp(endpoint?.receivedAt)],['Actions sur les protections',snapshot?snapshot.canEnforce?'Prises en charge par le composant système':'Privilèges système nécessaires':'Non confirmées']])}<p class="agent-record-caption">Les informations matérielles et les adresses réseau ne sont pas remontées par cet inventaire.</p></details></section>`;
      if (html !== detailHTML) {
        const focused = document.activeElement, action = focused?.dataset.detailAction, update = focused?.dataset.agentInstallUpdate, tab = focused?.dataset.recordTab, edr = focused?.hasAttribute('data-record-edr'), disclosure = focused?.tagName==='SUMMARY'&&focused.parentElement?.id;
        find('#agentDetailsBody').innerHTML = html; detailHTML = html;
        if (action) (find('[data-detail-action="' + CSS.escape(action) + '"]:not(:disabled)') || find('#agentDetailsClose')).focus({preventScroll:true});
        else if (update || edr) (find(edr?'[data-record-edr]:not(:disabled)':'#agentRecord-overview [data-agent-install-update="'+CSS.escape(update)+'"]:not(:disabled)') || find('#agentDetailsClose')).focus({preventScroll:true});
        else if(tab)find('[data-record-tab="'+CSS.escape(tab)+'"]')?.focus({preventScroll:true});
        else if(disclosure)find('#'+CSS.escape(disclosure)+' summary')?.focus({preventScroll:true});
      }
    }
    async function refresh() {
      if (!live() || busy || selecting) return;
      busy = true; find('#agentsRefresh').disabled = true;
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
        if (previous !== selected?.id) await renderTool(true);
        find('#agentsStatus').textContent = selected?.local ? 'Les scans de ce PC sont disponibles localement.' : workspaceAgents.available() ? 'Liste actualisée à ' + new Date().toLocaleTimeString('fr-FR') : 'Connecte-toi au service pour retrouver tes agents associés.';
        if (protectionStale) find('#agentsStatus').textContent += ' · Les relevés de protection ne sont pas disponibles.';
      } catch (error) {
        if (!live()) return;
        stale = true; find('#agentsStatus').textContent = error.message + ' La disponibilité des postes n’est plus confirmée.';
      } finally {
        busy = false;
        if (live()) { root.dataset.refreshing = 'false'; find('.agents-table-scroll').setAttribute('aria-busy', 'false'); find('#agentsRefresh').disabled = false; draw(); if(!stale&&!releaseStale)WolfGuardAgentUpdates.automatic(agents,{onChange:()=>{if(live())draw();}}); clearTimeout(timer); timer = setTimeout(refresh, 10000); }
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
    find('#agentsList').onclick = event => {
      const update = event.target.closest('[data-agent-install-update]'); if(update){ if(!update.disabled)updateAgent(update.dataset.agentInstallUpdate); return; }
      if(event.target.closest('a[download]'))return;
      const security = event.target.closest('[data-agent-security]'); if(security){ if(!security.disabled)runAction('edr',security.dataset.agentSecurity); return; }
      if (event.target.closest('a,select,input')) return;
      const row = event.target.closest('[data-agent-row]');
      if (row) { choose(row.dataset.agentRow); openDetails(row.dataset.agentRow); }
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
    find('#agentDetailsClose').onclick = () => dismissDetails(true);
    find('#agentDetailsPanel').addEventListener('cancel', event => { event.preventDefault(); dismissDetails(true); }, {signal});
    find('#agentDetailsPanel').addEventListener('keydown', event => event.stopPropagation(), {signal});
    find('#agentDetailsBody').onclick = event => {
      const tab=event.target.closest('[data-record-tab]');if(tab){selectRecordTab(tab.dataset.recordTab);return;}
      const edr=event.target.closest('[data-record-edr]');if(edr){if(!edr.disabled)runAction('edr',detailAgentId);return;}
      const update = event.target.closest('[data-agent-install-update]');
      if(update){if(!update.disabled)updateAgent(update.dataset.agentInstallUpdate);return;}
      const button = event.target.closest('[data-detail-action]');
      if (button && !button.disabled) runAction(button.dataset.detailAction,detailAgentId);
    };
    find('#agentDetailsBody').addEventListener('keydown',event=>{
      const tab=event.target.closest('[data-record-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const tabs=['overview','tools','details'],index=tabs.indexOf(tab.dataset.recordTab);
      selectRecordTab(tabs[event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:2))%3],true);
    },{signal});
    find('#agentToolPanel').addEventListener('cancel', event => { event.preventDefault(); closeTool(); }, {signal});
    find('#agentToolPanel').addEventListener('keydown', event => event.stopPropagation(), {signal});
    current = {root, key, renderTool, closeMenu, dismissTool, dismissDetails};
    await refresh();
    await renderTool();
  }
  return {render, reset};
})();
