'use strict';

// Simple roles on top of the access groups. A role is only a ready-made set of the automatic
// groups (administrator, section and fleet-section groups): choosing one ticks exactly those
// groups, so the server model, the audit journal and the "Personnaliser" list stay unchanged.
// Custom groups and single-action groups are never touched by a role change.
const USER_ROLES = [
  { id: 'guest', name: 'Invité', description: 'Aucune section visible. Rôle des nouveaux comptes.' },
  { id: 'observer', name: 'Observateur', description: 'Consulte toutes les sections, ne modifie rien.' },
  { id: 'editor', name: 'Éditeur', description: 'Modifie tout, sauf la gestion des utilisateurs et des droits (lecture seule).' },
  { id: 'admin', name: 'Administrateur', description: 'Accès complet, y compris utilisateurs, droits et connexions.' }
];
const USER_ROLE_READ_ONLY_FOR_EDITOR = ['users'];

function isRoleManagedGroup(group) {
  return !!group.preset && ['admin', 'section', 'fleet'].includes(group.presetKind);
}

// Ids of the role-managed groups that make up a role.
function roleGroupIds(roleId, groups) {
  const ids = [];
  for (const group of groups) {
    if (!isRoleManagedGroup(group)) continue;
    if (roleId === 'admin') { if (group.presetKind === 'admin') ids.push(group.id); continue; }
    if (group.presetKind === 'admin' || roleId === 'guest') continue;
    if (roleId === 'observer') { if (group.level === 'read') ids.push(group.id); continue; }
    if (roleId === 'editor') {
      const readOnly = group.presetKind === 'section' && USER_ROLE_READ_ONLY_FOR_EDITOR.includes(group.section);
      if (group.level === (readOnly ? 'read' : 'write')) ids.push(group.id);
    }
  }
  return ids;
}

// The role matching a set of direct memberships, or 'custom' when it matches none.
function detectUserRole(memberIds, groups) {
  const own = new Set(memberIds), managed = groups.filter(isRoleManagedGroup).filter(group => own.has(group.id)).map(group => group.id).sort();
  for (const role of USER_ROLES) {
    const expected = roleGroupIds(role.id, groups).sort();
    if (expected.length === managed.length && expected.every((id, index) => id === managed[index])) return role.id;
  }
  return 'custom';
}

// Memberships after choosing a role: custom and single-action groups stay, role groups are replaced.
function applyUserRole(roleId, memberIds, groups) {
  const managed = new Set(groups.filter(isRoleManagedGroup).map(group => group.id));
  return [...memberIds.filter(id => !managed.has(id)), ...roleGroupIds(roleId, groups)];
}
