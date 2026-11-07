// Shared input validation has no storage or server dependencies.
export function chatInput(value){
  if(!value||typeof value.model!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,119}$/.test(value.model)||/cloud/i.test(value.model))throw new Error('Choisis un modèle local Ollama.');
  if(!Array.isArray(value.messages)||!value.messages.length||value.messages.length>24)throw new Error('La conversation doit contenir entre 1 et 24 messages.');
  let size=0;const messages=value.messages.map((message,index)=>{
    if(!message||message.role!==(index%2?'assistant':'user')||typeof message.content!=='string'||!message.content.trim()||message.content.length>(message.role==='assistant'?20000:12000))throw new Error('Message invalide ou trop long.');
    size+=message.content.length;return {role:message.role,content:message.content};
  });
  if(size>48000||messages.at(-1).role!=='user')throw new Error('Conversation trop longue. Démarre une nouvelle conversation.');
  return {model:value.model,messages};
}
