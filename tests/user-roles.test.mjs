import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../app/js/data/user-roles.js', import.meta.url), 'utf8') + '\nthis.api={USER_ROLES,roleGroupIds,detectUserRole,applyUserRole};', context);
const {detectUserRole} = context.api;
const roleGroupIds = (...a) => JSON.parse(JSON.stringify(context.api.roleGroupIds(...a)));
const applyUserRole = (...a) => JSON.parse(JSON.stringify(context.api.applyUserRole(...a)));
const sections = ['library', 'vault', 'users', 'access'];
const groups = [
  {id: 'admin', preset: true, presetKind: 'admin'},
  ...sections.flatMap(section => ['read', 'write'].map(level => ({id: section + '-' + level, preset: true, presetKind: 'section', section, level}))),
  ...['read', 'write'].map(level => ({id: 'fleet-' + level, preset: true, presetKind: 'fleet', fleetSection: 'ungrouped', level})),
  {id: 'act', preset: true, presetKind: 'action', action: 'library.create'},
  {id: 'custom', preset: false}
];

test('each role is the expected set of automatic groups', () => {
  assert.deepEqual(roleGroupIds('guest', groups), []);
  assert.deepEqual(roleGroupIds('admin', groups), ['admin']);
  assert.deepEqual(roleGroupIds('observer', groups).sort(), ['access-read', 'fleet-read', 'library-read', 'users-read', 'vault-read']);
  const editor = roleGroupIds('editor', groups);
  assert.ok(editor.includes('users-read') && !editor.includes('users-write'), 'editor keeps users read-only');
  assert.ok(editor.includes('library-write') && editor.includes('access-write') && editor.includes('fleet-write'));
});

test('a role is detected from the memberships, anything else is custom', () => {
  for (const role of ['guest', 'observer', 'editor', 'admin']) assert.equal(detectUserRole(roleGroupIds(role, groups), groups), role);
  assert.equal(detectUserRole([], groups), 'guest');
  assert.equal(detectUserRole(['library-write'], groups), 'custom');
  assert.equal(detectUserRole([...roleGroupIds('observer', groups), 'library-write'], groups), 'custom');
  assert.equal(detectUserRole([...roleGroupIds('editor', groups), 'custom', 'act'], groups), 'editor', 'custom and action groups do not change the role');
});

test('choosing a role replaces role groups and keeps custom and action groups', () => {
  const next = applyUserRole('admin', ['library-write', 'fleet-read', 'custom', 'act'], groups);
  assert.deepEqual(next.sort(), ['act', 'admin', 'custom']);
  assert.deepEqual(applyUserRole('guest', ['admin', 'custom'], groups), ['custom']);
});
