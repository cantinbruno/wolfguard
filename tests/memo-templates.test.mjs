import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({libraryFacets: () => ['memo', 'command', 'template', 'reference']});
vm.runInContext(readFileSync(new URL('../app/js/data/memo-templates.js', import.meta.url), 'utf8') + '\nthis.build=buildMemoTemplates;this.templates=MEMO_TEMPLATES;', context);
const plan = snapshot => JSON.parse(JSON.stringify(context.build(snapshot, '2026-11-27T10:00:00Z')));
const empty = () => ({items: [], folders: [], settings: [], activity: []});
function apply(source, operations) {
  const result = structuredClone(source);
  for (const op of operations) {
    const key = op.store === 'settings' ? 'key' : 'id', rows = result[op.store], index = rows.findIndex(row => row[key] === op.record[key]);
    if (index < 0) rows.push(op.record); else rows[index] = op.record;
  }
  return result;
}

test('six memo templates fill a "Modèles" folder once, as ordinary memos with a template tag', () => {
  const source = empty(), before = JSON.stringify(source), result = apply(source, plan(source).operations);
  assert.equal(JSON.stringify(source), before, 'the input snapshot is not modified');
  assert.equal(result.folders.length, 1);
  assert.deepEqual({name: result.folders[0].name, section: result.folders[0].section, parentId: result.folders[0].parentId}, {name: 'Modèles', section: 'library', parentId: null});
  assert.equal(result.items.length, 6);
  assert.equal(new Set(result.items.map(item => item.id)).size, 6);
  for (const item of result.items) {
    assert.equal(item.folderId, result.folders[0].id);
    assert.equal(item.type, 'memo');
    assert.ok(item.tags.includes('Modèle') && item.memoTemplateId && item.memoTemplateTitle);
    assert.match(item.content, /<h2>/);
    assert.ok(!/<script|onerror|javascript:/i.test(item.content));
  }
  assert.equal(result.settings.find(row => row.key === 'memo-templates-version').value, 1);
  assert.equal(plan(result).operations.length, 0, 'a second run adds nothing');
});

test('deleted or edited templates and a deleted folder are never restored or overwritten', () => {
  const first = apply(empty(), plan(empty()).operations);
  // The user removes one template, edits another and restores the marker as missing (older snapshot).
  const edited = structuredClone(first);
  edited.items = edited.items.filter(item => item.memoTemplateId !== 'incident');
  edited.items.find(item => item.memoTemplateId === 'procedure').content = '<p>Ma version</p>';
  edited.items.push({id: 'memo-template-incident-removed', memoTemplateId: 'incident', deletedAt: '2026-11-27T00:00:00Z', title: 'x'});
  edited.settings = [];
  const again = apply(edited, plan(edited).operations);
  assert.equal(again.items.filter(item => item.memoTemplateId === 'incident' && !item.deletedAt).length, 0, 'a removed template stays removed');
  assert.equal(again.items.find(item => item.memoTemplateId === 'procedure').content, '<p>Ma version</p>');
  assert.equal(again.items.length, edited.items.length);
  // The folder was deleted: nothing comes back, but the marker is written so the check stops running.
  const noFolder = {items: [], folders: [{id: 'memo-templates', name: 'Modèles', section: 'library', parentId: null, deletedAt: '2026-11-27T00:00:00Z'}], settings: [], activity: []};
  const operations = plan(noFolder).operations;
  assert.deepEqual(operations.map(op => op.store), ['settings']);
});

test('template titles map to a copy title and cover the usual documentation needs', () => {
  const ids = vm.runInContext('MEMO_TEMPLATES.map(t=>t.id)', context);
  assert.deepEqual(JSON.parse(JSON.stringify(ids)), ['procedure', 'incident', 'poste', 'reunion', 'equipement', 'changement']);
  for (const template of context.templates) assert.ok(template.copyTitle && !template.copyTitle.startsWith('Modèle'));
});
