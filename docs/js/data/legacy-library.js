'use strict';

function migrateProtocolLibrary(data, stamp = now()) {
  data.items ??= [];
  data.folders ??= [];
  const ids = new Set(data.folders.filter(folder => folder.section === 'protocol' || (
    folder.section === 'memo' && (folder.id === '1d56491b-a818-48ac-8bda-9438439e46c1' || /^ports\s*(?:&|et|\/)\s*protocoles$/i.test(folder.name || ''))
  )).map(folder => folder.id));
  let expanded = true,
    changed = false;
  while (expanded) {
    expanded = false;
    for (const folder of data.folders) {
      if (folder.section === 'memo' && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        expanded = true
      }
    }
  }
  for (const folder of data.folders) {
    if (!ids.has(folder.id)) continue;
    if (folder.section !== 'protocol') {
      folder.section = 'protocol';
      changed = true
    }
    if (folder.parentId && !ids.has(folder.parentId)) {
      folder.parentId = null;
      changed = true
    }
  }
  for (const item of data.items) {
    if (!ids.has(item.folderId) || !['memo', 'procedure'].includes(item.type)) continue;
    item.documentType = item.type;
    item.type = 'protocol';
    item.updatedAt = stamp;
    changed = true;
  }
  if (changed) data.updatedAt = stamp;
  return data;
}

function regroupTechnologyLibrary(data, stamp = now(), createId = uid) {
  migrateProtocolLibrary(data, stamp);
  const aliases = {
    memo: {
      'Pentest - Linux': 'Linux',
      'Pentest - Windows / AD': 'Active Directory',
      'Routing - Référentiel': 'Routing',
      'Routing - Procédures': 'Routing',
      'Switching - Référentiel': 'Switching',
      'Switching - Procédures': 'Switching',
      'Wi-Fi - Référentiel': 'Wi-Fi',
      'Wi-Fi - Procédures': 'Wi-Fi',
      'Pentest - Wi-Fi': 'Wi-Fi',
      'VPN - Référentiel': 'VPN',
      'VPN - Procédures': 'VPN',
      'PKI / TLS': 'TLS / PKI',
      'PKI / Certificats': 'TLS / PKI',
      'HTTP / HTTPS': 'Web / API',
      'Pentest - Web / API': 'Web / API',
      'IP & Subnetting': 'TCP / IP',
      'SNMP / Syslog / NetFlow': 'SNMP',
      'DNS / DHCP': 'DNS',
      'Systèmes / Services': 'Diagnostic systèmes',
      'Firewall': 'Firewall',
      'Pentest - Méthodologie': 'Méthodologie',
      'Pentest - Preuves et restitution': 'Preuves et restitution',
      'Pentest - Réseau et équipements': 'Réseau',
      'Pentest - Cloud et CI/CD': 'Cloud / CI/CD',
      'Pentest - Outils': 'Outils',
      'Pentest - Conteneurs': 'Conteneurs',
      'Pentest - Vulnérabilités': 'Vulnérabilités',
      'Pentest - Services et protocoles': 'Services et protocoles',
      'Pentest - TLS / DNS': 'TLS / PKI'
    },
    command: {
      'Cisco Nexus - NX-OS': 'Cisco Nexus',
      'Cisco Catalyst - IOS / IOS-XE': 'Cisco Catalyst',
      'FortiGate': 'FortiGate / FortiOS',
      'Windows / PowerShell': 'Windows',
      'Stormshield - Console': 'Stormshield',
      'Stormshield - Serverd': 'Stormshield',
      'Juniper - Junos commun': 'Juniper',
      'Juniper - SRX uniquement': 'Juniper',
      'Aruba Wi-Fi - Instant': 'Aruba Wi-Fi',
      'Aruba Wi-Fi - Contrôleur AOS 8': 'Aruba Wi-Fi',
      'EfficientIP - Tests DNS Linux': 'EfficientIP / SOLIDserver',
      'Identity Collector - Tests Windows': 'Identity Collector',
      'Ivanti VPN - Tests Windows': 'Ivanti VPN',
      'FortiClient EMS - CLI Linux / VM': 'FortiClient EMS',
      'FortiWeb - WAF': 'FortiWeb',
      'Centreon - Collecte Linux': 'Centreon',
      'Oxidized - Collecteur Linux': 'Oxidized',
      'Observium - Serveur Linux': 'Observium',
      'Pentest - Linux': 'Linux',
      'Pentest - Windows / AD': 'Active Directory',
      'Pentest - Captures': 'Captures',
      'Pentest - Nmap / Réseau': 'Nmap',
      'Pentest - Wi-Fi': 'Wi-Fi',
      'Pentest - Preuves': 'Preuves et restitution',
      'Pentest - SSH': 'SSH',
      'Pentest - Web / API': 'Web / API',
      'Pentest - TLS / DNS': 'TLS / PKI',
      'Pentest - Conteneurs': 'Conteneurs',
      'Pentest - Vulnérabilités': 'Vulnérabilités',
      'Pentest - Services et protocoles': 'Services et protocoles'
    },
    template: {
      'Templates réseau & sécurité': 'Réseau',
      'Pentest - Rapports': 'Audit et restitution'
    }
  };
  const tools = [
    [/^(?:SMB\b|Samba\b)/i, 'SMB'],
    [/^(?:LDAP\b|LDAPS\b)/i, 'LDAP'],
    [/^SNMP/i, 'SNMP'],
    [/^(?:DNS\b|dig\b)/i, 'DNS'],
    [/^TLS\b/i, 'TLS / PKI'],
    [/^Burp Suite\b/i, 'Burp Suite'],
    [/^OWASP ZAP\b/i, 'OWASP ZAP'],
    [/^ffuf\b/i, 'ffuf'],
    [/^Nmap\b/i, 'Nmap'],
    [/^SSH\b/i, 'SSH'],
    [/^Docker\b/i, 'Docker'],
    [/^Kubernetes\b/i, 'Kubernetes'],
    [/^Trivy\b/i, 'Trivy'],
    [/^Nuclei\b/i, 'Nuclei'],
    [/^SQLmap\b/i, 'SQLmap']
  ];
  const mixed = new Set(['Pentest - Outils', 'Pentest - Conteneurs', 'Pentest - Vulnérabilités', 'Pentest - Services et protocoles', 'Pentest - TLS / DNS', 'Pentest - Windows / AD']);
  const systemTargets = {
    'SNMP ne répond pas': 'SNMP',
    'LDAP bind échoue': 'LDAP',
    'Syslog absent': 'Syslog',
    'RADIUS timeout': 'AAA / IAM',
    'RADIUS Access-Reject': 'AAA / IAM',
    'NTP désynchronisé': 'NTP',
    'MTU / fragmentation': 'TCP / IP',
    'Perte de paquets réseau': 'TCP / IP',
    'Port TCP fermé': 'TCP / IP',
    'CPU switch élevée': 'Switching'
  };
  const templateTitles = {
    "Mail \u2014 Demande d'ouverture de flux": ["Demande d'ouverture de flux", 'Réseau'],
    'Mail \u2014 Compte rendu incident': ["Compte rendu d'incident", 'Incidents'],
    'Procédure modèle': ['Procédure technique', 'Procédures'],
    'Rapport \u2014 Diagnostic réseau': ['Diagnostic réseau', 'Réseau'],
    'Rapport \u2014 Changement firewall': ['Changement firewall', 'Firewall'],
    'Rapport pentest - modèle de mission': ["Rapport d'audit", 'Audit et restitution'],
    'Constat pentest - modèle et retest': ['Constat et retest', 'Audit et restitution']
  };
  data.items ??= [];
  data.folders ??= [];
  const originalFolders = (data.folders || []).map(folder => ({
    ...folder
  }));
  const sourceById = new Map(originalFolders.map(folder => [folder.id, folder]));
  const counts = new Map();
  for (const item of data.items || []) counts.set(item.folderId, (counts.get(item.folderId) || 0) + 1);
  const canonical = section => new Set([...Object.values(aliases[section]), ...tools.map(x => x[1]), 'Linux', 'Windows', 'DNS', 'DHCP', 'AAA / IAM', 'NTP', 'Syslog', 'NetFlow / IPFIX', 'SSH', 'Captures', 'Incidents', 'Procédures']);
  const recognized = folder => aliases[folder.section] && !folder.deletedAt && (aliases[folder.section][folder.name] || canonical(folder.section).has(folder.name) || /^Pentest - /i.test(folder.name));
  const cleanName = name => name.replace(/^Pentest - /i, '');
  const groups = new Map(),
    tasks = [],
    claimed = new Set(),
    targets = new Map();
  let changed = false;
  const addGroup = (section, name) => {
    const key = section + '\0' + name;
    groups.set(key, {
      section,
      name
    });
    return key
  };
  const classify = (item, section, source) => {
    const title = item.title || '',
      fallback = aliases[section][source] || cleanName(source);
    if (section === 'template') return templateTitles[title]?.[1] || fallback;
    if (mixed.has(source)) {
      const tool = tools.find(([pattern]) => pattern.test(title));
      if (tool) return tool[1];
      if (source === 'Pentest - Windows / AD') return /^Windows\b/i.test(title) ? 'Windows' : 'Active Directory';
      return fallback;
    }
    if (section === 'memo') {
      if (source === 'DNS / DHCP') return /^DHCP\b/i.test(title) ? 'DHCP' : 'DNS';
      if (source === 'PKI / Certificats' && /^LDAPS\b/i.test(title)) return 'LDAP';
      if (source === 'SNMP / Syslog / NetFlow') {
        if (/^Syslog\b/i.test(title)) return 'Syslog';
        if (/^(?:NetFlow|IPFIX)\b/i.test(title)) return 'NetFlow / IPFIX';
        return 'SNMP';
      }
      if (source === 'Systèmes / Services') return systemTargets[title] || fallback;
      if (source === 'Switching - Procédures' && /^SSH\b/i.test(title)) return 'SSH';
      if (source === 'Firewall' && /^Check Point\b/i.test(title)) return 'Check Point';
      if (source === 'Pentest - Réseau et équipements') {
        if (/^Préparer l'audit/i.test(title)) return 'Méthodologie';
        if (/^Réseau - découverte/i.test(title)) return 'Nmap';
      }
      if (source === 'Pentest - Web / API') return 'Web / API';
      return fallback;
    }
    if (section === 'command') {
      if (source === 'Pentest - Web / API') {
        if (/^ffuf\b/i.test(title)) return 'ffuf';
        return 'Web / API';
      }
      if (source === 'Pentest - TLS / DNS') return /^(?:DNS|dig)\b/i.test(title) ? 'DNS' : 'TLS / PKI';
      if (source === 'Linux' || source === 'Pentest - Linux') {
        const command = item.content || '';
        if (/^curl\b/i.test(command)) return 'Web / API';
        if (/^openssl\b/i.test(command)) return 'TLS / PKI';
        if (/^(?:dig|resolvectl|nslookup|host)\b/i.test(command)) return 'DNS';
        if (/^tcpdump\b/i.test(command)) return 'Captures';
        if (/^sshd\b/i.test(command)) return 'SSH';
        return 'Linux';
      }
      if (source === 'Windows / PowerShell' || source === 'Windows') {
        const command = item.content || '';
        if (/^(?:Resolve-DnsName|Get-DnsClientCache|Clear-DnsClientCache)\b/i.test(command)) return 'DNS';
        if (/^(?:klist|gpresult|nltest|Test-ComputerSecureChannel)\b/i.test(command)) return 'Active Directory';
        return 'Windows';
      }
    }
    return fallback;
  };
  for (const item of data.items || []) {
    if (item.deletedAt) continue;
    const section = ['memo', 'procedure'].includes(item.type) ? 'memo' : item.type === 'command' ? 'command' : ['mail', 'report', 'template'].includes(item.type) ? 'template' : null;
    if (!section) continue;
    if (section === 'memo' && /^Pentest\s+/i.test(item.title || '')) {
      const title = item.title.replace(/^Pentest\s+/i, '');
      item.title = title.charAt(0).toUpperCase() + title.slice(1);
      // Limit the heading edit to the generated first H1; preserve the remaining HTML.
      item.content = (item.content || '').replace(/^(\s*<h1>)Pentest\s+([^<]*)(<\/h1>)/i, (_, open, text, close) => open + text.charAt(0).toUpperCase() + text.slice(1) + close);
      item.updatedAt = stamp;
      changed = true;
    }
    const template = section === 'template' ? templateTitles[item.title] : null;
    const folder = sourceById.get(item.folderId);
    let name = template?.[1] || (folder && folder.section === section && recognized(folder) ? classify(item, section, folder.name) : null);
    if (!folder && item.title === 'Checklist universelle de troubleshooting réseau') name = 'Réseau';
    if (template) {
      item.title = template[0];
      item.updatedAt = stamp;
      changed = true
    }
    if (name) tasks.push({
      item,
      key: addGroup(section, name)
    });
  }
  for (const folder of originalFolders) {
    if (!recognized(folder)) continue;
    if (!mixed.has(folder.name) || (counts.get(folder.id) || 0) === 0 || originalFolders.some(f => f.parentId === folder.id)) {
      addGroup(folder.section, aliases[folder.section][folder.name] || cleanName(folder.name));
    }
  }
  for (const [key, {
      section,
      name
    }] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
    const candidates = originalFolders.filter(folder => folder.section === section && !folder.deletedAt && !claimed.has(folder.id) && (folder.name === name || (aliases[section][folder.name] || cleanName(folder.name)) === name));
    candidates.sort((a, b) => Number(b.name === name) - Number(a.name === name) || (counts.get(b.id) || 0) - (counts.get(a.id) || 0));
    let folder = candidates.length ? (data.folders || []).find(f => f.id === candidates[0].id) : null;
    if (!folder) {
      folder = {
        id: createId(),
        section,
        name,
        parentId: null
      };
      data.folders.push(folder);
      changed = true;
    } else if (folder.name !== name) {
      folder.name = name;
      changed = true
    }
    claimed.add(folder.id);
    targets.set(key, folder);
  }
  for (const {
      item,
      key
    }
    of tasks) {
    const folder = targets.get(key);
    if (item.folderId !== folder.id) {
      item.folderId = folder.id;
      item.updatedAt = stamp;
      changed = true
    }
  }
  const redirects = new Map();
  for (const folder of originalFolders) {
    if (!recognized(folder)) continue;
    const target = targets.get(folder.section + '\0' + (aliases[folder.section][folder.name] || cleanName(folder.name)));
    if (target && target.id !== folder.id) redirects.set(folder.id, target.id);
  }
  for (const folder of data.folders || []) {
    if (redirects.has(folder.parentId)) {
      const parent = redirects.get(folder.parentId);
      folder.parentId = parent === folder.id ? null : parent;
      changed = true;
    }
  }
  const obsolete = new Set(originalFolders.filter(folder => recognized(folder) && !claimed.has(folder.id) && !(data.items || []).some(item => item.folderId === folder.id) && !data.folders.some(child => child.parentId === folder.id)).map(folder => folder.id));
  if (obsolete.size) {
    data.folders = data.folders.filter(folder => !obsolete.has(folder.id));
    changed = true
  }
  if (changed) data.updatedAt = stamp;
  return data;
}

async function regroupLocalLibrary() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['items', 'folders'], 'readwrite');
    const itemsRequest = transaction.objectStore('items').getAll();
    const foldersRequest = transaction.objectStore('folders').getAll();
    let items, folders, changed = false,
      failure = null;
    transaction.oncomplete = () => {
      if (changed) window.workspaceSearch?.invalidate();
      resolve(changed)
    };
    transaction.onerror = transaction.onabort = () => reject(failure || transaction.error || new Error('Regroupement interrompu'));
    const regroup = () => {
      if (!items || !folders) return;
      try {
        const payload = regroupTechnologyLibrary(structuredClone({
          items,
          folders
        }));
        const originalItems = new Map(items.map(item => [item.id, JSON.stringify(item)]));
        const originalFolders = new Map(folders.map(folder => [folder.id, JSON.stringify(folder)]));
        for (const item of payload.items) {
          if (originalItems.get(item.id) !== JSON.stringify(item)) {
            transaction.objectStore('items').put(item);
            changed = true;
          }
        }
        for (const folder of payload.folders) {
          if (originalFolders.get(folder.id) !== JSON.stringify(folder)) {
            transaction.objectStore('folders').put(folder);
            changed = true;
          }
          originalFolders.delete(folder.id);
        }
        for (const id of originalFolders.keys()) {
          transaction.objectStore('folders').delete(id);
          changed = true;
        }
      } catch (error) {
        failure = error;
        transaction.abort()
      }
    };
    itemsRequest.onsuccess = () => {
      items = itemsRequest.result;
      regroup()
    };
    foldersRequest.onsuccess = () => {
      folders = foldersRequest.result;
      regroup()
    };
  });
}

async function flattenRedundantSectionRoots() {
  const folders = await activeFolders();
  const items = await activeItems();

  const expectedNames = {
    vault: ['coffre', 'coffre-fort'],
    memo: ['mémo', 'memo', 'mémos', 'memos'],
    command: ['commande', 'commandes'],
    template: ['template', 'templates']
  };

  for (const section of ['vault', 'memo', 'command', 'template']) {
    const names = expectedNames[section];
    const roots = folders.filter(f =>
      f.section === section &&
      !f.parentId &&
      names.includes(String(f.name || '').trim().toLowerCase())
    );

    for (const root of roots) {
      const children = folders.filter(f => f.parentId === root.id);
      const rootItems = items.filter(x => x.folderId === root.id);

      // Remonte les enfants à la racine de la section.
      for (const child of children) {
        child.parentId = null;
        await put('folders', child);
      }

      // Remonte aussi les éléments directement contenus dans le dossier redondant.
      for (const x of rootItems) {
        x.folderId = null;
        x.updatedAt = now();
        await put('items', x);
      }

      await del('folders', root.id);
    }
  }
}

async function ensureCommandSeparation() {
  const folders = await activeFolders();
  const items = await activeItems();

  // 1) Migre automatiquement l'arborescence historique "Commandes".
  const roots = folders.filter(f => f.section === 'memo' && String(f.name || '').trim().toLowerCase() === 'commandes');
  const migratedIds = new Set();

  for (const root of roots) {
    const ids = new Set([root.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of folders) {
        if (f.section === 'memo' && f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
          ids.add(f.id);
          changed = true;
        }
      }
    }
    for (const f of folders.filter(x => ids.has(x.id))) {
      f.section = 'command';
      if (f.id === root.id) f.parentId = null;
      await put('folders', f);
      migratedIds.add(f.id);
    }
  }

  // 2) Les commandes encore rangées dans un dossier Mémo deviennent racine Commandes.
  const currentFolders = await activeFolders();
  const folderById = new Map(currentFolders.map(f => [f.id, f]));
  for (const x of items.filter(x => x.type === 'command')) {
    if (x.folderId) {
      const f = folderById.get(x.folderId);
      if (!f || f.section !== 'command') {
        x.folderId = null;
      } else {}
    }
    if (!x.context) x.context = '';
    if (!x.example) x.example = '';
    x.updatedAt = x.updatedAt || now();
    await put('items', x);
  }
  await flattenRedundantSectionRoots();
}
