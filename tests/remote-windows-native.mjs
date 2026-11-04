import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {startWindowsSharing} from '../agent/remote-windows.mjs';

// Run after publication tests, which deliberately alter the public executable.
test('actual Node agent opens a sharing indicator without confirmation and stops on cancellation',{skip:process.platform!=='win32'},async()=>{
  const cancel=new AbortController();
  const executable=fileURLToPath(new URL('../app/downloads/WolfGuard-Agent-Windows.exe',import.meta.url));
  let closed=0;
  const stop=await startWindowsSharing(cancel.signal,()=>closed++,{executable});
  try{assert.equal(closed,0);cancel.abort();}finally{stop();}
  await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(closed,0);
  await assert.rejects(startWindowsSharing(cancel.signal,()=>{},{executable}),{name:'AbortError'});
});

test('Windows sharing reports a missing executable promptly',{skip:process.platform!=='win32'},async()=>{
  await assert.rejects(startWindowsSharing(undefined,()=>{},{executable:'C:/wolfguard-test-missing/agent.exe'}),/n’a pas pu démarrer/);
});
