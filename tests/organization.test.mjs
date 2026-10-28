import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../app/js/data/library-organization.js',import.meta.url),'utf8'),context);
vm.runInContext(readFileSync(new URL('../app/js/data/procedure-organization.js',import.meta.url),'utf8'),context);
const plan=snapshot=>JSON.parse(JSON.stringify(context.buildMemoFolderOrganization(snapshot,'2026-10-27T12:00:00.000Z')));
const technologyPlan=snapshot=>JSON.parse(JSON.stringify(context.buildProcedureTechnologyOrganization(snapshot,'2026-10-28T18:00:00.000Z')));
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

test('the primary system or technology wins over secondary products and command examples',()=>{
  const classify=(title,folders=[],content='')=>JSON.parse(JSON.stringify(context.procedureTechnologyPath({title,content},folders.map(name=>({name})))));
  assert.deepEqual(classify('ESET - Déployer l’agent par GPO',['Stratégies de groupe']),['ESET']);
  assert.deepEqual(classify('vCenter - Transférer un hôte ESXi'),['VMware','vCenter']);
  assert.deepEqual(classify('Windows - Lire les droits NTFS avec PowerShell',['Active Directory']),['Windows','Partages SMB et NTFS']);
  assert.deepEqual(classify('Kubernetes - Déployer kubeadm sur Debian'),['Conteneurs','Kubernetes']);
  assert.deepEqual(classify('Debian - Installer open-vm-tools',['ESXi']),['Linux','Debian et Ubuntu']);
  assert.deepEqual(classify('DNSSEC : valider une réponse',['Windows']),['Réseaux et protocoles','DNS et DNSSEC']);
  assert.equal(classify('Préparer un changement',['Méthodes et organisation'],'<p>Exemple : VMware et Windows</p>'),null);
});

test('194 active bundled procedures and their unambiguous commands share technology folders without changing document content',()=>{
  const source=apply(bundled(),plan(bundled()).operations),before=JSON.stringify(source);
  const result=technologyPlan(source),after=apply(source,result.operations);
  assert.equal(JSON.stringify(source),before,'planning must not mutate the workspace');
  assert.equal(result.summary.movedProcedures,194);
  assert.ok(result.summary.movedCommands>200);
  assert.equal(after.items.length,source.items.length);
  const folders=new Map(after.folders.map(folder=>[folder.id,folder]));
  const active=after.folders.filter(folder=>!folder.deletedAt);
  const activePaths=active.map(folder=>pathOf(folder,folders));
  assert.equal(new Set(activePaths).size,activePaths.length);
  for(const item of after.items) {
    const original=source.items.find(row=>row.id===item.id);
    assert.deepEqual({...item,folderId:original.folderId},original,'only the folder is changed: '+item.id);
    if(item.folderId)assert.ok(!folders.get(item.folderId)?.deletedAt,'restoration destinations must remain active: '+item.id);
  }
  const destination=id=>pathOf(folders.get(after.items.find(item=>item.id===id).folderId),folders);
  assert.match(destination('tech-procedure-eset-gpo-agent'),/Procédures par technologie \/ ESET$/);
  assert.match(destination('tech-procedure-vcenter-move-esxi'),/VMware \/ vCenter$/);
  assert.match(destination('tech-procedure-ntfs-powershell'),/Windows \/ Partages SMB et NTFS$/);
  assert.match(destination('tech-procedure-outlook-2011-mac-rebuild'),/^99/,'historical procedures stay archived');
  assert.deepEqual(after.activity,source.activity);
  assert.deepEqual(technologyPlan(after).operations,[]);
  after.items.find(item=>item.id==='tech-procedure-eset-gpo-agent').folderId='personal-choice';
  assert.deepEqual(technologyPlan(after).operations,[],'later manual moves must be preserved');
});

test('personal folders, trash, protected records and ambiguous command links are preserved',()=>{
  const source={settings:[],activity:[{id:'event',itemId:'ad'}],folders:[
    {id:'tech-folder-win',name:'Windows',section:'library',parentId:null},
    {id:'tech-folder-eset',name:'ESET',section:'library',parentId:null},
    {id:'mine',name:'Mes clients',section:'library',parentId:null},
    {id:'mine-empty',name:'À compléter',section:'library',parentId:'mine'}
  ],items:[
    {id:'ad',type:'memo',originalType:'procedure',title:'Active Directory - Créer un utilisateur',folderId:'tech-folder-win',content:'<p>Document complet</p>',attachments:[{id:'file'}],linkedItemIds:['ad-command','shared']},
    {id:'eset',type:'procedure',title:'ESET - Déployer par GPO',folderId:'tech-folder-eset',linkedItemIds:['shared']},
    {id:'ad-command',type:'command',title:'Créer',content:'New-ADUser',folderId:'tech-folder-win'},
    {id:'shared',type:'command',title:'Diagnostic commun',content:'Get-Date',folderId:'tech-folder-win'},
    {id:'personal',type:'procedure',title:'Windows - Procédure client',folderId:'mine'},
    {id:'trash',type:'procedure',title:'Linux - Procédure supprimée',folderId:'tech-folder-eset',deletedAt:'2026-10-01'},
    {id:'secret',type:'vault',title:'ESET',folderId:'tech-folder-eset',vaultBlobEnc:'opaque'},
    {id:'task',type:'task',title:'Windows',folderId:'tech-folder-win'}
  ]};
  const after=apply(source,technologyPlan(source).operations);
  assert.equal(after.items.find(item=>item.id==='ad').folderId,after.items.find(item=>item.id==='ad-command').folderId);
  for(const id of ['shared','personal','trash','secret','task'])assert.deepEqual(after.items.find(item=>item.id===id),source.items.find(item=>item.id===id));
  for(const folder of source.folders)assert.deepEqual(after.folders.find(row=>row.id===folder.id),folder);
  assert.deepEqual(after.activity,source.activity);
  const cycle=structuredClone(source);
  cycle.folders[0].parentId='tech-folder-eset';cycle.folders[1].parentId='tech-folder-win';
  assert.throws(()=>technologyPlan(cycle),/Cycle/);
});
