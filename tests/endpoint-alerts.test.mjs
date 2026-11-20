import test from 'node:test';
import assert from 'node:assert/strict';
import {protectionAlertQueue,runEndpointProtection} from '../agent/endpoint.mjs';
import {endpointSnapshot} from '../server/lib/wolfguard/endpoint-spec.mjs';

const snapshot=(at,extra={})=>({collectedAt:at,platform:'win32',provider:'Defender',supported:true,canEnforce:false,antivirus:'enabled',realtime:'enabled',firewall:'enabled',signatures:'enabled',activeThreats:0,events:[],...extra});

test('confirmed disabled protections produce one queued alert, preserved until receipt',()=>{
  const queue=protectionAlertQueue(),now=Date.now();
  assert.deepEqual(queue.observe(snapshot(now)),[]);
  const first=queue.observe(snapshot(now+1,{firewall:'disabled'}));
  assert.equal(first.length,1);assert.equal(first[0].severity,'high');assert.equal(first[0].status,'alert');
  assert.equal(endpointSnapshot(snapshot(now+1,{events:first})).events.length,1);
  assert.deepEqual(queue.observe(snapshot(now+2,{firewall:'disabled'})),first);
  queue.acknowledge(first);
  assert.deepEqual(queue.observe(snapshot(now+3,{firewall:'disabled'})),[]);
  assert.deepEqual(queue.observe(snapshot(now+4,{firewall:'unknown'})),[]);
  const restored=queue.observe(snapshot(now+5));
  assert.equal(restored.length,2);assert.ok(restored.every(row=>row.status==='info'));
  assert.equal(restored[0].id,first[0].id);assert.match(restored[0].detail,/Rétablissement confirmé/);
  assert.equal(restored[1].occurredAt,now+5);
  queue.acknowledge(restored);
  const next=queue.observe(snapshot(now+6,{firewall:'disabled'}));
  assert.notEqual(next[0].id,first[0].id);
});

test('unknown, passive and unsupported states do not invent alerts or recoveries',()=>{
  const queue=protectionAlertQueue(),now=Date.now();
  assert.deepEqual(queue.observe(snapshot(now,{supported:false,firewall:'disabled'})),[]);
  assert.deepEqual(queue.observe(snapshot(now,{antivirus:'passive',firewall:'unknown'})),[]);
  const alert=queue.observe(snapshot(now+1,{realtime:'disabled',signatures:'disabled'}));
  assert.equal(alert.length,2);assert.equal(alert.find(row=>row.title.includes('Signatures')).severity,'medium');
  queue.acknowledge(alert);
  assert.deepEqual(queue.observe(snapshot(now+2,{realtime:'unknown',signatures:'unknown'})),[]);
});

test('a lost report is retried with the same alert and native evidence',async()=>{
  const controller=new AbortController(),reports=[],native={id:'native-event',occurredAt:Date.now(),provider:'Defender',title:'Detection',detail:'Native evidence',resource:'',status:'alert',severity:'high'};
  const client={async post(path,report){assert.equal(path,'edr/report');reports.push(report);if(reports.length===1)throw new Error('Relay unavailable');controller.abort();return {revision:0,policy:{mode:'observe'}};}};
  await runEndpointProtection(client,{signal:controller.signal,intervalMs:1,collect:async()=>snapshot(Date.now(),{firewall:'disabled',events:[native]}),execute:()=>{throw new Error('No action expected');}});
  assert.equal(reports.length,2);assert.equal(reports[0].events.length,2);
  assert.deepEqual(reports[0].events,reports[1].events);
});

test('WolfGuard engine errors are observed without treating an intentional pause as a failure',()=>{
  const queue=protectionAlertQueue(),now=Date.now();
  assert.deepEqual(queue.observe(snapshot(now,{wolfguardAntivirus:{installed:true,enabled:false,state:'ready'}})),[]);
  const alert=queue.observe(snapshot(now+1,{wolfguardAntivirus:{installed:true,enabled:true,state:'error'}}));
  assert.equal(alert.length,1);assert.match(alert[0].title,/WolfGuard/);queue.acknowledge(alert);
  assert.deepEqual(queue.observe(snapshot(now+2,{wolfguardAntivirus:{installed:true,enabled:true,state:'scanning'}})),[]);
  assert.equal(queue.observe(snapshot(now+3,{wolfguardAntivirus:{installed:true,enabled:true,state:'ready'}})).length,2);
});
