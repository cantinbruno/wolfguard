'use strict';
// Shared by the phone page and its service worker. Only the device signing key
// is stored here, never a WolfGuard session, personal code or workspace key.
globalThis.WolfGuardPhone=(()=>{
  const API='https://wolfguard-web-cantin.cantin-bruno.chatgpt.site';
  const bytes=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  const base64=value=>btoa(String.fromCharCode(...new Uint8Array(value))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  async function store(action,value,id='current'){
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('wolfguard-phone-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('device');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('Le stockage du téléphone est indisponible.'));});
    try{return await new Promise((resolve,reject)=>{const tx=db.transaction('device',action==='get'?'readonly':'readwrite'),s=tx.objectStore('device'),r=action==='get'?s.get(id):action==='put'?s.put(value,'current'):s.delete('current');if(action==='put')s.put(value,value.id);tx.oncomplete=()=>resolve(r.result||null);tx.onerror=tx.onabort=()=>reject(new Error('L’association du téléphone ne peut pas être conservée.'));});}finally{db.close();}
  }
  async function sign(device,message){return base64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},device.key,new TextEncoder().encode(message)));}
  async function post(path,value){
    const r=await fetch(API+'/api/push/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
    const data=await r.json();if(!r.ok)throw new Error(data.error||'La demande ne peut pas être traitée.');return data;
  }
  async function inspect(id,deviceId){
    const device=await store('get',null,deviceId||'current');if(!device)throw new Error('Ce téléphone n’est pas associé. Ouvre ton lien privé WolfGuard, puis Paramètres → Sécurité.');
    return post('inspect',{id,deviceId:device.id,signature:await sign(device,'WolfGuard push inspect v1:'+id)});
  }
  async function decide(request,decision){
    const device=await store('get',null,request.deviceId||'current');if(!device||request.deviceId&&device.id!==request.deviceId)throw new Error('Ce téléphone n’est plus associé à ce compte.');
    return post('decision',{id:request.id,deviceId:device.id,decision,signature:await sign(device,'WolfGuard push v1:'+request.id+':'+request.nonce+':'+decision)});
  }
  return Object.freeze({bytes,base64,read:id=>store('get',null,id||'current'),save:value=>store('put',value),forget:()=>store('delete'),inspect,decide});
})();
