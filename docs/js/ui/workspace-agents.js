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
    root.innerHTML = `<header class="settings-panel-head"><div class="settings-heading">${settingsIcon('monitor')}<h3>Agents</h3></div><span class="settings-status">Un seul agent · quatre scans</span></header>
      <section class="settings-agent-current" aria-labelledby="wgAgentCurrentTitle"><div class="settings-agent-current-head"><span class="settings-agent-eyebrow">POSTE UTILISÉ</span><span id="wgAgentSettingsPresence" class="settings-agent-presence" data-state="loading" role="status">Chargement…</span></div><div class="settings-agent-current-body"><span class="settings-agent-device" aria-hidden="true">${settingsIcon('monitor')}</span><div><h4 id="wgAgentCurrentTitle">Recherche du poste commun…</h4><p id="wgAgentCurrentDetail">Le même poste exécute tous tes scans.</p></div></div><div class="settings-agent-scan-tags" aria-label="Sections utilisant ce poste"><span>Passif</span><span>Actif</span><span>Cartographie</span><span>Vulnérabilités</span></div><div class="settings-agent-picker"><label for="wgAgentSelect">Changer de poste</label><select id="wgAgentSelect" class="settings-select" disabled><option>Chargement des postes…</option></select></div></section>
      <p id="wgAgentConnectionNotice" class="settings-agent-notice" role="status" hidden></p><p id="wgAgentSetupError" class="settings-agent-error" role="alert"></p><p id="wgAgentSetupStatus" role="status" aria-live="polite"></p>
      <section class="settings-agent-fleet" aria-labelledby="wgAgentFleetTitle"><div class="settings-agent-section-head"><div><h4 id="wgAgentFleetTitle">Mes postes <span id="wgAgentCount">—</span></h4><p>Choisis celui qui exécutera les prochains scans.</p></div><button type="button" class="settings-btn" id="wgAgentAdd">+ Ajouter un poste</button></div><div id="wgAgentManage" class="settings-agent-list"><p class="settings-agent-note">Chargement des postes associés…</p></div></section>
      <details class="settings-agent-connect" id="wgAgentConnect"><summary><span>${settingsIcon('download')}Connecter un nouveau poste</span><small>Windows · Linux · macOS</small></summary><div class="settings-agent-onboarding"><section class="settings-agent-step"><div class="settings-agent-step-title"><span>01</span><h4>Installer l’agent</h4></div><div class="settings-agent-product"><img src="images/logo-loup.svg" width="38" height="38" alt=""><div><strong>WolfGuard Agent</strong><small>Un seul agent pour tous les scans</small></div></div><label for="wgAgentPlatform">Système du poste</label><select id="wgAgentPlatform" class="settings-select">${Object.entries(downloads).map(([id, item]) => '<option value="' + id + '">' + item.name + '</option>').join('')}</select><a id="wgAgentDownload" class="settings-btn primary" download></a><small id="wgAgentDownloadHelp"></small><p id="wgAgentInstructions"></p></section><section class="settings-agent-step"><div class="settings-agent-step-title"><span>02</span><h4>Associer le poste</h4></div><p>Génère un code et colle-le dans l’agent ouvert sur ton poste.</p><button type="button" class="settings-btn" id="wgAgentPair">Générer le code d’association</button><div id="wgAgentPairCode" class="settings-agent-pair" hidden><code aria-label="Code d’association temporaire"></code><button type="button" class="settings-btn" id="wgAgentCopyPair">${ITEM_ACTION_ICONS.copy}Copier le code</button><small></small></div><div class="settings-agent-pair-note">${settingsIcon('lock')}<p>Valable cinq minutes, une seule fois. Ton code d’accès WolfGuard ne doit pas être saisi dans l’agent.</p></div><p class="settings-agent-note">Le nouveau poste apparaîtra dans Mes postes après sa connexion.</p></section></div></details>`;
    const find = selector => root.querySelector(selector);
    let busy = false, expiresAt = 0, agents = [], selected = null, firstLoad = true, listHTML = '', pickerHTML = '';
    const error = message => { if (live()) find('#wgAgentSetupError').textContent = message; };
    const platform = find('#wgAgentPlatform');
    platform.value = /Mac/i.test(navigator.userAgentData?.platform || navigator.platform) ? 'darwin' : /Linux/i.test(navigator.userAgentData?.platform || navigator.platform) ? 'linux' : 'win32';
    function showDownload() {
      const item = downloads[platform.value], link = find('#wgAgentDownload');
      link.href = 'downloads/' + item.file; link.textContent = 'Télécharger pour ' + item.name + ' ↓';
      find('#wgAgentDownloadHelp').textContent = item.help; find('#wgAgentInstructions').textContent = item.instruction;
    }
    platform.onchange = showDownload; showDownload();
    find('#wgAgentAdd').onclick = () => { find('#wgAgentConnect').open = true; find('#wgAgentConnect').scrollIntoView({block:'nearest',behavior:'instant'}); platform.focus({preventScroll:true}); };
    const lastSeen = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Dernière connexion inconnue' : 'Dernière connexion : ' + date.toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); };
    function expireCode() {
      const area = find('#wgAgentPairCode'); area.hidden = true; area.querySelector('code').textContent = ''; expiresAt = 0;
      find('#wgAgentPair').textContent = 'Générer le code d’association';
      find('#wgAgentSetupStatus').textContent = 'Le code d’association a expiré. Génère un nouveau code si nécessaire.';
    }
    function updatePairing() {
      if (!expiresAt) return;
      if (Date.now() >= expiresAt) { expireCode(); return; }
      const remaining = Math.ceil((expiresAt-Date.now())/1000);
      find('#wgAgentPairCode small').textContent = 'Expire dans ' + Math.floor(remaining/60) + ' min ' + String(remaining%60).padStart(2,'0') + ' s · Usage unique';
    }
    function renderAgents() {
      const presence = find('#wgAgentSettingsPresence'), picker = find('#wgAgentSelect');
      presence.dataset.state = selected ? selected.online ? 'online' : 'offline' : 'empty';
      presence.textContent = selected ? selected.online ? 'Connecté' : 'Hors ligne' : 'Aucun poste choisi';
      find('#wgAgentCurrentTitle').textContent = selected?.name || 'Choisis ton poste d’exécution';
      find('#wgAgentCurrentDetail').textContent = selected ? platformName(selected.platform) + ' · ' + (selected.online ? 'Prêt pour les scans' : 'Démarre l’agent sur ce poste pour scanner') : agents.length ? 'Sélectionne un poste dans la liste ci-dessous.' : 'Ajoute un poste Windows, Linux ou macOS pour lancer tes scans.';
      find('#wgAgentCount').textContent = agents.length + ' / 6';
      const choices = '<option value="" disabled>Choisir un poste</option>' + agents.map(agent => '<option value="' + esc(agent.id) + '">' + esc(agent.name) + ' · ' + platformName(agent.platform) + (agent.online ? ' · Connecté' : ' · Hors ligne') + '</option>').join('');
      if (choices !== pickerHTML) { picker.innerHTML = choices; pickerHTML = choices; }
      picker.value = selected?.id || ''; picker.disabled = busy || !available() || !agents.length;
      const ordered = [...agents].sort((a,b)=>Number(b.id===selected?.id)-Number(a.id===selected?.id)||Number(b.online)-Number(a.online));
      const html = ordered.map(agent => { const chosen = selected?.id === agent.id;
        return '<article class="settings-agent-machine" data-agent-id="' + esc(agent.id) + '" data-selected="' + chosen + '"><span class="settings-agent-device" aria-hidden="true">' + settingsIcon('monitor') + '</span><div class="settings-agent-machine-copy"><div class="settings-agent-machine-title"><strong>' + esc(agent.name) + '</strong>' + (chosen ? '<span class="settings-agent-selected">Utilisé</span>' : '') + '</div><small>' + platformName(agent.platform) + ' · ' + (agent.online ? 'Actuellement connecté' : lastSeen(agent.lastSeen)) + '</small><span class="settings-agent-presence" data-state="' + (agent.online?'online':'offline') + '">' + (agent.online?'Connecté':'Hors ligne') + '</span>' + (!agent.capabilities?.includes('security-audit-v1') ? '<small class="settings-agent-update">Mise à jour nécessaire pour l’audit de sécurité</small>' : '') + '</div><div class="settings-agent-machine-actions"><button type="button" class="settings-btn" data-agent-use="' + esc(agent.id) + '" ' + (chosen||busy?'disabled':'') + '>' + (chosen?'Poste utilisé':'Utiliser ce poste') + '</button><button type="button" class="settings-btn settings-agent-revoke" data-agent-revoke="' + esc(agent.id) + '" ' + (busy?'disabled':'') + ' aria-label="Révoquer l’accès de ' + esc(agent.name) + '">Révoquer</button></div></article>';
      }).join('') || '<div class="settings-agent-empty">' + settingsIcon('monitor') + '<strong>Aucun poste associé</strong><p>Installe WolfGuard Agent sur le poste que tu souhaites scanner, puis associe-le ci-dessous.</p></div>';
      if (html !== listHTML) { find('#wgAgentManage').innerHTML = html; listHTML = html; }
      if (firstLoad) { find('#wgAgentConnect').open = !agents.length; firstLoad = false; }
      find('#wgAgentAdd').disabled = agents.length >= 6;
      find('#wgAgentAdd').title = agents.length >= 6 ? 'Retire un ancien poste avant d’en ajouter un autre.' : '';
      find('#wgAgentPair').disabled = busy || !available() || agents.length >= 6;
    }
    async function refresh() {
      if (!live() || busy) return;
      try {
        const data = await snapshot(); if (!live()) return; agents = data.agents; selected = data.selected;
        find('#wgAgentConnectionNotice').hidden = true; find('#wgAgentManage').removeAttribute('data-stale');
        renderAgents();
      } catch (exception) { if (live()) { const notice = find('#wgAgentConnectionNotice'); notice.hidden = false; notice.textContent = 'État des postes indisponible. ' + exception.message; find('#wgAgentSettingsPresence').textContent = 'État indisponible'; find('#wgAgentSettingsPresence').dataset.state = 'unknown'; find('#wgAgentManage').dataset.stale = 'true'; if(firstLoad){find('#wgAgentConnect').open=true;find('#wgAgentManage').textContent='Les postes n’ont pas pu être chargés.';} } }
    }
    async function choose(id) {
      if (busy || !agents.some(agent=>agent.id===id)) return; busy = true; renderAgents();
      try { await setSetting('scanAgentId', id); if (live()) { error(''); find('#wgAgentSetupStatus').textContent = 'Agent commun enregistré pour toutes les sections.'; } }
      catch (exception) { error(exception.message); }
      finally { busy = false; if (live()) await refresh(); }
    }
    find('#wgAgentSelect').onchange = event => choose(event.target.value);
    find('#wgAgentManage').onclick = async event => {
      const use = event.target.closest('[data-agent-use]'); if (use) { await choose(use.dataset.agentUse); return; }
      const button = event.target.closest('[data-agent-revoke]');
      if (!button || busy) return;
      const id=button.dataset.agentRevoke;
      if (!await appConfirm('Retirer l’accès de ce poste et arrêter ses scans en cours ?') || !live() || busy) return;
      busy = true; renderAgents();
      try { await cloud().agentRequest('agents/revoke', {id}); if (!live()) return; if (selected?.id===id) await setSetting('scanAgentId', ''); if (live()) find('#wgAgentSetupStatus').textContent = 'Accès du poste retiré pour toutes les sections.'; }
      catch (exception) { error(exception.message); }
      finally { busy = false; if (live()) await refresh(); }
    };
    find('#wgAgentPair').disabled = !available();
    find('#wgAgentPair').onclick = async () => {
      if (busy) return; const button = find('#wgAgentPair'); busy = true; button.disabled = true; error('');
      try { const pairing = await cloud().agentRequest('agents/pair', {}); if (!live()) return; const area = find('#wgAgentPairCode'); area.hidden = false; area.querySelector('code').textContent = pairing.code; expiresAt = pairing.expiresAt; button.textContent = 'Générer un autre code'; updatePairing(); }
      catch (exception) { error(exception.message); }
      finally { busy = false; if (live()) { button.disabled = agents.length>=6; await refresh(); } }
    };
    find('#wgAgentCopyPair').onclick = async () => { if(!expiresAt)return;if(Date.now()>=expiresAt){expireCode();return;}const copied = await copyText(find('#wgAgentPairCode code').textContent); if (live()) { error(copied ? '' : 'Copie impossible. Sélectionne le code pour le copier.'); find('#wgAgentSetupStatus').textContent = copied ? 'Code copié. Colle-le dans l’agent du poste à connecter.' : ''; } };
    async function poll() { if(live())updatePairing(); await refresh(); if (live()) timer = setTimeout(poll, 3000); }
    if (available()) poll(); else { renderAgents(); find('#wgAgentCurrentTitle').textContent='Aucun agent connecté';find('#wgAgentCurrentDetail').textContent='L’association est disponible sur le site après saisie de ton code.'; }
  }
  return {mount, unmount, snapshot, platformName, available};
})();
