// Disposable legacy-agent protocol fixture. No downloaded updater is executed.
import {AgentClient,runAgent} from '../agent/agent.mjs';
import {executeTerminalSession} from '../agent/terminal.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;
const config=JSON.parse(input),client=new AgentClient(config.backend,{allowLoopback:true});
const enrolled=await client.post('enroll',{code:config.code,name:config.name,platform:'win32'});client.token=enrolled.token;
let updated=false;
const post=client.post.bind(client);
client.post=async(route,data,options)=>{
  if(route==='poll')data={...data,version:updated?config.version:'0'.repeat(64),capabilities:updated?data.capabilities:data.capabilities.filter(value=>!['network-topology-v1','auto-update-v1'].includes(value))};
  return post(route,data,options);
};
process.stdout.write(JSON.stringify({id:enrolled.id})+'\n');
await runAgent(client,{pollMs:100,protectionRunner:async()=>{},remoteRunner:(client,session,options)=>executeTerminalSession(client,session,{...options,intervalMs:50,runCommand:async command=>{
  if(!command.includes(config.hash)||!command.includes('--install-update')||command.includes('--pair-code'))throw new Error('Unsafe fixture updater');
  if(config.fail)return {status:'failed',stdout:'',stderr:'Empreinte de mise a jour invalide',cwd:'C:\\synthetic',exitCode:1,reason:''};
  setTimeout(()=>{updated=true;},1000);
  return {status:'completed',stdout:'WOLFGUARD_UPDATE_READY\n',stderr:'',cwd:'C:\\synthetic',exitCode:0,reason:''};
}})}).catch(()=>{process.exitCode=1;});
