import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {createWindowsEncoder} from '../agent/remote-windows-encoder.mjs';
import {prepareDesktopRuntime} from '../agent/remote-runtime.mjs';
import {encodeDesktop} from '../agent/remote-native.mjs';
import {openDesktop} from '../agent/remote-windows.mjs';

// Run after publication tests, which deliberately alter the public executable.
const executable=fileURLToPath(new URL('../app/downloads/WolfGuard-Agent-Windows.exe',import.meta.url));
test('Windows native JPEG encoder works without a desktop popup and keeps the event loop available',{skip:process.platform!=='win32'},async()=>{
  const cancel=new AbortController(),encoder=createWindowsEncoder({signal:cancel.signal,executable});
  try{
    const {ffi,jpeg}=await prepareDesktopRuntime(path.join(process.env.LOCALAPPDATA,'WolfGuardAgent'));
    const pixels=Buffer.alloc(1920*1080*4);for(let index=0;index<pixels.length;index+=4){pixels[index+(index<1920*540*4?2:0)]=220;pixels[index+3]=255;}
    await encoder.encode(pixels,1920,1080);
    let ticked=false;setTimeout(()=>{ticked=true;},0);
    const started=performance.now(),frame=await encoder.encode(pixels,1920,1080),nativeMs=performance.now()-started;
    assert.equal(ticked,true);assert.equal(frame.width,1600);assert.equal(frame.height,900);
    const decoded=jpeg.decode(Buffer.from(frame.jpeg,'base64'));
    assert.ok(decoded.data[0]>200&&decoded.data[1]<15&&decoded.data[2]<15);
    const bottom=(frame.height-1)*frame.width*4;assert.ok(decoded.data[bottom]<15&&decoded.data[bottom+2]>200,'The encoded image must remain upright');
    const user=ffi.load('user32.dll'),pid=user.func('uint32_t __stdcall GetWindowThreadProcessId(void *,_Out_ uint32_t *)'),visible=user.func('bool __stdcall IsWindowVisible(void *)');
    const callback=ffi.proto('bool __stdcall (void *,intptr_t)'),enumerate=user.func('bool __stdcall EnumWindows(void *,intptr_t)');
    let popup=false;
    const pointer=ffi.register(handle=>{const out=[0];pid(handle,out);if(out[0]===encoder.processId&&visible(handle))popup=true;return true;},ffi.pointer(callback));
    try{enumerate(pointer,0);}finally{ffi.unregister(pointer);}
    assert.equal(popup,false,'Image encoding opened a desktop popup');
    const baseline=performance.now();encodeDesktop(pixels,1920,1080,jpeg,{bgr:true});
    console.log('Synthetic 1080p JPEG: native '+nativeMs.toFixed(1)+' ms, JavaScript '+(performance.now()-baseline).toFixed(1)+' ms');
    cancel.abort();assert.throws(()=>encoder.encode(pixels,1920,1080),{name:'AbortError'});
  }finally{encoder.close();}
});

test('real Windows mouse clicks and keyboard input work in a dedicated test window',{skip:process.platform!=='win32'},async()=>{
  const fixture=fileURLToPath(new URL('./remote-input-target.ps1',import.meta.url));
  const target=spawn('powershell.exe',['-STA','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fixture],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  const lines=createInterface({input:target.stdout}),events=[];
  let failure='',adapter,user,original;
  lines.on('line',line=>{try{events.push(JSON.parse(line));}catch{}});
  target.stderr.on('data',data=>{failure+=data;});target.on('error',error=>{failure=error.message;});
  const wait=async name=>{const end=Date.now()+7000;while(!events.some(event=>event.event===name)){if(failure||target.exitCode!==null||Date.now()>end)throw new Error('Input fixture unavailable: '+failure);await new Promise(resolve=>setTimeout(resolve,10));}return events.find(event=>event.event===name);};
  try{
    const ready=await wait('ready'),{ffi}=await prepareDesktopRuntime(path.join(process.env.LOCALAPPDATA,'WolfGuardAgent'));
    adapter=await openDesktop({ffi,encoderFactory:()=>({encode(){throw new Error('This test must not capture the desktop');},close(){}})});
    user=ffi.load('user32.dll');original=Buffer.alloc(8);user.func('bool __stdcall GetCursorPos(void *)')(original);
    const foreground=user.func('uintptr_t __stdcall GetForegroundWindow()'),metrics=user.func('int __stdcall GetSystemMetrics(int)');
    const pointType=ffi.struct({x:'int32_t',y:'int32_t'}),atPoint=user.func('WindowFromPoint','void *',[pointType]),ancestor=user.func('uintptr_t __stdcall GetAncestor(void *,uint32_t)');
    const guard=()=>assert.equal(Number(foreground()),ready.handle,'Refusing to inject input outside the dedicated test window');
    async function click(point){assert.equal(Number(ancestor(atPoint(point),2)),ready.handle,'Refusing to click outside the dedicated test window');const event={type:'button',x:point.x/(metrics(0)-1),y:point.y/(metrics(1)-1),button:0};await adapter.input({...event,down:true});await adapter.input({...event,down:false});await new Promise(resolve=>setTimeout(resolve,80));}
    async function key(value){guard();await adapter.input({type:'key',key:value,down:true});await adapter.input({type:'key',key:value,down:false});}
    await click(ready.text);guard();await adapter.input({type:'text',text:'ab'});await key('ArrowLeft');await key('Delete');
    await adapter.input({type:'text',text:'é'});await click(ready.button);
    const clicked=await wait('clicked');assert.equal(clicked.text,'aé');
  }finally{
    await adapter?.close();
    if(user&&original)user.func('bool __stdcall SetCursorPos(int,int)')(original.readInt32LE(0),original.readInt32LE(4));
    lines.close();target.stdin.end();
    await new Promise(resolve=>{if(target.exitCode!==null)return resolve();const timeout=setTimeout(()=>{target.kill();resolve();},2000);target.once('close',()=>{clearTimeout(timeout);resolve();});});
  }
});

test('Windows encoder fails promptly for a missing executable and rejects aborted launches',{skip:process.platform!=='win32'},async()=>{
  const encoder=createWindowsEncoder({executable:'C:/wolfguard-test-missing/agent.exe'});
  try{await assert.rejects(encoder.encode(Buffer.alloc(16),2,2),/Windows/);}finally{encoder.close();}
  const cancel=new AbortController();cancel.abort();assert.throws(()=>createWindowsEncoder({signal:cancel.signal,executable}),{name:'AbortError'});
});
