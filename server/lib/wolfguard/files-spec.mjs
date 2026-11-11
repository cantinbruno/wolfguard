export const FILE_CHUNK=128*1024;
export const FILE_LIMIT=64*1024*1024;
const bad=()=>{throw new Error('Transfert invalide.');};
const path=value=>{if(typeof value!=='string'||value.length>1024||/[\x00-\x1f]/.test(value)||value.replace(/\\/g,'/').split('/').some(part=>part==='..'||part==='.'||part.includes(':')&&!/^[A-Za-z]:$/.test(part)))bad();return value;};
const handle=value=>typeof value==='string'&&/^[a-f0-9]{32}$/.test(value)?value:bad();
const number=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max?value:bad();
export function fileCommand(raw){
  if(!raw||typeof raw!=='object')bad();
  if(raw.action==='list'||raw.action==='download')return {action:raw.action,path:path(raw.path)};
  if(raw.action==='upload')return {action:raw.action,path:path(raw.path),total:number(raw.total,FILE_LIMIT)};
  if(raw.action==='read')return {action:raw.action,handle:handle(raw.handle),offset:number(raw.offset,FILE_LIMIT)};
  if(raw.action==='finish'||raw.action==='close')return {action:raw.action,handle:handle(raw.handle)};
  if(raw.action==='write'){
    if(typeof raw.data!=='string'||raw.data.length>Math.ceil(FILE_CHUNK/3)*4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(raw.data))bad();
    if(atob(raw.data).length>FILE_CHUNK)bad();
    return {action:raw.action,handle:handle(raw.handle),offset:number(raw.offset,FILE_LIMIT),data:raw.data};
  }
  bad();
}
export function fileResult(raw){
  if(!raw||typeof raw.ok!=='boolean'||JSON.stringify(raw).length>600000)bad();
  return JSON.parse(JSON.stringify(raw));
}
