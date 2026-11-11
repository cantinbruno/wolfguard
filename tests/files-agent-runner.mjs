// Disposable test agent: communicates over HTTP and accesses only a supplied test directory.
import {AgentClient,runAgent} from '../agent/agent.mjs';
import {executeFileSession,createFileAccess} from '../agent/files.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;
const {backend,code,root}=JSON.parse(input),client=new AgentClient(backend,{allowLoopback:true});
const enrolled=await client.post('enroll',{code,name:'Poste transfert synthétique',platform:'win32'});client.token=enrolled.token;
process.stdout.write('ready\n');
await runAgent(client,{pollMs:20,protectionRunner:async()=>{},remoteRunner:(client,session,options)=>executeFileSession(client,session,{...options,accessFactory:()=>createFileAccess({root}),intervalMs:20})}).catch(()=>{process.exitCode=1;});
