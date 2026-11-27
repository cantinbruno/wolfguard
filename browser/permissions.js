// Deny by default. This model is also bundled for the browser; API checks remain authoritative.
//
// New section model: each section of the application (including Agents) is
// granted one of three levels — 'read', 'write' or 'deny' (invisible).
// A section set to 'write' grants every action of that section. The optional
// administrator switch grants full write access to every section at once,
// without changing the server-only role of the single owner account.
export const PERMISSION_SECTIONS = [
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
  ['access', 'Connexions'],
  ['data', 'Données des espaces']
];
export const SECTION_LEVELS = [
  ['read', 'Lecture'],
  ['write', 'Écriture'],
  ['deny', 'Invisible']
];
export const AGENT_SECTIONS = [
  'agents',
  'scan.passive',
  'scan.active',
  'scan.map',
  'scan.vulnerability',
  'edr',
  'remote'
];
const SECTION_IDS = PERMISSION_SECTIONS.map(([id]) => id);
// Legacy granular keys remain understood so old policies keep loading.
const GROUP_ACTIONS = {
  library: ['read', 'create', 'edit', 'delete', 'export'],
  vault: ['read', 'secrets', 'create', 'edit', 'delete', 'export'],
  'scan.passive': ['read', 'run', 'cancel', 'delete', 'export'],
  'scan.active': ['read', 'run', 'cancel', 'delete', 'export'],
  'scan.map': ['read', 'run', 'cancel', 'delete', 'export'],
  'scan.vulnerability': ['read', 'run', 'cancel', 'delete', 'export'],
  remote: ['read', 'desktop', 'terminal', 'files'],
  agents: ['read', 'pair', 'revoke'],
  edr: ['read', 'acknowledge', 'manage'],
  ai: ['use'],
  tools: ['use'],
  users: ['read', 'manage', 'create', 'edit', 'disable', 'delete', 'reset', 'sessions', 'mfa', 'permissions'],
  access: ['read', 'manage', 'disconnect', 'block', 'unblock'],
  data: ['read']
};
export const PERMISSION_KEYS = Object.entries(GROUP_ACTIONS).flatMap(([group, actions]) =>
  actions.map(action => group + '.' + action)
);
const ACTION_LABELS = {
  read: 'Consulter',
  create: 'Créer',
  edit: 'Modifier',
  delete: 'Supprimer',
  export: 'Exporter',
  secrets: 'Consulter les secrets',
  run: 'Lancer une analyse',
  cancel: 'Arrêter une analyse',
  desktop: 'Bureau à distance',
  terminal: 'Terminal distant',
  files: 'Transférer des fichiers',
  pair: 'Associer un poste',
  revoke: 'Révoquer un poste',
  acknowledge: 'Acquitter les alertes',
  manage: 'Administrer',
  permissions: 'Gérer les groupes et les droits',
  use: 'Utiliser',
  disable: 'Activer ou désactiver les comptes',
  reset: 'Réinitialiser les codes',
  sessions: 'Déconnecter les comptes',
  mfa: 'Réinitialiser Authenticator',
  disconnect: 'Déconnecter une session',
  block: 'Bloquer une adresse IP',
  unblock: 'Débloquer une adresse IP'
};
export const PERMISSION_ACTIONS = PERMISSION_SECTIONS.flatMap(([section, label]) =>
  (GROUP_ACTIONS[section] || []).map(action => [section + '.' + action, ACTION_LABELS[action], section, label])
);
export const LEVEL_ACTIONS = { read: {}, write: {} };
// A section at 'write' implies every action key of that group; 'read' keeps
// only the read-side keys. Derived at load time so both stay in sync.
for (const [group, actions] of Object.entries(GROUP_ACTIONS)) {
  LEVEL_ACTIONS.write[group] = actions.map(action => group + '.' + action);
  LEVEL_ACTIONS.read[group] = actions
    .filter(action => ['read', 'use', 'secrets', 'export'].includes(action))
    .map(action => group + '.' + action);
}
export const PERMISSION_PROFILES = [
  {
    id: 'admin',
    name: 'Administrateur',
    description: 'Écriture partout, droits et accès compris.',
    sections: null,
    admin: true
  },
  {
    id: 'editor',
    name: 'Éditeur',
    description: 'Écriture partout, sauf la gestion des utilisateurs et des droits.',
    sections: Object.fromEntries(SECTION_IDS.map(id => [id, id === 'users' ? 'read' : 'write'])),
    admin: false
  },
  {
    id: 'observer',
    name: 'Observateur',
    description: 'Lecture partout, aucune modification.',
    sections: Object.fromEntries(SECTION_IDS.map(id => [id, 'read'])),
    admin: false
  },
  {
    id: 'guest',
    name: 'Invité',
    description: 'Tout est invisible. Rôle des nouveaux comptes.',
    sections: Object.fromEntries(SECTION_IDS.map(id => [id, 'deny'])),
    admin: false
  },
  {
    id: 'legacy',
    name: 'Accès existants',
    description: 'Droits hérités de la gestion avancée précédente.',
    sections: null,
    admin: false,
    legacy: true
  }
];
export function profilePolicy(id = 'guest') {
  if (id === 'full') id = 'admin';
  // Keep old policies readable without granting new access during migration.
  if (id === 'none') return { ...profilePolicy('guest'), profile: id };
  if (id === 'reader') {
    const policy = profilePolicy('observer');
    policy.profile = id;
    policy.sections.users = 'deny';
    policy.sections.access = 'deny';
    return policy;
  }
  if (id === 'endpoint-manager') {
    const policy = profilePolicy('none');
    policy.profile = id;
    policy.sections.agents = 'write';
    policy.sections.edr = 'write';
    policy.sections.tools = 'write';
    return policy;
  }
  const profile = PERMISSION_PROFILES.find(p => p.id === id);
  if (!profile) throw new Error('Profil inconnu.');
  if (profile.legacy)
    return normalizePolicy({
      version: 1,
      profile: 'legacy',
      grants: PERMISSION_KEYS.filter(
        key =>
          !key.startsWith('users.') &&
          !key.startsWith('access.') &&
          !key.startsWith('ai.') &&
          !['agents.pair', 'agents.revoke', 'edr.manage', 'edr.acknowledge', 'remote.files'].includes(key)
      ),
      agents: null,
      scopes: { library: { mode: 'all', folders: {}, items: {} }, vault: { mode: 'all', folders: {}, items: {} } },
      expiresAt: null
    });
  const sections = profile.sections
    ? { ...profile.sections }
    : Object.fromEntries(SECTION_IDS.map(section => [section, profile.admin ? 'write' : 'deny']));
  return normalizePolicy({ version: 2, admin: profile.admin, sections, expiresAt: null, profile: id });
}
export function policyProfile(policy) {
  if (!policy) return 'guest';
  if (Object.keys(policy.actionRules || {}).length) return 'custom';
  if (policy.admin) return 'admin';
  if (policy.legacyGrants || policy.grants) return 'custom';
  return (
    PERMISSION_PROFILES.find(
      profile => profile.sections && SECTION_IDS.every(id => policy.sections?.[id] === profile.sections[id])
    )?.id || 'custom'
  );
}
export function userRole(user) {
  if (user?.role === 'admin') return 'Propriétaire';
  const id = policyProfile(user?.permissions);
  return PERMISSION_PROFILES.find(profile => profile.id === id)?.name || 'Personnalisé';
}
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(id);
export function normalizePolicy(input) {
  if (input?.version === 1) {
    if (!Array.isArray(input.grants) || input.grants.some(key => !PERMISSION_KEYS.includes(key) && key !== 'vault.all'))
      throw new Error('Droits hérités invalides.');
    const sections = Object.fromEntries(
      SECTION_IDS.map(id => [
        id,
        input.grants.some(
          key => key.startsWith(id + '.') && !['read', 'secrets', 'export', 'use'].includes(key.slice(id.length + 1))
        )
          ? 'write'
          : input.grants.some(key => key.startsWith(id + '.'))
            ? 'read'
            : 'deny'
      ])
    );
    input = {
      ...input,
      version: 2,
      admin: false,
      sections,
      legacyGrants: input.grants.filter(key => key !== 'vault.all')
    };
  }
  if (!input || input.version !== 2 || typeof input.admin !== 'boolean') throw new Error('Liste de droits invalide.');
  const sections = {};
  for (const section of SECTION_IDS) {
    // The storage section was added after v2 shipped. Existing encrypted
    // policies must still load, with this new permission denied by default.
    const level = section === 'data' && !own(input.sections || {}, 'data') ? 'deny' : input.sections?.[section];
    if (!['read', 'write', 'deny'].includes(level)) throw new Error('Niveau de section invalide : ' + section);
    sections[section] = level;
  }
  const expiry = input.expiresAt ?? null;
  if (expiry !== null && (!Number.isSafeInteger(expiry) || expiry < 1 || expiry > 8640000000000000))
    throw new Error('Date de fin invalide.');
  if (
    input.agents !== undefined &&
    input.agents !== null &&
    (!Array.isArray(input.agents) || input.agents.length > 200 || input.agents.some(id => !/^[a-f0-9]{32}$/.test(id)))
  )
    throw new Error('Liste de postes invalide.');
  const agents = input.agents === undefined || input.agents === null ? null : [...new Set(input.agents)];
  let individual = {};
  if (input.agentLevels !== undefined) {
    const levels = input.agentLevels;
    if (
      !levels ||
      typeof levels !== 'object' ||
      Array.isArray(levels) ||
      Object.keys(levels).length > 200 ||
      Object.entries(levels).some(
        ([id, level]) => !/^[a-f0-9]{32}$/.test(id) || !['read', 'write', 'deny'].includes(level)
      )
    )
      throw new Error('Droits par poste invalides.');
    individual = { agentLevels: Object.fromEntries(Object.entries(levels)) };
  }
  if (input.groupLevels !== undefined) {
    const levels = input.groupLevels;
    if (
      !levels ||
      typeof levels !== 'object' ||
      Array.isArray(levels) ||
      Object.keys(levels).length > 250 ||
      Object.entries(levels).some(
        ([id, level]) =>
          !validId(id) ||
          id.length > 100 ||
          ['__proto__', 'constructor', 'prototype'].includes(id) ||
          !['read', 'write', 'deny'].includes(level)
      )
    )
      throw new Error('Droits par groupe invalides.');
    individual = { groupLevels: Object.fromEntries(Object.entries(levels)) };
  }
  let compatibility = {};
  if (input.legacyGrants) {
    if (!Array.isArray(input.legacyGrants) || input.legacyGrants.some(key => !PERMISSION_KEYS.includes(key)))
      throw new Error('Droits hérités invalides.');
    const scopes = {};
    for (const section of ['library', 'vault']) {
      const scope = input.scopes?.[section] || { mode: 'all', folders: {}, items: {} };
      if (!['all', 'selected'].includes(scope.mode)) throw new Error('Périmètre invalide.');
      scopes[section] = { mode: scope.mode };
      for (const kind of ['folders', 'items']) {
        const rules = scope[kind];
        if (!rules || typeof rules !== 'object' || Array.isArray(rules) || Object.keys(rules).length > 2000)
          throw new Error('Règles invalides.');
        scopes[section][kind] = {};
        for (const [id, level] of Object.entries(rules)) {
          if (
            !validId(id) ||
            ['__proto__', 'prototype', 'constructor'].includes(id) ||
            !['deny', 'read', 'write'].includes(level)
          )
            throw new Error('Règle invalide.');
          scopes[section][kind][id] = level;
        }
      }
    }
    compatibility = { legacyGrants: [...new Set(input.legacyGrants)], scopes };
  }
  let actions = {};
  if (input.actionRules !== undefined) {
    const rules = input.actionRules;
    if (
      !rules ||
      typeof rules !== 'object' ||
      Array.isArray(rules) ||
      Object.entries(rules).some(([key, value]) => !PERMISSION_KEYS.includes(key) || !['allow', 'deny'].includes(value))
    )
      throw new Error('Autorisations détaillées invalides.');
    if (Object.keys(rules).length) actions = { actionRules: Object.fromEntries(Object.entries(rules)) };
  }
  return {
    ...compatibility,
    ...individual,
    ...actions,
    version: 2,
    profile: typeof input.profile === 'string' ? input.profile : 'custom',
    admin: !!input.admin,
    sections,
    agents,
    expiresAt: expiry
  };
}
export function grantsOf(policy) {
  const grants = new Set(policy.admin ? PERMISSION_KEYS : policy.legacyGrants || policy.grants || []);
  for (const [section, level] of Object.entries(policy.legacyGrants || policy.grants ? {} : policy.sections || {})) {
    if (level === 'deny') continue;
    const keys = level === 'write' ? LEVEL_ACTIONS.write[section] || [] : LEVEL_ACTIONS.read[section] || [];
    for (const key of keys) grants.add(key);
  }
  for (const [key, rule] of Object.entries(policy.actionRules || {})) if (rule === 'allow') grants.add(key);
  // The old management rights keep exactly the operations they already owned.
  for (const section of ['users', 'access'])
    if (grants.has(section + '.manage'))
      for (const action of GROUP_ACTIONS[section])
        if (action !== 'read' && action !== 'permissions') grants.add(section + '.' + action);
  for (const [key, rule] of Object.entries(policy.actionRules || {})) if (rule === 'deny') grants.delete(key);
  return [...grants];
}
export function can(user, key, now = Date.now()) {
  if (key === 'vault.all') return false;
  if (user?.role === 'admin') return true;
  const policy = user?.permissions;
  if (!policy) return false;
  if (policy.expiresAt !== null && policy.expiresAt <= now) return false;
  if (policy.actionRules?.[key] === 'deny') return false;
  if (policy.actionRules?.[key] === 'allow') return true;
  if (Object.keys(policy.actionRules || {}).length || policy.legacyGrants || policy.grants) {
    const grants = grantsOf(policy);
    if (key.endsWith('.write')) {
      const section = key.slice(0, -6);
      return (
        grants.some(
          grant =>
            grant.startsWith(section + '.') && !['read', 'secrets', 'export', 'use'].includes(grant.split('.').at(-1))
        ) ||
        (!GROUP_ACTIONS[section]?.some(action => !['read', 'secrets', 'export', 'use'].includes(action)) &&
          (policy.admin || policy.sections?.[section] === 'write') &&
          grants.some(grant => grant.startsWith(section + '.')))
      );
    }
    return grants.includes(key) || (SECTION_IDS.includes(key) && grants.some(grant => grant.startsWith(key + '.')));
  }
  if (policy.admin) return true;
  const section = SECTION_IDS.find(id => key === id || key.startsWith(id + '.'));
  if (!section) return false;
  const level = policy.sections?.[section];
  if (level === 'write') return true;
  if (level !== 'read') return false;
  const readKeys = LEVEL_ACTIONS.read[section] || [];
  return key === section || key === section + '.read' || readKeys.includes(key);
}
export function canAgent(user, id, now = Date.now(), action = 'agents.read') {
  if (!can(user, 'agents.read', now) || !can(user, action, now)) return false;
  const policy = user?.permissions;
  if (user?.role === 'admin' || policy?.admin) return true;
  if (policy?.groupLevels === undefined && policy?.agents != null && !policy.agents.includes(id)) return false;
  const level =
    policy?.groupLevels !== undefined
      ? (policy.groupLevels[policy.agentGroups?.[id]] ?? 'deny')
      : (policy?.agentLevels?.[id] ?? 'write');
  if (level === 'deny') return false;
  // Per-machine levels only restrict existing section permissions.
  return (
    level === 'write' ||
    AGENT_SECTIONS.includes(action) ||
    AGENT_SECTIONS.some(section => [section + '.read', section + '.export'].includes(action))
  );
}
const LEVEL_ORDER = { deny: 0, read: 1, write: 2 };
export function recordSection(record, kind = 'items') {
  return kind === 'folders'
    ? record.section === 'vault'
      ? 'vault'
      : 'library'
    : record.type === 'vault'
      ? 'vault'
      : 'library';
}
export const vaultHomeId = id => 'vault-user-' + id;
export const isVaultHome = id => typeof id === 'string' && /^vault-user-[a-f0-9]{32}$/.test(id);
export function isInPersonalVault(user, record, kind, folders) {
  if (!user?.id) return false;
  const home = vaultHomeId(user.id);
  if (kind === 'folders' && record.id === home) return true;
  let id = kind === 'folders' ? record.parentId : record.folderId;
  const seen = new Set();
  while (id) {
    if (id === home) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    const folder = folders.find(row => row.id === id);
    if (!folder || recordSection(folder, 'folders') !== 'vault' || isVaultHome(id)) return false;
    id = folder.parentId;
  }
  return false;
}
export function recordLevel(user, record, kind, folders, now = Date.now()) {
  const section = recordSection(record, kind);
  if (section === 'vault' && user?.id && !isInPersonalVault(user, record, kind, folders)) return 'deny';
  if (!can(user, section + '.read', now)) return 'deny';
  const scope = user?.permissions?.scopes?.[section];
  let scoped = 'write';
  if (scope) {
    const rules = kind === 'items' ? scope.items : scope.folders;
    if (own(rules || {}, record.id)) scoped = rules[record.id];
    else {
      let id = kind === 'items' ? record.folderId : record.parentId;
      const seen = new Set();
      scoped = scope.mode === 'all' ? 'write' : 'deny';
      while (id) {
        if (seen.has(id)) return 'deny';
        seen.add(id);
        if (own(scope.folders || {}, id)) {
          scoped = scope.folders[id];
          break;
        }
        id = folders.find(row => row.id === id)?.parentId;
      }
    }
  }
  if (scoped === 'deny') return 'deny';
  if (user.permissions?.resourcePolicies) {
    const levels = user.permissions.resourcePolicies.map(policy =>
      recordLevel({ ...user, role: 'member', permissions: policy }, record, kind, folders, now)
    );
    scoped = levels.includes('write') ? 'write' : levels.includes('read') ? 'read' : 'deny';
    if (scoped === 'deny') return 'deny';
  }
  return scoped === 'write' && can(user, section + '.write', now) ? 'write' : 'read';
}
export function canRecord(user, record, kind, folders, action, now = Date.now()) {
  const section = recordSection(record, kind);
  if (!can(user, section + '.' + action, now)) return false;
  const level = recordLevel(user, record, kind, folders, now);
  if (level === 'deny' || (!['read', 'export', 'secrets'].includes(action) && level !== 'write')) return false;
  // Do not combine a scoped edit grant from one group with an unrestricted
  // create grant from another group to obtain unrestricted editing.
  return (
    !user.permissions?.resourcePolicies ||
    user.permissions.resourcePolicies.some(policy =>
      canRecord({ ...user, role: 'member', permissions: policy }, record, kind, folders, action, now)
    )
  );
}
export function requirePermission(user, key, fail, now) {
  if (!can(user, key, now))
    fail(403, 'Ton compte ne dispose pas du droit « ' + key + ' ».', { code: 'PERMISSION_DENIED' });
}
export function canManagePolicy(actor, target, now = Date.now()) {
  if (actor?.role === 'admin') return true;
  const ownPolicy = actor?.permissions;
  if (!ownPolicy) return false;
  if (
    ownPolicy.expiresAt !== null &&
    (ownPolicy.expiresAt <= now || target.expiresAt === null || target.expiresAt > ownPolicy.expiresAt)
  )
    return false;
  if (grantsOf(target).some(key => !can(actor, key, now))) return false;
  if (ownPolicy.admin) return !target.admin || PERMISSION_KEYS.every(key => can(actor, key, now));
  if (target.admin) return false;
  if (ownPolicy.groupLevels !== undefined) {
    if (target.groupLevels === undefined) return false;
    for (const [id, level] of Object.entries(target.groupLevels))
      if (LEVEL_ORDER[level] > LEVEL_ORDER[ownPolicy.groupLevels[id] ?? 'deny']) return false;
  }
  if (ownPolicy.agents != null && (target.agents == null || target.agents.some(id => !ownPolicy.agents.includes(id))))
    return false;
  const affected = new Set([...Object.keys(ownPolicy.agentLevels || {}), ...Object.keys(target.agentLevels || {})]);
  const targetUser = { role: 'member', permissions: target };
  for (const id of affected)
    for (const action of [
      ...PERMISSION_KEYS.filter(key => AGENT_SECTIONS.some(section => key.startsWith(section + '.'))),
      'tools.write'
    ]) {
      if (canAgent(targetUser, id, now, action) && !canAgent(actor, id, now, action)) return false;
    }
  const unrestricted = scope =>
    !scope ||
    (scope.mode === 'all' && !Object.keys(scope.folders || {}).length && !Object.keys(scope.items || {}).length);
  for (const key of grantsOf(target).filter(key => key.startsWith('library.') || key.startsWith('vault.'))) {
    const section = key.split('.')[0],
      sources = (ownPolicy.resourcePolicies || [ownPolicy]).filter(policy =>
        can({ role: 'member', permissions: policy }, key, now)
      );
    if (
      !sources.some(
        policy =>
          unrestricted(policy.scopes?.[section]) ||
          JSON.stringify(policy.scopes?.[section]) === JSON.stringify(target.scopes?.[section])
      )
    )
      return false;
  }
  for (const section of ownPolicy.legacyGrants || Object.keys(ownPolicy.actionRules || {}).length ? [] : SECTION_IDS) {
    // A manager may only hand out levels at or below his own for each section.
    if (LEVEL_ORDER[target.sections[section]] > LEVEL_ORDER[ownPolicy.sections[section]]) return false;
  }
  if (ownPolicy.expiresAt !== null && (target.expiresAt === null || target.expiresAt > ownPolicy.expiresAt))
    return false;
  return true;
}
