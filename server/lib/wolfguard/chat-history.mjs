import {seal,open} from './access.mjs';
import {requirePermission} from './permissions.mjs';

const validId=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
const context=(user,id)=>'WolfGuard chat history v1:'+user+':'+id;

export async function handleChatHistory(request,env,now,session,{fail,json,body}){
  const user=session.user,url=new URL(request.url),path=url.pathname;
  if(!user?.id)fail(403,'Connecte-toi à ton compte pour conserver tes conversations.');
  requirePermission(user,'tools.write',fail,now);
  if(path==='/api/chat/history/purge'&&request.method==='POST'){
    if(user.role!=='admin')fail(403,'Seul l’administrateur peut effacer tous les historiques.');
    const data=await body();if(data.confirm!=='DELETE_ALL_CHAT_HISTORY')fail(400,'Confirme la suppression de tous les historiques.');
    await env.DB.batch([env.DB.prepare('UPDATE chat_history_state SET epoch=epoch+1 WHERE id=1'),env.DB.prepare('DELETE FROM chat_conversations'),env.DB.prepare("UPDATE chat_api_usage SET lease_until=0,lease='' ")]);
    return json({ok:true});
  }
  const state=await env.DB.prepare('SELECT epoch FROM chat_history_state WHERE id=1').first();
  const epoch=state.epoch;
  if(path==='/api/chat/history'&&request.method==='GET'){
    const id=url.searchParams.get('id');
    if(id!==null){
      if(!validId(id))fail(400,'Conversation invalide.');
      const row=await env.DB.prepare('SELECT * FROM chat_conversations WHERE id=? AND user_id=? AND epoch=(SELECT epoch FROM chat_history_state WHERE id=1)').bind(id,user.id).first();
      if(!row)fail(404,'Cette conversation n’existe plus.');
      return json({epoch:row.epoch,id:row.id,revision:row.revision,...await open(row.content_cipher,context(user.id,id),env)});
    }
    const rows=await env.DB.prepare('SELECT id,title_cipher,revision,updated_at FROM chat_conversations WHERE user_id=? AND epoch=? ORDER BY updated_at DESC,id LIMIT 100').bind(user.id,epoch).all();
    return json({epoch,conversations:await Promise.all(rows.results.map(async row=>({id:row.id,title:await open(row.title_cipher,context(user.id,row.id)+':title',env),revision:row.revision,updatedAt:row.updated_at})))});
  }
  if(request.method!=='POST'||!['/api/chat/history/save','/api/chat/history/delete'].includes(path))fail(404,'Adresse inconnue.');
  const data=await body();
  if(!validId(data.id)||!Number.isSafeInteger(data.epoch)||!Number.isSafeInteger(data.revision)||data.revision<0)fail(400,'Conversation invalide.');
  if(data.epoch!==epoch)fail(409,'Les historiques ont été effacés. La conversation ne sera pas réenregistrée.');
  if(path.endsWith('/delete')){
    const result=await env.DB.prepare('DELETE FROM chat_conversations WHERE id=? AND user_id=? AND revision=? AND epoch=? AND epoch=(SELECT epoch FROM chat_history_state WHERE id=1)').bind(data.id,user.id,data.revision,epoch).run();
    if(!result.meta.changes)fail(409,'Cette conversation a changé ou a déjà été supprimée.');
    return json({ok:true});
  }
  const messages=data.messages;
  if(!Array.isArray(messages)||messages.length<2||messages.length>16||messages.length%2||messages.some((message,index)=>!message||message.role!==(index%2?'assistant':'user')||typeof message.content!=='string'||!message.content.trim()||message.content.length>(index%2?12000:3000))||messages.reduce((sum,message)=>sum+message.content.length,0)>24000)fail(400,'Conversation invalide ou trop longue.');
  const clean=messages.map(({role,content})=>({role,content}));
  const cipher=await seal({messages:clean},context(user.id,data.id),env),title=await seal(clean[0].content.slice(0,80),context(user.id,data.id)+':title',env);
  // The epoch and revision are checked at commit, after encryption. A stale
  // browser cannot restore purged history or overwrite another tab's changes.
  const result=await env.DB.prepare(`INSERT INTO chat_conversations(id,user_id,epoch,revision,title_cipher,content_cipher,updated_at)
    SELECT ?,?,?,1,?,?,? WHERE (SELECT epoch FROM chat_history_state WHERE id=1)=?
    AND EXISTS(SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND u.id=? AND u.code_version=s.user_version AND u.disabled_at IS NULL AND u.credential_pending=0)
    AND ((?=0 AND NOT EXISTS(SELECT 1 FROM chat_conversations WHERE id=?) AND (SELECT COUNT(*) FROM chat_conversations WHERE user_id=?)<100) OR EXISTS(SELECT 1 FROM chat_conversations WHERE id=? AND user_id=? AND epoch=? AND revision=?))
    ON CONFLICT(id) DO UPDATE SET revision=chat_conversations.revision+1,title_cipher=excluded.title_cipher,content_cipher=excluded.content_cipher,updated_at=excluded.updated_at
    WHERE chat_conversations.user_id=? AND chat_conversations.epoch=? AND chat_conversations.revision=?`)
    .bind(data.id,user.id,epoch,title,cipher,now,epoch,session.hash,user.id,data.revision,data.id,user.id,data.id,user.id,epoch,data.revision,user.id,epoch,data.revision).run();
  if(!result.meta.changes)fail(409,'L’historique a changé ou sa limite de 100 conversations est atteinte. Recharge la liste avant de réessayer.');
  return json({id:data.id,epoch,revision:data.revision+1});
}
