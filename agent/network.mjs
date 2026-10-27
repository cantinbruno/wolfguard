import net from 'node:net';
import tls from 'node:tls';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {scanSpec,localAddress} from '../server/lib/wolfguard/scan-spec.mjs';

const SERVICES={21:'FTP',22:'SSH',23:'Telnet',25:'SMTP',53:'DNS',80:'HTTP',110:'POP3',135:'RPC',139:'NetBIOS',143:'IMAP',389:'LDAP',443:'HTTPS',445:'SMB',636:'LDAPS',993:'IMAPS',995:'POP3S',1433:'SQL Server',3306:'MySQL',3389:'RDP',5432:'PostgreSQL',5900:'VNC',5985:'WinRM',5986:'WinRM TLS',6379:'Redis',8080:'HTTP',8443:'HTTPS'};
export function fixedProcess(file,args,{input='',signal,timeout=20000,maxBytes=3*1024*1024}={}){
  return new Promise((resolve,reject)=>{const child=execFile(file,args,{windowsHide:true,encoding:'utf8',timeout,maxBuffer:maxBytes,signal},(error,stdout)=>error?reject(error):resolve(stdout));child.stdin.on('error',()=>{});child.stdin.end(input);});
}
export async function collectPassive(signal){
  if(process.platform!=='win32')throw new Error('Cet agent est prévu pour Windows.');
  const result=await fixedProcess('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./collect.ps1',import.meta.url))],{signal,timeout:30000});
  const data=JSON.parse(result.replace(/^\uFEFF/,''));if(!Array.isArray(data.results))throw new Error('Relevé Windows illisible.');return data;
}
function probe(address,port,timeout,signal,identify){
  localAddress(address);
  return new Promise(resolve=>{
    const started=performance.now(),socket=new net.Socket();let done=false,timer;
    const row={address,port,transport:'TCP',source:'agent-tcp'};
    function finish(status,detail,extra={}){if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);socket.destroy();resolve({...row,status,latencyMs:Math.round(performance.now()-started),detail,...extra});}
    const abort=()=>finish('error','Test arrêté.');if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});
    timer=setTimeout(()=>finish('no-response','Aucune réponse avant le délai.'),timeout);
    socket.once('error',error=>finish(error.code==='ECONNREFUSED'?'closed':['EHOSTUNREACH','ENETUNREACH'].includes(error.code)?'unreachable':'error','TCP : '+String(error.code||'erreur')));
    socket.connect({host:address,port},async()=>{
      if(done)return;clearTimeout(timer);timer=setTimeout(()=>finish('open','Connexion TCP établie ; identification non concluante.'),1500);
      if(!identify){finish('open','Connexion TCP établie. Le nom du service est une association de port, non une identification.',{service:SERVICES[port]?SERVICES[port]+' (port usuel)':''});return;}
      let stream=socket,content='';
      if([443,465,636,853,993,995,5986,8443].includes(port)){
        stream=tls.connect({socket,host:address,rejectUnauthorized:true},()=>{const cert=stream.getPeerCertificate();finish('open','Négociation TLS validée. Certificat : '+String(cert.subject?.CN||'')+' ; expiration : '+String(cert.valid_to||''),{service:stream.getProtocol()||'TLS'});stream.destroy();});
        stream.once('error',error=>{finish('open','Port ouvert ; validation TLS non aboutie : '+String(error.code||'erreur'));stream.destroy();});
      }else{
        stream.on('data',chunk=>{content+=chunk.toString('utf8');if(content.length>=4096||content.includes('\n')){const line=content.split(/\r?\n/,1)[0].slice(0,400);finish('open','Bannière reçue : '+line,{service:line.startsWith('SSH-')?'SSH':line.startsWith('HTTP/')?'HTTP':SERVICES[port]||'',product:line});}});
        if([80,8000,8080,8081,9090].includes(port))stream.write('HEAD / HTTP/1.0\r\nHost: '+(address.includes(':')?'['+address+']':address)+'\r\nConnection: close\r\n\r\n');
        stream.once('end',()=>finish('open',content?'Bannière reçue : '+content.slice(0,400):'Port ouvert ; aucune bannière reçue.'));
      }
    });
  });
}
async function ping(address,timeout,signal){
  localAddress(address);const started=performance.now();
  try{const output=await fixedProcess('ping.exe',['-n','1','-w',String(timeout),address],{signal,timeout:timeout+1500,maxBytes:16000});const replied=/(?:Reply from|R.ponse de)[^\r\n]*(?:TTL=|temps[=<]|time[=<])/i.test(output);return {address,port:null,transport:'ICMP',status:replied?'reachable':'no-response',latencyMs:Math.round(performance.now()-started),detail:replied?'Réponse ICMP reçue.':'Aucune réponse ICMP identifiable.',source:'agent-icmp'};}catch{return {address,port:null,transport:'ICMP',status:'no-response',detail:'Aucune réponse ICMP ; cela ne prouve pas l’absence de la machine.',source:'agent-icmp'};}
}
export async function runNetworkScan(raw,{signal,onProgress=()=>{},passiveCollector=collectPassive}={}){
  const spec=scanSpec(raw),startedAt=new Date().toISOString(),rows=[],warnings=[];let completed=0,total=0,identifications=0,size=0,truncated=false;
  const report=()=>({strategy:spec.strategy,target:spec.target||'Poste de l’agent',startedAt,finishedAt:new Date().toISOString(),completed,total,cancelled:!!signal?.aborted,results:rows,warnings});
  function add(row){const bytes=Buffer.byteLength(JSON.stringify(row));if(rows.length>=5000||size+bytes>850000){if(!truncated){warnings.push('Résultats limités à 5 000 observations ou 850 Ko. Les compteurs peuvent dépasser les lignes détaillées.');truncated=true;}return;}size+=bytes;rows.push(row);}
  if(spec.strategy==='passive'){
    const snapshot=await passiveCollector(signal);for(const row of snapshot.results){if(signal?.aborted)break;const keep=spec.passiveScope==='all'||spec.passiveScope==='neighbours'&&row.status==='observed'||spec.passiveScope==='listeners'&&['listening','bound'].includes(row.status)||spec.passiveScope==='connections'&&row.status==='connection';if(keep)add(row);}
    warnings.push(...(snapshot.warnings||[]).slice(0,10));completed=total=rows.length;onProgress(report());return report();
  }
  total=spec.mode==='tcp'?spec.addresses.length*spec.ports.length:spec.addresses.length;let next=0;
  async function worker(){while(!signal?.aborted){const index=next++;if(index>=total)return;let row;
    if(spec.mode==='icmp')row=await ping(spec.addresses[index],spec.timeoutMs,signal);
    else if(spec.mode==='discovery'){
      const address=spec.addresses[index];let evidence=null;
      for(const port of spec.ports){if(signal?.aborted)break;const result=await probe(address,port,spec.timeoutMs,signal,false);if(['open','closed'].includes(result.status)){evidence=result;break;}}
      row={address,port:null,transport:'HOST',source:'agent-discovery',status:evidence?'reachable':'no-response',detail:evidence?'Réponse TCP sur '+evidence.port+' : '+(evidence.status==='open'?'connexion établie.':'connexion refusée.'):'Aucune réponse aux ports de découverte ; la machine peut filtrer les sondes.'};
    }else {const address=spec.addresses[Math.floor(index/spec.ports.length)],port=spec.ports[index%spec.ports.length];row=await probe(address,port,spec.timeoutMs,signal,spec.identifyServices&&identifications++<128);}
    if(signal?.aborted)break;add(row);completed++;onProgress(report());
  }}
  onProgress(report());await Promise.all(Array.from({length:Math.min(spec.concurrency,total)},worker));
  if(signal?.aborted)warnings.push('Scan interrompu : le rapport ne contient que les tests terminés.');return report();
}
