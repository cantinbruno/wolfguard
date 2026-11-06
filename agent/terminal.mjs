import {spawn} from 'node:child_process';
import {homedir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {StringDecoder} from 'node:string_decoder';
import {setTimeout as delay} from 'node:timers/promises';
import {TERMINAL_OUTPUT,TERMINAL_TIMEOUT,terminalCommand} from '../server/lib/wolfguard/terminal-spec.mjs';

// Commands are explicitly supplied by the authenticated terminal owner. Keep
// their shell separate from the desktop input protocol and the agent process.
export async function runTerminalCommand(command,{cwd=homedir(),signal,onUpdate=()=>{},timeoutMs=TERMINAL_TIMEOUT,platform=process.platform,spawnProcess=spawn}={}){
  terminalCommand(command);signal?.throwIfAborted();
  const marker='WGT_'+randomBytes(16).toString('hex')+':';
  const powershell=`[Console]::InputEncoding=New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
$OutputEncoding=[Console]::OutputEncoding
$payload=[Console]::In.ReadToEnd() | ConvertFrom-Json
$statusCode=0
try {
  Set-Location -LiteralPath $payload.cwd -ErrorAction Stop
  $global:LASTEXITCODE=0
  & ([scriptblock]::Create($payload.command)) 2>&1 | ForEach-Object {
    if ($_ -is [System.Management.Automation.ErrorRecord]) { [Console]::Error.WriteLine($_.ToString()); $statusCode=1 }
    else { [Console]::Out.WriteLine(($_ | Out-String -Width 240).TrimEnd([char[]]"\r\n")) }
  }
  if ($global:LASTEXITCODE -ne 0) { $statusCode=$global:LASTEXITCODE }
} catch { [Console]::Error.WriteLine($_.ToString()); $statusCode=1 }
$nextCwd=$payload.cwd
if ($PWD.Provider.Name -eq 'FileSystem') { $nextCwd=$PWD.ProviderPath }
$meta=@{cwd=$nextCwd;exitCode=$statusCode} | ConvertTo-Json -Compress
[Console]::Out.WriteLine("\`n${marker}"+$meta)
exit $statusCode`;
  const shell=platform==='win32'?'powershell.exe':'/bin/sh';
  const args=platform==='win32'?['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand',Buffer.from(powershell,'utf16le').toString('base64')]:['-c','eval "$1"\nwg_terminal_status=$?\nprintf "\\n'+marker+'%s\\n" "$PWD"\nexit "$wg_terminal_status"','wolfguard',command];
  const child=spawnProcess(shell,args,{cwd,windowsHide:true,detached:platform!=='win32',stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='',lineBuffer='',reason='',settled=false,killing=false,finalCwd=cwd,metadataExit=null;
  const snapshot=()=>({stdout,stderr,cwd:finalCwd,exitCode:null,reason,status:'running'});
  const notify=()=>onUpdate(snapshot());
  function stop(cause){
    if(settled||killing)return;killing=true;reason=cause;
    if(platform==='win32'&&child.pid){
      const kill=spawnProcess('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
      kill.on('error',()=>child.kill());kill.on('exit',code=>{if(code)child.kill();});
    }else{try{process.kill(-child.pid,'SIGKILL');}catch{child.kill();}}
  }
  const append=(kind,text)=>{
    const remaining=TERMINAL_OUTPUT-stdout.length-stderr.length;
    if(kind==='stdout')stdout+=text.slice(0,remaining);else stderr+=text.slice(0,remaining);
    notify();if(text.length>remaining)stop('output-limit');
  };
  function output(text,final=false){
    lineBuffer+=text;
    let newline;
    while((newline=lineBuffer.indexOf('\n'))>=0){const line=lineBuffer.slice(0,newline).replace(/\r$/,'');lineBuffer=lineBuffer.slice(newline+1);
      if(line.startsWith(marker)){
        try{const value=platform==='win32'?JSON.parse(line.slice(marker.length)):{cwd:line.slice(marker.length)};if(typeof value.cwd==='string'&&value.cwd.length<=4096)finalCwd=value.cwd;if(Number.isSafeInteger(value.exitCode))metadataExit=value.exitCode;}catch{}
      }else append('stdout',line+'\n');
    }
    // Stream unterminated output, retaining only a possible metadata prefix.
    if(lineBuffer&&!lineBuffer.startsWith(marker)&&!marker.startsWith(lineBuffer)){append('stdout',lineBuffer);lineBuffer='';}
    if(final&&lineBuffer){append('stdout',lineBuffer);lineBuffer='';}
  }
  const outDecoder=new StringDecoder('utf8'),errDecoder=new StringDecoder('utf8');
  child.stdout.on('data',bytes=>output(outDecoder.write(bytes)));
  child.stderr.on('data',bytes=>append('stderr',errDecoder.write(bytes)));
  child.stdin.on('error',()=>{});
  if(platform==='win32')child.stdin.end(JSON.stringify({command,cwd}));else child.stdin.end();
  const abort=()=>stop('interrupted');signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  const timer=setTimeout(()=>stop('timeout'),Math.min(TERMINAL_TIMEOUT,Math.max(1,timeoutMs)));
  try{
    const exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>resolve(code));});
    output(outDecoder.end(),true);append('stderr',errDecoder.end());
    const code=metadataExit??exitCode;
    return {stdout,stderr,cwd:finalCwd,exitCode:Number.isSafeInteger(code)?code:null,reason,status:reason==='interrupted'?'cancelled':reason||code!==0?'failed':'completed'};
  }finally{settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}

export async function executeTerminalSession(client,session,{signal,onStatus=()=>{},runCommand=runTerminalCommand,intervalMs=500,initialCwd=homedir()}={}){
  const cancel=new AbortController(),external=()=>cancel.abort();signal?.addEventListener('abort',external,{once:true});if(signal?.aborted)cancel.abort();
  const deadline=setTimeout(()=>cancel.abort(),Math.max(0,Math.min(20*60000,session.expiresAt-Date.now())));
  let cwd=initialCwd,current=null,work=null,commandCancel=null,seen=0,revision=0,status='closed',lastResult='',lastInfo='';
  const info=()=>({shell:process.platform==='win32'?'PowerShell':'sh',cwd});
  const exchange=async()=>{
    const data={id:session.id,lease:session.lease,status:'active'},infoValue=info(),infoJSON=JSON.stringify(infoValue),resultJSON=JSON.stringify(current);
    if(infoJSON!==lastInfo)data.info=infoValue;
    if(current&&resultJSON!==lastResult)data.result={...current,revision:++revision};
    const response=await client.post('remote/terminal/exchange',data,{signal:cancel.signal});lastInfo=infoJSON;lastResult=resultJSON;return response;
  };
  try{
    onStatus('Ouverture du terminal distant…',{state:'terminal-preparing'});
    let response=await exchange();
    if(response.status!=='active')return;
    onStatus('Terminal distant actif. Les commandes utilisent les droits de la session de l’agent.',{state:'terminal'});
    while(!cancel.signal.aborted){
      if(response.status!=='active')break;
      const command=response.command;
      if(command?.cancel&&command.seq===seen)commandCancel?.abort();
      if(command&&command.seq>seen&&!work&&!command.cancel){
        if(command.seq!==seen+1){ // Cancelled queued commands may create gaps.
          if(!Number.isSafeInteger(command.seq)||command.seq<=seen)throw new Error('Ordre du terminal invalide.');
        }
        terminalCommand(command.command);seen=command.seq;revision=0;
        current={seq:seen,status:'running',stdout:'',stderr:'',cwd,exitCode:null,reason:''};
        // Acknowledge before executing: a cancellation or closed session must
        // win over a command still in transit. Never replay a seen sequence.
        response=await exchange();
        if(response.status!=='active')break;
        if(response.command?.seq!==seen||response.command.cancel){current={...current,status:'cancelled',reason:'interrupted'};continue;}
        commandCancel=new AbortController();const seq=seen;
        work=Promise.resolve().then(()=>runCommand(command.command,{cwd,signal:AbortSignal.any([cancel.signal,commandCancel.signal]),onUpdate:value=>{current={...value,seq};}})).then(result=>{cwd=result.cwd||cwd;current={...result,seq,cwd};},()=>{current={...current,status:'failed',stderr:'Impossible de lancer la commande.',exitCode:null};}).finally(()=>{work=null;commandCancel=null;});
      }
      await delay(intervalMs,undefined,{signal:cancel.signal}).catch(()=>{});cancel.signal.throwIfAborted();
      response=await exchange();
    }
  }catch(error){if(!cancel.signal.aborted)status='error';}
  finally{
    cancel.abort();commandCancel?.abort();await work;
    clearTimeout(deadline);signal?.removeEventListener('abort',external);
    try{await client.post('remote/terminal/exchange',{id:session.id,lease:session.lease,status},{signal:AbortSignal.timeout(2500)});}catch{}
    onStatus('Terminal distant fermé.',{state:'connected'});
  }
}
