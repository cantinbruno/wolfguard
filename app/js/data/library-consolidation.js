'use strict';

// Sources remain in the encrypted workspace, with all their fields and IDs.
// Only the guides appear as fiches; old links still resolve to their chapters.
function buildLibraryConsolidation(snapshot, stamp = new Date().toISOString()) {
  const marker='memo-consolidation-version';
  const summary={sourceItems:0,guides:0,hiddenFolders:0};
  if(snapshot.settings?.some(row=>row.key===marker&&Number(row.value)>=1))return {operations:[],summary};
  const titles=['01 · Réseaux et équipements','02 · Systèmes et virtualisation','03 · Sécurité et identité','04 · Cloud, données et automatisation','05 · Exploitation et supervision','99 · Archives et anciennes versions'];
  const types=new Set(['memo','procedure','personal','command','report','template']);
  const managed=id=>/^(?:tech-folder-|wg-memo-folder-|procedure-folder-|wg-procedure-tech-)/.test(id||'');
  const folders=new Map((snapshot.folders||[]).map(row=>[row.id,row]));
  const items=snapshot.items||[],operations=[],groups=new Map(),destinations=new Map();
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const fold=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function ancestry(id) {
    const path=[],seen=new Set();
    while(folders.has(id)) {
      if(seen.has(id))throw new Error('Cycle dans les dossiers : regroupement annulé.');
      seen.add(id);const folder=folders.get(id);path.unshift(folder);id=folder.parentId;
    }
    return path;
  }
  function theme(item,path) {
    if(path.some(folder=>/^99\s*[·.: -]/.test(folder.name)))return 5;
    const root=path[0]?.name||'';
    if(/^0[1-8]\s*[·.: -]/.test(root))return ({'01':0,'02':1,'03':2,'04':2,'05':1,'06':3,'07':3,'08':4})[root.slice(0,2)];
    const technology=procedureTechnologyPath(item,[...path].reverse())||[];
    const subject=fold(technology.join(' '));
    if(/active directory|gpo|defender|bitlocker|eset|fortinet|pfsense|check point|stormshield|ivanti|trend micro|securite|ise et aaa/.test(subject))return 2;
    if(/windows|linux|macos|vmware|proxmox|applications|hyper-v|messagerie/.test(subject))return 1;
    if(/microsoft 365|conteneurs|devops|bases de donnees|materiel et stockage|sauvegarde/.test(subject))return 3;
    if(/cisco|juniper|wi-fi|f5|3cx|reseaux|web et api/.test(subject))return 0;
    return 4;
  }
  function topic(item,path) {
    const archived=path.some(folder=>/^99\s*[·.: -]/.test(folder.name));
    if(archived)return 'Archives et anciennes versions';
    const technology=procedureTechnologyPath(item,[...path].reverse());
    let names=technology||path.map(folder=>folder.name).filter(name=>!/^\d{2}\s*[·.: -]/.test(name));
    const key=fold(names.join(' / '));
    if(/methodes (?:transversales|et organisation)/.test(key))names=['Exploitation','Méthodes et organisation'];
    else if(/collecte et restitution|collecte de preuves/.test(key))names=['Sécurité','Collecte de preuves'];
    else if(/captures reseau/.test(key))names=['Réseaux et protocoles','Captures réseau'];
    else if(/images et dependances|vulnerabilites et images/.test(key))names=['Sécurité','Vulnérabilités et images'];
    else if(/^applications \/ (?:chrome|firefox)$/.test(key))names=['Applications','Navigateurs'];
    else if(/^linux \/ (?:nftables|firewalld)$/.test(key))names=['Linux','Pare-feu'];
    return names.join(' · ')||'Exploitation · Références';
  }
  const candidates=items.filter(item=>!item.deletedAt&&!item.consolidatedInto&&!item.consolidatedGuideVersion&&types.has(item.type)&&managed(item.folderId)&&ancestry(item.folderId).every(folder=>!folder.deletedAt&&['library','memo','personal','command','template'].includes(folder.section)));
  for(const item of candidates)destinations.set(item.id,topic(item,ancestry(item.folderId)));
  // Keep exclusively linked commands alongside their explanations, even when
  // the old command folder belonged to a different theme.
  const parents=new Map();
  for(const item of candidates)if((item.originalType||item.type)!=='command')for(const id of item.linkedItemIds||[]) {
    if(!parents.has(id))parents.set(id,[]);parents.get(id).push(destinations.get(item.id));
  }
  for(const item of candidates)if((item.originalType||item.type)==='command') {
    const themes=parents.get(item.id)||[];
    if(themes.length&&themes.every(value=>value===themes[0])&&!ancestry(item.folderId).some(folder=>/^99\s*[·.: -]/.test(folder.name)))destinations.set(item.id,themes[0]);
  }
  for(const item of candidates) {
    const group=destinations.get(item.id);
    if(!groups.has(group))groups.set(group,[]);groups.get(group).push(item);
  }
  const used=new Set([...items,...folders.values()].map(row=>row.id)),guideIds=new Map(),guideFolders=new Map();
  for(const group of groups.keys()) {
    let hash=2166136261;for(let i=0;i<group.length;i++)hash=Math.imul(hash^group.charCodeAt(i),16777619)>>>0;
    const base='wg-memo-guide-'+hash.toString(16);let id=base,n=0;while(used.has(id))id=base+'-'+(++n);
    used.add(id);guideIds.set(group,id);
  }
  const guideFor=id=>guideIds.get(destinations.get(id));
  function chapter(item) {
    const isRawCommand=item.type==='command'&&!item.unifiedDocument;
    let body=isRawCommand?'':String(item.content||'');
    const metadata=[['Description',item.description],['Contexte',item.context],['Environnement',item.platform],['Technologie',item.vendor],['Prérequis',item.prerequisites],['Exemple',item.example]];
    let html='<section data-guide-chapter="'+escape(item.id)+'"><h2 id="chapter-'+escape(item.id)+'">'+escape(item.title)+'</h2>';
    html+=metadata.filter(([,value])=>value).map(([label,value])=>'<p><strong>'+label+' : </strong>'+escape(value)+'</p>').join('');
    html+=body;
    const blocks=[...(item.commandBlocks||[])];
    if(isRawCommand&&!blocks.some(block=>block.code===item.content))blocks.unshift({title:item.title,code:item.content,context:item.context,example:item.example});
    for(const block of blocks) {
      // fromMemo blocks already exist, verbatim, in the source HTML.
      if(block.fromMemo&&!isRawCommand) {
        for(const value of [block.context,block.description,block.example])if(value)html+='<p>'+escape(value)+'</p>';
        continue;
      }
      html+='<h3>'+escape(block.title||'Commande')+'</h3>'+(block.context?'<p>'+escape(block.context)+'</p>':'')+'<pre><code>'+escape(block.code)+'</code></pre>'+(block.example?'<p>Exemple : '+escape(block.example)+'</p>':'')+(block.description?'<p>'+escape(block.description)+'</p>':'');
    }
    if(item.tags?.length)html+='<p>Mots clés : '+item.tags.map(escape).join(' · ')+'</p>';
    const references=[...(item.sources||[]),...(item.references||[])];
    if(references.length)html+='<ul>'+references.map(source=>'<li>'+(source.url?'<a href="'+escape(source.url)+'">'+escape(source.title||source.url)+'</a>':escape(source.title||source))+'</li>').join('')+'</ul>';
    if(item.attachments?.length)html+='<p>Pièces jointes : '+item.attachments.map(file=>escape(file.name)).join(' · ')+'</p>';
    if(item.linkedItemIds?.length)html+='<p>Voir aussi : '+item.linkedItemIds.map(id=>{
      const target=items.find(row=>row.id===id);
      return target?'<a href="#chapter-'+escape(id)+'" data-guide-link="'+escape(id)+'">'+escape(target.title)+'</a>':'';
    }).filter(Boolean).join(' · ')+'</p>';
    return html+'</section>';
  }
  for(const [group,sources] of [...groups].sort(([a],[b])=>a.localeCompare(b,'fr'))) {
    sources.sort((a,b)=>{
      const ap=ancestry(a.folderId).map(folder=>folder.name).join(' / '),bp=ancestry(b.folderId).map(folder=>folder.name).join(' / ');
      return ap.localeCompare(bp,'fr')||a.title.localeCompare(b.title,'fr')||a.id.localeCompare(b.id);
    });
    const id=guideIds.get(group);
    const primary=sources.find(item=>(item.originalType||item.type)!=='command')||sources[0];
    const section=theme(primary,ancestry(primary.folderId));
    if(!guideFolders.has(section)) {
      const base='wg-memo-guide-folder-'+section;let folderId=base,n=0;while(used.has(folderId))folderId=base+'-'+(++n);
      used.add(folderId);guideFolders.set(section,folderId);
      operations.push({action:'put',store:'folders',record:{id:folderId,name:titles[section],section:'library',parentId:null,createdAt:stamp,updatedAt:stamp}});
    }
    const guide={id,type:'memo',originalType:'memo',title:group,folderId:guideFolders.get(section),unifiedDocument:true,unifiedDocumentVersion:2,consolidatedGuideVersion:1,
      guideSourceIds:sources.map(item=>item.id),description:sources.length+' chapitres · explications, procédures et commandes réunies.',
      content:sources.map(chapter).join('\n'),commandBlocks:[],facets:['memo','command','reference'],tags:[],
      attachments:sources.flatMap(item=>item.attachments||[]),linkedItemIds:[...new Set(sources.flatMap(item=>item.linkedItemIds||[]).map(target=>guideFor(target)||target).filter(target=>target!==id))],
      favorite:sources.some(item=>item.favorite),viewCount:0,createdAt:stamp,updatedAt:stamp};
    operations.push({action:'put',store:'items',record:guide});
    for(const item of sources)operations.push({action:'put',store:'items',record:{...item,consolidatedInto:id}});
    summary.sourceItems+=sources.length;summary.guides++;
  }
  // Hide only generated folders whose whole subtree is now contained in guides.
  // A folder holding a personal note, trash destination or foreign record stays.
  const hidden=new Set();let changed;
  do {
    changed=false;
    for(const folder of folders.values()) {
      if(folder.deletedAt||hidden.has(folder.id)||!managed(folder.id)||!['library','memo','personal','command','template'].includes(folder.section))continue;
      if(items.some(item=>item.folderId===folder.id&&!destinations.has(item.id)))continue;
      if([...folders.values()].some(child=>child.parentId===folder.id&&!child.deletedAt&&!hidden.has(child.id)))continue;
      hidden.add(folder.id);changed=true;
      operations.push({action:'put',store:'folders',record:{...folder,consolidatedFolder:true}});summary.hiddenFolders++;
    }
  } while(changed);
  operations.push({action:'put',store:'settings',record:{key:marker,value:1}});
  operations.push({action:'put',store:'settings',record:{key:'memo-consolidation-report',value:{at:stamp,...summary}}});
  return {operations,summary};
}
