export const TERMINAL_OUTPUT=65536,TERMINAL_COMMAND=8000,TERMINAL_TIMEOUT=60000;
export function terminalCommand(value){
  if(typeof value!=='string'||!value.trim()||value.length>TERMINAL_COMMAND||value.includes('\0'))throw new Error('Commande vide, invalide ou trop longue (8 000 caractères maximum).');
  return value;
}
export function terminalResult(value){
  if(!value||!Number.isSafeInteger(value.seq)||value.seq<1||!Number.isSafeInteger(value.revision)||value.revision<1||!['running','completed','failed','cancelled'].includes(value.status)||typeof value.stdout!=='string'||typeof value.stderr!=='string'||value.stdout.length+value.stderr.length>TERMINAL_OUTPUT||typeof value.cwd!=='string'||value.cwd.length>4096||value.exitCode!==null&&!Number.isSafeInteger(value.exitCode)||!['','interrupted','timeout','output-limit'].includes(value.reason))throw new Error('Résultat du terminal invalide.');
  return {seq:value.seq,revision:value.revision,status:value.status,stdout:value.stdout,stderr:value.stderr,cwd:value.cwd,exitCode:value.exitCode,reason:value.reason};
}
