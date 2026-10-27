'use strict';

// Mail-writing templates are different from technical mail-server documentation.
// This one-time plan removes only the former, with an encrypted backup supplied
// by the caller before the atomic workspace update.
function buildMemoMailCleanup(snapshot, stamp = new Date().toISOString()) {
  const versionKey='memo-mail-cleanup-version';
  const summary={removedItems:0,updatedLinks:0,removedActivity:0};
  if(snapshot.settings?.some(row=>row.key===versionKey && Number(row.value)>=1))return {operations:[],summary};
  const types=new Set(['memo','procedure','personal','command','mail','report','template']);
  const fold=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").toLocaleLowerCase('fr');
  const plain=value=>fold(String(value||'').replace(/<(pre|code|script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ').replace(/<\/(?:p|div|li|h[1-6])\s*>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&#0*91;|&#x0*5b;/gi,'[').replace(/&#0*93;|&#x0*5d;/gi,']').replace(/&colon;|&#0*58;/gi,':'));
  function isMailTemplate(item){
    if(!types.has(item.type))return false;
    const kind=item.originalType||item.type;
    if(kind==='mail')return true;
    const title=fold(item.title),text=plain(item.content);
    const explicitTitle=/\b(?:modele(?:\s+de)?|template(?:\s+de)?|exemple(?:\s+de)?|trame(?:\s+de)?)\s+(?:mail|e-mail|email|courriel|message)\b|\b(?:mail|courriel|message)\s+type\b/.test(title);
    if(explicitTitle || /^\s*(?:(?:objet|subject)\s*:\s*)?\[(?:objet|sujet)\]/.test(title))return true;
    // Brackets in PowerShell, regexes, commands or technical procedures are not
    // sufficient grounds for deleting a note.
    if(['command','procedure'].includes(kind)||/<(?:pre|code)\b/i.test(item.content||'')||item.commandBlocks?.some(block=>String(block.code||'').trim()))return false;
    const subject=/(?:^|\n)\s*(?:objet|subject)\s*:\s*(?:\[[^\]\n]{1,160}\]|\{[^}\n]{1,160}\})/.test(text);
    const greeting=/(?:^|\n)\s*(?:bonjour|bonsoir|madame|monsieur|dear|hello)\b/.test(text);
    const signature=/\b(?:cordialement|bien a vous|salutations|best regards|kind regards)\b/.test(text);
    const recipient=/(?:^|\n)\s*(?:destinataire|destinataires|to|a)\s*:/.test(text);
    const placeholders=/\[[^\]\n]{1,100}\]|\{[A-Z_ -]{2,100}\}/i.test(text);
    const communication=/\b(?:mail|e-mail|email|courriel|message|communication|relance|demande d'informations)\b/.test(title);
    return (subject && (greeting||signature||recipient)) || (greeting && placeholders && (signature||communication));
  }
  const removed=new Set((snapshot.items||[]).filter(isMailTemplate).map(item=>item.id));
  const operations=[];
  for(const id of removed)operations.push({action:'delete',store:'items',id});
  for(const item of snapshot.items||[]){
    if(removed.has(item.id)||!Array.isArray(item.linkedItemIds))continue;
    const links=item.linkedItemIds.filter(id=>!removed.has(id));
    if(links.length!==item.linkedItemIds.length){operations.push({action:'put',store:'items',record:{...item,linkedItemIds:links}});summary.updatedLinks++;}
  }
  for(const entry of snapshot.activity||[])if(removed.has(entry.itemId)){operations.push({action:'delete',store:'activity',id:entry.id});summary.removedActivity++;}
  summary.removedItems=removed.size;
  operations.push({action:'put',store:'settings',record:{key:versionKey,value:1}});
  operations.push({action:'put',store:'settings',record:{key:'memo-mail-cleanup-report',value:{at:stamp,...summary}}});
  return {operations,summary};
}
