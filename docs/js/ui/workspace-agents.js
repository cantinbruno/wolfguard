'use strict';

// Agent selection belongs to the encrypted workspace, shared by all scans.
const workspaceAgents = (() => {
  const platformNames = {win32: 'Windows', linux: 'Linux', darwin: 'macOS'};
  const downloads = {
    win32: {name: 'Windows', file: 'WolfGuard-Agent-Windows.exe', help: 'Windows 10 / 11 · x64 · Fenêtre de contrôle', instruction: 'Ouvre le fichier téléchargé, puis colle le code dans la fenêtre WolfGuard Agent.'},
    linux: {name: 'Linux', file: 'WolfGuard-Agent-Linux.zip', help: 'x64 / ARM64 · glibc · Terminal', instruction: 'Extrais l’archive, ouvre un terminal dans le dossier et lance sh Start-Agent.sh. Colle ensuite le code demandé.'},
    darwin: {name: 'macOS', file: 'WolfGuard-Agent-macOS.zip', help: 'Intel / Apple Silicon · Terminal', instruction: 'Extrais l’archive et ouvre Start-Agent.command, ou lance sh Start-Agent.sh dans le terminal. Colle ensuite le code demandé.'}
  };
  let timer = 0, generation = 0;
  const cloud = () => typeof WolfGuardCloud === 'undefined' ? null : WolfGuardCloud;
  const available = () => !!(cloud()?.enabled && cloud().hasSession());
  const platformName = platform => platformNames[platform] || 'Système non renseigné';
  function unmount() { clearTimeout(timer); timer = 0; generation++; }
  async function snapshot() {
    if (!available()) return {agents: [], selected: null};
    const key = state.vaultKey, response = await cloud().agentRequest('agents'), saved = await setting('scanAgentId', '');
    if (!available() || state.vaultKey !== key) throw new Error('Espace verrouillé.');
    const agents = response.agents || [];
    const selected = saved ? agents.find(agent => agent.id === saved) : agents.at(-1);
    return {agents, selected: selected || null};
  }
  function mount(root) {
    unmount(); const token = generation, key = state.vaultKey;
    const live = () => generation === token && root.isConnected && state.vaultKey === key && !$('#app').classList.contains('hidden');
    root.innerHTML = `<header class="settings-panel-head"><div class="settings-heading">${settingsIcon('monitor')}<h3>Agents</h3></div><span class="settings-status">Commun à tous les scans</span></header>
      <p class="settings-agent-intro">Associe tes postes une seule fois. Le poste choisi ci-dessous exécute Scan passif, Scan actif, Cartographie et Vulnérabilités.</p>
      <div class="settings-agent-choice"><label for="wgAgentSelect">Agent utilisé par toutes les sections</label><select id="wgAgentSelect" class="settings-select" disabled><option>Chargement des postes…</option></select><span id="wgAgentSettingsPresence" role="status"></span></div>
      <h4 class="settings-group-title">Connecter un poste</h4>
      <div class="settings-agent-installer"><img src="images/logo-loup.svg" width="64" height="64" alt=""><div><strong>WolfGuard Agent</strong><p>Un seul agent, les quatre scans.</p><label for="wgAgentPlatform">Système du poste à connecter</label><select id="wgAgentPlatform" class="settings-select">${Object.entries(downloads).map(([id, item]) => '<option value="' + id + '">' + item.name + '</option>').join('')}</select><a id="wgAgentDownload" class="settings-btn primary" download></a><small id="wgAgentDownloadHelp"></small></div></div>
      <ol class="settings-agent-steps"><li><strong>Télécharge et démarre l’agent.</strong><p id="wgAgentInstructions"></p></li><li><strong>Génère un code temporaire.</strong><p>Valable cinq minutes, pour une seule utilisation. L’agent ne demande pas ton code d’accès WolfGuard.</p><button type="button" class="settings-btn" id="wgAgentPair">Générer le code d’association</button><div id="wgAgentPairCode" class="settings-agent-pair" hidden><code></code><button type="button" class="settings-btn" id="wgAgentCopyPair">Copier le code</button><small></small></div></li><li><strong>Colle ce code dans l’agent.</strong><p>Le poste apparaît ici après sa connexion. Choisis-le ci-dessus pour tous les scans.</p></li></ol>
      <p id="wgAgentSetupError" class="settings-agent-error" role="alert"></p><p id="wgAgentSetupStatus" role="status" aria-live="polite"></p>
      <h4 class="settings-group-title">Postes associés</h4><div id="wgAgentManage" class="settings-agent-list"></div>
      <p class="settings-agent-note">Les scans partent du poste choisi. Les contrôles de sécurité s’adaptent à Windows, Linux ou macOS ; les lectures impossibles restent « Non vérifié ».</p>`;
    const find = selector => root.querySelector(selector);
    let busy = false, expiresAt = 0;
    const error = message => { if (live()) find('#wgAgentSetupError').textContent = message; };
    const platform = find('#wgAgentPlatform');
    platform.value = /Mac/i.test(navigator.userAgentData?.platform || navigator.platform) ? 'darwin' : /Linux/i.test(navigator.userAgentData?.platform || navigator.platform) ? 'linux' : 'win32';
    function showDownload() {
      const item = downloads[platform.value], link = find('#wgAgentDownload');
      link.href = 'downloads/' + item.file; link.textContent = 'Télécharger pour ' + item.name + ' ↓';
      find('#wgAgentDownloadHelp').textContent = item.help; find('#wgAgentInstructions').textContent = item.instruction;
    }
    platform.onchange = showDownload; showDownload();
    async function refresh() {
      if (!live() || busy) return;
      try {
        const {agents, selected} = await snapshot(); if (!live()) return;
        const picker = find('#wgAgentSelect');
        picker.innerHTML = '<option value="" disabled>Choisir un poste</option>' + agents.map(agent => '<option value="' + esc(agent.id) + '">' + esc(agent.name) + ' · ' + platformName(agent.platform) + (agent.online ? ' · Connecté' : ' · Hors ligne') + '</option>').join('');
        picker.value = selected?.id || ''; picker.disabled = !available() || !agents.length;
        find('#wgAgentSettingsPresence').textContent = selected ? (selected.online ? 'Connecté · Prêt pour les quatre scans' : 'Hors ligne · Démarre l’agent sur ce poste') : 'Aucun agent sélectionné';
        find('#wgAgentManage').innerHTML = agents.map(agent => '<article><div><strong>' + esc(agent.name) + '</strong><small>' + platformName(agent.platform) + ' · ' + (agent.online ? 'Connecté' : 'Dernière connexion : ' + new Date(agent.lastSeen).toLocaleString('fr-FR')) + '</small></div><button type="button" class="settings-btn" data-agent-revoke="' + esc(agent.id) + '">Révoquer</button></article>').join('') || '<p class="settings-agent-note">Aucun poste associé pour le moment.</p>';
        for (const button of root.querySelectorAll('[data-agent-revoke]')) button.onclick = async () => {
          if (busy || !await appConfirm('Retirer l’accès de ce poste et arrêter ses scans en cours ?') || !live()) return;
          busy = true; button.disabled = true;
          try { await cloud().agentRequest('agents/revoke', {id: button.dataset.agentRevoke}); if (!live()) return; if (selected?.id === button.dataset.agentRevoke) await setSetting('scanAgentId', ''); if (live()) find('#wgAgentSetupStatus').textContent = 'Accès du poste retiré pour toutes les sections.'; }
          catch (exception) { error(exception.message); }
          finally { busy = false; if (live()) await refresh(); }
        };
        if (expiresAt && Date.now() >= expiresAt) { find('#wgAgentPairCode').hidden = true; expiresAt = 0; find('#wgAgentSetupStatus').textContent = 'Le code d’association a expiré. Génère un nouveau code si nécessaire.'; }
      } catch (exception) { error(exception.message); }
    }
    find('#wgAgentSelect').onchange = async event => {
      if (busy) return; busy = true; event.target.disabled = true;
      try { await setSetting('scanAgentId', event.target.value); if (live()) { error(''); find('#wgAgentSetupStatus').textContent = 'Agent commun enregistré pour toutes les sections.'; } }
      catch (exception) { error(exception.message); }
      finally { busy = false; if (live()) await refresh(); }
    };
    find('#wgAgentPair').disabled = !available();
    find('#wgAgentPair').onclick = async () => {
      const button = find('#wgAgentPair'); button.disabled = true; error('');
      try { const pairing = await cloud().agentRequest('agents/pair', {}); if (!live()) return; const area = find('#wgAgentPairCode'); area.hidden = false; area.querySelector('code').textContent = pairing.code; expiresAt = pairing.expiresAt; area.querySelector('small').textContent = 'Expire à ' + new Date(expiresAt).toLocaleTimeString('fr-FR'); }
      catch (exception) { error(exception.message); }
      finally { if (live()) button.disabled = false; }
    };
    find('#wgAgentCopyPair').onclick = async () => { const copied = await copyText(find('#wgAgentPairCode code').textContent); if (live()) { error(copied ? '' : 'Copie impossible. Sélectionne le code pour le copier.'); find('#wgAgentSetupStatus').textContent = copied ? 'Code copié. Colle-le dans l’agent du poste à connecter.' : ''; } };
    async function poll() { await refresh(); if (live()) timer = setTimeout(poll, 3000); }
    if (available()) poll(); else { find('#wgAgentSelect').innerHTML = '<option>Aucun agent connecté</option>'; find('#wgAgentManage').textContent = 'L’association est disponible sur le site après saisie de ton code.'; }
  }
  return {mount, unmount, snapshot, platformName, available};
})();
