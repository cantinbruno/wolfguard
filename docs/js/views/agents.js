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
    let detailAgentId = null, detailHTML = '';
    const timestamp = value => value ? new Date(value).toLocaleString('fr-FR') : 'Aucun contact';
    const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    const columns = [['name','Poste'],['online','Connexion'],['health','Protection du poste'],['alerts','Alertes'],['version','Agent'],['lastSeen','Dernier contact']];
    root.innerHTML = `<header class="agents-heading">
      <div class="agents-heading-intro"><span class="agents-heading-icon" aria-hidden="true">${settingsIcon('shield-check')}</span><div><span class="agents-eyebrow">PARC ENDPOINTS</span><h1>Sécurité des postes</h1></div></div>
      <div class="agents-heading-actions"><button type="button" id="agentsManage">${settingsIcon('sliders-horizontal')}Gérer les agents</button><button type="button" id="agentsAdd" class="agents-primary">${settingsIcon('plus')}Ajouter un agent</button><button type="button" id="agentsRefresh" aria-label="Actualiser les agents" title="Actualiser les agents">${settingsIcon('refresh-cw')}<span>Actualiser</span></button></div>
    </header>
    <div id="agentsMetrics" class="agents-metrics"></div><div class="agents-status-bar"><div class="agents-fleet-summary" id="agentsFleetSummary"></div><p id="agentsStatus" role="status" aria-live="polite">Chargement des agents…</p></div>
    <div class="agents-console">
      <section class="agents-fleet" aria-label="Liste des agents">
        <div class="agents-fleet-filters">
          <div class="agents-search-filter"><label for="agentsSearch">Rechercher</label><div class="agents-search">${settingsIcon('search')}<input id="agentsSearch" type="search" placeholder="Nom du poste, système, version…"></div></div>
          <div><label for="agentsFilter">Connexion</label><select id="agentsFilter"><option value="all">Toutes les connexions</option><option value="online">Connectés</option><option value="offline">Hors ligne</option></select></div>
          <div><label for="agentsPlatform">Système</label><select id="agentsPlatform"><option value="all">Tous les systèmes</option><option value="win32">Windows</option><option value="linux">Linux</option><option value="darwin">macOS</option></select></div>
          <div><label for="agentsProtection">Protection EDR</label><select id="agentsProtection"><option value="all">Tous les états</option><option value="protected">Protégés</option><option value="attention">À protéger</option><option value="unknown">À confirmer</option><option value="unsupported">Non intégrée</option><option value="alerts">Avec alertes</option></select></div>
          <button type="button" id="agentsClearFilters" title="Effacer les filtres" aria-label="Effacer les filtres">${settingsIcon('x')}</button>
        </div>
        <div id="agentsActiveFilters" class="agents-active-filters" aria-label="Filtres appliqués" hidden></div>
        <div class="agents-table-scroll" tabindex="0" role="region" aria-label="Tableau des postes, défilement horizontal si nécessaire">
          <table class="agents-table"><caption class="agents-visually-hidden">Agents associés et derniers états de protection. Sélectionne un poste pour utiliser ses outils.</caption><thead><tr>${columns.map(([field,label])=>'<th scope="col" data-agent-column="'+field+'" aria-sort="'+(field==='name'?'ascending':'none')+'"><button type="button" data-agent-sort="'+field+'">'+label+'<span class="agents-sort-indicator" aria-hidden="true">'+(field==='name'?'↑':'↕')+'</span></button></th>').join('')}</tr></thead><tbody id="agentsList"></tbody></table>
        </div>
        <footer class="agents-table-footer"><span id="agentsCount">0 poste</span><span class="agents-check-legend" aria-label="Légende des protections"><span data-check="enabled">✓ Activé</span><span data-check="disabled">! À traiter</span><span data-check="unknown">? À confirmer</span></span><span>Double-clic pour la fiche · Clic droit ou appui long pour les options.</span></footer>
      </section>
      <div class="agents-main">
        <dialog id="agentToolPanel" class="agents-tool-panel" aria-labelledby="agentToolTitle" aria-describedby="agentToolTarget" hidden><header class="agents-tool-heading"><div><span class="agents-eyebrow" id="agentToolTarget"></span><h2 id="agentToolTitle"></h2></div><button type="button" id="agentToolClose" autofocus>${settingsIcon('x')}Retour aux postes</button></header><div id="agentToolHost"></div></dialog>
      </div>
    </div><dialog id="agentDetailsPanel" class="agents-tool-panel agent-details-panel" aria-labelledby="agentDetailsTitle" aria-describedby="agentDetailsTarget" hidden><header class="agents-tool-heading"><div><span class="agents-eyebrow" id="agentDetailsTarget"></span><h2 id="agentDetailsTitle">Fiche du poste</h2></div><button type="button" id="agentDetailsClose" autofocus>${settingsIcon('x')}Retour aux postes</button></header><div id="agentDetailsBody" class="agent-details-body"></div></dialog>`;
    find('#agentsAdd').hidden = !can('agents.pair');
    find('#agentsManage').hidden = !can('agents.read');
    find('#agentsManage').onclick = () => openAgentsInterface();
    find('#agentsAdd').onclick = async () => { await openAgentsInterface(); $('#wgAgentAdd')?.click(); };

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
      return {task,current,reason,canUpdate:!reason && !current && !task?.running, outdated:!!publishedRelease && !!agent.version && !current};
    }
    function updateHTML(agent) {
      const info = updateInfo(agent);
      const label = info.task?.running ? 'Mise à jour…' : info.current ? 'À jour' : 'Mettre à jour';
      const message = info.task?.running || info.task?.status === 'failed' && !info.current ? info.task.message : info.current ? 'Version confirmée par le poste' : info.reason || 'Mise à jour automatique dès que le poste est disponible';
      const manual = agent.online && !agent.capabilities?.includes('remote-terminal-v1') && ['win32','linux','darwin'].includes(agent.platform);
      const file = {win32:'WolfGuard-Agent-Windows.exe',linux:'WolfGuard-Agent-Linux.zip',darwin:'WolfGuard-Agent-macOS.zip'}[agent.platform];
      return '<div class="agents-version-line"><code title="' + esc(agent.version || 'Version non remontée') + '">' + esc(agent.version?.slice(0,8) || 'Non remontée') + '</code>' + (manual ? '<a class="agents-update-button" href="downloads/' + file + '" download title="Télécharger l’agent récent à installer sur ce poste">Installer</a>' : '<button type="button" class="agents-update-button" data-agent-install-update="' + esc(agent.id) + '" data-current="' + info.current + '" ' + (!info.canUpdate ? 'disabled' : '') + ' title="' + esc(message) + '">' + label + '</button>') + '</div><small class="agents-update-status" data-agent-update-status="' + esc(agent.id) + '" data-state="' + (info.current ? 'completed' : info.task?.status || 'idle') + '" title="' + esc(message) + '" role="status">' + esc(message) + '</small>';
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
        return '<tr class="agents-fleet-row" data-agent-row="' + esc(agent.id) + '" data-selected="' + chosen + '"><td><button type="button" class="agents-endpoint" title="' + esc(agent.name) + '" data-fleet-agent="' + esc(agent.id) + '" aria-haspopup="menu" aria-keyshortcuts="Shift+F10" aria-pressed="' + chosen + '" ' + (selecting ? 'disabled' : '') + '><span class="agents-row-selector" aria-hidden="true">' + (chosen ? '✓' : '') + '</span><span class="agents-device-icon" aria-hidden="true">' + settingsIcon('monitor') + '</span><span class="agents-endpoint-name"><strong>' + esc(agent.name) + '</strong><small>' + esc(workspaceAgents.platformName(agent.platform)) + '</small></span></button></td><td><span class="agents-presence" data-state="' + (stale ? 'unknown' : agent.online ? 'online' : 'offline') + '">' + (stale ? 'À vérifier' : agent.online ? 'Connecté' : 'Hors ligne') + '</span></td><td>' + protectionHTML(agent) + '</td><td><span class="agents-alerts" data-alert="' + (status.alerts > 0) + '" title="Alertes non acquittées dans les derniers relevés">' + (status.alerts ?? '—') + '</span></td><td>' + updateHTML(agent) + '</td><td class="agents-last-contact">' + esc(timestamp(agent.lastSeen)) + '</td></tr>';
      }).join('') || '<tr><td colspan="6"><div class="agents-empty"><span class="agents-empty-icon" aria-hidden="true">' + settingsIcon('monitor') + '</span><h2>' + (agents.length ? 'Aucun poste pour ces filtres' : 'Aucun agent associé') + '</h2><p>' + (agents.length ? 'Modifie ou efface les filtres pour retrouver tes postes.' : 'Ajoute un agent Windows, Linux ou macOS pour retrouver ce poste et ses actions ici.') + '</p></div></td></tr>';
      root.querySelectorAll('[data-agent-column]').forEach(heading => {
        const active = heading.dataset.agentColumn === sort;
        heading.setAttribute('aria-sort', active ? descending ? 'descending' : 'ascending' : 'none');
        heading.querySelector('.agents-sort-indicator').textContent = active ? descending ? '↓' : '↑' : '↕';
      });
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
      // Keep the clicked nodes in place so the browser can deliver a double-click.
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
      detailAgentId = id; renderDetails();
      const panel = find('#agentDetailsPanel'); panel.hidden = false;
      if (!panel.open) panel.showModal();
      find('#agentDetailsClose').focus({preventScroll:true});
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
      const fields = rows => '<dl>' + rows.map(([label,value]) => '<div><dt>' + esc(label) + '</dt><dd>' + esc(String(value ?? 'Non renseigné')) + '</dd></div>').join('') + '</dl>';
      const section = (title,rows) => '<section class="agent-details-section"><h3>' + title + '</h3>' + fields(rows) + '</section>';
      find('#agentDetailsTarget').textContent = agent.name;
      const html = '<div class="agent-details-summary"><span class="agents-device-icon" aria-hidden="true">' + settingsIcon('monitor') + '</span><div><h3>' + esc(agent.name) + '</h3><p>' + esc(workspaceAgents.platformName(agent.platform)) + ' · ' + (stale ? 'Connexion à vérifier' : agent.online ? 'Connecté' : 'Hors ligne') + '</p></div><span class="agents-health" data-health="' + status.health + '">' + status.label + '</span></div>'
        + (stale ? '<p class="agents-notice">Le service est indisponible. La connexion et les protections du poste ne sont plus confirmées.</p>' : '')
        + '<div class="agent-details-grid">' + section('Identité et connexion',[
          ['Nom du poste',agent.name],['Système',workspaceAgents.platformName(agent.platform)],['Identifiant du poste',agent.id],
          ['Type de connexion',agent.local ? 'Poste local' : 'Agent associé'],['Disponibilité',stale ? 'À vérifier' : agent.online ? 'Connecté' : 'Hors ligne'],
          ['Dernier contact',timestamp(agent.lastSeen)],['Utilisation',selected?.id === agent.id ? 'Poste sélectionné pour les outils' : 'Poste disponible'],
          ['Visibilité',Object.hasOwn(agent,'restricted') ? agent.restricted ? 'Administrateurs uniquement' : 'Selon les droits d’accès au parc' : 'Selon les droits d’accès au parc']
        ]) + section('Agent et mises à jour',[
          ['Version installée',agent.version || 'Non remontée'],['Version publiée',!releaseStale ? publishedRelease?.version || 'Indisponible' : 'Indisponible'],
          ['Mises à jour automatiques',agent.capabilities?.includes('auto-update-v1') ? 'Activées · vérification toutes les 5 minutes, site fermé compris' : agent.capabilities?.includes('remote-terminal-v1') ? 'Première mise à niveau automatique depuis le site' : 'Installation initiale d’un agent récent nécessaire'],
          ['État de la version',info.current ? 'À jour · confirmée par le poste' : releaseStale || !publishedRelease || stale ? 'À vérifier' : info.outdated ? 'Mise à jour disponible' : 'Version non remontée'],
          ['Dernière opération',info.task?.message || 'Aucune mise à jour en cours'],['Mise à jour à distance',info.reason || (info.current ? 'Dernière version installée' : info.task?.running ? 'En cours' : 'Disponible')]
        ]) + section('Protection du poste',[
          ['État de protection',status.label],['Dernier relevé',timestamp(status.collectedAt)],['Réception du relevé',timestamp(endpoint?.receivedAt)],
          ['Fournisseur antivirus',snapshot?.provider || 'Non confirmé'],
          ...[['Antivirus','antivirus'],['Protection en temps réel','realtime'],['Pare-feu','firewall'],['Signatures antivirus','signatures']].map(([label,field]) => [label,checks[snapshot?.[field]] || 'À confirmer']),
          ['Version des signatures',snapshot?.signatureVersion || 'Non confirmée'],['Menaces actives du relevé',count(snapshot?.activeThreats)],
          ['Alertes non acquittées',count(status.alerts)],['Blocages sur 24 h',count(endpoint?.blocks)],
          ['Actions sur les protections',snapshot ? snapshot.canEnforce ? 'Prises en charge par le composant système' : 'Privilèges système nécessaires' : 'Non confirmées']
        ]) + section('Politique EDR configurée',[
          ['Mode demandé',policy ? policy.mode === 'protect' ? 'Protéger et maintenir les protections' : 'Observer les protections existantes' : edrAllowed ? 'Non renseigné' : 'Accès non accordé'],
          ['Maintien du temps réel',policy ? policy.realtime ? 'Demandé' : 'Non demandé' : 'Non renseigné'],
          ['Maintien du pare-feu',policy ? policy.firewall ? 'Demandé' : 'Non demandé' : 'Non renseigné'],
          ['Révision demandée',count(endpoint?.revision)],['Révision appliquée confirmée',count(snapshot?.appliedRevision)]
        ]) + '</div><p class="agents-notice">Les protections actuelles sont confirmées uniquement avec un relevé récent d’un poste connecté. La politique décrit les réglages demandés ; son application doit être confirmée par l’agent.</p>'
        + (snapshot?.warnings || []).map(message => '<p class="agents-notice">' + esc(message) + '</p>').join('')
        + '<section class="agent-details-section"><h3>Outils et fonctions du poste</h3><div class="agent-details-actions">' + actions.map(action => {
          const unavailable = reason(action,agent);
          return '<button type="button" data-detail-action="' + action.id + '" ' + (unavailable || selecting ? 'disabled' : '') + '><strong>' + action.label + '</strong><span>' + esc(unavailable || action.description) + '</span></button>';
        }).join('') + '</div></section><p class="agent-details-note">Les informations matérielles (processeur, mémoire, disques) et les adresses réseau ne sont pas remontées par cet inventaire.</p>';
      if (html !== detailHTML) {
        const action = document.activeElement?.dataset.detailAction;
        find('#agentDetailsBody').innerHTML = html; detailHTML = html;
        if (action) (find('[data-detail-action="' + CSS.escape(action) + '"]:not(:disabled)') || find('#agentDetailsClose')).focus({preventScroll:true});
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
    find('#agentsList').onclick = event => {
      const update = event.target.closest('[data-agent-install-update]'); if(update){ if(!update.disabled)updateAgent(update.dataset.agentInstallUpdate); return; }
      if(event.target.closest('a[download]'))return;
      const security = event.target.closest('[data-agent-security]'); if(security){ if(!security.disabled)runAction('edr',security.dataset.agentSecurity); return; }
      const row = event.target.closest('[data-agent-row]'); if (row) choose(row.dataset.agentRow);
    };
    find('#agentsList').ondblclick = event => {
      if (event.target.closest('[data-agent-install-update],[data-agent-security],a,select,input')) return;
      const row = event.target.closest('[data-agent-row]');
      if (row) { event.preventDefault(); openDetails(row.dataset.agentRow); }
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
      const button = event.target.closest('[data-detail-action]');
      if (button && !button.disabled) runAction(button.dataset.detailAction,detailAgentId);
    };
    find('#agentToolPanel').addEventListener('cancel', event => { event.preventDefault(); closeTool(); }, {signal});
    find('#agentToolPanel').addEventListener('keydown', event => event.stopPropagation(), {signal});
    current = {root, key, renderTool, closeMenu, dismissTool, dismissDetails};
    await refresh();
    await renderTool();
  }
  return {render, reset};
})();
