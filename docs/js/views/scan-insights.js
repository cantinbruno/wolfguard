'use strict';

const scanInsights=(()=>{
  const definitions={
    passive:{strategy:'passive',title:'Scan passif d’une machine',short:'Scan passif',description:'Observer les connexions, les ports locaux et les voisins connus du poste sélectionné.'},
    active:{strategy:'active',title:'Scan actif d’une machine',short:'Scan actif',description:'Tester les ports d’une seule machine et examiner les services qui répondent.'},
    map:{strategy:'active',title:'Cartographie du réseau',short:'Cartographie',description:'Découvrir les adresses répondantes d’un réseau et explorer les résultats sur la carte.'},
    vulnerability:{strategy:'passive',title:'Scan de vulnérabilités',short:'Audit de sécurité',description:'Contrôler les protections, mises à jour et configurations à risque du poste Windows, Linux ou macOS choisi.'}
  };
  const severity={critical:'Critique',high:'Élevée',medium:'Moyenne',low:'Faible',info:'Information'};
  function mapping(report,onSelect){
    const hosts=new Map();
    for(const row of report?.rows||[])if(['reachable','open','closed'].includes(row.status)){
      if(!hosts.has(row.address))hosts.set(row.address,{address:row.address,name:row.hostname,detail:row.detail});
    }
    const all=[...hosts.values()].sort((a,b)=>a.address.localeCompare(b.address,'en',{numeric:true})),shown=all.slice(0,48);
    if(!report)return '<section class="wgscan-special-empty"><h2>Construire la carte du réseau</h2><p>Configure l’agent dans les paramètres, indique un réseau CIDR ou une plage d’adresses, puis lance la découverte. La carte apparaîtra avec les réponses réellement reçues.</p></section>';
    const nodes=shown.map((host,index)=>{const angle=2*Math.PI*index/Math.max(1,shown.length)-Math.PI/2,ring=index%2?200:260;return {...host,x:400+Math.cos(angle)*ring,y:320+Math.sin(angle)*ring};});
    const svg=shown.length?`<div class="wgscan-network-canvas"><svg viewBox="0 0 800 660" role="img" aria-label="Carte logique des adresses répondant aux sondes de l’agent"><g class="wgscan-network-links">${nodes.map(node=>'<line x1="400" y1="320" x2="'+node.x+'" y2="'+node.y+'"/>').join('')}</g><g class="wgscan-network-origin"><circle cx="400" cy="320" r="35"/><text x="400" y="324" text-anchor="middle">Agent</text></g>${nodes.map(node=>`<g class="wgscan-network-node" role="button" tabindex="0" data-map-address="${esc(node.address)}" aria-label="Examiner ${esc(node.address)}"><title>${esc(node.name||node.address)}</title><circle cx="${node.x}" cy="${node.y}" r="18"/><text x="${node.x}" y="${node.y+35}" text-anchor="middle">${esc(node.address)}</text></g>`).join('')}</svg></div>`:'<p class="wgscan-table-empty">Aucune adresse répondante dans ce relevé. Une absence de réponse peut aussi correspondre à un filtrage.</p>';
    return `<section class="wgscan-map-overview"><div class="wgscan-card-heading"><h2>${all.length} adresse(s) répondante(s)</h2><span>Vue logique</span></div><p class="wgscan-note">Les liens représentent les réponses aux sondes de l’agent, pas les câbles ou la topologie physique. Clique sur une adresse pour examiner ses observations.</p>${svg}${all.length>shown.length?'<p class="wgscan-note">48 adresses affichées sur la carte. La table contient le relevé complet.</p>':''}</section>`;
  }
  function bindMapping(root,onSelect){for(const node of root.querySelectorAll('[data-map-address]')){node.onclick=()=>onSelect(node.dataset.mapAddress);node.onkeydown=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();onSelect(node.dataset.mapAddress);}};}}
  function audit(report){
    if(!report)return '<section class="wgscan-special-empty"><h2>Auditer la machine choisie</h2><p>L’agent adapte ses contrôles à Windows, Linux ou macOS : pare-feu, protections du système, accès distants et cache des mises à jour.</p><p>Chaque contrôle fournit son observation et, si nécessaire, une correction à envisager. Les lectures impossibles restent « Non vérifié ».</p></section>';
    const order={critical:0,high:1,medium:2,low:3,info:4},rows=[...report.rows].sort((a,b)=>(a.status==='issue'?0:1)-(b.status==='issue'?0:1)||(order[a.severity]??4)-(order[b.severity]??4));
    return `<section class="wgscan-audit-overview"><div class="wgscan-card-heading"><h2>Contrôles de sécurité du poste</h2><span>${rows.length} contrôles</span></div><p class="wgscan-note">Lecture seule des configurations et du cache de mises à jour du poste. Les points ci-dessous ne constituent pas un inventaire exhaustif des CVE.</p><div class="wgscan-audit-list">${rows.map(row=>`<article class="wgscan-audit-item" data-audit-status="${esc(row.status)}" data-severity="${esc(row.severity)}"><div><span class="wgscan-badge" data-status="${esc(row.status)}">${esc(webScanModel.labels[row.status])}</span>${row.status==='issue'?'<span class="wgscan-severity">'+esc(severity[row.severity]||'À examiner')+'</span>':''}</div><h3>${esc(row.title||row.checkId)}</h3><p>${esc(row.detail)}</p>${row.status==='issue'||row.status==='notchecked'?'<p class="wgscan-remediation"><strong>Suite proposée : </strong>'+esc(row.recommendation)+'</p>':''}</article>`).join('')}</div>${(report.warnings||[]).map(w=>'<p class="wgscan-note">'+esc(w)+'</p>').join('')}</section>`;
  }
  return {definitions,severity,mapping,bindMapping,audit};
})();
