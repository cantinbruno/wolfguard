import {Wllama} from '../../vendor/browser-ai/wllama.js';

const MODEL_URL='https://huggingface.co/unsloth/Qwen3.5-2B-GGUF/resolve/f6d5376be1edb4d416d56da11e5397a961aca8ae/Qwen3.5-2B-Q4_K_M.gguf';
const nativeFetch=globalThis.fetch.bind(globalThis);
// Only public model/runtime GETs can leave this worker. Conversation text is
// passed to the local Wasm engine; the worker has no session or vault key.
globalThis.fetch=(input,options={})=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,self.location.href);
  const method=options.method||(input instanceof Request?input.method:'GET');
  const local=url.origin===self.location.origin&&url.pathname.includes('/vendor/browser-ai/');
  if(!['GET','HEAD'].includes(method.toUpperCase())||options.body||!local&&url.href!==MODEL_URL)throw new Error('Adresse de téléchargement du modèle refusée.');
  return nativeFetch(input,{...options,credentials:'omit',referrerPolicy:'no-referrer'});
};
let model=null,busy=false;
async function load(id){
  if(model)return;
  const instance=new Wllama({default:new URL('../../vendor/browser-ai/wllama.wasm',self.location.href).href},{allowOffline:true,logger:{debug(){},log(){},warn(){},error(){}}});
  await instance.loadModelFromUrl(MODEL_URL,{n_ctx:2048,n_threads:1,n_gpu_layers:0,n_parallel:1,n_batch:128,n_ubatch:128,progressCallback:({loaded,total})=>self.postMessage({id,type:'progress',file:'model.gguf',loaded,total,progress:100*loaded/total})});
  model=instance;
}
self.onmessage=async({data})=>{
  if(busy)return;const {id,type}=data||{};if(!Number.isSafeInteger(id)||!['load','generate'].includes(type))return;busy=true;
  try{
    if(type==='generate'&&(!Array.isArray(data.messages)||!data.messages.length||data.messages.length>16||data.messages.some((message,index)=>message.role!==(index%2?'assistant':'user')||typeof message.content!=='string'||!message.content.trim()||message.content.length>6000)||data.messages.at(-1).role!=='user'||data.messages.reduce((sum,message)=>sum+message.content.length,0)>10000))throw new Error('Conversation trop longue. Démarre une nouvelle conversation.');
    self.postMessage({id,type:'loading'});await load(id);
    if(type==='load'){self.postMessage({id,type:'ready',device:'wasm'});return;}
    self.postMessage({id,type:'generating',device:'wasm'});
    const stream=await model.createChatCompletion({messages:[{role:'system',content:'Tu es l’assistant informatique WolfGuard. Aide à comprendre les systèmes, les réseaux informatiques et la cybersécurité. Réponds en français avec des faits précis et des explications simples. Si tu ne connais pas la réponse, dis-le sans inventer. Tu ne peux exécuter aucune action sur un ordinateur.'},...data.messages],max_tokens:384,temperature:0.2,chat_template_kwargs:{enable_thinking:false},stream:true});
    let content='',lastUpdate=0;
    for await(const chunk of stream){content+=chunk.choices[0]?.delta?.content||'';if(performance.now()-lastUpdate>70){lastUpdate=performance.now();self.postMessage({id,type:'token',content});}}
    if(!content.trim())throw new Error('Le modèle a renvoyé une réponse vide. Reformule ta question.');
    self.postMessage({id,type:'complete',content:content.trim().slice(0,12000),device:'wasm'});
  }catch(error){self.postMessage({id,type:'error',message:String(error.message||'Le modèle ne peut pas démarrer sur cet appareil.').slice(0,450)});}
  finally{busy=false;}
};
