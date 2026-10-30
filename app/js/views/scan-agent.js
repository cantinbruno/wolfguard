'use strict';

const webScanAgent = (() => {
  let timer = 0, generation = 0, jobIds = {passive: '', active: '', map: '', vulnerability: ''};
  const labels = {queued: 'En attente de l’agent', running: 'Scan en cours', completed: 'Scan terminé', cancelled: 'Scan arrêté', failed: 'Collecte en échec', expired: 'Agent non disponible à temps', lost: 'Connexion à l’agent perdue'};
  function reset(clear = true) { clearTimeout(timer); timer = 0; generation++; if (clear) jobIds = {passive: '', active: '', map: '', vulnerability: ''}; }
  function mount(kind, values, onReport) {
    reset(false);
    const definition = scanInsights.definitions[kind], strategy = definition.strategy, token = generation, root = document.createElement('section');
    root.className = 'wgscan-agent'; root.setAttribute('aria-label', 'Exécution par l’agent commun');
    $('#wgScanAgentHost').append(root);
    root.innerHTML = '<div class="wgscan-agent-top"><div><span class="wgscan-kicker">POSTE D’EXÉCUTION COMMUN</span><strong id="wgAgentName">Chargement…</strong><span id="wgAgentPresence"></span></div><button type="button" id="wgAgentSettings" title="Gérer l’agent commun">Paramètres → Agents</button></div><div class="wgscan-agent-controls"><button type="button" id="wgAgentLaunch" class="wgscan-primary" disabled>' + workspaceSectionIcon('scan-' + kind) + definition.launchLabel + '</button><button type="button" id="wgAgentStop" disabled>Arrêter</button></div><p id="wgAgentStatus" role="status" aria-live="polite"></p><div id="wgAgentProgress" hidden><progress max="1" value="0" aria-label="Progression réelle du scan"></progress><span></span></div><details class="wgscan-agent-history"><summary>Derniers scans</summary><label><select id="wgAgentHistory" aria-label="Charger un scan exécuté par l’agent"><option value="">Aucun scan</option></select></label><small>Résultats conservés 7 jours · Enregistrer pour les garder dans ton espace</small></details>';
    const live = () => token === generation && root.isConnected && !$('#app').classList.contains('hidden');
    const find = selector => root.querySelector(selector);
    let agent = null, jobs = [], busy = false, lastResult = '', current = null, running = null, selected = '', refreshing = false;
    const request = (path, value) => WolfGuardCloud.agentRequest(path, value);
    const status = (text, error = false) => { if (live()) { find('#wgAgentStatus').textContent = text; find('#wgAgentStatus').classList.toggle('is-error', error); } };
    function render() {
      if (!live()) return;
      const compatible = kind !== 'vulnerability' || agent?.capabilities?.includes('security-audit-v1');
      find('#wgAgentName').textContent = agent ? agent.name + ' · ' + workspaceAgents.platformName(agent.platform) : 'Aucun agent sélectionné';
      if (agent && !compatible) status('Mets à jour l’agent depuis Paramètres → Agents pour lancer l’audit.');
      running = jobs.find(job => ['queued', 'running'].includes(job.status));
      const matching = jobs.filter(job => (job.workspace || job.strategy) === kind);
      current = matching.find(job => job.id === jobIds[kind]) || matching[0] || null;
      if (current) jobIds[kind] = current.id;
      find('#wgAgentPresence').textContent = agent ? agent.online ? '● Connecté' : '○ Hors ligne' : 'À configurer dans les paramètres';
      find('#wgAgentPresence').dataset.online = String(!!agent?.online);
      find('#wgAgentLaunch').disabled = busy || !agent?.online || !!running || !compatible;
      find('#wgAgentStop').disabled = busy || !running;
      find('#wgAgentStop').textContent = running && (running.workspace || running.strategy) !== kind ? 'Arrêter : ' + (scanInsights.definitions[running.workspace || running.strategy]?.short || 'scan en cours') : 'Arrêter';
      find('#wgAgentHistory').innerHTML = matching.length ? matching.map(job => '<option value="' + job.id + '" ' + (current?.id === job.id ? 'selected' : '') + '>' + new Date(job.createdAt).toLocaleString('fr-FR') + ' · ' + (labels[job.status] || job.status) + '</option>').join('') : '<option value="">Aucun rapport : ' + definition.short + '</option>';
      const progress = find('#wgAgentProgress'); progress.hidden = !current;
      if (current) { const bar = progress.querySelector('progress'); bar.max = Math.max(1, current.total); if (current.status === 'running' && !current.total) bar.removeAttribute('value'); else bar.value = current.completed; progress.querySelector('span').textContent = (labels[current.status] || current.status) + (current.total ? ' · ' + current.completed + ' / ' + current.total + (kind === 'vulnerability' ? ' contrôles' : kind === 'map' ? ' adresses' : ' tests') : ''); }
    }
    async function result() {
      if (!current || lastResult === current.id + ':' + current.revision) return;
      const id = current.id, revision = current.revision, data = await request('scans/result?id=' + id);
      if (!live() || current?.id !== id) return;
      const source = 'Agent · ' + workspaceAgents.platformName(data.report?.platform || agent?.platform);
      if (data.report) {
        const name = definition.short + ' · ' + (agent?.name || 'Agent');
        const report = data.report.results?.length ? webScanModel.parse(JSON.stringify(data.report), strategy, name, kind) : {format: 'wolfguard-scan', version: 1, strategy, workspace: kind, name, warnings: (data.report.warnings || []).map(value => String(value).slice(0, 500)), rows: []};
        report.source = source; report.importedAt = new Date(data.createdAt).toISOString(); report.capturedAt = data.report.startedAt || '';
        onReport(report, data); lastResult = id + ':' + revision;
        if (data.report.error) status(data.report.error, true); else if (['completed', 'cancelled'].includes(data.status)) status(labels[data.status] + ' : ' + report.rows.length + ' observation(s) reçue(s).');
      } else if (data.status === 'running') onReport({format: 'wolfguard-scan', version: 1, strategy, workspace: kind, name: 'Collecte en cours', importedAt: new Date().toISOString(), source, warnings: [], rows: []}, data);
    }
    async function refresh() {
      if (!live() || busy || refreshing) return;
      refreshing = true;
      try {
        const snapshot = await workspaceAgents.snapshot(); if (!live()) return;
        agent = snapshot.selected;
        if (selected !== (agent?.id || '')) { selected = agent?.id || ''; lastResult = ''; jobs = []; jobIds[kind] = ''; }
        const id = selected;
        if (id) { const response = await request('scans?agentId=' + id); if (!live() || selected !== id) return; jobs = response.jobs; } else jobs = [];
        render(); await result();
      } catch (error) { if (live()) { agent = null; jobs = []; render(); status(error.message, true); } }
      finally { refreshing = false; }
    }
    async function poll() { await refresh(); if (live()) timer = setTimeout(poll, 3000); }
    find('#wgAgentSettings').onclick = () => openSettings('agents');
    find('#wgAgentHistory').onchange = async event => { jobIds[kind] = event.target.value; lastResult = ''; render(); try { await result(); } catch (error) { status(error.message, true); } };
    find('#wgAgentLaunch').onclick = async () => {
      if (busy || !selected || !live()) return;
      busy = true; render();
      try {
        const v = values(), chosen = (await workspaceAgents.snapshot()).selected;
        if (!live()) return;
        if (!chosen || chosen.id !== selected) throw new Error('L’agent commun a changé. Vérifie le poste affiché avant de relancer.');
        const data = {agentId: selected, strategy, workspace: kind, ...(strategy === 'active' ? {target: v.target, mode: v.profile === 'discovery' ? 'discovery' : 'tcp', ports: v.profile === 'discovery' ? '22,80,443,445,3389' : v.profile === 'web' ? '80,443,8000,8080,8443' : v.profile === 'custom' ? v.ports : SCAN_PORT_PRESETS.common, identifyServices: v.identify, timeoutMs: v.agentTimeoutMs ?? 1500, concurrency: v.agentConcurrency ?? 16} : {passiveScope: kind === 'vulnerability' ? 'security' : v.passiveScope || 'all'})};
        const job = await request('scans', data); if (!live()) return;
        jobIds[kind] = job.id; lastResult = ''; status('Demande transmise à l’agent commun.');
      } catch (error) { status(error.message, true); }
      finally { busy = false; if (live()) await refresh(); }
    };
    find('#wgAgentStop').onclick = async () => { if (busy || !running) return; busy = true; render(); try { await request('scans/cancel', {id: running.id}); status('Arrêt demandé. L’agent interrompt les tests à sa prochaine mise à jour.'); } catch (error) { status(error.message, true); } finally { busy = false; if (live()) await refresh(); } };
    if (workspaceAgents.available()) poll(); else { render(); status('Configure l’agent dans Paramètres → Agents sur le site après saisie de ton code.'); }
  }
  return {mount, reset};
})();
