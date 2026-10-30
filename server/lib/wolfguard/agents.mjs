const encode=new TextEncoder();
const MAX_RESULT=1024*1024,LEASE_MS=30000,ONLINE_MS=20000;
export async function handleAgentAPI(request,env,now,h){
  const {fail,json,random,digest,authorize,storageKey}=h,path=new URL(request.url).pathname;
  async function body(limit=16000){let size=0,parts=[];if(!request.body)fail(400,'Requête vide.');for await(const part of request.body){size+=part.length;if(size>limit)fail(413,'Relevé trop volumineux.');parts.push(part);}const bytes=new Uint8Array(size);let i=0;for(const part of parts){bytes.set(part,i);i+=part.length;}try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail(400,'Requête invalide.');}}
  const hex=bytes=>[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
  const unhex=text=>Uint8Array.from(text.match(/../g)||[],n=>parseInt(n,16));
  const base64=value=>{const bytes=new Uint8Array(value);let output='';for(let i=0;i<bytes.length;i+=16000)output+=String.fromCharCode(...bytes.subarray(i,i+16000));return btoa(output);};
  async function seal(value,aad){const iv=crypto.getRandomValues(new Uint8Array(12));return hex(iv)+':'+base64(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encode.encode('WolfGuard agent v1:'+aad)},await storageKey(env),encode.encode(JSON.stringify(value))));}
  async function open(value,aad){if(!value)return null;const [iv,cipher]=value.split(':');return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unhex(iv),additionalData:encode.encode('WolfGuard agent v1:'+aad)},await storageKey(env),Uint8Array.from(atob(cipher),c=>c.charCodeAt(0)))));}
  async function agentAuth(){const token=/^Agent ([a-f0-9]{64})$/.exec(request.headers.get('Authorization')||'')?.[1];if(!token)fail(401,'Agent non associé.');const row=await env.DB.prepare('UPDATE scan_agents SET last_seen=? WHERE token_hash=? AND revoked_at IS NULL AND generation=(SELECT generation FROM vault WHERE id=1) RETURNING *').bind(now,await digest(token)).first();if(!row)fail(401,'Association expirée ou agent révoqué.');return row;}
  const validId=value=>typeof value==='string'&&/^[a-f0-9]{32}$/.test(value);
  const changed=result=>Number(result?.meta?.changes||0)>0;
  async function expire(){await env.DB.prepare("UPDATE scan_jobs SET status=CASE WHEN status='queued' THEN 'expired' ELSE 'lost' END,updated_at=?,revision=revision+1 WHERE (status='queued' AND expires_at<=?) OR (status='running' AND (lease_until<=? OR expires_at<=?))").bind(now,now,now,now).run();await env.DB.prepare("DELETE FROM scan_jobs WHERE id IN (SELECT id FROM scan_jobs WHERE updated_at<? AND status NOT IN ('queued','running') LIMIT 50)").bind(now-7*86400000).run();}
  async function publicJob(row,includeResult=false){const spec=await open(row.spec_cipher,row.id+':spec');return {id:row.id,agentId:row.agent_id,strategy:row.strategy,workspace:spec.workspace||(spec.passiveScope==='security'?'vulnerability':row.strategy),status:row.status,createdAt:row.created_at,updatedAt:row.updated_at,revision:row.revision,completed:row.completed,total:row.total,...(includeResult?{report:await open(row.result_cipher,row.id+':result'),spec}:{})};}
  if(path==='/api/agent/enroll'&&request.method==='POST'){
    const {code,name,platform}=await body();if(typeof code!=='string'||!/^[a-f0-9]{32}$/.test(code)||typeof name!=='string'||!name.trim()||name.length>100||!['win32','linux','darwin'].includes(platform))fail(400,'Association invalide.');
    const ticket=await env.DB.prepare('DELETE FROM scan_pairings WHERE token_hash=? AND expires_at>? AND generation=(SELECT generation FROM vault WHERE id=1) RETURNING *').bind(await digest(code),now).first();if(!ticket)fail(403,'Code d’association expiré ou déjà utilisé.');
    const count=await env.DB.prepare('SELECT COUNT(*) AS count FROM scan_agents WHERE revoked_at IS NULL AND generation=?').bind(ticket.generation).first();if(count.count>=6)fail(409,'Maximum six agents. Retire un ancien agent depuis le site.');
    const id=random(16),token=random(32);const inserted=await env.DB.prepare('INSERT INTO scan_agents (id,name_cipher,token_hash,generation,created_at,last_seen) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM scan_agents WHERE generation=? AND revoked_at IS NULL)<6 RETURNING id').bind(id,await seal({name:name.trim(),platform},id+':name'),await digest(token),ticket.generation,now,now,ticket.generation).first();if(!inserted)fail(409,'Maximum six agents. Retire un ancien agent depuis le site.');return json({id,token,pollSeconds:4});
  }
  if(path.startsWith('/api/agent/')){
    const agent=await agentAuth();await expire();
    if(path==='/api/agent/poll'&&request.method==='POST'){
      const info=await body();
      if(Array.isArray(info.capabilities)){
        const capabilities=['security-audit-v1','network-scan-v2'].filter(value=>info.capabilities.includes(value));
        const metadata=await open(agent.name_cipher,agent.id+':name');
        if(JSON.stringify(metadata.capabilities)!==JSON.stringify(capabilities))await env.DB.prepare('UPDATE scan_agents SET name_cipher=? WHERE id=?').bind(await seal({...metadata,capabilities},agent.id+':name'),agent.id).run();
      }
      const old=await env.DB.prepare("SELECT id FROM scan_jobs WHERE agent_id=? AND status='running'").bind(agent.id).first();if(old)return json({job:null});
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
  if(path==='/api/agents'&&request.method==='GET'){
    const rows=await env.DB.prepare('SELECT * FROM scan_agents WHERE generation=? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 6').bind(session.generation).all();
    const agents=[];for(const row of rows.results){const metadata=await open(row.name_cipher,row.id+':name');agents.push({id:row.id,...metadata,online:row.last_seen>now-ONLINE_MS,lastSeen:row.last_seen});}return json({agents});
  }
  if(path==='/api/agents/pair'&&request.method==='POST'){
    const code=random(16);await env.DB.prepare('DELETE FROM scan_pairings WHERE expires_at<=? OR generation<>?').bind(now,session.generation).run();
    const pending=await env.DB.prepare('SELECT COUNT(*) AS count FROM scan_pairings WHERE generation=?').bind(session.generation).first();if(pending.count>=3)fail(429,'Trois codes sont déjà valides. Attends leur expiration.');
    await env.DB.prepare('INSERT INTO scan_pairings (token_hash,generation,expires_at) VALUES (?,?,?)').bind(await digest(code),session.generation,now+5*60000).run();return json({code,expiresAt:now+5*60000});
  }
  if(path==='/api/agents/revoke'&&request.method==='POST'){
    const {id}=await body();if(!validId(id))fail(400,'Agent invalide.');
    const row=await env.DB.prepare('UPDATE scan_agents SET revoked_at=? WHERE id=? AND generation=? AND revoked_at IS NULL RETURNING id').bind(now,id,session.generation).first();if(!row)fail(404,'Agent introuvable.');
    await env.DB.prepare("UPDATE scan_jobs SET status='cancelled',updated_at=?,revision=revision+1 WHERE agent_id=? AND status IN ('queued','running')").bind(now,id).run();return json({ok:true});
  }
  if(path==='/api/scans'&&request.method==='POST'){
    const data=await body();const agent=validId(data.agentId)?await env.DB.prepare('SELECT id,last_seen,name_cipher FROM scan_agents WHERE id=? AND generation=? AND revoked_at IS NULL').bind(data.agentId,session.generation).first():null;if(!agent)fail(404,'Choisis un agent associé.');if(agent.last_seen<=now-ONLINE_MS)fail(409,'L’agent est hors ligne. Démarre-le sur le poste à scanner.');
    let spec;try{spec=h.scanSpec(data);}catch(error){fail(400,error.message);}
    if(spec.passiveScope==='security'&&!(await open(agent.name_cipher,agent.id+':name')).capabilities?.includes('security-audit-v1'))fail(409,'Mets à jour l’agent depuis Paramètres → Agents pour lancer l’audit de sécurité.');
    const id=random(16),cipher=await seal(spec,id+':spec');
    const row=await env.DB.prepare("INSERT INTO scan_jobs (id,agent_id,generation,strategy,status,spec_cipher,created_at,updated_at,expires_at,revision,completed,total,lease_until) VALUES (?,?,?,?,'queued',?,?,?,?,0,0,0,0) ON CONFLICT DO NOTHING RETURNING id").bind(id,agent.id,session.generation,spec.strategy,cipher,now,now,now+120000).first();if(!row)fail(409,'Un scan est déjà en cours sur cet agent. Attends ou arrête-le.');return json({id},201);
  }
  if(path==='/api/scans'&&request.method==='GET'){
    const agentId=new URL(request.url).searchParams.get('agentId');if(!validId(agentId))fail(400,'Agent invalide.');
    const rows=await env.DB.prepare('SELECT * FROM scan_jobs WHERE agent_id=? AND generation=? ORDER BY created_at DESC LIMIT 12').bind(agentId,session.generation).all();const jobs=[];for(const row of rows.results)jobs.push(await publicJob(row));return json({jobs});
  }
  if(path==='/api/scans/result'&&request.method==='GET'){
    const id=new URL(request.url).searchParams.get('id');if(!validId(id))fail(400,'Scan invalide.');const row=await env.DB.prepare('SELECT * FROM scan_jobs WHERE id=? AND generation=?').bind(id,session.generation).first();if(!row)fail(404,'Scan introuvable.');return json(await publicJob(row,true));
  }
  if(path==='/api/scans/cancel'&&request.method==='POST'){
    const {id}=await body();if(!validId(id))fail(400,'Scan invalide.');const row=await env.DB.prepare("UPDATE scan_jobs SET status='cancelled',updated_at=?,revision=revision+1 WHERE id=? AND generation=? AND status IN ('queued','running') RETURNING id").bind(now,id,session.generation).first();if(!row)fail(409,'Ce scan est déjà terminé.');return json({ok:true});
  }
  fail(404,'Adresse inconnue.');
}
