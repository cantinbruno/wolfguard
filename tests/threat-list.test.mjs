import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {matchesNetwork,parseNetwork,threatList,threatMatch} from '../server/lib/wolfguard/threat-list.mjs';
import {handleAPI} from '../server/lib/wolfguard/core.mjs';

test('CIDR checks cover IPv4, IPv6 and mapped IPv4 without accepting ports or invalid masks',()=>{
  for(const [ip,cidr,expected]of [['192.0.2.99','192.0.2.0/24',true],['192.0.3.1','192.0.2.0/24',false],['2001:db8::ffff','2001:db8::/32',true],['2001:db9::1','2001:db8::/32',false],['::ffff:c000:201','192.0.2.0/24',true],['192.0.2.1:80','192.0.2.0/24',false],['192.0.2.1','2001:db8::/32',false]])assert.equal(matchesNetwork(ip,cidr),expected,ip);
  for(const cidr of ['0.0.0.0/0','1.2.3.4/33','::/129','192.0.2.0/24/1','garbage','192.0.2.0/-1'])assert.equal(parseNetwork(cidr),null);
});

test('feed updates validate both sources, persist in R2, remove delisted networks and expire safely',async()=>{
  let now=Date.now()+2*86400000,calls=0,broken=false,stored=null;
  const env={BUCKET:{async get(){return stored?{body:stored}:null;},async put(_key,value){stored=value;}},THREAT_FEED_FETCH:async url=>{
    calls++;if(broken)return new Response('unavailable',{status:503});
    return new Response(JSON.stringify({cidr:url.includes('v4')?'192.0.2.0/24':'2001:db8::/32',sblid:'SBL-test'})+'\n'+JSON.stringify({timestamp:Math.floor(now/1000),copyright:'Synthetic source'}));
  }};
  let list=await threatList(env,now,{force:true});assert.equal(calls,2);assert.equal(threatMatch(list,'192.0.2.20'),true);assert.ok(stored);assert.equal(list.sources[0].networks.length,1);
  await threatList(env,now+500,{force:true});assert.equal(calls,2,'updates are limited to at most hourly');
  broken=true;now+=2*86400000;list=await threatList(env,now,{refresh:true});assert.ok(list.error);assert.equal(threatMatch(list,'192.0.2.20'),true,'recent last good list survives failures');
  now+=2*86400000;list=await threatList(env,now,{refresh:true});assert.equal(list.expired,true);assert.equal(threatMatch(list,'192.0.2.20'),false);
});

test('a malformed replacement never overwrites a valid source',async()=>{
  const now=Date.now()+2*86400000;
  const env={THREAT_FEED_FETCH:async()=>new Response('{"cidr":"0.0.0.0/0"}\n'+JSON.stringify({timestamp:Math.floor(now/1000),copyright:'test'}))};
  const list=await threatList(env,now,{force:true});assert.ok(list.error);assert.ok(list.sources[0].networks.length>1);
});

test('blocked private entry is indistinguishable from an unknown URL, even with the right entry key',async()=>{
  const key='a'.repeat(64),env={ENTRY_LINK_HASH:createHash('sha256').update(key).digest('hex'),AUTH_PEPPER:'1'.repeat(64),DB:{prepare(){return {bind(){return this;},async first(){return {id:'blocked'};}};}}};
  const response=await handleAPI(new Request('https://backend.test/api/entry',{method:'POST',headers:{Authorization:'Bearer '+key,'CF-Connecting-IP':'192.0.2.1'}}),env);
  assert.equal(response.status,404);assert.deepEqual(await response.json(),{error:'Adresse inconnue.'});
});

test('reputation blocks private entry for IPv4 and IPv6 while ignoring spoofed forwarding headers',async()=>{
  const now=Date.now(),key='b'.repeat(64),list={sources:['v4','v6'].map(family=>({url:'https://www.spamhaus.org/drop/drop_'+family+'.json',timestamp:Math.floor(now/1000),copyright:'Synthetic source',networks:[{cidr:family==='v4'?'192.0.2.0/24':'2001:db8::/32',sblid:'SBL-test'}]}))};
  const env={LOCAL_TEST_ORIGIN:'https://backend.test',ENTRY_LINK_HASH:createHash('sha256').update(key).digest('hex'),AUTH_PEPPER:'1'.repeat(64),BUCKET:{async get(){return {body:JSON.stringify(list)};}},DB:{prepare(){return {bind(){return this;},async first(){return null;}};}}};
  const call=ip=>handleAPI(new Request('https://backend.test/api/entry',{method:'POST',headers:{Authorization:'Bearer '+key,'CF-Connecting-IP':ip,'X-Forwarded-For':'192.0.2.10'}}),env);
  for(const ip of ['192.0.2.10','2001:db8::10','::ffff:c000:20a']){const response=await call(ip);assert.equal(response.status,404);assert.deepEqual(await response.json(),{error:'Adresse inconnue.'});}
  assert.equal((await call('198.51.100.1')).status,204);
});
