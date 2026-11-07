import {seal,open} from './access.mjs';
import {consumeOTP} from './otp.mjs';
import {buildPushPayload} from '../../vendor/webpush.mjs';

const encoder=new TextEncoder(),hex=value=>Array.from(new Uint8Array(value),n=>n.toString(16).padStart(2,'0')).join('');
const random=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
const decode=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const hash=async value=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const context=id=>'WolfGuard push subscription v1:'+id;
const detailsContext=id=>'WolfGuard push request v1:'+id;
export const pushDevice=(env,userId)=>env.DB.prepare('SELECT * FROM push_devices WHERE user_id=?').bind(userId).first();
export const requiresPhone=env=>env.MFA_PUSH_PRIMARY==='1';
async function enrollmentKey(env){return crypto.subtle.importKey('raw',Uint8Array.from(env.AUTH_PEPPER.match(/../g),value=>parseInt(value,16)),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function phoneEnrollment(env,user,generation,now){
  const payload=btoa(JSON.stringify({purpose:'push-enrollment',userId:user.id,version:user.code_version,generation,expiresAt:now+600000,binding:await hash(user.otp_secret_cipher)})).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const signature=hex(await crypto.subtle.sign('HMAC',await enrollmentKey(env),encoder.encode(payload)));
  return {phoneSetupRequired:true,enrollmentTicket:payload+'.'+signature,expiresAt:now+600000,publicKey:env.PUSH_VAPID_PUBLIC_KEY||null,configured:!!(env.PUSH_VAPID_PUBLIC_KEY&&env.PUSH_VAPID_PRIVATE_KEY)||!!(env.LOCAL_TEST_ORIGIN&&env.PUSH_TEST_SEND),username:await open(user.name_cipher,'WolfGuard users v1:name:'+user.id,env)};
}
async function enrollmentUser(env,ticket,now,fail){
  try{
    if(typeof ticket!=='string'||!/^[-\w]{1,1200}\.[a-f0-9]{64}$/.test(ticket))throw new Error();
    const [payload,signature]=ticket.split('.');
    if(!await crypto.subtle.verify('HMAC',await enrollmentKey(env),Uint8Array.from(signature.match(/../g),value=>parseInt(value,16)),encoder.encode(payload)))throw new Error();
    const data=JSON.parse(new TextDecoder().decode(decode(payload)));
    if(data.purpose!=='push-enrollment'||!Number.isSafeInteger(data.expiresAt)||data.expiresAt<=now)throw new Error();
    const user=await env.DB.prepare('SELECT * FROM users WHERE id=? AND code_version=? AND disabled_at IS NULL AND credential_pending=0 AND otp_secret_cipher IS NOT NULL AND (SELECT generation FROM vault WHERE id=1)=?').bind(data.userId,data.version,data.generation).first();
    if(!user||data.binding!==await hash(user.otp_secret_cipher))throw new Error();return user;
  }catch{fail(410,'La configuration a expiré ou le compte a changé. Recommence la connexion.');}
}
export async function handlePhoneEnrollment(request,env,now,h){
  const {fail,json,body}=h,path=new URL(request.url).pathname;
  if(request.method!=='POST'||path!=='/api/mfa/phone/register')fail(404,'Adresse inconnue.');
  const data=await body(),user=await enrollmentUser(env,data.enrollmentTicket,now,fail);
  if(await pushDevice(env,user.id))fail(409,'Un téléphone est déjà associé. Recommence la connexion pour recevoir la notification.');
  const result=await enrollDevice(env,user,data,now,fail,{});
  return json({device:result,registered:true});
}
export const decisionMessage=(row,decision)=>'WolfGuard push v1:'+row.id+':'+row.nonce+':'+decision;
export const inspectMessage=id=>'WolfGuard push inspect v1:'+id;
export function validSubscription(value){
  try{
    const url=new URL(value.endpoint),host=url.hostname;
    if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||value.endpoint.length>2048)return false;
    if(!['fcm.googleapis.com','web.push.apple.com','updates.push.services.mozilla.com'].includes(host)&&!host.endsWith('.push.services.mozilla.com')&&!host.endsWith('.notify.windows.com'))return false;
    return /^[A-Za-z0-9_-]{87}$/.test(value.keys.p256dh)&&decode(value.keys.p256dh).length===65&&/^[A-Za-z0-9_-]{22}$/.test(value.keys.auth)&&decode(value.keys.auth).length===16;
  }catch{return false;}
}
async function verifySignature(device,message,signature){
  try{if(typeof signature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(signature))return false;const key=await crypto.subtle.importKey('jwk',JSON.parse(device.public_key),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,decode(signature),encoder.encode(message));}catch{return false;}
}
export async function sendNotification(env,device,message){
  const subscription=await open(device.subscription_cipher,context(device.id),env);
  if(!validSubscription(subscription))throw new Error('Invalid push subscription');
  // Only the disposable local fixture can inject delivery; production uses HTTPS.
  if(env.LOCAL_TEST_ORIGIN&&typeof env.PUSH_TEST_SEND==='function')return env.PUSH_TEST_SEND(message,subscription);
  const payload=await buildPushPayload({data:message,options:{ttl:120,urgency:'high'}},subscription,{subject:'mailto:cantin.bruno@gmx.fr',publicKey:env.PUSH_VAPID_PUBLIC_KEY,privateKey:env.PUSH_VAPID_PRIVATE_KEY});
  const response=await fetch(subscription.endpoint,{...payload,redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Push delivery failed');
}
export async function startPush(request,env,now,row,user,device,h){
  const {fail,json}=h,id=random(16),ticket=random(32),nonce=random(32),expiresAt=now+120000;
  const displayCode=String(crypto.getRandomValues(new Uint32Array(1))[0]%10000).padStart(4,'0');
  const details={browser:(request.headers.get('User-Agent')||'Navigateur').slice(0,180),createdAt:now};
  await env.DB.prepare("UPDATE push_requests SET state='expired' WHERE expires_at<=? AND state IN ('pending','approved')").bind(now).run();
  await env.DB.prepare('DELETE FROM push_requests WHERE created_at<?').bind(now-86400000).run();
  const inserted=await env.DB.prepare("INSERT INTO push_requests(id,ticket_hash,user_id,user_version,device_id,generation,nonce,state,display_code,details_cipher,created_at,expires_at) SELECT ?,?,?,?,?,?,?,'pending',?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM push_requests WHERE user_id=? AND (state='pending' OR created_at>?)) AND (SELECT COUNT(*) FROM push_requests WHERE user_id=? AND created_at>?)<5 AND EXISTS(SELECT 1 FROM users WHERE id=? AND code_version=? AND disabled_at IS NULL AND credential_pending=0) AND EXISTS(SELECT 1 FROM push_devices WHERE id=? AND user_id=?) ON CONFLICT DO NOTHING RETURNING id")
    .bind(id,await hash(ticket),user.id,user.code_version,device.id,row.generation,nonce,displayCode,await seal(details,detailsContext(id),env),now,expiresAt,user.id,now-30000,user.id,now-300000,user.id,user.code_version,device.id,user.id).first();
  if(!inserted)return json({pushRequired:true,deliveryFailed:true,expiresAt,displayCode:'—',message:'Une demande est déjà en cours. Attends son approbation ou utilise un code de secours.'});
  try{await sendNotification(env,device,{type:'login',id,nonce,deviceId:device.id,displayCode,expiresAt});}
  catch{await env.DB.prepare("UPDATE push_requests SET state='failed' WHERE id=? AND state='pending'").bind(id).run();return json({pushRequired:true,ticket,displayCode,expiresAt,deliveryFailed:true});}
  return json({pushRequired:true,ticket,displayCode,expiresAt});
}
export async function handlePushLogin(request,env,now,h){
  const {fail,json,body}=h,path=new URL(request.url).pathname,data=await body();
  if(request.method!=='POST')fail(404,'Adresse inconnue.');
  if(path==='/api/push/poll'||path==='/api/push/cancel'){
    if(typeof data.ticket!=='string'||!/^[a-f0-9]{64}$/.test(data.ticket))fail(410,'Cette demande a expiré. Recommence la connexion.');
    const ticketHash=await hash(data.ticket);
    const row=await env.DB.prepare('SELECT p.* FROM push_requests p JOIN users u ON u.id=p.user_id JOIN push_devices d ON d.id=p.device_id AND d.user_id=u.id WHERE p.ticket_hash=? AND p.expires_at>? AND u.code_version=p.user_version AND u.disabled_at IS NULL AND u.credential_pending=0 AND p.generation=(SELECT generation FROM vault WHERE id=1)').bind(ticketHash,now).first();
    if(!row)fail(410,'Cette demande a expiré. Recommence la connexion.');
    if(path.endsWith('/cancel')){await env.DB.prepare("UPDATE push_requests SET state='cancelled' WHERE id=? AND state IN ('pending','approved')").bind(row.id).run();return json({ok:true});}
    if(row.state==='denied')fail(403,'La connexion a été refusée sur le téléphone.');
    if(row.state==='pending')return json({pending:true,expiresAt:row.expires_at});
    if(row.state!=='approved')fail(410,'Cette demande n’est plus utilisable.');
    const consumed=await env.DB.prepare("UPDATE push_requests SET state='consumed' WHERE id=? AND state='approved' AND expires_at>? AND EXISTS(SELECT 1 FROM users WHERE id=push_requests.user_id AND code_version=push_requests.user_version AND disabled_at IS NULL AND credential_pending=0) AND EXISTS(SELECT 1 FROM push_devices WHERE id=push_requests.device_id AND user_id=push_requests.user_id) RETURNING id").bind(row.id,now).first();
    if(!consumed)fail(410,'Cette demande n’est plus utilisable.');
    const user=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(row.user_id).first();
    if(!user||user.code_version!==row.user_version)fail(410,'Ce compte a changé. Recommence la connexion.');
    const response=await h.finish(user,row.device_id,row.generation);
    await env.DB.prepare('UPDATE vault SET failures=0,blocked_until=0 WHERE id=1 AND lease IS NULL').run();
    return response;
  }
  if(!['/api/push/inspect','/api/push/decision'].includes(path))fail(404,'Adresse inconnue.');
  if(typeof data.id!=='string'||!/^[a-f0-9]{32}$/.test(data.id)||typeof data.deviceId!=='string'||!/^[a-f0-9]{32}$/.test(data.deviceId))fail(410,'Demande indisponible.');
  const row=await env.DB.prepare("SELECT p.* FROM push_requests p JOIN users u ON u.id=p.user_id JOIN push_devices d ON d.id=p.device_id AND d.user_id=u.id WHERE p.id=? AND p.device_id=? AND p.state='pending' AND p.expires_at>? AND u.code_version=p.user_version AND u.disabled_at IS NULL AND u.credential_pending=0 AND p.generation=(SELECT generation FROM vault WHERE id=1)").bind(data.id,data.deviceId,now).first();
  if(!row)fail(410,'Cette demande a expiré ou a déjà été traitée.');
  const device=await pushDevice(env,row.user_id),inspection=path.endsWith('/inspect');
  if(!inspection&&!['approve','deny'].includes(data.decision))fail(400,'Décision invalide.');
  const message=inspection?inspectMessage(row.id):decisionMessage(row,data.decision);
  if(!device||device.id!==data.deviceId||!await verifySignature(device,message,data.signature))fail(403,'Ce téléphone n’est pas autorisé.');
  if(inspection)return json({id:row.id,nonce:row.nonce,displayCode:row.display_code,expiresAt:row.expires_at,...await open(row.details_cipher,detailsContext(row.id),env)});
  const changed=await env.DB.prepare("UPDATE push_requests SET state=? WHERE id=? AND state='pending' AND expires_at>? AND EXISTS(SELECT 1 FROM push_devices WHERE id=push_requests.device_id) AND EXISTS(SELECT 1 FROM users WHERE id=push_requests.user_id AND code_version=push_requests.user_version AND disabled_at IS NULL AND credential_pending=0) RETURNING id").bind(data.decision==='approve'?'approved':'denied',row.id,now).first();
  if(!changed)fail(410,'Cette demande a déjà été traitée.');
  return json({ok:true,approved:data.decision==='approve'});
}
export async function handlePushSettings(request,env,now,session,h){
  const {fail,json,body,verifyPIN}=h,path=new URL(request.url).pathname,user=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(session.user.id).first();
  const device=await pushDevice(env,user.id),configured=!!(env.PUSH_VAPID_PUBLIC_KEY&&env.PUSH_VAPID_PRIVATE_KEY)||!!(env.LOCAL_TEST_ORIGIN&&env.PUSH_TEST_SEND);
  if(path==='/api/users/push'&&request.method==='GET')return json({configured,device:device?{id:device.id,createdAt:device.created_at}:null,publicKey:env.PUSH_VAPID_PUBLIC_KEY||null,otpEnabled:!!user.otp_secret_cipher});
  if(request.method!=='POST')fail(404,'Adresse inconnue.');
  const data=await body();
  if(!user.otp_secret_cipher)fail(409,'Configure d’abord le code Authenticator de secours.');
  if(!['/api/users/push/register','/api/users/push/remove'].includes(path))fail(404,'Adresse inconnue.');
  await verifyPIN(data.code,env,now,()=>consumeOTP(user,data.otp,env,now),user);
  if(path.endsWith('/remove')){
    await env.DB.batch([env.DB.prepare('DELETE FROM push_requests WHERE user_id=?').bind(user.id),env.DB.prepare('DELETE FROM push_devices WHERE user_id=?').bind(user.id)]);
    await h.revokeOthers(env,user.id,session.hash,now);return json({ok:true});
  }
  const result=await enrollDevice(env,user,data,now,fail,{replace:true,sessionHash:session.hash});
  await h.revokeOthers(env,user.id,session.hash,now);
  return json({device:result});
}
async function enrollDevice(env,user,data,now,fail,{replace=false,sessionHash=null}){
  const configured=!!(env.PUSH_VAPID_PUBLIC_KEY&&env.PUSH_VAPID_PRIVATE_KEY)||!!(env.LOCAL_TEST_ORIGIN&&env.PUSH_TEST_SEND);
  if(!configured)fail(503,'Les notifications ne sont pas encore configurées sur le serveur.');
  if(!validSubscription(data.subscription))fail(400,'Abonnement aux notifications invalide.');
  const jwk=data.publicKey;
  if(!jwk||jwk.kty!=='EC'||jwk.crv!=='P-256'||typeof jwk.x!=='string'||typeof jwk.y!=='string'||jwk.d!==undefined)fail(400,'Clé du téléphone invalide.');
  const publicKey={kty:'EC',crv:'P-256',x:jwk.x,y:jwk.y,ext:true};
  try{await crypto.subtle.importKey('jwk',publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);}catch{fail(400,'Clé du téléphone invalide.');}
  if(typeof data.deviceId!=='string'||!/^[a-f0-9]{32}$/.test(data.deviceId))fail(400,'Identifiant du téléphone invalide.');
  const id=data.deviceId,newDevice={id,subscription_cipher:await seal(data.subscription,context(id),env),public_key:JSON.stringify(publicKey)};
  try{await sendNotification(env,newDevice,{type:'associated',deviceId:id});}catch{fail(503,'Le téléphone n’a pas pu être joint. Son association n’a pas été modifiée.');}
  // Recheck the exact authenticated account version at the enrollment commit.
  const updated=await env.DB.batch([
    env.DB.prepare('INSERT INTO push_devices(id,user_id,subscription_cipher,public_key,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND code_version=? AND disabled_at IS NULL AND credential_pending=0 AND otp_secret_cipher=?) AND (? IS NULL OR EXISTS(SELECT 1 FROM sessions WHERE token_hash=?)) AND (?=1 OR NOT EXISTS(SELECT 1 FROM push_devices WHERE user_id=?)) ON CONFLICT(user_id) DO UPDATE SET id=excluded.id,subscription_cipher=excluded.subscription_cipher,public_key=excluded.public_key,created_at=excluded.created_at WHERE ?=1').bind(id,user.id,newDevice.subscription_cipher,newDevice.public_key,now,user.id,user.code_version,user.otp_secret_cipher,sessionHash,sessionHash,replace?1:0,user.id,replace?1:0),
    env.DB.prepare('DELETE FROM push_requests WHERE user_id=? AND EXISTS(SELECT 1 FROM push_devices WHERE id=?)').bind(user.id,id)
  ]);
  if(Number(updated[0]?.meta?.changes)!==1)fail(409,'Le compte a changé. Reconnecte-toi.');
  return {id,createdAt:now};
}
