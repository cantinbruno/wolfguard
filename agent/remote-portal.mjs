// Wayland uses the desktop's RemoteDesktop/ScreenCast portal, never an input device bypass.
import {spawn} from 'node:child_process';
import {closeSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {linuxConsent,keysym,characterSym} from './remote-linux.mjs';
import {executable,encodeDesktop} from './remote-native.mjs';
export async function openDesktop({ffi,jpeg,signal,onClose}){
  const gst=await executable('gst-launch-1.0');
  if(!gst)throw new Error('Sur le poste Linux, installe GStreamer (gstreamer1.0-tools, gstreamer1.0-pipewire et gstreamer1.0-plugins-good) et zenity ou kdialog, puis reconnecte la session.');
  const stopIndicator=await linuxConsent(signal,onClose);
  const gio=ffi.load('libgio-2.0.so.0'),glib=ffi.load('libglib-2.0.so.0'),gobject=ffi.load('libgobject-2.0.so.0');
  const errorType=ffi.struct({domain:'uint32_t',code:'int',message:'str'}),freeError=glib.func('void g_error_free(void *)');
  const nativeParse=glib.func('void * g_variant_parse(void *,const char *,void *,void *,_Out_ void **)'),sink=glib.func('void * g_variant_ref_sink(void *)'),parse=(...args)=>{const value=nativeParse(...args);return value?sink(value):value;},unref=glib.func('void g_variant_unref(void *)');
  function checked(callback){const error=[null],result=callback(error);if(error[0]){const detail=ffi.decode(error[0],errorType).message;freeError(error[0]);throw new Error('Portail de bureau : '+detail);}return result;}
  const connection=checked(error=>gio.func('void * g_bus_get_sync(int,void *,_Out_ void **)')(2,null,error));
  if(!connection){stopIndicator();throw new Error('Le portail du bureau Wayland est indisponible.');}
  const call=gio.func('void * g_dbus_connection_call_sync(void *,const char *,const char *,const char *,const char *,void *,void *,int,int,void *,_Out_ void **)');
  const dest='org.freedesktop.portal.Desktop',object='/org/freedesktop/portal/desktop',responses=new Map();
  const type=glib.func('str g_variant_get_type_string(void *)'),child=glib.func('void * g_variant_get_child_value(void *,size_t)'),children=glib.func('size_t g_variant_n_children(void *)');
  const string=glib.func('str g_variant_get_string(void *,void *)'),variant=glib.func('void * g_variant_get_variant(void *)');
  const numeric={u:glib.func('uint32_t g_variant_get_uint32(void *)'),i:glib.func('int32_t g_variant_get_int32(void *)'),h:glib.func('int32_t g_variant_get_handle(void *)'),t:glib.func('uint64_t g_variant_get_uint64(void *)'),d:glib.func('double g_variant_get_double(void *)'),b:glib.func('int g_variant_get_boolean(void *)')};
  function decode(value){const signature=type(value);if(['s','o','g'].includes(signature))return string(value,null);if(numeric[signature])return numeric[signature](value);if(signature==='v'){const inside=variant(value);try{return decode(inside);}finally{unref(inside);}}const values=[];for(let index=0;index<Number(children(value));index++){const inside=child(value,index);try{values.push(decode(inside));}finally{unref(inside);}}return signature.startsWith('a{')?Object.fromEntries(values):values;}
  const iterate=glib.func('int g_main_context_iteration(void *,int)');
  const prototype=ffi.proto('void (void *,const char *,const char *,const char *,const char *,void *,void *)');
  let releaseInputs=()=>{};let closed=false,session='',process=null,pipeFD=null,latest=null,streamError='',buffer=Buffer.alloc(0);
  const callback=ffi.register((_connection,_sender,path,_interface,name,parameters)=>{if(name==='Response'){if(responses.size<16)responses.set(path,decode(parameters));}else if(name==='Closed'&&path===session&&!closed)onClose();},ffi.pointer(prototype));
  const subscribe=gio.func('uint32_t g_dbus_connection_signal_subscribe(void *,const char *,const char *,const char *,const char *,const char *,int,void *,void *,void *)');
  const subscription=subscribe(connection,dest,null,null,null,null,0,callback,null,null),unsubscribe=gio.func('void g_dbus_connection_signal_unsubscribe(void *,uint32_t)');
  let pump=setInterval(()=>{if(!closed)for(let count=0;count<16&&iterate(null,0);count++){}},20);
  function invoke(iface,method,parameters,path=object){const argumentsValue=checked(error=>parse(null,parameters,null,null,error));try{const result=checked(error=>call(connection,dest,path,iface,method,argumentsValue,null,0,10000,null,error));if(!result)return null;try{return decode(result);}finally{unref(result);}}finally{unref(argumentsValue);}}
  async function request(iface,method,parameters){
    const [handle]=invoke(iface,method,parameters),until=Date.now()+65000;
    while(!responses.has(handle)){signal?.throwIfAborted();if(Date.now()>until)throw new Error('La demande de partage Wayland a expiré.');await delay(20,undefined,{signal});}
    const [code,result]=responses.get(handle);responses.delete(handle);
    if(code!==0){const error=new Error('Le partage a été refusé par le bureau Linux.');error.code='CONSENT_DENIED';throw error;}return result;
  }
  const token=()=>randomBytes(12).toString('hex'),options=extra=>"{'handle_token': <'wg"+token()+"'>"+(extra?', '+extra:'')+'}';
  const remote='org.freedesktop.portal.RemoteDesktop',cast='org.freedesktop.portal.ScreenCast';
  async function cleanup(){
    if(closed)return;try{releaseInputs();}catch{}closed=true;clearInterval(pump);process?.kill();stopIndicator();
    try{if(session)invoke('org.freedesktop.portal.Session','Close','()',session);}catch{}
    unsubscribe(connection,subscription);ffi.unregister(callback);gobject.func('void g_object_unref(void *)')(connection);
    if(pipeFD!==null){try{closeSync(pipeFD);}catch{}}
  }
  signal?.addEventListener('abort',()=>cleanup().catch(()=>{}),{once:true});
  try{
    const created=await request(remote,'CreateSession','('+options("'session_handle_token': <'wg"+token()+"'>")+',)');session=created.session_handle;
    if(typeof session!=='string'||!/^\/org\/freedesktop\/portal\/desktop\/session\/[a-zA-Z0-9_/]+$/.test(session))throw new Error('Session de partage Wayland invalide.');
    await request(remote,'SelectDevices',"(objectpath '"+session+"', "+options("'types': <uint32 3>")+')');
    await request(cast,'SelectSources',"(objectpath '"+session+"', "+options("'types': <uint32 1>, 'multiple': <false>, 'cursor_mode': <uint32 2>")+')');
    const started=await request(remote,'Start',"(objectpath '"+session+"', '', "+options('')+')');
    if((Number(started.devices)&3)!==3)throw new Error('Autorise le clavier et la souris dans la demande du bureau Linux.');
    const stream=started.streams?.[0],node=Number(stream?.[0]),size=stream?.[1]?.size;
    if(!Number.isSafeInteger(node)||node<1||!Array.isArray(size)||size.length!==2||size.some(value=>!Number.isFinite(Number(value))||Number(value)<1))throw new Error('Le bureau Linux n’a pas fourni un écran contrôlable.');
    const parameters=checked(error=>parse(null,"(objectpath '"+session+"', {})",null,null,error)),fdList=[null];
    const callFD=gio.func('void * g_dbus_connection_call_with_unix_fd_list_sync(void *,const char *,const char *,const char *,const char *,void *,void *,int,int,void *,_Out_ void **,void *,_Out_ void **)');
    const reply=checked(error=>callFD(connection,dest,object,cast,'OpenPipeWireRemote',parameters,null,0,10000,null,fdList,null,error));unref(parameters);
    let index;try{index=decode(reply)[0];}finally{unref(reply);}
    pipeFD=checked(error=>gio.func('int g_unix_fd_list_get(void *,int,_Out_ void **)')(fdList[0],index,error));gobject.func('void g_object_unref(void *)')(fdList[0]);
    process=spawn(gst,['-q','pipewiresrc','fd=3','path='+node,'!','videorate','!','video/x-raw,framerate=2/1','!','videoconvert','!','jpegenc','quality=45','!','fdsink','fd=1'],{stdio:['ignore','pipe','pipe',pipeFD]});
    process.once('error',()=>{streamError='GStreamer n’a pas pu démarrer le partage Wayland.';onClose();});
    process.once('exit',()=>{if(!closed){streamError='Le flux de partage Wayland a été fermé.';onClose();}});
    process.stderr.resume();
    process.stdout.on('data',chunk=>{
      buffer=Buffer.concat([buffer,chunk]);if(buffer.length>16*1024*1024){streamError='Flux de bureau trop volumineux.';onClose();process.kill();return;}
      for(;;){const start=buffer.indexOf(Buffer.from([0xff,0xd8])),end=start<0?-1:buffer.indexOf(Buffer.from([0xff,0xd9]),start+2);if(start<0||end<0)break;latest=buffer.subarray(start,end+2);buffer=buffer.subarray(end+2);}
    });
    const held=new Set(),buttons=new Set();
    const double=value=>Number.isInteger(value)?value+'.0':String(value);
    function notify(method,tail){invoke(remote,method,"(objectpath '"+session+"', {}, "+tail+')');}
    function key(value,down){notify('NotifyKeyboardKeysym','int32 '+value+', uint32 '+(down?1:0));down?held.add(value):held.delete(value);}
    function button(value,down){notify('NotifyPointerButton','int32 '+value+', uint32 '+(down?1:0));down?buttons.add(value):buttons.delete(value);}
    function releaseAll(){for(const value of [...held])key(value,false);for(const value of [...buttons])button(value,false);}
    releaseInputs=releaseAll;
    return {
      async capture(){const until=Date.now()+10000;while(!latest){signal?.throwIfAborted();if(streamError||Date.now()>until)throw new Error(streamError||'Aucune image reçue du bureau Wayland.');await delay(30,undefined,{signal});}const frame=latest;latest=null;const image=jpeg.decode(frame,{useTArray:true,maxResolutionInMP:32,maxMemoryUsageInMB:192});return encodeDesktop(image.data,image.width,image.height,jpeg);},
      async input(event){if(closed)throw new Error('Session fermée.');if(event.type==='release'){releaseAll();return;}if(event.type==='key'){key(keysym(event.key),event.down);return;}if(event.type==='text'){for(const character of event.text){key(characterSym(character),true);key(characterSym(character),false);}return;}notify('NotifyPointerMotionAbsolute','uint32 '+node+', double '+double(event.x*(Number(size[0])-1))+', double '+double(event.y*(Number(size[1])-1)));if(event.type==='button')button([272,274,273][event.button],event.down);else if(event.type==='wheel')notify('NotifyPointerAxis','double 0.0, double '+double(event.delta*30));},
      async close(){try{if(!closed)releaseAll();}finally{await cleanup();}}
    };
  }catch(error){await cleanup();throw error;}
}
