import {readFile as readText, stat as fileStat} from 'node:fs/promises';
import {hostname, release} from 'node:os';

function endpoint(value) {
  const match = /^\[([^\]]+)\]:(\d+|\*)$/.exec(value) || /^(.*):(\d+|\*)$/.exec(value);
  if (!match) return null;
  return {address: match[1] === '*' ? '0.0.0.0' : match[1], port: match[2] === '*' ? null : Number(match[2])};
}

export function parseSS(output) {
  const rows = [];
  for (const line of output.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/), protocol = fields[0]?.toUpperCase();
    if (!['TCP', 'UDP'].includes(protocol)) continue;
    const local = endpoint(fields[4] || ''), remote = endpoint(fields[5] || '');
    if (!local || !remote) continue;
    rows.push({...local, transport: protocol, status: protocol === 'UDP' ? 'bound' : fields[1] === 'LISTEN' ? 'listening' : 'connection',
      remoteAddress: remote.address, remotePort: remote.port, pid: Number(/pid=(\d+)/.exec(line)?.[1]) || null,
      processName: /users:\(\("([^"]+)"/.exec(line)?.[1] || '', detail: fields[1], source: 'agent-ss'});
  }
  return rows;
}

export function parseProcNet(output, transport = 'TCP', ipv6 = false) {
  function address(hex) {
    if (ipv6) return hex.match(/.{8}/g).map(word => Buffer.from(word, 'hex').reverse().toString('hex')).join('').match(/.{4}/g).join(':');
    return [...Buffer.from(hex, 'hex').reverse()].join('.');
  }
  const rows = [];
  for (const line of output.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    const local = /^([a-f0-9]+):([a-f0-9]{4})$/i.exec(fields[1] || ''), remote = /^([a-f0-9]+):([a-f0-9]{4})$/i.exec(fields[2] || '');
    if (!local || !remote || local[1].length !== (ipv6 ? 32 : 8)) continue;
    rows.push({address: address(local[1]), port: parseInt(local[2], 16), remoteAddress: address(remote[1]), remotePort: parseInt(remote[2], 16),
      transport, status: transport === 'UDP' ? 'bound' : fields[3] === '0A' ? 'listening' : 'connection', detail: 'État noyau : ' + fields[3], source: 'agent-proc-net'});
  }
  return rows;
}

export function parseLsof(output) {
  const rows = [];
  let pid = null, processName = '', socket = null;
  function flush() {
    if (!socket?.local || !['TCP', 'UDP'].includes(socket.transport)) return;
    const [local, remote] = socket.local.split('->').map(endpoint);
    if (!local) return;
    rows.push({...local, transport: socket.transport, status: socket.transport === 'UDP' ? 'bound' : socket.state === 'LISTEN' ? 'listening' : 'connection',
      remoteAddress: remote?.address || '', remotePort: remote?.port ?? null, pid, processName, detail: socket.state || 'Socket locale', source: 'agent-lsof'});
  }
  for (const line of output.split(/\r?\n/)) {
    const field = line.slice(1);
    if (line[0] === 'p') { flush(); socket = null; pid = Number(field) || null; processName = ''; }
    else if (line[0] === 'c') processName = field;
    else if (line[0] === 'f') { flush(); socket = {}; }
    else if (socket && line[0] === 'P') socket.transport = field;
    else if (socket && line[0] === 'n') socket.local = field;
    else if (socket && line.startsWith('TST=')) socket.state = line.slice(4);
  }
  flush(); return rows;
}

export function parseNeighbors(output, source = 'agent-neighbor') {
  const rows = [];
  for (const line of output.split(/\r?\n/)) {
    const arp = /\(([^)]+)\) at ([\da-f:]+) on (\S+)/i.exec(line);
    const ndp = /^([\da-f:]+(?:%\S+)?)\s+([\da-f]{1,2}(?::[\da-f]{1,2}){5})\s+(\S+)/i.exec(line.trim());
    const proc = /^([\d.]+)\s+0x\w+\s+0x([\da-f]+)\s+([\da-f:]+)\s+\S+\s+(\S+)/i.exec(line.trim());
    if (proc && (!(parseInt(proc[2], 16) & 2) || proc[3] === '00:00:00:00:00:00')) continue;
    const address = arp?.[1] || ndp?.[1] || proc?.[1], mac = arp?.[2] || ndp?.[2] || proc?.[3];
    if (!address || !mac || !/^[\da-f]{1,2}(?::[\da-f]{1,2}){5}$/i.test(mac)) continue;
    rows.push({address, port: null, macAddress: mac, interfaceName: arp?.[3] || ndp?.[3] || proc?.[4],
      transport: address.includes(':') ? 'NDP' : 'ARP', status: 'observed', source, detail: 'Entrée du cache voisin ; présence non confirmée.'});
  }
  return rows;
}

async function observe(run, file, args, signal, accepted = [0]) {
  if (signal?.aborted) throw signal.reason;
  try { return {available: true, output: await run(file, args, {signal, timeout: 8000})}; }
  catch (error) {
    if (signal?.aborted) throw error;
    if (accepted.includes(error.code) && typeof error.stdout === 'string') return {available: true, output: error.stdout};
    return {available: false, output: ''};
  }
}

export async function collectPosixPassive(signal, {platform = process.platform, run, read = name => readText(name, 'utf8')} = {}) {
  const results = [], warnings = [];
  if (platform === 'linux') {
    const neighbors = await observe(run, 'ip', ['-j', 'neigh', 'show'], signal);
    if (neighbors.available) {
      try { for (const item of JSON.parse(neighbors.output)) if (item.dst && item.lladdr) results.push({address: item.dst, port: null, transport: item.dst.includes(':') ? 'NDP' : 'ARP',
        status: 'observed', macAddress: item.lladdr, interfaceName: item.dev || '', detail: String(item.state || ''), source: 'agent-ip-neighbor'}); }
      catch { warnings.push('Cache voisin JSON illisible.'); }
    } else {
      try { results.push(...parseNeighbors(await read('/proc/net/arp'))); }
      catch { warnings.push('Lecture des voisins indisponible.'); }
      warnings.push('NDP indisponible sans la commande ip ; seul le cache IPv4 a été recherché.');
    }
    const sockets = await observe(run, 'ss', ['-H', '-t', '-u', '-n', '-a', '-p'], signal);
    if (sockets.available) results.push(...parseSS(sockets.output));
    else {
      for (const [name, transport, ipv6] of [['tcp', 'TCP', false], ['tcp6', 'TCP', true], ['udp', 'UDP', false], ['udp6', 'UDP', true]]) {
        try { results.push(...parseProcNet(await read('/proc/net/' + name), transport, ipv6)); }
        catch { warnings.push('Table ' + name + ' indisponible.'); }
      }
      warnings.push('Collecte /proc sans identification des processus propriétaires.');
    }
  } else if (platform === 'darwin') {
    for (const [file, args] of [['/usr/sbin/arp', ['-an']], ['/usr/sbin/ndp', ['-an']]]) {
      const data = await observe(run, file, args, signal);
      if (data.available) results.push(...parseNeighbors(data.output)); else warnings.push('Lecture ' + file.split('/').at(-1) + ' indisponible.');
    }
    const sockets = await observe(run, '/usr/sbin/lsof', ['-nP', '-iTCP', '-iUDP', '-FpcfPnT'], signal, [0, 1]);
    if (sockets.available) results.push(...parseLsof(sockets.output)); else warnings.push('Lecture des sockets par lsof indisponible.');
  } else throw new Error('Système non pris en charge.');
  warnings.push('Instantané local sans sonde. Selon les droits du compte, certains sockets et processus peuvent être masqués.');
  return {results, warnings};
}

export function evaluatePosixSecurity(data = {}, now = Date.now()) {
  const results = [], platform = data.platform, mac = platform === 'darwin';
  if (!['linux', 'darwin'].includes(platform)) throw new Error('Système d’audit invalide.');
  const add = (checkId, title, status, detail, recommendation = '', severity = 'medium') => results.push({address: '127.0.0.1', hostname: data.hostname || 'Poste de l’agent', port: null,
    transport: 'AUDIT', source: 'agent-security-' + platform, checkId, title, status, severity, detail, recommendation});
  const unknown = (id, title) => add(id, title, 'notchecked', 'Lecture indisponible ou droits insuffisants.', 'Vérifier ce contrôle avec les droits adaptés.');
  const boolean = (id, title, value, recommendation) => typeof value === 'boolean'
    ? add(id, title, value ? 'passed' : 'issue', value ? 'Protection activée.' : 'Protection désactivée.', recommendation, 'high') : unknown(id, title);
  add('inventory', 'Système observé', 'info', (mac ? 'macOS' : 'Linux') + ' · ' + (data.os || '') + ' · ' + (data.release || ''), '', 'info');
  boolean('firewall', 'Pare-feu' + (data.firewallProvider ? ' · ' + data.firewallProvider : ' local'), data.firewall, 'Vérifier et activer le pare-feu adapté aux services nécessaires.');
  if (mac) {
    boolean('sip', 'System Integrity Protection', data.sip, 'Réactiver SIP selon les consignes Apple et les politiques de la machine.');
    boolean('gatekeeper', 'Contrôle des applications Gatekeeper', data.gatekeeper, 'Vérifier et réactiver la politique de contrôle des applications.');
    boolean('filevault', 'Chiffrement FileVault', data.filevault, 'Activer FileVault et conserver la clé de récupération dans un emplacement sûr.');
  } else {
    for (const [id, title, expected] of [['aslr', 'Randomisation des adresses mémoire (ASLR)', 2], ['kptr', 'Restriction des pointeurs du noyau', 1], ['dmesg', 'Restriction des journaux du noyau', 1]]) {
      const value = data[id];
      if (Number.isInteger(value)) add(id, title, value >= expected ? 'passed' : 'issue', 'Valeur noyau observée : ' + value, 'Vérifier la configuration sysctl et sa persistance.'); else unknown(id, title);
    }
    boolean('mandatory-access', 'Contrôle d’accès AppArmor / SELinux', data.mandatoryAccess, 'Vérifier le profil AppArmor ou la politique SELinux adaptés à cette distribution.');
    for (const [field, id, title, risky] of [['permitrootlogin', 'ssh-root', 'Connexion SSH directe du compte root', 'yes'], ['passwordauthentication', 'ssh-password', 'Authentification SSH par mot de passe', 'yes']]) {
      const value = data.ssh?.[field];
      if (value) add(id, title, value === risky ? 'issue' : 'passed', field + ' = ' + value, 'Vérifier les accès SSH, privilégier les clés et limiter les comptes autorisés.'); else unknown(id, title);
    }
  }
  const updates = data.updates, fresh = Number.isFinite(updates?.checkedAt) && now >= updates.checkedAt && now - updates.checkedAt < 7 * 86400000;
  if (updates?.items?.length) add('updates-cache', 'Mises à jour disponibles (cache local)', 'issue', updates.items.slice(0, 30).join('\n'), 'Actualiser le gestionnaire de mises à jour et examiner les correctifs applicables.');
  else add('updates-cache', 'Mises à jour disponibles (cache local)', fresh ? 'passed' : 'notchecked', 'Aucune mise à jour listée dans le cache consulté. ' + (fresh ? 'Cache daté de moins de sept jours.' : 'Fraîcheur du cache non confirmée.'), 'Effectuer une recherche récente depuis le gestionnaire de mises à jour.', 'info');
  return {results, warnings: ['Audit local en lecture seule, adapté à ' + (mac ? 'macOS' : 'Linux') + '. Aucune modification appliquée ; les caches de mises à jour ne constituent pas un inventaire exhaustif des CVE.']};
}

export async function collectPosixSecurity(signal, {platform = process.platform, run, read = name => readText(name, 'utf8'), stat = fileStat} = {}) {
  const data = {platform, hostname: hostname(), release: release()};
  if (platform === 'darwin') {
    const commands = [
      ['firewall', '/usr/libexec/ApplicationFirewall/socketfilterfw', ['--getglobalstate'], /enabled|State\s*=\s*1/i, /disabled|State\s*=\s*0/i],
      ['sip', '/usr/bin/csrutil', ['status'], /status:\s*enabled/i, /status:\s*disabled/i],
      ['gatekeeper', '/usr/sbin/spctl', ['--status'], /assessments enabled/i, /assessments disabled/i],
      ['filevault', '/usr/bin/fdesetup', ['status'], /FileVault is On/i, /FileVault is Off/i]
    ];
    for (const [field, file, args, enabled, disabled] of commands) {
      const value = await observe(run, file, args, signal);
      if (value.available) { if (disabled.test(value.output)) data[field] = false; else if (enabled.test(value.output)) data[field] = true; }
    }
    const os = await observe(run, '/usr/bin/sw_vers', ['-productVersion'], signal); if (os.available) data.os = os.output.trim();
    const updates = await observe(run, '/usr/bin/plutil', ['-convert', 'json', '-o', '-', '/Library/Preferences/com.apple.SoftwareUpdate.plist'], signal);
    if (updates.available) try { const parsed = JSON.parse(updates.output); data.updates = {checkedAt: Date.parse(parsed.LastSuccessfulDate || ''), items: (parsed.RecommendedUpdates || []).map(item => String(item.DisplayName || item.Identifier || 'Mise à jour'))}; } catch {}
  } else if (platform === 'linux') {
    try { data.os = /^PRETTY_NAME=["']?([^\r\n"']+)/m.exec(await read('/etc/os-release'))?.[1] || ''; } catch {}
    for (const [field, file] of [['aslr', '/proc/sys/kernel/randomize_va_space'], ['kptr', '/proc/sys/kernel/kptr_restrict'], ['dmesg', '/proc/sys/kernel/dmesg_restrict']]) {
      try { const value = (await read(file)).trim(); if (/^[0-9]+$/.test(value)) data[field] = Number(value); } catch {}
    }
    const ufw = await observe(run, '/usr/sbin/ufw', ['status'], signal);
    if (ufw.available && /Status:\s*(active|inactive)/i.test(ufw.output)) { data.firewall = /Status:\s*active/i.test(ufw.output); data.firewallProvider = 'UFW'; }
    if (data.firewall !== true) { const firewalld = await observe(run, 'firewall-cmd', ['--state'], signal, [0, 252]); if (firewalld.available && /^(running|not running)\s*$/.test(firewalld.output.trim())) { data.firewall = firewalld.output.trim() === 'running'; data.firewallProvider = 'firewalld'; } }
    let apparmor = null; try { apparmor = (await read('/sys/module/apparmor/parameters/enabled')).trim(); } catch {}
    const selinux = await observe(run, 'getenforce', [], signal);
    let enforcedProfiles = false; if (apparmor === 'Y') try { enforcedProfiles = /\(enforce\)/.test(await read('/sys/kernel/security/apparmor/profiles')); } catch {}
    if (enforcedProfiles || selinux.available && selinux.output.trim() === 'Enforcing') data.mandatoryAccess = true;
    else if (selinux.available && /^(Permissive|Disabled)$/.test(selinux.output.trim())) data.mandatoryAccess = false;
    const ssh = await observe(run, '/usr/sbin/sshd', ['-T'], signal);
    if (ssh.available) data.ssh = Object.fromEntries(ssh.output.trim().split(/\r?\n/).map(line => line.split(/\s+/, 2)));
    const apt = await observe(run, '/usr/bin/apt', ['list', '--upgradable'], signal);
    if (apt.available) {
      let checkedAt; try { checkedAt = (await stat('/var/lib/apt/periodic/update-success-stamp')).mtimeMs; } catch {}
      data.updates = {checkedAt, items: apt.output.split(/\r?\n/).filter(line => /^\S+\/\S+\s+/.test(line)).map(line => line.slice(0, 300))};
    } else {
      const dnf = await observe(run, 'dnf', ['--cacheonly', 'check-update'], signal, [0, 100]);
      if (dnf.available) data.updates = {items: dnf.output.split(/\r?\n/).filter(line => /^\S+\.(?:x86_64|aarch64|noarch|i686)\s+\S+\s+\S+/.test(line)).map(line => line.slice(0, 300))};
    }
  }
  return evaluatePosixSecurity(data);
}
