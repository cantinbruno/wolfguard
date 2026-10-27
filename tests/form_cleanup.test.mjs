import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
for(const file of ['library-mail-cleanup.js','library-form-cleanup.js','library-organization.js'])vm.runInContext(readFileSync(new URL('../app/js/data/'+file,import.meta.url),'utf8'),context);
const form=snapshot=>JSON.parse(JSON.stringify(context.buildMemoFormCleanup(snapshot,'2026-10-28T12:00:00Z')));
function apply(source,operations){const next=structuredClone(source);for(const op of JSON.parse(JSON.stringify(operations))){const rows=next[op.store],field=op.store==='settings'?'key':'id',index=rows.findIndex(row=>row[field]===(op.record?.[field]||op.id));if(op.action==='delete'){if(index>=0)rows.splice(index,1);}else if(index>=0)rows[index]=op.record;else rows.push(op.record);}return next;}
function bundled(){const items=new Map(),folders=new Map();for(const file of ['technical-library.json','technical-library-extra.json','technical-library-network-cyber.json']){const data=JSON.parse(readFileSync(new URL('../app/data/'+file,import.meta.url),'utf8'));for(const row of data.items)items.set(row.id,row);for(const row of data.folders)folders.set(row.id,row);}return {items:[...items.values()],folders:[...folders.values()],settings:[],activity:[]};}

test('remove all 65 bundled worksheets including the exact Spanning Tree example, retain the 740 reference documents',()=>{
  const source=bundled(),before=JSON.stringify(source),plan=form(source),clean=apply(source,plan.operations);
  assert.equal(JSON.stringify(source),before);assert.equal(plan.summary.removedItems,65);
  assert.ok(!clean.items.some(row=>row.id==='tech-netsec-v3-report-stp-guard'));
  const removed=source.items.filter(row=>!clean.items.some(item=>item.id===row.id));assert.ok(removed.every(row=>['report','template'].includes(row.type)));
  for(const item of clean.items)assert.deepEqual(item,source.items.find(row=>row.id===item.id));
  const mailPlan=context.buildMemoMailCleanup(clean),afterMail=apply(clean,mailPlan.operations),after=apply(afterMail,context.buildMemoFolderOrganization(afterMail).operations);
  assert.equal(after.items.length,740);assert.equal(after.items.filter(row=>row.type==='command').length,480);assert.equal(after.items.filter(row=>row.type==='procedure').length,195);
  const folders=new Map(after.folders.filter(row=>!row.deletedAt).map(row=>[row.id,row]));for(const item of after.items)assert.ok(!item.folderId||folders.has(item.folderId),item.id);
  assert.ok(![...folders.values()].some(row=>/^(09|10)\s*·/.test(row.name)));assert.deepEqual(form(after).operations,[]);
});

test('already organized and unified workspaces receive the new cleanup without resetting their folder choices',()=>{
  const raw=bundled(),organized=apply(raw,context.buildMemoFolderOrganization(raw).operations);
  const unified={...organized,settings:[...organized.settings,{key:'memo-mail-cleanup-version',value:1}],items:organized.items.map(row=>({...row,originalType:row.type,type:'memo'}))};
  const result=form(unified);assert.equal(result.summary.removedItems,65);
  const after=apply(unified,result.operations);assert.ok(!after.items.some(row=>row.id==='tech-netsec-v3-report-stp-guard'));
  for(const folder of after.folders.filter(row=>!row.deletedAt))assert.deepEqual(folder,unified.folders.find(row=>row.id===folder.id));
  after.items.push({id:'future',type:'template',content:'{SITE} {PORT} {VLAN}'});assert.deepEqual(form(after).operations,[]);
});

test('form detection protects commands, completed reports, references and non-library data; dangling links are removed',()=>{
  const source={settings:[],folders:[{id:'tech-folder-parent',section:'library',parentId:null,name:'Formulaires'},{id:'wg-memo-folder-empty',section:'library',parentId:'tech-folder-parent',name:'STP'},{id:'user-empty',section:'library',parentId:null,name:'Mes notes'},{id:'tech-folder-trash',section:'library',parentId:null,name:'Corbeille'}],activity:[{id:'form-event',itemId:'stp'},{id:'keep-event',itemId:'powershell'}],items:[
    {id:'stp',type:'memo',originalType:'report',folderId:'wg-memo-folder-empty',content:'<p>Compléter les champs avec les observations vérifiées.</p><li>{EQUIPEMENT} / {PORT} / {VLAN}</li>'},
    {id:'generic',type:'memo',content:'<p>Renseigner les champs :</p><p>[SITE] [VLAN] [CONTACT]</p>'},
    {id:'encoded',type:'template',content:'&#123;SITE&#125; &lbrace;VLAN&rbrace; &#x5b;CONTACT&#x5d;'},
    {id:'powershell',type:'command',content:'<pre>[System.String]::Format("{SITE} {VLAN} {CONTACT}")</pre>',linkedItemIds:['stp','completed']},
    {id:'inline-command',type:'template',content:'{SITE} {VLAN} {CONTACT}<code>show spanning-tree</code>'},
    {id:'blocks',type:'memo',originalType:'report',content:'{SITE} {VLAN} {CONTACT}',commandBlocks:[{code:'show spanning-tree'}]},
    {id:'procedure',type:'procedure',content:'<p>Configurer {SITE} / {VLAN} / {CONTACT}.</p>'},
    {id:'completed',type:'report',content:'<p>Le VLAN 20 utilise le port Gi1/0/1. Racine SW01 ; aucune incohérence.</p>'},
    {id:'references',type:'report',content:'[RFC 8446] [RFC 4253] [CVE-2024-0001]'},
    {id:'private',type:'memo',content:'<p>Explication de {SITE}, {VLAN} et {CONTACT}.</p>'},
    {id:'trash',type:'memo',folderId:'tech-folder-trash',deletedAt:'2026-10-01',content:'Note à restaurer'},
    {id:'vault',type:'vault',content:'Compléter les champs {SITE} {VLAN} {CONTACT}',vaultBlobEnc:'ciphertext'},
    {id:'task',type:'task',content:'Compléter les champs {SITE} {VLAN} {CONTACT}'}
  ]};
  const before=JSON.stringify(source),plan=form(source),after=apply(source,plan.operations);
  assert.equal(JSON.stringify(source),before);assert.equal(plan.summary.removedItems,3);assert.equal(plan.summary.updatedLinks,1);assert.equal(plan.summary.removedActivity,1);assert.equal(plan.summary.emptyFolders,2);
  assert.deepEqual(after.items.map(row=>row.id),source.items.slice(3).map(row=>row.id));assert.deepEqual(after.items[0].linkedItemIds,['completed']);assert.deepEqual(after.activity,[{id:'keep-event',itemId:'powershell'}]);
  for(const id of ['user-empty','tech-folder-trash'])assert.deepEqual(after.folders.find(row=>row.id===id),source.folders.find(row=>row.id===id));
});
