import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';

const secret='1234567890abcdef'.repeat(4),context=vm.createContext({URL,location:{href:'https://wolfguard.wavetools.fr/?access='+secret}});
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

function updateFixture({lock=false,revoke=false}={}){
  const state={vaultKey:{}},calls=[];let allowed=true;
  const cloud={hasSession:()=>true,currentUser:()=>({id:'owner'}),can:()=>allowed,agentRequest:async(path,data)=>{
    calls.push({path,data});
    if(path==='remote/start'){if(lock)state.vaultKey=null;return {id:'synthetic-session'};}
    if(path.startsWith('remote/session')){if(revoke)allowed=false;return {status:'active',commands:[{seq:1,status:'completed',stdout:'WOLFGUARD_UPDATE_READY'}]};}
    if(path==='agents')return {agents:[{id:'a'.repeat(32),online:true,version:'0'.repeat(64)}]};
    return {};
  }};
  const fixture=vm.createContext({URL,AbortSignal,state,WolfGuardCloud:cloud,location:{href:'https://example.invalid/'},setTimeout:callback=>{queueMicrotask(callback);return 0;},fetch:async()=>({ok:true,json:async()=>release})});
  vm.runInContext(readFileSync(new URL('../app/js/agent-updates.js',import.meta.url),'utf8'),fixture);
  return {fixture,calls,agent:{id:'a'.repeat(32),platform:'win32',online:true,version:'0'.repeat(64),capabilities:['remote-terminal-v1']}};
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
