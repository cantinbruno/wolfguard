import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planTopology,parseTrace,discoverTopology,collectTopology} from '../agent/topology.mjs';

const interfaces={Ethernet:[{address:'192.168.10.2',cidr:'192.168.10.2/30',family:'IPv4',internal:false}],VPN:[{address:'10.20.0.2',cidr:'10.20.0.2/30',family:'IPv4',internal:false}],Loopback:[{address:'127.0.0.1',cidr:'127.0.0.1/8',internal:true}]};
const snapshot={routes:[{prefix:'0.0.0.0/0',gateway:'192.168.10.1',interfaceName:'Ethernet',metric:10},{prefix:'10.30.0.0/30',gateway:'10.20.0.1',interfaceName:'VPN',metric:20}],neighbors:[{address:'192.168.10.99',macAddress:'00:11:22:33:44:55',state:'Stale'}]};

test('automatic topology covers connected and explicitly routed networks without enumerating the Internet',()=>{
  const plan=planTopology(interfaces,snapshot);
  assert.equal(plan.origin.address,'192.168.10.2');
  assert.deepEqual(new Set(plan.networks.map(row=>row.cidr)),new Set(['192.168.10.0/30','10.20.0.0/30','10.30.0.0/30']));
  const addresses=plan.candidates.map(row=>row.address);
  assert.ok(addresses.includes('10.30.0.1')&&addresses.includes('10.30.0.2')&&addresses.includes('192.168.10.99'));
  assert.ok(!addresses.includes('192.168.10.0')&&!addresses.includes('192.168.10.3')&&!addresses.includes('1.1.1.1')&&!addresses.includes('127.0.0.1'));
  const capped=planTopology({LAN:[{address:'10.1.42.3',cidr:'10.1.42.3/8',internal:false}]},{routes:[],neighbors:[]},{limit:32});
  assert.equal(capped.candidates.length,32);assert.ok(capped.candidates.every(row=>row.address.startsWith('10.1.42.')));assert.equal(capped.networks[0].limited,true);
});

test('traceroute parses actual Windows and Unix replies and leaves silent hops absent',()=>{
  const hops=parseTrace('Tracing route to 1.1.1.1\n  1    <1 ms   <1 ms  192.168.10.1\n  2    * * * Request timed out.\n  3  203.0.113.8  8.1 ms\n  4  1.1.1.1  12 ms\nTrace complete.');
  assert.deepEqual(hops.map(row=>[row.ttl,row.address]),[[1,'192.168.10.1'],[3,'203.0.113.8'],[4,'1.1.1.1']]);
  assert.equal(parseTrace('1 999.1.1.1\n2 224.0.0.1\n3 * * *').length,0);
});

test('a stale neighbor, a timed-out address and a missing DNS name never become invented hosts or names',async()=>{
  const probes=[],lookups=[],progress=[];
  const report=await discoverTopology({timeoutMs:500,concurrency:4},{interfaces,localName:'poste-test',collect:async()=>snapshot,
    probe:async address=>{probes.push(address);return ['192.168.10.1','10.30.0.2'].includes(address)?{address,status:'reachable',source:'synthetic-reply',detail:'Actual fixture response'}:address==='10.20.0.1'?{address,status:'closed',detail:'Refusal may come from an intermediate firewall'}:null;},
    trace:async()=>[{target:'1.1.1.1',hops:parseTrace('1 192.168.10.1 1 ms\n2 * * *\n3 203.0.113.8 2 ms\n4 1.1.1.1 3 ms'),reached:true}],
    reverse:async address=>{lookups.push(address);if(address==='10.30.0.2')return ['serveur.reseau.test.'];throw new Error('No PTR');},onProgress:value=>progress.push(value.completed)});
  assert.ok(probes.includes('10.30.0.2')&&probes.includes('192.168.10.99'));
  assert.ok(!report.results.some(row=>row.address==='192.168.10.99'||row.status==='no-response'));
  assert.ok(!report.results.some(row=>row.address==='10.20.0.1'));
  assert.equal(report.results.find(row=>row.address==='10.30.0.2').hostname,'serveur.reseau.test');
  assert.equal(report.results.find(row=>row.address==='192.168.10.2').hostname,'poste-test');
  assert.equal(report.results.find(row=>row.address==='203.0.113.8').hostname,undefined);
  assert.ok(!lookups.includes('192.168.10.99'));assert.equal(report.completed,report.total);assert.equal(progress.at(-1),report.total);
  assert.deepEqual(report.network.paths[0].hops.map(row=>row.ttl),[1,3,4]);
});

test('route collection uses read-only OS commands, rejects blackholes and keeps IPv6 neighbor evidence',async()=>{
  const calls=[];
  const result=await collectTopology({platform:'linux',run:async(file,args)=>{calls.push([file,...args]);return JSON.stringify(args.includes('route')?[{dst:'default',gateway:'192.168.10.1',dev:'eth0'},{dst:'10.30.0.0/24',dev:'tun0'},{dst:'10.99.0.0/24',type:'blackhole'}]:[{dst:'fe80::1',dev:'eth0',lladdr:'00:11:22:33:44:55',state:['STALE']},{dst:'192.168.10.99',state:['FAILED']}]);}});
  assert.equal(result.routes.length,2);assert.equal(result.neighbors.length,1);assert.ok(calls.every(call=>call.includes('-j')));
});

test('cancelled topology retains only already confirmed replies and reports incomplete coverage',async()=>{
  const controller=new AbortController();let count=0;
  const report=await discoverTopology({concurrency:1},{interfaces,collect:async()=>snapshot,localName:'fixture',signal:controller.signal,
    probe:async address=>{if(++count===2)controller.abort();return {address,status:count===1?'reachable':'no-response'};},trace:async()=>[],reverse:async()=>[]});
  assert.equal(report.cancelled,true);assert.ok(report.completed<report.total);assert.ok(report.results.every(row=>row.status==='reachable'));assert.ok(report.warnings.some(text=>text.includes('interrompu')));
});
