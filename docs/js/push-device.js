'use strict';
// Shared by the phone page and its service worker. Only the device signing key
// is stored here, never a WolfGuard session, personal code or workspace key.
globalThis.WolfGuardPhone=(()=>{
  const API='https://wolfguard-web-cantin.cantin-bruno.chatgpt.site';
  let workerTask=null;
  const refreshKey='wolfguard-push-csp-refresh';
  const entryFragment=typeof window!=='undefined'?location.hash:'';
  async function refreshSecurityPolicy(error){
    if(typeof window==='undefined'||window.top!==window.self||!/^\?access=[a-f0-9]{64}$/.test(location.search)||location.pathname!=='/')return false;
    if(error.name!=='SecurityError'&&!/content.?security.?policy|\bcsp\b/i.test(error.message))return false;
    try{
      const previous=Number(sessionStorage.getItem(refreshKey));
      if(previous&&Date.now()-previous<120000)return false;
      sessionStorage.setItem(refreshKey,String(Date.now()));
      // The old gate's CSP survives document.write. Refresh the cached HTML,
      // then navigate: changing a meta tag cannot relax an inherited policy.
      const response=await fetch(location.pathname+location.search,{cache:'reload',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'});
      if(!response.ok||!/worker-src\s+'self'/.test(await response.text()))return false;
      if(/^#account=[a-f0-9]{64}$/.test(entryFragment))history.replaceState(null,'',location.pathname+location.search+entryFragment);
      location.reload();return true;
    }catch{return false;}
  }
  function notificationWorker(){
    if(workerTask)return workerTask;
    const task=(async()=>{
      const registration=await navigator.serviceWorker.register('/push-worker.js',{scope:'/',updateViaCache:'none'});
      const worker=registration.installing||registration.waiting||registration.active;
      if(!worker)throw new Error('Le service de notifications ne démarre pas. Recharge la page.');
      if(worker.state!=='activated')await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>{worker.removeEventListener('statechange',check);reject(new Error('Le service de notifications ne démarre pas. Recharge la page.'));},15000);
        function check(){if(worker.state==='activated'){clearTimeout(timeout);worker.removeEventListener('statechange',check);resolve();}else if(worker.state==='redundant'){clearTimeout(timeout);worker.removeEventListener('statechange',check);reject(new Error('La mise à jour des notifications a échoué. Recharge la page.'));}}
        worker.addEventListener('statechange',check);check();
      });
      try{sessionStorage.removeItem(refreshKey);}catch{}
      return registration;
    })();
    workerTask=task;task.catch(()=>{if(workerTask===task)workerTask=null;});return task;
  }
  // No notification permission, subscription or phone association is requested
  // here. Repair an obsolete private gate before the user enters MFA details.
  if(typeof window!=='undefined'&&'serviceWorker' in navigator&&/^\?access=[a-f0-9]{64}$/.test(location.search))notificationWorker().catch(refreshSecurityPolicy);
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
  async function register(publicKey,submit){
    if(!('Notification' in globalThis&&'serviceWorker' in navigator&&'PushManager' in globalThis))throw new Error('Ce navigateur ne propose pas le push. Sur iPhone, ajoute WolfGuard à l’écran d’accueil puis ouvre son icône. Tu peux continuer avec Authenticator.');
    // Keep this request inside the actual click gesture on iOS.
    const permission=Notification.requestPermission();
    if(await permission!=='granted')throw new Error('Notifications bloquées : autorise WolfGuard dans les réglages du navigateur, puis réessaie. Authenticator reste utilisable.');
    if(typeof publicKey!=='string'||!publicKey)throw new Error('Le service push est indisponible. Utilise Authenticator.');
    let registration;
    try{registration=await notificationWorker();}
    catch(error){
      if(await refreshSecurityPolicy(error))throw new Error('Mise à jour de la sécurité des notifications. La page va se recharger ; réessaie ensuite l’association.');
      if(error.name==='SecurityError'||/content.?security.?policy|\bcsp\b/i.test(error.message))throw new Error('Une ancienne règle de sécurité bloque les notifications. Ferme cette page, puis rouvre ton lien privé dans ton navigateur habituel. Tes données sont conservées.');
      throw error;
    }
    let subscription=await registration.pushManager.getSubscription();
    const applicationServerKey=bytes(publicKey),previousKey=subscription?.options?.applicationServerKey;
    if(subscription&&previousKey&&base64(previousKey)!==base64(applicationServerKey)){await subscription.unsubscribe();subscription=null;}
    if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey});
    const previous=await store('get'),keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
    const device={id:Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join(''),key:keys.privateKey};
    await store('put',device);
    try{return await submit({deviceId:device.id,subscription:subscription.toJSON(),publicKey:await crypto.subtle.exportKey('jwk',keys.publicKey)});}
    catch(error){if(previous)await store('put',previous).catch(()=>{});throw error;}
  }
  return Object.freeze({bytes,base64,read:id=>store('get',null,id||'current'),save:value=>store('put',value),forget:()=>store('delete'),inspect,decide,register});
})();
