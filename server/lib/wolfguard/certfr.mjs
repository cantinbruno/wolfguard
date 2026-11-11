import {seal,open} from './access.mjs';

const ORIGIN='https://cert.cyber.gouv.fr',HOUR=3600000,VERSION=1;
const CATALOG='public/cert-fr/catalog-v1.json',DETAILS='public/cert-fr/details-v1.json';
const clean=(value,max=500)=>String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// These aliases identify actual product evidence. A port number alone is never
// an inventory entry or sufficient to assert that a product is installed.
const families=[
  ['openssh',/\bopenssh(?:[-_ ]?(?:server|client))?\b/i],['openssl',/\bopenssl\b/i],['nginx',/\bnginx\b/i],
  ['apache-httpd',/\b(?:apache(?:2| http(?: server|d)?)?|httpd)\b/i],['tomcat',/\btomcat\b/i],
  ['firefox',/\bfirefox\b/i],['chrome',/\b(?:google chrome|chromium|chrome)\b/i],['edge',/\bmicrosoft edge\b/i],
  ['postgresql',/\bpostgresql(?:[- ]server)?\b/i],['mysql',/\bmysql\b/i],['mariadb',/\bmariadb\b/i],['redis',/\bredis(?:[- ]server)?\b/i],
  ['docker',/\bdocker(?:\.io| engine)?\b/i],['containerd',/\bcontainerd\b/i],['curl',/\bcurl\b/i],['sudo',/\bsudo\b/i],['git',/\bgit(?: for windows)?\b/i],
  ['fortios',/\bforti(?:os|gate)\b/i],['fortiproxy',/\bfortiproxy\b/i],['pan-os',/\bpan[- ]os\b/i],
  ['esxi',/\besxi\b/i],['vcenter',/\bvcenter\b/i],['exchange',/\bexchange(?: server)?\b/i],['iis',/\b(?:microsoft[- ]iis|internet information services)\b/i],
  ['windows-server',/\bwindows server\b/i],['windows',/\bwindows\b/i],['macos',/\bmac\s?os\b/i],['debian',/\bdebian\b/i],['ubuntu',/\bubuntu\b/i],['linux-kernel',/\b(?:linux kernel|noyau linux)\b/i]
  ,['office',/\b(?:microsoft (?:365|office)|office (?:365|20\d\d)|office)\b/i],['acrobat',/\b(?:adobe (?:acrobat|reader)|acrobat)\b/i],['sevenzip',/\b7[- ]?zip\b/i],['python',/\bpython\b/i],['nodejs',/\bnode\.?js\b/i],['java',/\b(?:java|jdk|jre|openjdk)\b/i],['forticlient',/\bforticlient\b/i],['vmware-tools',/\bvmware tools\b/i],['eset',/\beset\b/i]
];
const vendors={'apache-httpd':'apache',tomcat:'apache',fortios:'fortinet',fortiproxy:'fortinet','pan-os':'palo alto',esxi:'vmware',vcenter:'vmware',windows:'microsoft','windows-server':'microsoft',iis:'microsoft',exchange:'microsoft',edge:'microsoft',macos:'apple',firefox:'mozilla',chrome:'google'};
export function productFamily(name){
  const value=normalize(name).replace(/_/g,' ');if(/apache[- ]coyote/.test(value))return null;if(/tomcat/.test(value))return 'tomcat';if(/windows server/.test(value))return 'windows-server';
  return families.find(([,pattern])=>pattern.test(value))?.[0]||null;
}
function genericFamily(name){const value=normalize(name).trim();return value.length>=4&&value.length<=120&&/^[a-z][a-z0-9 .+_-]+$/.test(value)&&!['http','https','ssh','smtp','imap','pop3','ldap','server','service','unknown','tcp','udp','apache-coyote'].includes(value)?'generic:'+value:null;}
function sameFamily(name,id){return (productFamily(name)||genericFamily(name))===id;}
function candidateTitle(entry,family){
  if(family.startsWith('generic:')){const term=family.slice(8).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(?:^|[^a-z0-9])'+term+'(?:$|[^a-z0-9])').test(entry.search);}
  return entry.family===family||!!vendors[family]&&entry.search.includes(vendors[family]);
}
function candidatePriority(entry,family){
  if(entry.family===family)return 0;
  if(family==='office'&&/microsoft/.test(entry.search))return 1;
  if(family==='acrobat'&&/adobe/.test(entry.search))return 1;
  return 2;
}
function version(value){const m=/^(\d+(?:\.\d+){1,3})(?:p(\d+))?$/i.exec(String(value));return m?[...m[1].split('.').map(Number),...(m[2]===undefined?[]:[Number(m[2])])]:null;}
function compare(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return Math.sign(d);}return 0;}
export function versionRelation(observed,description,family){
  // Distribution backports, OS build/edition rules and compound exclusions
  // require vendor-specific interpretation; do not guess their applicability.
  const actual=version(observed),text=normalize(description);
  if(!actual||['windows','windows-server','macos','debian','ubuntu','linux-kernel','iis'].includes(family)||/sauf|exception|branche|uniquement|(?:\bet\b.*versions)|(?:\bou\b.*versions)/.test(text))return 'unknown';
  const number='(\\d+(?:\\.\\d+){1,3}(?:p\\d+)?)';
  let m=new RegExp('versions?\\s+(?:de\\s+)?'+number+'\\s+(?:a|jusqu.a)\\s+'+number+'(?:\\b|$)').exec(text);
  if(m){if(/exclu|non compris/.test(text))return 'unknown';return compare(actual,version(m[1]))>=0&&compare(actual,version(m[2]))<=0?'in-range':'outside-range';}
  m=new RegExp('versions?\\s+(?:[0-9]+(?:\\.[0-9x]+)*\\s+)?anterieures?\\s+a\\s+'+number+'(?![a-z0-9_.-])').exec(text);
  if(m){const branch=/versions?\s+(\d+(?:\.\d+)*(?:\.x)?)\s+anterieures?/.exec(text);if(branch){const prefix=branch[1].replace(/\.x$/,'');if(observed!==prefix&&!observed.startsWith(prefix+'.')&&!observed.startsWith(prefix+'p'))return 'outside-range';}return compare(actual,version(m[1]))<0?'in-range':'outside-range';}
  m=new RegExp('versions?\\s+'+number+'\\s+et\\s+anterieures?').exec(text);
  if(m)return compare(actual,version(m[1]))<=0?'in-range':'outside-range';
  // Do not interpret an unrecognized rule as an exact affected version.
  return 'unknown';
}
export function observedProducts(report){
  const products=[],keys=new Set(),rows=Array.isArray(report?.results)?report.results:[];
  const add=(name,release,evidence,source)=>{
    const family=productFamily(name)||genericFamily(name);if(!family)return;const v=clean(release,100),key=family+'\0'+v+'\0'+source;
    if(keys.has(key))return;keys.add(key);products.push({family,name:clean(name,160),version:v,evidence:clean(evidence,400),source:clean(source,160)});
  };
  for(const item of (Array.isArray(report?.software)?report.software:[]).slice(0,250))if(item&&typeof item==='object')add(item.name,item.version,item.evidence||item.name+' '+(item.version||''),item.source||'Inventaire du poste');
  for(const row of rows.slice(0,5000)){
    if(!row||typeof row!=='object')continue;
    const product=clean(row.product,400),source=[row.address,row.port].filter(value=>value!==undefined&&value!==null).join(':'),detail=clean(row.detail,1000);
    if(product&&!/port usuel|port conventionnel/.test(product)){
      const openssh=/OpenSSH[_ /-](\d+(?:\.\d+)+(?:p\d+)?)/i.exec(product+' '+detail),server=/\b(?:nginx|Apache|OpenSSL|Tomcat|PostgreSQL|Redis|Microsoft-IIS)[/ ](\d+(?:\.\d+)+(?:p\d+)?)/i.exec(product);
      add(product,row.version||openssh?.[1]||server?.[1]||'',[product,row.version,detail].filter(Boolean).join(' · '),source);
    }
    if(row.checkId==='inventory')add(detail,'',detail,source);
  }
  products.sort((a,b)=>(a.family.startsWith('generic:')?1:0)-(b.family.startsWith('generic:')?1:0));
  return {products:products.slice(0,20),total:products.length,unidentified:rows.filter(row=>!row?.product&&row?.transport!=='AUDIT').length};
}
function reference(value,kind){return typeof value==='string'&&new RegExp('^CERT(?:FR|A|IST)-[0-9]{4}-'+(kind==='avis'?'AVI':'ALE')+'-[0-9]{3,5}$').test(value)?value:null;}
export function normalizeBulletin(raw,kind,modifiedAt){
  const id=reference(raw?.reference,kind);if(!id)throw new Error('Bulletin CERT-FR invalide.');
  const affected=(Array.isArray(raw.affected_systems)?raw.affected_systems:[]).slice(0,300).map(item=>({name:clean(item?.product?.name,160),vendor:clean(item?.product?.vendor?.name,120),description:clean(item?.description,1800)})).filter(item=>item.name);
  const cves=[...new Set((Array.isArray(raw.cves)?raw.cves:[]).map(item=>item?.name).filter(id=>typeof id==='string'&&/^CVE-[0-9]{4}-[0-9]{4,9}$/.test(id)))].slice(0,100);
  return {reference:id,kind,title:clean(raw.title,300),url:ORIGIN+'/'+kind+'/'+id+'/',modifiedAt:clean(modifiedAt,50),affected,cves,risks:(raw.risks||[]).slice(0,12).map(item=>clean(item?.description,300)),summary:clean(raw.summary,1800),solution:clean(raw.content,1800),closed:!!raw.closed_at};
}
async function readCache(env,key){try{const value=await env.BUCKET.get(key);return value?.body?await new Response(value.body).json():null;}catch{return null;}}
async function writeCache(env,key,value){try{await env.BUCKET.put(key,JSON.stringify(value),{httpMetadata:{contentType:'application/json'}});}catch{/* Public-cache failure must not erase a scan. */}}
async function fetchJSON(env,url,limit,deadline){
  const timeout=Math.min(7000,deadline-Date.now());if(timeout<=0)throw new Error('Délai de consultation atteint.');
  const fetcher=env.LOCAL_TEST_ORIGIN&&typeof env.CERTFR_FETCH==='function'?env.CERTFR_FETCH:fetch;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetcher(url,{headers:{Accept:'application/json'},redirect:'error',signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok)throw new Error('API CERT-FR indisponible.');
    let count=0;const parts=[];for await(const part of response.body){count+=part.byteLength;if(count>limit)throw new Error('Réponse CERT-FR trop volumineuse.');parts.push(part);}
    const all=new Uint8Array(count);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
  }finally{clearTimeout(timer);}
}
async function catalog(env,now,deadline){
  const saved=await readCache(env,CATALOG);
  if(saved?.version===VERSION&&Array.isArray(saved.entries)&&now-saved.fetchedAt>=0&&now-saved.fetchedAt<HOUR)return {...saved,stale:false};
  try{
    const values=await Promise.all(['avis','alerte'].map(async kind=>{
      const rows=await fetchJSON(env,ORIGIN+'/'+kind+'/json/',10*1024*1024,deadline);if(!Array.isArray(rows)||rows.length>40000)throw new Error('Catalogue invalide.');
      return rows.map(row=>({reference:reference(row?.reference,kind),kind,title:clean(row?.title,300),modifiedAt:clean(row?.last_revision_date,50)})).filter(row=>row.reference);
    }));
    const value={version:VERSION,fetchedAt:now,entries:values.flat().sort((a,b)=>b.modifiedAt.localeCompare(a.modifiedAt))};await writeCache(env,CATALOG,value);return {...value,stale:false};
  }catch(error){if(saved?.version===VERSION&&Array.isArray(saved.entries)&&now>=saved.fetchedAt&&now-saved.fetchedAt<7*86400000)return {...saved,stale:true};throw error;}
}
export async function consultCERTFR(report,env,now=Date.now()){
  const observed=observedProducts(report),base={provider:'CERT-FR',api:ORIGIN+'/openapi',version:VERSION,checkedAt:new Date(now).toISOString(),products:observed.products,productsTotal:observed.total,unidentified:observed.unidentified,findings:[],bulletinsExamined:0,candidates:0,omitted:0,failures:0,stale:false};
  if(!observed.products.length)return {...base,status:'no-products',message:'Aucun produit identifiable dans ce relevé. L’identification des produits et versions est nécessaire pour consulter les avis pertinents.'};
  const deadline=Date.now()+24000;
  let index;try{index=await catalog(env,now,deadline);}catch{return {...base,status:'unavailable',message:'Le CERT-FR n’a pas pu être consulté. L’applicabilité des vulnérabilités reste inconnue.'};}
  base.catalogCheckedAt=new Date(index.fetchedAt).toISOString();base.stale=index.stale;
  const titles=index.entries.map(entry=>({...entry,family:productFamily(entry.title),search:normalize(entry.title)}));
  const queues=observed.products.map(product=>{const matches=titles.filter(entry=>candidateTitle(entry,product.family)).sort((a,b)=>candidatePriority(a,product.family)-candidatePriority(b,product.family)||b.modifiedAt.localeCompare(a.modifiedAt)),alerts=matches.filter(entry=>entry.kind==='alerte'),advisories=matches.filter(entry=>entry.kind==='avis');return [...alerts.slice(0,2),...advisories,...alerts.slice(2)];});
  const candidates=new Map(queues.flat().map(entry=>[entry.reference,entry]));base.candidates=candidates.size;
  const selected=new Map();for(let depth=0;selected.size<20&&depth<Math.max(0,...queues.map(queue=>queue.length));depth++)for(const queue of queues){const row=queue[depth];if(row)selected.set(row.reference,row);if(selected.size>=20)break;}
  base.omitted=Math.max(0,candidates.size-selected.size);
  const saved=await readCache(env,DETAILS),details=saved?.version===VERSION&&saved.entries&&typeof saved.entries==='object'?saved.entries:{};
  const entries=[...selected.values()];let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,entries.length)},async()=>{
    while(cursor<entries.length){const entry=entries[cursor++];let bulletin=details[entry.reference]?.modifiedAt===entry.modifiedAt?details[entry.reference]?.bulletin:null;
      if(!bulletin){try{const raw=await fetchJSON(env,ORIGIN+'/'+entry.kind+'/'+entry.reference+'/json/',1024*1024,deadline);bulletin=normalizeBulletin(raw,entry.kind,entry.modifiedAt);if(bulletin.reference!==entry.reference)throw new Error('Référence incohérente.');details[entry.reference]={modifiedAt:entry.modifiedAt,fetchedAt:now,bulletin};}catch{base.failures++;continue;}}
      base.bulletinsExamined++;
      for(const product of observed.products){
        const systems=bulletin.affected.filter(system=>sameFamily(system.name,product.family));if(!systems.length)continue;
        const relations=systems.map(system=>({system,relation:versionRelation(product.version,system.description,product.family)}));
        if(relations.every(item=>item.relation==='outside-range'))continue;
        const matched=relations.filter(item=>item.relation!=='outside-range'),inRange=matched.some(item=>item.relation==='in-range');
        base.findings.push({...bulletin,product:product.name,version:product.version,source:product.source,evidence:product.evidence,applicability:inRange?'version-in-range':'needs-verification',affected:matched.slice(0,12).map(item=>item.system.description)});
      }
    }
  }));
  const keep=[];let cacheBytes=0;for(const entry of Object.entries(details).sort((a,b)=>b[1].fetchedAt-a[1].fetchedAt)){const size=new TextEncoder().encode(JSON.stringify(entry)).length;if(keep.length>=300||cacheBytes+size>4*1024*1024)break;keep.push(entry);cacheBytes+=size;}await writeCache(env,DETAILS,{version:VERSION,entries:Object.fromEntries(keep)});
  base.findings.sort((a,b)=>(a.applicability==='version-in-range'?0:1)-(b.applicability==='version-in-range'?0:1)||(a.kind==='alerte'?0:1)-(b.kind==='alerte'?0:1)||b.modifiedAt.localeCompare(a.modifiedAt));
  base.findingsTotal=base.findings.length;const bounded=[];let analysisBytes=new TextEncoder().encode(JSON.stringify({...base,findings:[]})).length;
  for(const finding of base.findings){const size=new TextEncoder().encode(JSON.stringify(finding)).length;if(bounded.length>=60||analysisBytes+size>450000)break;bounded.push(finding);analysisBytes+=size;}
  base.findings=bounded;base.findingsOmitted=base.findingsTotal-bounded.length;
  return {...base,status:base.stale?'stale':base.failures||base.omitted||base.findingsOmitted||observed.total>20?'partial':'ready',message:base.findings.length?'Des avis CERT-FR correspondent aux produits observés. Vérifie les conditions et les correctifs de l’éditeur.':'Aucune correspondance dans les bulletins examinés. Cela ne confirme pas l’absence de vulnérabilité.'};
}
const analysisContext=id=>'WolfGuard CERT-FR analysis v1:'+id;
export async function cachedAnalysis(env,row){
  try{const saved=await env.DB.prepare('SELECT * FROM scan_intelligence WHERE job_id=? AND report_revision=?').bind(row.id,row.revision).first();if(!saved)return null;return await open(saved.result_cipher,analysisContext(row.id),env);}catch{return null;}
}
export async function analyzeScan(env,row,report,now){
  const previous=await cachedAnalysis(env,row),age=previous?now-Date.parse(previous.checkedAt):Infinity;
  if(previous&&previous.version===VERSION&&age>=0&&age<(previous.status==='unavailable'?60000:15*60000))return previous;
  const result=await consultCERTFR(report,env,now),cipher=await seal(result,analysisContext(row.id),env);
  await env.DB.prepare("INSERT INTO scan_intelligence(job_id,report_revision,result_cipher,checked_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM scan_jobs WHERE id=? AND revision=? AND status NOT IN ('queued','running')) ON CONFLICT(job_id) DO UPDATE SET report_revision=excluded.report_revision,result_cipher=excluded.result_cipher,checked_at=excluded.checked_at").bind(row.id,row.revision,cipher,now,row.id,row.revision).run();return result;
}
