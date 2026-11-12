import {accessibleAgent,administrator} from './agent-access.mjs';
import {handleEndpointAPI} from './endpoints.mjs';
import {handleAI,claimAI,updateAI} from './ai.mjs';
import {claimRemote,handleRemoteAPI,expireRemote} from './remote.mjs';
import {cachedAnalysis,analyzeScan} from './certfr.mjs';
import {can,canAgent,requirePermission} from './permissions.mjs';
import {userPolicy} from './permission-store.mjs';
import {objectJSON} from './request.mjs';
const encode=new TextEncoder();
const MAX_RESULT=1024*1024,LEASE_MS=30000,ONLINE_MS=20000;
export async function handleAgentAPI(request,env,now,h){
  const {fail,json,random,digest,authorize,storageKey}=h,path=new URL(request.url).pathname;
  const body=(limit=16000)=>objectJSON(request,limit,fail);
  const hex=bytes=>[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
  const unhex=text=>Uint8Array.from(text.match(/../g)||[],n=>parseInt(n,16));
  const base64=value=>{const bytes=new Uint8Array(value);let output='';for(let i=0;i<bytes.length;i+=16000)output+=String.fromCharCode(...bytes.subarray(i,i+16000));return btoa(output);};
  async function seal(value,aad){const iv=crypto.getRandomValues(new Uint8Array(12));return hex(iv)+':'+base64(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encode.encode('WolfGuard agent v1:'+aad)},await storageKey(env),encode.encode(JSON.stringify(value))));}
  async function open(value,aad){if(!value)return null;const [iv,cipher]=value.split(':');return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unhex(iv),additionalData:encode.encode('WolfGuard agent v1:'+aad)},await storageKey(env),Uint8Array.from(atob(cipher),c=>c.charCodeAt(0)))));}
  async function agentAuth(){const token=/^Agent ([a-f0-9]{64})$/.exec(request.headers.get('Authorization')||'')?.[1];if(!token)fail(401,'Agent non associé.');const row=await env.DB.prepare('UPDATE scan_agents SET last_seen=? WHERE token_hash=? AND revoked_at IS NULL AND generation=(SELECT generation FROM vault WHERE id=1) RETURNING *').bind(now,await digest(token)).first();if(!row)fail(401,'Association expirée ou agent révoqué.');return row;}
  const validId=value=>typeof value==='string'&&/^[a-f0-9]{32}$/.test(value);
  const remoteHelpers={...h,body,seal,open,agentAuth};
  if(path==='/api/edr'||path.startsWith('/api/edr/')||path.startsWith('/api/agent/edr/'))return handleEndpointAPI(request,env,now,remoteHelpers);
  if(path==='/api/ai'||path.startsWith('/api/ai/'))return handleAI(request,env,now,remoteHelpers);
  if(path.startsWith('/api/remote/')||path.startsWith('/api/agent/remote/'))return handleRemoteAPI(request,env,now,remoteHelpers);
  const changed=result=>Number(result?.meta?.changes||0)>0;
  async function expire(){
    await env.DB.prepare("UPDATE scan_jobs SET status=CASE WHEN status='queued' THEN 'expired' ELSE 'lost' END,updated_at=?,revision=revision+1 WHERE (status='queued' AND expires_at<=?) OR (status='running' AND (lease_until<=? OR expires_at<=?))").bind(now,now,now,now).run();
    const scoped=await env.DB.prepare("SELECT j.*,u.id AS permission_user,u.role AS permission_role,u.permissions_cipher,u.disabled_at,u.credential_pending FROM scan_jobs j LEFT JOIN users u ON u.id=j.created_by WHERE j.created_by IS NOT NULL AND j.status IN ('queued','running')").all();
    for(const row of scoped.results){const user={id:row.permission_user,role:row.permission_role,permissions:row.permission_user?await userPolicy({id:row.permission_user,permissions_cipher:row.permissions_cipher},env):null},spec=await open(row.spec_cipher,row.id+':spec'),kind=spec.workspace||(spec.passiveScope==='security'?'vulnerability':row.strategy);if(!row.permission_user||row.disabled_at!==null||row.credential_pending||!await accessibleAgent(env,user,row.agent_id,now)||!can(user,'scan.'+kind+'.run',now)||!can(user,'scan.'+kind+'.read',now))await env.DB.prepare("UPDATE scan_jobs SET status='cancelled',updated_at=?,revision=revision+1 WHERE id=? AND status IN ('queued','running')").bind(now,row.id).run();}
  }
  async function publicJob(row,includeResult=false,history=false){const spec=await open(row.spec_cipher,row.id+':spec');return {id:row.id,agentId:row.agent_id,strategy:row.strategy,workspace:spec.workspace||(spec.passiveScope==='security'?'vulnerability':row.strategy),status:row.status,createdAt:row.created_at,updatedAt:row.updated_at,revision:row.revision,completed:row.completed,total:row.total,...(history?{target:spec.target||''}:{}),...(includeResult?{report:await open(row.result_cipher,row.id+':result'),spec}:{})};}
  if(path==='/api/agent/enroll'&&request.method==='POST'){
    const {code,name,platform}=await body();if(typeof code!=='string'||!/^[a-f0-9]{32}$/.test(code)||typeof name!=='string'||!name.trim()||name.length>100||!['win32','linux','darwin'].includes(platform))fail(400,'Association invalide.');
    const ticket=await env.DB.prepare('DELETE FROM scan_pairings WHERE token_hash=? AND expires_at>? AND generation=(SELECT generation FROM vault WHERE id=1) RETURNING *').bind(await digest(code),now).first();if(!ticket)fail(403,'Code d’association expiré ou déjà utilisé.');
    const count=await env.DB.prepare('SELECT COUNT(*) AS count FROM scan_agents WHERE revoked_at IS NULL AND generation=?').bind(ticket.generation).first();if(count.count>=200)fail(409,'Maximum 200 postes associés. Retire un ancien agent depuis le site.');
    const id=random(16),token=random(32);const inserted=await env.DB.prepare('INSERT INTO scan_agents (id,name_cipher,token_hash,generation,created_at,last_seen) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM scan_agents WHERE generation=? AND revoked_at IS NULL)<200 RETURNING id').bind(id,await seal({name:name.trim(),platform},id+':name'),await digest(token),ticket.generation,now,now,ticket.generation).first();if(!inserted)fail(409,'Maximum 200 postes associés. Retire un ancien agent depuis le site.');return json({id,token,pollSeconds:4});
  }
  if(path.startsWith('/api/agent/')){
    const agent=await agentAuth();await expire();
    if(path==='/api/agent/ai/update')return updateAI(request,env,agent,now,remoteHelpers);
    if(path==='/api/agent/poll'&&request.method==='POST'){
      const info=await body();
      if(Array.isArray(info.capabilities)){
        const capabilities=['security-audit-v1','network-scan-v2','network-target-v1','network-scan-v3','network-auto-map-v1','remote-desktop-v1','remote-terminal-v1','remote-files-v1','ai-chat-v1','endpoint-protection-v1'].filter(value=>info.capabilities.includes(value));
        const metadata=await open(agent.name_cipher,agent.id+':name');
        if(JSON.stringify(metadata.capabilities)!==JSON.stringify(capabilities))await env.DB.prepare('UPDATE scan_agents SET name_cipher=? WHERE id=?').bind(await seal({...metadata,capabilities},agent.id+':name'),agent.id).run();
      }
      const old=await env.DB.prepare("SELECT id FROM scan_jobs WHERE agent_id=? AND status='running'").bind(agent.id).first();if(old)return json({job:null});
      const remote=await claimRemote(env,agent,now,remoteHelpers);if(remote)return json({job:null,remote});
      if(info.capabilities?.includes('ai-chat-v1')){const ai=await claimAI(env,agent,now,h);if(ai)return json({job:null,ai});}
      const candidate=await env.DB.prepare("SELECT id FROM scan_jobs WHERE agent_id=? AND generation=? AND status='queued' AND expires_at>? ORDER BY created_at LIMIT 1").bind(agent.id,agent.generation,now).first();if(!candidate)return json({job:null});
      const lease=random(32),row=await env.DB.prepare("UPDATE scan_jobs SET status='running',lease_hash=?,lease_until=?,expires_at=?,updated_at=?,revision=revision+1 WHERE id=? AND status='queued' RETURNING *").bind(await digest(lease),now+LEASE_MS,now+10*60000,now,candidate.id).first();
      return json({job:row?{id:row.id,lease,revision:row.revision,spec:await open(row.spec_cipher,row.id+':spec')}:null});
    }
    if(path==='/api/agent/update'&&request.method==='POST'){
      const data=await body(MAX_RESULT+16000);if(!validId(data.id)||!Number.isSafeInteger(data.revision)||data.revision<1||!['running','completed','cancelled','failed'].includes(data.status)||!/^[a-f0-9]{64}$/.test(data.lease||''))fail(400,'Mise à jour invalide.');
      const row=await env.DB.prepare('SELECT * FROM scan_jobs WHERE id=? AND agent_id=? AND generation=? AND lease_hash=?').bind(data.id,agent.id,agent.generation,await digest(data.lease)).first();if(!row)fail(403,'Scan non attribué à cet agent.');
      if(data.revision<=row.revision)return json({accepted:false,revision:row.revision,status:row.status});
      if(row.status!=='running'||row.lease_until<=now)return json({accepted:false,revision:row.revision,status:row.status});
      let resultCipher=row.result_cipher;
      if(data.report!==undefined){const report=data.report;if(!report||report.strategy!==row.strategy||!Array.isArray(report.results)||report.results.length>5000||encode.encode(JSON.stringify(report)).length>MAX_RESULT)fail(400,'Rapport de scan invalide.');resultCipher=await seal(report,row.id+':result');}
      const completed=Number(data.completed),total=Number(data.total);if(!Number.isSafeInteger(completed)||!Number.isSafeInteger(total)||completed<0||total<completed||total>65536)fail(400,'Progression invalide.');
      const result=await env.DB.prepare("UPDATE scan_jobs SET result_cipher=?,status=?,revision=?,completed=?,total=?,updated_at=?,lease_until=? WHERE id=? AND status='running' AND revision<? AND lease_until>?").bind(resultCipher,data.status,data.revision,completed,total,now,now+LEASE_MS,row.id,data.revision,now).run();
      if(!changed(result)){const current=await env.DB.prepare('SELECT status,revision FROM scan_jobs WHERE id=?').bind(row.id).first();return json({accepted:false,...current});}
      return json({accepted:true,revision:data.revision,status:data.status});
    }
    fail(404,'Adresse agent inconnue.');
  }
  const session=await authorize(request,env,now);await expire();
  const permitAgent=async id=>{if(!await accessibleAgent(env,session.user,id,now))fail(403,'Ce poste ne fait pas partie de tes accès.',{code:'PERMISSION_DENIED'});};
  const jobAllowed=async row=>{const spec=await open(row.spec_cipher,row.id+':spec'),workspace=spec.workspace||(spec.passiveScope==='security'?'vulnerability':row.strategy);return await accessibleAgent(env,session.user,row.agent_id,now)&&can(session.user,'scan.'+workspace+'.read',now);};
  const permitJob=async(id,action='read')=>{const row=await env.DB.prepare('SELECT * FROM scan_jobs WHERE id=? AND generation<=?').bind(id,session.generation).first();if(!row)fail(404,'Scan introuvable.');if(!await jobAllowed(row))fail(403,'Ce rapport ne fait pas partie de tes accès.',{code:'PERMISSION_DENIED'});const spec=await open(row.spec_cipher,row.id+':spec');requirePermission(session.user,'scan.'+(spec.workspace||(spec.passiveScope==='security'?'vulnerability':row.strategy))+'.'+action,fail,now);return row;};
  if(path==='/api/agents'&&request.method==='GET'){
    if(!can(session.user,'agents.read',now))return json({agents:[]});
    const rows=await env.DB.prepare('SELECT * FROM scan_agents WHERE generation=? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 200').bind(session.generation).all();
    const agents=[];for(const row of rows.results){if(!await accessibleAgent(env,session.user,row.id,now))continue;const metadata=await open(row.name_cipher,row.id+':name');agents.push({id:row.id,...metadata,...(administrator(session.user,now)?{restricted:!!row.restricted}:{}),online:row.last_seen>now-ONLINE_MS,lastSeen:row.last_seen});}return json({agents});
  }
  if(path==='/api/agents/pair'&&request.method==='POST'){
    requirePermission(session.user,'agents.write',fail,now);
    const code=random(16);await env.DB.prepare('DELETE FROM scan_pairings WHERE expires_at<=? OR generation<>?').bind(now,session.generation).run();
    const pending=await env.DB.prepare('SELECT COUNT(*) AS count FROM scan_pairings WHERE generation=?').bind(session.generation).first();if(pending.count>=3)fail(429,'Trois codes sont déjà valides. Attends leur expiration.');
    await env.DB.prepare('INSERT INTO scan_pairings (token_hash,generation,expires_at) VALUES (?,?,?)').bind(await digest(code),session.generation,now+10*60000).run();return json({code,expiresAt:now+10*60000});
  }
  if(path==='/api/agents/restricted'&&request.method==='POST'){
    if(!administrator(session.user,now))fail(403,'Réservé à l’administrateur.');
    const {id,restricted}=await body();if(!validId(id)||typeof restricted!=='boolean')fail(400,'Poste invalide.');
    const changed=await env.DB.prepare('UPDATE scan_agents SET restricted=? WHERE id=? AND generation=? AND revoked_at IS NULL RETURNING id').bind(restricted?1:0,id,session.generation).first();
    if(!changed)fail(404,'Poste introuvable.');
    await expire();await expireRemote(env,now,remoteHelpers);return json({ok:true,restricted});
  }
  if(path==='/api/agents/revoke'&&request.method==='POST'){
    requirePermission(session.user,'agents.write',fail,now);
    const {id}=await body();if(!validId(id))fail(400,'Agent invalide.');await permitAgent(id);
    const row=await env.DB.prepare('UPDATE scan_agents SET revoked_at=? WHERE id=? AND generation=? AND revoked_at IS NULL RETURNING id').bind(now,id,session.generation).first();if(!row)fail(404,'Agent introuvable.');
    await expireRemote(env,now,remoteHelpers);
    await env.DB.prepare("UPDATE scan_jobs SET status='cancelled',updated_at=?,revision=revision+1 WHERE agent_id=? AND status IN ('queued','running')").bind(now,id).run();return json({ok:true});
  }
  if(path==='/api/scans'&&request.method==='POST'){
    const data=await body();const requested=data.workspace||(data.strategy==='passive'?(data.passiveScope==='security'?'vulnerability':'passive'):'active');requirePermission(session.user,'scan.'+requested+'.write',fail,now);await permitAgent(data.agentId);const agent=validId(data.agentId)?await env.DB.prepare('SELECT id,last_seen,name_cipher FROM scan_agents WHERE id=? AND generation=? AND revoked_at IS NULL').bind(data.agentId,session.generation).first():null;if(!agent)fail(404,'Choisis un agent associé.');if(agent.last_seen<=now-ONLINE_MS)fail(409,'L’agent est hors ligne. Démarre-le sur le poste à scanner.');
    let spec;try{spec=h.scanSpec(data);}catch(error){fail(400,error.message);}
    if(spec.workspace==='map'&&spec.target==='auto'&&!(await open(agent.name_cipher,agent.id+':name')).capabilities?.includes('network-auto-map-v1'))fail(409,'Mets à jour l’agent depuis Agents pour la cartographie automatique.');
    const workspace=spec.workspace||(spec.passiveScope==='security'?'vulnerability':spec.strategy);requirePermission(session.user,'scan.'+workspace+'.read',fail,now);requirePermission(session.user,'scan.'+workspace+'.write',fail,now);
    await expireRemote(env,now,remoteHelpers);
    if(await env.DB.prepare("SELECT id FROM remote_sessions WHERE agent_id=? AND status IN ('requested','preparing','active')").bind(agent.id).first())fail(409,'Une prise en main est en cours. Déconnecte-la avant de lancer un scan.');
    if(spec.passiveScope!=='security'&&!(await open(agent.name_cipher,agent.id+':name')).capabilities?.includes('network-scan-v3'))fail(409,'Mets à jour l’agent depuis Paramètres → Agents pour les observations enrichies et les adresses publiques.');
    if(spec.passiveScope==='security'&&!(await open(agent.name_cipher,agent.id+':name')).capabilities?.includes('security-audit-v1'))fail(409,'Mets à jour l’agent depuis Paramètres → Agents pour lancer l’audit de sécurité.');
    if(spec.workspace!=='map'&&spec.passiveScope!=='security'&&!(await open(agent.name_cipher,agent.id+':name')).capabilities?.includes('network-target-v1'))fail(409,'Mets à jour l’agent depuis Paramètres → Agents pour scanner uniquement la cible IP ou FQDN indiquée.');
    if(await env.DB.prepare("SELECT id FROM ai_jobs WHERE agent_id=? AND status IN ('queued','running') AND expires_at>?").bind(agent.id,now).first())fail(409,'Une réponse IA est en cours sur ce poste. Attends sa fin.');
    const id=random(16),cipher=await seal(spec,id+':spec');
    const row=await env.DB.prepare("INSERT INTO scan_jobs (id,agent_id,generation,strategy,status,spec_cipher,created_at,updated_at,expires_at,revision,completed,total,lease_until,created_by) SELECT ?,?,?,?,'queued',?,?,?,?,0,0,0,0,? WHERE NOT EXISTS(SELECT 1 FROM remote_sessions WHERE agent_id=? AND status IN ('requested','preparing','active')) ON CONFLICT DO NOTHING RETURNING id").bind(id,agent.id,session.generation,spec.strategy,cipher,now,now,now+120000,session.user.id,agent.id).first();if(!row)fail(409,'Un scan est déjà en cours sur cet agent. Attends ou arrête-le.');return json({id},201);
  }
  if(path==='/api/scans'&&request.method==='GET'){
    const params=new URL(request.url).searchParams;
    if(params.get('history')==='1'){
      const beforeAt=params.get('beforeAt'),beforeId=params.get('beforeId');
      if((beforeAt!==null||beforeId!==null)&&(!/^[0-9]{1,16}$/.test(beforeAt||'')||!Number.isSafeInteger(Number(beforeAt))||!validId(beforeId)))fail(400,'Position d’historique invalide.');
      const cursor=beforeAt===null?'':' AND (j.created_at<? OR (j.created_at=? AND j.id<?))';
      const values=beforeAt===null?[session.generation]:[session.generation,Number(beforeAt),Number(beforeAt),beforeId];
      // The singleton workspace keeps its history across PIN rotations and revoked agents.
      // Target and agent metadata remain encrypted at rest and are read only after authorization.
      const rows=await env.DB.prepare('SELECT j.*,a.name_cipher AS agent_name_cipher FROM scan_jobs j LEFT JOIN scan_agents a ON a.id=j.agent_id WHERE j.generation<=?'+cursor+' ORDER BY j.created_at DESC,j.id DESC LIMIT 51').bind(...values).all();
      const selected=rows.results.slice(0,50),jobs=[];
      for(const row of selected){if(!await jobAllowed(row))continue;const job=await publicJob(row,false,true),agent=row.agent_name_cipher?await open(row.agent_name_cipher,row.agent_id+':name'):{};jobs.push({...job,agentName:agent.name||'Ancien agent',platform:agent.platform||'',hasReport:!!row.result_cipher});}
      const last=selected.at(-1);return json({jobs,next:rows.results.length>50?{beforeAt:last.created_at,beforeId:last.id}:null});
    }
    const agentId=params.get('agentId');if(!validId(agentId))fail(400,'Agent invalide.');await permitAgent(agentId);
    const rows=await env.DB.prepare('SELECT * FROM scan_jobs WHERE agent_id=? AND generation=? ORDER BY created_at DESC LIMIT 12').bind(agentId,session.generation).all();const jobs=[];for(const row of rows.results)if(await jobAllowed(row))jobs.push(await publicJob(row));return json({jobs});
  }
  if(path==='/api/scans/result'&&request.method==='GET'){
    const id=new URL(request.url).searchParams.get('id');if(!validId(id))fail(400,'Scan invalide.');await permitJob(id,'read');const row=await env.DB.prepare('SELECT * FROM scan_jobs WHERE id=? AND generation<=?').bind(id,session.generation).first();if(!row)fail(404,'Scan introuvable.');return json({...await publicJob(row,true),intelligence:await cachedAnalysis(env,row)});
  }
  if(path==='/api/scans/intelligence'&&request.method==='POST'){
    const {id}=await body();if(!validId(id))fail(400,'Scan invalide.');await permitJob(id,'read');
    const row=await env.DB.prepare('SELECT * FROM scan_jobs WHERE id=? AND generation<=?').bind(id,session.generation).first();if(!row)fail(404,'Scan introuvable.');
    if(['queued','running'].includes(row.status)||!row.result_cipher)fail(409,'Attends la réception du rapport avant de consulter le CERT-FR.');
    const report=await open(row.result_cipher,row.id+':result'),intelligence=await analyzeScan(env,row,report,now);
    await authorize(request,env,now);
    return json({id,revision:row.revision,intelligence});
  }
  if(path==='/api/scans/cancel'&&request.method==='POST'){
    const {id}=await body();if(!validId(id))fail(400,'Scan invalide.');await permitJob(id,'cancel');const row=await env.DB.prepare("UPDATE scan_jobs SET status='cancelled',updated_at=?,revision=revision+1 WHERE id=? AND generation=? AND status IN ('queued','running') RETURNING id").bind(now,id,session.generation).first();if(!row)fail(409,'Ce scan est déjà terminé.');return json({ok:true});
  }
  if(path==='/api/scans/delete'&&request.method==='POST'){
    const {id}=await body();if(!validId(id))fail(400,'Scan invalide.');await permitJob(id,'delete');
    const deleted=await env.DB.prepare("DELETE FROM scan_jobs WHERE id=? AND generation<=? AND status NOT IN ('queued','running') RETURNING id").bind(id,session.generation).first();
    if(!deleted){
      const row=await env.DB.prepare('SELECT status FROM scan_jobs WHERE id=? AND generation<=?').bind(id,session.generation).first();
      if(!row)fail(404,'Scan introuvable.');
      fail(409,'Arrête le scan avant de le supprimer de l’historique.');
    }
    await env.DB.prepare('DELETE FROM scan_intelligence WHERE job_id=?').bind(id).run();
    return json({ok:true});
  }
  fail(404,'Adresse inconnue.');
}
