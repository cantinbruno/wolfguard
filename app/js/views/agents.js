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
  function reset() { generation++; clearTimeout(timer); controller?.abort(); current = null; }
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
    const can = right => !window.WolfGuardAccess || WolfGuardAccess.can(right);
    let agents = [], selected = null, query = '', filter = 'all', platform = 'all', protectionFilter = 'all', sort = 'name', descending = false, stale = false, busy = false, selecting = false, protections = new Map(), protectionStale = false;
    const timestamp = value => value ? new Date(value).toLocaleString('fr-FR') : 'Aucun contact';
    const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    const columns = [['name','Poste'],['online','Connexion'],['platform','Système'],['health','Protection EDR'],['alerts','Alertes ouvertes'],['lastSeen','Dernier contact']];
    root.dataset.density = 'comfortable';
    root.innerHTML = `<header class="agents-heading">
      <div class="agents-heading-intro"><span class="agents-heading-icon" aria-hidden="true">${settingsIcon('shield-check')}</span><div><span class="agents-eyebrow">SÉCURITÉ · ENDPOINTS</span><h1>Tous les postes</h1><p>Surveille tes agents et interviens sur le poste sélectionné.</p></div></div>
      <div class="agents-heading-actions"><button type="button" id="agentsManage">${settingsIcon('sliders-horizontal')}Gérer les agents</button><button type="button" id="agentsAdd" class="agents-primary">${settingsIcon('plus')}Ajouter un agent</button><button type="button" id="agentsRefresh" aria-label="Actualiser les agents" title="Actualiser les agents">${settingsIcon('refresh-cw')}<span>Actualiser</span></button></div>
    </header>
    <div id="agentsMetrics" class="agents-metrics"></div><p id="agentsStatus" role="status" aria-live="polite">Chargement des agents…</p>
    <div class="agents-console">
      <section class="agents-fleet" aria-label="Liste des agents">
        <div class="agents-inventory-toolbar"><div class="agents-inventory-label">${settingsIcon('monitor')}<span>Inventaire des postes</span><span id="agentsInventoryCount" class="agents-inventory-count">0</span></div><button type="button" id="agentsDensity" aria-pressed="false" title="Réduire la hauteur des lignes">${WORKSPACE_LAYOUT_ICONS.list}Vue compacte</button></div>
        <div class="agents-fleet-filters">
          <div class="agents-search-filter"><label for="agentsSearch">Rechercher</label><div class="agents-search">${settingsIcon('search')}<input id="agentsSearch" type="search" placeholder="Nom du poste, système, version…"></div></div>
          <div><label for="agentsFilter">Connexion</label><select id="agentsFilter"><option value="all">Toutes les connexions</option><option value="online">Connectés</option><option value="offline">Hors ligne</option></select></div>
          <div><label for="agentsPlatform">Système</label><select id="agentsPlatform"><option value="all">Tous les systèmes</option><option value="win32">Windows</option><option value="linux">Linux</option><option value="darwin">macOS</option></select></div>
          <div><label for="agentsProtection">Protection EDR</label><select id="agentsProtection"><option value="all">Tous les états</option><option value="protected">Protégés</option><option value="attention">À protéger</option><option value="unknown">À confirmer</option><option value="unsupported">Non intégrée</option><option value="alerts">Avec alertes</option></select></div>
          <button type="button" id="agentsClearFilters">${settingsIcon('x')}Effacer les filtres</button>
        </div>
        <div id="agentsActiveFilters" class="agents-active-filters" aria-label="Filtres appliqués" hidden></div>
        <div class="agents-table-scroll" tabindex="0" role="region" aria-label="Tableau des postes, défilement horizontal si nécessaire">
          <table class="agents-table"><caption class="agents-visually-hidden">Agents associés et derniers états de protection. Sélectionne un poste pour utiliser ses outils.</caption><thead><tr>${columns.map(([field,label])=>'<th scope="col" data-agent-column="'+field+'" aria-sort="'+(field==='name'?'ascending':'none')+'"><button type="button" data-agent-sort="'+field+'">'+label+'<span class="agents-sort-indicator" aria-hidden="true">'+(field==='name'?'↑':'↕')+'</span></button></th>').join('')}</tr></thead><tbody id="agentsList"></tbody></table>
        </div>
        <footer class="agents-table-footer"><span id="agentsCount">0 poste</span><span>Sélectionne un poste pour afficher ses actions.</span></footer>
      </section>
      <div class="agents-main">
        <section id="agentActions" class="agents-detail" aria-label="Actions sur le poste choisi"></section>
        <section id="agentToolPanel" class="agents-tool-panel" hidden><header class="agents-tool-heading"><div><span class="agents-eyebrow" id="agentToolTarget"></span><h2 id="agentToolTitle"></h2></div><button type="button" id="agentToolClose">${settingsIcon('x')}Fermer l’outil</button></header><div id="agentToolHost"></div></section>
      </div>
    </div>`;
    find('#agentsAdd').hidden = !can('agents.pair');
    find('#agentsManage').hidden = !can('agents.read');
    find('#agentsManage').onclick = () => openAgentsInterface();
    find('#agentsAdd').onclick = async () => { await openAgentsInterface(); $('#wgAgentAdd')?.click(); };

    function protection(agent) {
      const endpoint = protections.get(agent.id);
      if (!can('edr.read') || !workspaceModules.allows('edr')) return {health:'unknown', label:'Accès non accordé', alerts:null};
      if (stale || protectionStale || !agent.online || !endpoint?.collectedAt) return {health:'unknown', label:'À confirmer', alerts:null};
      const labels = {protected:'Protégé', attention:'À protéger', unknown:'À confirmer', unsupported:'Non intégrée'};
      return {health: labels[endpoint.health] ? endpoint.health : 'unknown', label:labels[endpoint.health] || labels.unknown, alerts:Number.isSafeInteger(endpoint.alerts) && endpoint.alerts >= 0 ? endpoint.alerts : null};
    }
    function filteredAgents() {
      const rows = agents.filter(agent => {
        const status = protection(agent);
        return normalized(agent.name + ' ' + workspaceAgents.platformName(agent.platform) + ' ' + (agent.version || '')).includes(normalized(query))
          && (filter === 'all' || !stale && (filter === 'online' ? agent.online : !agent.online))
          && (platform === 'all' || agent.platform === platform)
          && (protectionFilter === 'all' || (protectionFilter === 'alerts' ? status.alerts > 0 : status.health === protectionFilter));
      });
      const value = agent => sort === 'health' ? protection(agent).label : sort === 'alerts' ? protection(agent).alerts : sort === 'platform' ? workspaceAgents.platformName(agent.platform) : agent[sort];
      return rows.sort((a,b) => {
        const left = value(a), right = value(b);
        if (left == null || right == null) return left == null && right == null ? a.name.localeCompare(b.name, 'fr') : left == null ? 1 : -1;
        const result = typeof left === 'string' ? left.localeCompare(right, 'fr', {numeric:true, sensitivity:'base'}) : Number(left) - Number(right);
        return (descending ? -result : result) || a.name.localeCompare(b.name, 'fr');
      });
    }

    function reason(action, agent) {
      if (!workspaceModules.allows(action.section) || (action.mode && !can('remote.write'))) return 'Droit d’accès non accordé';
      if (stale) return 'Connexion au service à vérifier';
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
    function draw() {
      if (!live()) return;
      const online = agents.filter(agent => agent.online).length;
      root.dataset.stale = String(stale);
      find('#agentsMetrics').innerHTML = [['Agents associés', agents.length, 'all', 'monitor'], ['Connectés', stale ? '—' : online, 'online', 'link'], ['Hors ligne', stale ? '—' : agents.length - online, 'offline', 'history']].map(([label, value, status, icon]) => '<article data-state="' + status + '"><span class="agents-metric-icon" aria-hidden="true">' + settingsIcon(icon) + '</span><div><span>' + label + '</span><strong>' + value + '</strong></div></article>').join('');
      const rows = filteredAgents();
      root.dataset.empty = String(!rows.length);
      const focusId = document.activeElement?.dataset.fleetAgent;
      const focusAction = document.activeElement?.dataset.fleetAction;
      const selectedHidden = selected && !rows.some(agent => agent.id === selected.id);
      find('#agentsCount').textContent = rows.length + ' poste' + (rows.length === 1 ? '' : 's') + (rows.length !== agents.length ? ' sur ' + agents.length : '') + (selected ? ' · 1 sélectionné' + (selectedHidden ? ' (hors filtre)' : '') : '');
      find('#agentsInventoryCount').textContent = agents.length;
      const applied = Object.entries({query,filter,platform,protection:protectionFilter}).filter(([field,value]) => field === 'query' ? value : value !== 'all');
      find('#agentsActiveFilters').hidden = !applied.length;
      find('#agentsActiveFilters').innerHTML = applied.map(([field,value]) => {
        const control = find(filterControls[field]), label = field === 'query' ? 'Recherche : ' + value : control.options[control.selectedIndex].text;
        return '<button type="button" data-agent-clear="' + field + '" aria-label="' + esc('Retirer le filtre ' + label) + '"><span>' + esc(label) + '</span>' + settingsIcon('x') + '</button>';
      }).join('');
      find('#agentsProtection').disabled = !can('edr.read') || !workspaceModules.allows('edr');
      find('#agentsClearFilters').disabled = !query && filter === 'all' && platform === 'all' && protectionFilter === 'all';
      find('#agentsList').innerHTML = rows.map(agent => {
        const status = protection(agent), chosen = agent.id === selected?.id;
        return '<tr class="agents-fleet-row" data-agent-row="' + esc(agent.id) + '" data-selected="' + chosen + '"><td><button type="button" class="agents-endpoint" data-fleet-agent="' + esc(agent.id) + '" aria-pressed="' + chosen + '" ' + (selecting ? 'disabled' : '') + '><span class="agents-row-selector" aria-hidden="true">' + (chosen ? '✓' : '') + '</span><span class="agents-device-icon" aria-hidden="true">' + settingsIcon('monitor') + '</span><span class="agents-endpoint-name"><strong>' + esc(agent.name) + '</strong><small>' + (agent.version ? 'Agent ' + esc(agent.version.slice(0,8)) : 'Version non renseignée') + '</small></span></button></td><td><span class="agents-presence" data-state="' + (stale ? 'unknown' : agent.online ? 'online' : 'offline') + '">' + (stale ? 'À vérifier' : agent.online ? 'Connecté' : 'Hors ligne') + '</span></td><td>' + esc(workspaceAgents.platformName(agent.platform)) + '</td><td><span class="agents-health" data-health="' + status.health + '">' + status.label + '</span></td><td><span class="agents-alerts" data-alert="' + (status.alerts > 0) + '">' + (status.alerts ?? '—') + '</span></td><td class="agents-last-contact">' + esc(timestamp(agent.lastSeen)) + '</td></tr>';
      }).join('') || '<tr><td colspan="6"><div class="agents-empty"><span class="agents-empty-icon" aria-hidden="true">' + settingsIcon('monitor') + '</span><h2>' + (agents.length ? 'Aucun poste pour ces filtres' : 'Aucun agent associé') + '</h2><p>' + (agents.length ? 'Modifie ou efface les filtres pour retrouver tes postes.' : 'Ajoute un agent Windows, Linux ou macOS pour retrouver ce poste et ses actions ici.') + '</p></div></td></tr>';
      root.querySelectorAll('[data-agent-column]').forEach(heading => {
        const active = heading.dataset.agentColumn === sort;
        heading.setAttribute('aria-sort', active ? descending ? 'descending' : 'ascending' : 'none');
        heading.querySelector('.agents-sort-indicator').textContent = active ? descending ? '↓' : '↑' : '↕';
      });
      if (focusId) find('[data-fleet-agent="' + CSS.escape(focusId) + '"]')?.focus({preventScroll:true});
      const agent = selected;
      find('#agentToolTarget').textContent = agent?.name || 'Aucun agent sélectionné';
      find('#agentActions').hidden = !agent;
      if (!agent) { find('#agentActions').replaceChildren(); return; }
      const available = actions.filter(action => !reason(action, agent)).length;
      const health = protection(agent);
      find('#agentActions').innerHTML = '<header class="agents-detail-heading"><span class="agents-selected-icon" aria-hidden="true">' + settingsIcon('monitor') + '</span><div class="agents-selected-name"><span class="agents-eyebrow">ACTIONS SUR LE POSTE SÉLECTIONNÉ</span><h2>' + esc(agent.name) + '</h2><p>' + esc(workspaceAgents.platformName(agent.platform)) + ' · <span class="agents-presence" data-state="' + (stale ? 'unknown' : agent.online ? 'online' : 'offline') + '">' + (stale ? 'À vérifier' : agent.online ? 'Connecté' : 'Hors ligne') + '</span></p></div><div class="agents-selected-summary"><span class="agents-summary-health" data-health="' + health.health + '">' + health.label + '</span><span>' + available + ' outil' + (available === 1 ? '' : 's') + ' disponible' + (available === 1 ? '' : 's') + '</span></div></header>' + (selectedHidden ? '<div class="agents-selection-notice"><span>Ce poste est masqué par les filtres. Les actions ci-dessous ciblent toujours <strong>' + esc(agent.name) + '</strong>.</span><button type="button" data-agent-reveal>Afficher sa ligne</button></div>' : '') + (!agent.online ? '<p class="agents-notice">Démarre l’agent sur ce poste pour utiliser les scans et l’assistance. Les relevés EDR restent consultables.</p>' : '') + '<div class="agents-action-grid">' + actions.map(action => {
        const unavailable = reason(action, agent);
        const icon = ['terminal','files'].includes(action.mode) ? workspaceNavigationIcon(action.mode) : workspaceSectionIcon(action.section);
        const active = action.section === state.section && (!action.mode || action.mode === remoteMode);
        return '<button type="button" data-fleet-action="' + action.id + '" title="' + esc(unavailable || action.description) + '" aria-pressed="' + active + '" ' + (unavailable || selecting ? 'disabled' : '') + '><span class="agents-action-title"><span class="agents-action-icon">' + icon + '</span><strong>' + action.label + '</strong></span><span class="agents-action-description">' + action.description + '</span>' + (unavailable ? '<small>' + unavailable + '</small>' : '<small class="agents-action-ready">' + (active ? 'Outil ouvert' : action.offline && !agent.online ? 'Consulter les derniers relevés' : 'Ouvrir l’outil') + '<span aria-hidden="true">' + workspaceNavigationIcon('chevron-right') + '</span></small>') + '</button>';
      }).join('') + '</div>';
      if (focusAction) find('[data-fleet-action="' + CSS.escape(focusAction) + '"]:not(:disabled)')?.focus({preventScroll:true});
    }
    async function choose(id) {
      const agent = agents.find(item => item.id === id);
      if (!agent || selecting || !live()) return;
      selecting = true; draw();
      try { await setSetting('scanAgentId', id); if (live()) { selected = agent; await renderTool(true); } }
      catch (error) { if (live()) find('#agentsStatus').textContent = error.message; }
      finally { selecting = false; draw(); }
    }
    async function refresh() {
      if (!live() || busy || selecting) return;
      busy = true; find('#agentsRefresh').disabled = true;
      root.dataset.refreshing = 'true';
      find('.agents-table-scroll').setAttribute('aria-busy', 'true');
      try {
        const [data, summary] = await Promise.all([
          workspaceAgents.snapshot(),
          workspaceAgents.available() && can('edr.read') && workspaceModules.allows('edr')
            ? WolfGuardCloud.agentRequest('edr', undefined, {signal}).then(data => ({data}), () => ({failed:true}))
            : Promise.resolve(null)
        ]);
        if (!live()) return;
        protections = new Map((summary?.data?.endpoints || []).map(endpoint => [endpoint.id, endpoint]));
        protectionStale = !!summary?.failed;
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
        if (live()) { root.dataset.refreshing = 'false'; find('.agents-table-scroll').setAttribute('aria-busy', 'false'); find('#agentsRefresh').disabled = false; draw(); clearTimeout(timer); timer = setTimeout(refresh, 10000); }
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
    find('#agentsDensity').onclick = event => {
      const compact = root.dataset.density !== 'compact';
      root.dataset.density = compact ? 'compact' : 'comfortable';
      event.currentTarget.setAttribute('aria-pressed', String(compact));
    };
    find('.agents-table thead').onclick = event => {
      const button = event.target.closest('[data-agent-sort]');
      if (!button) return;
      descending = sort === button.dataset.agentSort ? !descending : false;
      sort = button.dataset.agentSort; draw();
    };
    find('#agentsRefresh').onclick = refresh;
    find('#agentsList').onclick = event => { const row = event.target.closest('[data-agent-row]'); if (row) choose(row.dataset.agentRow); };
    find('#agentActions').onclick = async event => {
      if (event.target.closest('[data-agent-reveal]') && selected) {
        clearFilters();
        const button = find('[data-fleet-agent="' + CSS.escape(selected.id) + '"]');
        button?.focus({preventScroll:true}); button?.scrollIntoView({block:'nearest', inline:'nearest'}); return;
      }
      const button = event.target.closest('[data-fleet-action]');
      const action = actions.find(item => item.id === button?.dataset.fleetAction);
      if (!action || !selected || selecting || button.disabled || reason(action, selected)) return;
      const id = selected.id;
      selecting = true; draw();
      try {
        await setSetting('scanAgentId', id);
        if (!live()) return;
        if (action.mode) remoteMode = action.mode;
        await openSection(action.section);
        if (live()) find('#agentToolPanel').scrollIntoView({block:'start', behavior:'instant'});
      } catch (error) { if (live()) find('#agentsStatus').textContent = error.message; }
      finally { selecting = false; draw(); }
    };
    let renderedSection = null, renderedAgent = null, renderedMode = null;
    async function renderTool(force = false) {
      if (!live()) return;
      const action = actions.find(item => item.section === state.section && (!item.mode || item.mode === remoteMode));
      const panel = find('#agentToolPanel'), host = find('#agentToolHost');
      panel.hidden = !action;
      root.dataset.activeAction = action?.id || '';
      if (!action) {
        host.replaceChildren(); renderedSection = null; draw(); return;
      }
      find('#agentToolTitle').textContent = action.label;
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
      if (live()) panel.scrollIntoView({block:'start', behavior:'instant'});
    }
    find('#agentToolClose').onclick = () => openSection('security').catch(console.error);
    current = {root, key, renderTool};
    await refresh();
    await renderTool();
  }
  return {render, reset};
})();
