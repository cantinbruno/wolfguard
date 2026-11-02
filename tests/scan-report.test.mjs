import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const context=vm.createContext({TextEncoder,Blob});
vm.runInContext(readFileSync(new URL('../app/vendor/ipaddr-2.5.0.js',import.meta.url),'utf8'),context);
for(const file of ['scan-web-model','scan-insights','scan-report'])vm.runInContext(readFileSync(new URL('../app/js/views/'+file+'.js',import.meta.url),'utf8'),context);
const render=(kind,report,reference=null)=>vm.runInContext('webScanReport.html',context)(kind,report,reference);
const row={address:'192.0.2.1',port:22,transport:'TCP',status:'open',service:'ssh',product:'OpenSSH',version:'9.9',detail:'Bannière reçue',hostname:'serveur',macAddress:'',interfaceName:'',checkId:'',title:'',severity:'',recommendation:'',reference:''};
const report={name:'Agence · scan',target:'192.0.2.1',source:'Agent · Windows',capturedAt:'2026-11-02T09:00:00Z',jobStatus:'completed',warnings:[],rows:[row]};

test('standalone export escapes every scan field and only permits the trusted print script',()=>{
  const attack='</script><script src="https://example.invalid/steal"></script><img src=x onerror=alert(1)>';
  const output=render('vulnerability',{...report,name:attack,target:attack,source:attack,capturedAt:attack,error:attack,warnings:[attack],rows:[{...row,transport:'AUDIT',status:'issue',title:attack,checkId:attack,detail:attack,severity:attack,recommendation:attack,reference:attack}]});
  assert.ok(output.includes('&lt;/script&gt;'));
  assert.equal((output.match(/<script>/g)||[]).length,1);
  assert.equal((output.match(/<img /g)||[]).length,0);
  assert.equal(output.includes('<script src='),false);
  const script=/<script>([^]*?)<\/script>/.exec(output)[1];
  assert.ok(output.includes('sha256-'+createHash('sha256').update(script).digest('base64')));
  assert.ok(output.includes('default-src &#39;none&#39;'));
  assert.ok(output.includes('img-src data:'));
  assert.ok(output.includes('@media print'));
});

test('audit retains all controls, prioritizes high risks and includes evidence, recommendations and failures',()=>{
  const output=render('vulnerability',{...report,jobStatus:'failed',error:'Agent interrompu',warnings:['Cache ancien'],rows:[
    {...row,checkId:'ok',title:'Pare-feu actif',status:'passed',transport:'AUDIT'},
    {...row,checkId:'low',title:'Risque faible',status:'issue',severity:'low',transport:'AUDIT'},
    {...row,checkId:'critical',title:'Risque critique',status:'issue',severity:'critical',transport:'AUDIT',detail:'Protection désactivée',recommendation:'Activer la protection'},
    {...row,checkId:'cache',title:'Cache indisponible',status:'notchecked',transport:'AUDIT'}]});
  assert.ok(output.indexOf('<h3>Risque critique')<output.indexOf('<h3>Risque faible'));
  assert.ok(output.indexOf('<h3>Risque faible')<output.indexOf('<h3>Pare-feu actif'));
  for(const value of ['Protection désactivée','Activer la protection','Cache indisponible','Cache ancien','Agent interrompu','Échec · relevé partiel'])assert.ok(output.includes(value),value);
  assert.equal((output.match(/class="finding"/g)||[]).length,4);
});

test('passive export excludes local processes and includes real before/after evidence in comparisons',()=>{
  const neighbor={...row,port:null,transport:'ARP',status:'observed',interfaceName:'Ethernet',macAddress:'00:11:22:33:44:55'};
  const baseline={...report,rows:[{...neighbor,macAddress:'AA:BB:CC:DD:EE:FF'}]};
  const output=render('passive',{...report,rows:[neighbor,{...row,address:'127.0.0.1',processName:'host-secret',status:'listening'}]},baseline);
  assert.equal(output.includes('host-secret'),false);
  assert.equal(output.includes('127.0.0.1'),false);
  for(const value of ['00:11:22:33:44:55','AA:BB:CC:DD:EE:FF','Évolution du relevé','Ethernet'])assert.ok(output.includes(value),value);
});

test('map diagram is bounded while all observations and ambiguous states remain in the report',()=>{
  const rows=Array.from({length:40},(_,i)=>({...row,address:'192.0.2.'+(i+1),status:i===39?'open|filtered':'reachable',port:null}));
  const output=render('map',{...report,target:'192.0.2.0/24',rows});
  assert.equal((output.match(/class="node"/g)||[]).length,16);
  assert.equal((output.match(/<tbody>/g)||[]).length,1);
  assert.equal((output.match(/<tr>/g)||[]).length,41);
  for(const value of ['192.0.2.40','Ouvert ou filtré','16 adresses sur 39 représentées'])assert.ok(output.includes(value),value);
});

test('empty and partial reports state the limit without inventing results',()=>{
  const output=render('active',{...report,jobStatus:'running',target:'',rows:[]});
  assert.ok(output.includes('En cours · relevé partiel'));
  assert.ok(output.includes('Aucune observation disponible'));
  assert.equal(output.includes('192.0.2.1'),false);
  assert.equal(output.includes('<tbody>'),false);
});

test('history ZIP keeps UTF-8 reports complete with unique filenames and rejects path traversal',async()=>{
  const archive=vm.runInContext('webScanReport.archive',context),files=[{name:'rapport-é.html',content:'<!doctype html>Été & réseau'},{name:'rapport-é.html',content:'Deuxième relevé'}];
  const data=new Uint8Array(await archive(files).arrayBuffer()),view=new DataView(data.buffer),decode=new TextDecoder();
  let offset=0;
  for(const [index,file] of files.entries()){
    assert.equal(view.getUint32(offset,true),0x04034b50);assert.equal(view.getUint16(offset+6,true),0x0800);
    const size=view.getUint32(offset+18,true),length=view.getUint16(offset+26,true),start=offset+30;
    assert.equal(decode.decode(data.subarray(start,start+length)),String(index+1).padStart(4,'0')+'-'+file.name);
    assert.equal(decode.decode(data.subarray(start+length,start+length+size)),file.content);offset=start+length+size;
  }
  assert.equal(view.getUint32(offset,true),0x02014b50);assert.equal(view.getUint32(data.length-22,true),0x06054b50);assert.equal(view.getUint16(data.length-12,true),2);
  assert.throws(()=>archive([{name:'../../evil.html',content:'x'}]));assert.throws(()=>archive([]));
});
