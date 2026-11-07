'use strict';

const chatbotWorkspace=(()=>{
  let generation=0,messages=[],active=false,ownerKey=null,conversation=null,epoch=null,items=[],timer=0;
  const engine=()=>window.WolfGuardChatAPI;
  function reset(clear=false){generation++;clearTimeout(timer);if(active){engine()?.cancel();active=false;if(messages.at(-1)?.role==='user')messages.pop();}if(clear){messages=[];ownerKey=null;conversation=null;epoch=null;items=[];engine()?.dispose();}}
  async function render(){
    reset();if(ownerKey!==state.vaultKey){messages=[];conversation=null;epoch=null;items=[];ownerKey=state.vaultKey;}
    const token=generation,key=state.vaultKey,root=document.createElement('section');root.className='chatbot-workspace';$('#content').replaceChildren(root);
    const live=()=>token===generation&&root.isConnected&&state.vaultKey===key;
    root.innerHTML='<header class="security-workspace-heading"><div><span class="security-kicker">ASSISTANT INTÉGRÉ</span><h1>Chatbot IA</h1><p>Des réponses en direct, avec une API IA rapide.</p></div><button type="button" id="aiClear">Nouvelle conversation</button></header><div class="ai-layout"><aside class="ai-history" aria-label="Historique personnel"><h2>Mes conversations</h2><p id="aiHistoryStatus" role="status"></p><div id="aiHistoryList"></div><button type="button" id="aiDelete" disabled>Supprimer cette conversation</button><button type="button" id="aiPurge" class="ai-danger" hidden>Effacer tous les historiques</button></aside><div class="ai-chat-pane"><section class="ai-api-info"><div><strong>Assistant connecté</strong><p>Aucun modèle à télécharger. Aucun agent à démarrer.</p></div><span class="ai-model-name">GPT-OSS 120B · Groq</span></section><details id="aiConfig" class="ai-setup" hidden><summary>Configurer l’API IA</summary><form id="aiConfigForm" class="ai-config-form"><p>Crée une clé dans <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Groq Console</a>, puis saisis-la ici. Elle sera testée et conservée chiffrée côté serveur. L’offre gratuite comporte des quotas.</p><label for="aiApiKey">Clé API Groq</label><input id="aiApiKey" type="password" autocomplete="off" maxlength="256" placeholder="gsk_…" required><div><button id="aiConfigSave" type="submit">Tester et enregistrer</button><button id="aiConfigRemove" type="button" hidden>Retirer la clé</button></div><p id="aiConfigStatus" role="status"></p></form></details><details class="ai-setup"><summary>Confidentialité et historique</summary><p>Les messages de la conversation ouverte sont transmis à Groq pour générer la réponse. Aucun mémo, secret du coffre ou audit n’est joint automatiquement. Tes conversations sont enregistrées dans ton historique personnel, chiffré sur le serveur WolfGuard. L’administrateur peut supprimer tous les historiques.</p></details><div id="aiMessages" class="ai-messages" role="log" aria-label="Conversation" aria-live="polite"></div><p id="aiStatus" role="status" aria-live="polite"></p><form id="aiForm" class="ai-composer"><label for="aiPrompt">Ton message</label><textarea id="aiPrompt" rows="3" maxlength="3000" placeholder="Pose une question ou décris ton problème…" required></textarea><div><span>Vérifie les réponses et les commandes proposées avant de les utiliser.</span><button type="button" id="aiStop" hidden>Arrêter</button><button type="submit" id="aiSend">Envoyer</button></div></form></div></div>';
    const find=selector=>root.querySelector(selector);
    const cloud=typeof WolfGuardCloud==='undefined'?null:WolfGuardCloud,account=cloud?.enabled&&cloud.currentUser()?.id,remote=!!account;
    let busy=false,partial='',operation=0,historyBusy=false,historyReady=!remote,settings=null,configBusy=false,frame=0;
    const isReady=()=>remote&&settings?.configured;
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
      if(!messages.length){const empty=document.createElement('div');empty.className='ai-welcome';empty.innerHTML='<span aria-hidden="true">'+workspaceSectionIcon('chatbot')+'</span><h2>Comment puis-je t’aider ?</h2><p>Pose ta question. Écris ton message pour obtenir une réponse en direct.</p><div class="ai-suggestions"><button type="button">À quoi sert le DNS ?</button><button type="button">Comment vérifier mon pare-feu Windows ?</button></div>';log.append(empty);for(const button of empty.querySelectorAll('button'))button.onclick=()=>{find('#aiPrompt').value=button.textContent;find('#aiPrompt').focus();};}
      for(const message of [...messages,...(partial?[{role:'assistant',content:partial}]:[])]){
        const article=document.createElement('article');article.className='ai-message';article.dataset.role=message.role;
        const heading=document.createElement('strong');heading.textContent=message.role==='user'?'Toi':'WolfGuard IA';
        const body=document.createElement('div');body.className='ai-message-content';body.textContent=message.content;article.append(heading,body);
        if(message.role==='assistant'&&!busy){const copy=document.createElement('button');copy.type='button';copy.textContent='Copier';copy.onclick=()=>copyText(message.content);article.append(copy);}log.append(article);
      }
      if(partial&&busy)log.lastElementChild.dataset.streaming='true';
      drawHistory();find('#aiSend').disabled=busy||historyBusy||!historyReady||!isReady();find('#aiStop').hidden=!busy;find('#aiClear').disabled=busy||historyBusy;log.scrollTop=log.scrollHeight;
    }
    function update(data){
      if(!live()||data.type!=='token')return;
      partial=data.content;
      if(frame)return;frame=requestAnimationFrame(()=>{frame=0;if(!live()||!busy)return;
        const log=find('#aiMessages');let article=log.querySelector('[data-streaming]');
        if(!article){article=document.createElement('article');article.className='ai-message';article.dataset.role='assistant';article.dataset.streaming='true';const title=document.createElement('strong');title.textContent='WolfGuard IA';const body=document.createElement('div');body.className='ai-message-content';article.append(title,body);log.append(article);}
        article.querySelector('.ai-message-content').textContent=partial;log.scrollTop=log.scrollHeight;
      });
    }
    function errorMessage(error){return error.name==='AbortError'?'Réponse arrêtée.':error.message||'Le service IA est indisponible. Réessaie.';}
    async function loadSettings(){
      if(!remote){status('Connecte-toi à ton compte pour utiliser le chatbot.');return;}
      settings=await cloud.chatSettings();if(!live())return;
      const admin=cloud.currentUser()?.role==='admin';find('#aiConfig').hidden=!admin;find('#aiConfigRemove').hidden=!settings.configured;
      if(!settings.configured&&admin)find('#aiConfig').open=true;
      status(settings.configured?'API IA prête.':'L’administrateur doit configurer la clé API pour activer le chatbot.');draw();
    }
    find('#aiConfigForm').onsubmit=async event=>{
      event.preventDefault();if(configBusy||busy||!settings)return;configBusy=true;find('#aiConfigSave').disabled=true;find('#aiConfigStatus').textContent='Test de la connexion à Groq…';
      const input=find('#aiApiKey'),apiKey=input.value;input.value='';
      try{settings=await cloud.chatSettings({key:apiKey,revision:settings.revision});if(!live())return;find('#aiConfigStatus').textContent='Connexion vérifiée. API IA activée pour tous les utilisateurs.';find('#aiConfigRemove').hidden=false;status('API IA prête.');draw();}
      catch(error){if(live())find('#aiConfigStatus').textContent=error.message;}
      finally{configBusy=false;if(live())find('#aiConfigSave').disabled=false;}
    };
    find('#aiConfigRemove').onclick=async()=>{
      if(configBusy||busy||!settings)return;
      if(!await appConfirm('Désactiver l’API IA pour tous les utilisateurs ?', {title:'Retirer la clé API',confirmLabel:'Retirer'}))return;
      if(!live())return;configBusy=true;
      try{settings=await cloud.chatSettings({remove:true,revision:settings.revision});if(!live())return;find('#aiConfigRemove').hidden=true;find('#aiConfigStatus').textContent='Clé supprimée. Les historiques sont conservés.';status('API IA désactivée.');draw();}
      catch(error){if(live())find('#aiConfigStatus').textContent=error.message;}finally{configBusy=false;}
    };
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
    find('#aiForm').onsubmit=async event=>{
      event.preventDefault();if(busy||historyBusy||!live()||!isReady())return;
      const content=find('#aiPrompt').value.trim();if(!content)return;
      if(remote){historyBusy=true;drawHistory();try{await refreshHistory();}catch(error){status('Historique indisponible : '+error.message);return;}finally{historyBusy=false;if(live())drawHistory();}if(!live()||!historyReady)return;}
      if(messages.length>=14||messages.reduce((sum,message)=>sum+message.content.length,0)+content.length>10000){status('Cette conversation est longue. Démarre une nouvelle conversation.');return;}
      const run=++operation,current=()=>live()&&run===operation;
      busy=true;active=true;partial='';messages.push({role:'user',content});find('#aiPrompt').value='';draw();status('Réponse de l’API en cours…');let completed=false,truncated=false,interrupted=false;
      try{const result=await engine().generate(messages,data=>{if(current())update(data);});if(!current())return;partial='';messages.push({role:'assistant',content:result.content});completed=true;truncated=result.truncated;status(truncated?'Réponse limitée en longueur.':'Réponse reçue.');}
      catch(error){if(current()){interrupted=true;if(partial.trim()){messages.push({role:'assistant',content:partial});completed=true;partial='';}status(errorMessage(error));}}
      finally{if(current()){
        if(!completed){messages.pop();find('#aiPrompt').value=content;}
        else if(remote){try{await saveConversation();if(current())status(interrupted?'Réponse interrompue. La partie reçue a été enregistrée.':truncated?'Conversation enregistrée. Réponse limitée en longueur.':'Conversation enregistrée dans ton historique personnel.');}catch(error){if(current()){status('Réponse conservée à l’écran, mais historique non enregistré : '+error.message);await refreshHistory().catch(()=>{});}}}
        if(current()){active=false;busy=false;draw();}
      }}
    };
    find('#aiPrompt').onkeydown=event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();find('#aiForm').requestSubmit();}};
    async function poll(){if(!live())return;try{await refreshHistory();if(!busy)await loadSettings();}catch{}if(live())timer=setTimeout(poll,15000);}
    find('#aiHistoryStatus').textContent=remote?'Chargement de ton historique…':'Connecte-toi à ton compte pour conserver ton historique.';
    status('Connexion à l’API IA…');draw();
    if(remote){try{await refreshHistory();}catch(error){if(live())find('#aiHistoryStatus').textContent=error.message;}if(live())timer=setTimeout(poll,15000);}
    if(live())try{await loadSettings();}catch(error){status(errorMessage(error));}
  }
  return {render,reset};
})();
