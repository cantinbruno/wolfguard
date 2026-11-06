import {terminalCommand,terminalResult} from './terminal-spec.mjs';
const liveSQL="('requested','preparing','active')";
export async function terminalView(env,row,h){
  const rows=await env.DB.prepare('SELECT * FROM terminal_commands WHERE session_id=? ORDER BY seq DESC LIMIT 20').bind(row.id).all();
  const commands=[];
  for(const item of rows.results.reverse())commands.push({seq:item.seq,command:await h.open(item.spec_cipher,row.id+':terminal-command:'+item.seq),status:item.status,cancelRequested:!!item.cancel_requested,...await h.open(item.result_cipher,row.id+':terminal-result:'+item.seq)});
  return {mode:'terminal',info:await h.open(row.terminal_cipher,row.id+':terminal-info'),sequence:row.input_seq,commands};
}
export async function handleTerminalAPI(path,data,env,row,now,h){
  const {fail,json,seal,open,closeRemote}=h;
  if(row.mode!=='terminal')fail(409,'Ouvre une session Terminal pour exécuter une commande.');
  if(path==='/api/remote/terminal/command'){
    if(row.status!=='active')fail(409,'Le terminal n’est pas connecté.');
    let command;try{command=terminalCommand(data.command);}catch(error){fail(400,error.message);}
    if(!Number.isSafeInteger(data.seq)||data.seq<1)fail(400,'Numéro de commande invalide.');
    if(data.seq<=row.input_seq)return json({accepted:false});
    if(data.seq!==row.input_seq+1)fail(409,'Ordre des commandes interrompu. Reconnecte le terminal.');
    const cipher=await seal(command,row.id+':terminal-command:'+data.seq);
    const [inserted]=await env.DB.batch([
      env.DB.prepare("INSERT INTO terminal_commands(session_id,seq,created_at,status,spec_cipher,revision,cancel_requested) SELECT ?,?,?,'queued',?,0,0 WHERE EXISTS(SELECT 1 FROM remote_sessions WHERE id=? AND status='active' AND input_seq=?) AND NOT EXISTS(SELECT 1 FROM terminal_commands WHERE session_id=? AND status IN ('queued','running')) ON CONFLICT DO NOTHING").bind(row.id,data.seq,now,cipher,row.id,data.seq-1,row.id),
      env.DB.prepare("UPDATE remote_sessions SET input_seq=?,viewer_until=? WHERE id=? AND status='active' AND input_seq=? AND EXISTS(SELECT 1 FROM terminal_commands WHERE session_id=? AND seq=?)").bind(data.seq,now+15000,row.id,data.seq-1,row.id,data.seq)
    ]);
    if(!Number(inserted?.meta?.changes))fail(409,'Une commande est déjà en cours. Attends sa fin ou interromps-la.');
    await env.DB.prepare('DELETE FROM terminal_commands WHERE session_id=? AND seq<?').bind(row.id,Math.max(1,data.seq-19)).run();
    return json({accepted:true},201);
  }
  if(path==='/api/remote/terminal/cancel'){
    if(!Number.isSafeInteger(data.seq)||data.seq<1)fail(400,'Numéro de commande invalide.');
    await env.DB.prepare("UPDATE terminal_commands SET cancel_requested=1,status=CASE WHEN status='queued' THEN 'cancelled' ELSE status END WHERE session_id=? AND seq=? AND status IN ('queued','running')").bind(row.id,data.seq).run();
    return json({ok:true});
  }
  if(path==='/api/agent/remote/terminal/exchange'){
    if(!['preparing','active'].includes(row.status))return json({status:row.status,command:null});
    if(!['active','closed','error'].includes(data.status))fail(400,'État du terminal invalide.');
    if(data.status!=='active'){await closeRemote(env,row.id,data.status,now,'Terminal fermé sur le poste distant.',h);return json({status:data.status,command:null});}
    if(data.info!==undefined){
      if(!data.info||!['PowerShell','sh'].includes(data.info.shell)||typeof data.info.cwd!=='string'||data.info.cwd.length>4096)fail(400,'Terminal invalide.');
      await env.DB.prepare('UPDATE remote_sessions SET terminal_cipher=? WHERE id=? AND status IN '+liveSQL).bind(await seal({shell:data.info.shell,cwd:data.info.cwd},row.id+':terminal-info'),row.id).run();
    }
    if(data.result){
      let result;try{result=terminalResult(data.result);}catch(error){fail(400,error.message);}
      if(result.seq>row.input_seq)fail(400,'Commande non attribuée à cet agent.');
      await env.DB.prepare("UPDATE terminal_commands SET result_cipher=?,status=?,revision=? WHERE session_id=? AND seq=? AND revision<? AND status IN ('queued','running')").bind(await seal(result,row.id+':terminal-result:'+result.seq),result.status,result.revision,row.id,result.seq,result.revision).run();
    }
    const updated=await env.DB.prepare('UPDATE remote_sessions SET status=\'active\',agent_until=? WHERE id=? AND status IN '+liveSQL+' AND viewer_until>? AND expires_at>? RETURNING id').bind(now+15000,row.id,now,now).first();
    if(!updated)return json({status:'closed',command:null});
    const pending=await env.DB.prepare("SELECT * FROM terminal_commands WHERE session_id=? AND status IN ('queued','running') ORDER BY seq LIMIT 1").bind(row.id).first();
    if(pending?.status==='queued'&&pending.created_at<now-15000){await env.DB.prepare("UPDATE terminal_commands SET status='cancelled',cancel_requested=1 WHERE session_id=? AND seq=? AND status='queued'").bind(row.id,pending.seq).run();return json({status:'active',command:null});}
    return json({status:'active',command:pending?{seq:pending.seq,command:await open(pending.spec_cipher,row.id+':terminal-command:'+pending.seq),cancel:!!pending.cancel_requested}:null});
  }
  fail(404,'Adresse de terminal inconnue.');
}
