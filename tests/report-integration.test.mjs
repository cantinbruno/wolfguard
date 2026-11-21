import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,mkdir,writeFile,rm,lstat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import vm from 'node:vm';
import {setup} from './endpoint-fixture.mjs';
import {workspaceUsage} from '../server/lib/wolfguard/storage-usage.mjs';
import {profilePolicy,normalizePolicy,vaultHomeId} from '../server/lib/wolfguard/permissions.mjs';
import {endpointSnapshot} from '../server/lib/wolfguard/endpoint-spec.mjs';
import {retainRecentLogs,LOG_RETENTION_MS} from '../server/lib/wolfguard/retention.mjs';
import {AntivirusManager} from '../agent/antivirus.mjs';

const source=readFileSync(new URL('../app/js/ui/fleet-groups.js',import.meta.url),'utf8');
test('existing v2 policies load with the new storage permission denied by default',()=>{
  const previous=profilePolicy('reader');delete previous.sections.data;
  const migrated=normalizePolicy(previous);assert.equal(migrated.sections.data,'deny');assert.equal(migrated.sections.library,'read');
  delete previous.sections.library;assert.throws(()=>normalizePolicy(previous));
});
function model(request){const cloud={isAdmin:()=>true},context={window:{WolfGuardCloud:cloud},WolfGuardCloud:cloud,structuredClone};vm.runInNewContext(source,context);return context.window.WolfGuardFleetGroups.create({read:async()=>({groups:[{id:'old',name:'Old cached group'}]}),write:async()=>{},request});}

test('fleet refresh retains confirmed groups during network loss and ignores late pre-write reads',async()=>{
  let resolveRead,phase=0;
  const snapshot=(revision,name)=>({initialized:true,canManage:true,revision,groups:[{id:'one',name}],assignments:{a:'one'}});
  const groups=model(async route=>{if(route==='/rename')return snapshot(2,'Renamed');if(phase++===0)return snapshot(1,'Confirmed');if(phase===2)throw new Error('Offline');return new Promise(resolve=>{resolveRead=resolve;});});
  await groups.load();await assert.rejects(groups.load(),/Offline/);assert.equal(groups.name('one'),'Confirmed');assert.equal(groups.groupOf('a'),'one');
  const reading=groups.load();await new Promise(resolve=>setImmediate(resolve));await groups.rename('one','Renamed');resolveRead(snapshot(1,'Obsolete'));await reading;assert.equal(groups.name('one'),'Renamed');
});

test('storage measures private homes separately and never exposes another account to a member',()=>{
  const alice='a'.repeat(32),bob='b'.repeat(32),homeA=vaultHomeId(alice),homeB=vaultHomeId(bob);
  const payload={version:2,folders:[{id:homeA,name:'alice@example.test',ownerUserId:alice,systemVaultHome:true,section:'vault'}, {id:homeB,name:'secret-bob@example.test',ownerUserId:bob,systemVaultHome:true,section:'vault'}, {id:'nested',parentId:homeA,section:'vault'}, {id:'shared',section:'library'}],items:[{id:'a',folderId:'nested',type:'vault',vaultBlobEnc:{data:[1,2,3]}},{id:'b',folderId:homeB,type:'vault',title:'secret-bob-title'}, {id:'shared-note',type:'memo',title:'Team'}],settings:[],activity:[]};
  const policy=profilePolicy('none');policy.sections.library='read';policy.sections.data='read';
  const member=workspaceUsage(payload,{id:alice,role:'member',permissions:policy});assert.equal(member.administrator,false);assert.equal(member.accounts.length,1);assert.equal(member.accounts[0].items,1);assert.equal(member.accounts[0].folders,2);assert.equal(member.shared.items,1);assert.ok(!JSON.stringify(member).includes('bob'));assert.ok(!JSON.stringify(member).includes('title'));
  const owner=workspaceUsage(payload,{role:'admin'});assert.equal(owner.accounts.length,2);assert.equal(owner.totalBytes,owner.accounts.reduce((n,row)=>n+row.bytes,0)+owner.shared.bytes+owner.metadataBytes);
  policy.sections.data='deny';assert.equal(workspaceUsage(payload,{id:alice,role:'member',permissions:policy}).shared.bytes,0);
});

test('storage API authenticates requests and limits ordinary users to their own vault',async()=>{
  const s=await setup();try{
    assert.equal((await s.api('storage/usage')).status,401);await s.initialize();const owner=await s.login('cantin.bruno@gmx.fr','09876543');await s.createMember('storage@example.test','12345678',owner.token);const member=await s.login('storage@example.test','12345678');
    const result=await s.api('storage/usage',undefined,member.token);assert.equal(result.status,200,await result.clone().text());const usage=await result.json();assert.equal(usage.accounts.length,1);assert.equal(usage.accounts[0].name,'storage@example.test');assert.ok(!JSON.stringify(usage).includes('cantin.bruno'));const full=await(await s.api('storage/usage',undefined,owner.token)).json();assert.equal(full.accounts.length,2);assert.equal(full.administrator,true);
  }finally{s.env.DB.db.close();}
});

test('Defender states cannot masquerade as WolfGuard coverage; inventory is bounded',()=>{
  const now=Date.now(),raw={collectedAt:now,platform:'win32',provider:'Microsoft Defender',supported:true,antivirus:'enabled',realtime:'enabled',firewall:'enabled',signatures:'enabled',events:[],inventory:{username:'user',domain:'TEST',addresses:Array(50).fill('192.0.2.1')},systemMonitor:{scope:'system',processes:100,services:200,connections:10,startupEntries:4,eventLogs:['System'],limitations:[]},wolfguardAntivirus:{version:1,capable:true,installed:false,enabled:false,state:'missing',quarantine:[]}};
  let value=endpointSnapshot(raw,now);assert.equal(value.provider,'WolfGuard Antivirus / ClamAV');assert.equal(value.antivirus,'disabled');assert.equal(value.inventory.username,'user');assert.equal(value.inventory.addresses.length,20);assert.equal(value.systemMonitor.processes,100);
  raw.wolfguardAntivirus={...raw.wolfguardAntivirus,installed:true,enabled:true,state:'ready',signatureAt:now,signatureVersion:'own'};raw.antivirus='disabled';value=endpointSnapshot(raw,now);assert.equal(value.antivirus,'enabled');assert.equal(value.signatureVersion,'own');
});

test('retention removes logs older than 30 days and preserves recent and active work',async()=>{
  const s=await setup();try{
    const cutoff=s.clock()-LOG_RETENTION_MS,db=s.env.DB.db;
    for(const [id,at]of [['old',cutoff-1],['boundary',cutoff],['recent',s.clock()]])db.prepare('INSERT INTO permission_audit(id,created_at,details_cipher) VALUES (?,?,?)').run(id,at,'synthetic');
    await retainRecentLogs(s.env,s.clock());assert.deepEqual(db.prepare('SELECT id FROM permission_audit ORDER BY id').all().map(row=>row.id),['boundary','recent']);
  }finally{s.env.DB.db.close();}
});

test('progressive antivirus traversal resumes beyond the previous batch without starving later files',async()=>{
  const base=path.resolve('.cache'),root=await mkdtemp(path.join(base,'report-walk-'));try{
    const targets=path.join(root,'targets');await mkdir(targets);for(let i=0;i<7;i++)await writeFile(path.join(targets,`${i}.txt`),'synthetic harmless content');
    const manager=new AntivirusManager({directory:path.join(root,'private'),scope:[targets]});const visited=new Set();for(let i=0;i<5;i++){const batch=await manager.candidates({limit:2});for(const row of batch.files)visited.add(row.file);if(!batch.incomplete)break;}assert.equal(visited.size,7);assert.equal(manager.completedPasses,1);await manager.walkCursor?.return();
  }finally{assert.ok(root.startsWith(base+path.sep));assert.equal((await lstat(root)).isSymbolicLink(),false);await rm(root,{recursive:true,force:true});}
});

test('Windows antivirus ACL can be secured without requesting audit privileges',{skip:process.platform!=='win32'},async()=>{
  const base=path.resolve('.cache'),root=await mkdtemp(path.join(base,'report-acl-'));try{execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.resolve('agent/antivirus-windows.ps1'),'-Operation','secure','-Directory',root],{windowsHide:true,timeout:15000,stdio:'pipe'});}finally{assert.ok(root.startsWith(base+path.sep));await rm(root,{recursive:true,force:true});}
});
