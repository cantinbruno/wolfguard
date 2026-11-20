'use strict';

const workspaceAgentRemoval=(()=>{
  let generation=0,controller=null;
  function unmount(){generation++;controller?.abort();controller=null;}
  function mount(root,{agentId=''}={}){
    unmount();controller=new AbortController();const {signal}=controller,token=generation,key=state.vaultKey;
    const live=()=>generation===token&&root.isConnected&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    const find=selector=>root.querySelector(selector);
    let agents=[],loading=true,busy=false,selected=agentId;
    root.className='agent-removal';
    root.innerHTML=`<p class="removal-intro">Supprime l’agent d’un poste, à distance ou directement sur place.</p>
      <section class="removal-remote" aria-labelledby="removalRemoteTitle"><h3 id="removalRemoteTitle">À distance</h3><p>L’agent doit être connecté. Ses scans et ses partages s’arrêteront.</p><label for="removalAgent">Poste à désinstaller</label><div class="removal-target"><select id="removalAgent" disabled><option>Chargement des postes…</option></select><button type="button" class="settings-btn" id="removalRefresh" aria-label="Actualiser les postes">${settingsIcon('refresh-cw')}</button></div><p id="removalAvailability" class="removal-help"></p><button type="button" class="settings-btn removal-danger" id="removalStart" disabled>${settingsIcon('trash-2')}Désinstaller l’agent à distance</button><p id="removalStatus" role="status" aria-live="polite"></p><p id="removalError" role="alert"></p></section>
      <section class="removal-local" aria-labelledby="removalLocalTitle"><div><h3 id="removalLocalTitle">Sur le poste</h3><p>Télécharge le désinstalleur, puis ouvre-le sur le poste concerné.</p></div><div class="removal-downloads"><a class="settings-btn" href="downloads/WolfGuard-Agent-Uninstall.cmd" download>${workspaceAgents.platformIcon('win32')}Windows</a><a class="settings-btn" href="downloads/WolfGuard-Uninstaller.sh.txt" download="Desinstaller-WolfGuard.sh">${workspaceAgents.platformIcon('linux')}Linux</a><a class="settings-btn" href="downloads/WolfGuard-Uninstaller.sh.txt" download="Desinstaller-WolfGuard.sh">${workspaceAgents.platformIcon('darwin')}macOS</a></div><p class="removal-help">Linux et macOS : exécute <code>sh Desinstaller-WolfGuard.sh</code>.</p></section><p class="removal-footnote">Pour retirer aussi le poste du parc, révoque son accès depuis sa fiche.</p>`;
    function controls(){
      const agent=agents.find(item=>item.id===selected),progress=agent&&WolfGuardAgentRemoval.state(agent.id);
      find('#removalAgent').disabled=loading||busy||!agents.length;
      find('#removalRefresh').disabled=loading||busy;
      find('#removalStart').disabled=loading||busy||!!WolfGuardAgentRemoval.reason(agent);
      find('#removalAvailability').textContent=loading?'Chargement…':agents.length?WolfGuardAgentRemoval.reason(agent):'Aucun poste accessible à désinstaller.';
      if(progress){find('#removalStatus').textContent=['failed','unknown'].includes(progress.status)?'':progress.message;find('#removalError').textContent=['failed','unknown'].includes(progress.status)?progress.message:'';}
    }
    async function refresh(){
      if(!live()||busy)return;loading=true;controls();find('#removalError').textContent='';
      try{
        const data=await WolfGuardCloud.agentRequest('agents',undefined,{signal});if(!live())return;
        agents=(data.agents||[]).filter(agent=>!agent.local&&WolfGuardCloud.can('agents.revoke')&&(!globalThis.WolfGuardAccess||WolfGuardAccess.canAgent(agent.id,'agents.revoke')));
        if(!agents.some(agent=>agent.id===selected))selected=agents[0]?.id||'';
        find('#removalAgent').innerHTML=agents.length?agents.map(agent=>'<option value="'+esc(agent.id)+'">'+esc(agent.name)+' · '+(agent.online?'Connecté':'Hors ligne')+'</option>').join(''):'<option value="">Aucun poste</option>';
        find('#removalAgent').value=selected;
      }catch(error){if(live()){agents=[];find('#removalAgent').innerHTML='<option value="">Chargement impossible</option>';find('#removalError').textContent=error.message;}}
      finally{if(live()){loading=false;controls();}}
    }
    find('#removalAgent').onchange=event=>{selected=event.target.value;find('#removalStatus').textContent='';find('#removalError').textContent='';controls();};
    find('#removalRefresh').onclick=refresh;
    find('#removalStart').onclick=async()=>{
      const agent=agents.find(item=>item.id===selected);if(busy||!live()||WolfGuardAgentRemoval.reason(agent))return;
      busy=true;controls();
      const confirmed=await appConfirm('Désinstaller WolfGuard de « '+agent.name+' » ? Les scans, la protection assurée par cet agent et la prise en main de ce poste seront arrêtés.',{title:'Désinstaller cet agent',confirmLabel:'Désinstaller l’agent',danger:true});
      if(!live())return;
      if(!confirmed){busy=false;controls();find('#removalStart').focus();return;}
      try{await WolfGuardAgentRemoval.start(agent,{onChange:value=>{if(live()){find('#removalStatus').textContent=['failed','unknown'].includes(value.status)?'':value.message;find('#removalError').textContent=['failed','unknown'].includes(value.status)?value.message:'';}}});}
      catch(error){if(live())find('#removalError').textContent=error.message;}
      finally{if(live()){busy=false;controls();}}
    };
    refresh();
  }
  return {mount,unmount};
})();

function openAgentRemovalInterface(options={}){
  if($('#app').classList.contains('hidden'))return;
  const returnFocus=document.activeElement;
  modal('Désinstaller un agent','<button type="button" class="settings-btn settings-btn-icon settings-close" id="closeRemovalBtn" aria-label="Fermer la désinstallation">'+settingsIcon('x')+'</button><div class="removal-content" id="agentRemovalContent"></div>');
  const dialog=$('#modalRoot .modal');dialog.classList.add('settings-modal','agent-removal-modal');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.querySelector('h2').id='removalTitle';dialog.setAttribute('aria-labelledby','removalTitle');dialog.parentElement.classList.add('settings-wrap');
  const close=()=>{closeModal();if(options.onClose)options.onClose();else if(returnFocus?.isConnected)returnFocus.focus();};
  $('#closeRemovalBtn').onclick=close;dialog.parentElement.onclick=event=>{if(event.target===dialog.parentElement)close();};
  dialog.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button:not([disabled]),select:not([disabled]),a[href]')].filter(node=>node.getClientRects().length),first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}};
  workspaceAgentRemoval.mount($('#agentRemovalContent'),options);$('#closeRemovalBtn').focus();
}
