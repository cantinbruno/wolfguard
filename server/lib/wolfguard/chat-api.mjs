import {seal,open} from './access.mjs';
import {requirePermission} from './permissions.mjs';

// One provider and one model for the whole site. Never accept an upstream URL,
// model, system prompt or credentials from a completion request.
export const CHAT_MODEL='openai/gpt-oss-120b';
const ENDPOINT='https://api.groq.com/openai/v1/chat/completions';
const CONTEXT='WolfGuard chat API key v1';
const SYSTEM='Tu es WolfGuard IA, un assistant utile, précis et concis. Réponds dans la langue de la personne. Explique clairement les étapes utiles. Indique tes incertitudes. Tu ne peux ni voir le coffre, les postes ou les audits, ni exécuter des actions. Ne prétends jamais y avoir accès. Aucun outil ni recherche web ne sont disponibles.';
const encoder=new TextEncoder();
const event=value=>encoder.encode('data: '+JSON.stringify(value)+'\n\n');
const fetcher=env=>env.LOCAL_TEST_ORIGIN&&typeof env.CHAT_TEST_FETCH==='function'?env.CHAT_TEST_FETCH:fetch;
const publicSettings=row=>({configured:!!row?.key_cipher,provider:'Groq',model:CHAT_MODEL,revision:row?.revision||0});

export function chatMessages(value,fail){
  if(!Array.isArray(value)||!value.length||value.length>15||value.length%2!==1||value.some((m,i)=>!m||m.role!==(i%2?'assistant':'user')||typeof m.content!=='string'||!m.content.trim()||m.content.length>(i%2?12000:3000))||value.reduce((n,m)=>n+m.content.length,0)>12000)fail(400,'Conversation invalide ou trop longue. Démarre une nouvelle conversation.');
  return value.map(({role,content})=>({role,content}));
}

async function upstream(env,key,messages,signal,stream=true){
  return fetcher(env)(ENDPOINT,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:CHAT_MODEL,messages:[{role:'system',content:SYSTEM},...messages],stream,max_completion_tokens:stream?2048:128,reasoning_effort:'low',include_reasoning:false}),redirect:'error',signal});
}
async function checkResponse(response,fail){
  if(response.ok)return;
  await response.body?.cancel();
  if(response.status===401||response.status===403)fail(502,'La clé API Groq est refusée. Demande à l’administrateur de la vérifier.');
  if(response.status===429)fail(429,'Le quota de l’API IA est atteint. Réessaie plus tard.',{retryAfter:Math.max(1,Math.min(86400,Number(response.headers.get('Retry-After'))||60))});
  if(response.status===400||response.status===404)fail(502,'Le modèle IA est indisponible pour cette clé Groq. Vérifie ses autorisations.');
  fail(502,'Le service IA est temporairement indisponible. Réessaie.');
}

// Parse SSE across arbitrary UTF-8/network boundaries, with bounded buffering.
export async function* providerEvents(body){
  const reader=body.getReader(),decoder=new TextDecoder();let buffer='';
  try{
    while(true){
      const {done,value}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});
      if(buffer.length>262144)throw new Error('Invalid API stream');
      let index;while((index=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,index).replace(/\r$/,'');buffer=buffer.slice(index+1);if(line.startsWith('data:')){const data=line.slice(5).trim();if(data==='[DONE]')return;if(data)yield JSON.parse(data);}}
      if(done){if(buffer.trim())throw new Error('Incomplete API stream');return;}
    }
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}

export async function handleChatAPI(request,env,now,session,{fail,json,body}){
  const user=session.user,path=new URL(request.url).pathname;
  if(!user?.id)fail(403,'Connecte-toi à ton compte pour utiliser le chatbot.');
  requirePermission(user,'tools.write',fail,now);
  const settings=await env.DB.prepare('SELECT * FROM chat_api_config WHERE id=1').first();
  if(path==='/api/chat/settings'){
    if(request.method==='GET')return json(publicSettings(settings));
    if(request.method!=='POST')fail(405,'Méthode inconnue.');
    if(user.role!=='admin')fail(403,'Seul l’administrateur peut configurer l’API IA.');
    const data=await body();if(!Number.isSafeInteger(data.revision)||data.revision!==settings.revision)fail(409,'La configuration a changé. Recharge la page.');
    let cipher=null;
    if(data.remove!==true){
      const key=typeof data.key==='string'?data.key.trim():'';
      if(!/^[A-Za-z0-9_-]{20,256}$/.test(key))fail(400,'Saisis une clé API Groq valide.');
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
      try{const response=await upstream(env,key,[{role:'user',content:'Réponds uniquement OK.'}],controller.signal,false);await checkResponse(response,fail);const result=await response.json();if(!result.choices?.[0]?.message?.content?.trim())fail(502,'L’API n’a pas renvoyé de réponse. La clé n’a pas été enregistrée.');}
      catch(error){if(error.status)throw error;fail(502,'Impossible de tester l’API Groq. La clé n’a pas été enregistrée.');}
      finally{clearTimeout(timeout);}
      cipher=await seal(key,CONTEXT,env);
    }
    const result=await env.DB.prepare('UPDATE chat_api_config SET key_cipher=?,revision=revision+1 WHERE id=1 AND revision=?').bind(cipher,data.revision).run();
    if(!result.meta.changes)fail(409,'La configuration a changé. Recharge la page.');
    return json(publicSettings({key_cipher:cipher,revision:data.revision+1}));
  }
  if(path!=='/api/chat/completions'||request.method!=='POST')fail(404,'Adresse inconnue.');
  const data=await body(),messages=chatMessages(data.messages,fail);
  if(!settings?.key_cipher)fail(503,'L’administrateur doit configurer la clé API dans le chatbot.');
  const epoch=(await env.DB.prepare('SELECT epoch FROM chat_history_state WHERE id=1').first()).epoch,lease=crypto.randomUUID();
  // Persisted admission prevents concurrent requests across Worker isolates.
  const admitted=await env.DB.prepare(`INSERT INTO chat_api_usage(user_id,window_start,requests,lease,lease_until) VALUES(?,?,1,?,?)
    ON CONFLICT(user_id) DO UPDATE SET window_start=CASE WHEN chat_api_usage.window_start<=? THEN excluded.window_start ELSE chat_api_usage.window_start END,
    requests=CASE WHEN chat_api_usage.window_start<=? THEN 1 ELSE chat_api_usage.requests+1 END,lease=excluded.lease,lease_until=excluded.lease_until
    WHERE chat_api_usage.lease_until<=? AND (chat_api_usage.window_start<=? OR chat_api_usage.requests<10)`)
    .bind(user.id,now,lease,now+100000,now-60000,now-60000,now,now-60000).run();
  if(!admitted.meta.changes)fail(429,'Une réponse est déjà en cours ou trop de demandes ont été envoyées. Patiente avant de réessayer.',{retryAfter:10});
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),90000),abort=()=>controller.abort();
  request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort();
  let cleaned=false;
  async function cleanup(){if(cleaned)return;cleaned=true;clearTimeout(timeout);request.signal.removeEventListener('abort',abort);controller.abort();await env.DB.prepare('UPDATE chat_api_usage SET lease_until=0 WHERE user_id=? AND lease=?').bind(user.id,lease).run();}
  let response;
  try{response=await upstream(env,await open(settings.key_cipher,CONTEXT,env),messages,controller.signal);await checkResponse(response,fail);if(!response.body||!response.headers.get('Content-Type')?.includes('text/event-stream'))fail(502,'Réponse du service IA invalide.');}
  catch(error){await cleanup();if(error.status)throw error;fail(502,'Connexion à l’API IA impossible. Réessaie.');}
  async function* stream(){
    let length=0,finished=false,truncated=false,lastCheck=0;
    try{
      for await(const item of providerEvents(response.body)){
        if(Date.now()-lastCheck>=1000){lastCheck=Date.now();if((await env.DB.prepare('SELECT epoch FROM chat_history_state WHERE id=1').first()).epoch!==epoch)throw new Error('History purged');}
        if(item.error)throw new Error('Provider error');
        const choice=item.choices?.[0],content=choice?.delta?.content;
        if(typeof content==='string'&&content){const text=content.slice(0,12000-length);length+=text.length;if(text)yield event({type:'token',content:text});if(length>=12000){finished=true;truncated=true;break;}}
        if(choice?.finish_reason){finished=true;truncated=choice.finish_reason==='length';}
      }
      if(!finished||!length)throw new Error('Incomplete answer');
      yield event({type:'done',truncated});
    }catch{if(!request.signal.aborted)yield event({type:'error',message:controller.signal.aborted?'Le service IA a mis trop de temps à répondre. Réessaie.':'La réponse a été interrompue. Réessaie.'});}
    finally{await cleanup();}
  }
  const iterator=stream();
  return new Response(new ReadableStream({async pull(target){try{const next=await iterator.next();if(next.done)target.close();else target.enqueue(next.value);}catch(error){await cleanup();target.error(error);}},async cancel(){await cleanup();await iterator.return();}}),{headers:{'Content-Type':'text/event-stream; charset=utf-8','X-Accel-Buffering':'no'}});
}
