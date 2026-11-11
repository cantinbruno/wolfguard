'use strict';
(()=>{
  const button=document.querySelector('#agentDownloadButton'),status=document.querySelector('#agentDownloadStatus'),expiry=document.querySelector('#agentDownloadExpiry');
  let timer=0,generation=0;
  function initialize(){
    clearInterval(timer);const current=++generation;let busy=false;
    button.disabled=true;button.onclick=null;status.textContent='';expiry.textContent='';
    try{
      if(window.top!==window.self)throw new Error('Ouvre ce lien dans son propre onglet.');
      const params=new URLSearchParams(location.hash.slice(1)),code=params.get('code'),platform=params.get('platform'),expiresAt=Number(params.get('expires'));
      if([...params.keys()].length!==3||!/^[a-f0-9]{32}$/.test(code||'')||!Object.hasOwn(WolfGuardAgentInstaller.platforms,platform)||!Number.isSafeInteger(expiresAt)||expiresAt<=0)throw new Error('Lien invalide. Demande un nouveau lien depuis Agents → Ajouter un poste.');
      const name=WolfGuardAgentInstaller.platforms[platform].name;
      document.querySelector('#agentDownloadDescription').textContent='Installe WolfGuard sur ce poste '+name+'. L’association à l’espace se fait automatiquement.';
      document.querySelector('#agentDownloadInstruction').textContent=platform==='win32'?'Ouvre Installer-WolfGuard.cmd.': 'Dans le terminal, lance sh Installer-WolfGuard.sh.';
      function update(){
        const seconds=Math.max(0,Math.ceil((expiresAt-Date.now())/1000));
        button.disabled=busy||!seconds;button.textContent=busy?'Préparation…':'Télécharger pour '+name;
        expiry.textContent=seconds?'Lien valable encore '+Math.floor(seconds/60)+' min '+String(seconds%60).padStart(2,'0')+' s':'Lien expiré';
        if(!seconds)status.textContent='Demande un nouveau lien depuis Agents → Ajouter un poste.';
        return seconds>0;
      }
      button.onclick=async()=>{
        if(busy||!update())return;
        busy=true;status.textContent='';update();
        try{
          const installer=await WolfGuardAgentInstaller.prepare(platform,code);
          if(current!==generation||Date.now()>=expiresAt)return;
          WolfGuardAgentInstaller.download(installer);status.textContent='Téléchargement prêt. Exécute l’installateur avant l’expiration du lien.';
        }catch(error){if(current===generation)status.textContent=error.message;}
        finally{if(current===generation){busy=false;update();}}
      };
      if(update())timer=setInterval(update,1000);
    }catch(error){button.disabled=true;status.textContent=error.message;}
  }
  window.addEventListener('hashchange',initialize);initialize();
})();
