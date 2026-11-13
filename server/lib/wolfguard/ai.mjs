import {accessibleAgent,administrator} from './agent-access.mjs';
import {chatInput} from './ai-input.mjs';
export {chatInput} from './ai-input.mjs';
import {seal,open} from './access.mjs';
import {can,canAgent,requirePermission} from './permissions.mjs';
import {userPolicy} from './permission-store.mjs';

const validId=value=>typeof value==='string'&&/^[a-f0-9]{32}$/.test(value);
const pending="('queued','running')";
async function expire(env,now){
  await env.DB.prepare(`UPDATE ai_jobs SET status='failed' WHERE status IN ${pending} AND expires_at<=?`).bind(now).run();
  await env.DB.prepare('DELETE FROM ai_jobs WHERE created_at<?').bind(now-3600000).run();
}
async function ownerAllowed(env,row,now){
  const user=await env.DB.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE u.id=? AND u.code_version=? AND u.disabled_at IS NULL AND u.credential_pending=0 AND s.token_hash=? AND s.user_version=u.code_version AND s.generation=? AND s.expires_at>? AND s.active_at>? AND s.generation=(SELECT generation FROM vault WHERE id=1)').bind(row.user_id,row.user_version,row.session_hash,row.generation,now,now-3600000).first();
  if(!user)return false;user.permissions=await userPolicy(user,env);return can(user,'tools.write',now)&&await accessibleAgent(env,user,row.agent_id,now,'tools.write');
}
export async function claimAI(env,agent,now,h){
  await expire(env,now);
  const row=await env.DB.prepare("SELECT * FROM ai_jobs WHERE agent_id=? AND generation=? AND status='queued' AND expires_at>? ORDER BY created_at LIMIT 1").bind(agent.id,agent.generation,now).first();
  if(!row)return null;
  if(!await ownerAllowed(env,row,now)){await env.DB.prepare("UPDATE ai_jobs SET status='cancelled' WHERE id=? AND status='queued'").bind(row.id).run();return null;}
  const lease=h.random(32),claimed=await env.DB.prepare("UPDATE ai_jobs SET status='running',lease_hash=?,expires_at=? WHERE id=? AND status='queued' RETURNING id").bind(await h.digest(lease),now+600000,row.id).first();
  return claimed?{id:row.id,lease,...await open(row.request_cipher,'WolfGuard AI request v1:'+row.id,env)}:null;
}
export async function updateAI(request,env,agent,now,h){
  const {fail,json}=h;if(request.method!=='POST')fail(404,'Adresse inconnue.');
  const data=await h.body(100000);if(!validId(data.id)||typeof data.lease!=='string'||!/^[a-f0-9]{64}$/.test(data.lease)||!['running','completed','failed'].includes(data.status))fail(400,'Réponse IA invalide.');
  const row=await env.DB.prepare("SELECT * FROM ai_jobs WHERE id=? AND agent_id=? AND generation=? AND lease_hash=? AND status='running' AND expires_at>?").bind(data.id,agent.id,agent.generation,await h.digest(data.lease),now).first();
  if(!row)return json({accepted:false,status:'cancelled'});
  if(!await ownerAllowed(env,row,now)){await env.DB.prepare("UPDATE ai_jobs SET status='cancelled' WHERE id=? AND status='running'").bind(row.id).run();return json({accepted:false,status:'cancelled'});}
  let result=null;
  if(data.status!=='running'){
    const text=data.status==='completed'?data.content:data.error;
    if(typeof text!=='string'||!text.trim()||text.length>20000)fail(400,'Réponse IA invalide.');
    result=await seal(data.status==='completed'?{content:text}:{error:text},'WolfGuard AI result v1:'+row.id,env);
  }
  const updated=await env.DB.prepare("UPDATE ai_jobs SET status=?,result_cipher=COALESCE(?,result_cipher) WHERE id=? AND status='running' AND expires_at>?").bind(data.status,result,row.id,now).run();
  return json({accepted:Number(updated.meta?.changes)===1,status:data.status});
}
export async function handleAI(request,env,now,h){
  const {fail,json}=h,session=await h.authorize(request,env,now);requirePermission(session.user,'tools.write',fail,now);await expire(env,now);
  const url=new URL(request.url);
  if(url.pathname==='/api/ai'&&request.method==='POST'){
    const data=await h.body(100000);if(!validId(data.agentId)||!await accessibleAgent(env,session.user,data.agentId,now,'tools.write'))fail(403,'Choisis un poste autorisé.');
    let input;try{input=chatInput(data);}catch(error){fail(400,error.message);}
    const agent=await env.DB.prepare('SELECT * FROM scan_agents WHERE id=? AND generation=? AND revoked_at IS NULL').bind(data.agentId,session.generation).first();
    if(!agent||agent.last_seen<=now-20000)fail(409,'Le poste est hors ligne. Démarre son agent WolfGuard.');
    // Agent metadata uses the established scan encryption context.
    const metadata=await h.open(agent.name_cipher,agent.id+':name');
    if(!metadata.capabilities?.includes('ai-chat-v1'))fail(409,'Mets à jour l’agent depuis Agents pour utiliser le chatbot local.');
    const id=h.random(16),cipher=await seal(input,'WolfGuard AI request v1:'+id,env);
    const created=await env.DB.prepare(`INSERT INTO ai_jobs(id,agent_id,user_id,user_version,session_hash,generation,status,request_cipher,created_at,expires_at) SELECT ?,?,?,?,?,?,'queued',?,?,? WHERE NOT EXISTS(SELECT 1 FROM ai_jobs WHERE agent_id=? AND status IN ${pending}) AND NOT EXISTS(SELECT 1 FROM scan_jobs WHERE agent_id=? AND status IN ('queued','running')) AND NOT EXISTS(SELECT 1 FROM remote_sessions WHERE agent_id=? AND status IN ('requested','preparing','active')) ON CONFLICT DO NOTHING RETURNING id`).bind(id,agent.id,session.user.id,session.user_version,session.hash,session.generation,cipher,now,now+120000,agent.id,agent.id,agent.id).first();
    if(!created)fail(409,'Ce poste est occupé. Attends la fin du traitement en cours.');return json({id,status:'queued'},201);
  }
  if(['/api/ai','/api/ai/cancel'].includes(url.pathname)){
    const data=request.method==='POST'?await h.body():{},id=data.id||url.searchParams.get('id');if(!validId(id))fail(400,'Demande IA invalide.');
    const row=await env.DB.prepare('SELECT * FROM ai_jobs WHERE id=? AND user_id=? AND generation=?').bind(id,session.user.id,session.generation).first();
    if(!row)fail(404,'Demande IA introuvable.');if(!await accessibleAgent(env,session.user,row.agent_id,now,'tools.write'))fail(403,'Ce poste ne fait plus partie de tes accès.');
    if(url.pathname.endsWith('/cancel')&&request.method==='POST'){await env.DB.prepare(`UPDATE ai_jobs SET status='cancelled' WHERE id=? AND status IN ${pending}`).bind(id).run();return json({ok:true});}
    if(url.pathname==='/api/ai'&&request.method==='GET')return json({id,status:row.status,...(row.result_cipher?await open(row.result_cipher,'WolfGuard AI result v1:'+id,env):{}),...(row.status==='failed'&&!row.result_cipher?{error:'Le traitement a expiré. Vérifie Ollama et le modèle sur le poste.'}:{})});
  }
  fail(404,'Adresse inconnue.');
}
