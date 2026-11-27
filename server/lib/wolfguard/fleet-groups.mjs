import { seal, open } from './access.mjs';
import { normalizePolicy, profilePolicy, can } from './permissions.mjs';
import { reconcileFleetAccessGroups } from './access-groups.mjs';
import { revokeUserSessions } from './users.mjs';

export const validGroup = id =>
  typeof id === 'string' &&
  /^[A-Za-z0-9_-]{1,100}$/.test(id) &&
  !['__proto__', 'constructor', 'prototype'].includes(id);
const admin = (user, now) =>
  user?.role === 'admin' || !!(user?.permissions?.admin && can(user, 'users.permissions', now));
const stateCache = Symbol('fleet-state'),
  agentsCache = Symbol('fleet-agent-ids');
export async function fleetState(env) {
  return (env[stateCache] ??= loadState(env));
}
async function loadState(env) {
  const row = await env.DB.prepare(
    'SELECT f.* FROM fleet_groups f JOIN vault v ON v.id=1 AND v.generation=f.generation WHERE f.id=1'
  ).first();
  return row ? { ...(await open(row.config_cipher, 'WolfGuard fleet groups v1', env)), revision: row.revision } : null;
}
export async function applyFleetPolicy(policy, row, env) {
  const state = await fleetState(env);
  if (!state) return policy;
  const existing = new Set(state.groups.map(group => group.id));
  const levels = Object.fromEntries(
    Object.entries(policy.groupLevels ?? state.grants[row.id] ?? {}).filter(([id]) => existing.has(id))
  );
  const rows = await (env[agentsCache] ??= env.DB.prepare(
    'SELECT id FROM scan_agents WHERE revoked_at IS NULL AND generation=(SELECT generation FROM vault WHERE id=1)'
  ).all());
  const assignments = Object.fromEntries(
    rows.results
      .map(agent => [agent.id, state.assignments[agent.id] || 'ungrouped'])
      .filter(([, group]) => (levels[group] ?? 'deny') !== 'deny')
  );
  return { ...policy, agents: null, agentLevels: undefined, groupLevels: levels, agentGroups: assignments };
}
export function migrateFleet(legacy, agents, users) {
  const groups = [{ id: 'ungrouped', name: 'Sans groupe' }],
    assignments = {},
    grants = {};
  const members = users.filter(user => user.role !== 'admin' && !user.policy.admin);
  for (const user of members) grants[user.id] = {};
  const defaults = members.map(user => (user.policy.agents === null ? 'write' : 'deny'));
  const level = (user, agent) =>
    agent.restricted
      ? 'deny'
      : user.policy.agents !== null && !user.policy.agents.includes(agent.id)
        ? 'deny'
        : (user.policy.agentLevels?.[agent.id] ?? 'write');
  const names = new Map([['ungrouped', 'Sans groupe']]);
  for (const group of legacy?.groups || [])
    if (
      validGroup(group.id) &&
      group.id !== 'ungrouped' &&
      typeof group.name === 'string' &&
      group.name.trim() &&
      names.size < 51
    )
      names.set(group.id, group.name.trim().slice(0, 60));
  const variants = new Map();
  function add(id, name, vector) {
    if (!groups.some(group => group.id === id)) groups.push({ id, name });
    members.forEach((user, index) => {
      grants[user.id][id] = vector[index];
    });
  }
  add('ungrouped', 'Sans groupe', defaults);
  variants.set('ungrouped:' + JSON.stringify(defaults), 'ungrouped');
  for (const agent of agents) {
    const base = names.has(legacy?.assignments?.[agent.id]) ? legacy.assignments[agent.id] : 'ungrouped',
      vector = members.map(user => level(user, agent)),
      key = base + ':' + JSON.stringify(vector);
    let id = variants.get(key);
    if (!id) {
      const used = [...variants.keys()].filter(value => value.startsWith(base + ':')).length;
      id = base !== 'ungrouped' && !used ? base : 'group-' + crypto.randomUUID();
      add(id, names.get(base) + (used ? ' · accès conservés ' + (used + 1) : ''), vector);
      variants.set(key, id);
    }
    assignments[agent.id] = id;
  }
  for (const [id, name] of names)
    if (!groups.some(group => group.id === id))
      add(
        id,
        name,
        members.map(() => 'deny')
      );
  return { groups, assignments, grants };
}
export async function fleetGroupAPI(request, env, now, session, h) {
  const { fail, json, body } = h,
    path = new URL(request.url).pathname;
  let state = await fleetState(env);
  const manage = admin(session.user, now);
  const snapshot = async () => {
    if (!state) return { initialized: false, revision: 0, canManage: manage, groups: [], assignments: {} };
    const allowed = new Set(
      state.groups
        .filter(
          group =>
            manage ||
            (can(session.user, 'agents.read', now) &&
              (session.user.permissions?.groupLevels?.[group.id] ?? 'deny') !== 'deny')
        )
        .map(group => group.id)
    );
    const active = (
      await env.DB.prepare('SELECT id FROM scan_agents WHERE generation=? AND revoked_at IS NULL')
        .bind(session.generation)
        .all()
    ).results;
    return {
      initialized: true,
      revision: state.revision,
      canManage: manage,
      groups: state.groups.filter(group => allowed.has(group.id)),
      assignments: Object.fromEntries(
        active
          .map(agent => [agent.id, state.assignments[agent.id] || 'ungrouped'])
          .filter(([, group]) => allowed.has(group))
      )
    };
  };
  if (request.method === 'GET' && path === '/api/agents/groups') return json(await snapshot());
  if (request.method !== 'POST') fail(404, 'Action de groupe inconnue.');
  if (!manage) fail(403, 'La gestion des groupes et de leurs membres est réservée aux administrateurs.');
  const data = await body(128000),
    operation = path.slice('/api/agents/groups/'.length);
  if (operation === 'bootstrap') {
    if (state) return json(await snapshot());
    if (session.user.role !== 'admin') fail(403, 'Le propriétaire doit initialiser les groupes.');
    const users = (
      await env.DB.prepare('SELECT id,role,permissions_cipher,permission_revision FROM users ORDER BY id').all()
    ).results;
    for (const user of users)
      user.policy = user.permissions_cipher
        ? normalizePolicy(await open(user.permissions_cipher, 'WolfGuard permissions v1:' + user.id, env))
        : profilePolicy('legacy');
    const agents = (
      await env.DB.prepare(
        'SELECT id,restricted FROM scan_agents WHERE generation=? AND revoked_at IS NULL ORDER BY id'
      )
        .bind(session.generation)
        .all()
    ).results;
    if (data.legacy?.groups !== undefined && !Array.isArray(data.legacy.groups)) fail(400, 'Groupes invalides.');
    const next = migrateFleet(data.legacy, agents, users);
    // The whole encrypted configuration activates atomically. A concurrent rights
    // edit invalidates the snapshot instead of silently replacing newer access.
    const signature = users.map(user => user.id + ':' + user.permission_revision).join(',');
    const agentSignature = agents.map(agent => agent.id + ':' + agent.restricted).join(',');
    const inserted = await env.DB.prepare(
      "INSERT INTO fleet_groups(id,generation,revision,config_cipher,updated_at) SELECT 1,?,1,?,? WHERE NOT EXISTS(SELECT 1 FROM fleet_groups WHERE id=1 AND generation=?) AND COALESCE((SELECT GROUP_CONCAT(signature,',') FROM (SELECT id||':'||permission_revision AS signature FROM users ORDER BY id)),'')=? AND COALESCE((SELECT GROUP_CONCAT(signature,',') FROM (SELECT id||':'||restricted AS signature FROM scan_agents WHERE generation=? AND revoked_at IS NULL ORDER BY id)),'')=? ON CONFLICT(id) DO UPDATE SET generation=excluded.generation,revision=1,config_cipher=excluded.config_cipher,updated_at=excluded.updated_at WHERE fleet_groups.generation<>excluded.generation"
    )
      .bind(
        session.generation,
        await seal(next, 'WolfGuard fleet groups v1', env),
        now,
        session.generation,
        signature,
        session.generation,
        agentSignature
      )
      .run();
    if (!inserted.meta?.changes) fail(409, 'Les droits ont changé pendant la migration. Recharge les groupes.');
    delete env[stateCache];
    state = { ...next, revision: 1 };
    for (const id of await reconcileFleetAccessGroups(env, state, now)) await revokeUserSessions(env, id, now);
    return json(await snapshot());
  }
  if (!state) fail(409, 'Le propriétaire doit initialiser les groupes.');
  if (data.revision !== state.revision) fail(409, 'Les groupes ont changé. Recharge avant de réessayer.');
  const next = structuredClone(state),
    group = next.groups.find(group => group.id === data.id);
  const name = () => {
    const value = typeof data.name === 'string' ? data.name.trim() : '';
    if (!value || value.length > 60) fail(400, 'Nom de groupe invalide.');
    if (
      next.groups.some(
        group =>
          (operation !== 'rename' || group.id !== data.id) &&
          group.name.toLocaleLowerCase() === value.toLocaleLowerCase()
      )
    )
      fail(409, 'Ce nom existe déjà.');
    return value;
  };
  if (operation === 'create' || operation === 'duplicate') {
    if (next.groups.length >= 250) fail(409, 'Maximum 250 groupes.');
    if (operation === 'duplicate' && !group) fail(404, 'Groupe introuvable.');
    const id = 'group-' + crypto.randomUUID();
    next.groups.push({ id, name: name() });
    // A duplicated group starts without members or grants: access is explicit.
    data.target = id;
  } else if (operation === 'rename') {
    if (!group || group.id === 'ungrouped') fail(400, 'Groupe invalide.');
    group.name = name();
  } else if (operation === 'color') {
    if (!group || group.id === 'ungrouped') fail(400, 'Section invalide.');
    if (data.color !== null && !/^#[a-f0-9]{6}$/i.test(data.color || '')) fail(400, 'Couleur invalide.');
    if (data.color === null) delete group.color;
    else group.color = data.color.toLowerCase();
  } else if (operation === 'remove') {
    if (!group || group.id === 'ungrouped') fail(400, 'Groupe invalide.');
    next.groups = next.groups.filter(row => row.id !== group.id);
    for (const [id, value] of Object.entries(next.assignments))
      if (value === group.id) next.assignments[id] = 'ungrouped';
    for (const grants of Object.values(next.grants)) delete grants[group.id];
  } else if (operation !== 'move') fail(404, 'Action de groupe inconnue.');
  if (operation === 'move' || (operation === 'create' && data.ids?.length)) {
    const target = data.target;
    if (!next.groups.some(group => group.id === target)) fail(400, 'Groupe de destination invalide.');
    if (
      !Array.isArray(data.ids) ||
      !data.ids.length ||
      data.ids.length > 200 ||
      data.ids.some(id => typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id))
    )
      fail(400, 'Sélection de postes invalide.');
    const active = new Set(
      (
        await env.DB.prepare('SELECT id FROM scan_agents WHERE generation=? AND revoked_at IS NULL')
          .bind(session.generation)
          .all()
      ).results.map(row => row.id)
    );
    if (data.ids.some(id => !active.has(id))) fail(409, 'Un poste de la sélection a été retiré.');
    for (const id of data.ids) next.assignments[id] = target;
  }
  const auditId = h.random(16),
    details = {
      kind: 'fleet-group',
      actorId: session.user.id,
      actor: session.user.username,
      user: 'Groupes des postes',
      revision: state.revision + 1,
      operation,
      name: operation === 'create' ? next.groups.at(-1).name : group?.name || '',
      count: data.ids?.length || 0
    };
  const changed = await env.DB.batch([
    env.DB.prepare(
      'UPDATE fleet_groups SET config_cipher=?,revision=revision+1,updated_at=? WHERE id=1 AND generation=? AND revision=? AND EXISTS(SELECT 1 FROM sessions WHERE token_hash=?)'
    ).bind(await seal(next, 'WolfGuard fleet groups v1', env), now, session.generation, state.revision, session.hash),
    env.DB.prepare('INSERT INTO permission_audit(id,created_at,details_cipher) SELECT ?,?,? WHERE changes()=1').bind(
      auditId,
      now,
      await seal(details, 'WolfGuard permissions audit v1:' + auditId, env)
    )
  ]);
  if (!changed[0]?.meta?.changes) fail(409, 'Les groupes ont changé. Recharge avant de réessayer.');
  delete env[stateCache];
  state = { ...next, revision: state.revision + 1 };
  for (const id of await reconcileFleetAccessGroups(env, state, now)) await revokeUserSessions(env, id, now);
  return json(await snapshot());
}
