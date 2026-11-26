import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {AntivirusManager} from '../agent/antivirus.mjs';

async function fixture(){
  const base=path.resolve('.cache');await mkdir(base,{recursive:true});const root=await mkdtemp(path.join(base,'antivirus-startup-'));
  const directory=path.join(root,'private-antivirus');await mkdir(directory);
  const engine={paths:async()=>({version:'installed-fixture'}),signatures:async()=>({version:'current-signatures',at:Date.now()}),scan:async()=>{throw new Error('Scanner must not run in this diagnostic');}};
  const create=extra=>new AntivirusManager({directory,scope:[root],engine,store:{prepare:async()=>{},list:async()=>[]},run:async()=>'',...extra});
  return {root,directory,create,async close(){assert.ok(root.startsWith(base+path.sep));await rm(root,{recursive:true,force:true});}};
}

test('the Windows system drive is in scope immediately, even before a signature update discovers disks',{skip:process.platform!=='win32'},()=>{
  const home=path.resolve('C:/Users/Fixture');const manager=new AntivirusManager({platform:'win32',home,directory:path.join(home,'AppData/Local/WolfGuardAgent/antivirus')});
  assert.deepEqual(manager.scope,[path.parse(home).root]);
});

test('a watched parent may contain the antivirus store; traversal excludes only the store contents',async()=>{
  const f=await fixture();try{
    await writeFile(path.join(f.root,'ordinary-file.txt'),'harmless fixture');await writeFile(path.join(f.directory,'private-file.txt'),'private fixture');
    const manager=f.create();assert.deepEqual(manager.scope,[f.root]);
    const {files}=await manager.candidates({limit:5});assert.deepEqual(files.map(file=>path.basename(file.file)),['ordinary-file.txt']);
    const refused=f.create({scope:[f.directory,path.join(f.directory,'database')]});assert.deepEqual(refused.scope,[]);
  }finally{await f.close();}
});

test('restart reconstructs truthful installed status from engine and signature evidence',async()=>{
  const f=await fixture();try{
    for(const lastScanAt of [0,Date.now()-60000]){
      await writeFile(path.join(f.directory,'state.json'),JSON.stringify({enabled:true,paused:false,monitorAllowed:true,lastScanAt}));
      const state=await f.create().snapshot();assert.equal(state.installed,true);assert.equal(state.enabled,true);assert.equal(state.state,'ready');assert.match(state.message,/ClamAV installé et signatures à jour/);assert.doesNotMatch(state.message,/pas encore installé/);
    }
  }finally{await f.close();}
});

test('an empty watch scope never appears ready and cannot produce a successful empty scan',async()=>{
  const f=await fixture();try{
    await writeFile(path.join(f.directory,'state.json'),JSON.stringify({enabled:true,paused:false}));
    const manager=f.create({scope:[]}),state=await manager.snapshot();assert.equal(state.state,'error');assert.match(state.message,/Aucun disque/);
    await assert.rejects(manager.scan(),/Aucun disque/);assert.equal(manager.state.lastScanAt,0);
  }finally{await f.close();}
});
