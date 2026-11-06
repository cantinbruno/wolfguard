'use strict';
(async()=>{
  const status=document.querySelector('#phoneStatus'),panel=document.querySelector('#phoneRequest');
  if(window.top!==window.self)return;
  window.addEventListener('hashchange',()=>location.reload());
  const match=/^#request=([a-f0-9]{32})&device=([a-f0-9]{32})$/.exec(location.hash),id=match?.[1],deviceId=match?.[2];
  if(!id){status.textContent='Aucune connexion à valider. Pour associer ce téléphone, ouvre ton lien privé WolfGuard puis Paramètres → Sécurité.';return;}
  try{
    const request=await WolfGuardPhone.inspect(id,deviceId);request.deviceId=deviceId;
    document.querySelector('#phoneNumber').textContent=request.displayCode;
    document.querySelector('#phoneDetails').textContent=new Date(request.createdAt).toLocaleString('fr-FR')+' · '+request.browser;
    status.textContent='Une connexion attend ton accord.';panel.hidden=false;
    let busy=false;
    const decide=async decision=>{
      if(busy)return;busy=true;panel.querySelectorAll('button').forEach(button=>button.disabled=true);
      try{await WolfGuardPhone.decide(request,decision);history.replaceState(null,'',location.pathname);panel.hidden=true;status.textContent=decision==='approve'?'Connexion approuvée. Tu peux revenir sur ton ordinateur.':'Connexion refusée.';}
      catch(error){status.textContent=error.message;busy=false;panel.querySelectorAll('button').forEach(button=>button.disabled=false);}
    };
    document.querySelector('#phoneApprove').onclick=()=>decide('approve');document.querySelector('#phoneDeny').onclick=()=>decide('deny');
    setTimeout(()=>{if(!panel.hidden){panel.hidden=true;status.textContent='La demande a expiré. Recommence la connexion sur ton ordinateur.';}},Math.max(0,request.expiresAt-Date.now()));
  }catch(error){status.textContent=error.message;}
})();
