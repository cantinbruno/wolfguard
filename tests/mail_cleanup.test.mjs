import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
for(const file of ['library-mail-cleanup.js','library-organization.js'])vm.runInContext(readFileSync(new URL('../app/js/data/'+file,import.meta.url),'utf8'),context);
const cleanup=snapshot=>JSON.parse(JSON.stringify(context.buildMemoMailCleanup(snapshot,'2026-10-27T12:00:00Z')));
const organize=snapshot=>JSON.parse(JSON.stringify(context.buildMemoFolderOrganization(snapshot,'2026-10-27T12:00:00Z')));
function apply(source,operations){
  const next=structuredClone(source);
  for(const op of operations){const rows=next[op.store],field=op.store==='settings'?'key':'id',index=rows.findIndex(row=>row[field]===(op.record?.[field]||op.id));if(op.action==='delete'){if(index>=0)rows.splice(index,1);}else if(index<0)rows.push(op.record);else rows[index]=op.record;}
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

test('remove the six bundled mail templates and redistribute every surviving document without 09/10',()=>{
  const source=bundled(),before=JSON.stringify(source),plan=cleanup(source),cleaned=apply(source,plan.operations),after=apply(cleaned,organize(cleaned).operations);
  assert.equal(JSON.stringify(source),before);
  assert.equal(plan.summary.removedItems,6);assert.equal(after.items.length,805);
  assert.deepEqual(source.items.filter(row=>!after.items.some(item=>item.id===row.id)).map(row=>row.type),Array(6).fill('mail'));
  const live=new Map(after.folders.filter(row=>!row.deletedAt).map(row=>[row.id,row]));
  assert.equal([...live.values()].filter(row=>!row.parentId).length,9);
  assert.ok(![...live.values()].some(row=>/^(?:09|10)\s*[·.: -]/.test(row.name)));
  for(const item of after.items){assert.ok(!item.folderId||live.has(item.folderId),item.id);const old=source.items.find(row=>row.id===item.id);assert.deepEqual({...item,folderId:old.folderId},old);}
  assert.deepEqual(cleanup(after).operations,[]);
});

test('mail structure and placeholders remove message forms, while technical syntax and other stores survive',()=>{
  const source={settings:[],folders:[],activity:[{id:'gone',itemId:'subject'},{id:'kept',itemId:'powershell'}],items:[
    {id:'subject',type:'memo',title:'Demande de validation',content:'<p>Objet : &#91;REFERENCE&#93;</p><p>Bonjour [PRENOM],</p><p>Merci.</p><p>Cordialement, [SIGNATURE]</p>'},
    {id:'model',type:'memo',originalType:'mail',title:'Communication',content:'Bonjour'},
    {id:'title',type:'template',title:'[Objet] Demande de rendez-vous'},
    {id:'explicit',type:'memo',title:'Modèle de mail de relance'},
    {id:'powershell',type:'command',title:'Exchange et Outlook',content:'<pre>[System.Net.Mail.MailMessage]::new()</pre>',linkedItemIds:['subject','model','smtp']},
    {id:'smtp',type:'procedure',title:'Diagnostic SMTP',content:'<p>Objet : [REFERENCE]</p><p>Bonjour [NOM]</p><pre>Test-NetConnection -Port 25</pre>'},
    {id:'diagnostic',type:'report',title:'Diagnostic technique',content:'<p>Objet : [CONTROLE]</p><p>Résultat : {RESULTAT}</p>'},
    {id:'instructions',type:'memo',title:'Configurer Outlook',content:'<p>Modifier l’objet : [Projet]</p><p>Configurer le compte SMTP.</p>'},
    {id:'secret',type:'vault',title:'Modèle de mail',vaultBlobEnc:'opaque'},
    {id:'task',type:'task',title:'[Objet] Tester',content:'Bonjour [NOM], cordialement'}
  ]};
  const before=JSON.stringify(source),plan=cleanup(source),after=apply(source,plan.operations);
  assert.equal(JSON.stringify(source),before);
  assert.equal(plan.summary.removedItems,4);assert.equal(plan.summary.updatedLinks,1);assert.equal(plan.summary.removedActivity,1);
  assert.deepEqual(after.items.map(row=>row.id),['powershell','smtp','diagnostic','instructions','secret','task']);
  assert.deepEqual(after.items[0].linkedItemIds,['smtp']);assert.deepEqual(after.activity,[{id:'kept',itemId:'powershell'}]);
  for(const id of ['smtp','diagnostic','instructions','secret','task'])assert.deepEqual(after.items.find(row=>row.id===id),source.items.find(row=>row.id===id));
  after.items.push({id:'future',type:'mail',title:'Ma nouvelle fiche'});assert.deepEqual(cleanup(after).operations,[]);
});

test('version one folders upgrade without losing personal folder metadata or document contents',()=>{
  const source={settings:[{key:'memo-folder-organization-version',value:1}],activity:[],folders:[
    {id:'r9',section:'library',name:'09 · Collaboration',parentId:null},
    {id:'mail',section:'library',name:'Messagerie',parentId:'r9'},
    {id:'phone',section:'library',name:'Téléphonie',parentId:'r9'},
    {id:'m365',section:'library',name:'Microsoft 365',parentId:'r9'},
    {id:'r10',section:'library',name:'10 · Support et exploitation',parentId:null},
    {id:'printing',section:'library',name:'Impression',parentId:'r10',color:'purple'},
    {id:'mine',section:'library',name:'Clients personnels',parentId:null,color:'green'}
  ],items:['mail','phone','m365','printing','mine'].map(id=>({id:'item-'+id,type:'memo',folderId:id,content:'<p>Texte '+id+'</p>'}))};
  const after=apply(source,organize(source).operations),folders=new Map(after.folders.filter(row=>!row.deletedAt).map(row=>[row.id,row]));
  function path(id){const names=[];while(folders.has(id)){const folder=folders.get(id);names.unshift(folder.name);id=folder.parentId;}return names.join('/');}
  for(const [id,root] of [['mail','02 · Systèmes'],['phone','01 · Réseaux'],['m365','06 · Cloud et DevOps'],['printing','02 · Systèmes']])assert.ok(path(id).startsWith(root+'/'),path(id));
  assert.deepEqual(after.items,source.items);assert.deepEqual(folders.get('mine'),source.folders.at(-1));assert.equal(folders.get('printing').color,'purple');
  assert.ok(![...folders.values()].some(row=>/^(09|10)\s*·/.test(row.name)));assert.deepEqual(organize(after).operations,[]);
});
