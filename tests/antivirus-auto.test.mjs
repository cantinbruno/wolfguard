import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {AntivirusManager} from '../agent/antivirus.mjs';
import {ClamEngine} from '../agent/antivirus-engine.mjs';

async function fixture(){
  const parent=path.resolve('.cache');await mkdir(parent,{recursive:true});const root=await mkdtemp(path.join(parent,'av-auto-test-'));
  let now=Date.now(),installed=false,installFail=false,updateFail=false;const calls=[];
  const engine={paths:async()=>installed?{version:'fixture'}:null,signatures:async()=>({version:'fresh',at:now}),
    async install(){calls.push('install');if(installFail)throw new Error('Synthetic engine offline');installed=true;},
    async update(){calls.push('update');if(updateFail)throw new Error('Synthetic signature outage');return {version:'fresh',at:now};}};
  const options={directory:path.join(root,'antivirus'),platform:'win32',arch:'x64',engine,store:{prepare:async()=>{},list:async()=>[]},run:async()=>'',clock:()=>now,scope:[path.join(root,'targets')]};
  function manager(extra={}){const value=new AntivirusManager({...options,...extra});value.scan=async()=>{calls.push('scan');return {ok:true};};return value;}
  return {root,calls,engine,options,manager,advance:ms=>{now+=ms;},setInstalled:value=>{installed=value;},failInstall:value=>{installFail=value;},failUpdate:value=>{updateFail=value;},async close(){assert.ok(root.startsWith(parent+path.sep));await rm(root,{recursive:true,force:true});}};
}

test('fresh Windows x64 agent installs and activates after its first confirmed protect policy',async()=>{
  const f=await fixture();try{
    const manager=f.manager();await manager.maintain();assert.deepEqual(f.calls,[]);
    await manager.setPolicy('protect');await manager.maintain();assert.deepEqual(f.calls,['install','update']);
    const state=await manager.snapshot();assert.equal(state.installed,true);assert.equal(state.enabled,true);assert.equal(state.state,'ready');
    assert.ok([...manager.events.values()].some(event=>event.title.includes('installé')));
    await manager.maintain();assert.deepEqual(f.calls,['install','update','scan']);
    f.advance(3600000);await manager.maintain();assert.deepEqual(f.calls,['install','update','scan','update','scan']);
    const saved=JSON.parse(await readFile(path.join(f.options.directory,'state.json'),'utf8'));assert.equal(saved.paused,false);assert.ok(saved.lastUpdateAttempt>0);
  }finally{await f.close();}
});

test('startup scheduler runs installation without a browser or a remote install command',async()=>{
  const f=await fixture(),controller=new AbortController();try{
    const manager=f.manager();await manager.setPolicy('protect');manager.start({signal:controller.signal});
    const deadline=Date.now()+4000;while(!f.calls.includes('update')&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,25));
    assert.deepEqual(f.calls,['install','update']);
  }finally{controller.abort();await f.close();}
});

test('installation outage backs off for one hour, including after restart, then retries automatically',async()=>{
  const f=await fixture();try{
    f.failInstall(true);let manager=f.manager();await manager.setPolicy('protect');assert.equal((await manager.maintain()).ok,false);
    assert.equal(manager.state.state,'error');await manager.maintain();assert.deepEqual(f.calls,['install']);
    manager=f.manager();await manager.setPolicy('protect');await manager.maintain();assert.deepEqual(f.calls,['install']);
    f.advance(3600000);f.failInstall(false);await manager.maintain();assert.deepEqual(f.calls,['install','install','update']);assert.equal((await manager.snapshot()).enabled,true);
  }finally{await f.close();}
});

test('failed first signatures cannot leave automatic activation stuck with a disabled installed engine',async()=>{
  const f=await fixture();try{
    f.failUpdate(true);const manager=f.manager();await manager.setPolicy('protect');assert.equal((await manager.maintain()).ok,false);
    assert.equal(manager.enabled,false);assert.equal((await manager.snapshot()).installed,true);
    await manager.maintain();assert.deepEqual(f.calls,['install','update']);
    f.advance(3600000);f.failUpdate(false);await manager.maintain();assert.equal((await manager.snapshot()).enabled,true);
  }finally{await f.close();}
});

test('explicit pause survives restart; signatures remain maintained without resuming surveillance',async()=>{
  const f=await fixture();try{
    let manager=f.manager();await manager.setPolicy('protect');await manager.maintain();await manager.execute('av-pause');
    manager=f.manager();await manager.setPolicy('protect');f.advance(3600000);await manager.maintain();
    assert.deepEqual(f.calls,['install','update','update']);assert.equal(manager.paused,true);assert.equal((await manager.snapshot()).enabled,false);
    await manager.execute('av-resume');await manager.maintain();assert.equal(f.calls.at(-1),'scan');
  }finally{await f.close();}
});

test('observe policy, a pause before installation, unsupported OS and unsupported architecture do not auto-install',async()=>{
  const f=await fixture();try{
    const manager=f.manager();await manager.setPolicy('observe');await manager.maintain();assert.deepEqual(f.calls,[]);
    await manager.setPolicy('protect');await manager.execute('av-pause');await manager.maintain();assert.deepEqual(f.calls,[]);
    for(const options of [{platform:'linux'},{arch:'arm64'}]){const unsupported=f.manager({directory:path.join(f.root,options.platform||options.arch),...options});await unsupported.setPolicy('protect');await unsupported.maintain();}
    assert.deepEqual(f.calls,[]);
  }finally{await f.close();}
});

test('older saved disabled state is preserved as an intentional pause',async()=>{
  const f=await fixture();try{
    await mkdir(f.options.directory);await writeFile(path.join(f.options.directory,'state.json'),JSON.stringify({enabled:false,monitorAllowed:true}));
    const manager=f.manager();await manager.setPolicy('protect');await manager.maintain();assert.equal(manager.paused,true);assert.deepEqual(f.calls,[]);
  }finally{await f.close();}
});

test('unreadable local choices cannot be overwritten by automatic activation',async()=>{
  const f=await fixture();try{
    await mkdir(f.options.directory);const file=path.join(f.options.directory,'state.json');await writeFile(file,'{invalid');
    const manager=f.manager();await manager.setPolicy('protect');await manager.maintain();
    assert.deepEqual(f.calls,[]);assert.equal(manager.state.state,'error');assert.equal(await readFile(file,'utf8'),'{invalid');
  }finally{await f.close();}
});

test('the next approved engine replaces an older installed version automatically',async()=>{
  const f=await fixture();try{
    const definition=JSON.parse(await readFile(new URL('../agent/antivirus-dependencies.json',import.meta.url),'utf8'));
    const directory=path.join(f.options.directory,'runtime');await mkdir(directory,{recursive:true});
    await writeFile(path.join(directory,'engine.verified.json'),JSON.stringify({version:'0.0.0',archiveHash:'old'}));
    await writeFile(path.join(f.options.directory,'state.json'),JSON.stringify({enabled:true,paused:false}));
    let downloads=0;
    const engine=new ClamEngine(directory,{platform:'win32',arch:'x64',download:async target=>{downloads++;await writeFile(target,'fixture');},run:async(_file,args)=>{
      const target=path.join(args[args.indexOf('-Directory')+1],definition.windowsX64.directory);await mkdir(target,{recursive:true});
      await writeFile(path.join(target,'clamscan.exe'),'fixture scanner');await writeFile(path.join(target,'freshclam.exe'),'fixture updater');
    }});
    engine.update=async()=>({at:Date.now(),version:'fresh'});engine.signatures=engine.update;
    const manager=f.manager({engine});await manager.setPolicy('protect');await manager.maintain();
    assert.equal(downloads,1);const state=await manager.snapshot();assert.equal(state.engineVersion,definition.version);assert.equal(state.enabled,true);
    await manager.maintain();assert.equal(downloads,1);
  }finally{await f.close();}
});

test('pause cancels automatic installation and cannot be overwritten by a late completion',async()=>{
  const f=await fixture();try{
    let started;const ready=new Promise(resolve=>{started=resolve;});
    f.engine.install=async({signal})=>{f.calls.push('install');started();await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('Cancelled')),{once:true}));};
    const manager=f.manager();await manager.setPolicy('protect');const pending=manager.maintain();await ready;
    await manager.execute('av-pause');assert.equal((await pending).ok,false);assert.equal(manager.paused,true);assert.equal(manager.enabled,false);
    await manager.maintain();assert.deepEqual(f.calls,['install']);assert.equal(manager.state.state,'paused');
  }finally{await f.close();}
});

test('hourly signature retries persist across restart even when the existing database is recent',async()=>{
  const f=await fixture();try{
    let manager=f.manager();await manager.setPolicy('protect');await manager.maintain();f.advance(3600000);f.failUpdate(true);await manager.maintain();
    assert.equal(f.calls.filter(call=>call==='update').length,2);
    manager=f.manager();await manager.setPolicy('protect');await manager.maintain();assert.equal(f.calls.filter(call=>call==='update').length,2);
    f.advance(3600000);f.failUpdate(false);await manager.maintain();assert.equal(f.calls.filter(call=>call==='update').length,3);
  }finally{await f.close();}
});

test('FreshClam uses official DNS checks and cannot confirm stale signatures as updated',async()=>{
  const f=await fixture();try{
    let at=Date.now()-4*86400000;
    const engine=new ClamEngine(path.join(f.root,'engine'),{run:async()=>''});engine.paths=async()=>({updater:'synthetic-updater'});engine.signatures=async()=>({at,version:'123'});
    await assert.rejects(engine.update(),/anciennes/);at=Date.now();await engine.update();
    assert.match(await readFile(path.join(f.root,'engine/freshclam.conf'),'utf8'),/DNSDatabaseInfo current\.cvd\.clamav\.net/);
  }finally{await f.close();}
});
