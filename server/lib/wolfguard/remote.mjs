import {REMOTE_LIVE,desktopInput,desktopFrame} from './remote-spec.mjs';
import {terminalView,handleTerminalAPI} from './terminal.mjs';
import {userPolicy} from './permission-store.mjs';
const liveSQL="('requested','preparing','active')";
const validId=value=>typeof value==='string'&&/^[a-f0-9]{32}$/.test(value);
const key=id=>'remote/'+id+'/frame';
export async function closeRemote(env,id,status,now,message,h){
  await env.DB.prepare('UPDATE remote_sessions SET status=?,message_cipher=? WHERE id=? AND status IN '+liveSQL).bind(status,await h.seal(String(message||'').slice(0,500),id+':remote-message'),id).run();
  await env.DB.prepare('DELETE FROM remote_inputs WHERE session_id=?').bind(id).run();
  await env.DB.prepare('DELETE FROM terminal_commands WHERE session_id=?').bind(id).run();
  await env.BUCKET.delete(key(id));
}
export async function expireRemote(env,now,h){
  const scoped=await env.DB.prepare("SELECT r.id,r.agent_id,r.mode,u.id AS user_id,u.role,u.permissions_cipher FROM remote_sessions r JOIN sessions s ON s.token_hash=r.owner_hash JOIN users u ON u.id=s.user_id WHERE r.status IN ('requested','preparing','active') AND u.role<>'admin'").all();
  for(const row of scoped.results){const user={id:row.user_id,role:row.role,permissions:await userPolicy({id:row.user_id,permissions_cipher:row.permissions_cipher},env)};if(!canAgent(user,row.agent_id,now)||!can(user,'remote.'+(row.mode||'desktop'),now))await closeRemote(env,row.id,'closed',now,'Les droits de cette session ont expiré.',h);}
  const stale=await env.DB.prepare('SELECT id FROM remote_sessions WHERE status IN '+liveSQL+" AND ((status='requested' AND created_at<=?) OR expires_at<=? OR viewer_until<=? OR (status<>'requested' AND agent_until<=?) OR NOT EXISTS(SELECT 1 FROM sessions s WHERE s.token_hash=owner_hash AND s.expires_at>?) OR generation<>(SELECT generation FROM vault WHERE id=1) OR NOT EXISTS(SELECT 1 FROM scan_agents a WHERE a.id=agent_id AND a.revoked_at IS NULL))").bind(now-90000,now,now,now,now).all();
  for(const row of stale.results)await closeRemote(env,row.id,'closed',now,'Session terminée : connexion interrompue ou durée dépassée.',h);
  await env.DB.prepare('DELETE FROM remote_sessions WHERE status NOT IN '+liveSQL+' AND expires_at<?').bind(now-86400000).run();
}
export async function claimRemote(env,agent,now,h){
  await expireRemote(env,now,h);
  const lease=h.random(32),candidate=await env.DB.prepare("SELECT id FROM remote_sessions WHERE agent_id=? AND generation=? AND status='requested' AND viewer_until>? AND expires_at>? LIMIT 1").bind(agent.id,agent.generation,now,now).first();
  if(!candidate)return null;
  const row=await env.DB.prepare("UPDATE remote_sessions SET status='preparing',lease_hash=?,agent_until=? WHERE id=? AND status='requested' RETURNING id,expires_at,mode").bind(await h.digest(lease),now+15000,candidate.id).first();
  return row?{id:row.id,lease,expiresAt:row.expires_at,...(row.mode==='terminal'?{mode:'terminal'}:{})}:null;
}
import {can,canAgent,requirePermission} from './permissions.mjs';
export async function handleRemoteAPI(request,env,now,h){
  const {fail,json,body,seal,open}=h,path=new URL(request.url).pathname;
  const agentRoute=path.startsWith('/api/agent/remote/'),auth=agentRoute?await h.agentAuth():await h.authorize(request,env,now);
  await expireRemote(env,now,h);
  if(path==='/api/remote/start'&&request.method==='POST'){
    const {agentId,mode='desktop'}=await body();if(!validId(agentId)||!['desktop','terminal'].includes(mode))fail(400,'Poste ou mode invalide.');
    requirePermission(auth.user,'remote.'+mode,fail,now);if(!canAgent(auth.user,agentId,now))fail(403,'Ce poste ne fait pas partie de tes accès.');
    const agent=await env.DB.prepare('SELECT * FROM scan_agents WHERE id=? AND generation=? AND revoked_at IS NULL').bind(agentId,auth.generation).first();
    if(!agent)fail(404,'Poste introuvable.');if(agent.last_seen<=now-20000)fail(409,'Démarre l’agent sur le poste distant.');
    const metadata=await open(agent.name_cipher,agent.id+':name');if(!metadata.capabilities?.includes(mode==='terminal'?'remote-terminal-v1':'remote-desktop-v1'))fail(409,'Mets à jour l’agent depuis la fenêtre Agents pour utiliser cette prise en main.');
    const id=h.random(16);
    if(await env.DB.prepare("SELECT id FROM ai_jobs WHERE agent_id=? AND status IN ('queued','running') AND expires_at>?").bind(agent.id,now).first())fail(409,'Une réponse IA est en cours sur ce poste. Attends sa fin.');
    const inserted=await env.DB.prepare("INSERT INTO remote_sessions(id,agent_id,generation,owner_hash,status,created_at,expires_at,viewer_until,agent_until,mode) SELECT ?,?,?,?,'requested',?,?,?,0,? WHERE NOT EXISTS(SELECT 1 FROM scan_jobs WHERE agent_id=? AND status IN ('queued','running')) ON CONFLICT DO NOTHING RETURNING id").bind(id,agent.id,auth.generation,auth.hash,now,now+20*60000,now+15000,mode,agent.id).first();
    if(!inserted)fail(409,'Le poste exécute déjà un scan ou une prise en main. Termine cette opération avant de te connecter.');
    return json({id,status:'requested',expiresAt:now+20*60000},201);
  }
  const data=request.method==='POST'?await body(path.endsWith('/exchange')?700000:64000):Object.fromEntries(new URL(request.url).searchParams);
  if(!validId(data.id))fail(400,'Session invalide.');
  let row=await env.DB.prepare('SELECT * FROM remote_sessions WHERE id=? AND generation=?').bind(data.id,auth.generation).first();
  if(!row||agentRoute&&row.agent_id!==auth.id||!agentRoute&&row.owner_hash!==auth.hash)fail(404,'Session introuvable.');
  if(!agentRoute&&(!canAgent(auth.user,row.agent_id,now)||!can(auth.user,'remote.'+(row.mode||'desktop'),now))){await closeRemote(env,row.id,'closed',now,'Les droits de cette session ont expiré.',h);fail(403,'Tes droits de prise en main ont expiré.',{code:'PERMISSION_DENIED'});}
  if(agentRoute&&(!/^[a-f0-9]{64}$/.test(data.lease||'')||row.lease_hash!==await h.digest(data.lease)))fail(403,'Session non attribuée à cet agent.');
  const describe=async value=>({id:value.id,status:value.status,revision:value.frame_revision,expiresAt:value.expires_at,message:await open(value.message_cipher,value.id+':remote-message')||''});
  if(path==='/api/remote/session'&&request.method==='GET'){
    if(REMOTE_LIVE.includes(row.status))await env.DB.prepare('UPDATE remote_sessions SET viewer_until=? WHERE id=? AND status IN '+liveSQL).bind(now+15000,row.id).run();
    if(row.mode==='terminal')return json({...await describe(row),...await terminalView(env,row,h)});
    const object=row.status==='active'?await env.BUCKET.get(key(row.id)):null;
    return json({...await describe(row),frame:object?await open(await object.text(),row.id+':remote-frame'):null});
  }
  if(path==='/api/remote/stop'&&request.method==='POST'){
    await closeRemote(env,row.id,'closed',now,'Session terminée depuis WolfGuard.',h);return json({ok:true});
  }
  if(path.includes('/terminal/')&&request.method==='POST')return handleTerminalAPI(path,data,env,row,now,{...h,closeRemote});
  if(row.mode==='terminal')fail(409,'Cette session utilise le terminal.');
  if(path==='/api/remote/input'&&request.method==='POST'){
    if(row.status!=='active')fail(409,'La session n’est pas active.');
    if(!Number.isSafeInteger(data.seq)||data.seq<1||!Array.isArray(data.events)||!data.events.length||data.events.length>32)fail(400,'Lot de contrôle invalide.');
    let events;try{events=data.events.map(desktopInput);}catch(error){fail(400,error.message);}
    if(data.seq<=row.input_seq)return json({ok:true,accepted:false});
    if(data.seq!==row.input_seq+1)fail(409,'Ordre des actions interrompu. Reconnecte la session.');
    const cipher=await seal(events,row.id+':remote-input:'+data.seq);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO remote_inputs(session_id,seq,created_at,input_cipher) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM remote_sessions WHERE id=? AND status='active' AND input_seq=?) ON CONFLICT DO NOTHING").bind(row.id,data.seq,now,cipher,row.id,data.seq-1),
      env.DB.prepare("UPDATE remote_sessions SET input_seq=?,viewer_until=? WHERE id=? AND status='active' AND input_seq=?").bind(data.seq,now+15000,row.id,data.seq-1)
    ]);return json({ok:true,accepted:true});
  }
  if(path==='/api/agent/remote/exchange'&&request.method==='POST'){
    if(!REMOTE_LIVE.includes(row.status))return json({...await describe(row),inputs:[]});
    if(!['preparing','active','denied','closed','error'].includes(data.status))fail(400,'État de bureau invalide.');
    if(['denied','closed','error'].includes(data.status)){await closeRemote(env,row.id,data.status,now,data.message||'Session terminée sur le poste distant.',h);return json({status:data.status,inputs:[]});}
    if(row.status==='requested')fail(409,'Session non démarrée.');
    if(row.status==='active'&&data.status!=='active')fail(409,'État de session obsolète.');
    if(!Number.isSafeInteger(data.ack)||data.ack<row.input_ack||data.ack>row.input_seq)fail(400,'Accusé de contrôle invalide.');
    const pending=await env.DB.prepare('SELECT * FROM remote_inputs WHERE session_id=? AND seq>? ORDER BY seq LIMIT 8').bind(row.id,data.ack).all();
    if(pending.results.some(value=>value.created_at<now-4000)){await closeRemote(env,row.id,'closed',now,'La connexion est trop lente : contrôle arrêté pour éviter des actions retardées.',h);return json({status:'closed',inputs:[]});}
    if(data.frame){
      if(data.status!=='active')fail(409,'Le partage d’écran n’est pas encore accepté.');
      let frame;try{frame=desktopFrame(data.frame);}catch(error){fail(400,error.message);}
      await env.BUCKET.put(key(row.id),await seal(frame,row.id+':remote-frame'));
    }
    const updated=await env.DB.prepare('UPDATE remote_sessions SET status=?,agent_until=?,input_ack=?,frame_revision=frame_revision+? WHERE id=? AND status IN '+liveSQL+' AND viewer_until>? AND expires_at>? RETURNING *').bind(data.status,now+15000,data.ack,data.frame?1:0,row.id,now,now).first();
    if(!updated){await env.BUCKET.delete(key(row.id));return json({status:'closed',inputs:[]});}
    await env.DB.prepare('DELETE FROM remote_inputs WHERE session_id=? AND seq<=?').bind(row.id,data.ack).run();
    const inputs=[];for(const value of pending.results)inputs.push({seq:value.seq,events:await open(value.input_cipher,row.id+':remote-input:'+value.seq)});
    return json({...await describe(updated),inputs});
  }
  fail(404,'Adresse de prise en main inconnue.');
}
