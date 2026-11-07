'use strict';
window.WolfGuardChatAPI=(()=>{
  let active=null;
  function cancel(){active?.abort();active=null;}
  async function generate(messages,onUpdate){
    if(active)throw new Error('Une réponse est déjà en cours.');
    const controller=new AbortController();active=controller;
    try{return await WolfGuardCloud.chatCompletion(messages,{signal:controller.signal,onToken:onUpdate});}
    finally{if(active===controller)active=null;}
  }
  return Object.freeze({generate,cancel,dispose:cancel});
})();
