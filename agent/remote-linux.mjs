import {nativeCommand,nativeIndicator,executable,denied,encodeDesktop} from './remote-native.mjs';
export async function linuxConsent(signal,onClose){
  const zenity=await executable('zenity'),kdialog=await executable('kdialog'),xmessage=await executable('xmessage');
  const prompt='WolfGuard demande à afficher ce bureau et à utiliser la souris et le clavier. Autoriser cette session de 20 minutes maximum ?';
  try{
    if(zenity)await nativeCommand(zenity,['--question','--title=WolfGuard · Prise en main','--text='+prompt,'--ok-label=Autoriser','--cancel-label=Refuser','--default-cancel','--timeout=60'],{signal});
    else if(kdialog){const response=await nativeCommand(kdialog,['--title','WolfGuard · Prise en main','--default','Refuser','--menu',prompt,'Refuser','Refuser','Autoriser','Autoriser cette session'],{signal});if(response.trim()!=='Autoriser')throw denied();}
    else if(xmessage){const response=await nativeCommand(xmessage,['-center','-print','-buttons','Refuser:1,Autoriser:0','-default','Refuser','-timeout','60',prompt],{signal});if(response.trim()!=='Autoriser')throw denied();}
    else throw new Error('Installe zenity ou kdialog sur le poste pour afficher la demande et le bouton d’arrêt du partage.');
  }catch(error){if(error.code==='CONSENT_DENIED'||!zenity&&!kdialog&&!xmessage)throw error;throw denied();}
  const text='Partage WolfGuard actif : écran, souris et clavier. Ferme cette fenêtre ou clique sur Arrêter pour terminer la session.';
  if(zenity)return nativeIndicator(zenity,['--info','--title=WolfGuard · Bureau partagé','--text='+text,'--ok-label=Arrêter le partage','--no-wrap'],{signal,onClose});
  if(kdialog)return nativeIndicator(kdialog,['--title','WolfGuard · Bureau partagé','--msgbox',text,'--ok-label','Arrêter le partage'],{signal,onClose});
  return nativeIndicator(xmessage,['-center','-buttons','Arrêter:0',text],{signal,onClose});
}
export const keysyms={Enter:0xff0d,Escape:0xff1b,Tab:0xff09,Backspace:0xff08,Delete:0xffff,Insert:0xff63,Home:0xff50,End:0xff57,PageUp:0xff55,PageDown:0xff56,ArrowLeft:0xff51,ArrowRight:0xff53,ArrowUp:0xff52,ArrowDown:0xff54,Control:0xffe3,Alt:0xffe9,Shift:0xffe1,Meta:0xffeb,CapsLock:0xffe5,ContextMenu:0xff67,Space:32,Minus:45,Equal:61,BracketLeft:91,BracketRight:93,Backslash:92,Semicolon:59,Quote:39,Comma:44,Period:46,Slash:47,Backquote:96};
export function keysym(key){return keysyms[key]??(/^Key[A-Z]$/.test(key)?key.slice(3).toLowerCase().charCodeAt(0):/^Digit[0-9]$/.test(key)?Number(key.slice(5))+48:/^F\d+$/.test(key)?0xffbd+Number(key.slice(1)):0);}
export const characterSym=value=>value==='\n'?keysyms.Enter:value==='\t'?keysyms.Tab:value.codePointAt(0)<=255?value.codePointAt(0):0x1000000+value.codePointAt(0);
export async function openDesktop(options){
  if(process.env.WAYLAND_DISPLAY)return (await import('./remote-portal.mjs')).openDesktop(options);
  if(!process.env.DISPLAY)throw new Error('Ouvre une session graphique sur le poste Linux pour partager son bureau.');
  const {ffi,jpeg,signal,onClose}=options,stop=await linuxConsent(signal,onClose);
  const x=ffi.load('libX11.so.6'),xt=ffi.load('libXtst.so.6'),open=x.func('void * XOpenDisplay(const char *)'),display=open(null);
  if(!display){stop();throw new Error('Session X11 inaccessible.');}
  const screen=x.func('int XDefaultScreen(void *)')(display),root=x.func('unsigned long XRootWindow(void *,int)')(display,screen);
  const width=x.func('int XDisplayWidth(void *,int)')(display,screen),height=x.func('int XDisplayHeight(void *,int)')(display,screen);
  const get=x.func('void * XGetImage(void *,unsigned long,int,int,unsigned int,unsigned int,unsigned long,int)'),destroy=x.func('int XDestroyImage(void *)'),flush=x.func('int XFlush(void *)'),close=x.func('int XCloseDisplay(void *)');
  const move=xt.func('int XTestFakeMotionEvent(void *,int,int,int,unsigned long)'),button=xt.func('int XTestFakeButtonEvent(void *,unsigned int,int,unsigned long)'),key=xt.func('int XTestFakeKeyEvent(void *,unsigned int,int,unsigned long)');
  const code=x.func('unsigned char XKeysymToKeycode(void *,unsigned long)'),symbol=x.func('unsigned long XkbKeycodeToKeysym(void *,unsigned char,int,int)');
  const header=ffi.struct({width:'int',height:'int',xoffset:'int',format:'int',data:'void *',byte_order:'int',bitmap_unit:'int',bitmap_bit_order:'int',bitmap_pad:'int',depth:'int',bytes_per_line:'int',bits_per_pixel:'int',red_mask:'unsigned long',green_mask:'unsigned long',blue_mask:'unsigned long'});
  const held=new Set(),buttons=new Set();let closed=false;
  function releaseAll(){for(const value of held)key(display,value,0,0);for(const value of buttons)button(display,value,0,0);held.clear();buttons.clear();flush(display);}
  return {
    async capture(){signal?.throwIfAborted();if(closed||width*height>32000000)throw new Error('Bureau X11 indisponible.');const image=get(display,root,0,0,width,height,0xffffffff,2);if(!image)throw new Error('Capture X11 impossible.');try{const data=ffi.decode(image,header);if(![24,32].includes(data.bits_per_pixel)||data.bytes_per_line*height>128000000)throw new Error('Format du bureau X11 non pris en charge.');const raw=Buffer.from(ffi.view(data.data,data.bytes_per_line*height));if(Number(data.red_mask)!==0xff0000)throw new Error('Format des couleurs X11 non pris en charge.');return encodeDesktop(raw,width,height,jpeg,{stride:data.bytes_per_line,step:data.bits_per_pixel/8,bgr:data.byte_order===0});}finally{destroy(image);}},
    async input(event){if(closed)throw new Error('Session fermée.');if(event.type==='release'){releaseAll();return;}if(event.type==='key'){const value=code(display,keysym(event.key));if(!value)throw new Error('Touche absente de la disposition du clavier Linux.');key(display,value,event.down?1:0,0);event.down?held.add(value):held.delete(value);}else if(event.type==='text'){
      const values=[...event.text].map(characterSym).map(value=>({sym:value,code:code(display,value)}));if(values.some(value=>!value.code))throw new Error('Un caractère n’est pas disponible dans la disposition du clavier Linux.');
      const shift=code(display,keysyms.Shift);for(const value of values){const shifted=Number(symbol(display,value.code,0,0))!==value.sym&&Number(symbol(display,value.code,0,1))===value.sym,temporary=shifted&&!held.has(shift);if(temporary)key(display,shift,1,0);key(display,value.code,1,0);key(display,value.code,0,0);if(temporary)key(display,shift,0,0);}
    }else{move(display,screen,Math.round(event.x*(width-1)),Math.round(event.y*(height-1)),0);if(event.type==='button'){const value=[1,2,3][event.button];button(display,value,event.down?1:0,0);event.down?buttons.add(value):buttons.delete(value);}else if(event.type==='wheel')for(let index=0;index<Math.abs(event.delta);index++){button(display,event.delta<0?4:5,1,0);button(display,event.delta<0?4:5,0,0);}}flush(display);},
    async close(){if(closed)return;closed=true;try{releaseAll();close(display);}finally{stop();}}
  };
}
