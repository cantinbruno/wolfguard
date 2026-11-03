import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {encodeDesktop,denied} from './remote-native.mjs';
const host=()=>process.env.WOLFGUARD_AGENT_EXE||fileURLToPath(new URL('../WolfGuard-Agent.exe',import.meta.url));
async function permission(signal,onClose){
  const child=spawn(host(),['--remote-permission'],{windowsHide:false,stdio:['pipe','pipe','ignore']}),lines=createInterface({input:child.stdout});let accepted=false,settled=false;
  const stop=()=>{if(!child.killed)child.kill();};signal?.addEventListener('abort',stop,{once:true});
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{stop();reject(denied());},65000);
    const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timeout);error?reject(error):resolve();};
    lines.on('line',line=>{try{const value=JSON.parse(line);if(value.status==='accepted'){accepted=true;finish();}}catch{}});
    child.once('error',()=>finish(new Error('Télécharge la nouvelle version de l’agent Windows pour utiliser la prise en main.')));
    child.once('exit',()=>{signal?.removeEventListener('abort',stop);if(!accepted)finish(denied());else onClose();});
  });
  return ()=>{signal?.removeEventListener('abort',stop);stop();lines.close();};
}
export async function openDesktop({ffi,jpeg,signal,onClose,permissionPrompt=permission}){
  const stop=await permissionPrompt(signal,onClose);signal?.throwIfAborted();
  const user=ffi.load('user32.dll'),gdi=ffi.load('gdi32.dll');
  const metrics=user.func('int __stdcall GetSystemMetrics(int)'),getDC=user.func('void * __stdcall GetDC(void *)'),releaseDC=user.func('int __stdcall ReleaseDC(void *,void *)');
  try{user.func('void * __stdcall SetThreadDpiAwarenessContext(void *)')(-4);}catch{}
  const width=metrics(0),height=metrics(1);if(width<1||height<1||width*height>32000000){stop();throw new Error('Bureau interactif indisponible.');}
  const createDC=gdi.func('void * __stdcall CreateCompatibleDC(void *)'),deleteDC=gdi.func('bool __stdcall DeleteDC(void *)'),select=gdi.func('void * __stdcall SelectObject(void *,void *)'),deleteObject=gdi.func('bool __stdcall DeleteObject(void *)');
  const createBitmap=gdi.func('void * __stdcall CreateDIBSection(void *,const void *,uint32_t,_Out_ void **,void *,uint32_t)'),copy=gdi.func('bool __stdcall BitBlt(void *,int,int,int,int,void *,int,int,uint32_t)');
  const info=Buffer.alloc(44);info.writeUInt32LE(40);info.writeInt32LE(width,4);info.writeInt32LE(-height,8);info.writeUInt16LE(1,12);info.writeUInt16LE(32,14);
  const screen=getDC(null),memory=createDC(screen),bits=[null],bitmap=createBitmap(screen,info,0,bits,null,0);if(!screen||!memory||!bitmap){stop();throw new Error('Capture du bureau Windows indisponible.');}
  const previous=select(memory,bitmap),heldKeys=new Set(),heldButtons=new Set();let closed=false;
  const setCursor=user.func('bool __stdcall SetCursorPos(int,int)');
  const send=user.func('uint32_t __stdcall SendInput(uint32_t,const void *,int)');
  function keyboard(code,down,unicode=false){const payload=Buffer.alloc(32);payload.writeUInt16LE(unicode?0:code,0);payload.writeUInt16LE(unicode?code:0,2);payload.writeUInt32LE((down?0:2)|(unicode?4:0),4);if(send(1,Buffer.concat([Buffer.from([1,0,0,0,0,0,0,0]),payload]),40)!==1)throw new Error('Windows bloque le contrôle de cette fenêtre. Les fenêtres élevées et sécurisées restent gérées par Windows.');}
  function mouse(flags,data=0){const payload=Buffer.alloc(32);payload.writeInt32LE(data,8);payload.writeUInt32LE(flags,12);if(send(1,Buffer.concat([Buffer.alloc(8),payload]),40)!==1)throw new Error('Souris distante indisponible.');}
  const codes={Enter:13,Escape:27,Tab:9,Backspace:8,Delete:46,Insert:45,Home:36,End:35,PageUp:33,PageDown:34,ArrowLeft:37,ArrowRight:39,ArrowUp:38,ArrowDown:40,Control:17,Alt:18,Shift:16,Meta:91,CapsLock:20,ContextMenu:93,Space:32,Minus:189,Equal:187,BracketLeft:219,BracketRight:221,Backslash:220,Semicolon:186,Quote:222,Comma:188,Period:190,Slash:191,Backquote:192};
  const code=key=>codes[key]??(/^Key[A-Z]$/.test(key)?key.charCodeAt(3):/^Digit[0-9]$/.test(key)?key.charCodeAt(5):/^F\d+$/.test(key)?111+Number(key.slice(1)):0);
  function release(){for(const value of heldKeys){try{keyboard(value,false);}catch{}}for(const value of heldButtons){try{mouse([4,64,16][value]);}catch{}}heldKeys.clear();heldButtons.clear();}
  return {
    async capture(){signal?.throwIfAborted();if(closed||metrics(0)!==width||metrics(1)!==height||!copy(memory,0,0,width,height,screen,0,0,0x40cc0020))throw new Error('Le bureau Windows a changé ou n’est plus accessible. Reconnecte la session.');const bgra=Buffer.from(ffi.view(bits[0],width*height*4));return encodeDesktop(bgra,width,height,jpeg,{bgr:true});},
    async input(event){if(closed)throw new Error('Session fermée.');if(event.type==='release'){release();return;}if(event.type==='text'){for(let index=0;index<event.text.length;index++){const value=event.text.charCodeAt(index),special=value===10||value===9;keyboard(value===10?13:value,true,!special);keyboard(value===10?13:value,false,!special);}return;}if(event.type==='key'){const value=code(event.key);if(!value)throw new Error('Touche non prise en charge.');keyboard(value,event.down);event.down?heldKeys.add(value):heldKeys.delete(value);return;}setCursor(Math.round(event.x*(width-1)),Math.round(event.y*(height-1)));if(event.type==='button'){mouse(event.down?[2,32,8][event.button]:[4,64,16][event.button]);event.down?heldButtons.add(event.button):heldButtons.delete(event.button);}else if(event.type==='wheel')mouse(0x800,-event.delta*120);},
    async close(){if(closed)return;closed=true;release();select(memory,previous);deleteObject(bitmap);deleteDC(memory);releaseDC(null,screen);stop();}
  };
}
