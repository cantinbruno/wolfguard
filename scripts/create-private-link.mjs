import {randomBytes} from 'node:crypto';
import {existsSync, mkdirSync, writeFileSync, copyFileSync, constants} from 'node:fs';
import {fileURLToPath} from 'node:url';

// This file is ignored by Git. Keep it to preserve the link across builds.
const folder = new URL('../.local-archive/', import.meta.url);
const file = new URL('site-access.json', folder);
mkdirSync(folder, {recursive: true});
if (process.argv.includes('--rotate') && existsSync(file)) {
  copyFileSync(file, new URL('site-access-before-'+Date.now()+'.json',folder), constants.COPYFILE_EXCL);
  writeFileSync(file, JSON.stringify({key: randomBytes(32).toString('hex')})+'\n', {mode: 0o600});
}
if (!existsSync(file)) writeFileSync(file, JSON.stringify({key: randomBytes(32).toString('hex')})+'\n', {mode: 0o600, flag: 'wx'});
console.log('Clé du lien privé conservée localement dans '+fileURLToPath(file)+'.');
