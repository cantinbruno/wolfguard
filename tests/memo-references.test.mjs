import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../app/js/data/memo-references.js',import.meta.url),'utf8'),context);
const catalog=JSON.parse(readFileSync(new URL('../app/data/ports-practical.json',import.meta.url),'utf8'));
const plan=(snapshot,data=catalog)=>JSON.parse(JSON.stringify(context.buildMemoReferences(snapshot,data,'2026-11-03T12:00:00Z')));
function apply(snapshot,operations){
  const result=structuredClone(snapshot);
  for(const op of operations){const field=op.store==='settings'?'key':'id',rows=result[op.store],index=rows.findIndex(row=>row[field]===op.record[field]);if(index<0)rows.push(op.record);else rows[index]=op.record;}
  return result;
}
const empty=()=>({items:[],folders:[],settings:[],activity:[]});

test('one Memo reference includes every practical port, merges identical transports and excludes IP protocol numbers',()=>{
  const source=empty(),before=JSON.stringify(source),result=apply(source,plan(source).operations);
  assert.equal(JSON.stringify(source),before);
  assert.equal(result.items.length,2);assert.equal(result.folders.length,1);
  const item=result.items[0];assert.equal(item.type,'memo');assert.equal(item.title,'Ports et services');assert.equal(result.folders[0].name,'Référentiels');
  assert.equal(item.folderId,result.folders[0].id);
  const identities=new Set(catalog.entries.filter(row=>row.kind==='port').map(row=>JSON.stringify([row.port,row.service,row.usage])));
  assert.equal((item.content.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr>/g)||[]).length,identities.size);
  for(const label of ['Port','Service','Description'])assert.ok(item.content.includes('<th scope="col">'+label+'</th>'));
  for(const port of ['22','53','80','443','3389'])assert.ok(item.content.includes('<strong>'+port+'</strong>'));
  assert.ok(item.content.includes('TCP / UDP'));assert.ok(!item.content.includes('<td>OSPF</td>'));
  assert.deepEqual(plan(result).operations,[]);
});

test('existing reference version gains OSI once without restoring deleted ports or replacing personal edits',()=>{
  const source=empty();source.settings=[{key:'memo-references-version',value:1}];
  source.folders=[{id:'mine',section:'library',name:'Référentiels',parentId:null}];
  const after=apply(source,plan(source,null).operations);
  assert.equal(after.items.length,1);
  const osi=after.items[0];assert.equal(osi.referenceCatalogId,'osi-model');assert.equal(osi.title,'Modèle OSI');assert.equal(osi.folderId,'mine');
  assert.ok(!('sources' in osi));assert.ok(!('references' in osi));
  for(const name of ['Application','Présentation','Session','Transport','Réseau','Liaison de données','Physique'])assert.ok(osi.content.includes(name));
  assert.equal((osi.content.match(/scope="row"/g)||[]).length,7);
  assert.ok(osi.content.includes('Encapsulation'));assert.ok(osi.content.includes('TCP/IP'));
  osi.content='<p>Mes précisions.</p>';assert.deepEqual(plan(after,null).operations,[]);
  after.items=[];assert.deepEqual(plan(after,null).operations,[]);
});

test('an existing OSI identifier or tombstone is never overwritten and colliding personal IDs are preserved',()=>{
  const source=empty();source.settings=[{key:'memo-references-version',value:1}];
  source.items=[{id:'memo-reference-osi-model',type:'memo',content:'Personnel.'}];
  const after=apply(source,plan(source,null).operations);
  assert.deepEqual(after.items[0],source.items[0]);assert.notEqual(after.items[1].id,source.items[0].id);
  const marker={...after.items[1],deletedAt:'2026-11-01T00:00:00Z'};
  source.items=[marker];assert.equal(plan(source,null).operations.filter(op=>op.store==='items').length,0);
  assert.deepEqual(source.items[0],marker);
});

test('personal notes, existing reference folders, IDs and retired-tool documents survive; edits and deletions remain authoritative',()=>{
  const source=empty();source.folders=[{id:'mine',section:'library',name:'Référentiels',parentId:null},{id:'old',section:'protocol',name:'Personnels',parentId:null}];
  source.items=[{id:'memo-reference-ports-services',type:'memo',title:'Note personnelle',content:'<p>Garder.</p>'},{id:'private-port',type:'protocol',title:'Port interne',content:'<p>Service configuré sur 8448.</p>',folderId:'old',attachments:[{name:'configuration'}]}];
  const after=apply(source,plan(source).operations),reference=after.items.find(item=>item.referenceCatalogId);
  assert.equal(reference.folderId,'mine');assert.notEqual(reference.id,source.items[0].id);
  assert.deepEqual(after.items.find(item=>item.id===source.items[0].id),source.items[0]);
  const moved=after.items.find(item=>item.id==='private-port');assert.equal(moved.type,'memo');assert.equal(moved.content,source.items[1].content);assert.deepEqual(moved.attachments,source.items[1].attachments);
  assert.deepEqual(after.folders.find(folder=>folder.id==='old'),{...source.folders[1],section:'library',parentId:'mine'});
  reference.content='<p>Ma correction.</p>';assert.deepEqual(plan(after).operations,[]);
  after.items=after.items.filter(item=>item!==reference);assert.deepEqual(plan(after).operations,[]);
});

test('catalog text is escaped and missing port data fails before any write',()=>{
  const data={entries:[{kind:'port',port:'1234',transport:'TCP',service:'<img src=x onerror=alert(1)>',usage:'A & B'}],sources:[],checkedAt:'<script>bad</script>'};
  const item=plan(empty(),data).operations.find(op=>op.store==='items').record;
  assert.ok(!item.content.includes('<img'));assert.ok(!item.content.includes('<script>'));assert.ok(item.content.includes('&lt;img'));assert.ok(item.content.includes('A &amp; B'));
  assert.throws(()=>plan(empty(),{entries:[]}),/vide/);
  assert.throws(()=>plan(empty(),{entries:[{kind:'port',port:'443'}]}),/incomplète/);
});
