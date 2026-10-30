import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {parseSS,parseProcNet,parseLsof,parseNeighbors,collectPosixPassive,collectPosixSecurity,evaluatePosixSecurity} from '../agent/posix.mjs';
import {diskCredentialStore,agentDirectory} from '../agent/agent.mjs';

const missing = () => { const error = new Error('Unavailable in fixture'); error.code = 'ENOENT'; throw error; };
const proc4 = '  sl  local_address rem_address st\n  0: 0100007F:0016 00000000:0000 0A 00000000:00000000 00:00000000 00000000 1000 0 1234';
const proc6 = '0: 00000000000000000000000001000000:01BB 00000000000000000000000000000000:0000 0A';
const lsof = 'p123\ncnode\nf22\nPTCP\nn127.0.0.1:8080\nTST=LISTEN\nf23\nPTCP\nn[::1]:54000->[::1]:443\nTST=ESTABLISHED\np456\ncmDNSResponder\nf12\nPUDP\nn*:5353\n';

test('Linux socket parsers preserve TCP, UDP, process ownership and IPv6 endpoints',()=>{
  const rows=parseSS('tcp LISTEN 0 128 0.0.0.0:22 0.0.0.0:* users:(("sshd",pid=42,fd=3))\nudp UNCONN 0 0 [::]:5353 [::]:*\ntcp ESTAB 0 0 [fe80::1%eth0]:51000 [fe80::2%eth0]:443');
  assert.equal(rows.length,3);assert.equal(rows[0].status,'listening');assert.equal(rows[0].pid,42);assert.equal(rows[0].processName,'sshd');
  assert.equal(rows[1].transport,'UDP');assert.equal(rows[1].status,'bound');assert.equal(rows[2].remoteAddress,'fe80::2%eth0');
  assert.equal(parseProcNet(proc4)[0].address,'127.0.0.1');assert.equal(parseProcNet(proc4)[0].port,22);
  assert.equal(parseProcNet(proc6,'TCP',true)[0].address,'0000:0000:0000:0000:0000:0000:0000:0001');
  assert.equal(parseProcNet(proc6,'TCP',true)[0].port,443);
});

test('macOS lsof parser keeps multiple sockets per process and independent IPv6 peers',()=>{
  const rows=parseLsof(lsof);assert.equal(rows.length,3);
  assert.equal(rows[0].port,8080);assert.equal(rows[0].pid,123);assert.equal(rows[0].status,'listening');
  assert.equal(rows[1].remoteAddress,'::1');assert.equal(rows[1].remotePort,443);assert.equal(rows[1].processName,'node');
  assert.equal(rows[2].pid,456);assert.equal(rows[2].status,'bound');assert.equal(rows[2].address,'0.0.0.0');
  assert.deepEqual(parseLsof(''),[]);
});

test('ARP and NDP retain cache uncertainty and skip unresolved neighbors',()=>{
  const rows=parseNeighbors('? (192.168.1.1) at a:b:c:d:e:f on en0 ifscope [ethernet]\nfe80::1%en0 00:11:22:33:44:55 en0 23h59m S R\n192.168.1.2 0x1 0x0 00:00:00:00:00:00 * eth0\n192.168.1.3 0x1 0x2 00:11:22:33:44:66 * eth0');
  assert.equal(rows.length,3);assert.equal(rows[1].transport,'NDP');assert.equal(rows[2].interfaceName,'eth0');
  assert.ok(rows.every(row=>row.status==='observed'&&row.detail.includes('non confirmée')));
});

test('POSIX passive collectors use local read-only commands and Linux falls back without iproute2',async()=>{
  const calls=[];
  const run=async(file,args)=>{calls.push([file,args]);if(file==='/usr/sbin/lsof')return lsof;if(file==='/usr/sbin/arp')return '? (192.168.1.1) at 00:11:22:33:44:55 on en0';if(file==='/usr/sbin/ndp')return '';missing();};
  const mac=await collectPosixPassive(undefined,{platform:'darwin',run});assert.equal(mac.results.length,4);
  assert.equal(calls.length,3);assert.ok(calls.every(([file])=>!file.includes('ping')));
  const files={'/proc/net/arp':'192.168.1.1 0x1 0x2 00:11:22:33:44:55 * eth0','/proc/net/tcp':proc4,'/proc/net/tcp6':proc6,'/proc/net/udp':'','/proc/net/udp6':''};
  const linux=await collectPosixPassive(undefined,{platform:'linux',run:missing,read:async name=>files[name]??missing()});
  assert.equal(linux.results.length,3);assert.ok(linux.warnings.some(text=>text.includes('sans identification')));
  const cancel=new AbortController();cancel.abort();await assert.rejects(collectPosixPassive(cancel.signal,{platform:'linux',run:missing}));
});

test('OS audits flag observed weaknesses and never pass unreadable controls or stale update caches',()=>{
  for(const platform of ['linux','darwin']){
    const unknown=evaluatePosixSecurity({platform});assert.ok(unknown.results.filter(row=>row.checkId!=='inventory').every(row=>row.status==='notchecked'));
    const report=evaluatePosixSecurity({platform,firewall:false,aslr:0,kptr:1,dmesg:1,mandatoryAccess:true,ssh:{permitrootlogin:'yes',passwordauthentication:'no'},sip:false,gatekeeper:true,filevault:false,updates:{items:[],checkedAt:1}});
    assert.equal(report.results.find(row=>row.checkId==='firewall').status,'issue');
    assert.equal(report.results.find(row=>row.checkId==='updates-cache').status,'notchecked');
    assert.ok(report.results.every(row=>row.transport==='AUDIT'&&row.checkId&&row.recommendation!==undefined));
    assert.ok(!report.results.some(row=>row.checkId==='defender'));
    if(platform==='linux'){assert.equal(report.results.find(row=>row.checkId==='ssh-root').status,'issue');assert.ok(!report.results.some(row=>row.checkId==='sip'));}
    else {assert.equal(report.results.find(row=>row.checkId==='sip').status,'issue');assert.equal(report.results.find(row=>row.checkId==='gatekeeper').status,'passed');}
  }
});

test('macOS audit interprets fixed system evidence; Linux module presence alone does not prove enforcement',async()=>{
  const commands=[];
  const output={socketfilterfw:'Firewall is enabled. (State = 1)',csrutil:'System Integrity Protection status: disabled.',spctl:'assessments enabled',fdesetup:'FileVault is Off.',sw_vers:'15.4',plutil:JSON.stringify({RecommendedUpdates:[{DisplayName:'macOS Security Update'}]})};
  const mac=await collectPosixSecurity(undefined,{platform:'darwin',run:async(file,args)=>{commands.push([file,args]);return output[file.split('/').at(-1)]??missing();}});
  assert.equal(mac.results.find(row=>row.checkId==='firewall').status,'passed');assert.equal(mac.results.find(row=>row.checkId==='sip').status,'issue');assert.equal(mac.results.find(row=>row.checkId==='updates-cache').status,'issue');
  assert.ok(!commands.some(([,args])=>args.includes('--install')||args.includes('--list')));
  const linux=await collectPosixSecurity(undefined,{platform:'linux',run:missing,read:async file=>file==='/sys/module/apparmor/parameters/enabled'?'Y':missing()});
  assert.equal(linux.results.find(row=>row.checkId==='mandatory-access').status,'notchecked');
});

test('POSIX credentials persist outside source using a per-user directory and atomic restricted files',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'wolfguard-posix-test-'));
  try{
    const store=diskCredentialStore(directory,{platform:'linux'});assert.equal(await store.load(),null);
    const credential={api:'synthetic',token:'a'.repeat(64)};await store.save(credential);assert.deepEqual(await store.load(),credential);
    assert.deepEqual(JSON.parse(await readFile(path.join(directory,'credential.json'),'utf8')),credential);
    if(process.platform!=='win32'){assert.equal((await stat(directory)).mode&0o777,0o700);assert.equal((await stat(path.join(directory,'credential.json'))).mode&0o777,0o600);}
    assert.ok(agentDirectory('darwin',{},'/Users/example').includes('Library'));
    assert.ok(agentDirectory('linux',{XDG_CONFIG_HOME:'/tmp/user-config'},'/home/example').includes('user-config'));
  }finally{assert.equal(path.dirname(directory),path.resolve(tmpdir()));await rm(directory,{recursive:true,force:true});}
});
