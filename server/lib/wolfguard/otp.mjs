import {seal,open} from './access.mjs';

const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function encodeSecret(bytes){let bits=0,value=0,out='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5;}}if(bits)out+=alphabet[(value<<(5-bits))&31];return out;}
function decodeSecret(secret){let bits=0,value=0,out=[];for(const char of secret){const n=alphabet.indexOf(char);if(n<0)throw new Error('Invalid OTP secret');value=(value<<5)|n;bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;}}return new Uint8Array(out);}
export async function otpAt(secret,step){
  const key=await crypto.subtle.importKey('raw',decodeSecret(secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);
  const counter=new Uint8Array(8);new DataView(counter.buffer).setBigUint64(0,BigInt(step));
  const hash=new Uint8Array(await crypto.subtle.sign('HMAC',key,counter)),offset=hash[hash.length-1]&15;
  return String((new DataView(hash.buffer).getUint32(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
export async function matchingStep(secret,code,now,last=-1){
  if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;
  const current=Math.floor(now/30000);
  for(const step of [current,current-1,current+1])if(step>last&&await otpAt(secret,step)===code)return step;
  return null;
}
const context=id=>'WolfGuard OTP v1:'+id;
const recoveryContext=id=>'WolfGuard OTP recovery v1:'+id;
const recoveryHash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
export async function consumeOTP(user,code,env,now){
  if(!user.otp_secret_cipher)return true;
  if(typeof code==='string'&&/^[a-f0-9]{16}$/.test(code)&&user.otp_recovery_cipher){
    const hashes=await open(user.otp_recovery_cipher,recoveryContext(user.id),env),hash=await recoveryHash(code);
    if(!hashes.includes(hash))return false;
    return !!await env.DB.prepare('UPDATE users SET otp_recovery_cipher=? WHERE id=? AND otp_recovery_cipher=? AND otp_secret_cipher=? AND code_version=? AND disabled_at IS NULL AND credential_pending=0 RETURNING id').bind(await seal(hashes.filter(value=>value!==hash),recoveryContext(user.id),env),user.id,user.otp_recovery_cipher,user.otp_secret_cipher,user.code_version).first();
  }
  const step=await matchingStep(await open(user.otp_secret_cipher,context(user.id),env),code,now,user.otp_last_step);
  if(step===null)return false;
  return !!await env.DB.prepare('UPDATE users SET otp_last_step=? WHERE id=? AND otp_secret_cipher=? AND otp_last_step<? AND code_version=? AND disabled_at IS NULL AND credential_pending=0 RETURNING id').bind(step,user.id,user.otp_secret_cipher,step,user.code_version).first();
}
export async function handleOTP(request,env,now,session,h){
  const {fail,json,body,verifyPIN}=h,path=new URL(request.url).pathname;
  const user=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(session.user.id).first();
  if(!user)fail(401,'Reconnecte-toi.');
  if(path==='/api/users/otp'&&request.method==='GET')return json({enabled:!!user.otp_secret_cipher});
  if(request.method!=='POST')fail(404,'Adresse inconnue.');
  const data=await body();
  if(path==='/api/users/otp/setup'){
    await verifyPIN(data.code,env,now,user);
    if(user.otp_secret_cipher)fail(409,'Authenticator est déjà activé.');
    const secret=encodeSecret(crypto.getRandomValues(new Uint8Array(20))),cipher=await seal(secret,context(user.id),env);
    const updated=await env.DB.prepare('UPDATE users SET otp_pending_cipher=?,otp_pending_until=? WHERE id=? AND code_version=? AND otp_secret_cipher IS NULL RETURNING id').bind(cipher,now+600000,user.id,user.code_version).first();
    if(!updated)fail(409,'Ce compte a changé. Recharge les paramètres.');
    return json({secret,uri:'otpauth://totp/'+encodeURIComponent('WolfGuard:'+session.user.username)+'?secret='+secret+'&issuer=WolfGuard&algorithm=SHA1&digits=6&period=30'});
  }
  if(path==='/api/users/otp/enable'){
    const recoveryCodes=Array.from({length:8},()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>n.toString(16).padStart(2,'0')).join(''));
    const recovery=await seal(await Promise.all(recoveryCodes.map(recoveryHash)),recoveryContext(user.id),env);
    const result=await verifyPIN(data.code,env,now,async()=>{
      if(!user.otp_pending_cipher||user.otp_pending_until<=now||user.otp_secret_cipher)return false;
      const step=await matchingStep(await open(user.otp_pending_cipher,context(user.id),env),data.otp,now);
      if(step===null)return false;
      return !!await env.DB.prepare('UPDATE users SET otp_secret_cipher=otp_pending_cipher,otp_pending_cipher=NULL,otp_pending_until=NULL,otp_last_step=?,otp_recovery_cipher=? WHERE id=? AND otp_pending_cipher=? AND otp_pending_until>? AND otp_secret_cipher IS NULL AND code_version=? RETURNING id').bind(step,recovery,user.id,user.otp_pending_cipher,now,user.code_version).first();
    },user);
    if(result)await h.revokeOthers(env,user.id,session.hash,now);
    return json({enabled:true,recoveryCodes});
  }
  if(path==='/api/users/otp/disable'){
    await verifyPIN(data.code,env,now,()=>consumeOTP(user,data.otp,env,now),user);
    const changed=await env.DB.prepare('UPDATE users SET otp_secret_cipher=NULL,otp_pending_cipher=NULL,otp_pending_until=NULL,otp_last_step=-1,otp_recovery_cipher=NULL WHERE id=? AND otp_secret_cipher=? AND code_version=? RETURNING id').bind(user.id,user.otp_secret_cipher,user.code_version).first();
    if(!changed)fail(409,'Ce compte a changé. Recharge les paramètres.');
    await h.revokeOthers(env,user.id,session.hash,now);
    return json({enabled:false});
  }
  fail(404,'Adresse inconnue.');
}
