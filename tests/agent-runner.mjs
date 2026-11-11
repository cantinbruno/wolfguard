// Disposable integration runner: credentials arrive on stdin and never in logs.
import {evaluateSecurity} from '../agent/security-rules.mjs';
import {AgentClient,runAgent} from '../agent/agent.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;
const {backend,code}=JSON.parse(input),client=new AgentClient(backend,{allowLoopback:true});
const enrolled=await client.post('enroll',{code,name:'Agent integration',platform:'win32'});client.token=enrolled.token;
// Keep integration probes on loopback. Automatic interface selection is covered
// separately with synthetic interfaces; this test never scans the user's LAN.
const post=client.post.bind(client);client.post=async(path,data,options)=>{const response=await post(path,data,options);if(path==='poll'&&response.job?.spec.workspace==='map')response.job.spec.target='127.0.0.1';return response;};
process.stdout.write('ready\n');
await runAgent(client,{protectionRunner:async()=>{},pollMs:100,securityCollector:async()=>evaluateSecurity({smb:{available:true,enabled:true},uac:{available:true,value:1}}),passiveCollector:async()=>({results:[{address:'192.168.10.1',port:null,transport:'ARP',status:'observed',macAddress:'00:11:22:33:44:55',source:'agent-neighbor'},{address:'127.0.0.1',port:22,transport:'TCP',status:'listening',pid:42,source:'agent-tcp-table'}],warnings:[]})}).catch(()=>{process.exitCode=1;});
