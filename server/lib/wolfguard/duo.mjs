import {seal,open} from './access.mjs';
import {consumeOTP} from './otp.mjs';

const encoder=new TextEncoder(),b64=value=>btoa(String.fromCharCode(...new Uint8Array(value))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const unb64=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const digest=async value=>b64(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const key=secret=>crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-512'},false,['sign','verify']);
const configContext='WolfGuard Duo configuration v1';
export const duoEnabled=async env=>!!(await env.DB.prepare('SELECT enabled FROM duo_config WHERE id=1').first())?.enabled;
async function configuration(env){const row=await env.DB.prepare('SELECT * FROM duo_config WHERE id=1').first();return row?.config_cipher?{...await open(row.config_cipher,configContext,env),enabled:!!row.enabled,revision:row.revision}:null;}
export async function signDuoJWT(payload,secret){const data=b64(encoder.encode(JSON.stringify({alg:'HS512',typ:'JWT'})))+'.'+b64(encoder.encode(JSON.stringify(payload)));return data+'.'+b64(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(data)));}
export async function verifyDuoJWT(token,config,expected,now){
  if(typeof token!=='string'||token.length>48000||!/^[-\w]+\.[-\w]+\.[-\w]+$/.test(token))throw new Error('Invalid token');
  const [header,payload,signature]=token.split('.'),decode=value=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(unb64(value)));
  const info=decode(header);if(info.alg!=='HS512'||info.crit)throw new Error('Invalid algorithm');
  if(!await crypto.subtle.verify('HMAC',await key(config.clientSecret),unb64(signature),encoder.encode(header+'.'+payload)))throw new Error('Invalid signature');
  const data=decode(payload),seconds=Math.floor(now/1000);
  if(data.iss!=='https://'+config.apiHost+'/oauth/v1/token'||data.aud!==config.clientId||data.preferred_username!==expected.username||data.sub!==expected.username||data.nonce!==expected.nonce||!Number.isSafeInteger(data.exp)||data.exp<=seconds||data.exp<=data.iat||(data.nbf!==undefined&&(!Number.isSafeInteger(data.nbf)||data.nbf>seconds+30))||!Number.isSafeInteger(data.iat)||data.iat>seconds+30||data.iat<Math.floor(expected.createdAt/1000)-30||data.exp-data.iat>3900||!Number.isSafeInteger(data.auth_time)||data.auth_time<Math.floor(expected.createdAt/1000)-30||data.auth_time>seconds+30||data.auth_result?.result!=='allow'||data.auth_result?.status!=='allow'||!Array.isArray(data.amr)||!data.amr.includes('mfa'))throw new Error('Invalid authentication');
  // A Duo bypass or remembered session must never count as approval here.
  return data;
}
async function duoPost(env,config,path,values,now){
  const url='https://'+config.apiHost+'/oauth/v1/'+path,seconds=Math.floor(now/1000);
  const assertion=await signDuoJWT({iss:config.clientId,sub:config.clientId,aud:url,iat:seconds,exp:seconds+300,jti:random()},config.clientSecret);
  const body=new URLSearchParams({client_id:config.clientId,client_assertion:assertion,...values});
  const transport=env.LOCAL_TEST_ORIGIN&&env.DUO_TEST_FETCH?env.DUO_TEST_FETCH:fetch;
  const response=await transport(url,{method:'POST',body,headers:{'Content-Type':'application/x-www-form-urlencoded'},redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Duo unavailable');
  const text=await response.text();if(text.length>120000)throw new Error('Invalid response');return JSON.parse(text);
}
async function health(env,config,now){if((await duoPost(env,config,'health_check',{},now)).stat!=='OK')throw new Error('Duo unavailable');}
function callbackURL(env,request){return (env.LOCAL_TEST_ORIGIN||new URL(request.url).origin)+'/api/duo/callback';}

export async function handleDuoSettings(request,env,now,session,h){
  const {fail,json,body,verifyPIN}=h,current=await configuration(env),admin=session.user.role==='admin';
  if(request.method==='GET')return json({enabled:!!current?.enabled,configured:!!current,canConfigure:admin,callbackUrl:callbackURL(env,request),...(admin?{apiHost:current?.apiHost||'',clientId:current?.clientId||''}:{})});
  if(request.method!=='POST'||!admin)fail(403,'Seul l’administrateur peut configurer Duo Mobile.');
  const data=await body();
  if(typeof data.enabled!=='boolean')fail(400,'Choisis si Duo est activé.');
  const user=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(session.user.id).first();
  await verifyPIN(data.code,env,now,()=>consumeOTP(user,data.otp,env,now),user);
  const apiHost=typeof data.apiHost==='string'?data.apiHost.trim().toLowerCase():'',clientId=typeof data.clientId==='string'?data.clientId.trim():'';
  const clientSecret=data.clientSecret||((current?.apiHost===apiHost&&current?.clientId===clientId)?current.clientSecret:'');
  if(!/^api-[a-z0-9]{8,32}\.duosecurity\.com$/.test(apiHost)||!/^[A-Za-z0-9]{20}$/.test(clientId)||typeof clientSecret!=='string'||!/^[A-Za-z0-9]{40}$/.test(clientSecret))fail(400,'Vérifie les trois identifiants de ton application Duo Web SDK.');
  const config={apiHost,clientId,clientSecret};
  if(data.enabled){try{await health(env,config,now);}catch{fail(503,'Duo ne valide pas ces identifiants. La configuration précédente est conservée.');}}
  const cipher=await seal(config,configContext,env);
  const result=await env.DB.batch([
    env.DB.prepare('UPDATE duo_config SET enabled=?,config_cipher=?,revision=revision+1 WHERE id=1 AND revision=? AND EXISTS(SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND u.id=? AND u.role=\'admin\' AND u.disabled_at IS NULL AND u.code_version=s.user_version AND u.otp_secret_cipher=?)').bind(data.enabled?1:0,cipher,current?.revision||0,session.hash,user.id,user.otp_secret_cipher),
    env.DB.prepare("UPDATE duo_requests SET status='cancelled' WHERE config_revision<>(SELECT revision FROM duo_config WHERE id=1) AND status IN ('pending','verifying','approved')")
  ]);
  if(!result[0].meta.changes)fail(409,'La configuration ou ton compte a changé. Recharge les paramètres.');
  return json({ok:true,enabled:data.enabled});
}

export async function startDuo(request,env,now,row,user,h){
  const config=await configuration(env);if(!config?.enabled)h.fail(409,'Duo Mobile n’est pas activé. Recommence la connexion.');
  try{await health(env,config,now);}catch{return h.json({duoRequired:true,unavailable:true,expiresAt:now+300000});}
  const state=random(),ticket=random(),nonce=random(),id=random(),expiresAt=now+300000;
  const username=await open(user.name_cipher,'WolfGuard users v1:name:'+user.id,env),redirect=callbackURL(env,request);
  await env.DB.prepare("UPDATE duo_requests SET status='expired' WHERE expires_at<=? AND status IN ('pending','verifying','approved')").bind(now).run();
  await env.DB.prepare('DELETE FROM duo_requests WHERE expires_at<?').bind(now-86400000).run();
  const created=await env.DB.prepare(`INSERT INTO duo_requests(id,state_hash,ticket_hash,user_id,user_version,generation,config_revision,otp_binding,nonce,status,created_at,expires_at)
    SELECT ?,?,?,?,?,?,?,?,?,'pending',?,? WHERE (SELECT revision FROM duo_config WHERE id=1 AND enabled=1)=?
    AND NOT EXISTS(SELECT 1 FROM duo_requests WHERE user_id=? AND status IN ('pending','verifying','approved'))
    AND (SELECT COUNT(*) FROM duo_requests WHERE user_id=? AND created_at>?)<5`).bind(id,await digest(state),await digest(ticket),user.id,user.code_version,row.generation,config.revision,await digest(user.otp_secret_cipher),nonce,now,expiresAt,config.revision,user.id,user.id,now-300000).run();
  if(!created.meta.changes)h.fail(429,'Une validation Duo est déjà en cours ou trop de demandes ont été faites. Attends quelques instants.');
  const jwt=await signDuoJWT({iss:config.clientId,client_id:config.clientId,aud:'https://'+config.apiHost,response_type:'code',scope:'openid',redirect_uri:redirect,state,nonce,duo_uname:username,iat:Math.floor(now/1000),exp:Math.floor(expiresAt/1000),prompt:'login',max_age:0,dest_app_name:'WolfGuard'},config.clientSecret);
  const url=new URL('https://'+config.apiHost+'/oauth/v1/authorize');url.search=new URLSearchParams({response_type:'code',client_id:config.clientId,request:jwt}).toString();
  return h.json({duoRequired:true,ticket,authorizationURL:url.href,expiresAt});
}

async function validUser(env,row,now){
  if(!row||row.expires_at<=now)return null;
  const user=await env.DB.prepare('SELECT * FROM users WHERE id=? AND code_version=? AND disabled_at IS NULL AND credential_pending=0 AND otp_secret_cipher IS NOT NULL AND (SELECT generation FROM vault WHERE id=1)=? AND (SELECT revision FROM duo_config WHERE id=1 AND enabled=1)=?').bind(row.user_id,row.user_version,row.generation,row.config_revision).first();
  return user&&await digest(user.otp_secret_cipher)===row.otp_binding?user:null;
}
export async function handleDuoLogin(request,env,now,h){
  const url=new URL(request.url),{fail,json,body}=h;
  if(url.pathname==='/api/duo/callback'&&request.method==='GET'){
    const state=url.searchParams.get('state'),code=url.searchParams.get('code');
    if(!/^[-\w]{43}$/.test(state||'')||typeof code!=='string'||code.length<1||code.length>2048)fail(400,'Retour Duo invalide.');
    const row=await env.DB.prepare("UPDATE duo_requests SET status='verifying' WHERE state_hash=? AND status='pending' AND expires_at>? RETURNING *").bind(await digest(state),now).first(),user=await validUser(env,row,now);
    if(!user)fail(410,'Cette validation Duo a expiré ou a déjà été utilisée.');
    try{
      const config=await configuration(env),username=await open(user.name_cipher,'WolfGuard users v1:name:'+user.id,env);
      const token=await duoPost(env,config,'token',{grant_type:'authorization_code',code,redirect_uri:callbackURL(env,request),client_assertion_type:'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'},now);
      await verifyDuoJWT(token.id_token,config,{username,nonce:row.nonce,createdAt:row.created_at},now);
      if(!await validUser(env,row,now))throw new Error('Changed account');
      const changed=await env.DB.prepare("UPDATE duo_requests SET status='approved' WHERE id=? AND status='verifying' AND expires_at>? AND config_revision=(SELECT revision FROM duo_config WHERE id=1 AND enabled=1)").bind(row.id,now).run();
      if(!changed.meta.changes)throw new Error('Cancelled request');
    }catch{await env.DB.prepare("UPDATE duo_requests SET status='failed' WHERE id=? AND status='verifying'").bind(row.id).run();fail(403,'Duo n’a pas confirmé une authentification MFA valide. Recommence ou utilise ton code de secours.');}
    return new Response('<!doctype html><meta charset="utf-8"><title>WolfGuard · Duo Mobile</title><h1>Validation reçue</h1><p>Tu peux fermer cette fenêtre et revenir à WolfGuard.</p>',{headers:{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}});
  }
  if(request.method!=='POST'||!['/api/duo/poll','/api/duo/cancel'].includes(url.pathname))fail(404,'Adresse inconnue.');
  const data=await body();if(!/^[-\w]{43}$/.test(data.ticket||''))fail(410,'Validation Duo expirée.');
  const row=await env.DB.prepare('SELECT * FROM duo_requests WHERE ticket_hash=?').bind(await digest(data.ticket)).first(),user=await validUser(env,row,now);
  if(!user)fail(410,'Cette validation Duo a expiré ou le compte a changé.');
  if(url.pathname.endsWith('/cancel')){await env.DB.prepare("UPDATE duo_requests SET status='cancelled' WHERE id=? AND status IN ('pending','verifying','approved')").bind(row.id).run();return json({ok:true});}
  if(['pending','verifying'].includes(row.status))return json({pending:true});
  if(row.status!=='approved')fail(410,'La validation Duo n’est plus utilisable.');
  const changed=await env.DB.prepare("UPDATE duo_requests SET status='consumed' WHERE id=? AND status='approved' AND expires_at>? AND config_revision=(SELECT revision FROM duo_config WHERE id=1 AND enabled=1) RETURNING id").bind(row.id,now).first();
  if(!changed)fail(410,'La validation Duo a déjà été utilisée.');
  return h.finish(user,row.generation);
}
