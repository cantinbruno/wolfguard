import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import vm from 'node:vm';

const source=await readFile(new URL('../app/js/ui/fleet-groups.js',import.meta.url),'utf8');
function fixture(extra={}){
  const cloud={enabled:true,isAdmin:()=>false,currentUser:()=>({id:'member'}),agentRequest:async()=>({initialized:true,canManage:true,revision:1,groups:[{id:'one',name:'Atelier'}],assignments:{}})};
  const context={window:{WolfGuardCloud:cloud},WolfGuardCloud:cloud,crypto:{randomUUID},structuredClone,setting:async(_key,fallback)=>fallback,setSetting:async()=>{},sessionStorage:{getItem:()=>null},...extra};
  if(extra.window?.WolfGuardCloud)context.WolfGuardCloud=context.window.WolfGuardCloud;
  vm.runInNewContext(source,context);return context;
}

test('malformed stored sections cannot inject prototype keys or assign unknown groups',()=>{
  const {window}=fixture();
  const value=window.WolfGuardFleetGroups.normalize(JSON.parse('{"groups":[{"id":"ok","name":"Atelier"},{"id":"__proto__","name":"Bad"}],"assignments":{"__proto__":"ok","agent":"missing","valid":"ok"},"collapsed":["missing","ok"]}'));
  assert.equal(value.groups.length,1);assert.equal(Object.keys(value.assignments).join(','),'valid');assert.equal(value.collapsed.join(','),'ok');
});

test('failed server writes retain the last confirmed shared grouping',async()=>{
  const {window}=fixture();
  const model=window.WolfGuardFleetGroups.create({read:async()=>null,request:async(path)=>{if(path)throw new Error('Offline');return {initialized:true,canManage:true,revision:1,groups:[{id:'one',name:'Atelier'}],assignments:{}};}});
  await model.load();await assert.rejects(model.assign(['agent'],'one'),/Offline/);assert.equal(model.groupOf('agent'),'ungrouped');
  await assert.rejects(model.rename('one','Renamed'),/Offline/);assert.equal(model.name('one'),'Atelier');
});

test('personal collapsed preferences stay isolated while memberships come from the server',async()=>{
  let id='reader-a';
  const storage=new Map([
    ['wolfguard-pref:reader-a:agents-custom-groups',JSON.stringify({groups:[{id:'one',name:'Old'}],collapsed:['one']})],
    ['wolfguard-pref:reader-b:agents-custom-groups',JSON.stringify({groups:[{id:'one',name:'Old'}],collapsed:[]})]
  ]);
  const {window}=fixture({window:{WolfGuardCloud:{enabled:true,isAdmin:()=>false,currentUser:()=>({id}),agentRequest:async()=>({initialized:true,canManage:false,revision:1,groups:[{id:'one',name:'Atelier'}],assignments:{}})}},sessionStorage:{getItem:key=>storage.get(key)||null}});
  const first=window.WolfGuardFleetGroups.create();await first.load();assert.equal(first.list()[0].name,'Atelier');
  assert.equal(first.closed('one'),true);
  id='reader-b';const second=window.WolfGuardFleetGroups.create();await second.load();assert.equal(second.list()[0].name,'Atelier');assert.equal(second.closed('one'),false);
  id='reader-c';const third=window.WolfGuardFleetGroups.create();await third.load();assert.equal(third.list().length,1);assert.equal(third.canManage(),false);
  await assert.rejects(third.assign(['agent'],'one'),/administrateurs/);
});
