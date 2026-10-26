import {DatabaseSync} from 'node:sqlite';
import {createHash,pbkdf2Sync,createDecipheriv,createCipheriv,randomBytes,timingSafeEqual} from 'node:crypto';
import {writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkPassword} from '../browser/crypto.js';

const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function readSection(filename) {
  if (!existsSync(filename)) return {items:[],folders:[],settings:[],activity:[]};
  const database=new DatabaseSync(filename,{readOnly:true});
  try {
    database.exec('BEGIN');
    const read=store=>database.prepare('SELECT document'+(store==='items'?',folder_id':store==='folders'?',parent_id':'')+' FROM '+store).all().map(row=>{
      const record=JSON.parse(row.document);
      if (store==='items') record.folderId=row.folder_id;
      if (store==='folders') record.parentId=row.parent_id;
      return record;
    });
    const snapshot=Object.fromEntries(['items','folders','settings','activity'].map(store=>[store,read(store)]));
    database.exec('COMMIT'); return snapshot;
  } finally { database.close(); }
}
function decryptSecret(blob,key) {
  if (!blob) return '';
  const bytes=Buffer.from(blob.data),decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(blob.iv));
  decipher.setAuthTag(bytes.subarray(-16));
  const clear=Buffer.concat([decipher.update(bytes.subarray(0,-16)),decipher.final()]);
  try { return clear.toString('utf8'); } finally { clear.fill(0); }
}
function encryptSecret(value,key) {
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),bytes=Buffer.from(value);
  try { return {iv:[...iv],data:[...Buffer.concat([cipher.update(bytes),cipher.final(),cipher.getAuthTag()])]}; }
  finally { bytes.fill(0); }
}
export function convert(sections,pin) {
  const stores=Object.fromEntries(['items','folders','settings','activity'].map(store=>[store,new Map()]));
  const vaultSecrets=new Map();
  for (const snapshot of sections) {
    const settings=new Map(snapshot.settings.map(record=>[record.key,record.value]));
    let key;
    try {
      if (snapshot.items.some(item=>item.type==='vault')) {
        const expected=settings.get('accessCodeHash'),hash=createHash('sha256').update('ITW_ACCESS|'+pin).digest('hex');
        if (typeof expected!=='string'||expected.length!==hash.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(hash))) throw new Error('Code du coffre Windows incorrect.');
        const meta=settings.get('vaultCrypto');
        if (!Array.isArray(meta?.salt)||meta.salt.length!==16) throw new Error('Paramètres de chiffrement Windows invalides.');
        key=pbkdf2Sync(pin,Buffer.from(meta.salt),250000,32,'sha256');
      }
      for (const store of Object.keys(stores)) {
        for (const original of snapshot[store]||[]) {
          const record=structuredClone(original),id=store==='settings'?record.key:record.id;
          if (store==='settings'&&['accessCodeHash','vaultCrypto','portableDirHandle'].includes(id)) continue;
          if (store==='items'&&record.type==='vault') {
            const secret=record.vaultBlobEnc?JSON.parse(decryptSecret(record.vaultBlobEnc,key)):{username:record.username||'',password:decryptSecret(record.passwordEnc,key),url:record.url||'',host:record.host||'',notes:record.notes||'',custom:record.custom||[]};
            vaultSecrets.set(id,secret);
            for (const field of ['vaultBlobEnc','passwordEnc','username','password','url','host','notes','custom']) delete record[field];
            record.encryptionVersion=2;
          }
          const previous=stores[store].get(id);
          if (store!=='settings'&&previous&&JSON.stringify(previous)!==JSON.stringify(record)) throw new Error('Deux bases contiennent des fiches différentes avec le même identifiant. Migration interrompue pour conserver les originaux.');
          stores[store].set(id,record);
        }
      }
    } finally { key?.fill(0); }
  }
  return {payload:{version:2,...Object.fromEntries(Object.entries(stores).map(([store,records])=>[store,[...records.values()]]))},vaultSecrets};
}
export function encrypt(snapshot,password,vaultSecrets=new Map()) {
  checkPassword(password);
  const salt=randomBytes(16),iv=randomBytes(12),key=pbkdf2Sync(password,salt,600000,32,'sha256');
  const payload=structuredClone(snapshot);
  try {
    for (const item of payload.items) if (vaultSecrets.has(item.id)) item.vaultBlobEnc=encryptSecret(JSON.stringify(vaultSecrets.get(item.id)),key);
    const bytes=Buffer.from(JSON.stringify(payload));
    try {
      if (bytes.length>32*1024*1024-16) throw new Error('Espace supérieur à la limite de 32 Mo.');
      const cipher=createCipheriv('aes-256-gcm',key,iv);
      cipher.setAAD(Buffer.from('wolfguard-workspace|2|AES-256-GCM|PBKDF2-SHA256'));
      const data=Buffer.concat([cipher.update(bytes),cipher.final(),cipher.getAuthTag()]);
      return {format:'wolfguard-workspace',version:2,cipher:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:600000,revision:1,salt:salt.toString('base64'),iv:iv.toString('base64'),data:data.toString('base64')};
    } finally { bytes.fill(0); }
  } finally { key.fill(0); }
}
async function hiddenPrompt(label) {
  if (!process.stdin.isTTY) throw new Error('Utilise un terminal interactif. Ne passe aucun mot de passe en argument.');
  process.stderr.write(label);
  return new Promise((resolve,reject)=>{
    let value='';process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');process.stdin.resume();
    const finish=()=>{process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stderr.write('\n');};
    const onData=chunk=>{for(const char of chunk){
      if(char==='\u0003'){finish();reject(new Error('Annulé.'));return;}
      if(char==='\r'||char==='\n'){finish();resolve(value);return;}
      if(char==='\u007f'||char==='\b')value=[...value].slice(0,-1).join('');
      else if(char>=' '&&value.length<1024)value+=char;
    }};
    process.stdin.on('data',onData);
  });
}
export async function main() {
  const args=process.argv.slice(2);
  if(args.length!==4||args[0]!=='--source'||args[2]!=='--output')throw new Error('Usage : node scripts/migrate-desktop.mjs --source "C:/chemin/myapp" --output "C:/sauvegardes/transfert.wgweb"');
  const source=path.resolve(args[1]),output=path.resolve(args[3]),relative=path.relative(repository,output);
  if(!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative))throw new Error('Choisis une sortie hors du dépôt.');
  if(existsSync(output))throw new Error('La destination existe déjà.');
  const sections=['general','memo','outil','coffre-fort'].map(section=>readSection(path.join(source,section,'donnees','bibliotheque.sqlite3')));
  if(!sections.some(section=>section.items.length))throw new Error('Aucune fiche trouvée dans les bases à cet emplacement.');
  let pin='',password='',confirmation='';
  try{
    if(sections.some(section=>section.items.some(item=>item.type==='vault')))pin=await hiddenPrompt('Code Windows actuel (saisie masquée) : ');
    const result=convert(sections,pin);
    password=await hiddenPrompt('Nouveau code web (8 lettres A-Z, majuscules/minuscules distinguées, saisie masquée) : ');
    checkPassword(password);
    confirmation=await hiddenPrompt('Confirmer le code (saisie masquée) : ');
    if(password!==confirmation)throw new Error('Les codes ne correspondent pas.');
    writeFileSync(output,JSON.stringify(encrypt(result.payload,password,result.vaultSecrets)),{flag:'wx',mode:0o600});
    process.stdout.write(`Sauvegarde chiffrée créée : ${result.payload.items.length} fiches, ${result.payload.folders.length} dossiers.\nTexte riche, commandes, pièces jointes, sous-dossiers et champs personnalisés conservés.\nLes bases Windows restent intactes. Ouvre la sauvegarde depuis le site.\n`);
  }finally{pin='';password='';confirmation='';}
}
