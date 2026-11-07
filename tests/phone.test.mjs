import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('the retired push worker unsubscribes and closes old notifications without approving a login or opening a window',async()=>{
  const handlers={};let unsubscribed=0,closed=0,unregistered=0;
  const self={addEventListener(name,handler){handlers[name]=handler;},async skipWaiting(){},registration:{pushManager:{async getSubscription(){return {async unsubscribe(){unsubscribed++;}};}},async getNotifications(){return [{close(){closed++;}}];},async unregister(){unregistered++;}}};
  vm.runInNewContext(readFileSync(new URL('../app/push-worker.js',import.meta.url),'utf8'),{self});
  let work;handlers.activate({waitUntil(promise){work=promise;}});await work;
  assert.equal(unsubscribed,1);assert.equal(closed,1);assert.equal(unregistered,1);assert.equal(handlers.push,undefined);
  handlers.notificationclick({notification:{close(){closed++;}}});assert.equal(closed,2);
});
