import {test} from 'node:test';
import assert from 'node:assert/strict';
import {consultCERTFR,observedProducts,versionRelation,normalizeBulletin,productFamily} from '../server/lib/wolfguard/certfr.mjs';
import {serviceFingerprint,runNetworkScan} from '../agent/network.mjs';
import {evaluateSecurity} from '../agent/security-rules.mjs';
import {createServer} from 'node:net';

const now=Date.parse('2026-11-06T12:00:00Z');
function fixture({description='OpenSSH versions 8.5p1 à 9.7p1',count=1}={}){
  const objects=new Map(),calls=[];
  const env={LOCAL_TEST_ORIGIN:'http://localhost',BUCKET:{async get(key){const value=objects.get(key);return value?{body:new Response(value).body}:null;},async put(key,body){objects.set(key,body);}},CERTFR_FETCH:async(url)=>{
    calls.push(url);const path=new URL(url).pathname;
    if(path==='/avis/json/')return Response.json(Array.from({length:count},(_,i)=>({reference:'CERTFR-2026-AVI-'+String(i+1).padStart(4,'0'),title:'Vulnérabilité dans OpenSSH',last_revision_date:'2026-11-05'})));
    if(path==='/alerte/json/')return Response.json([]);
    const reference=/CERTFR-[^/]+/.exec(path)?.[0];return Response.json({reference,title:'Vulnérabilité dans OpenSSH',summary:'Conditions de compilation et de configuration à vérifier.',content:'Installer le correctif de l’éditeur.',affected_systems:[{product:{name:'OpenSSH',vendor:{name:'OpenSSH'}},description}],cves:[{name:'CVE-2024-6387'},{name:'javascript:alert(1)'}],risks:[{description:'Exécution de code à distance'}]});
  }};
  return {env,objects,calls};
}
const report={results:[{address:'192.0.2.1',port:22,transport:'TCP',status:'open',product:'SSH-2.0-OpenSSH_9.7p1 Ubuntu-1',detail:'Bannière SSH'}]};

test('only observed product evidence is used; service ports never identify an implementation',()=>{
  assert.equal(productFamily('OpenSSH_9.7p1'),'openssh');assert.equal(productFamily('Apache Tomcat'),'tomcat');assert.equal(productFamily('Apache-Coyote/1.1'),null);
  assert.equal(observedProducts({results:[{address:'192.0.2.1',port:22,service:'SSH (port usuel)'}]}).products.length,0);
  const observed=observedProducts(report);assert.equal(observed.products[0].name,report.results[0].product);assert.equal(observed.products[0].version,'9.7p1');
  assert.deepEqual(serviceFingerprint('SSH-2.0-OpenSSH_9.7p1 Ubuntu-1'),{service:'SSH',product:'OpenSSH',version:'9.7p1'});
  const http=serviceFingerprint('HTTP/1.1 200 OK\r\nServer: Apache/2.4.49\r\n\r\n');assert.equal(http.product,'Apache');assert.equal(http.version,'2.4.49');
});
test('version applicability handles boundaries conservatively and never guesses distro or OS patch rules',()=>{
  assert.equal(versionRelation('9.7p1','OpenSSH versions 8.5p1 à 9.7p1','openssh'),'in-range');
  assert.equal(versionRelation('9.8p1','OpenSSH versions 8.5p1 à 9.7p1','openssh'),'outside-range');
  assert.equal(versionRelation('2.4.61','Apache versions antérieures à 2.4.62','apache-httpd'),'in-range');
  assert.equal(versionRelation('2.4.62','Apache versions antérieures à 2.4.62','apache-httpd'),'outside-range');
  assert.equal(versionRelation('1.0.2','versions 1.0.2 et antérieures','openssl'),'in-range');
  assert.equal(versionRelation('1:9.2p1-2+deb12u7','versions antérieures à 9.8p1','openssh'),'unknown');
  assert.equal(versionRelation('10.0.19045','Windows versions antérieures à 10.0.22000','windows'),'unknown');
  assert.equal(versionRelation('9.7p1','versions antérieures à 9.8p1 sauf configurations renforcées','openssh'),'unknown');
  assert.equal(versionRelation('9.7p1','','openssh'),'unknown');
  assert.equal(versionRelation('9.7p1','versions 10.0 antérieures à 10.0p2','openssh'),'outside-range');
});
test('official API references and CVEs are retained, with public-only cache and no private data in outgoing URLs',async()=>{
  const f=fixture(),result=await consultCERTFR(report,f.env,now);
  assert.equal(result.status,'ready');assert.equal(result.findings.length,1);assert.equal(result.findings[0].applicability,'version-in-range');
  assert.equal(result.findings[0].url,'https://cert.cyber.gouv.fr/avis/CERTFR-2026-AVI-0001/');assert.deepEqual(result.findings[0].cves,['CVE-2024-6387']);
  assert.equal(result.bulletinsExamined,1);assert.equal(result.findings[0].affected[0],'OpenSSH versions 8.5p1 à 9.7p1');
  assert.ok(f.calls.every(url=>url.startsWith('https://cert.cyber.gouv.fr/')&&!url.includes('192.0.2.1')&&!url.includes('9.7p1')));
  assert.ok([...f.objects.values()].every(value=>!value.includes('192.0.2.1')&&!value.includes('Ubuntu-1')));
  const count=f.calls.length;await consultCERTFR(report,f.env,now+1000);assert.equal(f.calls.length,count);
});
test('unknown and patched versions are distinguished; no match never means no vulnerabilities',async()=>{
  const f=fixture();const patched=await consultCERTFR({results:[{product:'OpenSSH',version:'9.8p1',address:'192.0.2.1'}]},f.env,now);assert.equal(patched.findings.length,0);assert.match(patched.message,/ne confirme pas/);
  const unknown=await consultCERTFR({results:[{product:'OpenSSH',address:'192.0.2.1'}]},f.env,now);assert.equal(unknown.findings[0].applicability,'needs-verification');
  const none=await consultCERTFR({results:[{address:'192.0.2.1',port:22}]},f.env,now);assert.equal(none.status,'no-products');
});
test('API outages, stale cache and bounded coverage stay explicit instead of reporting a clean scan',async()=>{
  const f=fixture({count:25}),result=await consultCERTFR(report,f.env,now);assert.equal(result.status,'partial');assert.equal(result.bulletinsExamined,20);assert.equal(result.omitted,5);
  f.env.CERTFR_FETCH=async()=>{throw new Error('offline');};const stale=await consultCERTFR(report,f.env,now+3600001);assert.equal(stale.status,'stale');assert.equal(stale.stale,true);
  const fresh=fixture();fresh.env.CERTFR_FETCH=f.env.CERTFR_FETCH;const offline=await consultCERTFR(report,fresh.env,now);assert.equal(offline.status,'unavailable');assert.match(offline.message,/inconnue/);
  const invalid=fixture();invalid.env.CERTFR_FETCH=async()=>Response.json({not:'a catalog'});assert.equal((await consultCERTFR(report,invalid.env,now)).status,'unavailable');
});
test('bulletin normalization cannot accept arbitrary URLs or active content',()=>{
  const bulletin=normalizeBulletin({reference:'CERTFR-2026-AVI-0001',title:'<script>bad</script>',summary:'<img src=x onerror=alert(1)>Evidence',affected_systems:[],cves:[],url:'https://evil.invalid/'},'avis','2026-11-06');
  assert.equal(bulletin.url,'https://cert.cyber.gouv.fr/avis/CERTFR-2026-AVI-0001/');assert.ok(!bulletin.summary.includes('<img'));assert.throws(()=>normalizeBulletin({reference:'../../private'},'avis',''));
});
test('local software evidence passes through the audit without altering the controls',async()=>{
  const input={host:{available:true,os:'Microsoft Windows 11',version:'10.0.26100',build:'26100'},software:{available:true,items:[{name:'Mozilla Firefox',version:'131.0',vendor:'Mozilla'}]}};
  const audit=evaluateSecurity(input,now);assert.equal(audit.software[1].name,'Mozilla Firefox');
  const collected=await runNetworkScan({workspace:'vulnerability',strategy:'passive',passiveScope:'security'},{securityCollector:async()=>audit});assert.equal(collected.software[1].version,'131.0');assert.equal(collected.results.length,audit.results.length);
});

test('an observed product outside the alias list can match the same exact CERT-FR product name',async()=>{
  const f=fixture();f.env.CERTFR_FETCH=async url=>url.endsWith('/avis/json/')?Response.json([{reference:'CERTFR-2026-AVI-0001',title:'Vulnérabilité dans Acme Server',last_revision_date:'2026-11-06'}]):url.endsWith('/alerte/json/')?Response.json([]):Response.json({reference:'CERTFR-2026-AVI-0001',affected_systems:[{product:{name:'Acme Server'},description:'Acme Server versions antérieures à 2.1.0'}],cves:[]});
  const result=await consultCERTFR({software:[{name:'Acme Server',version:'2.0.0',source:'Inventaire installé'}],results:[]},f.env,now);assert.equal(result.findings[0].applicability,'version-in-range');
});

test('network service evidence retains the product/version without persisting response cookies',async()=>{
  const server=createServer(socket=>socket.end('HTTP/1.1 200 OK\r\nServer: Apache/2.4.49\r\nSet-Cookie: synthetic-private-marker\r\n\r\n'));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{const report=await runNetworkScan({workspace:'active',strategy:'active',target:'127.0.0.1',ports:String(server.address().port),identifyServices:true});assert.equal(report.results[0].product,'Apache');assert.equal(report.results[0].version,'2.4.49');assert.ok(!JSON.stringify(report).includes('synthetic-private-marker'));}
  finally{await new Promise(resolve=>server.close(resolve));}
});
