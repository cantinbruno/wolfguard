'use strict';

// Security → "État du parc": one view of every authorized workstation, its
// connection, protection, open alerts, recent blocks and agent version.
const fleetOverview = (() => {
  const HEALTH = {protected: 'Protégé', attention: 'À surveiller', unsupported: 'Non pris en charge', unknown: 'Inconnu'};
  const ORDER = {attention: 0, unknown: 1, unsupported: 2, protected: 3};

  // Pure: agents (connection), endpoints (protection) and the published release.
  function summarize(agents = [], endpoints = [], release = null) {
    const byId = new Map(endpoints.map(endpoint => [endpoint.id, endpoint]));
    const rows = agents.map(agent => {
      const endpoint = byId.get(agent.id) || {};
      const health = HEALTH[endpoint.health] ? endpoint.health : 'unknown';
      const outdated = !!(release?.version && agent.version && agent.version !== release.version);
      const alerts = Number(endpoint.alerts) || 0, blocks = Number(endpoint.blocks) || 0;
      const reasons = [];
      if (!agent.online) reasons.push('Hors ligne');
      if (health === 'attention') reasons.push('Protection à vérifier');
      if (alerts) reasons.push(alerts + ' alerte' + (alerts > 1 ? 's' : '') + ' non acquittée' + (alerts > 1 ? 's' : ''));
      if (outdated) reasons.push('Agent à mettre à jour');
      return {id: agent.id, name: agent.name || 'Poste sans nom', platform: agent.platform || '', online: !!agent.online, lastSeen: agent.lastSeen || endpoint.lastSeen || null, health, alerts, blocks, outdated, reasons};
    });
    const count = test => rows.filter(test).length;
    return {
      total: rows.length,
      online: count(row => row.online),
      offline: count(row => !row.online),
      protected: count(row => row.health === 'protected'),
      attention: count(row => row.health === 'attention'),
      unknown: count(row => row.health === 'unknown' || row.health === 'unsupported'),
      alerts: rows.reduce((sum, row) => sum + row.alerts, 0),
      blocks: rows.reduce((sum, row) => sum + row.blocks, 0),
      outdated: count(row => row.outdated),
      attentionRows: rows.filter(row => row.reasons.length).sort((a, b) => (ORDER[a.health] - ORDER[b.health]) || (b.alerts - a.alerts) || a.name.localeCompare(b.name, 'fr')),
      rows
    };
  }

  function tile(value, label, tone = '') {
    return '<div class="fleet-tile" data-tone="' + tone + '"><strong>' + Number(value).toLocaleString('fr-FR') + '</strong><span>' + esc(label) + '</span></div>';
  }

  async function open() {
    modal('État du parc', '<div class="fleet-overview" id="fleetOverview" aria-busy="true"><p class="muted" role="status">Chargement de l’état du parc…</p></div><div class="actions"><button class="secondary" id="fleetOverviewRefresh">Actualiser</button><button class="secondary" data-wg-click="closeModal()">Fermer</button></div>');
    const key = state.vaultKey;
    const render = async () => {
      const host = $('#fleetOverview');
      if (!host) return;
      host.setAttribute('aria-busy', 'true');
      try {
        const canEdr = !!WolfGuardCloud.can?.('edr.read') && workspaceModules.allows('edr');
        const [snapshot, edr, release] = await Promise.all([
          workspaceAgents.snapshot(),
          canEdr ? WolfGuardCloud.agentRequest('edr').catch(() => null) : Promise.resolve(null),
          WolfGuardAgentUpdates.release().catch(() => null)
        ]);
        if (!host.isConnected || state.vaultKey !== key) return;
        const summary = summarize(snapshot.agents, edr?.endpoints || [], release);
        const updated = new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
        const attention = summary.attentionRows.slice(0, 50).map(row => '<tr><th scope="row">' + esc(row.name) + '</th><td>' + esc(row.online ? 'En ligne' : 'Hors ligne') + '</td><td><span class="fleet-health" data-health="' + row.health + '">' + esc(HEALTH[row.health]) + '</span></td><td>' + esc(row.reasons.join(' · ')) + '</td><td>' + (row.lastSeen ? esc(new Date(row.lastSeen).toLocaleString('fr-FR')) : '—') + '</td></tr>').join('');
        host.innerHTML = (summary.total ? '' : '<p class="muted">Aucun poste associé ou visible avec tes droits. Ajoute un poste depuis Sécurité → Ajouter un poste.</p>')
          + '<div class="fleet-tiles">' + tile(summary.total, 'Postes') + tile(summary.online, 'En ligne', 'good') + tile(summary.offline, 'Hors ligne', summary.offline ? 'warn' : '')
          + (edr ? tile(summary.protected, 'Protégés', 'good') + tile(summary.attention, 'À surveiller', summary.attention ? 'bad' : '') + tile(summary.alerts, 'Alertes non acquittées', summary.alerts ? 'bad' : '') + tile(summary.blocks, 'Menaces bloquées (24 h)') : '')
          + (release ? tile(summary.outdated, 'Agents à mettre à jour', summary.outdated ? 'warn' : '') : '') + '</div>'
          + (edr ? '' : '<p class="muted">L’état de protection n’est pas affiché : ton compte n’a pas le droit de consulter la protection des postes.</p>')
          + '<h3 class="fleet-subtitle">Postes à surveiller</h3>'
          + (attention ? '<div class="fleet-table-scroll"><table class="fleet-table"><thead><tr><th scope="col">Poste</th><th scope="col">Connexion</th><th scope="col">Protection</th><th scope="col">Raisons</th><th scope="col">Dernier contact</th></tr></thead><tbody>' + attention + '</tbody></table></div>' : '<p class="fleet-ok">Aucun poste ne demande d’attention.</p>')
          + '<p class="muted fleet-updated">Mis à jour à ' + esc(updated) + '.</p>';
      } catch (error) {
        if (host.isConnected) host.innerHTML = '<p class="access-error">' + esc(error.message || 'État du parc indisponible.') + '</p>';
      } finally {
        if (host.isConnected) host.setAttribute('aria-busy', 'false');
      }
    };
    $('#fleetOverviewRefresh').onclick = render;
    await render();
  }

  return {open, summarize};
})();
