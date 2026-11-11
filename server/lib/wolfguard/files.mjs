import {fileCommand,fileResult} from './files-spec.mjs';
const live="('preparing','active')";
export async function clearFileCommands(env,id){await env.DB.prepare('DELETE FROM remote_file_commands WHERE session_id=?').bind(id).run();}
export async function handleFileAPI(path,data,env,row,now,h){
  const {fail,json,seal,open}=h;
  if(row.mode!=='files')fail(409,'Ouvre le mode Fichiers.');
  if(path==='/api/remote/files/command'){
    if(row.status!=='active')fail(409,'Le poste n’est pas connecté.');
    let command;try{command=fileCommand(data.command);}catch(error){fail(400,error.message);}
    const seq=row.transfer_seq+1;
    const result=await env.DB.batch([
      env.DB.prepare("INSERT INTO remote_file_commands(session_id,seq,status,created_at,spec_cipher) SELECT ?,?,'queued',?,? WHERE EXISTS(SELECT 1 FROM remote_sessions WHERE id=? AND status='active' AND transfer_seq=?) AND NOT EXISTS(SELECT 1 FROM remote_file_commands WHERE session_id=? AND status IN ('queued','running')) ON CONFLICT DO NOTHING").bind(row.id,seq,now,await seal(command,row.id+':file-command:'+seq),row.id,seq-1,row.id),
      env.DB.prepare("UPDATE remote_sessions SET transfer_seq=?,viewer_until=? WHERE id=? AND transfer_seq=? AND EXISTS(SELECT 1 FROM remote_file_commands WHERE session_id=? AND seq=?)").bind(seq,now+15000,row.id,seq-1,row.id,seq)
    ]);
    if(!result[0]?.meta?.changes)fail(409,'Un transfert est déjà en cours.');
    await env.DB.prepare('DELETE FROM remote_file_commands WHERE session_id=? AND seq<?').bind(row.id,seq-1).run();
    return json({seq},201);
  }
  if(path==='/api/remote/files/result'){
    const seq=Number(data.seq);if(!Number.isSafeInteger(seq)||seq<1)fail(400,'Transfert invalide.');
    const command=await env.DB.prepare('SELECT * FROM remote_file_commands WHERE session_id=? AND seq=?').bind(row.id,seq).first();
    if(!command)fail(404,'Transfert introuvable.');
    if(['queued','running'].includes(command.status)&&now-command.created_at>60000)fail(504,'Le poste ne répond pas. Reconnecte la session.');
    await env.DB.prepare('UPDATE remote_sessions SET viewer_until=? WHERE id=? AND status IN '+live).bind(now+15000,row.id).run();
    return json({seq,status:command.status,result:command.result_cipher?await open(command.result_cipher,row.id+':file-result:'+seq):null});
  }
  if(path==='/api/agent/remote/files/exchange'){
    if(!['preparing','active'].includes(row.status))return json({status:row.status});
    if(data.result!==undefined){
      if(!Number.isSafeInteger(data.seq)||data.seq<1)fail(400,'Transfert invalide.');
      let result;try{result=fileResult(data.result);}catch(error){fail(400,error.message);}
      await env.DB.prepare("UPDATE remote_file_commands SET status='done',result_cipher=? WHERE session_id=? AND seq=? AND status='running'").bind(await seal(result,row.id+':file-result:'+data.seq),row.id,data.seq).run();
    }
    const updated=await env.DB.prepare('UPDATE remote_sessions SET status=\'active\',agent_until=? WHERE id=? AND status IN '+live+' AND viewer_until>? AND expires_at>? RETURNING id').bind(now+15000,row.id,now,now).first();
    if(!updated)return json({status:'closed'});
    const command=await env.DB.prepare("UPDATE remote_file_commands SET status='running' WHERE session_id=? AND seq=(SELECT MIN(seq) FROM remote_file_commands WHERE session_id=? AND status='queued') AND status='queued' RETURNING *").bind(row.id,row.id).first();
    return json({status:'active',command:command?{seq:command.seq,spec:await open(command.spec_cipher,row.id+':file-command:'+command.seq)}:null});
  }
  fail(404,'Adresse de transfert inconnue.');
}
