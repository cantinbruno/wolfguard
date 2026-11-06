import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('phone worker shows approval actions, signs the selected decision and opens only the confirmation page',async()=>{
  const handlers={},notifications=[],decisions=[],opened=[];
  const self={location:{href:'https://wolfguard.wavetools.fr/push-worker.js'},addEventListener(name,handler){handlers[name]=handler;},registration:{async showNotification(...args){notifications.push(args);}},clients:{async openWindow(url){opened.push(url);}},skipWaiting(){}};
  vm.runInNewContext(readFileSync(new URL('../app/push-worker.js',import.meta.url),'utf8'),{self,importScripts(){},URL,Date,WolfGuardPhone:{async decide(...args){decisions.push(args);}}});
  const request={type:'login',id:'a'.repeat(32),nonce:'b'.repeat(64),deviceId:'c'.repeat(32),displayCode:'1234',expiresAt:Date.now()+120000};
  const fire=async(name,fields)=>{let pending;handlers[name]({...fields,waitUntil(promise){pending=promise;}});await pending;};
  await fire('push',{data:{json:()=>request}});
  assert.equal(notifications[0][0],'WolfGuard · demande 1234');assert.equal(notifications[0][1].actions[0].action,'approve');assert.equal(notifications[0][1].actions[1].action,'deny');
  await fire('notificationclick',{notification:{data:request,close(){}},action:'approve'});assert.equal(decisions[0][1],'approve');assert.equal(opened.length,0);
  await fire('notificationclick',{notification:{data:request,close(){}},action:'deny'});assert.equal(decisions[1][1],'deny');
  await fire('notificationclick',{notification:{data:request,close(){}},action:''});
  assert.equal(opened[0],'https://wolfguard.wavetools.fr/approve.html#request='+request.id+'&device='+request.deviceId);assert.ok(!opened[0].includes('access='));
  const count=notifications.length;await fire('push',{data:{json:()=>({...request,expiresAt:Date.now()-1})}});assert.equal(notifications.length,count);
  assert.ok(!readFileSync(new URL('../app/push-worker.js',import.meta.url),'utf8').includes("addEventListener('fetch'"));
});
