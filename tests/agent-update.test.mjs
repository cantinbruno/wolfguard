import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {createAutoUpdater,installUpdate,UPDATE_INTERVAL,UPDATE_RETRY} from '../agent/auto-update.mjs';
import {runAgent} from '../agent/agent.mjs';

const secret='1234567890abcdef'.repeat(4),context=vm.createContext({URL,location:{href:'https://wolfguard.wavetools.fr/?access='+secret}});
const updateCommands=readFileSync(new URL('../app/js/agent-update-command.js',import.meta.url),'utf8');
vm.runInContext(updateCommands,context);
vm.runInContext(readFileSync(new URL('../app/js/agent-updates.js',import.meta.url),'utf8'),context);
const release={version:'a'.repeat(64),files:{'WolfGuard-Agent-Windows.exe':'b'.repeat(64),'WolfGuard-Agent-Linux.zip':'c'.repeat(64),'WolfGuard-Agent-macOS.zip':'d'.repeat(64)}};
const command=platform=>context.WolfGuardAgentUpdates.command(platform,release);

test('remote updates pin published checksums, preserve credentials and never transmit the private application link',()=>{
  for(const platform of ['win32','linux','darwin']){
    const script=command(platform);assert.ok(script.length<8000);assert.ok(!script.includes(secret));assert.ok(!script.includes('--pair-code'));
    assert.ok(script.includes('WOLFGUARD_UPDATE_READY'));assert.ok(script.includes(platform==='win32'?'--install-update':'--update'));
    assert.ok(script.includes(release.files[platform==='win32'?'WolfGuard-Agent-Windows.exe':platform==='linux'?'WolfGuard-Agent-Linux.zip':'WolfGuard-Agent-macOS.zip']));
  }
  assert.throws(()=>context.WolfGuardAgentUpdates.command('win32',{version:'a'.repeat(64),files:{'WolfGuard-Agent-Windows.exe':"';Invoke-X;#"}}));
  assert.throws(()=>context.WolfGuardAgentUpdates.command('__proto__',release));
});

test('Windows update and detached helper are valid PowerShell without executing an installer',{skip:process.platform!=='win32'},()=>{
  const parser=String.raw`$code=[Console]::In.ReadToEnd();$tokens=$null;$errors=$null;$ast=[System.Management.Automation.Language.Parser]::ParseInput($code,[ref]$tokens,[ref]$errors);if($errors.Count){$errors|ForEach-Object{[Console]::Error.WriteLine($_.Message)};exit 1};$helper=$ast.FindAll({param($node) $node -is [System.Management.Automation.Language.StringConstantExpressionAst] -and $node.Value.Contains('__STAGE__')},$true)|Select-Object -First 1;if(-not $helper){throw 'Missing detached helper'};$inner=$helper.Value.Replace('__STAGE__',"'C:\Temp\WolfGuard-update-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'");$null=[System.Management.Automation.Language.Parser]::ParseInput($inner,[ref]$tokens,[ref]$errors);if($errors.Count){$errors|ForEach-Object{[Console]::Error.WriteLine($_.Message)};exit 1}`;
  const result=spawnSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',parser],{input:command('win32'),encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);
});

test('POSIX update commands parse and use independent supervisors for restarting a live service',()=>{
  const shell=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'/bin/sh';if(!existsSync(shell))return;
  for(const platform of ['linux','darwin']){const result=spawnSync(shell,['-n'],{input:command(platform),encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);}
  assert.ok(command('linux').includes('systemd-run --user --collect'));assert.ok(command('darwin').includes('launchctl submit'));
});

function updateFixture({lock=false,revoke=false,confirm=false,rights=true}={}){
  const state={vaultKey:{}},calls=[];let allowed=rights,clock=1000;
  const cloud={hasSession:()=>true,currentUser:()=>({id:'owner'}),can:()=>allowed,agentRequest:async(path,data)=>{
    calls.push({path,data});
    if(path==='remote/start'){if(lock)state.vaultKey=null;return {id:'synthetic-session'};}
    if(path.startsWith('remote/session')){if(revoke)allowed=false;return {status:'active',commands:[{seq:1,status:'completed',stdout:'WOLFGUARD_UPDATE_READY'}]};}
    if(path==='agents')return {agents:[{id:'a'.repeat(32),online:true,version:confirm?release.version:'0'.repeat(64)}]};
    return {};
  }};
  const fixture=vm.createContext({URL,AbortSignal,state,WolfGuardCloud:cloud,Date:class extends Date{static now(){return clock;}},location:{href:'https://example.invalid/'},setTimeout:callback=>{queueMicrotask(callback);return 0;},fetch:async()=>({ok:true,json:async()=>release})});
  vm.runInContext(updateCommands,fixture);
  vm.runInContext(readFileSync(new URL('../app/js/agent-updates.js',import.meta.url),'utf8'),fixture);
  return {fixture,calls,advance:ms=>{clock+=ms;},agent:{id:'a'.repeat(32),platform:'win32',online:true,version:'0'.repeat(64),capabilities:['remote-terminal-v1']}};
}

test('installer readiness is not success until that same agent reports the published version',async()=>{
  const {fixture,calls,agent}=updateFixture();await fixture.WolfGuardAgentUpdates.start(agent);
  const result=fixture.WolfGuardAgentUpdates.state(agent.id);
  assert.equal(result.status,'failed');assert.equal(result.running,false);
  assert.match(result.message,/pas été confirmée/);
  assert.equal(calls.filter(call=>call.path==='remote/terminal/command').length,1);
});

test('locking the workspace or losing update rights prevents sending the installer command',async()=>{
  for(const options of [{lock:true},{revoke:true}]){
    const {fixture,calls,agent}=updateFixture(options);await fixture.WolfGuardAgentUpdates.start(agent);
    assert.equal(fixture.WolfGuardAgentUpdates.state(agent.id).status,'failed');
    assert.equal(calls.filter(call=>call.path==='remote/terminal/command').length,0);
  }
});

test('legacy agents upgrade automatically once, with retries bounded after failure',async()=>{
  const {fixture,calls,agent,advance}=updateFixture();
  await Promise.all([fixture.WolfGuardAgentUpdates.automatic([agent]),fixture.WolfGuardAgentUpdates.automatic([agent])]);
  assert.equal(calls.filter(call=>call.path==='remote/terminal/command').length,1);
  assert.equal(fixture.WolfGuardAgentUpdates.state(agent.id).status,'failed');
  await fixture.WolfGuardAgentUpdates.automatic([agent]);
  assert.equal(calls.filter(call=>call.path==='remote/terminal/command').length,1);
  advance(UPDATE_RETRY);
  await fixture.WolfGuardAgentUpdates.automatic([agent]);
  assert.equal(calls.filter(call=>call.path==='remote/terminal/command').length,2);
});

test('automatic bootstrap skips current, autonomous, offline and unsupported agents; reconnect triggers it',async()=>{
  const {fixture,calls,agent}=updateFixture({confirm:true});
  for(const change of [{version:release.version},{online:false},{local:true},{platform:'unsupported'},{capabilities:[]},{capabilities:['remote-terminal-v1','auto-update-v1']}]){
    await fixture.WolfGuardAgentUpdates.automatic([{...agent,...change}]);
  }
  assert.equal(calls.length,0);
  await fixture.WolfGuardAgentUpdates.automatic([agent]);
  assert.equal(calls.filter(call=>call.path==='remote/terminal/command').length,1);
  assert.equal(fixture.WolfGuardAgentUpdates.state(agent.id).status,'completed');
});

test('automatic bootstrap respects write rights and locking',async()=>{
  for(const options of [{rights:false},{lock:true},{revoke:true}]){
    const {fixture,calls,agent}=updateFixture(options);
    await fixture.WolfGuardAgentUpdates.automatic([agent]);
    assert.equal(calls.filter(call=>call.path==='remote/terminal/command').length,0);
  }
});

test('installed agents check releases periodically without a browser and never reinstall the current version',async()=>{
  let clock=1000,checks=0,installs=0;
  const check=createAutoUpdater({version:release.version,now:()=>clock,release:async()=>{checks++;return release;},install:async()=>{installs++;}});
  assert.equal(await check(),false);assert.equal(await check(),false);
  assert.equal(checks,1);clock+=UPDATE_INTERVAL;await check();
  assert.equal(checks,2);assert.equal(installs,0);
});

test('autonomous installs preserve the version target and prevent concurrent launch or rapid retries',async()=>{
  let installs=0,clock=1000;const states=[];
  const check=createAutoUpdater({platform:'linux',version:'0'.repeat(64),now:()=>clock,release:async()=>release,install:async(platform,target)=>{assert.equal(platform,'linux');assert.equal(target.version,release.version);installs++;}});
  const result=await Promise.all([check({onStatus:(_,value)=>states.push(value.state)}),check()]);
  assert.deepEqual(result,[true,false]);assert.equal(installs,1);assert.deepEqual(states,['updating','updating']);
  await check();assert.equal(installs,1);clock+=UPDATE_RETRY;await check();assert.equal(installs,2);
});

test('failed, invalid and aborted autonomous checks keep the current installation and back off',async()=>{
  for(const failure of ['offline','invalid','install','abort']){
    let clock=1000,checks=0,installs=0;const cancel=new AbortController();
    const check=createAutoUpdater({platform:'win32',version:'0'.repeat(64),now:()=>clock,release:async()=>{
      checks++;if(failure==='offline')throw new Error('offline');if(failure==='abort')cancel.abort();return failure==='invalid'?{...release,files:{}}:release;
    },install:async()=>{installs++;throw new Error('checksum mismatch');}});
    assert.equal(await check({signal:cancel.signal}),false);
    assert.equal(installs,failure==='install'?1:0);
    await check();assert.equal(checks,1);
    clock+=UPDATE_RETRY;await check();assert.equal(checks,2);
  }
});

test('autonomous commands pin the public origin and checksums, run invisibly and require installer readiness',async()=>{
  for(const platform of ['win32','linux','darwin']){
    let calls=0;
    const run=async(file,args,options)=>{
      calls++;const script=platform==='win32'?Buffer.from(args.at(-1),'base64').toString('utf16le'):options.input;
      assert.equal(file,platform==='win32'?'powershell.exe':'/bin/sh');
      assert.ok(script.includes('https://wolfguard.wavetools.fr/downloads/'));
      assert.ok(!script.includes(secret));assert.ok(!script.includes('--pair-code'));
      assert.ok(script.includes(release.files[platform==='win32'?'WolfGuard-Agent-Windows.exe':platform==='linux'?'WolfGuard-Agent-Linux.zip':'WolfGuard-Agent-macOS.zip']));
      if(platform==='win32')assert.ok(script.includes('-WindowStyle Hidden'));
      return 'WOLFGUARD_UPDATE_READY';
    };
    await installUpdate(platform,release,{run});assert.equal(calls,1);
    await assert.rejects(installUpdate(platform,release,{run:async()=>''}),/non confirmée/);
  }
});

test('agent loop checks updates only following a successful idle poll, after the active task',async()=>{
  const cancel=new AbortController();let polls=0,checks=0,remoteFinished=false;
  const client={post:async(route,body)=>{
    assert.equal(route,'poll');assert.ok(body.capabilities.includes('auto-update-v1'));polls++;
    return polls===1?{remote:{id:'synthetic'}}:{job:null};
  }};
  await runAgent(client,{signal:cancel.signal,pollMs:1,protectionRunner:async()=>{},remoteRunner:async()=>{assert.equal(checks,0);remoteFinished=true;},updateChecker:async()=>{assert.ok(remoteFinished);checks++;cancel.abort();}});
  assert.equal(checks,1);assert.equal(polls,2);
});

test('published installers contain the updater and every static local JavaScript module dependency',()=>{
  const script=String.raw`from pathlib import Path
import re,posixpath,zipfile
for filename in Path('app/downloads').glob('WolfGuard-Agent-*.zip'):
    with zipfile.ZipFile(filename) as archive:
        names=set(archive.namelist())
        assert 'agent/auto-update.mjs' in names, filename
        assert 'agent/update-command.mjs' in names, filename
        for name in names:
            if not name.endswith('.mjs'): continue
            source=archive.read(name).decode('utf-8-sig')
            for target in re.findall(r'''(?:from\s*|import\s*\()\s*['"](\.[^'"]+\.mjs)['"]''',source):
                resolved=posixpath.normpath(posixpath.join(posixpath.dirname(name),target))
                assert resolved in names, (str(filename),name,resolved)
`;
  const result=spawnSync('python',['-c',script],{cwd:new URL('..',import.meta.url),encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);
});
