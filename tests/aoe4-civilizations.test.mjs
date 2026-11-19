import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({libraryFacets:()=>['memo','command','template','reference']});
vm.runInContext(readFileSync(new URL('../app/js/data/aoe4-civilizations.js',import.meta.url),'utf8'),context);
const plan=snapshot=>JSON.parse(JSON.stringify(context.buildAOE4Civilizations(snapshot,'2026-11-19T12:00:00Z')));
const empty=()=>({items:[],folders:[],settings:[],activity:[]});
function apply(source,operations){
  const result=structuredClone(source);
  for(const op of operations){const key=op.store==='settings'?'key':'id',rows=result[op.store],index=rows.findIndex(row=>row[key]===op.record[key]);if(index<0)rows.push(op.record);else rows[index]=op.record;}
  return result;
}

test('25 distinct original guides populate Jeux / AoE IV atomically and only once',()=>{
  const source=empty(),before=JSON.stringify(source),ops=plan(source).operations,result=apply(source,ops);
  assert.equal(JSON.stringify(source),before);
  assert.equal(result.items.length,25);assert.equal(new Set(result.items.map(row=>row.aoe4CivilizationId)).size,25);
  assert.equal(result.folders.length,2);
  const branch=result.folders.find(row=>row.name==='AoE IV');assert.equal(branch.parentId,result.folders.find(row=>row.name==='Jeux').id);
  for(const item of result.items){
    assert.equal(item.folderId,branch.id);assert.equal(item.type,'memo');
    assert.equal((item.content.match(/scope="row"/g)||[]).length,7);
    for(const heading of ['À retenir','Build order','Armée à viser','Adapter le plan','Erreurs à éviter','Pour approfondir'])assert.ok(item.content.includes(heading),item.title+': '+heading);
    assert.ok(!item.content.includes('undefined'));assert.ok(!item.content.includes('Sources</h2>'));
  }
  assert.deepEqual(plan(result).operations,[]);
  result.items[0].content='Ma correction';result.items.splice(1,1);
  assert.deepEqual(plan(result).operations,[],'edits and deletions are authoritative');
});

test('existing French/English aliases and nested AoE folders retain content, IDs, titles and metadata',()=>{
  const source=empty();source.folders=[{id:'games',name:'Jeux',section:'library',parentId:null},{id:'aoe',name:'AOE',section:'library',parentId:'games'},{id:'civs',name:'Civilisations',section:'library',parentId:'aoe'},{id:'private',name:'Personnel',section:'vault',parentId:null}];
  source.items=[{id:'french',title:'Français — ouverture personnelle',type:'memo',folderId:'civs',content:'<p>Mon texte &amp; mes étapes.</p>',favorite:true,attachments:[{name:'carte.png'}],tags:['perso'],createdAt:'2025-01-01'},
    {id:'english',title:'English build order',type:'memo',folderId:'aoe',content:'<p>Ouverture commencée.</p>'},
    {id:'matchup',title:'Français vs Anglais',type:'memo',folderId:'aoe',content:'Matchup'},
    {id:'outside',title:'Chinois',type:'memo',folderId:'games',content:'Hors branche'},
    {id:'vault',title:'Delhi',type:'password',folderId:'private',content:'Privé'}];
  const result=apply(source,plan(source).operations);
  assert.deepEqual(result.folders,source.folders);assert.equal(result.items.filter(row=>row.aoe4CivilizationId).length,25);
  for(const id of ['french','english']){
    const before=source.items.find(row=>row.id===id),after=result.items.find(row=>row.id===id);
    assert.ok(after.content.endsWith(before.content));assert.ok(after.content.includes('Notes déjà présentes'));
    for(const [key,value] of Object.entries(before))if(key!=='content')assert.deepEqual(after[key],value);
  }
  for(const id of ['matchup','outside','vault'])assert.deepEqual(result.items.find(row=>row.id===id),source.items.find(row=>row.id===id));
});

test('base civilizations and variants are matched separately, collisions and tombstones survive',()=>{
  const source=empty();source.folders=[{id:'memo-games',section:'library',name:'Perso',parentId:null},{id:'g',section:'library',name:'Games',parentId:null},{id:'a',section:'memo',name:'Age of Empires 4',parentId:'g'}];
  source.items=[{id:'memo-aoe4-chinese',title:'Sans rapport',type:'memo',folderId:null,content:'À conserver'},
    {id:'jeanne',title:"Jeanne d'Arc",type:'memo',folderId:'a',content:'Jeanne'},
    {id:'dragon',title:'Ordre du Dragon',type:'memo',folderId:'a',content:'Dragon'},
    {id:'deleted',type:'memo',title:'Vikings',folderId:'a',aoe4CivilizationId:'vikings',deletedAt:'2026-11-18'}];
  const result=apply(source,plan(source).operations);
  assert.equal(result.items.filter(row=>row.aoe4CivilizationId&&!row.deletedAt).length,24);
  assert.equal(result.items.find(row=>row.id==='jeanne').aoe4CivilizationId,'jeanne-darc');
  assert.equal(result.items.find(row=>row.id==='dragon').aoe4CivilizationId,'order-of-the-dragon');
  assert.deepEqual(result.items[0],source.items[0]);assert.deepEqual(result.items.find(row=>row.id==='deleted'),source.items[3]);
  assert.equal(result.items.find(row=>row.aoe4CivilizationId==='chinese').id,'memo-aoe4-chinese-2');
});

test('folder cycles fail before writes and guide text cannot inject markup',()=>{
  const source=empty();source.folders=[{id:'a',section:'library',name:'Jeux',parentId:'b'},{id:'b',section:'library',name:'AoE IV',parentId:'a'}];
  const before=JSON.stringify(source);assert.throws(()=>plan(source),/Cycle/);assert.equal(JSON.stringify(source),before);
  const guide={name:'<img src=x>',style:'A & B',pack:'"test"',id:'test',identity:'<script>bad</script>',build:'Test',steps:[['<b>','&']],army:'x',adapt:'x',avoid:'x'};
  const html=context.aoe4GuideHTML(guide);assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('A &amp; B'));
});
