'use strict';

const chatbotWorkspace=(()=>{
  let generation=0,messages=[],active=false,ownerKey=null,conversation=null,epoch=null,items=[],timer=0;
  const engine=()=>window.WolfGuardBrowserAI;
  function reset(clear=false){generation++;clearTimeout(timer);if(active){engine()?.cancel();active=false;if(messages.at(-1)?.role==='user')messages.pop();}if(clear){messages=[];ownerKey=null;conversation=null;epoch=null;items=[];engine()?.dispose();}}
  async function render(){
    reset();if(ownerKey!==state.vaultKey){messages=[];conversation=null;epoch=null;items=[];ownerKey=state.vaultKey;}
    const token=generation,key=state.vaultKey,root=document.createElement('section');root.className='chatbot-workspace';$('#content').replaceChildren(root);
    const live=()=>token===generation&&root.isConnected&&state.vaultKey===key;
    root.innerHTML='<header class="security-workspace-heading"><div><span class="security-kicker">ASSISTANT INTÉGRÉ</span><h1>Chatbot IA</h1><p>Ton assistant gratuit, directement dans le navigateur.</p></div><button type="button" id="aiClear">Nouvelle conversation</button></header><div class="ai-layout"><aside class="ai-history" aria-label="Historique personnel"><h2>Mes conversations</h2><p id="aiHistoryStatus" role="status"></p><div id="aiHistoryList"></div><button type="button" id="aiDelete" disabled>Supprimer cette conversation</button><button type="button" id="aiPurge" class="ai-danger" hidden>Effacer tous les historiques</button></aside><div class="ai-chat-pane"><section class="ai-browser-info"><div><strong>Autonome sur cet appareil</strong><p>Aucun agent à démarrer, aucun autre ordinateur à laisser allumé.</p></div><span class="ai-model-name">Qwen 3.5 · 2B</span><button type="button" id="aiPrepare">Démarrer l’IA</button></section><details class="ai-setup"><summary>Premier démarrage et confidentialité</summary><p>Le premier démarrage télécharge le moteur et le modèle Qwen 3.5 · 2B (environ 1,3 Go) depuis Hugging Face. Utilise de préférence le Wi-Fi. Le navigateur conserve les fichiers en cache si l’espace le permet ; ils pourront être téléchargés à nouveau si ce cache est vidé.</p><p>Les réponses sont calculées sur l’appareil qui ouvre cette page. Tes messages ne sont envoyés ni à un agent ni à un service d’IA. Les conversations sont enregistrées dans ton historique personnel, chiffré sur le serveur WolfGuard. L’administrateur peut supprimer tous les historiques. Sans connexion à un compte, elles restent en mémoire jusqu’au verrouillage. Aucun mémo, secret du coffre ou audit n’est joint automatiquement.</p><p>Ce modèle léger convient aux questions courantes. La vitesse dépend du téléphone ou de l’ordinateur ; les analyses complexes peuvent nécessiter un modèle plus puissant.</p></details><div id="aiDownload" class="ai-download" hidden><progress id="aiProgress" max="100" aria-label="Chargement du modèle"></progress><span id="aiDownloadLabel">Chargement du moteur…</span></div><div id="aiMessages" class="ai-messages" role="log" aria-label="Conversation" aria-live="polite"></div><p id="aiStatus" role="status" aria-live="polite"></p><form id="aiForm" class="ai-composer"><label for="aiPrompt">Ton message</label><textarea id="aiPrompt" rows="3" maxlength="3000" placeholder="Pose une question ou décris ton problème…" required></textarea><div><span>Vérifie les réponses et les commandes proposées avant de les utiliser.</span><button type="button" id="aiStop" hidden>Arrêter</button><button type="submit" id="aiSend">Envoyer</button></div></form></div></div>';
    const find=selector=>root.querySelector(selector),isReady=()=>engine().ready;
    const cloud=typeof WolfGuardCloud==='undefined'?null:WolfGuardCloud,account=cloud?.enabled&&cloud.currentUser()?.id,remote=!!account;
    let busy=false,partial='',operation=0,historyBusy=false,historyReady=!remote;
    const newId=()=>crypto.randomUUID().replaceAll('-','');
    const status=text=>{if(live())find('#aiStatus').textContent=text;};
    function clearConversation(){messages=[];conversation=null;partial='';}
    function drawHistory(){
      const list=find('#aiHistoryList');list.replaceChildren();
      for(const item of items){const button=document.createElement('button');button.type='button';button.textContent=item.title;button.dataset.conversation=item.id;button.setAttribute('aria-pressed',String(conversation?.id===item.id));button.disabled=busy||historyBusy;button.onclick=()=>openConversation(item.id);list.append(button);}
      find('#aiDelete').disabled=!remote||!conversation?.revision||busy||historyBusy;
      find('#aiPurge').hidden=!remote||cloud.currentUser()?.role!=='admin';find('#aiPurge').disabled=busy||historyBusy;
      find('#aiClear').disabled=busy||historyBusy;
    }
    async function refreshHistory(){
      if(!remote||!live())return;
      const result=await cloud.chatHistory();if(!live())return;
      if(epoch!==null&&epoch!==result.epoch){operation++;if(active)engine().cancel();active=false;busy=false;clearConversation();status('Les historiques ont été effacés par l’administrateur.');}
      epoch=result.epoch;items=result.conversations;historyReady=true;
      if(conversation?.revision&&!items.some(item=>item.id===conversation.id)){operation++;if(active)engine().cancel();active=false;busy=false;clearConversation();}
      find('#aiHistoryStatus').textContent=items.length?items.length+' conversation(s) · privées à ton compte':'Aucune conversation enregistrée.';draw();
    }
    async function openConversation(id){
      if(busy||historyBusy||!live())return;historyBusy=true;drawHistory();
      try{const result=await cloud.chatHistory('?id='+id);if(!live())return;
        if(epoch!==result.epoch){clearConversation();await refreshHistory();return;}
        conversation={id:result.id,revision:result.revision};messages=result.messages;partial='';status('Conversation retrouvée.');draw();
      }catch(error){if(live()){status(error.message);await refreshHistory().catch(()=>{});}}
      finally{if(live()){historyBusy=false;drawHistory();}}
    }
    async function saveConversation(){
      if(!remote)return;
      if(!conversation)conversation={id:newId(),revision:0};
      const data={id:conversation.id,revision:conversation.revision,epoch,messages:messages.map(message=>({...message}))};
      const saved=await cloud.chatHistory('/save',data);if(!live())return;
      conversation={id:saved.id,revision:saved.revision};await refreshHistory();
    }
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
      drawHistory();find('#aiSend').disabled=busy||historyBusy||!historyReady;find('#aiStop').hidden=!busy;find('#aiClear').disabled=busy||historyBusy;find('#aiPrepare').disabled=busy||isReady();find('#aiPrepare').textContent=isReady()?'IA prête':busy?'Chargement…':'Réessayer le chargement';log.scrollTop=log.scrollHeight;
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
      if(/memory|allocation|ArrayBuffer|out of bounds/i.test(error.message))return 'La mémoire disponible ne suffit pas. Ferme les autres onglets et réessaie sur un appareil disposant de plus de mémoire.';
      if(/fetch|network|download|HTTP|load file/i.test(error.message))return 'Le modèle n’a pas pu être téléchargé. Vérifie ta connexion et l’espace disponible, puis réessaie.';
      return 'L’IA ne peut pas démarrer. Recharge la page ou essaie un navigateur plus récent.';
    }
    find('#aiClear').onclick=()=>{clearConversation();status('Nouvelle conversation.');draw();find('#aiPrompt').focus();};
    find('#aiDelete').onclick=async()=>{
      if(!conversation?.revision||busy||historyBusy)return;
      if(!await appConfirm('Supprimer cette conversation de ton historique ?', {title:'Supprimer la conversation',confirmLabel:'Supprimer'}))return;
      if(!live())return;historyBusy=true;drawHistory();
      try{await cloud.chatHistory('/delete',{id:conversation.id,revision:conversation.revision,epoch});if(!live())return;clearConversation();await refreshHistory();status('Conversation supprimée.');}
      catch(error){status(error.message);await refreshHistory().catch(()=>{});}finally{if(live()){historyBusy=false;drawHistory();}}
    };
    find('#aiPurge').onclick=async()=>{
      if(busy||historyBusy)return;
      if(!await appConfirm('Supprimer définitivement les conversations de tous les utilisateurs ? Cette action efface aussi ton propre historique.',{title:'Effacer tous les historiques',confirmLabel:'Tout supprimer'}))return;
      if(!live())return;historyBusy=true;drawHistory();
      try{await cloud.chatHistory('/purge',{confirm:'DELETE_ALL_CHAT_HISTORY'});if(!live())return;clearConversation();await refreshHistory();status('Tous les historiques ont été supprimés.');}
      catch(error){status(error.message);}finally{if(live()){historyBusy=false;drawHistory();}}
    };
    find('#aiStop').onclick=()=>engine().cancel();
    async function prepare(){
      if(busy||!live()||isReady())return;const run=++operation;busy=true;active=true;draw();status('Chargement du modèle sur cet appareil…');
      try{await engine().prepare(data=>{if(run===operation)update(data);});if(live()&&run===operation)status('IA prête sur cet appareil.');}
      catch(error){if(live()&&run===operation)status(errorMessage(error));}
      finally{if(live()&&run===operation){active=false;busy=false;find('#aiDownload').hidden=true;draw();}}
    }
    find('#aiPrepare').onclick=prepare;
    find('#aiForm').onsubmit=async event=>{
      event.preventDefault();if(busy||historyBusy||!live())return;
      const content=find('#aiPrompt').value.trim();if(!content)return;
      if(remote){historyBusy=true;drawHistory();try{await refreshHistory();}catch(error){status('Historique indisponible : '+error.message);return;}finally{historyBusy=false;if(live())drawHistory();}if(!live()||!historyReady)return;}
      if(messages.length>=14||messages.reduce((sum,message)=>sum+message.content.length,0)+content.length>10000){status('Cette conversation est longue. Démarre une nouvelle conversation.');return;}
      const run=++operation,current=()=>live()&&run===operation;
      busy=true;active=true;partial='';messages.push({role:'user',content});find('#aiPrompt').value='';draw();status(isReady()?'Réponse en cours sur cet appareil…':'Chargement du modèle…');let completed=false;
      try{const result=await engine().generate(messages,data=>{if(current())update(data);});if(!current())return;partial='';messages.push({role:'assistant',content:result.content});completed=true;status('Réponse calculée sur cet appareil.');}
      catch(error){if(current()){if(partial){messages.push({role:'assistant',content:partial});completed=true;partial='';}status(errorMessage(error));}}
      finally{if(current()){
        if(!completed){messages.pop();find('#aiPrompt').value=content;}
        else if(remote){try{await saveConversation();if(current())status('Conversation enregistrée dans ton historique personnel.');}catch(error){if(current()){status('Réponse conservée à l’écran, mais historique non enregistré : '+error.message);await refreshHistory().catch(()=>{});}}}
        if(current()){active=false;busy=false;find('#aiDownload').hidden=true;draw();}
      }}
    };
    find('#aiPrompt').onkeydown=event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();find('#aiForm').requestSubmit();}};
    async function poll(){if(!live())return;try{await refreshHistory();}catch{}if(live())timer=setTimeout(poll,15000);}
    find('#aiHistoryStatus').textContent=remote?'Chargement de ton historique…':'Connecte-toi à ton compte pour conserver ton historique.';
    status(isReady()?'IA prête sur cet appareil.':'Chargement automatique du modèle…');draw();
    if(remote){try{await refreshHistory();}catch(error){if(live())find('#aiHistoryStatus').textContent=error.message;}if(live())timer=setTimeout(poll,15000);}
    if(live())prepare();
  }
  return {render,reset};
})();
