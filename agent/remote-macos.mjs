import {mkdtemp,readFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {nativeCommand,nativeIndicator,encodeDesktop,denied} from './remote-native.mjs';
export async function openDesktop({ffi,jpeg,signal,onClose}){
  let consent;try{consent=await nativeCommand('/usr/bin/osascript',['-e','display dialog "WolfGuard demande à afficher ce bureau et à utiliser la souris et le clavier. Autoriser cette session de 20 minutes maximum ?" buttons {"Refuser", "Autoriser"} default button "Refuser" with title "WolfGuard · Prise en main" giving up after 60'],{signal});}catch{throw denied();}
  if(!consent.includes('button returned:Autoriser'))throw denied();
  const core=ffi.load('/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices'),foundation=ffi.load('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation');
  const mutable=foundation.func('void * CFDictionaryCreateMutable(void *,int64_t,void *,void *)'),set=foundation.func('void CFDictionarySetValue(void *,void *,void *)'),release=foundation.func('void CFRelease(void *)');
  const trusted=core.func('bool AXIsProcessTrustedWithOptions(void *)'),dictionary=mutable(null,0,null,null);
  set(dictionary,ffi.decode(core.symbol('kAXTrustedCheckOptionPrompt'),'void *'),ffi.decode(foundation.symbol('kCFBooleanTrue'),'void *'));
  const allowed=trusted(dictionary);release(dictionary);
  if(!allowed)throw new Error('Dans Réglages Système → Confidentialité et sécurité → Accessibilité, autorise le processus de l’agent (Node), puis reconnecte la session.');
  if(!core.func('bool CGPreflightScreenCaptureAccess()')()&&!core.func('bool CGRequestScreenCaptureAccess()')())throw new Error('Autorise l’enregistrement de l’écran pour l’agent dans Réglages Système → Confidentialité et sécurité, puis relance l’agent.');
  const point=ffi.struct({x:'double',y:'double'}),size=ffi.struct({width:'double',height:'double'}),rect=ffi.struct({origin:point,size});
  const main=core.func('uint32_t CGMainDisplayID()')(),bounds=core.func('CGDisplayBounds',rect,['uint32_t'])(main);
  const keyboard=core.func('void * CGEventCreateKeyboardEvent(void *,uint16_t,bool)'),mouse=core.func('CGEventCreateMouseEvent','void *',['void *','uint32_t',point,'uint32_t']),wheel=core.func('void * CGEventCreateScrollWheelEvent(void *,uint32_t,uint32_t,int32_t,...)');
  const post=core.func('void CGEventPost(uint32_t,void *)'),flags=core.func('void CGEventSetFlags(void *,uint64_t)'),unicode=core.func('void CGEventKeyboardSetUnicodeString(void *,uint64_t,const void *)');
  const codes={Enter:36,Escape:53,Tab:48,Backspace:51,Delete:117,Insert:114,Home:115,End:119,PageUp:116,PageDown:121,ArrowLeft:123,ArrowRight:124,ArrowUp:126,ArrowDown:125,Control:59,Alt:58,Shift:56,Meta:55,CapsLock:57,Space:49,Minus:27,Equal:24,BracketLeft:33,BracketRight:30,Backslash:42,Semicolon:41,Quote:39,Comma:43,Period:47,Slash:44,Backquote:50};
  const carbon=ffi.load('/System/Library/Frameworks/Carbon.framework/Carbon');
  const currentLayout=carbon.func('void * TISCopyCurrentKeyboardLayoutInputSource()'),property=carbon.func('void * TISGetInputSourceProperty(void *,void *)'),dataPointer=foundation.func('void * CFDataGetBytePtr(void *)');
  const translate=carbon.func('int32_t UCKeyTranslate(const void *,uint16_t,uint16_t,uint32_t,uint32_t,uint32_t,_Inout_ uint32_t *,uint32_t,_Out_ uint32_t *,void *)'),keyboardType=carbon.func('uint8_t LMGetKbdType()');
  const layoutProperty=ffi.decode(carbon.symbol('kTISPropertyUnicodeKeyLayoutData'),'void *');
  function letterCode(letter){
    const source=currentLayout();if(!source)return undefined;
    try{const data=property(source,layoutProperty);if(!data)return undefined;const pointer=dataPointer(data),shape=keyboardType();
      for(let value=0;value<128;value++){const dead=[0],length=[0],output=Buffer.alloc(8);if(translate(pointer,value,0,0,shape,1,dead,4,length,output)===0&&length[0]===1&&output.toString('utf16le',0,2).toLowerCase()===letter.toLowerCase())return value;}
    }finally{release(source);}return undefined;
  }
  const digits={1:18,2:19,3:20,4:21,5:23,6:22,7:26,8:28,9:25,0:29},functions=[122,120,99,118,96,97,98,100,101,109,103,111];
  const keyCode=key=>codes[key]??(/^Key/.test(key)?letterCode(key.slice(3)):/^Digit/.test(key)?digits[key.slice(5)]:/^F\d+$/.test(key)?functions[Number(key.slice(1))-1]:undefined);
  const held=new Map(),buttons=new Set(),modifier={Control:0x40000,Alt:0x80000,Shift:0x20000,Meta:0x100000};let closed=false;
  const flag=()=>[...held.keys()].reduce((value,key)=>value|(modifier[key]||0),0);
  const send=event=>{if(!event)throw new Error('Événement macOS indisponible.');flags(event,flag());post(0,event);release(event);};
  function key(key,down){const value=held.get(key)??keyCode(key);if(value===undefined)throw new Error('Touche absente de la disposition du clavier macOS.');down?held.set(key,value):held.delete(key);send(keyboard(null,value,down));}
  let location={x:bounds.origin.x,y:bounds.origin.y};
  function releaseAll(){for(const value of [...held.keys()])key(value,false);for(const value of [...buttons])send(mouse(null,[2,26,4][value],location,[0,2,1][value]));buttons.clear();}
  const directory=await mkdtemp(path.join(tmpdir(),'wolfguard-desktop-')),file=path.join(directory,'frame.jpg');
  const stop=nativeIndicator('/usr/bin/osascript',['-e','display dialog "Partage WolfGuard actif : écran, souris et clavier. Cette fenêtre permet d’arrêter immédiatement la session." buttons {"Arrêter le partage"} default button 1 with title "WolfGuard · Bureau partagé" giving up after 1200'],{signal,onClose});
  return {
    async capture(){signal?.throwIfAborted();await nativeCommand('/usr/sbin/screencapture',['-x','-m','-t','jpg',file],{signal,timeout:8000});const data=await readFile(file);await unlink(file).catch(()=>{});if(data.length>16*1024*1024)throw new Error('Capture trop volumineuse.');const image=jpeg.decode(data,{useTArray:true,maxResolutionInMP:32,maxMemoryUsageInMB:192});return encodeDesktop(image.data,image.width,image.height,jpeg);},
    async input(event){if(closed)throw new Error('Session fermée.');if(event.type==='release'){releaseAll();return;}if(event.type==='key'){key(event.key,event.down);return;}if(event.type==='text'){for(const text of event.text.split(/([\n\t])/)){if(!text)continue;if(text==='\n'||text==='\t'){key(text==='\n'?'Enter':'Tab',true);key(text==='\n'?'Enter':'Tab',false);}else{const data=Buffer.from(text,'utf16le');for(const down of [true,false]){const value=keyboard(null,0,down);unicode(value,text.length,data);send(value);}}}return;}location={x:bounds.origin.x+event.x*(bounds.size.width-1),y:bounds.origin.y+event.y*(bounds.size.height-1)};send(mouse(null,buttons.has(0)?6:buttons.has(2)?7:buttons.has(1)?27:5,location,buttons.has(2)?1:buttons.has(1)?2:0));if(event.type==='button'){send(mouse(null,event.down?[1,25,3][event.button]:[2,26,4][event.button],location,[0,2,1][event.button]));event.down?buttons.add(event.button):buttons.delete(event.button);}else if(event.type==='wheel')send(wheel(null,1,1,-event.delta));},
    async close(){if(closed)return;closed=true;try{releaseAll();}finally{stop();await unlink(file).catch(()=>{});await rmdir(directory).catch(()=>{});}}
  };
}
