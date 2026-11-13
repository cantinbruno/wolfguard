import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {createServer} from 'node:net';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import {scanSpec,targets,singleTarget} from '../server/lib/wolfguard/scan-spec.mjs';
import {runNetworkScan,fixedProcess,cachedTargetAddresses,activeTargetAddress,passiveTargetRows} from '../agent/network.mjs';
import {fileURLToPath} from 'node:url';
import {PassThrough} from 'node:stream';
import {desktopAgent,runAgent} from '../agent/agent.mjs';
import {evaluateSecurity} from '../agent/security-rules.mjs';

test('four workspaces keep network scans separate from host security audits and evaluate only available Windows evidence',async()=>{
  assert.throws(()=>scanSpec({workspace:'active',strategy:'active',target:'192.168.1.0/24',ports:'22,80,443'}));
  assert.throws(()=>scanSpec({workspace:'active',strategy:'active',target:'192.168.1.0/24',ports:'1-17'}));
  assert.throws(()=>scanSpec({workspace:'passive',strategy:'passive',passiveScope:'listeners'}));
  assert.equal(scanSpec({workspace:'passive',strategy:'passive',target:'192.168.1.1',passiveScope:'all'}).passiveScope,'neighbours');
  assert.equal(scanSpec({workspace:'map',strategy:'active',mode:'discovery',target:'192.168.1.0/24'}).addresses.length,254);
  assert.throws(()=>scanSpec({workspace:'map',strategy:'active',mode:'tcp',target:'127.0.0.1',ports:'80'}));
  assert.throws(()=>scanSpec({workspace:'vulnerability',strategy:'passive',passiveScope:'all'}));
  const missing=evaluateSecurity({});assert.ok(missing.results.every(row=>row.status==='notchecked'));
  const now=Date.parse('2026-10-30T12:00:00Z');
  const snapshot={firewall:{available:true,profiles:[{name:'Domain',enabled:null}]},smb:{available:true,enabled:true},installer:{available:true,machine:1,user:0},defender:{available:true,mode:'Passive',realtime:false,signatureAge:0},updates:{available:true,lastSearch:'2025-01-01',pending:[]}};
  const checked=evaluateSecurity(snapshot,now),find=id=>checked.results.find(row=>row.checkId===id);
  assert.equal(find('smb1').status,'issue');assert.equal(find('installer-elevation').status,'issue');assert.equal(find('firewall-Domain').status,'notchecked');
  assert.equal(find('updates-cache').status,'notchecked');assert.equal(find('defender-realtime').status,'notchecked');assert.equal(find('defender-signatures').status,'notchecked');
  snapshot.updates={available:true,lastSearch:new Date(now).toISOString(),pending:[{title:'Security KB123',ids:['123'],severity:'Critical'}]};
  const securityCollector=async()=>evaluateSecurity(snapshot,now);
  const report=await runNetworkScan({workspace:'vulnerability',strategy:'passive',passiveScope:'security'},{securityCollector,passiveCollector:()=>{throw new Error('Wrong collector');}});
  assert.equal(report.workspace,'vulnerability');assert.ok(report.results.some(row=>row.title==='Security KB123'&&row.severity==='critical'&&row.status==='issue'));
  assert.equal(new Set(report.results.map(row=>row.checkId)).size,report.results.length);
});

async function until(predicate,timeout=6000){const end=Date.now()+timeout;while(!predicate()){if(Date.now()>end)throw new Error('Agent state timeout');await new Promise(resolve=>setTimeout(resolve,15));}}

test('tray sharing Stop cancels only the remote session and leaves the agent connected',async()=>{
  const input=new PassThrough(),events=[];let first=true,started=false,ended=false;
  const client={origin:'https://fixture.invalid',async post(route){assert.equal(route,'poll');if(first){first=false;return {remote:{id:'a'.repeat(32)}};}return {};}};
  const work=desktopAgent({protectionRunner:async()=>{},client,input,pollMs:2,emit:event=>events.push(event),store:{async load(){return {api:client.origin,token:'b'.repeat(64)};}},remoteRunner:async(_client,_session,{signal,onStatus})=>{
    started=true;onStatus('Remote fixture',{state:'remote'});
    await new Promise(resolve=>{if(signal.aborted)return resolve();signal.addEventListener('abort',resolve,{once:true});});ended=true;
  }});
  try{
    await until(()=>started);input.write(JSON.stringify({type:'stop-remote'})+'\n');
    await until(()=>ended&&events.some(event=>event.state==='connected'));
    assert.equal(events.some(event=>event.state==='stopped'),false);
  }finally{input.end();await work;}
});
class D1{
  constructor(){this.db=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../server/drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())this.db.exec(readFileSync(new URL('../server/drizzle/'+file,import.meta.url),'utf8'));}
  prepare(sql){const statement=this.db.prepare(sql);let values=[];return {bind(...args){values=args;return this;},async first(){return statement.get(...values)||null;},async all(){return {results:statement.all(...values)};},async run(){const result=statement.run(...values);return {meta:{changes:Number(result.changes)}};}};}
  async batch(statements){this.db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());this.db.exec('COMMIT');return results;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
async function setup(){
  const activation=randomBytes(32).toString('hex');let now=1800000000000;
  const env={DB:new D1(),BUCKET:{},AUTH_PEPPER:'1'.repeat(64),WORKSPACE_KEY_ENCRYPTION_KEY:'4'.repeat(64),STORAGE_KEY:'2'.repeat(64),BOOTSTRAP_HASH:createHash('sha256').update(activation).digest('hex')};
  const api=async(path,body,credential,method=body===undefined?'GET':'POST',origin='https://wolfguard.wavetools.fr')=>handleAPI(new Request('https://test.invalid/api/'+path,{method,headers:{...(origin?{Origin:origin}:{}),...(credential?{Authorization:credential}:{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),env,()=>now);
  // Activation header is intentionally supplied only through this local fixture.
  const response=await handleAPI(new Request('https://test.invalid/api/setup',{method:'POST',headers:{'X-WG-Activation':activation,'Content-Type':'application/json'},body:JSON.stringify({code:'07942685'})}),env,()=>now);
  const user='Bearer '+(await response.json()).token;
  async function pair(name='Agent de test',platform='win32'){const ticket=await (await api('agents/pair',{},user)).json();const result=await api('agent/enroll',{code:ticket.code,name,platform});assert.equal(result.status,200);const agent=await result.json();await api('agent/poll',{capabilities:['network-target-v1','network-scan-v3']},'Agent '+agent.token);return {...agent,auth:'Agent '+agent.token,code:ticket.code};}
  return {api,user,pair,env,advance:ms=>{now+=ms;}};
}
test('scan plans allow public unicast targets while rejecting injection, multicast and excessive scans',()=>{
  assert.equal(targets('192.168.1.0/24').length,254);assert.equal(targets('127.0.0.1')[0],'127.0.0.1');assert.equal(targets('::1')[0],'::1');
  for(const value of ['169.254.1.2;echo hi','example.com','0.0.0.0','224.0.0.1','255.255.255.255','::','ff02::1','::ffff:224.0.0.1','192.168.0.0/16','10.0.0.1-10.0.2.1'])assert.throws(()=>targets(value),value);
  for(const [value,expected] of [['8.8.8.8','8.8.8.8'],['::ffff:8.8.8.8','8.8.8.8'],['2001:db8::1','2001:db8::1']])assert.deepEqual(targets(value),[expected]);
  assert.equal(targets('8.8.8.0/24').length,254);
  const input={strategy:'active',target:'127.0.0.1',ports:'22,80,443',mode:'tcp',timeoutMs:200,concurrency:2};assert.deepEqual(scanSpec(scanSpec(input)),scanSpec(input));
  for(const change of [{ports:'1-65535'},{concurrency:99},{timeoutMs:9999},{target:'192.168.0.0/24',ports:'1-100'},{mode:'shell'},{ports:'22;curl invalid'}])assert.throws(()=>scanSpec({...input,...change}));
});

test('active and passive require one IP/FQDN and discard caller-supplied address lists',async()=>{
  for(const target of ['',null,'10.0.0.0/24','10.0.0.1-10.0.0.2','10.0.0.1 10.0.0.2','http://host.example','host.example:443','*.example','-a.example','bad..example','0.0.0.0','224.0.0.1','::','ff02::1']){
    for(const strategy of ['active','passive'])assert.throws(()=>scanSpec({strategy,workspace:strategy,target,ports:'443'}),String(target));
  }
  assert.equal(singleTarget(' Serveur-test.Exemple.Local. '),'serveur-test.exemple.local');
  assert.deepEqual(scanSpec({strategy:'active',target:'10.0.0.1',ports:'443',addresses:['10.0.0.2']}).addresses,['10.0.0.1']);
  for(const answers of [[{address:'224.0.0.1'}],[{address:'10.0.0.1'},{address:'::'}],[]])await assert.rejects(activeTargetAddress('host.example',{lookup:async()=>answers}));
  assert.equal(await activeTargetAddress('host.example',{lookup:async()=>[{address:'8.8.8.8'},{address:'1.1.1.1'}]}),'8.8.8.8');
  const s=await setup();try{
    const agent=await s.pair();await s.api('agent/poll',{capabilities:['network-scan-v2']},agent.auth);
    for(const strategy of ['active','passive'])assert.equal((await s.api('scans',{agentId:agent.id,strategy,target:'10.0.0.1',ports:'443'},s.user)).status,409);
  }finally{s.env.DB.db.close();}
});

test('passive FQDN reads only cached associations, returns only its address and never calls DNS',async()=>{
  const rows=[{address:'192.168.1.1',transport:'ARP',status:'observed'},{address:'192.168.1.2',transport:'ARP',status:'observed'}];
  for(const platform of ['linux','darwin','win32']){
    let reads=0,commands=0;
    const cacheOptions={platform,read:async()=>{reads++;return '192.168.1.1 serveur-test.example.local alias.example.local # note\n192.168.1.2 other.example.local';},run:async(file,args,options)=>{commands++;assert.equal(platform,'win32');assert.equal(file,'powershell.exe');assert.match(args.at(-1),/Get-DnsClientCache/);assert.doesNotMatch(args.at(-1),/Resolve-DnsName|ping|nslookup/);assert.equal(options.input,'serveur-test.example.local');return '[]';}};
    const report=await runNetworkScan({strategy:'passive',target:'serveur-test.example.local'},{passiveCollector:async()=>({results:rows}),cacheOptions,lookup:()=>{throw new Error('DNS forbidden');}});
    assert.equal(reads,1);assert.equal(commands,platform==='win32'?1:0);assert.deepEqual(report.results.map(row=>row.address),['192.168.1.1']);assert.equal(report.target,'serveur-test.example.local');
  }
  const cached=await cachedTargetAddresses('host.example',[],{platform:'win32',read:async()=>'',run:async()=>JSON.stringify(['192.168.1.2','8.8.8.8'])});assert.deepEqual(cached,['192.168.1.2','8.8.8.8']);
  const missing=await runNetworkScan({strategy:'passive',target:'unknown.example'},{passiveCollector:async()=>({results:rows}),cacheOptions:{platform:'linux',read:async()=>''},lookup:()=>{throw new Error('DNS forbidden');}});
  assert.equal(missing.results.length,0);assert.ok(missing.warnings.some(value=>value.includes('Aucune association locale')));
  const ipv6=await runNetworkScan({strategy:'passive',target:'fd00::1'},{passiveCollector:async()=>({results:[{address:'fd00:0000:0000:0000:0000:0000:0000:0001',transport:'NDP',status:'observed'},{address:'fd00::2',transport:'NDP',status:'observed'}]})});assert.deepEqual(ipv6.results.map(row=>row.address),['fd00::1']);
});

test('passive observations retain target DNS, remote ports and owners without leaking unrelated sockets',async()=>{
  const snapshot={localAddresses:['192.168.1.10'],results:[
    {address:'8.8.8.8',hostname:'dns.example',transport:'DNS',status:'observed',ttl:120},
    {address:'192.168.1.10',port:51000,remoteAddress:'8.8.8.8',remotePort:443,transport:'TCP',status:'connection',pid:42,processName:'browser'},
    {address:'192.168.1.10',port:51001,remoteAddress:'8.8.8.8',remotePort:443,transport:'TCP',status:'connection',pid:42,processName:'browser'},
    {address:'192.168.1.10',port:51002,remoteAddress:'1.1.1.1',remotePort:443,transport:'TCP',status:'connection',pid:43},
    {address:'0.0.0.0',port:8080,transport:'TCP',status:'listening',pid:77},
    {address:'::',port:5353,transport:'UDP',status:'bound',pid:78}]};
  const rows=passiveTargetRows(snapshot,['8.8.8.8'],'8.8.8.8');assert.equal(rows.length,3);
  assert.ok(rows.every(row=>row.address==='8.8.8.8'));assert.equal(rows[0].ttl,120);
  assert.equal(rows[1].port,443);assert.equal(rows[1].localPort,51000);assert.equal(rows[1].processName,'browser');
  assert.equal(passiveTargetRows(snapshot,['9.9.9.9'],'9.9.9.9').length,0);
  const local=passiveTargetRows(snapshot,['192.168.1.10'],'192.168.1.10');
  assert.equal(local.filter(row=>['listening','bound'].includes(row.status)).length,2);
  const report=await runNetworkScan({workspace:'passive',strategy:'passive',target:'dns.example'},
    {passiveCollector:async()=>snapshot,cacheOptions:{platform:'linux',read:async()=>''},lookup:()=>{throw new Error('Network DNS forbidden');}});
  assert.equal(report.results.length,3);assert.ok(report.results.every(row=>row.address==='8.8.8.8'));
});

test('one enrollment on each supported OS can execute all four scoped workspaces',async()=>{
  const s=await setup();
  try{
    const ticket=await (await s.api('agents/pair',{},s.user)).json();
    assert.equal((await s.api('agent/enroll',{code:ticket.code,name:'Unsupported',platform:'freebsd'})).status,400);
    for(const platform of ['win32','linux','darwin']){
      const agent=await s.pair('Poste '+platform,platform);
      await s.api('agent/poll',{capabilities:['security-audit-v1','network-target-v1','network-scan-v3']},agent.auth);
      const list=await (await s.api('agents',undefined,s.user)).json();
      assert.equal(list.agents.find(item=>item.id===agent.id).platform,platform);
      for(const workspace of ['passive','active','map','vulnerability']){
        const spec={agentId:agent.id,workspace,strategy:['active','map'].includes(workspace)?'active':'passive',...(workspace==='active'?{target:'127.0.0.1',ports:'22',mode:'tcp'}:workspace==='map'?{target:'127.0.0.1',mode:'discovery'}:{target:'127.0.0.1',passiveScope:workspace==='vulnerability'?'security':'all'})};
        const created=await s.api('scans',spec,s.user);assert.equal(created.status,201);
        const job=(await (await s.api('agent/poll',{},agent.auth)).json()).job;
        assert.equal(job.spec.workspace,workspace);
        const update=await s.api('agent/update',{id:job.id,lease:job.lease,revision:job.revision+1,status:'completed',completed:0,total:0,report:{strategy:spec.strategy,workspace,platform,results:[],warnings:[]}},agent.auth);
        assert.equal(update.status,200);
        const result=await (await s.api('scans/result?id='+job.id,undefined,s.user)).json();
        assert.equal(result.report.platform,platform);assert.equal(result.workspace,workspace);
      }
    }
  }finally{s.env.DB.db.close();}
});

test('CERT-FR analysis is authenticated, cached and encrypted separately from immutable agent evidence',async()=>{
  const s=await setup();try{
    const a=await s.pair('CERT-FR fixture');await s.api('agent/poll',{capabilities:['network-scan-v3','network-target-v1']},a.auth);
    const created=await(await s.api('scans',{agentId:a.id,workspace:'active',strategy:'active',target:'127.0.0.1',ports:'22',mode:'tcp'},s.user)).json();
    assert.equal((await s.api('scans/intelligence',{id:created.id},s.user)).status,409);
    const job=(await(await s.api('agent/poll',{},a.auth)).json()).job;
    const report={strategy:'active',workspace:'active',results:[{address:'127.0.0.1',port:22,transport:'TCP',status:'open',product:'OpenSSH',version:'9.7p1'}],warnings:[]};
    await s.api('agent/update',{id:job.id,lease:job.lease,revision:job.revision+1,status:'completed',completed:1,total:1,report},a.auth);
    const before=s.env.DB.db.prepare('SELECT result_cipher FROM scan_jobs WHERE id=?').get(job.id).result_cipher;
    let calls=0;s.env.LOCAL_TEST_ORIGIN='http://localhost';s.env.CERTFR_FETCH=async url=>{calls++;if(url.endsWith('/avis/json/'))return Response.json([{reference:'CERTFR-2026-AVI-0001',title:'OpenSSH',last_revision_date:'2026-11-06'}]);if(url.endsWith('/alerte/json/'))return Response.json([]);return Response.json({reference:'CERTFR-2026-AVI-0001',title:'OpenSSH security',affected_systems:[{product:{name:'OpenSSH'},description:'versions antérieures à 9.8p1'}],cves:[{name:'CVE-2024-6387'}],summary:'Evidence',content:'Update OpenSSH'});};
    assert.equal((await s.api('scans/intelligence',{id:job.id})).status,401);assert.equal((await s.api('scans/intelligence',{id:job.id},a.auth)).status,401);
    const response=await s.api('scans/intelligence',{id:job.id},s.user);assert.equal(response.status,200,await response.clone().text());const value=await response.json();assert.equal(value.intelligence.findings[0].reference,'CERTFR-2026-AVI-0001');
    const count=calls;assert.equal((await s.api('scans/intelligence',{id:job.id},s.user)).status,200);assert.equal(calls,count);
    const disk=s.env.DB.db.prepare('SELECT result_cipher FROM scan_intelligence WHERE job_id=?').get(job.id).result_cipher;assert.ok(!disk.includes('CVE-2024-6387'));assert.equal(s.env.DB.db.prepare('SELECT result_cipher FROM scan_jobs WHERE id=?').get(job.id).result_cipher,before);
    const loaded=await(await s.api('scans/result?id='+job.id,undefined,s.user)).json();assert.equal(loaded.intelligence.findings[0].url,'https://cert.cyber.gouv.fr/avis/CERTFR-2026-AVI-0001/');assert.deepEqual(loaded.report,report);
    assert.equal((await s.api('scans/delete',{id:job.id},s.user)).status,200);assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) AS n FROM scan_intelligence').get().n,0);
  }finally{s.env.DB.db.close();}
});
test('agent pairing is one-use, scoped, encrypted, revocable and separate from vault sessions',async()=>{
  const s=await setup();assert.equal((await s.api('agents')).status,401);
  const a=await s.pair('Poste confidentiel');assert.equal((await s.api('agent/enroll',{code:a.code,name:'Replay',platform:'win32'})).status,403);
  assert.equal((await s.api('agent/poll',{},s.user)).status,401);assert.equal((await s.api('vault',undefined,a.auth)).status,401);
  const list=await (await s.api('agents',undefined,s.user)).json();assert.equal(list.agents[0].name,'Poste confidentiel');assert.equal(list.agents[0].online,true);
  const audit={agentId:a.id,workspace:'vulnerability',strategy:'passive',passiveScope:'security'};
  assert.equal((await s.api('scans',audit,s.user)).status,409);
  await s.api('agent/poll',{capabilities:['security-audit-v1','auto-update-v1']},a.auth);
  assert.deepEqual((await (await s.api('agents',undefined,s.user)).json()).agents[0].capabilities,['security-audit-v1','auto-update-v1']);
  const job=await (await s.api('scans',audit,s.user)).json();assert.ok(job.id);
  assert.equal((await (await s.api('scans?agentId='+a.id,undefined,s.user)).json()).jobs[0].workspace,'vulnerability');
  await s.api('scans/cancel',{id:job.id},s.user);
  const stored=s.env.DB.db.prepare('SELECT * FROM scan_agents').get();assert.ok(!JSON.stringify(stored).includes(a.token));assert.ok(!JSON.stringify(stored).includes('Poste confidentiel'));
  assert.equal((await s.api('agents',undefined,s.user,'GET','https://evil.invalid')).status,403);
  assert.equal((await s.api('agents/revoke',{id:a.id},s.user)).status,200);assert.equal((await s.api('agent/poll',{},a.auth)).status,401);
  s.env.DB.db.close();
});
test('jobs have one lease, ordered snapshots, cancellation and no shell or vault access',async()=>{
  const s=await setup(),a=await s.pair(),b=await s.pair('Autre poste');
  const publicJob=await s.api('scans',{agentId:a.id,strategy:'active',target:'8.8.8.8',ports:'443'},s.user);assert.equal(publicJob.status,201);
  await s.api('scans/cancel',{id:(await publicJob.json()).id},s.user);
  const job=await (await s.api('scans',{agentId:a.id,strategy:'active',target:'127.0.0.1',ports:'22,443'},s.user)).json();
  assert.equal((await s.api('scans',{agentId:a.id,strategy:'passive',target:'127.0.0.1'},s.user)).status,409);
  const claims=await Promise.all([s.api('agent/poll',{},a.auth),s.api('agent/poll',{},a.auth)]);const claimed=(await Promise.all(claims.map(r=>r.json()))).map(data=>data.job).filter(Boolean);assert.equal(claimed.length,1);const lease=claimed[0];
  const update={id:job.id,lease:lease.lease,revision:lease.revision+1,status:'running',completed:1,total:2,report:{strategy:'active',results:[{address:'127.0.0.1',port:22,status:'open',detail:'Sensitive banner'}],warnings:[]}};
  assert.equal((await s.api('agent/update',update,b.auth)).status,403);
  assert.equal((await (await s.api('agent/update',update,a.auth)).json()).accepted,true);
  assert.equal((await (await s.api('agent/update',{...update,report:{strategy:'active',results:[]}},a.auth)).json()).accepted,false);
  const snapshot=await (await s.api('scans/result?id='+job.id,undefined,s.user)).json();assert.equal(snapshot.report.results[0].detail,'Sensitive banner');
  const stored=s.env.DB.db.prepare('SELECT * FROM scan_jobs').get();assert.ok(!JSON.stringify(stored).includes('127.0.0.1'));assert.ok(!JSON.stringify(stored).includes('Sensitive banner'));
  assert.equal((await s.api('scans/cancel',{id:job.id},s.user)).status,200);
  const late=await (await s.api('agent/update',{...update,revision:update.revision+1,status:'completed'},a.auth)).json();assert.equal(late.accepted,false);assert.equal(late.status,'cancelled');
  s.env.DB.db.close();
});
test('lost agents do not repeat a scan, sessions expire, and code rotation invalidates agent credentials',async()=>{
  const s=await setup(),a=await s.pair();const created=await (await s.api('scans',{agentId:a.id,strategy:'passive',target:'127.0.0.1'},s.user)).json();const claim=await (await s.api('agent/poll',{},a.auth)).json();assert.equal(claim.job.id,created.id);
  s.advance(31000);assert.equal((await (await s.api('agent/poll',{},a.auth)).json()).job,null);
  const job=await (await s.api('scans/result?id='+created.id,undefined,s.user)).json();assert.equal(job.status,'lost');
  s.env.DB.db.exec('UPDATE vault SET generation=generation+1 WHERE id=1');assert.equal((await s.api('agent/poll',{},a.auth)).status,401);assert.equal((await s.api('agents',undefined,s.user)).status,401);
  s.env.DB.db.close();
});

test('global history paginates all scan kinds across agents and retains encrypted results after seven days and PIN rotation',async()=>{
  const s=await setup();
  try{
    const a=await s.pair('Poste principal'),b=await s.pair('Ancien poste','linux');
    for(const agent of [a,b])await s.api('agent/poll',{capabilities:['network-target-v1','security-audit-v1','network-scan-v3']},agent.auth);
    const ids=[];
    for(let index=0;index<64;index++){
      const workspace=['passive','active','map','vulnerability'][index%4],agent=index%2?a:b;
      const spec={agentId:agent.id,workspace,strategy:['active','map'].includes(workspace)?'active':'passive',target:'127.0.0.1',...(workspace==='map'?{mode:'discovery'}:{}),...(workspace==='active'?{mode:'tcp',ports:'443'}:{}),...(workspace==='vulnerability'?{passiveScope:'security'}:{})};
      const created=await s.api('scans',spec,s.user);assert.equal(created.status,201);const {id}=await created.json();ids.push(id);
      const {job}=await (await s.api('agent/poll',{},agent.auth)).json();
      const report={strategy:spec.strategy,workspace,target:spec.target,results:[{address:'127.0.0.1',transport:workspace==='vulnerability'?'AUDIT':'ARP',checkId:workspace==='vulnerability'?'firewall':undefined,status:workspace==='vulnerability'?'passed':'observed'}],warnings:[]};
      const updated=await s.api('agent/update',{id,lease:job.lease,revision:job.revision+1,status:'completed',completed:1,total:1,report},agent.auth);assert.equal(updated.status,200);
    }
    await s.api('agents/revoke',{id:b.id},s.user);
    assert.equal((await s.api('scans?history=1')).status,401);
    assert.equal((await s.api('scans?history=1',undefined,a.auth)).status,401);
    for(const query of ['beforeAt=1','beforeId='+ids[0],'beforeAt=1x&beforeId='+ids[0],'beforeAt=100&beforeId=wrong'])assert.equal((await s.api('scans?history=1&'+query,undefined,s.user)).status,400);
    const first=await (await s.api('scans?history=1',undefined,s.user)).json();assert.equal(first.jobs.length,50);assert.ok(first.next);
    const second=await (await s.api('scans?history=1&beforeAt='+first.next.beforeAt+'&beforeId='+first.next.beforeId,undefined,s.user)).json();assert.equal(second.jobs.length,14);assert.equal(second.next,null);
    const all=[...first.jobs,...second.jobs];assert.equal(new Set(all.map(job=>job.id)).size,64);assert.deepEqual(new Set(all.map(job=>job.workspace)),new Set(['passive','active','map','vulnerability']));
    assert.ok(all.some(job=>job.agentName==='Ancien poste'));assert.ok(all.every(job=>job.hasReport&&job.target===(job.workspace==='vulnerability'?'':'127.0.0.1')));
    assert.ok(all.every(job=>!('report' in job)&&!('spec' in job)&&!('lease_hash' in job)));
    assert.ok(!JSON.stringify(s.env.DB.db.prepare('SELECT spec_cipher,result_cipher FROM scan_jobs').all()).includes('firewall'));
    s.advance(9*86400000);
    const login=await (await s.api('login',{code:'07942685'})).json(),fresh='Bearer '+login.token;
    assert.equal((await (await s.api('scans?history=1',undefined,fresh)).json()).jobs.length,50);
    s.env.DB.db.exec('UPDATE vault SET generation=generation+1 WHERE id=1');
    assert.equal((await s.api('scans?history=1',undefined,fresh)).status,401);
    const rotated='Bearer '+(await (await s.api('login',{code:'07942685'})).json()).token;
    assert.equal((await (await s.api('scans?history=1',undefined,rotated)).json()).jobs.length,50);
    assert.equal((await s.api('scans/result?id='+ids[0],undefined,rotated)).status,200);
    s.env.DB.db.prepare('UPDATE scan_jobs SET generation=100 WHERE id=?').run(ids[0]);
    assert.equal((await s.api('scans/result?id='+ids[0],undefined,rotated)).status,404);
  }finally{s.env.DB.db.close();}
});
test('history deletion requires a current vault session, removes one completed report and protects live or future jobs',async()=>{
  const s=await setup();
  try{
    const agent=await s.pair();await s.api('agent/poll',{capabilities:['network-target-v1','network-scan-v3']},agent.auth);
    const create=async()=>{const response=await s.api('scans',{agentId:agent.id,strategy:'passive',target:'127.0.0.1'},s.user);assert.equal(response.status,201);return (await response.json()).id;};
    const id=await create();
    assert.equal((await s.api('scans/delete',{id})).status,401);
    assert.equal((await s.api('scans/delete',{id},agent.auth)).status,401);
    assert.equal((await s.api('scans/delete',{id:'invalid'},s.user)).status,400);
    assert.equal((await s.api('scans/delete',{id},s.user)).status,409);
    const {job}=await (await s.api('agent/poll',{},agent.auth)).json();
    assert.equal((await s.api('scans/delete',{id},s.user)).status,409);
    assert.equal((await s.api('agent/update',{id,lease:job.lease,revision:job.revision+1,status:'completed',completed:1,total:1,report:{strategy:'passive',results:[{address:'127.0.0.1'}]}},agent.auth)).status,200);
    const queued=await create();
    s.env.DB.db.exec('UPDATE vault SET generation=generation+1 WHERE id=1');
    assert.equal((await s.api('scans/delete',{id},s.user)).status,401);
    const user='Bearer '+(await (await s.api('login',{code:'07942685'})).json()).token;
    s.env.DB.db.prepare('UPDATE scan_jobs SET generation=100 WHERE id=?').run(id);
    assert.equal((await s.api('scans/delete',{id},user)).status,404);
    s.env.DB.db.prepare('UPDATE scan_jobs SET generation=1 WHERE id=?').run(id);
    assert.equal((await s.api('scans/delete',{id},user)).status,200);
    assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) AS count FROM scan_jobs WHERE id=?').get(id).count,0);
    assert.equal((await s.api('scans/result?id='+id,undefined,user)).status,404);
    assert.equal((await s.api('scans/delete',{id},user)).status,404);
    assert.deepEqual((await (await s.api('scans?history=1',undefined,user)).json()).jobs.map(job=>job.id),[queued]);
  }finally{s.env.DB.db.close();}
});

test('the actual network engine connects to a loopback service and cancels pending probes',async()=>{
  const server=createServer(socket=>{socket.on('data',()=>{});socket.on('error',()=>{});});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;try{
    const result=await runNetworkScan({strategy:'active',target:'127.0.0.1',mode:'tcp',ports:String(port),timeoutMs:200,concurrency:1});assert.equal(result.results[0].status,'open');assert.equal(result.completed,1);
    let lookups=0;
    const network=await runNetworkScan({workspace:'active',strategy:'active',target:'serveur-test.example.local',mode:'tcp',ports:String(port),timeoutMs:200,concurrency:2},{lookup:async()=>{lookups++;return [{address:'127.0.0.1'},{address:'127.0.0.2'}];}});
    assert.equal(network.completed,1);assert.deepEqual(network.results.map(row=>row.address),['127.0.0.1']);assert.equal(network.results[0].status,'open');assert.equal(lookups,1);
    const cancel=new AbortController();setTimeout(()=>cancel.abort(),100);
    const interrupted=await runNetworkScan({strategy:'active',target:'127.0.0.1',mode:'tcp',ports:String(port),timeoutMs:200,concurrency:1,identifyServices:true},{signal:cancel.signal});assert.equal(interrupted.cancelled,true);assert.equal(interrupted.completed,0);
  }finally{await new Promise(resolve=>server.close(resolve));}
  const passive=await runNetworkScan({workspace:'passive',strategy:'passive',target:'192.168.1.1',passiveScope:'neighbours'},{passiveCollector:async()=>({results:[{address:'127.0.0.1',port:22,transport:'TCP',status:'listening',pid:42},{address:'192.168.1.1',transport:'ARP',status:'observed'}]})});assert.equal(passive.results.length,1);assert.equal(passive.results[0].address,'192.168.1.1');assert.equal(passive.results[0].pid,undefined);
});
test('Windows protects the agent credential for the current user using real DPAPI',{skip:process.platform!=='win32'},async()=>{
  const script=fileURLToPath(new URL('../agent/protect.ps1',import.meta.url));
  const run=(mode,input)=>fixedProcess('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-Mode',mode],{input});
  const synthetic=JSON.stringify({token:randomBytes(32).toString('hex'),api:'synthetic-test'});
  const cipher=await run('protect',synthetic);assert.ok(!cipher.includes('synthetic-test'));assert.equal(await run('unprotect',cipher),synthetic);
});

test('the displayed connected state requires a successful poll and recovers honestly after an outage',async()=>{
  const states=[],cancel=new AbortController();let acknowledge,count=0;
  const client={async post(){count++;if(count===1)return new Promise(resolve=>{acknowledge=resolve;});if(count===2)throw new Error('Synthetic outage');return {job:null};}};
  const work=runAgent(client,{protectionRunner:async()=>{},signal:cancel.signal,pollMs:20,onStatus:(_message,detail)=>states.push(detail.state)});
  try{
    await until(()=>!!acknowledge);
    assert.deepEqual(states,['connecting']);
    acknowledge({job:null});
    await until(()=>states.includes('offline')&&states.filter(state=>state==='connected').length>=2);
    assert.deepEqual(states.slice(0,4),['connecting','connected','offline','connected']);
  }finally{cancel.abort();await work;}
});

test('the desktop protocol pairs, reports real scans, stops and re-pairs without emitting credentials',async()=>{
  const s=await setup(),input=new PassThrough(),events=[];let credential=null;
  const client={origin:'https://test.invalid',token:'',async post(route,body){const response=await s.api('agent/'+route,body,this.token?'Agent '+this.token:undefined);const value=await response.json();if(!response.ok){const error=new Error(value.error);error.status=response.status;throw error;}return value;}};
  const store={async load(){return null;},async save(value){credential=value;}};
  const work=desktopAgent({protectionRunner:async()=>{},client,store,input,emit:event=>events.push(event),name:'Fenêtre de test',pollMs:20,passiveCollector:async()=>({results:[{address:'192.168.1.1',port:null,transport:'ARP',status:'observed'}],warnings:[]})});
  const send=value=>input.write(JSON.stringify(value)+'\n');
  try{
    await until(()=>events.at(-1)?.state==='pairing');
    send({type:'pair',code:'01234567'});
    await until(()=>events.at(-1)?.message.includes('32 caractères'));
    assert.equal(credential,null);
    const ticket=await (await s.api('agents/pair',{},s.user)).json();send({type:'pair',code:ticket.code});
    await until(()=>events.at(-1)?.state==='connected');
    assert.ok(credential&&/^[a-f0-9]{64}$/.test(credential.token));
    const job=await (await s.api('scans',{agentId:credential.id,strategy:'passive',target:'192.168.1.1'},s.user)).json();
    await until(()=>events.some(event=>event.state==='completed'));
    assert.ok(events.some(event=>event.state==='scanning'));
    const report=await (await s.api('scans/result?id='+job.id,undefined,s.user)).json();
    assert.equal(report.status,'completed');assert.equal(report.report.results[0].address,'192.168.1.1');assert.equal(report.report.results[0].transport,'ARP');
    send({type:'stop'});await until(()=>events.at(-1)?.state==='stopped');
    const last=events.length;await new Promise(resolve=>setTimeout(resolve,80));assert.equal(events.length,last);
    send({type:'start'});await until(()=>events.at(-1)?.state==='connected');
    await s.api('agents/revoke',{id:credential.id},s.user);
    await until(()=>events.at(-1)?.state==='revoked');
    send({type:'repair'});await until(()=>events.at(-1)?.state==='pairing');
    const serialized=JSON.stringify(events);assert.ok(!serialized.includes(credential.token));assert.ok(!serialized.includes(ticket.code));assert.ok(!serialized.includes('127.0.0.1'));
    send({type:'shutdown'});await work;
  }finally{input.end();await work;s.env.DB.db.close();}
});
