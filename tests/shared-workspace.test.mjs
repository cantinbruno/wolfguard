import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeWorkspace,sameValue} from '../browser/shared-workspace.js';

const snapshot=()=>({version:2,items:[{id:'one',type:'memo',title:'First',content:'<p>Original</p>',folderId:'folder',viewCount:1},{id:'two',type:'memo',title:'Second',content:'Other'}],folders:[{id:'folder',name:'Shared',section:'library',parentId:null}],settings:[],activity:[]});
const conflicts=callback=>assert.throws(callback,{code:'SHARED_CONFLICT'});

test('independent records, additions, activity and settings survive a three-person merge',()=>{
  const base=snapshot(),local=structuredClone(base),remote=structuredClone(base);
  local.items[0].title='Local title';local.items.push({id:'new-local',type:'memo',title:'Local addition'});
  local.activity.push({id:'local-activity',itemId:'one'});local.settings.push({key:'local-setting',value:1});
  remote.items[1].title='Remote title';remote.items.push({id:'new-remote',type:'memo',title:'Remote addition'});
  remote.activity.push({id:'remote-activity',itemId:'two'});remote.settings.push({key:'remote-setting',value:2});
  const untouched=structuredClone([base,local,remote]);
  const merged=mergeWorkspace(base,local,remote);
  assert.equal(merged.items.find(row=>row.id==='one').title,'Local title');
  assert.equal(merged.items.find(row=>row.id==='two').title,'Remote title');
  assert.equal(merged.items.length,4);assert.equal(merged.activity.length,2);assert.equal(merged.settings.length,2);
  const third=structuredClone(base);third.items[0].content='Third person';
  assert.equal(mergeWorkspace(base,third,merged).items.find(row=>row.id==='one').content,'Third person');
  assert.deepEqual([base,local,remote],untouched);
});

test('different fields of a record merge, including view statistics and timestamps',()=>{
  const base=snapshot(),local=structuredClone(base),remote=structuredClone(base);
  local.items[0].title='Renamed';local.items[0].viewCount=2;local.items[0].updatedAt='2026-11-05T10:00:00Z';
  remote.items[0].content='New content';remote.items[0].viewCount=4;remote.items[0].updatedAt='2026-11-05T11:00:00Z';
  const item=mergeWorkspace(base,local,remote).items[0];
  assert.equal(item.title,'Renamed');assert.equal(item.content,'New content');assert.equal(item.viewCount,5);assert.equal(item.updatedAt,remote.items[0].updatedAt);
});

test('rich text, arrays and encrypted values never silently overwrite concurrent edits',()=>{
  for(const field of ['title','content','vaultBlobEnc','tags']){
    const base=snapshot(),local=structuredClone(base),remote=structuredClone(base);
    local.items[0][field]=field==='tags'?['local']:'Local';remote.items[0][field]=field==='tags'?['remote']:'Remote';
    conflicts(()=>mergeWorkspace(base,local,remote));
  }
});

test('hard and soft deletion conflict with concurrent changes and never resurrect a deleted record',()=>{
  for(const soft of [false,true]){
    const base=snapshot(),local=structuredClone(base),remote=structuredClone(base);
    if(soft)local.items[0].deletedAt='2026-11-05T12:00:00Z';else local.items.shift();
    remote.items[0].content='Remote edit';conflicts(()=>mergeWorkspace(base,local,remote));
    conflicts(()=>mergeWorkspace(base,remote,local));
  }
  const base=snapshot(),local=structuredClone(base);local.items.shift();
  assert.equal(mergeWorkspace(base,local,base).items.some(row=>row.id==='one'),false);
  assert.equal(mergeWorkspace(base,local,local).items.length,1);
});

test('folder deletion cannot hide a concurrently created item or child folder',()=>{
  for(const child of ['item','folder']){
    const base=snapshot(),local=structuredClone(base),remote=structuredClone(base);
    local.folders=[];local.items.shift();
    if(child==='item')remote.items.push({id:'new',type:'memo',title:'New',folderId:'folder'});
    else remote.folders.push({id:'child',name:'New',section:'library',parentId:'folder'});
    conflicts(()=>mergeWorkspace(base,local,remote));
  }
});

test('property order does not create conflicts and identical edits converge',()=>{
  assert.equal(sameValue({id:1,title:'One'},{title:'One',id:1}),true);
  const base=snapshot(),local=structuredClone(base);local.items[0].title='Same';
  assert.deepEqual(mergeWorkspace(base,local,structuredClone(local)),local);
});
