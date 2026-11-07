'use strict';
// Retire registrations from older versions; authentication now uses TOTP only.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  try{await (await self.registration.pushManager.getSubscription())?.unsubscribe();}catch{}
  try{for(const notification of await self.registration.getNotifications())notification.close();}catch{}
  await self.registration.unregister();
})()));
self.addEventListener('notificationclick',event=>event.notification.close());
