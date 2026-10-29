import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash, createCipheriv, randomBytes} from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'app');
const output = path.join(root, 'docs');
const allowed = new Set(['.exe','.zip','.html','.css','.js','.json','.svg','.txt','.md']);
// A build must preserve the private URL. Never generate a replacement silently.
const entryFile=path.join(root,'.local-archive','site-access.json');
if(!existsSync(entryFile))throw new Error('Clé du lien privé absente. Restaurer .local-archive/site-access.json avant de publier.');
const entryKey=JSON.parse(readFileSync(entryFile,'utf8')).key;
if(!/^[a-f0-9]{64}$/.test(entryKey||''))throw new Error('Clé du lien privé invalide.');
const digest=createHash('sha256');
function verify(directory) {
  for (const entry of readdirSync(directory, {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Lien symbolique interdit dans les sources du site.');
    if (entry.isDirectory()) verify(filename);
    else {
      if (!allowed.has(path.extname(entry.name).toLowerCase())) throw new Error('Fichier non publiable : ' + path.relative(source, filename));
      if(path.extname(entry.name).toLowerCase()==='.zip'&&filename!==path.join(source,'downloads','WolfGuard-Agent-Windows.zip'))throw new Error('Archive non autorisée dans le site.');
      if(path.extname(entry.name).toLowerCase()==='.exe'&&filename!==path.join(source,'downloads','WolfGuard-Agent-Windows.exe'))throw new Error('Exécutable non autorisé dans le site.');
      digest.update(path.relative(root,filename)); digest.update(readFileSync(filename));
    }
  }
}
execFileSync('python',[path.join(root,'scripts/package-agent.py')],{cwd:root,stdio:'inherit'});
verify(source);
verify(path.join(root,'browser'));
digest.update(readFileSync(fileURLToPath(import.meta.url)));
const revision=digest.digest('hex').slice(0,16);
if (output !== path.resolve(root, 'docs') || path.dirname(output) !== root || (existsSync(output) && lstatSync(output).isSymbolicLink())) throw new Error('Répertoire de publication invalide.');
if (existsSync(output)) rmSync(output, {recursive:true});
mkdirSync(output);
cpSync(source, output, {recursive:true});
cpSync(path.join(root, 'browser'), path.join(output, 'browser'), {recursive:true});
// Load the storage/crypto modules as integrity-checked classic bundles in the app.
// Their original ES modules stay available for maintenance tools and tests.
for(const [name,globalName] of [['crypto','WolfGuardCrypto'],['storage','WolfGuardStorage'],['cloud','WolfGuardCloud']]) {
  const module=readFileSync(path.join(root,'browser',name+'.js'),'utf8');
  const exports=[...module.matchAll(/^export (?:async )?(?:function|const) (\w+)/gm)].map(match=>match[1]);
  if(!exports.length || /^import /m.test(module))throw new Error('Module navigateur non autonome : '+name);
  writeFileSync(path.join(output,'browser',name+'.bundle.js'),'const '+globalName+' = (() => {\n'+module.replace(/^export /gm,'')+'\nreturn Object.freeze({'+exports.join(',')+'});\n})();\n');
}
// All sections ship with the web application. Omit Windows module installation
// before the settings dialog binds its tabs and keyboard navigation.
const settingsFile=path.join(output,'js/views/settings.js');
let settings=readFileSync(settingsFile,'utf8');
settings=settings.replace(/<button\b[^>]*data-settings-tab="modules"[^>]*>[\s\S]*?<\/button>/g,'');
settings=settings.replace(/<section\b[^>]*id="settings-modules"[^>]*>[\s\S]*?<\/section>/g,'');
settings=settings.replace("['security', 'data', 'interface', 'modules']","['security', 'data', 'interface']");
if (/data-settings-tab="modules"|id="settings-modules"|\$\{moduleManagerHTML\(\)\}/.test(settings)) throw new Error('L’import des sections Windows doit être absent des paramètres web.');
writeFileSync(settingsFile,settings);
let html = readFileSync(path.join(output, 'index.html'), 'utf8');
html = html.replace("script-src 'self' 'unsafe-inline' 'unsafe-eval'", "script-src 'self' 'wasm-unsafe-eval'; script-src-attr 'none'");
html = html.replace('</head>', '<link rel="stylesheet" href="browser/access.css">\n</head>');
html = html.replace('</head>', '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">\n</head>');
html = html.replace("connect-src 'self'", "connect-src 'self' https://wolfguard-web-cantin.cantin-bruno.chatgpt.site");
html = html.replace('class="connection-gate access-screen"', 'class="connection-gate access-screen hidden"');
html = html.replace(/<script src="js\/app\.js[^\"]*"><\/script>/, '<script src="browser/crypto.bundle.js"></script>\n<script src="browser/storage.bundle.js"></script>\n<script src="browser/cloud.bundle.js"></script>\n<script src="browser/actions.js"></script>\n<script src="browser/adapter.js"></script>');
html = html.replace(/((?:src|href)=")([^\"]+\.(?:js|css)(?:\?[^\"]*)?)(")/g,(_match,before,url,after)=>before+url+(url.includes('?')?'&':'?')+'wg='+revision+after);
if (!html.includes('browser/adapter.js')) throw new Error('Point de démarrage de l’application introuvable.');
const adapter=path.join(output,'browser/adapter.js');
const entry=readFileSync(adapter,'utf8').replace("await Promise.all([import('./crypto.js'),import('./storage.js'),import('./cloud.js')])",'[WolfGuardCrypto,WolfGuardStorage,WolfGuardCloud]');
if(!entry.includes('[WolfGuardCrypto,WolfGuardStorage,WolfGuardCloud]'))throw new Error('Chargement des modules chiffrés introuvable.');
writeFileSync(adapter,entry);
// Git normalizes Windows CRLF to LF before Pages serves the files. Hash the
// exact LF bytes that will be published, including the generated bundles.
function normalizePublishedText(folder) {
  for(const entry of readdirSync(folder,{withFileTypes:true})) {
    const filename=path.join(folder,entry.name);
    if(entry.isDirectory())normalizePublishedText(filename);
    else if(allowed.has(path.extname(filename).toLowerCase())&&!['.zip','.exe'].includes(path.extname(filename).toLowerCase())) {
      const contents=readFileSync(filename,'utf8');
      if(contents.includes('\r\n'))writeFileSync(filename,contents.replace(/\r\n/g,'\n'));
    }
  }
}
normalizePublishedText(output);
html = html.replace(/<(script|link)\b[^>]*(?:src|href)="([^"?]+)(?:\?[^\"]*)?"[^>]*>/g,(tag,_name,filename)=>{
  if (!/\.(?:js|css)$/.test(filename)) return tag;
  const integrity=createHash('sha384').update(readFileSync(path.join(output,filename))).digest('base64');
  return tag.slice(0,-1)+' integrity="sha384-'+integrity+'" crossorigin="anonymous">';
});
if (!html.includes("script-src-attr 'none'") || /\son[a-z]+\s*=/i.test(html)) throw new Error('La page ne doit pas contenir de gestionnaire HTML exécutable.');
for (const directory of [path.join(output,'js'),path.join(output,'browser')]) {
  const check=folder=>{for(const entry of readdirSync(folder,{withFileTypes:true})) {const filename=path.join(folder,entry.name);if(entry.isDirectory())check(filename);else if(entry.name.endsWith('.js') && /(?<![\w.-])on[a-z]+="/.test(readFileSync(filename,'utf8')))throw new Error('Gestionnaire HTML exécutable : '+entry.name);}};
  check(directory);
}
// Only the private link can decrypt the live document. The key is never
// published, and unknown paths must not redirect visitors to a working entry.
mkdirSync(path.join(root,'.cache'),{recursive:true});
writeFileSync(path.join(root,'.cache','site-document.html'),html);
const iv=randomBytes(12);
const cipher=createCipheriv('aes-256-gcm',Buffer.from(entryKey,'hex'),iv);
cipher.setAAD(Buffer.from('WolfGuard private entry v1'));
const encrypted=Buffer.concat([cipher.update(html,'utf8'),cipher.final(),cipher.getAuthTag()]);
writeFileSync(path.join(output,'browser','site-entry.json'),JSON.stringify({iv:iv.toString('base64'),data:encrypted.toString('base64')}));
let gateHTML=readFileSync(path.join(root,'browser','private-entry.html'),'utf8').replace(/\r\n/g,'\n');
const loaderHash=createHash('sha384').update(readFileSync(path.join(output,'browser','private-entry.js'))).digest('base64');
gateHTML=gateHTML.replace('src="browser/private-entry.js"','src="browser/private-entry.js?wg='+revision+'" integrity="sha384-'+loaderHash+'" crossorigin="anonymous"');
writeFileSync(path.join(output,'index.html'),gateHTML);
rmSync(path.join(output,'browser','private-entry.html'));
// Pages returns this unbranded document with HTTP 404 for unknown paths.
// Send invalid entries to a missing path distinct from /404.html itself.
writeFileSync(path.join(output,'404.html'),readFileSync(path.join(output,'browser','not-found.html')));
rmSync(path.join(output,'browser','not-found.html'));
writeFileSync(path.join(output,'robots.txt'),'User-agent: *\nDisallow: /\n');
writeFileSync(path.join(output, '.nojekyll'), '');
writeFileSync(path.join(output, 'CNAME'), 'wolfguard.wavetools.fr\n');
console.log('Application originale et adaptation navigateur publiables dans docs/.');
