// Reproduce the self-hosted engine after npm ci --prefix tools/browser-ai --ignore-scripts.
import {mkdirSync,readFileSync,copyFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dependency=path.join(root,'tools/browser-ai/node_modules/@wllama/wllama');
const info=JSON.parse(readFileSync(path.join(dependency,'package.json'),'utf8'));
if(info.version!=='3.8.1')throw new Error('Version wllama inattendue.');
const destination=path.join(root,'app/vendor/browser-ai');mkdirSync(destination,{recursive:true});
const files={'wllama.js':'esm/index.min.js','wllama.wasm':'esm/wasm/wllama.wasm','LICENSE.wllama.txt':'LICENCE'},hashes={};
for(const [name,source]of Object.entries(files)){copyFileSync(path.join(dependency,source),path.join(destination,name));hashes[name]=createHash('sha256').update(readFileSync(path.join(destination,name))).digest('hex');}
copyFileSync(path.join(root,'tools/browser-ai/LICENSE.llamacpp.txt'),path.join(destination,'LICENSE.llamacpp.txt'));
hashes['LICENSE.llamacpp.txt']=createHash('sha256').update(readFileSync(path.join(destination,'LICENSE.llamacpp.txt'))).digest('hex');
writeFileSync(path.join(destination,'manifest.json'),JSON.stringify({wllama:info.version,files:hashes},null,2)+'\n');
console.log('Moteur IA navigateur préparé depuis le paquet verrouillé.');
