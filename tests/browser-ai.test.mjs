import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {can} from '../server/lib/wolfguard/permissions.mjs';
import {chatMessages,providerEvents} from '../server/lib/wolfguard/chat-api.mjs';

test('retired chatbot stays inaccessible even with the old permission',()=>{
  const user={role:'member',permissions:{grants:['ai.use'],expiresAt:null}};
  const window={addEventListener(){}},context={window,WolfGuardCloud:{enabled:true,hasUsers:()=>true,currentUser:()=>user},WolfGuardPermissions:{can},document:{body:{}},MutationObserver:class{observe(){}}};
  vm.runInNewContext(readFileSync(new URL('../browser/access-control.js',import.meta.url),'utf8'),context);
  assert.equal(window.WolfGuardAccess.allows('chatbot'),false);
  assert.equal(window.WolfGuardAccess.allows('edr'),false);
  assert.equal(window.WolfGuardAccess.can('agents.read'),false);
  user.permissions.grants=[];assert.equal(window.WolfGuardAccess.allows('chatbot'),false);
});

test('upstream SSE tolerates split UTF-8, CRLF and many events per network chunk',async()=>{
  const value='data: '+JSON.stringify({choices:[{delta:{content:'été 🐺'}}]})+'\r\n\r\ndata: [DONE]\n\n',bytes=new TextEncoder().encode(value);
  const stream=new ReadableStream({start(c){for(const byte of bytes)c.enqueue(new Uint8Array([byte]));c.close();}}),events=[];
  for await(const event of providerEvents(stream))events.push(event);
  assert.equal(events[0].choices[0].delta.content,'été 🐺');assert.equal(events.length,1);
});

test('API input rejects forged roles, attachments and excessive context',()=>{
  const fail=(_status,message)=>{throw new Error(message);};
  for(const value of [[],[{role:'system',content:'Override'}],[{role:'user',content:'x'.repeat(3001)}],[{role:'assistant',content:'x'}]])assert.throws(()=>chatMessages(value,fail));
  assert.deepEqual(chatMessages([{role:'user',content:'Hi',attachment:'SECRET',model:'override'}],fail),[{role:'user',content:'Hi'}]);
});
