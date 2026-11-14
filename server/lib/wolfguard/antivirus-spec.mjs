const idPattern=/^[a-f0-9]{32}$/;
export const ANTIVIRUS_COMMANDS=['av-install','av-update','av-scan','av-pause','av-resume'];
export function antivirusCommand(value){
  if(ANTIVIRUS_COMMANDS.includes(value))return {action:value};
  if(typeof value!=='string')return null;
  const match=/^(av-restore|av-delete):([a-f0-9]{32})$/.exec(value);
  return match?{action:match[1],id:match[2]}:null;
}
const text=(value,max)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max):'';
const number=value=>Number.isSafeInteger(value)&&value>=0?value:0;
export function antivirusSnapshot(value){
  if(value==null)return null;
  if(value.version!==1||value.capable!==true)throw new Error('État antivirus WolfGuard invalide.');
  const states=['missing','installing','updating','ready','scanning','paused','error'];
  if(!states.includes(value.state))throw new Error('État du moteur antivirus invalide.');
  const quarantine=Array.isArray(value.quarantine)?value.quarantine:[];
  if(quarantine.length>100)throw new Error('Liste de quarantaine trop longue.');
  return {version:1,capable:true,installed:value.installed===true,enabled:value.enabled===true,state:value.state,commandId:idPattern.test(value.commandId||'')?value.commandId:'',engineVersion:text(value.engineVersion,80),signatureVersion:text(value.signatureVersion,80),signatureAt:number(value.signatureAt),lastScanAt:number(value.lastScanAt),lastUpdateAt:number(value.lastUpdateAt),scannedFiles:number(value.scannedFiles),pendingFiles:number(value.pendingFiles),errors:number(value.errors),quarantineTotal:Math.max(quarantine.length,Math.min(100,number(value.quarantineTotal))),message:text(value.message,700),coverage:'reactive',scope:Array.isArray(value.scope)?value.scope.slice(0,5).map(p=>text(p,700)):[],quarantine:quarantine.map(row=>{
    if(!idPattern.test(row.id)||!['quarantined','detected','restored'].includes(row.status))throw new Error('Entrée de quarantaine invalide.');
    return {id:row.id,status:row.status,path:text(row.path,700),threat:text(row.threat,300),size:number(row.size),detectedAt:number(row.detectedAt)};
  })};
}
