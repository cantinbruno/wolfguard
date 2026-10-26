import {cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'app');
const output = path.join(root, 'docs');
const allowed = new Set(['.html','.css','.js','.json','.svg','.txt','.md']);
function verify(directory) {
  for (const entry of readdirSync(directory, {withFileTypes:true})) {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Lien symbolique interdit dans les sources du site.');
    if (entry.isDirectory()) verify(filename);
    else if (!allowed.has(path.extname(entry.name).toLowerCase())) throw new Error('Fichier non publiable : ' + path.relative(source, filename));
  }
}
verify(source);
if (output !== path.resolve(root, 'docs') || path.dirname(output) !== root || (existsSync(output) && lstatSync(output).isSymbolicLink())) throw new Error('Répertoire de publication invalide.');
if (existsSync(output)) rmSync(output, {recursive:true});
mkdirSync(output);
cpSync(source, output, {recursive:true});
cpSync(path.join(root, 'browser'), path.join(output, 'browser'), {recursive:true});
let html = readFileSync(path.join(output, 'index.html'), 'utf8');
html = html.replace("script-src 'self' 'unsafe-inline' 'unsafe-eval'", "script-src 'self' 'wasm-unsafe-eval'; script-src-attr 'unsafe-inline'");
html = html.replace('</head>', '<link rel="stylesheet" href="browser/access.css">\n</head>');
html = html.replace('class="connection-gate access-screen"', 'class="connection-gate access-screen hidden"');
html = html.replace(/<script src="js\/app\.js[^\"]*"><\/script>/, '<script src="browser/adapter.js"></script>');
if (!html.includes('browser/adapter.js')) throw new Error('Point de démarrage de l’application introuvable.');
writeFileSync(path.join(output, 'index.html'), html);
writeFileSync(path.join(output, '.nojekyll'), '');
writeFileSync(path.join(output, 'CNAME'), 'wolfguard.wavetools.fr\n');
console.log('Application originale et adaptation navigateur publiables dans docs/.');
