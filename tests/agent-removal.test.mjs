import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {uninstallCommand} from '../agent/uninstall-command.mjs';

const hashes={'WolfGuard-Uninstaller.ps1.txt':'a'.repeat(64),'WolfGuard-Uninstaller.sh.txt':'b'.repeat(64)};
const command=platform=>uninstallCommand(platform,hashes,'https://wolfguard.wavetools.fr/?access=private-application-key');
test('remote uninstall pins scripts, hides windows, checks permissions before launch and stays within the terminal limit',()=>{
  for(const platform of ['win32','linux','darwin']){
    const text=command(platform);assert.ok(text.length<8000);assert.ok(!text.includes('private-application-key'));
    assert.ok(text.includes('WOLFGUARD_UNINSTALL_READY'));assert.ok(text.includes(hashes[platform==='win32'?'WolfGuard-Uninstaller.ps1.txt':'WolfGuard-Uninstaller.sh.txt']));
    assert.ok(text.indexOf(platform==='win32'?'& $file -CheckOnly':'sh "$stage/Uninstaller.sh" --check')<text.indexOf(platform==='win32'?"Start-Process -FilePath":"systemd-run" )||platform==='darwin');
    assert.ok(!text.includes('sudo'));assert.ok(!text.includes('RunAs'));
  }
  assert.ok(command('win32').includes('-WindowStyle Hidden'));
  assert.throws(()=>uninstallCommand('__proto__',hashes));
  assert.throws(()=>uninstallCommand('win32',{'WolfGuard-Uninstaller.ps1.txt':"';Remove-X;#"}));
  assert.throws(()=>uninstallCommand('linux',hashes,'http://untrusted.example/'));
});
test('published scripts match the hashes embedded in the browser bootstrap',()=>{
  const fixture=vm.createContext({URL});vm.runInContext(readFileSync(new URL('../app/js/agent-uninstall-command.js',import.meta.url),'utf8'),fixture);
  for(const [platform,file] of [['win32','WolfGuard-Uninstaller.ps1.txt'],['linux','WolfGuard-Uninstaller.sh.txt']]){
    const hash=createHash('sha256').update(readFileSync(new URL('../app/downloads/'+file,import.meta.url))).digest('hex');
    assert.ok(vm.runInContext(`WolfGuardUninstallCommand.command('${platform}')`,fixture).includes(hash));
  }
});
test('PowerShell uninstall and detached launcher parse without running them',{skip:process.platform!=='win32'},()=>{
  const parser=String.raw`$code=[Console]::In.ReadToEnd();$tokens=$null;$errors=$null;$ast=[System.Management.Automation.Language.Parser]::ParseInput($code,[ref]$tokens,[ref]$errors);if($errors.Count){$errors|ForEach-Object{[Console]::Error.WriteLine($_.Message)};exit 1};$helper=$ast.FindAll({param($node) $node -is [System.Management.Automation.Language.StringConstantExpressionAst] -and $node.Value.Contains('__STAGE__')},$true)|Select-Object -First 1;if($helper){$inner=$helper.Value.Replace('__STAGE__',"'C:\Temp\WolfGuard-uninstall-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'");$null=[System.Management.Automation.Language.Parser]::ParseInput($inner,[ref]$tokens,[ref]$errors);if($errors.Count){$errors|ForEach-Object{[Console]::Error.WriteLine($_.Message)};exit 1}}`;
  for(const input of [command('win32'),readFileSync(new URL('../agent/Uninstaller.ps1',import.meta.url),'utf8')]){
    const result=spawnSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',parser],{input,encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);
  }
});
test('POSIX uninstallers and launchers parse without executing any removal',()=>{
  const shell=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'/bin/sh';
  assert.ok(existsSync(shell));
  for(const input of [command('linux'),command('darwin'),readFileSync(new URL('../agent/Uninstaller.sh',import.meta.url),'utf8')]){
    const result=spawnSync(shell,['-n'],{input,encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);
  }
});
test('POSIX removal acts only on an isolated fixture and check-only leaves its files untouched',()=>{
  const folder=mkdtempSync(path.join(tmpdir(),'wolfguard-uninstall-test-'));
  const posix=value=>process.platform==='win32'?value.replaceAll('\\','/').replace(/^([A-Za-z]):/,(_,drive)=>'/'+drive.toLowerCase()):value;
  const shell=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'/bin/sh';
  const home=path.join(folder,'account'),target=path.join(home,'WolfGuardAgent'),bin=path.join(folder,'bin'),unit=path.join(home,'.config/systemd/user/wolfguard-agent.service');
  // Only this synthetic directory is ever passed as the uninstall target.
  assert.ok(path.resolve(target).startsWith(path.resolve(folder)+path.sep));
  try{
    mkdirSync(target,{recursive:true});mkdirSync(bin);mkdirSync(path.dirname(unit),{recursive:true});
    writeFileSync(path.join(target,'credential.json'),'synthetic fixture only');
    writeFileSync(unit,'ExecStart='+posix(target)+'/background-app/test/agent/agent.mjs\n');
    writeFileSync(path.join(bin,'uname'),'#!/bin/sh\necho Linux\n',{mode:0o700});
    writeFileSync(path.join(bin,'systemctl'),'#!/bin/sh\nexit 0\n',{mode:0o700});
    writeFileSync(path.join(bin,'id'),'#!/bin/sh\nif [ "$1" = -u ]; then echo 999999; else /usr/bin/id "$@"; fi\n',{mode:0o700});
    const script=posix(new URL('../agent/Uninstaller.sh',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
    const run=(arg,extra={})=>spawnSync(shell,['-c','export PATH="$1:/usr/bin:/bin"; export HOME="$2"; export WOLFGUARD_AGENT_HOME="$3"; exec /bin/sh "$4" "$5"','fixture',posix(bin),posix(home),extra.WOLFGUARD_AGENT_HOME||posix(target),script,arg||''],{encoding:'utf8',windowsHide:true});
    let result=run('--check');assert.equal(result.status,0,result.stderr);assert.ok(existsSync(target));assert.ok(existsSync(unit));
    result=run('--check',{WOLFGUARD_AGENT_HOME:posix(home)});assert.notEqual(result.status,0);assert.ok(existsSync(target));
    result=run();assert.equal(result.status,0,result.stderr);assert.ok(!existsSync(target));assert.ok(!existsSync(unit));assert.ok(existsSync(home));
  }finally{
    assert.ok(path.resolve(folder).startsWith(path.resolve(tmpdir())+path.sep));
    rmSync(folder,{recursive:true,force:true});
  }
});

function setup({rights=true,perAgent=true,online=true,capabilities=['remote-consent-v1','remote-terminal-v1'],lock=false,revoke=false,failed=false,lost=false,marker=true}={}){
  let allowed=rights,submitted=false;const calls=[],state={vaultKey:{}},agent={id:'a'.repeat(32),name:'Poste test',platform:'win32',online,capabilities};
  const cloud={hasSession:()=>true,currentUser:()=>({id:'owner'}),can:()=>allowed,agentRequest:async(path,body)=>{
    calls.push({path,body});
    if(path==='agents')return {agents:[agent]};
    if(path==='remote/start'){if(lock)state.vaultKey=null;if(revoke)allowed=false;return {id:'test-session'};}
    if(path==='remote/terminal/command'){submitted=true;return {};}
    if(path.startsWith('remote/session')){
      if(submitted&&lost)throw new Error('Network lost');
      return {status:'active',commands:submitted?[{seq:1,status:failed?'failed':'completed',stderr:failed?'Droits administrateur nécessaires':'',stdout:marker?'WOLFGUARD_UNINSTALL_READY\n':'unrelated'}]:[]};
    }
    return {};
  }};
  const fixture=vm.createContext({URL,state,WolfGuardCloud:cloud,WolfGuardAccess:{can:()=>allowed,canAgent:()=>perAgent},WolfGuardUninstallCommand:{command},location:{href:'https://wolfguard.wavetools.fr/'},setTimeout:callback=>{queueMicrotask(callback);return 0;}});
  vm.runInContext(readFileSync(new URL('../app/js/agent-removal.js',import.meta.url),'utf8'),fixture);
  return {api:fixture.WolfGuardAgentRemoval,calls,agent};
}
test('confirmed launch is distinct from completed removal, closes the terminal and never revokes the machine',async()=>{
  const {api,calls,agent}=setup();await api.start(agent);
  assert.equal(api.state(agent.id).status,'launched');assert.equal(api.state(agent.id).running,false);
  assert.equal(calls.filter(item=>item.path==='remote/terminal/command').length,1);
  assert.equal(calls.at(-1).path,'remote/stop');assert.ok(!calls.some(item=>item.path==='agents/revoke'));
  await assert.rejects(api.start(agent),/déjà été lancée/);
});
test('offline, obsolete, unsupported and unauthorized agents cannot receive an uninstall command',async()=>{
  for(const options of [{rights:false},{perAgent:false},{online:false},{capabilities:[]}]){
    const {api,calls,agent}=setup(options);await assert.rejects(api.start(agent));assert.equal(calls.length,0);
  }
  const {api,calls,agent}=setup();await assert.rejects(api.start({...agent,platform:'other'}));assert.equal(calls.length,0);
});
test('session locking and permission loss stop the flow before sending the command',async()=>{
  for(const options of [{lock:true},{revoke:true}]){
    const {api,calls,agent}=setup(options);await api.start(agent);assert.equal(api.state(agent.id).status,'failed');
    assert.equal(calls.filter(item=>item.path==='remote/terminal/command').length,0);
  }
});
test('preflight failures stay actionable; lost replies and missing launch receipt remain unconfirmed',async()=>{
  for(const [options,status] of [[{failed:true},'failed'],[{lost:true},'unknown'],[{marker:false},'unknown']]){
    const {api,calls,agent}=setup(options);await api.start(agent);assert.equal(api.state(agent.id).status,status);
    assert.equal(calls.at(-1).path,'remote/stop');
    assert.ok(!calls.some(item=>item.path==='agents/revoke'));
  }
});
