// Local, interactive conversion. Never run against another user's files.
import {DatabaseSync} from 'node:sqlite';
import {createHash, pbkdf2Sync, createDecipheriv, createCipheriv, randomBytes, timingSafeEqual} from 'node:crypto';
import {writeFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const aad = Buffer.from('wolfguard-web|1|AES-256-GCM|PBKDF2-SHA256');
export function readSection(filename) {
  if (!existsSync(filename)) return {items: [], folders: [], settings: []};
  const database = new DatabaseSync(filename, {readOnly: true});
  try {
    database.exec('BEGIN');
    const read = name => database.prepare(`SELECT document FROM ${name}`).all().map(row => JSON.parse(row.document));
    const snapshot = {items: read('items'), folders: read('folders'), settings: read('settings')};
    database.exec('COMMIT'); return snapshot;
  } finally { database.close(); }
}
function plain(value) {
  // Content is displayed with textContent in the web application, never as HTML.
  return String(value ?? '').replace(/<(?:br\s*\/?|\/p|\/div|\/li|\/h[1-6])>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
}
function oldSecret(blob, key) {
  if (!blob) return '';
  const bytes = Buffer.from(blob.data), iv = Buffer.from(blob.iv);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(bytes.subarray(-16));
  const clear = Buffer.concat([decipher.update(bytes.subarray(0, -16)), decipher.final()]);
  try { return clear.toString('utf8'); } finally { clear.fill(0); }
}
export function convert(sections, pin) {
  const payload = {version: 1, items: [], folders: []};
  let attachments = 0, flattenedFolders = 0;
  for (const [index, snapshot] of sections.entries()) {
    const settings = new Map(snapshot.settings.map(setting => [setting.key, setting.value]));
    const active = snapshot.items.filter(item => !item.deletedAt);
    let key;
    if (active.some(item => item.type === 'vault')) {
      const expected = settings.get('accessCodeHash');
      const hash = createHash('sha256').update('ITW_ACCESS|' + pin).digest('hex');
      if (typeof expected !== 'string' || expected.length !== hash.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) throw new Error('Code du coffre Windows incorrect.');
      const meta = settings.get('vaultCrypto');
      if (!Array.isArray(meta?.salt) || meta.salt.length !== 16) throw new Error('Sel de chiffrement du coffre Windows absent ou invalide.');
      key = pbkdf2Sync(pin, Buffer.from(meta.salt), 250000, 32, 'sha256');
    }
    try {
      const map = new Map();
      for (const original of snapshot.folders.filter(folder => !folder.deletedAt)) {
        const type = original.section === 'vault' ? 'vault' : 'memo';
        const id = `desktop-${index}-${original.id}`;
        const names = [original.name || 'Dossier'];
        let current = original, visited = new Set([original.id]);
        while (current.parentId) {
          const parent = snapshot.folders.find(folder => folder.id === current.parentId);
          if (!parent || visited.has(parent.id)) break;
          visited.add(parent.id); names.unshift(parent.name || 'Dossier'); current = parent;
        }
        if (names.length > 1) flattenedFolders++;
        payload.folders.push({id, name: names.join(' / ').slice(0,100), section: type}); map.set(original.id, id);
      }
      for (const original of active) {
        const type = original.type === 'vault' ? 'vault' : 'memo';
        let secret = {};
        if (type === 'vault') {
          secret = original.vaultBlobEnc ? JSON.parse(oldSecret(original.vaultBlobEnc, key)) : {...original, password: oldSecret(original.passwordEnc, key)};
        }
        const blocks = [];
        if (type === 'vault') {
          if (secret.notes) blocks.push(plain(secret.notes));
          if (secret.host) blocks.push('Serveur : ' + secret.host);
          for (const field of secret.custom || []) blocks.push((field.label || field.name || 'Champ') + ' : ' + (field.value || ''));
        } else {
          for (const name of ['description','content','notes']) if (original[name]) blocks.push(plain(original[name]));
          for (const block of original.commandBlocks || []) blocks.push([block.title, block.command, block.code, block.description].filter(Boolean).join('\n'));
          if (original.command) blocks.push(String(original.command));
          if (original.tags?.length) blocks.push('Étiquettes : ' + original.tags.join(', '));
        }
        attachments += (original.attachments || []).length;
        let folder = map.get(original.folderId) || null;
        if (folder && !payload.folders.some(f => f.id === folder && f.section === type)) folder = null;
        const content = [...new Set(blocks)].join('\n\n');
        if (content.length > 500000) throw new Error('Une fiche dépasse la limite de 500 000 caractères.');
        payload.items.push({id:`desktop-${index}-${original.id}`,type,title:String(original.title || 'Sans titre').slice(0,250),content,username:String(secret.username || ''),password:String(secret.password || ''),url:String(secret.url || ''),folder,updatedAt:Number.isFinite(Date.parse(original.updatedAt)) ? original.updatedAt : new Date().toISOString()});
      }
    } finally { key?.fill(0); }
  }
  if (payload.items.length > 10000 || payload.folders.length > 1000) throw new Error('Nombre de fiches ou dossiers supérieur aux limites de la version web.');
  return {payload, attachments, flattenedFolders};
}
export function encrypt(payload, password) {
  if (password.length < 14 || password.length > 1024) throw new Error('Le nouveau mot de passe doit contenir entre 14 et 1 024 caractères.');
  const salt = randomBytes(16), iv = randomBytes(12), key = pbkdf2Sync(password, salt, 600000, 32, 'sha256');
  const bytes = Buffer.from(JSON.stringify(payload));
  try {
    if (bytes.length > 32 * 1024 * 1024 - 16) throw new Error('Espace trop volumineux.');
    const cipher = createCipheriv('aes-256-gcm', key, iv); cipher.setAAD(aad);
    const data = Buffer.concat([cipher.update(bytes), cipher.final(), cipher.getAuthTag()]);
    return {format:'wolfguard-web',version:1,cipher:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:600000,revision:1,salt:salt.toString('base64'),iv:iv.toString('base64'),data:data.toString('base64')};
  } finally { key.fill(0); bytes.fill(0); }
}
async function hiddenPrompt(label) {
  if (!process.stdin.isTTY) throw new Error('Lance ce script dans un terminal interactif ; aucun mot de passe ne doit être passé en argument.');
  process.stderr.write(label);
  return new Promise((resolve, reject) => {
    let value = '';
    process.stdin.setRawMode(true); process.stdin.setEncoding('utf8'); process.stdin.resume();
    const finish = () => { process.stdin.off('data', onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stderr.write('\n'); };
    const onData = chunk => {
      for (const char of chunk) {
        if (char === '\u0003') { finish(); reject(new Error('Annulé.')); return; }
        if (char === '\r' || char === '\n') { finish(); resolve(value); return; }
        if (char === '\u007f' || char === '\b') value = [...value].slice(0,-1).join('');
        else if (char >= ' ' && value.length < 1024) value += char;
      }
    };
    process.stdin.on('data', onData);
  });
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--source' || args[2] !== '--output') throw new Error('Usage : node scripts/migrate-desktop.mjs --source "C:/chemin/myapp" --output "C:/sauvegardes/transfert.wgweb"');
  const source = path.resolve(args[1]), output = path.resolve(args[3]);
  const relative = path.relative(repository, output);
  if (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)) throw new Error('Choisis une sortie hors du dépôt web pour protéger tes données.');
  if (existsSync(output)) throw new Error('La destination existe déjà. Choisis un autre fichier.');
  const sections = ['memo','outil','coffre-fort'].map(section => readSection(path.join(source, section, 'donnees', 'bibliotheque.sqlite3')));
  if (!sections.some(s => s.items.length)) throw new Error('Aucune base avec des fiches trouvée à cet emplacement.');
  let pin = '', password = '', confirmation = '';
  try {
    if (sections.some(s => s.items.some(i => i.type === 'vault' && !i.deletedAt))) pin = await hiddenPrompt('Code actuel du coffre Windows (saisie masquée) : ');
    const result = convert(sections, pin);
    if (result.attachments) throw new Error(`${result.attachments} pièce(s) jointe(s) détectée(s). Migration interrompue pour éviter une perte : cette version web ne reprend pas encore les pièces jointes.`);
    password = await hiddenPrompt('Nouveau mot de passe maître web (14 caractères minimum, saisie masquée) : ');
    confirmation = await hiddenPrompt('Confirmer le nouveau mot de passe (saisie masquée) : ');
    if (password !== confirmation) throw new Error('Les mots de passe ne correspondent pas.');
    writeFileSync(output, JSON.stringify(encrypt(result.payload, password)), {flag:'wx',mode:0o600});
    process.stdout.write(`Sauvegarde chiffrée créée. ${result.payload.items.length} fiche(s), ${result.payload.folders.length} dossier(s).\nLe texte enrichi est converti en texte simple ; les sous-dossiers sont représentés par leur chemin.\nDans WolfGuard Web, choisis « Ouvrir une sauvegarde chiffrée ». Les bases Windows restent intactes.\n`);
  } finally { pin = ''; password = ''; confirmation = ''; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
