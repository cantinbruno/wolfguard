import {accessibleAgent,administrator} from './agent-access.mjs';
import {can,canAgent,requirePermission} from './permissions.mjs';
import {userPolicy} from './permission-store.mjs';
import {endpointSnapshot,endpointPolicy,endpointHealth,DEFAULT_ENDPOINT_POLICY,ENDPOINT_COMMANDS} from './endpoint-spec.mjs';

const idOK=value=>typeof value==='string'&&/^[a-f0-9]{32}$/.test(value);
export const canReadEndpoints=(user,now)=>can(user,'edr.read',now)||(can(user,'agents.read',now)&&can(user,'scan.vulnerability.read',now));
export async function handleEndpointAPI(request,env,now,h){
  const {fail,json,body,seal,open,agentAuth,authorize,random,digest}=h,url=new URL(request.url),path=url.pathname;
  const policyFor=async agentId=>{
    const row=await env.DB.prepare('SELECT * FROM endpoint_policies WHERE agent_id=?').bind(agentId).first();
    return row?{policy:await open(row.policy_cipher,agentId+':endpoint-policy'),revision:row.revision}:{policy:{...DEFAULT_ENDPOINT_POLICY},revision:0};
  };
  async function issuerAllowed(command){
    const row=await env.DB.prepare('SELECT * FROM users WHERE id=? AND disabled_at IS NULL AND credential_pending=0 AND code_version=?').bind(command.requested_by,command.user_version).first();
    if(!row)return false;const user={id:row.id,role:row.role,permissions:await userPolicy(row,env)};
    return can(user,'edr.manage',now)&&await accessibleAgent(env,user,command.agent_id,now);
  }
  async function claim(agent,canEnforce){
    await env.DB.prepare("UPDATE endpoint_commands SET status='expired' WHERE agent_id=? AND status IN ('queued','running') AND expires_at<=?").bind(agent.id,now).run();
    const current=await env.DB.prepare("SELECT id FROM endpoint_commands WHERE agent_id=? AND status='running' AND expires_at>?").bind(agent.id,now).first();if(current)return null;
    const queued=await env.DB.prepare("SELECT * FROM endpoint_commands WHERE agent_id=? AND generation=? AND status='queued' AND expires_at>? AND (?=1 OR action='refresh') ORDER BY created_at,id LIMIT 1").bind(agent.id,agent.generation,now,canEnforce?1:0).first();
    if(!queued)return null;
    if(!await issuerAllowed(queued)){await env.DB.prepare("UPDATE endpoint_commands SET status='cancelled' WHERE id=?").bind(queued.id).run();return null;}
    const lease=random(32),claimed=await env.DB.prepare("UPDATE endpoint_commands SET status='running',lease_hash=?,updated_at=? WHERE id=? AND status='queued' AND NOT EXISTS(SELECT 1 FROM endpoint_commands WHERE agent_id=? AND status='running') RETURNING id").bind(await digest(lease),now,queued.id,agent.id).first();
    return claimed?{id:queued.id,action:queued.action,lease}:null;
  }
  if(path.startsWith('/api/agent/edr/')){
    const agent=await agentAuth();if(request.method!=='POST')fail(405,'Méthode inconnue.');
    if(path==='/api/agent/edr/result'){
      const data=await body();if(!idOK(data.id)||!/^[a-f0-9]{64}$/.test(data.lease||'')||typeof data.ok!=='boolean')fail(400,'Résultat de protection invalide.');
      const command=await env.DB.prepare("SELECT * FROM endpoint_commands WHERE id=? AND agent_id=? AND generation=? AND status='running' AND lease_hash=? AND expires_at>?").bind(data.id,agent.id,agent.generation,await digest(data.lease),now).first();
      if(!command)fail(409,'Cette action n’est plus attribuée au poste.');
      if(!await issuerAllowed(command)){await env.DB.prepare("UPDATE endpoint_commands SET status='cancelled' WHERE id=?").bind(command.id).run();fail(409,'Les droits de cette action ont changé.');}
      const result={ok:data.ok,message:typeof data.message==='string'?data.message.slice(0,700):'',code:typeof data.code==='string'?data.code.slice(0,80):''};
      await env.DB.prepare("UPDATE endpoint_commands SET status=?,updated_at=?,result_cipher=? WHERE id=? AND status='running'").bind(data.ok?'completed':'failed',now,await seal(result,command.id+':endpoint-result'),command.id).run();return json({ok:true});
    }
    if(path!=='/api/agent/edr/report')fail(404,'Adresse de protection inconnue.');
    let snapshot;try{snapshot=endpointSnapshot(await body(256000),now);}catch(error){fail(400,error.message);}
    const cipher=await seal({...snapshot,events:[]},agent.id+':endpoint-state');
    const statements=[env.DB.prepare(`INSERT INTO endpoint_states(agent_id,generation,collected_at,received_at,snapshot_cipher)
      SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM scan_agents WHERE id=? AND generation=? AND revoked_at IS NULL)
      ON CONFLICT(agent_id) DO UPDATE SET generation=excluded.generation,collected_at=excluded.collected_at,received_at=excluded.received_at,snapshot_cipher=excluded.snapshot_cipher
      WHERE excluded.generation=endpoint_states.generation AND excluded.collected_at>endpoint_states.collected_at`).bind(agent.id,agent.generation,snapshot.collectedAt,now,cipher,agent.id,agent.generation)];
    for(const event of snapshot.events){
      const key=await digest(agent.id+':'+event.id),encrypted=await seal(event,agent.id+':endpoint-event:'+key);
      statements.push(env.DB.prepare(`INSERT INTO endpoint_events(agent_id,event_key,occurred_at,received_at,status,severity,event_cipher)
        SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM scan_agents WHERE id=? AND generation=? AND revoked_at IS NULL)
        ON CONFLICT(agent_id,event_key) DO UPDATE SET occurred_at=excluded.occurred_at,received_at=excluded.received_at,status=excluded.status,severity=excluded.severity,event_cipher=excluded.event_cipher,
        acknowledged_at=CASE WHEN endpoint_events.status<>excluded.status THEN NULL ELSE endpoint_events.acknowledged_at END,acknowledged_by=CASE WHEN endpoint_events.status<>excluded.status THEN NULL ELSE endpoint_events.acknowledged_by END
        WHERE excluded.occurred_at>=endpoint_events.occurred_at AND (excluded.status<>endpoint_events.status OR excluded.severity<>endpoint_events.severity OR excluded.occurred_at>endpoint_events.occurred_at)`)
        .bind(agent.id,key,event.occurredAt,now,event.status,event.severity,encrypted,agent.id,agent.generation));
    }
    const result=await env.DB.batch(statements),policy=await policyFor(agent.id);
    return json({accepted:!!result[0]?.meta?.changes,...policy,command:await claim(agent,snapshot.canEnforce)});
  }
  const session=await authorize(request,env,now),user=session.user;
  if(!canReadEndpoints(user,now))fail(403,'Ton compte ne peut pas consulter la protection des postes.',{code:'PERMISSION_DENIED'});
  const permit=async id=>{
    if(!idOK(id))fail(400,'Poste invalide.');
    if(!await accessibleAgent(env,user,id,now))fail(403,'Ce poste ne fait pas partie de tes accès.',{code:'PERMISSION_DENIED'});
    const agent=await env.DB.prepare('SELECT * FROM scan_agents WHERE id=? AND generation=? AND revoked_at IS NULL').bind(id,session.generation).first();if(!agent)fail(404,'Poste introuvable.');return agent;
  };
  if(path==='/api/edr'&&request.method==='GET'){
    const rows=await env.DB.prepare(`SELECT a.*,s.snapshot_cipher,s.received_at,s.collected_at,p.policy_cipher,p.revision,
      (SELECT COUNT(*) FROM endpoint_events e WHERE e.agent_id=a.id AND e.status IN ('alert','failed') AND e.acknowledged_at IS NULL) AS alerts,
      (SELECT COUNT(*) FROM endpoint_events e WHERE e.agent_id=a.id AND e.status IN ('blocked','quarantined','removed','cleaned') AND e.occurred_at>=?) AS blocks
      FROM scan_agents a LEFT JOIN endpoint_states s ON s.agent_id=a.id AND s.generation=a.generation LEFT JOIN endpoint_policies p ON p.agent_id=a.id WHERE a.generation=? AND a.revoked_at IS NULL ORDER BY a.created_at DESC LIMIT 200`).bind(now-86400000,session.generation).all();
    const endpoints=[];
    // Decode only authorized endpoints. No scan-history or report fan-out.
    for(const row of rows.results){
      if(!await accessibleAgent(env,user,row.id,now))continue;
      const metadata=await open(row.name_cipher,row.id+':name'),snapshot=row.snapshot_cipher?await open(row.snapshot_cipher,row.id+':endpoint-state'):null,online=row.last_seen>now-90000,fresh=online&&!!row.received_at&&now-row.received_at<120000&&now-row.collected_at<120000;
      endpoints.push({id:row.id,...metadata,online,lastSeen:row.last_seen,receivedAt:row.received_at||null,collectedAt:row.collected_at||null,health:endpointHealth(snapshot,fresh),snapshot:snapshot?{...snapshot,events:undefined}:null,alerts:row.alerts,blocks:row.blocks,policy:row.policy_cipher?await open(row.policy_cipher,row.id+':endpoint-policy'):{...DEFAULT_ENDPOINT_POLICY},revision:row.revision||0});
    }
    return json({endpoints,serverTime:now});
  }
  if(path==='/api/edr/events'&&request.method==='GET'){
    const id=url.searchParams.get('agentId');await permit(id);
    const before=url.searchParams.get('beforeAt'),key=url.searchParams.get('beforeKey');
    if(before!==null&&(!/^[0-9]{1,16}$/.test(before)||!/^[a-f0-9]{64}$/.test(key||'')))fail(400,'Position d’historique invalide.');
    const rows=await env.DB.prepare('SELECT * FROM endpoint_events WHERE agent_id=?'+(before!==null?' AND (occurred_at<? OR (occurred_at=? AND event_key<?))':'')+' ORDER BY occurred_at DESC,event_key DESC LIMIT 51').bind(...(before!==null?[id,Number(before),Number(before),key]:[id])).all();
    const selected=rows.results.slice(0,50),events=await Promise.all(selected.map(async row=>({...await open(row.event_cipher,id+':endpoint-event:'+row.event_key),key:row.event_key,acknowledgedAt:row.acknowledged_at})));
    const commands=await env.DB.prepare('SELECT * FROM endpoint_commands WHERE agent_id=? ORDER BY created_at DESC LIMIT 10').bind(id).all();
    return json({events,next:rows.results.length>50?{beforeAt:selected.at(-1).occurred_at,beforeKey:selected.at(-1).event_key}:null,commands:await Promise.all(commands.results.map(async row=>({id:row.id,action:row.action,status:row.expires_at<=now&&['queued','running'].includes(row.status)?'expired':row.status,createdAt:row.created_at,updatedAt:row.updated_at,result:row.result_cipher?await open(row.result_cipher,row.id+':endpoint-result'):null})))});
  }
  if(request.method!=='POST')fail(404,'Adresse de protection inconnue.');
  const data=await body(),agent=await permit(data.agentId);
  if(path==='/api/edr/acknowledge'){
    requirePermission(user,'edr.acknowledge',fail,now);if(!/^[a-f0-9]{64}$/.test(data.key||''))fail(400,'Alerte invalide.');
    await env.DB.prepare('UPDATE endpoint_events SET acknowledged_at=?,acknowledged_by=? WHERE agent_id=? AND event_key=? AND acknowledged_at IS NULL').bind(now,user.id,agent.id,data.key).run();return json({ok:true});
  }
  requirePermission(user,'edr.manage',fail,now);
  const metadata=await open(agent.name_cipher,agent.id+':name');if(!metadata.capabilities?.includes('endpoint-protection-v1'))fail(409,'Mets à jour cet agent pour gérer sa protection.');
  if(path==='/api/edr/policy'){
    let policy;try{policy=endpointPolicy(data.policy);}catch(error){fail(400,error.message);}
    if(!Number.isSafeInteger(data.revision)||data.revision<0)fail(400,'Révision de politique invalide.');
    const cipher=await seal(policy,agent.id+':endpoint-policy'),current=await authorize(request,env,now);requirePermission(current.user,'edr.manage',fail,now);if(!await accessibleAgent(env,current.user,agent.id,now))fail(403,'Le périmètre de postes a changé.');
    const result=await env.DB.prepare(`INSERT INTO endpoint_policies(agent_id,revision,policy_cipher,updated_by,updated_at)
      SELECT ?,1,?,?,? WHERE ?=0 AND NOT EXISTS(SELECT 1 FROM endpoint_policies WHERE agent_id=?)
      ON CONFLICT(agent_id) DO UPDATE SET revision=endpoint_policies.revision+1,policy_cipher=excluded.policy_cipher,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE endpoint_policies.revision=?`)
      .bind(agent.id,cipher,user.id,now,data.revision,agent.id,data.revision).run();
    if(!result.meta.changes){const update=await env.DB.prepare('UPDATE endpoint_policies SET revision=revision+1,policy_cipher=?,updated_by=?,updated_at=? WHERE agent_id=? AND revision=?').bind(cipher,user.id,now,agent.id,data.revision).run();if(!update.meta.changes)fail(409,'Cette politique a changé. Actualise avant de réessayer.');}
    await env.DB.prepare("UPDATE endpoint_commands SET status='cancelled' WHERE agent_id=? AND action='enable-protection' AND status IN ('queued','running')").bind(agent.id).run();
    return json({ok:true,revision:data.revision+1,policy});
  }
  if(path==='/api/edr/command'){
    if(!ENDPOINT_COMMANDS.includes(data.action))fail(400,'Action de protection inconnue.');
    const queued=await env.DB.prepare("SELECT COUNT(*) n FROM endpoint_commands WHERE agent_id=? AND status IN ('queued','running') AND expires_at>?").bind(agent.id,now).first();if(queued.n>=3)fail(429,'Trois actions sont déjà en attente pour ce poste.');
    if(!user.id)fail(403,'Active les comptes personnels avant de gérer les protections.');
    const current=await authorize(request,env,now);requirePermission(current.user,'edr.manage',fail,now);if(!await accessibleAgent(env,current.user,agent.id,now))fail(403,'Le périmètre de postes a changé.');
    const id=random(16),insert=await env.DB.prepare(`INSERT INTO endpoint_commands(id,agent_id,generation,requested_by,user_version,action,status,created_at,updated_at,expires_at)
      SELECT ?,?,?,?,?,?,'queued',?,?,? WHERE
      (SELECT COUNT(*) FROM endpoint_commands WHERE agent_id=? AND status IN ('queued','running') AND expires_at>?)<3
      AND EXISTS(SELECT 1 FROM users WHERE id=? AND code_version=? AND disabled_at IS NULL)
      AND EXISTS(SELECT 1 FROM scan_agents WHERE id=? AND generation=? AND revoked_at IS NULL)`)
      .bind(id,agent.id,session.generation,user.id,session.user_version,data.action,now,now,now+15*60000,agent.id,now,user.id,session.user_version,agent.id,session.generation).run();
    if(!insert.meta.changes)fail(409,'Le poste, les droits ou les actions en attente ont changé. Actualise avant de réessayer.');
    return json({id,status:'queued'},201);
  }
  fail(404,'Adresse de protection inconnue.');
}
