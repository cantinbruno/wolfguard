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

  // PDF of the whole fleet (pdfmake document definition), built from the summary.
  function pdfDefinition(summary, withProtection, mark, generated) {
    const navy = '#101e2e', ink = '#152638', muted = '#5c6c7c';
    const figures = [['Postes', summary.total], ['En ligne', summary.online], ['Hors ligne', summary.offline]];
    if (withProtection) figures.push(['Protégés', summary.protected], ['À surveiller', summary.attention], ['Alertes non acquittées', summary.alerts], ['Menaces bloquées (24 h)', summary.blocks]);
    figures.push(['Agents à mettre à jour', summary.outdated]);
    const table = (headers, rows, widths) => ({table: {headerRows: 1, widths, body: [headers.map(text => ({text, bold: true, color: muted, fontSize: 8})), ...rows]}, layout: 'lightHorizontalLines', margin: [0, 4, 0, 14]});
    const line = row => [row.name, row.online ? 'En ligne' : 'Hors ligne', HEALTH[row.health], row.reasons.join(' · ') || '—', row.lastSeen ? new Date(row.lastSeen).toLocaleString('fr-FR') : '—'];
    const sorted = [...summary.rows].sort((a, b) => (ORDER[a.health] - ORDER[b.health]) || a.name.localeCompare(b.name, 'fr'));
    return {
      pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [36, 64, 36, 48], compress: true,
      info: {title: 'WolfGuard · État du parc', author: 'WolfGuard', creator: 'WolfGuard'},
      defaultStyle: {font: 'Roboto', fontSize: 9, color: ink},
      background: (_page, size) => ({canvas: [{type: 'rect', x: 0, y: 0, w: size.width, h: 46, color: navy}]}),
      header: () => ({margin: [36, 11, 36, 0], columns: [...(mark ? [{svg: mark, width: 25, margin: [0, 0, 9, 0]}] : []), {text: 'WolfGuard · État du parc', bold: true, fontSize: 13, color: '#fff', margin: [0, 5, 0, 0]}]}),
      footer: (page, total) => ({margin: [36, 12, 36, 0], columns: [{text: 'Rapport généré le ' + generated, fontSize: 7, color: muted}, {text: page + ' / ' + total, fontSize: 7, color: muted, alignment: 'right'}]}),
      content: [
        {text: 'Synthèse', fontSize: 14, bold: true, margin: [0, 0, 0, 8]},
        table(['Indicateur', 'Valeur'], figures.map(([label, value]) => [label, String(value)]), ['*', 80]),
        {text: 'Postes à surveiller', fontSize: 14, bold: true, margin: [0, 6, 0, 8]},
        summary.attentionRows.length ? table(['Poste', 'Connexion', 'Protection', 'Raisons', 'Dernier contact'], summary.attentionRows.map(line), ['*', 60, 80, '*', 100]) : {text: 'Aucun poste ne demande d’attention.', margin: [0, 0, 0, 14]},
        {text: 'Tous les postes', fontSize: 14, bold: true, margin: [0, 6, 0, 8], pageBreak: summary.attentionRows.length > 12 ? 'before' : undefined},
        sorted.length ? table(['Poste', 'Connexion', 'Protection', 'Raisons', 'Dernier contact'], sorted.map(line), ['*', 60, 80, '*', 100]) : {text: 'Aucun poste.'},
        withProtection ? {} : {text: 'L’état de protection n’est pas inclus : le compte n’a pas le droit de consulter la protection des postes.', color: muted, margin: [0, 8, 0, 0]}
      ]
    };
  }

  async function open() {
    modal('État du parc', '<div class="fleet-overview" id="fleetOverview" aria-busy="true"><p class="muted" role="status">Chargement de l’état du parc…</p></div><div class="actions"><button class="secondary" id="fleetOverviewPdf" disabled>Exporter en PDF</button><button class="secondary" id="fleetOverviewRefresh">Actualiser</button><button class="secondary" data-wg-click="closeModal()">Fermer</button></div>');
    let last = null;
    $('#fleetOverviewPdf').onclick = async () => {
      const button = $('#fleetOverviewPdf');
      if (!last || !button) return;
      button.disabled = true; button.textContent = 'Préparation du PDF…';
      try {
        const generated = new Date().toLocaleString('fr-FR');
        const content = await webScanPDF.render(mark => pdfDefinition(last.summary, last.withProtection, mark, generated));
        const url = URL.createObjectURL(new Blob([content], {type: 'application/pdf'})), link = document.createElement('a');
        link.href = url; link.download = 'WolfGuard-etat-du-parc-' + new Date().toISOString().slice(0, 10) + '.pdf'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (error) {
        appNotify(error.message || 'PDF indisponible.', {kind: 'error'});
      } finally {
        if (button.isConnected) { button.disabled = false; button.textContent = 'Exporter en PDF'; }
      }
    };
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
        last = {summary, withProtection: !!edr};
        const pdfButton = $('#fleetOverviewPdf');
        if (pdfButton) pdfButton.disabled = false;
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

  return {open, summarize, pdfDefinition};
})();
