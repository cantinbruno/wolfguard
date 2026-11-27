import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({structuredClone, JSON, Array, String, Object, Error, Date});
vm.runInContext(readFileSync(new URL('../app/js/data/memo-history.js', import.meta.url), 'utf8') + '\nthis.add=withMemoHistory;this.restore=restoreMemoVersion;', context);
const plain = value => JSON.parse(JSON.stringify(value));
const base = {id: 'm1', type: 'memo', title: 'Procédure', content: '<p>v1</p>', commandBlocks: [], createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z'};

test('each change keeps the previous version, newest first, without touching unchanged saves', () => {
  let item = base;
  for (let i = 2; i <= 4; i++) item = plain(context.add(item, {...item, content: '<p>v' + i + '</p>', updatedAt: '2026-11-0' + i + 'T00:00:00Z'}, '2026-11-0' + i + 'T00:00:00Z'));
  assert.equal(item.content, '<p>v4</p>');
  assert.deepEqual(item.history.map(entry => entry.content), ['<p>v3</p>', '<p>v2</p>', '<p>v1</p>']);
  assert.equal(item.history[0].at, '2026-11-03T00:00:00Z', 'a version carries the date it was saved');
  const same = plain(context.add(item, {...item, favorite: true}, '2026-11-05T00:00:00Z'));
  assert.equal(same.history.length, 3, 'saving without changing the text adds no version');
});

test('history is bounded in count, entry size and total size', () => {
  let item = base;
  for (let i = 0; i < 15; i++) item = plain(context.add(item, {...item, content: '<p>' + i + '</p>'}, 'x'));
  assert.equal(item.history.length, 10);
  const huge = {...base, content: 'x'.repeat(250000)};
  assert.equal(plain(context.add(huge, {...huge, content: 'small'}, 'x')).history.length, 0, 'a version larger than 200 000 characters is not kept');
  let big = {...base, content: 'a'.repeat(150000)};
  for (let i = 0; i < 6; i++) big = plain(context.add(big, {...big, content: String(i).repeat(150000)}, 'x'));
  assert.ok(JSON.stringify(big.history).length <= 600000);
  assert.ok(big.history.length >= 3);
  assert.equal(plain(context.add({...base, history: [{bad: true}, null]}, {...base, content: 'n'}, 'x')).history.length, 1, 'malformed entries are dropped');
});

test('restoring a version makes it current and keeps the replaced text in history', () => {
  let item = base;
  item = plain(context.add(item, {...item, title: 'Procédure révisée', content: '<p>v2</p>', updatedAt: '2026-11-02T00:00:00Z'}, '2026-11-02T00:00:00Z'));
  item = plain(context.add(item, {...item, content: '<p>v3</p>', updatedAt: '2026-11-03T00:00:00Z'}, '2026-11-03T00:00:00Z'));
  const restored = plain(context.restore(item, 1, '2026-11-04T00:00:00Z'));
  assert.equal(restored.content, '<p>v1</p>');
  assert.equal(restored.title, 'Procédure');
  assert.equal(restored.updatedAt, '2026-11-04T00:00:00Z');
  assert.deepEqual(restored.history.map(entry => entry.content), ['<p>v3</p>', '<p>v2</p>'], 'the restored version is not listed twice');
  assert.throws(() => context.restore(item, 9), /n’existe plus/);
});
