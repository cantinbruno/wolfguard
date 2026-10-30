import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {createServer} from 'node:net';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';
import {scanSpec,targets,singleTarget} from '../server/lib/wolfguard/scan-spec.mjs';
import {runNetworkScan,fixedProcess,cachedTargetAddresses,activeTargetAddress} from '../agent/network.mjs';
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
class D1{
  constructor(){this.db=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../server/drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())this.db.exec(readFileSync(new URL('../server/drizzle/'+file,import.meta.url),'utf8'));}
  prepare(sql){const statement=this.db.prepare(sql);let values=[];return {bind(...args){values=args;return this;},async first(){return statement.get(...values)||null;},async all(){return {results:statement.all(...values)};},async run(){const result=statement.run(...values);return {meta:{changes:Number(result.changes)}};}};}
  async batch(statements){this.db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());this.db.exec('COMMIT');return results;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
async function setup(){
  const activation=randomBytes(32).toString('hex');let now=1800000000000;
  const env={DB:new D1(),BUCKET:{},AUTH_PEPPER:'1'.repeat(64),STORAGE_KEY:'2'.repeat(64),BOOTSTRAP_HASH:createHash('sha256').update(activation).digest('hex')};
  const api=async(path,body,credential,method=body===undefined?'GET':'POST',origin='https://wolfguard.wavetools.fr')=>handleAPI(new Request('https://test.invalid/api/'+path,{method,headers:{...(origin?{Origin:origin}:{}),...(credential?{Authorization:credential}:{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),env,()=>now);
  // Activation header is intentionally supplied only through this local fixture.
  const response=await handleAPI(new Request('https://test.invalid/api/setup',{method:'POST',headers:{'X-WG-Activation':activation},body:JSON.stringify({code:'07942685'})}),env,()=>now);
  const user='Bearer '+(await response.json()).token;
  async function pair(name='Agent de test',platform='win32'){const ticket=await (await api('agents/pair',{},user)).json();const result=await api('agent/enroll',{code:ticket.code,name,platform});assert.equal(result.status,200);const agent=await result.json();await api('agent/poll',{capabilities:['network-target-v1']},'Agent '+agent.token);return {...agent,auth:'Agent '+agent.token,code:ticket.code};}
  return {api,user,pair,env,advance:ms=>{now+=ms;}};
}
test('strict scan plans reject Internet targets, injection, huge ranges and unsafe options',()=>{
  assert.equal(targets('192.168.1.0/24').length,254);assert.equal(targets('127.0.0.1')[0],'127.0.0.1');assert.equal(targets('::1')[0],'::1');
  for(const value of ['8.8.8.8','169.254.1.2;echo hi','example.com','0.0.0.0','::ffff:8.8.8.8','2001:db8::1','192.168.0.0/16','10.0.0.1-10.0.2.1'])assert.throws(()=>targets(value),value);
  const input={strategy:'active',target:'127.0.0.1',ports:'22,80,443',mode:'tcp',timeoutMs:200,concurrency:2};assert.deepEqual(scanSpec(scanSpec(input)),scanSpec(input));
  for(const change of [{ports:'1-65535'},{concurrency:99},{timeoutMs:9999},{target:'192.168.0.0/24',ports:'1-100'},{mode:'shell'},{ports:'22;curl invalid'}])assert.throws(()=>scanSpec({...input,...change}));
});

test('active and passive require one IP/FQDN and discard caller-supplied address lists',async()=>{
  for(const target of ['',null,'10.0.0.0/24','10.0.0.1-10.0.0.2','10.0.0.1 10.0.0.2','http://host.example','host.example:443','*.example','-a.example','bad..example','8.8.8.8','::ffff:8.8.8.8']){
    for(const strategy of ['active','passive'])assert.throws(()=>scanSpec({strategy,workspace:strategy,target,ports:'443'}),String(target));
  }
  assert.equal(singleTarget(' Serveur-test.Exemple.Local. '),'serveur-test.exemple.local');
  assert.deepEqual(scanSpec({strategy:'active',target:'10.0.0.1',ports:'443',addresses:['10.0.0.2']}).addresses,['10.0.0.1']);
  for(const answers of [[{address:'8.8.8.8'}],[{address:'10.0.0.1'},{address:'8.8.8.8'}],[]])await assert.rejects(activeTargetAddress('host.example',{lookup:async()=>answers}));
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
  const cached=await cachedTargetAddresses('host.example',[],{platform:'win32',read:async()=>'',run:async()=>JSON.stringify(['192.168.1.2','8.8.8.8'])});assert.deepEqual(cached,['192.168.1.2']);
  const missing=await runNetworkScan({strategy:'passive',target:'unknown.example'},{passiveCollector:async()=>({results:rows}),cacheOptions:{platform:'linux',read:async()=>''},lookup:()=>{throw new Error('DNS forbidden');}});
  assert.equal(missing.results.length,0);assert.ok(missing.warnings.some(value=>value.includes('Aucune association locale')));
  const ipv6=await runNetworkScan({strategy:'passive',target:'fd00::1'},{passiveCollector:async()=>({results:[{address:'fd00:0000:0000:0000:0000:0000:0000:0001',transport:'NDP',status:'observed'},{address:'fd00::2',transport:'NDP',status:'observed'}]})});assert.deepEqual(ipv6.results.map(row=>row.address),['fd00::1']);
});

test('one enrollment on each supported OS can execute all four scoped workspaces',async()=>{
  const s=await setup();
  try{
    const ticket=await (await s.api('agents/pair',{},s.user)).json();
    assert.equal((await s.api('agent/enroll',{code:ticket.code,name:'Unsupported',platform:'freebsd'})).status,400);
    for(const platform of ['win32','linux','darwin']){
      const agent=await s.pair('Poste '+platform,platform);
      await s.api('agent/poll',{capabilities:['security-audit-v1','network-target-v1']},agent.auth);
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
test('agent pairing is one-use, scoped, encrypted, revocable and separate from vault sessions',async()=>{
  const s=await setup();assert.equal((await s.api('agents')).status,401);
  const a=await s.pair('Poste confidentiel');assert.equal((await s.api('agent/enroll',{code:a.code,name:'Replay',platform:'win32'})).status,403);
  assert.equal((await s.api('agent/poll',{},s.user)).status,401);assert.equal((await s.api('vault',undefined,a.auth)).status,401);
  const list=await (await s.api('agents',undefined,s.user)).json();assert.equal(list.agents[0].name,'Poste confidentiel');assert.equal(list.agents[0].online,true);
  const audit={agentId:a.id,workspace:'vulnerability',strategy:'passive',passiveScope:'security'};
  assert.equal((await s.api('scans',audit,s.user)).status,409);
  await s.api('agent/poll',{capabilities:['security-audit-v1']},a.auth);
  assert.deepEqual((await (await s.api('agents',undefined,s.user)).json()).agents[0].capabilities,['security-audit-v1']);
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
  assert.equal((await s.api('scans',{agentId:a.id,strategy:'active',target:'8.8.8.8',ports:'443'},s.user)).status,400);
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
  const passive=await runNetworkScan({workspace:'passive',strategy:'passive',target:'192.168.1.1',passiveScope:'neighbours'},{passiveCollector:async()=>({results:[{address:'127.0.0.1',port:22,transport:'TCP',status:'listening',pid:42},{address:'192.168.1.1',transport:'ARP',status:'observed',pid:42}]})});assert.equal(passive.results.length,1);assert.equal(passive.results[0].address,'192.168.1.1');assert.equal(passive.results[0].pid,undefined);
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
  const work=runAgent(client,{signal:cancel.signal,pollMs:20,onStatus:(_message,detail)=>states.push(detail.state)});
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
  const work=desktopAgent({client,store,input,emit:event=>events.push(event),name:'Fenêtre de test',pollMs:20,passiveCollector:async()=>({results:[{address:'192.168.1.1',port:null,transport:'ARP',status:'observed'}],warnings:[]})});
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
