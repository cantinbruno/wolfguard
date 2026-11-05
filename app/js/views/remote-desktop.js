'use strict';

const remoteDesktopWorkspace=(()=>{
  let generation=0,lifetime=null,session=null,timer=0,inputTimer=0,events=[],inputBusy=false,inputRequest=0,sequence=0;
  const request=(path,value,options)=>WolfGuardCloud.agentRequest(path,value,options);
  function reset(){
    const old=session;session=null;if(document.fullscreenElement?.closest('.remote-session'))document.exitFullscreen().catch(()=>{});generation++;clearTimeout(timer);clearTimeout(inputTimer);inputTimer=0;events=[];sequence=0;inputBusy=false;inputRequest++;
    lifetime?.abort();lifetime=null;
    const canvas=$('#wgRemoteCanvas');if(canvas){canvas.width=1;canvas.height=1;}
    if(old&&workspaceAgents.available())request('remote/stop',{id:old.id}).catch(()=>{});
  }
  async function render(){
    reset();lifetime=new AbortController();const token=generation,key=state.vaultKey,signal=lifetime.signal;
    const root=document.createElement('section');root.className='remote-workspace';root.dataset.phase='ready';
    $('#content').replaceChildren(root);
    root.innerHTML='<header class="remote-heading"><div class="remote-heading-icon">'+workspaceSectionIcon('remote')+'</div><div><span>ASSISTANCE DU POSTE</span><h1>Prise en main</h1><p>Afficher le bureau et utiliser la souris et le clavier depuis WolfGuard.</p></div></header><section class="remote-connect"><div class="remote-agent"><span class="remote-agent-icon">'+settingsIcon('monitor')+'</span><div><small>POSTE SÉLECTIONNÉ DANS AGENTS</small><strong id="wgRemoteAgent">Chargement du poste…</strong><span id="wgRemotePresence"></span></div></div><button type="button" id="wgRemoteConnect" class="remote-primary" disabled>Se connecter</button><p id="wgRemoteHint"></p></section><p id="wgRemoteStatus" role="status" aria-live="polite"></p><section id="wgRemoteSession" class="remote-session" hidden><div class="remote-toolbar"><span id="wgRemoteSessionState"></span><div><button type="button" id="wgRemoteControl" disabled aria-pressed="true">Souris et clavier activés</button><button type="button" id="wgRemoteFullscreen" disabled>Plein écran</button><button type="button" id="wgRemoteDisconnect" class="remote-disconnect">Déconnecter</button></div></div><div id="wgRemoteViewport" class="remote-viewport"><div id="wgRemoteWaiting"><span class="remote-wait-symbol"></span><h2>Connexion au poste associé</h2><p>L’agent prépare le bureau. Le partage s’arrête depuis WolfGuard ou l’icône de l’agent près de l’horloge.</p></div><canvas id="wgRemoteCanvas" width="1" height="1" tabindex="0" aria-label="Bureau distant : cliquer pour utiliser la souris et le clavier" hidden></canvas></div><div class="remote-session-footer"><span id="wgRemoteImageInfo">En attente du bureau…</span><span id="wgRemoteInputHint">Cliquer sur le bureau pour le contrôler. Ctrl + Alt + Échap pour libérer le clavier.</span></div><form id="wgRemoteTextForm"><label for="wgRemoteText">Envoyer du texte au poste</label><div><textarea id="wgRemoteText" maxlength="500" rows="2" placeholder="Coller ou saisir du texte…" disabled></textarea><button type="submit" id="wgRemoteSendText" disabled>Envoyer le texte</button></div></form></section><section class="remote-explanation"><h2>Connexion au poste associé</h2><div><article><span>01</span><h3>Se connecter</h3><p>La session utilise le poste déjà choisi dans la fenêtre Agents.</p></article><article><span>02</span><h3>Ouvrir le bureau</h3><p>Sous Windows, les postes associés se connectent sans confirmation locale. La prise en main est indiquée dans l’icône de l’agent. Sur Linux et macOS, les autorisations du bureau peuvent être nécessaires.</p></article><article><span>03</span><h3>Garder la main</h3><p>Déconnecter depuis WolfGuard ou le menu de l’agent. La session se termine après 20 minutes au maximum.</p></article></div><details><summary>Préparer Windows, Linux ou macOS</summary><p><strong>Windows :</strong> utiliser le nouvel agent graphique dans une session ouverte. Les écrans verrouillés, les demandes UAC et les applications élevées restent soumis aux restrictions de Windows.</p><p><strong>macOS :</strong> autoriser l’agent ou l’application qui le lance (Terminal/Node) dans Confidentialité et sécurité → Accessibilité et Enregistrement de l’écran. Une relance de l’agent peut être nécessaire après l’autorisation.</p><p><strong>Linux :</strong> ouvrir une session graphique et installer zenity ou kdialog. Sous Wayland, le portail de bureau et GStreamer sont nécessaires : gstreamer1.0-tools, gstreamer1.0-pipewire et gstreamer1.0-plugins-good sur Debian/Ubuntu.</p><p>Le composant de bureau est téléchargé et vérifié au premier usage. Cette version transmet des images du bureau pour l’administration ; elle ne transporte ni audio ni fichiers.</p></details></section>';
    const find=selector=>root.querySelector(selector),live=()=>generation===token&&root.isConnected&&state.section==='remote'&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    let agent=null,checking=0,revision=-1,controlling=true,drawing=false,viewBusy=false,ending=false,lastImage=0,polling=false;const pressed=new Map();
    function status(value,error=false){if(live()){find('#wgRemoteStatus').textContent=value;find('#wgRemoteStatus').classList.toggle('is-error',error);}}
    function phase(value){root.dataset.phase=value;find('#wgRemoteSession').hidden=!session;find('.remote-explanation').hidden=!!session;find('#wgRemoteConnect').hidden=!!session;find('#wgRemoteSessionState').textContent=({requested:'Connexion demandée',preparing:'Préparation du poste',active:'Session active',connecting:'Réception du bureau'})[value]||'';}
    function enableInput(value){for(const id of ['wgRemoteControl','wgRemoteFullscreen','wgRemoteText','wgRemoteSendText'])find('#'+id).disabled=!value||!controlling&&['wgRemoteText','wgRemoteSendText'].includes(id);}
    function enqueue(event){if(!live()||!session||root.dataset.phase!=='active')return;if(events.length>=96){finish('Contrôle interrompu : trop d’actions en attente.',true);return;}if(event.type==='move'&&events.at(-1)?.type==='move')events[events.length-1]=event;else if(event.type==='text'&&events.at(-1)?.type==='text'&&events.at(-1).text.length+event.text.length<=500)events[events.length-1].text+=event.text;else events.push(event);if(!inputTimer&&!inputBusy)inputTimer=setTimeout(flush,16);}
    async function flush(){
      clearTimeout(inputTimer);inputTimer=0;
      if(inputBusy||!events.length||!session||!live())return;
      inputBusy=true;const owner=++inputRequest,current=session.id,batch=events.splice(0,32),seq=++sequence;
      try{await request('remote/input',{id:current,seq,events:batch},{signal});}
      catch(error){if(live()&&session?.id===current)await finish('La transmission des actions a été interrompue. Reconnecte la session.',true);}
      finally{if(inputRequest===owner){inputBusy=false;if(live()&&session?.id===current&&events.length)inputTimer=setTimeout(flush,0);}}
    }
    function release(){pressed.clear();if(session&&root.dataset.phase==='active')enqueue({type:'release'});}
    async function finish(message,error=false){
      if(ending)return;ending=true;if(document.fullscreenElement&&root.contains(document.fullscreenElement))document.exitFullscreen().catch(()=>{});const old=session;session=null;events=[];clearTimeout(inputTimer);inputTimer=0;inputBusy=false;inputRequest++;enableInput(false);pressed.clear();
      const canvas=find('#wgRemoteCanvas');canvas.width=1;canvas.height=1;canvas.hidden=true;find('#wgRemoteWaiting').hidden=false;phase('ready');
      try{if(old)await request('remote/stop',{id:old.id},{signal});}catch{}
      ending=false;if(live()){status(message,error);await refreshAgent(true).catch(()=>{find('#wgRemoteConnect').disabled=true;find('#wgRemotePresence').textContent='○ État indisponible';find('#wgRemotePresence').dataset.online='false';});}
    }
    async function refreshAgent(force=false){
      if(!force&&Date.now()-checking<3500)return;checking=Date.now();
      if(!workspaceAgents.available()){agent=null;find('#wgRemoteAgent').textContent='Aucun agent disponible';find('#wgRemoteHint').textContent='Connecte le site au partage, puis choisis un poste dans la fenêtre Agents.';return;}
      const snapshot=await workspaceAgents.snapshot();if(!live())return;
      const selected=snapshot.selected;
      if(session&&agent?.id!==selected?.id){await finish('Le poste sélectionné a changé. La session a été déconnectée.');return;}
      agent=selected;find('#wgRemoteAgent').textContent=agent?agent.name+' · '+workspaceAgents.platformName(agent.platform):'Aucun poste sélectionné';
      find('#wgRemotePresence').textContent=agent?agent.online?'● Agent connecté':'○ Agent hors ligne':'';find('#wgRemotePresence').dataset.online=String(!!agent?.online);
      const compatible=agent?.capabilities?.includes('remote-desktop-v1');
      find('#wgRemoteConnect').disabled=!!session||ending||!agent?.online||!compatible;
      find('#wgRemoteHint').textContent=!agent?'Choisis le poste dans la fenêtre Agents.':!agent.online?'Démarre l’agent sur le poste distant.':!compatible?'Télécharge et relance le nouvel agent depuis la fenêtre Agents.':agent.platform==='win32'?'Poste associé · Connexion sans confirmation locale · Session de 20 minutes maximum.':'Linux et macOS · Autorisations du bureau sur le poste · Session de 20 minutes maximum.';
    }
    async function image(frame,current){
      if(drawing||!frame||!Number.isInteger(frame.width)||!Number.isInteger(frame.height)||frame.width<1||frame.height<1||frame.width>8192||frame.height>8192||typeof frame.jpeg!=='string'||frame.jpeg.length>640000)return;
      drawing=true;let bitmap;
      try{const bytes=Uint8Array.from(atob(frame.jpeg),value=>value.charCodeAt(0));bitmap=await createImageBitmap(new Blob([bytes],{type:'image/jpeg'}));if(!live()||session?.id!==current)return;
        const canvas=find('#wgRemoteCanvas');if(canvas.width!==bitmap.width||canvas.height!==bitmap.height){canvas.width=bitmap.width;canvas.height=bitmap.height;}canvas.getContext('2d').drawImage(bitmap,0,0);canvas.hidden=false;find('#wgRemoteWaiting').hidden=true;
        phase('active');enableInput(true);if(!lastImage){status('Connexion établie. Clique sur le bureau pour utiliser le clavier et la souris.');if(controlling)canvas.focus({preventScroll:true});}lastImage=Date.now();find('#wgRemoteImageInfo').textContent=bitmap.width+' × '+bitmap.height+' · Bureau reçu à '+new Date().toLocaleTimeString('fr-FR');
      }finally{bitmap?.close();drawing=false;}
    }
    async function poll(){
      if(!live()||polling)return;polling=true;const started=Date.now();
      try{
        if(session)refreshAgent().catch(()=>{});else await refreshAgent();if(!live())return;
        if(session&&!viewBusy){viewBusy=true;const current=session.id;
          try{const result=await request('remote/session?id='+current,undefined,{signal});if(!live()||session?.id!==current)return;
            if(!['requested','preparing','active'].includes(result.status)){await finish(result.message||'La session est terminée.',['error','denied'].includes(result.status));return;}
            if(result.status!=='active')phase(result.status);else if(lastImage===0)phase('connecting');
            if(result.frame&&result.revision!==revision){await image(result.frame,current);revision=result.revision;}
            if(lastImage&&Date.now()-lastImage>10000)await finish('Le flux du bureau a été interrompu. Reconnecte la session.',true);
          }finally{viewBusy=false;}
        }
      }catch(error){if(live()){if(session)await finish('Connexion interrompue. La session a été arrêtée.',true);else{find('#wgRemoteConnect').disabled=true;status(error.message,true);}}}
      finally{polling=false;if(live()){clearTimeout(timer);timer=setTimeout(poll,session?Math.max(0,40-(Date.now()-started)):3500);}}
    }
    find('#wgRemoteConnect').onclick=async()=>{
      if(!agent||session||ending)return;find('#wgRemoteConnect').disabled=true;status('Envoi de la demande…');
      try{const chosen=(await workspaceAgents.snapshot()).selected;if(chosen?.id!==agent.id)throw new Error('Le poste a changé. Vérifie le poste sélectionné avant de te connecter.');
        const result=await request('remote/start',{agentId:agent.id},{signal});if(!live()){request('remote/stop',{id:result.id}).catch(()=>{});return;}
        session={id:result.id,expiresAt:result.expiresAt};sequence=0;revision=-1;lastImage=0;events=[];controlling=true;find('#wgRemoteControl').setAttribute('aria-pressed','true');find('#wgRemoteControl').textContent='Souris et clavier activés';phase('requested');status(agent.platform==='win32'?'Connexion au poste associé…':'Accepte la demande sur le poste distant pour démarrer.');clearTimeout(timer);poll();
      }catch(error){if(live()){status(error.message,true);await refreshAgent(true).catch(()=>{find('#wgRemoteConnect').disabled=true;});}}
    };
    find('#wgRemoteDisconnect').onclick=()=>finish('Session déconnectée.');
    find('#wgRemoteControl').onclick=()=>{release();controlling=!controlling;find('#wgRemoteControl').setAttribute('aria-pressed',String(controlling));find('#wgRemoteControl').textContent=controlling?'Souris et clavier activés':'Lecture seule';find('#wgRemoteText').disabled=!controlling;find('#wgRemoteSendText').disabled=!controlling;};
    find('#wgRemoteFullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await find('#wgRemoteSession').requestFullscreen();}catch{status('Le plein écran n’est pas disponible dans ce navigateur.',true);}};
    const canvas=find('#wgRemoteCanvas'),position=event=>{const box=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)),y:Math.max(0,Math.min(1,(event.clientY-box.top)/box.height))};};
    canvas.oncontextmenu=event=>event.preventDefault();
    canvas.onpointerdown=event=>{if(!controlling||event.button>2)return;event.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);enqueue({type:'button',...position(event),button:event.button,down:true});};
    canvas.onpointerup=event=>{if(!controlling||event.button>2)return;event.preventDefault();enqueue({type:'button',...position(event),button:event.button,down:false});if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);};
    let moved=0;canvas.onpointermove=event=>{if(!controlling||Date.now()-moved<20)return;moved=Date.now();enqueue({type:'move',...position(event)});};
    canvas.onpointercancel=release;canvas.onblur=release;
    canvas.addEventListener('wheel',event=>{if(!controlling)return;event.preventDefault();enqueue({type:'wheel',...position(event),delta:Math.max(-5,Math.min(5,Math.sign(event.deltaY)||1))});},{passive:false});
    const special=new Set(['Enter','Escape','Tab','Backspace','Delete','Insert','Home','End','PageUp','PageDown','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Control','Alt','Shift','Meta','CapsLock','ContextMenu',...Array.from({length:12},(_,index)=>'F'+(index+1))]);
    canvas.onkeydown=event=>{if(!controlling)return;if(event.ctrlKey&&event.altKey&&event.key==='Escape'){event.preventDefault();event.stopPropagation();release();find('#wgRemoteDisconnect').focus();return;}event.preventDefault();event.stopPropagation();if([...event.key].length===1&&(!event.ctrlKey&&!event.metaKey&&!event.altKey||event.getModifierState('AltGraph'))){if(event.getModifierState('AltGraph'))release();enqueue({type:'text',text:event.key});return;}const key=special.has(event.key)?event.key:/^[a-z]$/i.test(event.key)?'Key'+event.key.toUpperCase():event.code;if(special.has(key)||/^(?:Key[A-Z]|Digit[0-9]|Space|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|Backquote)$/.test(key)){pressed.set(event.code||event.key,key);enqueue({type:'key',key,down:true});}};
    canvas.onkeyup=event=>{if(!controlling)return;event.preventDefault();event.stopPropagation();const physical=event.code||event.key,key=pressed.get(physical);if(key){pressed.delete(physical);enqueue({type:'key',key,down:false});}};
    find('#wgRemoteTextForm').onsubmit=event=>{event.preventDefault();const input=find('#wgRemoteText');if(controlling&&input.value&&session){enqueue({type:'text',text:input.value});input.value='';canvas.focus({preventScroll:true});}};
    window.addEventListener('blur',release,{signal});window.addEventListener('pagehide',reset,{signal,once:true});
    if(workspaceAgents.available())poll();else await refreshAgent(true);
  }
  return {render,reset};
})();
window.remoteDesktopWorkspace=remoteDesktopWorkspace;
