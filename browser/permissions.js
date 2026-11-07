// Deny by default. This model is also bundled for the browser; API checks remain authoritative.
export const PERMISSION_GROUPS=[
  ['library','Bibliothèque',[['read','Consulter'],['create','Créer des fiches et dossiers'],['edit','Modifier'],['delete','Supprimer et restaurer'],['export','Exporter']]],
  ['vault','Coffre-fort',[['read','Consulter les fiches'],['secrets','Déchiffrer les secrets'],['create','Créer'],['edit','Modifier'],['delete','Supprimer et restaurer'],['export','Exporter'],['all','Accéder aux coffres de tous les utilisateurs']]],
  ...['passive','active','map','vulnerability'].map(id=>['scan.'+id,({passive:'Scan passif',active:'Scan actif',map:'Cartographie',vulnerability:'Vulnérabilités'})[id],[['read','Consulter les rapports'],['run','Lancer'],['cancel','Arrêter'],['delete','Supprimer les rapports'],['export','Exporter']]]),
  ['remote','Prise en main',[['desktop','Bureau distant'],['terminal','Terminal distant']]],
  ['agents','Agents',[['read','Voir les postes autorisés'],['pair','Associer des postes'],['revoke','Révoquer des postes']]],
  ['edr','Protection des postes',[['read','Consulter les protections et alertes'],['acknowledge','Acquitter les alertes'],['manage','Gérer les politiques et actions de protection']]],
  ['ai','Chatbot IA',[['use','Discuter avec le modèle local des postes autorisés']]],
  ['tools','Outils',[['use','Utiliser les outils locaux']]],
  ['users','Comptes',[['read','Consulter les comptes'],['manage','Inviter et gérer les comptes membres'],['permissions','Attribuer les profils et les droits']]],
  ['access','Connexions',[['read','Consulter les connexions'],['manage','Gérer les connexions et blocages IP']]]
];
export const PERMISSION_KEYS=PERMISSION_GROUPS.flatMap(([group,,actions])=>actions.map(([action])=>group+'.'+action));
const legacy=PERMISSION_KEYS.filter(key=>!key.startsWith('users.')&&!key.startsWith('access.')&&!key.startsWith('ai.')&&!['agents.pair','agents.revoke','vault.all','edr.manage','edr.acknowledge'].includes(key));
const personalVault=legacy.filter(key=>key.startsWith('vault.'));
export const PERMISSION_PROFILES=[
  {id:'none',name:'Aucun accès',description:'Accès accordé explicitement, action par action.',grants:[]},
  {id:'full',name:'Administrateur — accès total',description:'Toute l’application, tous les coffres, tous les comptes et leurs droits. Le propriétaire reste protégé.',grants:[...PERMISSION_KEYS]},
  {id:'reader',name:'Lecture seule',description:'Bibliothèque et rapports en lecture. Coffre personnel complet, sans prise en main.',grants:[...personalVault,...PERMISSION_KEYS.filter(k=>k==='library.read'||/^scan\..+\.read$/.test(k)||k==='agents.read'||k==='tools.use'||k==='edr.read')]},
  {id:'collaborator',name:'Collaborateur',description:'Fiches et coffre-fort, lecture des rapports. Aucun terminal.',grants:legacy.filter(k=>!k.startsWith('remote.')&&(!k.startsWith('scan.')||k.endsWith('.read')))},
  {id:'analyst',name:'Analyste sécurité',description:'Tous les scans et rapports, bibliothèque en lecture, alertes EDR et coffre personnel.',grants:['edr.acknowledge',...personalVault,...legacy.filter(k=>k.startsWith('scan.')||['library.read','agents.read','tools.use','edr.read','edr.acknowledge'].includes(k))]},
  {id:'technician',name:'Technicien',description:'Scans, outils, prise en main des postes autorisés et coffre personnel.',grants:[...legacy.filter(k=>!k.startsWith('library.')||k==='library.read'),'edr.acknowledge','edr.manage']},
  {id:'endpoint-manager',name:'Gestionnaire de parc',description:'Postes, politiques de protection et alertes. Aucun accès aux secrets ni au terminal.',grants:['agents.read','agents.pair','agents.revoke','edr.read','edr.acknowledge','edr.manage','tools.use']},
  {id:'legacy',name:'Accès existants',description:'Droits des membres avant la gestion avancée.',grants:legacy}
];
export function profilePolicy(id='reader'){
  const profile=PERMISSION_PROFILES.find(p=>p.id===id);if(!profile)throw new Error('Profil inconnu.');
  return {version:1,profile:id,grants:[...profile.grants],agents:null,scopes:{library:{mode:'all',folders:{},items:{}},vault:{mode:'all',folders:{},items:{}}},expiresAt:null};
}
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(id);
export function normalizePolicy(input){
  if(!input||input.version!==1||!Array.isArray(input.grants)||input.grants.length>PERMISSION_KEYS.length||input.grants.some(k=>!PERMISSION_KEYS.includes(k)))throw new Error('Liste de droits invalide.');
  if(input.agents!==null&&(!Array.isArray(input.agents)||input.agents.length>200||input.agents.some(id=>!/^[a-f0-9]{32}$/.test(id))))throw new Error('Liste de postes invalide.');
  const scopes={};for(const section of ['library','vault']){
    const scope=input.scopes?.[section];if(!scope||!['all','selected'].includes(scope.mode))throw new Error('Périmètre de données invalide.');
    const clean={mode:scope.mode};for(const field of ['folders','items']){
      const rules=scope[field];if(!rules||typeof rules!=='object'||Array.isArray(rules)||Object.keys(rules).length>2000)throw new Error('Règles de dossiers invalides.');
      clean[field]={};for(const [id,level] of Object.entries(rules)){if(!validId(id)||!['deny','read','write'].includes(level)||['__proto__','constructor','prototype'].includes(id))throw new Error('Règle de données invalide.');clean[field][id]=level;}
    }scopes[section]=clean;
  }
  const expiry=input.expiresAt??null;if(expiry!==null&&(!Number.isSafeInteger(expiry)||expiry<1||expiry>8640000000000000))throw new Error('Date de fin invalide.');
  return {version:1,profile:PERMISSION_PROFILES.some(p=>p.id===input.profile)?input.profile:'custom',grants:[...new Set(input.grants)].sort(),agents:input.agents===null?null:[...new Set(input.agents)].sort(),scopes,expiresAt:expiry};
}
export function can(user,key,now=Date.now()){
  if(user?.role==='admin')return true;
  const policy=user?.permissions;if(!policy||policy.expiresAt!==null&&policy.expiresAt<=now)return false;
  return policy.grants.includes(key);
}
export function canAgent(user,id,now=Date.now()){return can(user,'agents.read',now)&&(user.role==='admin'||user.permissions.agents===null||user.permissions.agents.includes(id));}
export function recordSection(record,kind='items'){return kind==='folders'?(record.section==='vault'?'vault':'library'):(record.type==='vault'?'vault':'library');}
export const vaultHomeId=id=>'vault-user-'+id;
export const isVaultHome=id=>typeof id==='string'&&/^vault-user-[a-f0-9]{32}$/.test(id);
export function isInPersonalVault(user,record,kind,folders){
  if(!user?.id)return false;
  const home=vaultHomeId(user.id);if(kind==='folders'&&record.id===home)return true;
  let id=kind==='folders'?record.parentId:record.folderId;const seen=new Set();
  while(id){if(id===home)return true;if(seen.has(id))return false;seen.add(id);const folder=folders.find(row=>row.id===id);if(!folder||recordSection(folder,'folders')!=='vault'||isVaultHome(id))return false;id=folder.parentId;}
  return false;
}
export function recordLevel(user,record,kind,folders,now=Date.now()){
  const section=recordSection(record,kind);if(!can(user,section+'.read',now))return 'deny';if(user.role==='admin')return 'write';
  if(section==='vault'&&!can(user,'vault.all',now)&&!isInPersonalVault(user,record,kind,folders))return 'deny';
  const scope=user.permissions.scopes[section],rules=kind==='items'?scope.items:scope.folders;
  if(own(rules,record.id))return rules[record.id];
  let id=kind==='items'?record.folderId:record.parentId;const seen=new Set([record.id]);
  while(id){if(seen.has(id))return 'deny';seen.add(id);if(own(scope.folders,id))return scope.folders[id];const folder=folders.find(f=>f.id===id);if(!folder||recordSection(folder,'folders')!==section)return 'deny';id=folder.parentId;}
  return scope.mode==='all'?'write':'deny';
}
export function requirePermission(user,key,fail,now){if(!can(user,key,now))fail(403,'Ton compte ne dispose pas du droit « '+key+' ».',{code:'PERMISSION_DENIED'});}
export function canManagePolicy(actor,target){
  if(actor?.role==='admin')return true;
  const ownPolicy=actor?.permissions;if(!ownPolicy||target.grants.some(key=>!ownPolicy.grants.includes(key)))return false;
  if(!target.grants.length)return true;
  if(ownPolicy.expiresAt!==null&&(target.expiresAt===null||target.expiresAt>ownPolicy.expiresAt))return false;
  if(ownPolicy.agents!==null&&(target.agents===null||target.agents.some(id=>!ownPolicy.agents.includes(id))))return false;
  for(const section of ['library','vault'])if(target.grants.some(key=>key.startsWith(section+'.'))){
    const a=ownPolicy.scopes[section],b=target.scopes[section];
    if(a.mode==='all'&&!Object.keys(a.folders).length&&!Object.keys(a.items).length)continue;
    // Conservative containment: scopes with exceptions must match exactly.
    // Refuse ambiguous delegation instead of allowing password/MFA takeover.
    if(a.mode!==b.mode)return false;
    for(const kind of ['folders','items']){const entries=Object.entries(a[kind]);if(entries.length!==Object.keys(b[kind]).length||entries.some(([id,level])=>b[kind][id]!==level))return false;}
  }
  return true;
}
