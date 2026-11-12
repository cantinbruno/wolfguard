'use strict';

const agentsWorkspace = (() => {
  let generation = 0, timer = 0, current = null, remoteMode = 'desktop';
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
  function reset() { generation++; clearTimeout(timer); current = null; }
  async function render() {
    if (current?.root.isConnected && current.key === state.vaultKey) return current.renderTool();
    reset();
    const token = generation, key = state.vaultKey;
    const root = document.createElement('section');
    root.className = 'agents-workspace';
    $('#content').replaceChildren(root);
    const live = () => token === generation && root.isConnected && isSecurityWorkspace(state.section) && state.vaultKey === key && !$('#app').classList.contains('hidden');
    const find = selector => root.querySelector(selector);
    const can = right => !window.WolfGuardAccess || WolfGuardAccess.can(right);
    let agents = [], selected = null, query = '', filter = 'all', stale = false, busy = false, selecting = false;
    const timestamp = value => value ? new Date(value).toLocaleString('fr-FR') : 'Aucun contact';
    const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    root.innerHTML = `<header class="agents-heading"><div><h1>Sécurité</h1><p>Choisis un agent et utilise ses outils directement dans cet espace.</p></div><div class="agents-heading-actions"><button type="button" id="agentsManage">Gérer les agents</button><button type="button" id="agentsAdd" class="agents-primary">Ajouter un agent</button><button type="button" id="agentsRefresh" aria-label="Actualiser les agents">Actualiser</button></div></header>
      <div id="agentsMetrics" class="agents-metrics"></div><p id="agentsStatus" role="status" aria-live="polite">Chargement des agents…</p>
      <div class="agents-console"><section class="agents-fleet" aria-label="Liste des agents"><div class="agents-fleet-filters"><label for="agentsSearch">Rechercher un agent</label><input id="agentsSearch" type="search" placeholder="Nom du poste, système…"><label for="agentsFilter">Disponibilité</label><select id="agentsFilter"><option value="all">Tous les agents</option><option value="online">Connectés</option><option value="offline">Hors ligne</option></select></div><div id="agentsList"></div></section><div class="agents-main"><section id="agentActions" class="agents-detail" aria-label="Actions sur le poste choisi"></section><section id="agentToolPanel" class="agents-tool-panel" hidden><header class="agents-tool-heading"><h2 id="agentToolTitle"></h2><button type="button" id="agentToolClose">Fermer l’outil</button></header><div id="agentToolHost"></div></section></div></div>`;
    find('#agentsAdd').hidden = !can('agents.pair');
    find('#agentsManage').hidden = !can('agents.read');
    find('#agentsManage').onclick = () => openAgentsInterface();
    find('#agentsAdd').onclick = async () => { await openAgentsInterface(); $('#wgAgentAdd')?.click(); };

    function reason(action, agent) {
      if (!workspaceModules.allows(action.section) || (action.mode && !can('remote.write'))) return 'Droit d’accès non accordé';
      if (stale) return 'Connexion au service à vérifier';
      if (!action.offline && !agent.online) return 'Le poste doit être connecté';
      if (agent.local && !['active','passive'].includes(action.id)) return 'Associe un agent pour utiliser cet outil';
      const capabilities = Array.isArray(action.capability) ? action.capability : [action.capability];
      if (!capabilities.some(value => agent.capabilities?.includes(value))) return 'Mise à jour de l’agent nécessaire';
      return '';
    }
    function draw() {
      if (!live()) return;
      const online = agents.filter(agent => agent.online).length;
      find('#agentsMetrics').innerHTML = [['Agents associés', agents.length], ['Connectés', stale ? '—' : online], ['Hors ligne', stale ? '—' : agents.length - online]].map(([label, value]) => '<article><span>' + label + '</span><strong>' + value + '</strong></article>').join('');
      const rows = agents.filter(agent => normalized(agent.name + ' ' + workspaceAgents.platformName(agent.platform)).includes(normalized(query)) && (filter === 'all' || (filter === 'online' ? agent.online : !agent.online)));
      const focusId = document.activeElement?.dataset.fleetAgent;
      find('#agentsList').innerHTML = rows.map(agent => '<button type="button" class="agents-fleet-row" data-fleet-agent="' + esc(agent.id) + '" aria-pressed="' + (agent.id === selected?.id) + '" ' + (selecting ? 'disabled' : '') + '><span class="agents-fleet-name"><strong>' + esc(agent.name) + '</strong><span class="agents-presence" data-state="' + (stale ? 'unknown' : agent.online ? 'online' : 'offline') + '">' + (stale ? 'À vérifier' : agent.online ? 'Connecté' : 'Hors ligne') + '</span></span><span>' + esc(workspaceAgents.platformName(agent.platform)) + '</span><small>Dernier contact : ' + esc(timestamp(agent.lastSeen)) + '</small></button>').join('') || '<div class="agents-empty"><h2>' + (agents.length ? 'Aucun agent pour ces filtres' : 'Aucun agent associé') + '</h2><p>' + (agents.length ? 'Modifie la recherche ou la disponibilité.' : 'Ajoute un agent Windows, Linux ou macOS pour retrouver ce poste et ses actions ici.') + '</p></div>';
      if (focusId) find('[data-fleet-agent="' + CSS.escape(focusId) + '"]')?.focus({preventScroll:true});
      const agent = selected;
      if (!agent) { find('#agentActions').innerHTML = '<div class="agents-empty"><span class="agents-empty-icon" aria-hidden="true">' + settingsIcon('monitor') + '</span><h2>Un poste, toutes ses actions</h2><p>Sélectionne un agent dans la liste pour voir ses outils de réseau, de protection et d’assistance.</p></div>'; return; }
      find('#agentActions').innerHTML = '<header class="agents-detail-heading"><div><span class="agents-eyebrow">POSTE CHOISI</span><h2>' + esc(agent.name) + '</h2><p>' + esc(workspaceAgents.platformName(agent.platform)) + ' · <span class="agents-presence" data-state="' + (stale ? 'unknown' : agent.online ? 'online' : 'offline') + '">' + (stale ? 'À vérifier' : agent.online ? 'Connecté' : 'Hors ligne') + '</span></p></div>' + settingsIcon('monitor') + '</header><p class="agents-contact">Dernier contact : ' + esc(timestamp(agent.lastSeen)) + '</p>' + (!agent.online ? '<p class="agents-notice">Démarre l’agent sur ce poste pour utiliser les scans et l’assistance. Les relevés EDR restent consultables.</p>' : '') + '<div class="agents-action-grid">' + actions.map(action => {
        const unavailable = reason(action, agent);
        const icon = ['terminal','files'].includes(action.mode) ? workspaceNavigationIcon(action.mode) : workspaceSectionIcon(action.section);
        const active = action.section === state.section && (!action.mode || action.mode === remoteMode);
        return '<button type="button" data-fleet-action="' + action.id + '" aria-pressed="' + active + '" ' + (unavailable || selecting ? 'disabled' : '') + '><span class="agents-action-title">' + icon + '<strong>' + action.label + '</strong></span><span>' + action.description + '</span>' + (unavailable ? '<small>' + unavailable + '</small>' : '<small class="agents-action-ready">' + (action.offline && !agent.online ? 'Consulter les derniers relevés' : 'Utiliser →') + '</small>') + '</button>';
      }).join('') + '</div>';
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
      try {
        const data = await workspaceAgents.snapshot();
        if (!live()) return;
        if (desktopBridge.available && !data.agents.length) {
          const local = {id:'local-desktop', name:'Ce PC', platform:'win32', online:true, local:true, capabilities:['network-scan-v3']};
          data.agents = [local]; data.selected = local;
        }
        const previous = selected?.id;
        agents = data.agents; selected = data.selected; stale = false;
        if (previous !== selected?.id) await renderTool(true);
        find('#agentsStatus').textContent = selected?.local ? 'Les scans de ce PC sont disponibles localement.' : workspaceAgents.available() ? 'Liste actualisée à ' + new Date().toLocaleTimeString('fr-FR') : 'Connecte-toi au service pour retrouver tes agents associés.';
      } catch (error) {
        if (!live()) return;
        stale = true; find('#agentsStatus').textContent = error.message + ' La disponibilité des postes n’est plus confirmée.';
      } finally {
        busy = false;
        if (live()) { find('#agentsRefresh').disabled = false; draw(); clearTimeout(timer); timer = setTimeout(refresh, 10000); }
      }
    }
    find('#agentsSearch').oninput = event => { query = event.target.value.trim(); draw(); };
    find('#agentsFilter').onchange = event => { filter = event.target.value; draw(); };
    find('#agentsRefresh').onclick = refresh;
    find('#agentsList').onclick = event => { const button = event.target.closest('[data-fleet-agent]'); if (button) choose(button.dataset.fleetAgent); };
    find('#agentActions').onclick = async event => {
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
