'use strict';
importScripts('js/push-device.js');
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// There is deliberately no fetch handler or application cache.
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let data;try{data=event.data.json();}catch{return;}
    if(['associated','test'].includes(data.type)){await self.registration.showNotification(data.type==='test'?'WolfGuard · test de notification':'WolfGuard · téléphone associé',{body:data.type==='test'?'Les notifications fonctionnent sur cet appareil.':'Les prochaines connexions demanderont ton approbation.',icon:'images/logo-loup.svg',tag:'wolfguard-associated'});return;}
    if(data.type!=='login'||!/^[a-f0-9]{32}$/.test(data.id)||!/^[a-f0-9]{64}$/.test(data.nonce)||data.expiresAt<=Date.now())return;
    await self.registration.showNotification('WolfGuard · demande '+data.displayCode,{body:'Une connexion attend ta validation. Vérifie le même numéro sur ton ordinateur.',icon:'images/logo-loup.svg',tag:'wolfguard-login',data,requireInteraction:true,actions:[{action:'approve',title:'Approuver'},{action:'deny',title:'Refuser'}]});
  })());
});
self.addEventListener('notificationclick',event=>{
  const request=event.notification.data;event.notification.close();
  if(!request?.id)return;
  event.waitUntil((async()=>{
    if(['approve','deny'].includes(event.action)){
      try{await WolfGuardPhone.decide(request,event.action);await self.registration.showNotification('WolfGuard',{body:event.action==='approve'?'Connexion approuvée.':'Connexion refusée.',tag:'wolfguard-result'});return;}catch{}
    }
    await self.clients.openWindow(new URL('approve.html#request='+request.id+'&device='+request.deviceId,self.location.href).href);
  })());
});
