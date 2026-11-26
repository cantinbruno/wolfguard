'use strict';

globalThis.WolfGuardAgentRemoval=(()=>{
  const states=new Map();
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function reason(agent){
    if(!agent||agent.local)return 'Choisis un poste associé.';
    const cloud=typeof WolfGuardCloud==='undefined'?null:WolfGuardCloud;
    if(!cloud?.hasSession()||!state.vaultKey)return 'Connecte-toi pour désinstaller un agent.';
    if(!['agents.write','agents.revoke','remote.terminal'].every(right=>cloud.can(right)&&(!globalThis.WolfGuardAccess||WolfGuardAccess.can(right)&&WolfGuardAccess.canAgent(agent.id,right))))return 'Droits d’écriture requis sur Agents et Prise en main pour ce poste.';
    if(!['win32','linux','darwin'].includes(agent.platform))return 'Système non pris en charge.';
    if(!agent.online)return 'Le poste doit être connecté pour recevoir la commande.';
    if(!agent.capabilities?.includes('remote-consent-v1')||!agent.capabilities?.includes('remote-terminal-v1'))return 'Mets l’agent à jour pour autoriser la désinstallation à distance.';
    if(states.get(agent.id)?.status==='launched')return 'Une désinstallation a déjà été lancée. Vérifie son résultat sur le poste.';
    if(states.get(agent.id)?.status==='unknown')return 'Vérifie le résultat sur le poste avant de recharger cette page pour réessayer.';
    if(states.get(agent.id)?.running)return 'Une désinstallation est déjà en cours.';
    if(globalThis.WolfGuardAgentUpdates?.state(agent.id)?.running)return 'Une mise à jour est en cours sur ce poste. Attends sa fin.';
    return '';
  }
  async function start(agent,{onChange=()=>{}}={}){
    const unavailable=reason(agent);if(unavailable)throw new Error(unavailable);
    if(!/^[a-f0-9]{32}$/.test(agent.id||''))throw new Error('Poste non associé.');
    const cloud=WolfGuardCloud,key=state.vaultKey,userId=cloud.currentUser()?.id;
    const sameSession=()=>state.vaultKey===key&&cloud.hasSession()&&cloud.currentUser()?.id===userId;
    const value={running:true,status:'preparing',message:'Connexion au poste…'};states.set(agent.id,value);
    const change=(status,message)=>{Object.assign(value,{status,message});onChange(value);};
    let session=null,submitted=false;
    const request=(path,body)=>{
      if(!sameSession())throw new Error('Session fermée.');
      if(!['agents.write','agents.revoke','remote.terminal'].every(right=>cloud.can(right)&&(!globalThis.WolfGuardAccess||WolfGuardAccess.can(right)&&WolfGuardAccess.canAgent(agent.id,right))))throw new Error('Les droits nécessaires ne sont plus accordés.');
      return cloud.agentRequest(path,body);
    };
    try{
      const current=(await request('agents')).agents?.find(item=>item.id===agent.id);
      if(!current?.online||!current.capabilities?.includes('remote-consent-v1')||!current.capabilities?.includes('remote-terminal-v1')||current.platform!==agent.platform)throw new Error('Le poste n’est plus disponible pour cette désinstallation.');
      const command=WolfGuardUninstallCommand.command(current.platform,location.href);
      if(command.length>8000)throw new Error('Commande de désinstallation trop volumineuse.');
      session=await request('remote/start',{agentId:agent.id,mode:'terminal'});change('preparing','En attente de l’accord de l’utilisateur sur le poste…');
      let ready=false;
      for(let attempt=0;attempt<100;attempt++){
        const remote=await request('remote/session?id='+session.id);
        if(remote.status==='active'){ready=true;break;}
        if(!['requested','preparing'].includes(remote.status))throw new Error(remote.message||'Le poste n’a pas accepté la connexion.');
        await sleep(750);
      }
      if(!ready)throw new Error('Le poste ne répond pas.');
      // Once submitted, a lost reply must never be presented as a safe retry.
      submitted=true;await request('remote/terminal/command',{id:session.id,seq:1,command});
      change('preparing','Vérification du désinstalleur et des droits sur le poste…');
      for(let attempt=0;attempt<80;attempt++){
        const remote=await request('remote/session?id='+session.id),result=remote.commands?.find(item=>item.seq===1);
        if(result&&['failed','cancelled'].includes(result.status)){
          submitted=false;throw new Error(result.stderr?.trim().slice(0,500)||'Le poste a refusé la désinstallation.');
        }
        if(result?.status==='completed'){
          if(!result.stdout?.split(/\r?\n/).includes('WOLFGUARD_UNINSTALL_READY'))throw new Error('Le lancement n’a pas été confirmé.');
          change('launched','Désinstallation lancée sur « '+agent.name+' ». La suppression continue sur le poste.');
          return value;
        }
        if(!['active','preparing'].includes(remote.status))throw new Error(remote.message||'La connexion a été interrompue.');
        await sleep(750);
      }
      throw new Error('Le poste n’a pas confirmé le lancement.');
    }catch(error){
      change(submitted?'unknown':'failed',submitted?'Résultat non confirmé. Vérifie l’agent sur le poste avant de réessayer. '+error.message:error.message);
      return value;
    }finally{
      value.running=false;
      if(session&&sameSession())await cloud.agentRequest('remote/stop',{id:session.id}).catch(()=>{});
      onChange(value);
    }
  }
  return Object.freeze({reason,start,state:id=>states.get(id)||null});
})();
