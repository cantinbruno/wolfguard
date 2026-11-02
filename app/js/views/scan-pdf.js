'use strict';

// Loaded only when exporting. The PDF engine and fonts are local, pinned and integrity-checked.
const webScanPDF = (() => {
  const revision=typeof document==='undefined'?'':new URL(document.currentScript?.src||location.href).searchParams.get('wg')||'';
  const assets=[
    ['vendor/pdfmake-0.3.13.min.js','sha384-qu75e4PlJ3kkA92U7hAKqcR0glKMESqe/BEMaD/fbiUrEQzeGscEhiDGHRhxdmK7'],
    ['vendor/pdfmake-roboto-3.014.js','sha384-uKmYBwIy9RcLM7XFUfGF4fW7cp+tQmTus9R61krYcr/3rvm6SelDjkdIHXTMy8wm']
  ];
  const ink='#152638',muted='#5c6c7c',navy='#101e2e',line='#dce3e9';
  const text=value=>String(value??'');
  const xml=value=>text(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
  const label=status=>webScanModel.labels[status]||status||'Non renseigné';
  let enginePromise,logoPromise;
  function script([path,integrity]){
    return new Promise((resolve,reject)=>{
      const element=document.createElement('script');let timeout;
      const fail=()=>{clearTimeout(timeout);element.remove();reject(new Error('Le moteur PDF ne peut pas être chargé. Réessaie.'));};
      element.src=path+(revision?'?wg='+encodeURIComponent(revision):'');element.integrity=integrity;element.crossOrigin='anonymous';
      element.onload=()=>{clearTimeout(timeout);resolve();};element.onerror=fail;
      timeout=setTimeout(fail,30000);document.head.append(element);
    });
  }
  function engine(){
    if(!enginePromise)enginePromise=(async()=>{for(const asset of assets)await script(asset);pdfMake.setUrlAccessPolicy(()=>false);return pdfMake;})().catch(error=>{enginePromise=null;throw error;});
    return enginePromise;
  }
  function logo(){
    logoPromise||=fetch('images/logo-loup.svg').then(response=>response.ok?response.text():'').catch(()=>'');
    return logoPromise;
  }
  function heading(index,title){return {text:[{text:index+'   ',color:'#8194a5',fontSize:8},{text:title}],style:'section',headlineLevel:1};}
  function note(value,color='#78cdbb',warning=false){
    return {margin:[0,8,0,4],table:{widths:['*'],body:[[{text:text(value),fontSize:8.2,lineHeight:1.35,color:warning?'#785327':muted,fillColor:warning?'#fff8ee':'#f4f7fa',border:[true,false,false,false],borderColor:[color,color,color,color]}]]},layout:{hLineWidth:()=>0,vLineWidth:i=>i===0?2:0,paddingLeft:()=>10,paddingRight:()=>10,paddingTop:()=>9,paddingBottom:()=>9}};
  }
  function table(headers,rows,widths){
    const body=[headers.map(value=>({text:value,bold:true,fontSize:7.3,color:'#fff',fillColor:navy})),...rows.map(values=>values.map(value=>({text:text(value)||'—',fontSize:7.5,lineHeight:1.2})))];
    return {table:{headerRows:1,keepWithHeaderRows:1,widths,body},layout:{hLineWidth:i=>i===0?0:.5,vLineWidth:()=>0,hLineColor:()=>line,fillColor:i=>i>0&&i%2===0?'#f6f8fa':null,paddingLeft:()=>5,paddingRight:()=>5,paddingTop:()=>7,paddingBottom:()=>7}};
  }
  function results(model){
    const rows=model.rows;
    if(!rows.length)return [{text:'Aucune observation à détailler.',color:muted,fontSize:9,margin:[0,8,0,12]}];
    if(model.kind==='vulnerability'){
      const ranks={issue:0,notchecked:1,info:2,passed:3},severities=['critical','high','medium','low','info'];
      const severity=row=>{const index=severities.indexOf(row.severity);return index<0?5:index;};
      return [...rows].sort((a,b)=>(ranks[a.status]??4)-(ranks[b.status]??4)||severity(a)-severity(b)).map(row=>{
        const stack=[
          {columns:[{text:row.title||row.checkId,bold:true,fontSize:11,width:'*'},{text:label(row.status)+(row.status==='issue'?' · '+(scanInsights.severity[row.severity]||'Gravité non fournie'):''),width:130,alignment:'right',color:row.status==='issue'?'#a05d23':row.status==='passed'?'#24715a':muted,fontSize:7.5}],columnGap:10,margin:[0,0,0,5]},
          {text:[row.checkId,row.address].filter(Boolean).join(' · '),fontSize:7.5,color:muted,margin:[0,0,0,12]},
          {text:'PREUVE / OBSERVATION',style:'eyebrow',margin:[0,0,0,5]},
          {text:row.detail||'Aucune preuve fournie.',fontSize:9,lineHeight:1.3}
        ];
        if(row.recommendation)stack.push({text:'ACTION RECOMMANDÉE',style:'eyebrow',margin:[0,12,0,5]},{text:row.recommendation,fontSize:9,lineHeight:1.3,color:'#274a62'});
        if(row.reference)stack.push({text:'Référence : '+row.reference,fontSize:7.5,color:muted,margin:[0,12,0,0]});
        return {margin:[0,0,0,10],table:{widths:['*'],body:[[{stack}]]},layout:{hLineWidth:()=>.5,vLineWidth:i=>i===0?2:.5,hLineColor:()=>line,vLineColor:i=>i===0?(row.status==='issue'?'#d5914f':row.status==='passed'?'#69a58d':'#7d95a9'):line,paddingLeft:()=>12,paddingRight:()=>12,paddingTop:()=>12,paddingBottom:()=>12}};
      });
    }
    if(model.kind==='passive')return [table(['Adresse IP','Adresse MAC','Interface','Cache','État du cache','Nom fourni'],rows.map(row=>[row.address,row.macAddress,row.interfaceName,row.transport,row.detail,row.hostname]),['20%','20%','15%','8%','20%','17%'])];
    if(model.kind==='map')return [table(['Adresse IP','État observé','Nom fourni','Port / transport','MAC','Preuve'],rows.map(row=>[row.address,label(row.status),row.hostname,(row.port??'—')+' / '+row.transport,row.macAddress,row.detail]),['21%','16%','14%','14%','16%','19%'])];
    return [table(['Adresse / port','État','Service / version','Nom d’hôte','Preuve'],rows.map(row=>[(row.address.includes(':')?'['+row.address+']':row.address)+(row.port==null?'':':'+row.port)+'\n'+row.transport,label(row.status),[row.service,row.product,row.version].filter(Boolean).join(' '),row.hostname,row.detail]),['23%','12%','22%','17%','26%'])];
  }
  function map(model){
    const hosts=[...new Set(model.rows.filter(row=>['reachable','open','closed'].includes(row.status)).map(row=>row.address))],shown=hosts.slice(0,16);
    if(!shown.length)return [note('Aucune réponse confirmée à représenter. Une absence de réponse ne prouve pas l’absence d’une machine.',model.accent)];
    const height=110+Math.ceil(shown.length/4)*85,nodes=shown.map((address,index)=>({address,x:115+(index%4)*230,y:115+Math.floor(index/4)*85}));
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="920" height="'+height+'" viewBox="0 0 920 '+height+'">'+nodes.map(node=>'<line x1="460" y1="40" x2="'+node.x+'" y2="'+node.y+'" stroke="#b5c7d5" stroke-width="1.5"/>').join('')+'<rect x="385" y="18" width="150" height="42" rx="6" fill="'+navy+'"/><text x="460" y="44" text-anchor="middle" font-family="Roboto" font-size="12" fill="white">AGENT</text>'+nodes.map((node,index)=>'<rect x="'+(node.x-102)+'" y="'+(node.y-20)+'" width="204" height="54" rx="6" fill="#f4f7fa" stroke="#6eafc5"/><text x="'+node.x+'" y="'+(node.y-3)+'" text-anchor="middle" font-family="Roboto" font-size="10" fill="#648496">'+(index+1)+'</text><text x="'+node.x+'" y="'+(node.y+17)+'" text-anchor="middle" font-family="Roboto" font-size="'+(node.address.length>25?8:12)+'" fill="#223a4c">'+xml(node.address)+'</text>').join('')+'</svg>';
    return [{svg,width:523,margin:[0,4,0,0]},note('Vue logique des réponses depuis l’agent, sans représentation du câblage physique.'+(hosts.length>shown.length?' '+shown.length+' adresses sur '+hosts.length+' représentées ; toutes les observations figurent dans le tableau.':''),model.accent)];
  }
  function definition(model,mark=''){
    const metadata=(title,value)=>({stack:[{text:title,style:'eyebrow',color:'#8fa3b9',margin:[0,0,0,5]},{text:text(value),fontSize:8.5,color:'#fff'}]});
    const content=[
      {table:{widths:['*'],body:[[{fillColor:navy,stack:[{text:model.kicker,fontSize:7.5,bold:true,color:model.accent,characterSpacing:1.1,margin:[0,0,0,12]},{text:model.title,fontSize:25,bold:true,color:'#fff',margin:[0,0,0,8]},{text:model.name,fontSize:9,color:'#b9c7d7',margin:[0,0,0,22]},{columns:[metadata('CIBLE / PÉRIMÈTRE',model.target),metadata('DATE DU RELEVÉ',model.captured),metadata('SOURCE',model.source)],columnGap:18}]}]]},layout:{hLineWidth:()=>0,vLineWidth:()=>0,paddingLeft:()=>18,paddingRight:()=>18,paddingTop:()=>20,paddingBottom:()=>20},margin:[0,0,0,15]},
      {columns:[{text:'État : '+model.status},{text:model.rows.length.toLocaleString('fr-FR')+' observation(s)',alignment:'right'}],fontSize:8,color:muted,margin:[0,0,0,12]},
      {table:{widths:['*','*','*','*'],body:[model.metrics.map(([value,label])=>({fillColor:'#f1f5f8',stack:[{text:Number(value).toLocaleString('fr-FR'),fontSize:22,bold:true,color:ink,margin:[0,0,0,5]},{text:label,fontSize:7.5,color:muted}]}))]},layout:{hLineWidth:()=>0,vLineWidth:()=>4,vLineColor:()=>'#fff',paddingLeft:()=>9,paddingRight:()=>9,paddingTop:()=>12,paddingBottom:()=>12},margin:[0,0,0,3]},
      heading('01','Synthèse'),{text:model.summary,fontSize:10,lineHeight:1.4},note(model.limit,model.accent),
      ...model.warnings.map(value=>note(value,'#c17c2f',true))
    ];
    if(model.kind==='map')content.push(heading('02','Carte du périmètre'),...map(model));
    content.push(heading(model.kind==='map'?'03':'02',model.kind==='vulnerability'?'Preuves & recommandations':model.kind==='passive'?'Voisins réseau observés':model.kind==='map'?'Hôtes & preuves':'Services & réponses'),{text:'Toutes les observations reçues · Filtres de l’écran non appliqués',fontSize:7.5,color:muted,margin:[0,0,0,10]},...results(model));
    if(model.reference){
      const names={added:'Nouvelle',removed:'Absente',changed:'Modifiée'},describe=row=>[label(row.status),row.macAddress,row.service,row.product,row.version,row.detail].filter(Boolean).join(' · ');
      content.push(heading(model.kind==='map'?'04':'03','Évolution du relevé'),note('Référence : '+model.reference.name+' · '+model.reference.date+'. Comparer le même périmètre et les mêmes options. Une absence ne confirme pas une disparition réelle.',model.accent));
      const changes=model.reference.changes;
      content.push(changes.length?table(['Évolution','Adresse / contrôle','Avant','Actuellement'],changes.map(change=>[names[change.type],[change.row.address,change.row.port==null?'':'Port '+change.row.port,change.row.checkId].filter(Boolean).join('\n'),change.before?describe(change.before):change.type==='removed'?describe(change.row):'—',change.type==='removed'?'—':describe(change.row)]),['13%','23%','32%','32%']):{text:'Aucun changement dans les observations détaillées.',fontSize:9,color:muted,margin:[0,8,0,0]});
    }
    return {
      pageSize:'A4',pageMargins:[36,64,36,48],compress:true,
      info:{title:'WolfGuard · '+model.short+' · '+model.target,author:'WolfGuard',subject:model.name,creator:'WolfGuard'},
      defaultStyle:{font:'Roboto',fontSize:9,color:ink},
      styles:{section:{fontSize:14,bold:true,color:ink,margin:[0,19,0,11]},eyebrow:{fontSize:7,bold:true,color:muted,characterSpacing:.7}},
      background:(_page,size)=>({canvas:[{type:'rect',x:0,y:0,w:size.width,h:46,color:navy},{type:'rect',x:0,y:0,w:size.width,h:3,color:model.accent}]}),
      header:()=>({margin:[36,11,36,0],columns:[...(mark?[{svg:mark,width:25,margin:[0,0,9,0]}]:[]),{stack:[{text:'WolfGuard',bold:true,fontSize:13,color:'#fff'},{text:'OBSERVATION & SÉCURITÉ RÉSEAU',fontSize:5.8,characterSpacing:1,color:'#b9c7d7'}],width:'*'},{text:model.short,fontSize:8,color:'#b9c7d7',alignment:'right',margin:[0,6,0,0]}]}),
      footer:(page,total)=>({margin:[36,12,36,0],columns:[{text:'Rapport généré le '+model.generated,fontSize:7,color:muted},{text:'WolfGuard · '+page+' / '+total,fontSize:7,color:muted,alignment:'right'}]}),
      pageBreakBefore:(node,container)=>node.headlineLevel===1&&!container.getFollowingNodesOnPage().length,
      content
    };
  }
  async function create(model){
    const [pdf,mark]=await Promise.all([engine(),logo()]);
    const data=await pdf.createPdf(definition(model,mark)).getBuffer();
    return new Uint8Array(data);
  }
  return {definition,create};
})();
