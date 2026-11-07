export const ENDPOINT_COMMANDS=['enable-protection','quick-scan','refresh'];
export const DEFAULT_ENDPOINT_POLICY=Object.freeze({mode:'protect',realtime:true,firewall:true});
const text=(value,max=500)=>typeof value==='string'?value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').slice(0,max):'';
const state=value=>['enabled','disabled','unknown','unsupported','passive'].includes(value)?value:'unknown';
export function endpointPolicy(value){
  if(!value||!['protect','observe'].includes(value.mode)||typeof value.realtime!=='boolean'||typeof value.firewall!=='boolean')throw new Error('Politique de protection invalide.');
  return {mode:value.mode,realtime:value.realtime,firewall:value.firewall};
}
export function endpointSnapshot(value,now=Date.now()){
  if(!value||!Number.isSafeInteger(value.collectedAt)||value.collectedAt>now+300000||value.collectedAt<now-172800000||!Array.isArray(value.events)||value.events.length>100)throw new Error('Télémétrie de protection invalide ou périmée.');
  const statuses=new Set(['alert','blocked','quarantined','removed','cleaned','failed','info']);
  const events=value.events.map(row=>{
    if(!row||typeof row.id!=='string'||!row.id||row.id.length>200||!statuses.has(row.status)||!Number.isSafeInteger(row.occurredAt)||row.occurredAt>now+300000||row.occurredAt<0)throw new Error('Événement de protection invalide.');
    return {id:row.id,occurredAt:row.occurredAt,provider:text(row.provider,80),title:text(row.title,180)||'Événement de protection',detail:text(row.detail,1800),resource:text(row.resource,700),status:row.status,severity:['critical','high','medium','low','info'].includes(row.severity)?row.severity:'medium'};
  });
  return {version:1,collectedAt:value.collectedAt,platform:['win32','linux','darwin'].includes(value.platform)?value.platform:'unknown',provider:text(value.provider,120),realtime:state(value.realtime),antivirus:state(value.antivirus),firewall:state(value.firewall),signatures:state(value.signatures),signatureVersion:text(value.signatureVersion,80),canEnforce:value.canEnforce===true,supported:value.supported===true,warnings:Array.isArray(value.warnings)?value.warnings.slice(0,8).map(item=>text(item,250)):[],activeThreats:Number.isSafeInteger(value.activeThreats)&&value.activeThreats>=0?Math.min(10000,value.activeThreats):events.filter(row=>['alert','failed'].includes(row.status)).length,appliedRevision:Number.isSafeInteger(value.appliedRevision)&&value.appliedRevision>=0?value.appliedRevision:0,events};
}
export function endpointHealth(snapshot,fresh=true){
  if(!snapshot||!fresh)return 'unknown';
  if(!snapshot.supported)return 'unsupported';
  if(snapshot.activeThreats>0)return 'attention';
  if([snapshot.realtime,snapshot.antivirus,snapshot.firewall].some(value=>value==='disabled')||snapshot.signatures==='disabled')return 'attention';
  if(snapshot.realtime==='enabled'&&snapshot.antivirus==='enabled'&&snapshot.firewall==='enabled'&&snapshot.signatures==='enabled')return 'protected';
  return 'unknown';
}
