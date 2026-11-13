'use strict';

globalThis.WolfGuardAgentUpdates=(()=>{
  const states=new Map(),attempts=new Map();
  let published=null,loadedAt=0,loading=null,automaticRunning=false;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function release(force=false){
    if(!force&&published&&Date.now()-loadedAt<30000)return published;
    if(loading)return loading;
    loading=(async()=>{
      const response=await fetch('downloads/agent-release.json',{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error('Version de l’agent indisponible.');
      const value=WolfGuardUpdateCommand.validateRelease(await response.json());
      published=value;loadedAt=Date.now();return value;
    })();
    try{return await loading;}finally{loading=null;}
  }
  const command=(platform,version)=>WolfGuardUpdateCommand.updateCommand(platform,version,location.href);
  async function start(agent,{onChange=()=>{}}={}){
    const cloud=WolfGuardCloud,old=states.get(agent.id);
    if(old?.running)return;
    const key=state.vaultKey,userId=cloud.currentUser()?.id;
    const sameSession=()=>!!key&&state.vaultKey===key&&cloud.hasSession()&&cloud.currentUser()?.id===userId;
    if(!sameSession())throw new Error('Connecte-toi pour mettre à jour ce poste.');
    if(!/^[a-f0-9]{32}$/.test(agent.id||''))throw new Error('Poste non associé.');
    if(!cloud.can('agents.write')||!cloud.can('remote.write')||!!globalThis.WolfGuardAccess?.canAgent&&(!WolfGuardAccess.canAgent(agent.id,'agents.write')||!WolfGuardAccess.canAgent(agent.id,'remote.write')))throw new Error('Les droits Agents et Prise en main en écriture sont nécessaires.');
    if(!agent.online)throw new Error('Démarre l’agent pour le mettre à jour.');
    if(!agent.capabilities?.includes('remote-terminal-v1'))throw new Error('Installe une première fois l’agent récent sur ce poste.');
    const value={running:true,status:'preparing',message:'Préparation de la mise à jour…'};states.set(agent.id,value);
    const change=(status,message)=>{Object.assign(value,{status,message});onChange(value);};let session=null;
    const request=(path,body)=>{
      if(!sameSession())throw new Error('Session fermée. Vérifie la version du poste après reconnexion.');
      if(!cloud.can('agents.write')||!cloud.can('remote.write')||!!globalThis.WolfGuardAccess?.canAgent&&(!WolfGuardAccess.canAgent(agent.id,'agents.write')||!WolfGuardAccess.canAgent(agent.id,'remote.write')))throw new Error('Les droits de mise à jour ne sont plus accordés.');
      return cloud.agentRequest(path,body);
    };
    try{
      const target=await release(true);value.version=target.version;
      if(agent.version===target.version){change('completed','Agent déjà à jour.');return;}
      const script=command(agent.platform,target);if(script.length>8000)throw new Error('Installateur distant trop volumineux.');
      change('preparing','Connexion au poste…');session=await request('remote/start',{agentId:agent.id,mode:'terminal'});
      let ready=false;
      for(let attempt=0;attempt<60;attempt++){
        const remote=await request('remote/session?id='+session.id);
        if(remote.status==='active'){ready=true;break;}
        if(!['requested','preparing'].includes(remote.status))throw new Error(remote.message||'Le poste n’a pas accepté la mise à jour.');
        await sleep(750);
      }
      if(!ready)throw new Error('Le poste ne répond pas.');
      await request('remote/terminal/command',{id:session.id,seq:1,command:script});change('downloading','Téléchargement et vérification de l’agent…');
      let launched=false;
      for(let attempt=0;attempt<80;attempt++){
        const remote=await request('remote/session?id='+session.id),result=remote.commands?.find(item=>item.seq===1);
        if(result&&['failed','cancelled'].includes(result.status))throw new Error(result.stderr?.trim().slice(0,400)||'La mise à jour a échoué sur le poste.');
        if(result?.status==='completed'){
          if(!result.stdout?.includes('WOLFGUARD_UPDATE_READY'))throw new Error('Le démarrage de l’installateur n’a pas été confirmé.');
          launched=true;break;
        }
        if(!['active','preparing'].includes(remote.status))throw new Error(remote.message||'Connexion de mise à jour interrompue.');
        await sleep(750);
      }
      if(!launched)throw new Error('Téléchargement non confirmé.');
      await request('remote/stop',{id:session.id});session=null;change('restarting','Redémarrage de l’agent et vérification de sa version…');
      for(let attempt=0;attempt<60;attempt++){
        await sleep(2000);const current=(await request('agents')).agents.find(item=>item.id===agent.id);
        if(current?.online&&current.version===target.version){change('completed','Agent mis à jour · '+target.version.slice(0,8));return;}
      }
      throw new Error('La nouvelle version n’a pas été confirmée. Vérifie que le poste est connecté avant de réessayer.');
    }catch(error){change('failed',error.message);}
    finally{value.running=false;if(session&&sameSession())await cloud.agentRequest('remote/stop',{id:session.id}).catch(()=>{});onChange(value);}
  }
  async function automatic(agents,{onChange=()=>{}}={}){
    if(typeof WolfGuardCloud==='undefined')return;
    const allowed=()=>['agents.write','remote.write'].every(right=>WolfGuardCloud.can(right)&&(typeof WolfGuardAccess==='undefined'||WolfGuardAccess.can(right)));
    if(automaticRunning||!state.vaultKey||!WolfGuardCloud.hasSession()||!allowed())return;
    const key=state.vaultKey,userId=WolfGuardCloud.currentUser()?.id;
    const sameSession=()=>state.vaultKey===key&&WolfGuardCloud.hasSession()&&WolfGuardCloud.currentUser()?.id===userId;
    automaticRunning=true;
    try{
      const target=await release();
      for(const agent of agents){
        if(!sameSession()||!allowed())return;
        if(globalThis.WolfGuardAccess?.canAgent&&!['agents.write','remote.write'].every(right=>WolfGuardAccess.canAgent(agent.id,right)))continue;
        const last=attempts.get(agent.id);
        if(agent.local||!agent.online||agent.version===target.version||!Object.hasOwn(WolfGuardUpdateCommand.UPDATE_FILES,agent.platform)||!agent.capabilities?.includes('remote-terminal-v1')||agent.capabilities.includes('auto-update-v1')||states.get(agent.id)?.running||last?.version===target.version&&Date.now()-last.at<15*60000)continue;
        attempts.set(agent.id,{version:target.version,at:Date.now()});
        await start(agent,{onChange});
      }
    }catch{}finally{automaticRunning=false;}
  }
  return Object.freeze({release,command,start,automatic,state:id=>states.get(id)||null});
})();
