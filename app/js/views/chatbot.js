'use strict';

const chatbotWorkspace=(()=>{
  let generation=0,messages=[],active=null,ownerKey=null;
  const request=(path,value)=>WolfGuardCloud.agentRequest(path,value);
  function reset(clear=false){generation++;if(active){request('ai/cancel',{id:active}).catch(()=>{});active=null;}if(clear){messages=[];ownerKey=null;}}
  async function render(){
    reset();if(ownerKey!==state.vaultKey){messages=[];ownerKey=state.vaultKey;}
    const token=generation,key=state.vaultKey,root=document.createElement('section');root.className='chatbot-workspace';$('#content').replaceChildren(root);
    const live=()=>token===generation&&root.isConnected&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    root.innerHTML='<header class="security-workspace-heading"><div><span class="security-kicker">ASSISTANT LOCAL</span><h1>Chatbot IA</h1><p>Une IA sur ton poste, sans abonnement ni quota de fournisseur.</p></div><button type="button" id="aiClear">Nouvelle conversation</button></header><div class="ai-configuration"><label>Poste de calcul<select id="aiAgent" disabled><option>Chargement…</option></select></label><label>Modèle Ollama<input id="aiModel" value="qwen3.5:4b" maxlength="120" spellcheck="false" list="aiModels"><datalist id="aiModels"><option value="qwen3.5:4b"><option value="qwen3.5:9b"><option value="qwen3.5:2b"></datalist></label><div class="security-actions"><button type="button" id="aiRefresh">Actualiser</button><button type="button" id="aiAgents">Agents</button></div></div><details class="ai-setup"><summary>Préparer le modèle gratuit sur mon poste</summary><ol><li>Installe <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">Ollama</a> sur le poste choisi.</li><li>Dans son terminal, exécute <code>ollama pull qwen3.5:4b</code> (environ 4 Go de téléchargement).</li><li>Démarre Ollama et installe la dernière version de l’agent depuis Agents.</li></ol><p>4B convient pour commencer ; 9B demande davantage de mémoire. La vitesse dépend du matériel. Le modèle répond localement ; tes messages transitent par le relais WolfGuard chiffré au repos. Aucun mémo, secret du coffre ni audit n’est joint automatiquement.</p><p>La conversation reste en mémoire jusqu’au verrouillage. Les demandes temporaires du relais sont supprimées après une heure lors de son prochain accès.</p></details><div id="aiMessages" class="ai-messages" role="log" aria-label="Conversation" aria-live="polite"></div><p id="aiStatus" role="status" aria-live="polite"></p><form id="aiForm" class="ai-composer"><label for="aiPrompt">Ton message</label><textarea id="aiPrompt" rows="3" maxlength="12000" placeholder="Pose une question, décris un problème ou colle un extrait à analyser…" required></textarea><div><span>Vérifie les commandes proposées avant de les utiliser.</span><button type="button" id="aiStop" hidden>Arrêter</button><button type="submit" id="aiSend" disabled>Envoyer</button></div></form>';
    const find=selector=>root.querySelector(selector);let busy=false,agents=[],loading=true,stopRequested=false;
    function draw(){
      if(!live())return;
      const log=find('#aiMessages');log.replaceChildren();
      if(!messages.length){const empty=document.createElement('div');empty.className='ai-welcome';empty.innerHTML='<span aria-hidden="true">'+workspaceSectionIcon('chatbot')+'</span><h2>Comment puis-je t’aider ?</h2><p>Diagnostic, explication, script ou synthèse : décris ton besoin.</p><div class="ai-suggestions"><button type="button">Comment analyser une alerte de sécurité ?</button><button type="button">Aide-moi à diagnostiquer un problème réseau</button></div>';log.append(empty);for(const button of empty.querySelectorAll('button'))button.onclick=()=>{find('#aiPrompt').value=button.textContent;find('#aiPrompt').focus();};}
      for(const message of messages){const article=document.createElement('article');article.className='ai-message';article.dataset.role=message.role;const heading=document.createElement('strong');heading.textContent=message.role==='user'?'Toi':'WolfGuard IA';const body=document.createElement('div');body.className='ai-message-content';body.textContent=message.content;article.append(heading,body);if(message.role==='assistant'){const copy=document.createElement('button');copy.type='button';copy.textContent='Copier';copy.onclick=()=>copyText(message.content);article.append(copy);}log.append(article);}
      find('#aiSend').disabled=busy||loading||!agents.some(agent=>agent.id===find('#aiAgent').value&&agent.online&&agent.capabilities?.includes('ai-chat-v1'));
      find('#aiStop').hidden=!busy;find('#aiAgent').disabled=busy||loading||!agents.length;find('#aiModel').disabled=busy;find('#aiClear').disabled=busy;find('#aiRefresh').disabled=busy||loading;find('#aiAgents').disabled=busy;
      log.scrollTop=log.scrollHeight;
    }
    find('#aiAgents').onclick=()=>openAgentsInterface();
    find('#aiClear').onclick=()=>{messages=[];find('#aiStatus').textContent='Nouvelle conversation.';draw();find('#aiPrompt').focus();};
    find('#aiAgent').onchange=()=>{const agent=agents.find(row=>row.id===find('#aiAgent').value);find('#aiStatus').textContent=!agent?.online?'Ce poste est hors ligne.':!agent.capabilities?.includes('ai-chat-v1')?'Mets à jour l’agent sur ce poste.':'Prêt. Ollama doit être démarré sur ce poste.';draw();};
    find('#aiStop').onclick=async()=>{stopRequested=true;find('#aiStatus').textContent='Annulation de la demande…';if(active){const id=active;active=null;try{await request('ai/cancel',{id});if(live())find('#aiStatus').textContent='Génération arrêtée.';}catch(error){if(live())find('#aiStatus').textContent=error.message;}}};
    find('#aiForm').onsubmit=async event=>{
      event.preventDefault();if(busy||!live()||find('#aiSend').disabled)return;
      const content=find('#aiPrompt').value.trim();if(!content)return;
      if(messages.length>=22||messages.reduce((sum,m)=>sum+m.content.length,0)+content.length>48000){find('#aiStatus').textContent='Cette conversation est longue. Démarre une nouvelle conversation.';return;}
      busy=true;stopRequested=false;messages.push({role:'user',content});find('#aiPrompt').value='';draw();find('#aiStatus').textContent='Envoi au poste…';let completed=false,jobId=null;
      try{
        const started=await request('ai',{agentId:find('#aiAgent').value,model:find('#aiModel').value.trim(),messages});jobId=started.id;
        if(!live()||stopRequested){await request('ai/cancel',{id:jobId}).catch(()=>{});return;}active=jobId;const deadline=Date.now()+720000;
        while(live()&&active===jobId){
          const result=await request('ai?id='+jobId);if(!live()||active!==jobId)return;
          if(result.status==='completed'){messages.push({role:'assistant',content:result.content});completed=true;find('#aiStatus').textContent='Réponse reçue · '+find('#aiModel').value;break;}
          if(['failed','cancelled'].includes(result.status))throw new Error(result.error||'La génération a été arrêtée.');
          if(Date.now()>deadline)throw new Error('Le délai de réponse est dépassé.');
          find('#aiStatus').textContent=result.status==='queued'?'En attente de l’agent…':'Le modèle prépare sa réponse…';
          await new Promise(resolve=>setTimeout(resolve,1500));
        }
      }catch(error){if(live()){find('#aiStatus').textContent=error.message;if(jobId)request('ai/cancel',{id:jobId}).catch(()=>{});}}
      finally{if(live()){if(!completed&&messages.at(-1)?.role==='user'){messages.pop();find('#aiPrompt').value=content;}active=null;busy=false;draw();}}
    };
    find('#aiPrompt').onkeydown=event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();find('#aiForm').requestSubmit();}};
    async function refreshAgents(){
      if(busy)return;loading=true;draw();const previous=find('#aiAgent').value;
      try{
        if(!workspaceAgents.available())throw new Error('Connecte-toi à ton espace partagé pour utiliser le chatbot.');
        const data=await request('agents');if(!live())return;agents=data.agents;
        find('#aiAgent').innerHTML=agents.map(agent=>'<option value="'+esc(agent.id)+'">'+esc(agent.name)+(agent.online?'':' · Hors ligne')+'</option>').join('')||'<option value="">Aucun poste associé</option>';
        const selected=agents.find(agent=>agent.id===previous)||agents.find(agent=>agent.online&&agent.capabilities?.includes('ai-chat-v1'));if(selected)find('#aiAgent').value=selected.id;find('#aiAgent').onchange();
      }catch(error){if(live()){agents=[];find('#aiStatus').textContent=error.message;}}
      finally{loading=false;draw();}
    }
    find('#aiRefresh').onclick=refreshAgents;await refreshAgents();
  }
  return {render,reset};
})();
