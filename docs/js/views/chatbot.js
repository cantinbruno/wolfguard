'use strict';

const chatbotWorkspace=(()=>{
  let generation=0,messages=[],active=false,ownerKey=null,selectedModel='balanced';
  const engine=()=>window.WolfGuardBrowserAI;
  function reset(clear=false){generation++;if(active){engine()?.cancel();active=false;}if(clear){messages=[];ownerKey=null;engine()?.dispose();}}
  async function render(){
    reset();if(ownerKey!==state.vaultKey){messages=[];ownerKey=state.vaultKey;}
    const token=generation,key=state.vaultKey,root=document.createElement('section');root.className='chatbot-workspace';$('#content').replaceChildren(root);
    const live=()=>token===generation&&root.isConnected&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    root.innerHTML='<header class="security-workspace-heading"><div><span class="security-kicker">ASSISTANT INTÉGRÉ</span><h1>Chatbot IA</h1><p>Ton assistant gratuit, directement dans le navigateur.</p></div><button type="button" id="aiClear">Nouvelle conversation</button></header><section class="ai-browser-info"><div><strong>Autonome sur cet appareil</strong><p>Aucun agent à démarrer, aucun autre ordinateur à laisser allumé.</p></div><label class="ai-model-choice">Modèle intégré<select id="aiMode"><option value="balanced">Qwen 3.5 · 2B — Plus précis (1,3 Go)</option><option value="light">Qwen 3.5 · 0,8B — Léger (600 Mo)</option></select></label><button type="button" id="aiPrepare">Démarrer l’IA</button></section><details class="ai-setup"><summary>Premier démarrage et confidentialité</summary><p>Le premier démarrage télécharge le moteur et le modèle choisi (environ 1,3 Go en mode Plus précis ou 600 Mo en mode Léger) depuis Hugging Face. Utilise de préférence le Wi-Fi. Le navigateur conserve les fichiers en cache si l’espace le permet ; ils pourront être téléchargés à nouveau si ce cache est vidé.</p><p>Les réponses sont calculées sur l’appareil qui ouvre cette page. Tes messages ne sont envoyés ni à un agent ni à un service d’IA. La conversation reste en mémoire jusqu’au verrouillage. Aucun mémo, secret du coffre ou audit n’est joint automatiquement.</p><p>Ce modèle léger convient aux questions courantes. La vitesse dépend du téléphone ou de l’ordinateur ; les analyses complexes peuvent nécessiter un modèle plus puissant.</p></details><div id="aiDownload" class="ai-download" hidden><progress id="aiProgress" max="100" aria-label="Chargement du modèle"></progress><span id="aiDownloadLabel">Chargement du moteur…</span></div><div id="aiMessages" class="ai-messages" role="log" aria-label="Conversation" aria-live="polite"></div><p id="aiStatus" role="status" aria-live="polite"></p><form id="aiForm" class="ai-composer"><label for="aiPrompt">Ton message</label><textarea id="aiPrompt" rows="3" maxlength="3000" placeholder="Pose une question ou décris ton problème…" required></textarea><div><span>Vérifie les réponses et les commandes proposées avant de les utiliser.</span><button type="button" id="aiStop" hidden>Arrêter</button><button type="submit" id="aiSend">Envoyer</button></div></form>';
    const find=selector=>root.querySelector(selector),isReady=()=>engine().ready&&engine().model===selectedModel;let busy=false,partial='';find('#aiMode').value=selectedModel;find('#aiMode').onchange=event=>{if(busy)return;selectedModel=event.target.value;engine().dispose();find('#aiStatus').textContent='Le modèle choisi sera téléchargé au prochain démarrage.';draw();};
    function draw(){
      if(!live())return;
      const log=find('#aiMessages');log.replaceChildren();
      if(!messages.length){const empty=document.createElement('div');empty.className='ai-welcome';empty.innerHTML='<span aria-hidden="true">'+workspaceSectionIcon('chatbot')+'</span><h2>Comment puis-je t’aider ?</h2><p>Pose ta question. Le modèle démarre ici, sans agent.</p><div class="ai-suggestions"><button type="button">À quoi sert le DNS ?</button><button type="button">Comment vérifier mon pare-feu Windows ?</button></div>';log.append(empty);for(const button of empty.querySelectorAll('button'))button.onclick=()=>{find('#aiPrompt').value=button.textContent;find('#aiPrompt').focus();};}
      for(const message of [...messages,...(partial?[{role:'assistant',content:partial}]:[])]){
        const article=document.createElement('article');article.className='ai-message';article.dataset.role=message.role;
        const heading=document.createElement('strong');heading.textContent=message.role==='user'?'Toi':'WolfGuard IA';
        const body=document.createElement('div');body.className='ai-message-content';body.textContent=message.content;article.append(heading,body);
        if(message.role==='assistant'&&!busy){const copy=document.createElement('button');copy.type='button';copy.textContent='Copier';copy.onclick=()=>copyText(message.content);article.append(copy);}log.append(article);
      }
      find('#aiMode').disabled=busy;find('#aiSend').disabled=busy;find('#aiStop').hidden=!busy;find('#aiClear').disabled=busy;find('#aiPrepare').disabled=busy||isReady();find('#aiPrepare').textContent=isReady()?'IA prête':'Démarrer l’IA';log.scrollTop=log.scrollHeight;
    }
    function update(data){
      if(!live())return;
      if(data.type==='token'){partial=data.content;draw();return;}
      if(data.type==='generating'){find('#aiDownload').hidden=true;find('#aiStatus').textContent='Réponse en cours sur cet appareil…';return;}
      if(data.type==='status'){find('#aiStatus').textContent=data.message;return;}
      find('#aiDownload').hidden=false;
      if(data.type==='progress'&&data.file?.endsWith('.gguf')){
        find('#aiProgress').value=Math.min(100,Number(data.progress)||0);
        find('#aiDownloadLabel').textContent='Téléchargement du modèle · '+Math.round(data.loaded/1048576)+' / '+Math.round(data.total/1048576)+' Mo';
        if(data.progress>=100)find('#aiStatus').textContent='Préparation du modèle…';
      }else find('#aiStatus').textContent='Chargement du moteur et du modèle…';
    }
    function errorMessage(error){
      if(error.name==='AbortError')return 'Génération arrêtée.';
      if(/Conversation trop longue|réponse vide/i.test(error.message))return error.message;
      if(/context|n_ctx|token.*limit/i.test(error.message))return 'Cette conversation est trop longue. Démarre une nouvelle conversation.';
      if(/memory|allocation|ArrayBuffer|out of bounds/i.test(error.message))return 'La mémoire disponible ne suffit pas. Choisis le modèle Léger et ferme les autres onglets.';
      if(/fetch|network|download|HTTP|load file/i.test(error.message))return 'Le modèle n’a pas pu être téléchargé. Vérifie ta connexion et l’espace disponible, puis réessaie.';
      return 'L’IA ne peut pas démarrer. Essaie le modèle Léger ou un navigateur plus récent.';
    }
    find('#aiClear').onclick=()=>{messages=[];partial='';find('#aiStatus').textContent='Nouvelle conversation.';draw();find('#aiPrompt').focus();};
    find('#aiStop').onclick=()=>engine().cancel();
    find('#aiPrepare').onclick=async()=>{
      if(busy)return;busy=true;active=true;draw();find('#aiStatus').textContent='Chargement du modèle sur cet appareil…';
      try{await engine().prepare(update,selectedModel);if(live())find('#aiStatus').textContent='IA prête sur cet appareil.';}
      catch(error){if(live())find('#aiStatus').textContent=errorMessage(error);}
      finally{if(live()){active=false;busy=false;find('#aiDownload').hidden=true;draw();}}
    };
    find('#aiForm').onsubmit=async event=>{
      event.preventDefault();if(busy||!live())return;
      const content=find('#aiPrompt').value.trim();if(!content)return;
      if(messages.length>=14||messages.reduce((sum,message)=>sum+message.content.length,0)+content.length>10000){find('#aiStatus').textContent='Cette conversation est longue. Démarre une nouvelle conversation.';return;}
      busy=true;active=true;partial='';messages.push({role:'user',content});find('#aiPrompt').value='';draw();find('#aiStatus').textContent=isReady()?'Réponse en cours sur cet appareil…':'Premier démarrage : chargement du modèle…';let completed=false;
      try{const result=await engine().generate(messages,update,selectedModel);if(!live())return;partial='';messages.push({role:'assistant',content:result.content});completed=true;find('#aiStatus').textContent='Réponse calculée sur cet appareil.';}
      catch(error){if(live()){if(partial){messages.push({role:'assistant',content:partial});completed=true;partial='';}find('#aiStatus').textContent=errorMessage(error);}}
      finally{if(live()){if(!completed){messages.pop();find('#aiPrompt').value=content;}active=false;busy=false;find('#aiDownload').hidden=true;draw();}}
    };
    find('#aiPrompt').onkeydown=event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();find('#aiForm').requestSubmit();}};
    find('#aiStatus').textContent=isReady()?'IA prête sur cet appareil.':'Prêt. Le modèle sera téléchargé au premier démarrage.';draw();
  }
  return {render,reset};
})();
