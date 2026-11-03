import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const context=vm.createContext({TextEncoder,Blob});
vm.runInContext(readFileSync(new URL('../app/vendor/ipaddr-2.5.0.js',import.meta.url),'utf8'),context);
for(const file of ['scan-web-model','scan-insights','scan-pdf','scan-report'])vm.runInContext(readFileSync(new URL('../app/js/views/'+file+'.js',import.meta.url),'utf8'),context);
const model=(kind,report,reference=null)=>vm.runInContext('webScanReport.pdfModel',context)(kind,report,reference);
const document=value=>vm.runInContext('webScanPDF.definition',context)(value);
const row={address:'192.0.2.1',port:22,transport:'TCP',status:'open',service:'ssh',product:'OpenSSH',version:'9.9',detail:'Bannière reçue',hostname:'serveur',macAddress:'',interfaceName:'',checkId:'',title:'',severity:'',recommendation:'',reference:''};
const report={name:'Agence · scan',target:'192.0.2.1',source:'Agent · Windows',capturedAt:'2026-11-02T09:00:00Z',jobStatus:'completed',warnings:[],rows:[row]};

test('browser targets accept public unicast and normalize mapped IPv4 consistently with the agent',()=>{
  const target=vm.runInContext('webScanModel.singleTarget',context);
  assert.equal(target('8.8.8.8'),'8.8.8.8');assert.equal(target('::ffff:8.8.8.8'),'8.8.8.8');
  assert.equal(target('2001:4860:4860::8888'),'2001:4860:4860::8888');
  for(const value of ['0.0.0.0','224.0.0.1','255.255.255.255','::','ff02::1','::ffff:224.0.0.1'])assert.throws(()=>target(value),value);
});

test('lazy PDF engine and embedded fonts match pinned integrity values',()=>{
  const loader=readFileSync(new URL('../app/js/views/scan-pdf.js',import.meta.url),'utf8');
  for(const file of ['pdfmake-0.3.13.min.js','pdfmake-roboto-3.014.js']){
    const bytes=readFileSync(new URL('../app/vendor/'+file,import.meta.url));
    assert.ok(loader.includes('sha384-'+createHash('sha384').update(bytes.toString('utf8').replace(/\r\n/g,'\n')).digest('base64')));
  }
  assert.ok(loader.includes('setUrlAccessPolicy(()=>false)'));
});

test('PDF fields stay literal text without links, scripts or attachments',()=>{
  const attack='</script><script src="https://example.invalid/steal"></script><img src=x onerror=alert(1)>';
  const definition=document(model('vulnerability',{...report,name:attack,target:attack,source:attack,error:attack,warnings:[attack],rows:[{...row,transport:'AUDIT',status:'issue',title:attack,checkId:attack,detail:attack,severity:attack,recommendation:attack,reference:attack}]}));
  assert.equal(definition.pageSize,'A4');assert.equal(definition.defaultStyle.font,'Roboto');
  const walk=value=>{if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){assert.ok(!['link','linkToPage','attachments','javascript','openAction'].includes(key),key);walk(item);}};
  walk(definition);assert.ok(JSON.stringify(definition).includes(attack.replaceAll('"','\\"')));
});

test('PDF audit retains controls and prioritizes high risks, evidence and failures',()=>{
  const value=model('vulnerability',{...report,jobStatus:'failed',error:'Agent interrompu',warnings:['Cache ancien'],rows:[
    {...row,checkId:'ok',title:'Pare-feu actif',status:'passed',transport:'AUDIT'},
    {...row,checkId:'low',title:'Risque faible',status:'issue',severity:'low',transport:'AUDIT'},
    {...row,checkId:'critical',title:'Risque critique',status:'issue',severity:'critical',transport:'AUDIT',detail:'Protection désactivée',recommendation:'Activer la protection'},
    {...row,checkId:'cache',title:'Cache indisponible',status:'notchecked',transport:'AUDIT'}]});
  const output=JSON.stringify(document(value));
  assert.ok(output.indexOf('Risque critique')<output.indexOf('Risque faible'));
  assert.ok(output.indexOf('Risque faible')<output.indexOf('Pare-feu actif'));
  for(const item of ['Protection désactivée','Activer la protection','Cache indisponible','Cache ancien','Agent interrompu','Échec · relevé partiel'])assert.ok(output.includes(item),item);
  assert.equal((output.match(/PREUVE \/ OBSERVATION/g)||[]).length,4);
});

test('passive PDF excludes unrelated sockets and preserves comparison evidence',()=>{
  const neighbor={...row,port:null,transport:'ARP',status:'observed',interfaceName:'Ethernet',macAddress:'00:11:22:33:44:55'};
  const baseline={...report,rows:[{...neighbor,macAddress:'AA:BB:CC:DD:EE:FF'}]};
  const output=JSON.stringify(document(model('passive',{...report,rows:[neighbor,{...row,address:'127.0.0.1',processName:'host-secret',status:'listening'}]},baseline)));
  assert.equal(output.includes('host-secret'),false);assert.equal(output.includes('127.0.0.1'),false);
  for(const item of ['00:11:22:33:44:55','AA:BB:CC:DD:EE:FF','Évolution du relevé','Ethernet'])assert.ok(output.includes(item),item);
});

test('passive model and PDF keep DNS and distinct target connections with their owners',()=>{
  const target={...report,target:'8.8.8.8',rows:[
    {...row,address:'8.8.8.8',port:null,transport:'DNS',status:'observed',hostname:'dns.example',ttl:120},
    ...[51000,51001].map(localPort=>({...row,address:'8.8.8.8',port:443,status:'connection',direction:'remote',remoteAddress:'8.8.8.8',remotePort:443,localAddress:'192.168.1.10',localPort,pid:42,processName:'browser'}))]};
  const parse=vm.runInContext('webScanModel.parse',context),parsed=parse(JSON.stringify({...target,results:target.rows}),'passive');
  assert.equal(parsed.rows.length,3);
  const value=model('passive',parsed),output=JSON.stringify(document(value));
  for(const field of ['dns.example','8.8.8.8:443','browser','51000','51001','PID 42'])assert.ok(output.includes(field),field);
});

test('PDF map bounds its diagram while keeping every observation in the table',()=>{
  const rows=Array.from({length:40},(_,i)=>({...row,address:'192.0.2.'+(i+1),status:i===39?'open|filtered':'reachable',port:null}));
  const definition=document(model('map',{...report,target:'192.0.2.0/24',rows}));
  const svg=definition.content.find(item=>item.svg)?.svg;
  assert.equal((svg.match(/<rect/g)||[]).length,17);
  assert.equal(definition.content.find(item=>item.table?.headerRows===1).table.body.length,41);
  for(const item of ['192.0.2.40','Ouvert ou filtré','16 adresses sur 39 représentées'])assert.ok(JSON.stringify(definition).includes(item),item);
});

test('empty and partial PDFs state their limits without inventing results',()=>{
  const output=JSON.stringify(document(model('active',{...report,jobStatus:'running',target:'',rows:[]})));
  assert.ok(output.includes('En cours · relevé partiel'));assert.ok(output.includes('Aucune observation disponible'));
  assert.equal(output.includes('192.0.2.1'),false);
});

test('history ZIP keeps PDF bytes and UTF-8 names intact and rejects path traversal',async()=>{
  const archive=vm.runInContext('webScanReport.archive',context),files=[{name:'rapport-é.pdf',content:new Uint8Array([37,80,68,70,45,0,255,128])},{name:'rapport-é.pdf',content:new TextEncoder().encode('Deuxième relevé')}];
  const data=new Uint8Array(await archive(files).arrayBuffer()),view=new DataView(data.buffer),decode=new TextDecoder();let offset=0;
  for(const [index,file] of files.entries()){
    assert.equal(view.getUint32(offset,true),0x04034b50);assert.equal(view.getUint16(offset+6,true),0x0800);
    const size=view.getUint32(offset+18,true),length=view.getUint16(offset+26,true),start=offset+30;
    assert.equal(decode.decode(data.subarray(start,start+length)),String(index+1).padStart(4,'0')+'-'+file.name);
    assert.deepEqual(data.subarray(start+length,start+length+size),file.content);offset=start+length+size;
  }
  assert.equal(view.getUint32(offset,true),0x02014b50);assert.equal(view.getUint32(data.length-22,true),0x06054b50);assert.equal(view.getUint16(data.length-12,true),2);
  assert.throws(()=>archive([{name:'../../evil.pdf',content:'x'}]));assert.throws(()=>archive([]));
});
