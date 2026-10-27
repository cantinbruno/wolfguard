// Disposable integration runner: credentials arrive on stdin and never in logs.
import {AgentClient,runAgent} from '../agent/agent.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;
const {backend,code}=JSON.parse(input),client=new AgentClient(backend,{allowLoopback:true});
const enrolled=await client.post('enroll',{code,name:'Agent integration',platform:'win32'});client.token=enrolled.token;
process.stdout.write('ready\n');
await runAgent(client,{pollMs:100,passiveCollector:async()=>({results:[{address:'192.168.10.1',port:null,transport:'ARP',status:'observed',macAddress:'00:11:22:33:44:55',source:'agent-neighbor'},{address:'127.0.0.1',port:22,transport:'TCP',status:'listening',pid:42,source:'agent-tcp-table'}],warnings:[]})}).catch(()=>{process.exitCode=1;});
