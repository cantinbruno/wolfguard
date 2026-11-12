const WolfGuardPermissions = (() => {
// Deny by default. This model is also bundled for the browser; API checks remain authoritative.
//
// New section model: each section of the application (including Agents) is
// granted one of three levels — 'read', 'write' or 'deny' (invisible).
// A section set to 'write' grants every action of that section. The optional
// administrator switch grants full write access to every section at once,
// without changing the server-only role of the single owner account.
const PERMISSION_SECTIONS = [
  ['library', 'Mémo'],
  ['vault', 'Coffre-fort'],
  ['scan.passive', 'Scan passif'],
  ['scan.active', 'Scan actif'],
  ['scan.map', 'Cartographie'],
  ['scan.vulnerability', 'Vulnérabilités'],
  ['remote', 'Prise en main'],
  ['agents', 'Agents'],
  ['edr', 'EDR'],
  ['tools', 'Outils'],
  ['users', 'Utilisateurs et droits'],
  ['access', 'Connexions']
];
const SECTION_LEVELS = [['read', 'Lecture'], ['write', 'Écriture'], ['deny', 'Invisible']];
const SECTION_IDS = PERMISSION_SECTIONS.map(([id]) => id);
// Legacy granular keys remain understood so old policies keep loading.
const GROUP_ACTIONS = {
  library: ['read', 'create', 'edit', 'delete', 'export'], vault: ['read', 'secrets', 'create', 'edit', 'delete', 'export'],
  'scan.passive': ['read', 'run', 'cancel', 'delete', 'export'], 'scan.active': ['read', 'run', 'cancel', 'delete', 'export'],
  'scan.map': ['read', 'run', 'cancel', 'delete', 'export'], 'scan.vulnerability': ['read', 'run', 'cancel', 'delete', 'export'],
  remote: ['read', 'desktop', 'terminal', 'files'], agents: ['read', 'pair', 'revoke'], edr: ['read', 'acknowledge', 'manage'], ai: ['use'], tools: ['use'],
  users: ['read', 'manage', 'permissions'], access: ['read', 'manage']
};
const PERMISSION_KEYS = Object.entries(GROUP_ACTIONS).flatMap(([group, actions]) => actions.map(action => group + '.' + action));
const LEVEL_ACTIONS = { read: {}, write: {} };
// A section at 'write' implies every action key of that group; 'read' keeps
// only the read-side keys. Derived at load time so both stay in sync.
for (const [group, actions] of Object.entries(GROUP_ACTIONS)) {
  LEVEL_ACTIONS.write[group] = actions.map(action => group + '.' + action);
  LEVEL_ACTIONS.read[group] = actions.filter(action => ['read', 'use', 'secrets', 'export'].includes(action)).map(action => group + '.' + action);
}
const PERMISSION_PROFILES = [
  { id: 'none', name: 'Aucun accès', description: 'Aucune section visible.', sections: Object.fromEntries(SECTION_IDS.map(id => [id, 'deny'])), admin: false },
  { id: 'reader', name: 'Lecture seule', description: 'Toutes les sections en lecture, sauf la gestion.', sections: Object.fromEntries(SECTION_IDS.map(id => [id, ['users', 'access'].includes(id) ? 'deny' : 'read'])), admin: false },
  { id: 'admin', name: 'Administrateur', description: 'Écriture sur toutes les sections.', sections: null, admin: true },
  { id: 'legacy', name: 'Accès existants', description: 'Droits hérités de la gestion avancée précédente.', sections: null, admin: false, legacy: true }
];
function profilePolicy(id = 'reader') {
  if(id==='full')id='admin';
  if(id==='endpoint-manager'){const policy=profilePolicy('none');policy.profile=id;policy.sections.agents='write';policy.sections.edr='write';policy.sections.tools='write';return policy;}
  const profile = PERMISSION_PROFILES.find(p => p.id === id); if (!profile) throw new Error('Profil inconnu.');
  if (profile.legacy) return normalizePolicy({version:1,profile:'legacy',grants:PERMISSION_KEYS.filter(key=>!key.startsWith('users.')&&!key.startsWith('access.')&&!key.startsWith('ai.')&&!['agents.pair','agents.revoke','edr.manage','edr.acknowledge','remote.files'].includes(key)),agents:null,scopes:{library:{mode:'all',folders:{},items:{}},vault:{mode:'all',folders:{},items:{}}},expiresAt:null});
  const sections = profile.sections ? { ...profile.sections } : Object.fromEntries(SECTION_IDS.map(section => [section, profile.admin ? 'write' : 'deny']));
  return normalizePolicy({ version: 2, admin: profile.admin, sections, expiresAt: null, profile: id });
}
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(id);
function normalizePolicy(input) {
  if(input?.version===1){
    if(!Array.isArray(input.grants)||input.grants.some(key=>!PERMISSION_KEYS.includes(key)&&key!=='vault.all'))throw new Error('Droits hérités invalides.');
    const sections=Object.fromEntries(SECTION_IDS.map(id=>[id,input.grants.some(key=>key.startsWith(id+'.')&&!['read','secrets','export','use'].includes(key.slice(id.length+1)))?'write':input.grants.some(key=>key.startsWith(id+'.'))?'read':'deny']));
    input={...input,version:2,admin:false,sections,legacyGrants:input.grants.filter(key=>key!=='vault.all')};
  }
  if (!input || input.version !== 2 || typeof input.admin !== 'boolean') throw new Error('Liste de droits invalide.');
  const sections = {};
  for (const section of SECTION_IDS) {
    const level = input.sections?.[section];
    if (!['read', 'write', 'deny'].includes(level)) throw new Error('Niveau de section invalide : ' + section);
    sections[section] = level;
  }
  const expiry = input.expiresAt ?? null; if (expiry !== null && (!Number.isSafeInteger(expiry) || expiry < 1 || expiry > 8640000000000000)) throw new Error('Date de fin invalide.');
  if (input.agents !== undefined && input.agents !== null && (!Array.isArray(input.agents) || input.agents.length > 200 || input.agents.some(id => !/^[a-f0-9]{32}$/.test(id)))) throw new Error('Liste de postes invalide.');
  const agents = input.agents === undefined || input.agents === null ? null : [...new Set(input.agents)];
  let compatibility={};
  if(input.legacyGrants){
    if(!Array.isArray(input.legacyGrants)||input.legacyGrants.some(key=>!PERMISSION_KEYS.includes(key)))throw new Error('Droits hérités invalides.');
    const scopes={};for(const section of ['library','vault']){
      const scope=input.scopes?.[section]||{mode:'all',folders:{},items:{}};
      if(!['all','selected'].includes(scope.mode))throw new Error('Périmètre invalide.');
      scopes[section]={mode:scope.mode};for(const kind of ['folders','items']){
        const rules=scope[kind];if(!rules||typeof rules!=='object'||Array.isArray(rules)||Object.keys(rules).length>2000)throw new Error('Règles invalides.');
        scopes[section][kind]={};for(const [id,level]of Object.entries(rules)){if(!validId(id)||['__proto__','prototype','constructor'].includes(id)||!['deny','read','write'].includes(level))throw new Error('Règle invalide.');scopes[section][kind][id]=level;}
      }
    }
    compatibility={legacyGrants:[...new Set(input.legacyGrants)],scopes};
  }
  return { ...compatibility,version: 2, profile: typeof input.profile === 'string' ? input.profile : 'custom', admin: !!input.admin, sections, agents, expiresAt: expiry };
}
function grantsOf(policy) {
  if(policy.legacyGrants)return [...policy.legacyGrants];
  const grants = new Set();
  for (const [section, level] of Object.entries(policy.sections)) {
    if (level === 'deny') continue;
    const keys = level === 'write' ? LEVEL_ACTIONS.write[section] || [] : LEVEL_ACTIONS.read[section] || [];
    for (const key of keys) grants.add(key);
  }
  return [...grants];
}
function can(user, key, now = Date.now()) {
  if(key==='vault.all')return false;
  if (user?.role === 'admin') return true;
  const policy = user?.permissions; if (!policy) return false;
  if (policy.expiresAt !== null && policy.expiresAt <= now) return false;
  if (policy.admin) return true;
  if(policy.legacyGrants||policy.grants){const grants=policy.legacyGrants||policy.grants;if(key.endsWith('.write'))return grants.some(grant=>grant.startsWith(key.slice(0,-5))&&!['read','secrets','export','use'].includes(grant.split('.').at(-1)));return grants.includes(key)||SECTION_IDS.includes(key)&&grants.some(grant=>grant.startsWith(key+'.'));}
  const section = SECTION_IDS.find(id => key === id || key.startsWith(id + '.')); if (!section) return false;
  const level = policy.sections?.[section];
  if (level === 'write') return true;
  if (level !== 'read') return false;
  const readKeys = LEVEL_ACTIONS.read[section] || [];
  return key === section || readKeys.includes(key);
}
function canAgent(user, id, now = Date.now()) {
  if (!can(user, 'agents.read', now)) return false;
  const policy = user?.permissions;
  return user?.role==='admin'||!policy||policy.admin||policy.agents==null||policy.agents.includes(id);
}
const LEVEL_ORDER = { deny: 0, read: 1, write: 2 };
function recordSection(record, kind = 'items') { return kind === 'folders' ? (record.section === 'vault' ? 'vault' : 'library') : (record.type === 'vault' ? 'vault' : 'library'); }
const vaultHomeId = id => 'vault-user-' + id;
const isVaultHome = id => typeof id === 'string' && /^vault-user-[a-f0-9]{32}$/.test(id);
function isInPersonalVault(user, record, kind, folders) {
  if (!user?.id) return false;
  const home = vaultHomeId(user.id); if (kind === 'folders' && record.id === home) return true;
  let id = kind === 'folders' ? record.parentId : record.folderId; const seen = new Set();
  while (id) { if (id === home) return true; if (seen.has(id)) return false; seen.add(id); const folder = folders.find(row => row.id === id); if (!folder || recordSection(folder, 'folders') !== 'vault' || isVaultHome(id)) return false; id = folder.parentId; }
  return false;
}
function recordLevel(user, record, kind, folders, now = Date.now()) {
  const section = recordSection(record, kind);
  if (section==='vault'&&user?.id&&!isInPersonalVault(user,record,kind,folders))return 'deny';
  if(!can(user,section+'.read',now))return 'deny';
  const scope=user?.permissions?.scopes?.[section];
  let scoped='write';
  if(scope){
    const rules=kind==='items'?scope.items:scope.folders;
    if(own(rules||{},record.id))scoped=rules[record.id];
    else {let id=kind==='items'?record.folderId:record.parentId;const seen=new Set();scoped=scope.mode==='all'?'write':'deny';while(id){if(seen.has(id))return 'deny';seen.add(id);if(own(scope.folders||{},id)){scoped=scope.folders[id];break;}id=folders.find(row=>row.id===id)?.parentId;}}
  }
  if(scoped==='deny')return 'deny';
  return scoped==='write'&&can(user,section+'.write',now)?'write':'read';
}
function requirePermission(user, key, fail, now) { if (!can(user, key, now)) fail(403, 'Ton compte ne dispose pas du droit « ' + key + ' ».', { code: 'PERMISSION_DENIED' }); }
function canManagePolicy(actor, target, now = Date.now()) {
  if (actor?.role === 'admin') return true;
  const ownPolicy = actor?.permissions; if (!ownPolicy) return false;
  if (ownPolicy.expiresAt !== null && (ownPolicy.expiresAt <= now || target.expiresAt === null || target.expiresAt > ownPolicy.expiresAt)) return false;
  if (ownPolicy.admin) return true;
  if (target.admin) return false;
  if(grantsOf(target).some(key=>!can(actor,key,now)))return false;
  if(ownPolicy.agents!=null&&(target.agents==null||target.agents.some(id=>!ownPolicy.agents.includes(id))))return false;
  if(ownPolicy.scopes&&JSON.stringify(ownPolicy.scopes)!==JSON.stringify(target.scopes))return false;
  for (const section of SECTION_IDS) {
    // A manager may only hand out levels at or below his own for each section.
    if (LEVEL_ORDER[target.sections[section]] > LEVEL_ORDER[ownPolicy.sections[section]]) return false;
  }
  if (ownPolicy.expiresAt !== null && (target.expiresAt === null || target.expiresAt > ownPolicy.expiresAt)) return false;
  return true;
}

return Object.freeze({PERMISSION_SECTIONS,SECTION_LEVELS,PERMISSION_KEYS,LEVEL_ACTIONS,PERMISSION_PROFILES,profilePolicy,normalizePolicy,grantsOf,can,canAgent,recordSection,vaultHomeId,isVaultHome,isInPersonalVault,recordLevel,requirePermission,canManagePolicy});
})();
