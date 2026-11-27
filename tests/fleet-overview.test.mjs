import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({esc: value => String(value)});
vm.runInContext(readFileSync(new URL('../app/js/ui/fleet-overview.js', import.meta.url), 'utf8') + '\nthis.summarize=fleetOverview.summarize;', context);
const summarize = (...args) => JSON.parse(JSON.stringify(context.summarize(...args)));

test('the fleet summary counts connection, protection, alerts, blocks and outdated agents', () => {
  const agents = [
    {id: 'a', name: 'Bureau', online: true, version: 'v2'},
    {id: 'b', name: 'Atelier', online: false, version: 'v1'},
    {id: 'c', name: 'Accueil', online: true, version: 'v2'},
    {id: 'd', name: 'Nouveau', online: true}
  ];
  const endpoints = [
    {id: 'a', health: 'protected', alerts: 0, blocks: 3},
    {id: 'b', health: 'attention', alerts: 2, blocks: 1},
    {id: 'c', health: 'bogus', alerts: '1'}
  ];
  const summary = summarize(agents, endpoints, {version: 'v2'});
  assert.deepEqual({total: summary.total, online: summary.online, offline: summary.offline, protected: summary.protected, attention: summary.attention, unknown: summary.unknown, alerts: summary.alerts, blocks: summary.blocks, outdated: summary.outdated},
    {total: 4, online: 3, offline: 1, protected: 1, attention: 1, unknown: 2, alerts: 3, blocks: 4, outdated: 1});
  assert.deepEqual(summary.attentionRows.map(row => row.id), ['b', 'c'], 'the riskiest workstations come first; healthy ones are not listed');
  assert.deepEqual(summary.attentionRows[0].reasons, ['Hors ligne', 'Protection à vérifier', '2 alertes non acquittées', 'Agent à mettre à jour']);
  assert.equal(summary.rows.find(row => row.id === 'c').health, 'unknown', 'an unexpected health value is shown as unknown');
  assert.equal(summary.rows.find(row => row.id === 'd').outdated, false, 'an agent without a reported version is not called outdated');
});

test('an empty or unknown fleet gives zero counts and no rows', () => {
  const summary = summarize([], [], null);
  assert.equal(summary.total, 0);
  assert.equal(summary.attentionRows.length, 0);
});
