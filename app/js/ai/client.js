'use strict';
window.WolfGuardBrowserAI=(()=>{
  let worker=null,pending=null,sequence=0,ready=false;
  function dispose(){worker?.terminate();worker=null;ready=false;const task=pending;pending=null;if(task){clearTimeout(task.timeout);task.reject(new DOMException('Génération arrêtée.','AbortError'));}}
  function create(){
    if(worker)return worker;
    if(!('Worker' in window)||typeof WebAssembly!=='object')throw new Error('Ce navigateur ne permet pas le calcul IA. Utilise un navigateur récent.');
    const scriptURL=new URL(document.querySelector('script[src*="js/ai/client.js"]').src),workerURL=new URL('worker.js',scriptURL);workerURL.search=scriptURL.search;
    worker=new Worker(workerURL,{type:'module',name:'wolfguard-browser-ai'});const current=worker;
    worker.onmessage=({data})=>{
      const task=pending;if(!task||data.id!==task.id)return;
      if(data.type==='ready'||data.type==='complete'){ready=true;clearTimeout(task.timeout);pending=null;task.resolve(data);}
      else if(data.type==='error'){clearTimeout(task.timeout);pending=null;task.reject(new Error(data.message));}
      else task.onUpdate(data);
    };
    worker.onerror=event=>{event.preventDefault();if(worker!==current)return;const task=pending;pending=null;if(task){clearTimeout(task.timeout);task.reject(new Error('Le moteur IA ne peut pas démarrer. Recharge la page ou essaie un navigateur récent.'));}dispose();};
    return worker;
  }
  function run(type,messages,onUpdate=()=>{}){
    if(pending)return Promise.reject(new Error('Une réponse est déjà en cours.'));
    return new Promise((resolve,reject)=>{
      try{const current=create(),id=++sequence,timeout=setTimeout(()=>dispose(),900000);pending={id,resolve,reject,onUpdate,timeout};current.postMessage({id,type,messages});}
      catch(error){reject(error);}
    });
  }
  return Object.freeze({prepare:onUpdate=>run('load',null,onUpdate),generate:(messages,onUpdate)=>run('generate',messages,onUpdate),cancel:dispose,dispose,get ready(){return ready;}});
})();
