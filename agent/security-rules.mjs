// Read-only Windows evidence is evaluated separately for deterministic tests.
export function evaluateSecurity(data={},now=Date.now()) {
  const results=[],warnings=[];
  const host=data.host?.hostname||'Poste de l’agent';
  const add=(checkId,title,status,severity,detail,recommendation='',reference='')=>results.push({address:'127.0.0.1',hostname:String(host),port:null,transport:'AUDIT',source:'agent-security',checkId,title,status,severity,detail:String(detail),recommendation,reference});
  const unknown=(id,title)=>add(id,title,'notchecked','info','Lecture indisponible ou droits insuffisants.','Relancer avec les droits adaptés ou vérifier le contrôle manuellement.');
  if(data.host?.available)add('inventory','Système observé','info','info',[data.host.os,data.host.version,'Build '+data.host.build,...(data.hotfixes?.items||[]).slice(0,5).map(x=>x.id+' · '+x.date)].filter(Boolean).join(' · '));
  else unknown('inventory','Système observé');
  if(data.firewall?.available&&data.firewall.profiles?.length)for(const profile of data.firewall.profiles)add('firewall-'+profile.name,'Pare-feu · '+profile.name,profile.enabled===true?'passed':profile.enabled===false?'issue':'notchecked','high','Enabled = '+String(profile.enabled),'Activer ce profil de pare-feu et vérifier les exceptions nécessaires.','https://learn.microsoft.com/powershell/module/netsecurity/get-netfirewallprofile');
  else unknown('firewall','Pare-feu Windows');
  if(data.defender?.available){
    const d=data.defender,passive=/passive|edr block/i.test(d.mode||'');
    add('defender-realtime','Protection Microsoft Defender',passive?'notchecked':d.realtime===true?'passed':d.realtime===false?'issue':'notchecked','high','Mode : '+(d.mode||'non fourni')+' · Protection temps réel : '+String(d.realtime),passive?'Vérifier la protection antivirus principale : Defender fonctionne dans un mode secondaire.':'Vérifier la protection antivirus principale et les politiques Defender.','https://learn.microsoft.com/powershell/module/defender/get-mpcomputerstatus');
    const age=Number(d.signatureAge),known=d.signatureAge!==null&&d.signatureAge!==undefined&&Number.isFinite(age)&&age>=0;
    add('defender-signatures','Signatures Microsoft Defender',passive||!known?'notchecked':age>7?'issue':'passed','medium',known?'Âge des signatures : '+age+' jour(s).':'Date des signatures indisponible.','Mettre à jour les signatures de l’antivirus principal.');
  }else unknown('defender','Protection Microsoft Defender');
  if(data.smb?.available)add('smb1','Protocole SMBv1 serveur',data.smb.enabled===false?'passed':data.smb.enabled===true?'issue':'notchecked','high','EnableSMB1Protocol = '+String(data.smb.enabled),'Désactiver SMBv1 après vérification des dépendances.','https://learn.microsoft.com/en-us/windows-server/storage/file-server/troubleshoot/detect-enable-and-disable-smbv1-v2-v3');
  else unknown('smb1','Protocole SMBv1 serveur');
  if(data.rdp?.available){const r=data.rdp;add('rdp-nla','Authentification RDP (NLA)',r.enabled===false||r.nla===1?'passed':r.enabled===true&&r.nla===0?'issue':'notchecked','high','RDP activé : '+String(r.enabled)+' · UserAuthentication = '+String(r.nla),'Si RDP est nécessaire, imposer NLA et limiter les accès.');}else unknown('rdp-nla','Authentification RDP (NLA)');
  if(data.uac?.available)add('uac','Contrôle de compte utilisateur',data.uac.value===1?'passed':data.uac.value===0?'issue':'notchecked','high','EnableLUA = '+String(data.uac.value),'Activer UAC selon les politiques de la machine.');else unknown('uac','Contrôle de compte utilisateur');
  if(data.installer?.available)add('installer-elevation','Installations avec privilèges élevés',data.installer.machine===1?'issue':data.installer.machine===0||data.installer.machine===null?'passed':'notchecked','high','AlwaysInstallElevated : machine = '+String(data.installer.machine)+' · utilisateur = '+String(data.installer.user),'Désactiver la stratégie AlwaysInstallElevated.','https://learn.microsoft.com/en-us/windows/win32/msi/alwaysinstallelevated');else unknown('installer-elevation','Installations avec privilèges élevés');
  for(const [field,label] of [['tls10','TLS 1.0'],['tls11','TLS 1.1']]){const value=data.tls?.[field];add(field,label+' · serveur Schannel',!data.tls?.available?'notchecked':value===1?'issue':value===0?'passed':'notchecked','medium','Enabled = '+String(value??'valeur par défaut non évaluée'),'Vérifier les dépendances et désactiver explicitement les versions TLS héritées.');}
  const u=data.updates;
  if(u?.available){
    const pending=(u.pending||[]).filter(row=>['critical','important','moderate','low'].includes(String(row.severity).toLowerCase()));
    const searched=Date.parse(u.lastSearch||''),fresh=Number.isFinite(searched)&&now>=searched&&now-searched<7*86400000;
    if(!pending.length)add('updates-cache','Correctifs de sécurité (cache Windows Update)',fresh?'passed':'notchecked','info','Dernière recherche réussie : '+(u.lastSearch||'non fournie')+' · Aucun correctif de sécurité listé dans ce cache.','Effectuer une recherche Windows Update récente pour actualiser le cache.');
    for(const update of pending.slice(0,200))add('update-'+((update.ids||[]).join('-')||String(update.title||'correctif').slice(0,80)),String(update.title||'Correctif de sécurité applicable'),'issue',/critical/i.test(update.severity)?'critical':/important/i.test(update.severity)?'high':'medium','Cache Windows Update · '+(update.ids||[]).join(', ')+' · MSRC : '+update.severity+' · Recherche : '+(u.lastSearch||'date inconnue'),'Vérifier et installer ce correctif via Windows Update ou la gestion de correctifs.','https://learn.microsoft.com/en-us/windows/deployment/update/how-windows-update-works');
    if(!fresh)warnings.push('Le cache Windows Update n’a pas de recherche réussie récente (moins de sept jours). Les correctifs manquants peuvent être incomplets.');
    if(pending.length>200)warnings.push('Seuls les 200 premiers correctifs applicables sont détaillés.');
  }else unknown('updates-cache','Correctifs de sécurité (cache Windows Update)');
  warnings.push('Audit local de configuration et du cache Windows Update. Aucun correctif installé, aucune exploitation ni recherche de CVE réseau.');
  return {results,warnings};
}
