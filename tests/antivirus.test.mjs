import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,lstat,symlink,link,rm} from 'node:fs/promises';
import path from 'node:path';
import {AntivirusStore,snapshotFile,fileDigest} from '../agent/antivirus-store.mjs';
import {ClamEngine,downloadEngine} from '../agent/antivirus-engine.mjs';
import {AntivirusManager} from '../agent/antivirus.mjs';
import {antivirusCommand,antivirusSnapshot} from '../server/lib/wolfguard/antivirus-spec.mjs';
import {endpointHealth} from '../server/lib/wolfguard/endpoint-spec.mjs';
import {boundedEndpointReport,runEndpointProtection} from '../agent/endpoint.mjs';

async function fixture(){
  const parent=path.resolve('.cache');await mkdir(parent,{recursive:true});const root=await mkdtemp(path.join(parent,'av-fixture-'));
  const targets=path.join(root,'targets');await mkdir(targets,{mode:0o700});
  const run=async(_file,args,{input}={})=>{
    if(args.includes('protect'))return Buffer.from(input).toString('base64');
    if(args.includes('unprotect'))return Buffer.from(input,'base64').toString();
    return '';
  };
  const store=new AntivirusStore(path.join(root,'quarantine'),{run});await store.prepare();
  return {root,targets,store,run,async close(){assert.ok(root.startsWith(parent+path.sep));assert.equal((await lstat(root)).isSymbolicLink(),false);await rm(root,{recursive:true,force:true});}};
}
test('quarantine encrypts confirmed bytes and restores without overwriting an existing file',async()=>{
  const f=await fixture();try{
    const file=path.join(f.targets,'fixture.txt'),bytes=Buffer.from('Harmless quarantine fixture, no executable or malware.');await writeFile(file,bytes);
    const record=await f.store.quarantine(await snapshotFile(file,[f.targets]),'Fixture.Test.Detection',[f.targets]);
    assert.equal(record.status,'quarantined');await assert.rejects(lstat(file),{code:'ENOENT'});
    assert.equal((await readFile(f.store.filename(record.id,'data'))).includes(bytes),false);
    assert.equal((await readFile(f.store.filename(record.id,'meta'))).includes(Buffer.from(file)),false);
    assert.equal((await f.store.list())[0].sha256,fileDigest(bytes));
    await writeFile(file,'new user content');await assert.rejects(f.store.restore(record.id,[f.targets]),{code:'EEXIST'});assert.equal(await readFile(file,'utf8'),'new user content');
    await rm(file);await f.store.restore(record.id,[f.targets]);assert.deepEqual(await readFile(file),bytes);
    assert.equal((await f.store.record(record.id)).status,'restored');
    await f.store.remove(record.id);assert.deepEqual(await f.store.list(),[]);
  }finally{await f.close();}
});
test('changed files remain intact and a positive result is never applied to replacement bytes',async()=>{
  const f=await fixture();try{
    const file=path.join(f.targets,'change.txt');await writeFile(file,'original fixture');const snapshot=await snapshotFile(file,[f.targets]);await writeFile(file,'replacement, safe user text');
    const record=await f.store.quarantine(snapshot,'Fixture.Test.Detection',[f.targets]);assert.equal(record.status,'detected');assert.equal(await readFile(file,'utf8'),'replacement, safe user text');
    assert.match(record.message,/chang/);await assert.rejects(f.store.restore(record.id,[f.targets]),{code:'EEXIST'});
  }finally{await f.close();}
});
test('paths, links, oversize files, altered quarantine and restoration outside scope fail closed',async()=>{
  const f=await fixture();try{
    const file=path.join(f.targets,'file.txt');await writeFile(file,'fixture content');
    await assert.rejects(snapshotFile(file,[path.join(f.root,'other')]),/périmètre/);
    await assert.rejects(snapshotFile(file,[f.targets],{maxBytes:2}),/volumineux/);
    const hard=path.join(f.targets,'hard.txt');await link(file,hard);await assert.rejects(snapshotFile(file,[f.targets]),/partag/);await rm(hard);
    if(process.platform!=='win32'){const symbolic=path.join(f.targets,'link.txt');await symlink(file,symbolic);await assert.rejects(snapshotFile(symbolic,[f.targets]),/liens/);}
    assert.throws(()=>f.store.filename('../outside','data'),/Identifiant/);
    const record=await f.store.quarantine(await snapshotFile(file,[f.targets]),'Fixture.Test.Detection',[f.targets]);
    await assert.rejects(f.store.restore(record.id,[path.join(f.root,'other')]),/périmètre/);
    const data=await readFile(f.store.filename(record.id,'data'));data[data.length-1]^=1;await writeFile(f.store.filename(record.id,'data'),data);
    await assert.rejects(f.store.restore(record.id,[f.targets]));await assert.rejects(lstat(file),{code:'ENOENT'});
  }finally{await f.close();}
});
test('ClamAV adapter associates exact staged inputs, distinguishes limits and errors, and removes its copies',async()=>{
  const f=await fixture();try{
    const directory=path.join(f.root,'engine');await mkdir(directory,{mode:0o700});await mkdir(path.join(directory,'database'),{mode:0o700});
    await writeFile(path.join(directory,'database','daily.cvd'),'ClamAV-VDB:fixture:123:50:90:hash:signature:builder:'+Math.floor(Date.now()/1000));
    const run=async(file,args)=>{
      assert.equal(file,'mock-clamscan');assert.ok(args.includes('--bytecode-unsigned=no'));assert.ok(args.includes('--alert-exceeds-max=yes'));assert.ok(!args.some(x=>x.startsWith('--remove')));
      const inputs=args.slice(args.indexOf('--')+1),lines=[];
      for(const input of inputs){const content=await readFile(input,'utf8');lines.push(input+': '+(content==='infected fixture'?'Fixture.Test FOUND':content==='archive limit fixture'?'Heuristics.Limits.Exceeded.MaxScanSize FOUND':'OK'));}
      throw Object.assign(new Error('detections'),{code:1,stdout:lines.join('\n')});
    };
    const engine=new ClamEngine(directory,{run});engine.cached={scanner:'mock-clamscan',updater:'mock-freshclam',version:'fixture'};
    const snapshots=[];for(const [i,value]of ['clean fixture','infected fixture','archive limit fixture'].entries()){const p=path.join(f.targets,i+'.txt');await writeFile(p,value);snapshots.push(await snapshotFile(p,[f.targets]));}
    const result=await engine.scan(snapshots);assert.deepEqual(result.map(r=>r.status),['clean','infected','incomplete']);assert.equal(result[1].snapshot.path,snapshots[1].path);assert.deepEqual(await readdir(path.join(directory,'scan-input')),[]);
    engine.run=async()=>{throw Object.assign(new Error('engine crash'),{code:2,stdout:'anything'});};await assert.rejects(engine.scan(snapshots),/erreur/);assert.deepEqual(await readdir(path.join(directory,'scan-input')),[]);
    await writeFile(path.join(directory,'database','daily.cvd'),'ClamAV-VDB:fixture:123:50:90:hash:signature:builder:'+Math.floor((Date.now()-4*86400000)/1000));await assert.rejects(engine.scan(snapshots),/anciennes/);
  }finally{await f.close();}
});
test('engine installer refuses altered downloads and redirects to an untrusted origin',async()=>{
  const f=await fixture();try{
    const target=path.join(f.root,'engine.zip');
    await assert.rejects(downloadEngine(target,{fetcher:async()=>new Response('not an engine')}),/intégrité/);await assert.rejects(lstat(target),{code:'ENOENT'});
    await assert.rejects(downloadEngine(target,{fetcher:async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}})}),/Origine/);
    await assert.rejects(lstat(target),{code:'ENOENT'});
  }finally{await f.close();}
});

test('interrupted extraction is removed; retry commits a verified installation atomically',async()=>{
  const f=await fixture();try{
    const definition=JSON.parse(await readFile(new URL('../agent/antivirus-dependencies.json',import.meta.url),'utf8'));
    const directory=path.join(f.root,'installer');let interrupted=true,attempts=0;
    const run=async(_file,args)=>{
      const target=args[args.indexOf('-Directory')+1],root=path.join(target,definition.windowsX64.directory);attempts++;
      await mkdir(root,{recursive:true});await writeFile(path.join(root,'clamscan.exe'),'synthetic scanner');
      if(interrupted)throw new Error('Synthetic interruption');await writeFile(path.join(root,'freshclam.exe'),'synthetic updater');return '';
    };
    const options={platform:'win32',arch:'x64',run,download:async target=>writeFile(target,'synthetic archive',{flag:'wx'})};
    const engine=new ClamEngine(directory,options);
    await assert.rejects(engine.install(),/interruption/);assert.deepEqual(await readdir(directory),[]);assert.equal(await engine.paths(),null);
    interrupted=false;await engine.install();assert.equal(attempts,2);
    const installed=await engine.paths();assert.equal(installed.version,definition.version);
    const marker=JSON.parse(await readFile(path.join(directory,'engine.verified.json'),'utf8'));assert.ok(marker.installation.startsWith('engine-'+definition.version+'-'));
    await engine.install();assert.equal(attempts,2);
    await writeFile(installed.scanner,'altered scanner');await assert.rejects(new ClamEngine(directory,options).paths(),/altéré/);
  }finally{await f.close();}
});
test('manager quarantines positives, caches unchanged clean files, and does not quarantine incomplete results',async()=>{
  const f=await fixture();try{
    let calls=0;
    const engine={paths:async()=>({version:'fixture'}),signatures:async()=>({version:'123',at:Date.now()}),scan:async files=>{calls++;return files.map(snapshot=>({snapshot,status:snapshot.bytes.toString().startsWith('positive')?'infected':snapshot.bytes.toString()==='partial'?'incomplete':'clean',threat:'Fixture.Test'}));}};
    const manager=new AntivirusManager({directory:path.join(f.root,'manager'),scope:[f.targets],engine,store:f.store,run:f.run});await manager.prepare();manager.enabled=true;
    for(const [name,value]of [['clean.txt','clean'],['positive.txt','positive fixture'],['partial.txt','partial']])await writeFile(path.join(f.targets,name),value);
    const result=await manager.scan();assert.equal(result.ok,true);assert.equal(calls,1);assert.equal(await readFile(path.join(f.targets,'partial.txt'),'utf8'),'partial');await assert.rejects(lstat(path.join(f.targets,'positive.txt')),{code:'ENOENT'});
    const snapshot=await manager.snapshot();assert.equal(snapshot.quarantine.length,1);assert.equal(snapshot.quarantine[0].status,'quarantined');assert.equal(snapshot.coverage,'reactive');assert.equal(snapshot.errors,1);
    const record=snapshot.quarantine[0];assert.equal((await manager.execute('av-restore:'+record.id)).ok,true);assert.equal(await readFile(path.join(f.targets,'positive.txt'),'utf8'),'positive fixture');
    assert.equal((await manager.execute('av-pause')).ok,true);assert.equal((await manager.snapshot()).enabled,false);
    await manager.setPolicy('observe');await manager.execute('av-resume');assert.equal((await manager.snapshot()).enabled,false);
  }finally{await f.close();}
});
test('telemetry and commands are bounded, backward compatible and never describe reactive scanning as preventive',()=>{
  assert.equal(antivirusCommand('shell'),null);assert.equal(antivirusCommand('av-restore:../etc'),null);assert.equal(antivirusCommand('av-delete:'+('a'.repeat(32))).id,'a'.repeat(32));
  assert.equal(antivirusSnapshot(null),null);assert.throws(()=>antivirusSnapshot({version:1,capable:true,state:'protected'}));
  const own=antivirusSnapshot({version:1,capable:true,state:'ready',installed:true,enabled:true,signatureAt:Date.now(),coverage:'preventive',quarantine:[]});assert.equal(own.coverage,'reactive');
  const snapshot={supported:true,activeThreats:0,antivirus:'enabled',realtime:'enabled',firewall:'enabled',signatures:'enabled',wolfguardAntivirus:{...own,state:'error'}};assert.equal(endpointHealth(snapshot),'attention');
  const events=Array.from({length:100},(_,i)=>({id:String(i),detail:'\u{1f916}'.repeat(1800),title:'large event'}));const report=boundedEndpointReport({events:[],wolfguardAntivirus:own},events,0);assert.ok(Buffer.byteLength(JSON.stringify(report))<240001);assert.ok(report.events.length<100);assert.equal(events.length,100);
});
test('long antivirus work keeps reporting; cancellation stops only that command and preserves native policy',async()=>{
  const controller=new AbortController();let reports=0,cancelled=false,result;
  const client={async post(route,body){
    if(route==='edr/result'){result=body;return {};}
    reports++;if(reports===1)return {revision:1,policy:{mode:'observe',realtime:true,firewall:true},command:{id:'job',lease:'lease',action:'av-install'}};
    if(reports===2)return {revision:1,policy:{mode:'observe',realtime:true,firewall:true},cancelCommand:'job'};
    controller.abort();return {revision:1,policy:{mode:'observe',realtime:true,firewall:true}};
  }};
  await runEndpointProtection(client,{signal:controller.signal,intervalMs:1,collect:async()=>({events:[],canEnforce:false}),execute:async(action,_policy,{signal})=>{
    assert.equal(action,'av-install');await new Promise(resolve=>signal.addEventListener('abort',()=>{cancelled=true;resolve();},{once:true}));return {ok:false,message:'cancelled'};
  }});
  assert.ok(reports>=3);assert.equal(cancelled,true);assert.equal(result.ok,false);
});
