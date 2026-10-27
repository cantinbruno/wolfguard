import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../app/js/data/library-organization.js',import.meta.url),'utf8'),context);
const plan=snapshot=>JSON.parse(JSON.stringify(context.buildMemoFolderOrganization(snapshot,'2026-10-27T12:00:00.000Z')));
function apply(snapshot,operations){
  const next=structuredClone(snapshot);
  for(const operation of operations){const field=operation.store==='settings'?'key':'id',rows=next[operation.store],index=rows.findIndex(row=>row[field]===operation.record[field]);if(index<0)rows.push(operation.record);else rows[index]=operation.record;}
  return next;
}
function bundled(){
  const items=new Map(),folders=new Map();
  for(const file of ['technical-library.json','technical-library-extra.json','technical-library-network-cyber.json']){
    const data=JSON.parse(readFileSync(new URL('../app/data/'+file,import.meta.url),'utf8'));
    for(const item of data.items)items.set(item.id,item);for(const folder of data.folders)folders.set(folder.id,folder);
  }
  return {items:[...items.values()],folders:[...folders.values()],settings:[],activity:[]};
}
function pathOf(folder,folders){
  const names=[],seen=new Set();
  while(folder){assert.ok(!seen.has(folder.id),'folder cycle');seen.add(folder.id);names.unshift(folder.name);folder=folders.get(folder.parentId);}
  return names.join(' / ');
}
test('811 provided documents keep all content, attachments, IDs and links under one thematic hierarchy',()=>{
  const original=bundled(),before=JSON.stringify(original),result=plan(original),after=apply(original,result.operations);
  assert.equal(JSON.stringify(original),before,'planning must not mutate the input');
  assert.equal(after.items.length,811);
  for(const item of after.items){const old=original.items.find(row=>row.id===item.id);assert.deepEqual({...item,folderId:old.folderId},old);}
  const live=after.folders.filter(folder=>!folder.deletedAt),folders=new Map(live.map(folder=>[folder.id,folder]));
  const paths=live.map(folder=>pathOf(folder,folders));assert.equal(new Set(paths.map(value=>value.toLowerCase())).size,paths.length);
  for(const item of after.items)if(item.folderId)assert.ok(folders.has(item.folderId),'every document retains an active destination: '+item.id);
  const roots=live.filter(folder=>!folder.parentId).map(folder=>folder.name).sort();
  assert.equal(roots.length,9);assert.ok(roots.includes('01 · Réseaux'));assert.ok(roots.includes('99 · Archives et anciennes versions'));
  assert.ok(!live.some(folder=>/^(09|10)\s*[·.: -]/.test(folder.name)));
  assert.ok(result.summary.mergedFolders>=148);
  for(const folder of after.folders)pathOf(folder,new Map(after.folders.map(row=>[row.id,row])));
  assert.deepEqual(plan(after).operations,[]);
});

test('personal folders, vault secrets, trash destinations and user changes after migration are preserved',()=>{
  const source={settings:[],activity:[{id:'event',itemId:'note'}],folders:[
    {id:'network',section:'library',name:'Réseau',parentId:null},
    {id:'tech-folder-empty',section:'library',name:'Ancien dossier vide',parentId:'network'},
    {id:'tech-folder-trash',section:'library',name:'Récupération',parentId:'network'},
    {id:'mine',section:'library',name:'Mes clients',parentId:null,color:'purple'},
    {id:'mine-empty',section:'library',name:'Dossier à compléter',parentId:'mine'},
    {id:'vault',section:'vault',name:'Accès',parentId:null},
    {id:'ports',section:'protocol',name:'Réseau',parentId:null}
  ],items:[
    {id:'note',type:'memo',title:'Note privée',folderId:'mine',content:'<h1>Texte riche</h1>',favorite:true,linkedItemIds:['secret'],attachments:[{name:'image.png',dataUrl:'data:image/png;base64,AA=='}]},
    {id:'trash',type:'memo',title:'Note récupérable',folderId:'tech-folder-trash',deletedAt:'2026-10-01'},
    {id:'secret',type:'vault',title:'Secret',folderId:'vault',vaultBlobEnc:'opaque cipher'},
    {id:'protocol',type:'protocol',title:'SSH',folderId:'ports',port:22}
  ]};
  const after=apply(source,plan(source).operations);
  assert.deepEqual(after.items,source.items);assert.deepEqual(after.activity,source.activity);
  for(const id of ['mine','mine-empty','vault','ports','tech-folder-trash'])assert.deepEqual(after.folders.find(row=>row.id===id),source.folders.find(row=>row.id===id));
  assert.ok(after.folders.find(row=>row.id==='tech-folder-empty').deletedAt);
  after.folders.find(row=>row.id==='network').name='Mon réseau';
  assert.deepEqual(plan(after).operations,[],'manual edits must not be undone on the next unlock');
});

test('cycles stop planning, unknown folders are not guessed, and folder names cannot impersonate paths',()=>{
  const cycle={settings:[],items:[],folders:[{id:'a',section:'library',name:'Réseau',parentId:'b'},{id:'b',section:'library',name:'DNS',parentId:'a'}]};
  assert.throws(()=>plan(cycle),/Cycle/);
  assert.deepEqual(plan({settings:[],items:[],folders:[{id:'mine',section:'library',name:'Mes notes privées',parentId:null}]}).operations,[]);
  const input={settings:[],items:[],folders:[{id:'r',name:'Réseau',section:'library',parentId:null},{id:'ab',name:'A / B',section:'library',parentId:'r'},{id:'a',name:'A',section:'library',parentId:'r'},{id:'b',name:'B',section:'library',parentId:'a'}]};
  const after=apply(input,plan(input).operations);
  assert.ok(after.folders.find(row=>row.id==='ab')&&!after.folders.find(row=>row.id==='ab').deletedAt);
  assert.ok(after.folders.find(row=>row.id==='b')&&!after.folders.find(row=>row.id==='b').deletedAt);
});
