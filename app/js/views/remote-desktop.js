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
  let preferredMode = 'desktop';
  function preferMode(mode) { if (['desktop','terminal','files'].includes(mode)) preferredMode = mode; }
  async function render(host = $('#agentToolHost') || $('#content')){
    reset();lifetime=new AbortController();const token=generation,key=state.vaultKey,signal=lifetime.signal;
    const root=document.createElement('section');root.className='remote-workspace';root.dataset.phase='ready';
    host.replaceChildren(root);
    root.innerHTML='<header class="remote-heading"><div class="remote-heading-icon">'+workspaceSectionIcon('remote')+'</div><div><span>ASSISTANCE DU POSTE</span><h1>Prise en main</h1><p>Bureau, terminal et fichiers du poste choisi dans Agents.</p></div></header><section class="remote-connect"><div class="remote-agent"><span class="remote-agent-icon">'+settingsIcon('monitor')+'</span><div><small>POSTE CHOISI</small><strong id="wgRemoteAgent">Chargement du poste…</strong><span id="wgRemotePresence"></span></div></div><button type="button" id="wgRemoteConnect" class="remote-primary" disabled>Se connecter</button><p id="wgRemoteHint"></p></section><p id="wgRemoteStatus" role="status" aria-live="polite"></p><section id="wgRemoteSession" class="remote-session" hidden><div class="remote-toolbar"><span id="wgRemoteSessionState"></span><div><button type="button" id="wgRemoteControl" disabled aria-pressed="true">Souris et clavier activés</button><button type="button" id="wgRemoteFullscreen" disabled>Plein écran</button><button type="button" id="wgRemoteDisconnect" class="remote-disconnect">Déconnecter</button></div></div><div id="wgRemoteViewport" class="remote-viewport"><div id="wgRemoteWaiting"><span class="remote-wait-symbol"></span><h2>Connexion au poste…</h2></div><canvas id="wgRemoteCanvas" width="1" height="1" tabindex="0" aria-label="Bureau distant : cliquer pour utiliser la souris et le clavier" hidden></canvas></div><div class="remote-session-footer"><span id="wgRemoteImageInfo">En attente du bureau…</span><span id="wgRemoteInputHint">Cliquer sur le bureau pour le contrôler. Ctrl + Alt + Échap pour libérer le clavier.</span></div><form id="wgRemoteTextForm"><label for="wgRemoteText">Envoyer du texte au poste</label><div><textarea id="wgRemoteText" maxlength="500" rows="2" placeholder="Coller ou saisir du texte…" disabled></textarea><button type="submit" id="wgRemoteSendText" disabled>Envoyer le texte</button></div></form></section><section class="remote-explanation"><h2>Comment ça marche</h2><div><article><span>01</span><h3>Choisir le poste</h3><p>Dans Agents.</p></article><article><span>02</span><h3>Se connecter</h3><p>Bureau, Terminal ou Fichiers.</p></article><article><span>03</span><h3>Déconnecter</h3><p>Depuis WolfGuard ou l’icône de l’agent.</p></article></div><details><summary>Autorisations système</summary><p><strong>Windows :</strong> aucune action ; les écrans verrouillés et l’UAC restent limités par Windows.</p><p><strong>macOS :</strong> autoriser Accessibilité et Enregistrement de l’écran.</p><p><strong>Linux (Wayland) :</strong> portail de bureau et GStreamer requis.</p></details></section>';
    const find=selector=>root.querySelector(selector),live=()=>generation===token&&root.isConnected&&state.section==='remote'&&state.vaultKey===key&&!$('#app').classList.contains('hidden');
    let agent=null,checking=0,revision=-1,controlling=true,drawing=false,viewBusy=false,ending=false,starting=false,lastImage=0,polling=false,selectedMode=window.WolfGuardAccess&&!WolfGuardAccess.can('remote.write')?'terminal':preferredMode,terminalSequence=0,terminalBusy=false,terminalSubmitting=false,terminalFingerprint='',historyIndex=0;const pressed=new Map(),commandHistory=[];
        find('.remote-heading p').textContent='Bureau, terminal et fichiers du poste choisi dans Agents.';
    const actions=document.createElement('div');actions.className='remote-connect-actions';
    actions.innerHTML='<div class="remote-modes" role="group" aria-label="Mode de prise en main"><button type="button" id="wgRemoteModeDesktop" aria-pressed="true">Bureau</button><button type="button" id="wgRemoteModeTerminal" aria-pressed="false">Terminal</button><button type="button" id="wgRemoteModeFiles" aria-pressed="false">Fichiers</button></div>';
    actions.append(find('#wgRemoteConnect'));find('.remote-connect').insertBefore(actions,find('#wgRemoteHint'));
    const terminal=document.createElement('section');terminal.className='remote-terminal';terminal.id='wgRemoteTerminal';terminal.hidden=true;
    terminal.innerHTML='<header><div><strong id="wgTerminalShell">Terminal distant</strong><span id="wgTerminalCwd"></span></div><span>Session de l’agent · Sans élévation</span></header><div id="wgTerminalOutput" class="remote-terminal-output" tabindex="0" aria-label="Résultats des commandes"><p class="remote-terminal-empty">Le terminal attend la connexion du poste.</p></div><form id="wgTerminalForm"><label for="wgTerminalCommand">Commande</label><div><textarea id="wgTerminalCommand" rows="2" maxlength="8000" spellcheck="false" autocomplete="off" placeholder="Saisir une commande…" disabled></textarea><div><button id="wgTerminalRun" class="remote-primary" type="submit" disabled>Exécuter</button><button id="wgTerminalCancel" type="button" disabled>Interrompre</button></div></div><p>Entrée pour exécuter · Maj + Entrée pour une nouvelle ligne · ↑ ↓ pour l’historique.</p></form>';
    find('#wgRemoteSession').insertBefore(terminal,find('#wgRemoteViewport'));
    const filesPane=document.createElement('section');filesPane.className='remote-files';filesPane.id='wgRemoteFiles';filesPane.hidden=true;
    filesPane.innerHTML='<header><div><strong>Fichiers du poste</strong><span id="wgFilesPath">—</span></div><button type="button" class="settings-btn" id="wgFilesRefresh">Actualiser</button></header><div id="wgFilesList" class="remote-files-list" aria-label="Contenu du dossier"><p class="remote-terminal-empty">Le dossier attend la connexion du poste.</p></div><form id="wgFilesUploadForm"><label for="wgFilesUpload">Envoyer un fichier au poste</label><div><input id="wgFilesUpload" type="file" multiple disabled><button id="wgFilesUploadSend" class="remote-primary" type="submit" disabled>Envoyer</button></div></form><p id="wgFilesStatus" role="status"></p>';
    find('#wgRemoteSession').insertBefore(filesPane,find('#wgRemoteViewport'));
    function terminalMode(){return selectedMode==='terminal';}
    function filesMode(){return selectedMode==='files';}
    function modeLayout(){
      const active=terminalMode(),files=filesMode();terminal.hidden=!active;filesPane.hidden=!files;
      for(const selector of ['#wgRemoteViewport','.remote-session-footer','#wgRemoteTextForm','#wgRemoteControl','#wgRemoteFullscreen'])find(selector).hidden=active||files;
      for(const mode of ['Desktop','Terminal','Files']){find('#wgRemoteMode'+mode).setAttribute('aria-pressed',String((mode==='Terminal'?terminalMode():mode==='Files'?filesMode():!terminalMode()&&!filesMode())));find('#wgRemoteMode'+mode).disabled=!!session||starting||!!window.WolfGuardAccess&&!WolfGuardAccess.can('remote.write');}
    }
    let filesPath='',filesEntries=[],fileBusy=false,filesInitialized=false,parentPath=null;
    const fileJoin=(base,name)=>base.replace(/[\\/]$/,'')+'/'+name;
    function fileControls(){for(const control of filesPane.querySelectorAll('button,input'))control.disabled=fileBusy||!session||root.dataset.phase!=='active';}
    function drawFiles(view){
      filesEntries=view.entries||[];filesPath=view.path;parentPath=view.parent;find('#wgFilesPath').textContent=filesPath;
      find('#wgFilesList').innerHTML=(parentPath?'<button type="button" data-file-parent>↑ Dossier parent</button>':'')+filesEntries.map((entry,index)=>'<div class="remote-file-row"><button type="button" data-file-open="'+index+'"><span>'+settingsIcon(entry.kind==='directory'?'folder-open':'file')+'</span><strong>'+esc(entry.name)+'</strong><small>'+(entry.kind==='directory'?'Dossier':Math.round(entry.size/1024)+' Ko')+'</small></button><button type="button" data-file-download="'+index+'" aria-label="Télécharger '+esc(entry.name)+'">'+settingsIcon('download')+'</button></div>').join('');
      find('[data-file-parent]')?.addEventListener('click',()=>listFiles(parentPath));
      for(const button of filesPane.querySelectorAll('[data-file-open]'))button.onclick=()=>{const entry=filesEntries[button.dataset.fileOpen];if(entry.kind==='directory')listFiles(fileJoin(filesPath,entry.name));else downloadFile(fileJoin(filesPath,entry.name));};
      for(const button of filesPane.querySelectorAll('[data-file-download]'))button.onclick=()=>downloadFile(fileJoin(filesPath,filesEntries[button.dataset.fileDownload].name));
      fileControls();
    }
    async function fileCommand(command){
      const current=session?.id;if(!current)throw new Error('Session fermée.');
      const queued=await request('remote/files/command',{id:current,command},{signal}),until=Date.now()+65000;
      while(live()&&session?.id===current&&Date.now()<until){
        const reply=await request('remote/files/result?id='+current+'&seq='+queued.seq,undefined,{signal});
        if(reply.status==='done'){if(!reply.result?.ok)throw new Error(reply.result?.message||'Transfert refusé.');return reply.result;}
        await new Promise(resolve=>setTimeout(resolve,150));
      }
      throw new Error('Transfert interrompu.');
    }
    async function fileOperation(action){
      if(fileBusy||!session)return;fileBusy=true;fileControls();
      try{await action();}catch(error){if(live())find('#wgFilesStatus').textContent=error.message;}finally{fileBusy=false;if(live())fileControls();}
    }
    async function listFiles(path=filesPath){await fileOperation(async()=>{drawFiles(await fileCommand({action:'list',path}));});}
    async function downloadFile(path){await fileOperation(async()=>{
      const resource=await fileCommand({action:'download',path}),parts=[];let offset=0;
      try{while(offset<resource.total){const chunk=await fileCommand({action:'read',handle:resource.handle,offset}),bytes=Uint8Array.from(atob(chunk.data),c=>c.charCodeAt(0));if(!bytes.length||offset+bytes.length>resource.total)throw new Error('Transfert incomplet.');parts.push(bytes);offset+=bytes.length;find('#wgFilesStatus').textContent='Réception : '+Math.round(offset/Math.max(1,resource.total)*100)+' %';}
        const url=URL.createObjectURL(new Blob(parts)),link=document.createElement('a');link.href=url;link.download=resource.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);find('#wgFilesStatus').textContent='Téléchargement terminé.';
      }finally{await fileCommand({action:'close',handle:resource.handle}).catch(()=>{});}
    });}
    async function uploadFiles(files){await fileOperation(async()=>{
      if(files.length>2000)throw new Error('Maximum 2 000 fichiers par envoi.');
      for(const file of files){
        if(file.size>64*1024*1024)throw new Error('Maximum 64 Mo par fichier.');
        const resource=await fileCommand({action:'upload',path:fileJoin(filesPath,file.webkitRelativePath||file.name),total:file.size});
        try{for(let offset=0;offset<file.size;offset+=128*1024){const bytes=new Uint8Array(await file.slice(offset,offset+128*1024).arrayBuffer());let binary='';for(let start=0;start<bytes.length;start+=16000)binary+=String.fromCharCode(...bytes.subarray(start,start+16000));await fileCommand({action:'write',handle:resource.handle,offset,data:btoa(binary)});find('#wgFilesStatus').textContent=file.name+' : '+Math.round(Math.min(file.size,offset+bytes.length)/Math.max(1,file.size)*100)+' %';}
          await fileCommand({action:'finish',handle:resource.handle});
        }catch(error){await fileCommand({action:'close',handle:resource.handle}).catch(()=>{});throw error;}
      }
      drawFiles(await fileCommand({action:'list',path:filesPath}));find('#wgFilesStatus').textContent=files.length+' fichier(s) envoyé(s).';
    });}
    find('#wgFilesRefresh').onclick=()=>listFiles();
    find('#wgFilesUploadForm').onsubmit=event=>{event.preventDefault();uploadFiles([...find('#wgFilesUpload').files]);};
    const folderLabel=document.createElement('label');folderLabel.textContent='Envoyer un dossier';const folderInput=document.createElement('input');folderInput.type='file';folderInput.webkitdirectory=true;folderInput.multiple=true;folderInput.onchange=()=>uploadFiles([...folderInput.files]);folderLabel.append(folderInput);filesPane.append(folderLabel);
    function terminalControls(connected){
      find('#wgTerminalCommand').disabled=!connected||terminalBusy||terminalSubmitting;
      find('#wgTerminalRun').disabled=!connected||terminalBusy||terminalSubmitting;
      find('#wgTerminalCancel').disabled=!connected||!terminalBusy||terminalSubmitting;
    }
    function terminalView(result){
      terminalSequence=Math.max(terminalSequence,result.sequence||0);
      const commands=result.commands||[],last=commands.at(-1);terminalBusy=!!last&&['queued','running'].includes(last.status);
      find('#wgTerminalShell').textContent=result.info?.shell||'Terminal distant';find('#wgTerminalCwd').textContent=last?.cwd||result.info?.cwd||'';
      terminalControls(result.status==='active');
      const fingerprint=JSON.stringify([result.status,commands.map(item=>[item.seq,item.revision,item.status,item.cancelRequested])]);if(fingerprint===terminalFingerprint)return;terminalFingerprint=fingerprint;
      const output=find('#wgTerminalOutput'),atBottom=output.scrollHeight-output.scrollTop-output.clientHeight<80,fragment=document.createDocumentFragment();
      if(!commands.length){const empty=document.createElement('p');empty.className='remote-terminal-empty';empty.textContent=result.status==='active'?'Terminal connecté. Saisis ta première commande ci-dessous.':'Connexion au terminal distant…';fragment.append(empty);}
      for(const item of commands){
        const article=document.createElement('article'),prompt=document.createElement('pre');prompt.className='remote-terminal-prompt';prompt.textContent=(result.info?.shell==='PowerShell'?'PS> ':'$ ')+item.command;article.append(prompt);
        for(const channel of ['stdout','stderr'])if(item[channel]){const content=document.createElement('pre');content.className='remote-terminal-'+channel;content.textContent=item[channel];article.append(content);}
        const outcome=document.createElement('p');outcome.className='remote-terminal-outcome';outcome.dataset.status=item.status;
        outcome.textContent=item.cancelRequested&&terminalBusy?'Interruption demandée…':({queued:'En attente de l’agent…',running:'Exécution en cours…',completed:'Terminée',failed:'Échec',cancelled:'Interrompue'})[item.status]||item.status;
        if(item.reason==='timeout')outcome.textContent+=' · Limite de 60 secondes atteinte';if(item.reason==='output-limit')outcome.textContent+=' · Limite de sortie atteinte (65 536 caractères)';if(item.exitCode!==null&&item.exitCode!==undefined)outcome.textContent+=' · Code de sortie '+item.exitCode;
        article.append(outcome);fragment.append(article);
      }
      output.replaceChildren(fragment);if(atBottom)output.scrollTop=output.scrollHeight;
    }
    function status(value,error=false){if(live()){find('#wgRemoteStatus').textContent=value;find('#wgRemoteStatus').classList.toggle('is-error',error);}}
    function phase(value){root.dataset.phase=value;find('#wgRemoteSession').hidden=!session;find('.remote-explanation').hidden=!!session;find('#wgRemoteConnect').hidden=!!session;find('#wgRemoteSessionState').textContent=({requested:'Connexion demandée',preparing:'Préparation du poste',active:terminalMode()?'Terminal connecté':'Session active',connecting:'Réception du bureau'})[value]||'';modeLayout();}
    function enableInput(value){for(const id of ['wgRemoteControl','wgRemoteFullscreen','wgRemoteText','wgRemoteSendText'])find('#'+id).disabled=!value||!controlling&&['wgRemoteText','wgRemoteSendText'].includes(id);drawFilesEnabled(value);}
    function drawFilesEnabled(value){find('#wgFilesUpload').disabled=!value;find('#wgFilesUploadSend').disabled=!value||!find('#wgFilesUpload')?.files?.length;find('#wgFilesRefresh').disabled=!value;}
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
      terminalControls(false);terminalBusy=false;terminalSubmitting=false;const canvas=find('#wgRemoteCanvas');canvas.width=1;canvas.height=1;canvas.hidden=true;find('#wgRemoteWaiting').hidden=false;phase('ready');
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
      const compatible=agent?.capabilities?.includes(filesMode()?'remote-files-v1':terminalMode()?'remote-terminal-v1':'remote-desktop-v1');
      find('#wgRemoteConnect').disabled=!!session||ending||starting||!agent?.online||!compatible||!!window.WolfGuardAccess&&!WolfGuardAccess.can('remote.write');
      find('#wgRemoteHint').textContent=!agent?'Choisis le poste dans Agents.':!agent.online?'Démarre l’agent sur le poste.':!compatible?'Mets à jour l’agent depuis Agents.':'';
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
            if(filesMode()){phase(result.status);fileControls();if(result.status==='active'&&!filesInitialized){filesInitialized=true;listFiles();}return;}
            if(terminalMode()){phase(result.status);terminalView(result);return;}
            if(result.status!=='active')phase(result.status);else if(lastImage===0)phase('connecting');
            if(result.frame&&result.revision!==revision){await image(result.frame,current);revision=result.revision;}
            if(lastImage&&Date.now()-lastImage>10000)await finish('Le flux du bureau a été interrompu. Reconnecte la session.',true);
          }finally{viewBusy=false;}
        }
      }catch(error){if(live()){if(session)await finish('Connexion interrompue. La session a été arrêtée.',true);else{find('#wgRemoteConnect').disabled=true;status(error.message,true);}}}
      finally{polling=false;if(live()){clearTimeout(timer);timer=setTimeout(poll,session?Math.max(0,(terminalMode()||filesMode()?500:40)-(Date.now()-started)):3500);}}
    }
    find('#wgRemoteConnect').onclick=async()=>{
      if(!agent||session||ending||starting)return;starting=true;modeLayout();find('#wgRemoteConnect').disabled=true;status('Envoi de la demande…');
      try{const chosen=(await workspaceAgents.snapshot()).selected;if(chosen?.id!==agent.id)throw new Error('Le poste a changé. Vérifie le poste sélectionné avant de te connecter.');
        const result=await request('remote/start',{agentId:agent.id,...(filesMode()?{mode:'files'}:terminalMode()?{mode:'terminal'}:{})},{signal});if(!live()){request('remote/stop',{id:result.id}).catch(()=>{});return;}
        session={id:result.id,expiresAt:result.expiresAt};filesInitialized=false;filesPath='';terminalSequence=0;terminalBusy=false;terminalFingerprint='';terminalSubmitting=false;terminalControls(false);find('#wgTerminalOutput').replaceChildren();sequence=0;revision=-1;lastImage=0;events=[];controlling=true;find('#wgRemoteControl').setAttribute('aria-pressed','true');find('#wgRemoteControl').textContent='Souris et clavier activés';phase('requested');status(filesMode()?'Connexion du transfert de fichiers…':terminalMode()?'Ouverture du terminal sur le poste associé…':agent.platform==='win32'?'Connexion au poste associé…':'Accepte la demande sur le poste distant pour démarrer.');clearTimeout(timer);poll();
      }catch(error){if(live()){status(error.message,true);}}
      finally{starting=false;if(live()){modeLayout();await refreshAgent(true).catch(()=>{find('#wgRemoteConnect').disabled=true;});}}
    };
    find('#wgRemoteDisconnect').onclick=()=>finish('Session déconnectée.');
    for(const mode of ['Desktop','Terminal','Files'])find('#wgRemoteMode'+mode).onclick=()=>{if(session||ending||starting)return;selectedMode=mode==='Terminal'?'terminal':mode==='Files'?'files':'desktop';modeLayout();if(filesMode()&&session)listFiles();refreshAgent(true).catch(error=>status(error.message,true));};
    find('#wgTerminalForm').onsubmit=async event=>{
      event.preventDefault();if(!session||!terminalMode()||root.dataset.phase!=='active'||terminalBusy||terminalSubmitting)return;
      const input=find('#wgTerminalCommand'),command=input.value;if(!command.trim())return;
      const current=session.id,seq=terminalSequence+1;terminalSubmitting=true;terminalControls(true);
      try{await request('remote/terminal/command',{id:current,seq,command},{signal});if(!live()||session?.id!==current)return;terminalSequence=seq;terminalBusy=true;commandHistory.push(command);if(commandHistory.length>50)commandHistory.shift();historyIndex=commandHistory.length;input.value='';status('Commande envoyée au poste.');}
      catch(error){if(live()&&session?.id===current)status(error.message,true);}
      finally{terminalSubmitting=false;if(live()&&session?.id===current)terminalControls(true);}
    };
    find('#wgTerminalCancel').onclick=async()=>{if(!session||!terminalBusy)return;const current=session.id;find('#wgTerminalCancel').disabled=true;try{await request('remote/terminal/cancel',{id:current,seq:terminalSequence},{signal});if(live()&&session?.id===current)status('Interruption de la commande demandée.');}catch(error){if(live())status(error.message,true);}};
    find('#wgTerminalCommand').onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();find('#wgTerminalForm').requestSubmit();}else if(['ArrowUp','ArrowDown'].includes(event.key)&&!event.currentTarget.value.includes('\n')){event.preventDefault();historyIndex=Math.max(0,Math.min(commandHistory.length,historyIndex+(event.key==='ArrowUp'?-1:1)));event.currentTarget.value=commandHistory[historyIndex]||'';}};
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
    modeLayout();
    if(workspaceAgents.available())poll();else await refreshAgent(true);
  }
  return {render,reset,preferMode};
})();
window.remoteDesktopWorkspace=remoteDesktopWorkspace;
