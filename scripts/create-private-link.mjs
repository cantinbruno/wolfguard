import {randomBytes} from 'node:crypto';
import {existsSync, mkdirSync, writeFileSync, copyFileSync, constants} from 'node:fs';
import path from 'node:path';
import {privateDirectory,siteAccessFile} from './private-paths.mjs';

// The key stays outside the checkout. Keep it to preserve the link across builds.
const folder = privateDirectory;
const file = siteAccessFile;
mkdirSync(folder, {recursive: true});
if (process.argv.includes('--rotate') && existsSync(file)) {
  copyFileSync(file, path.join(folder,'site-access-before-'+Date.now()+'.json'), constants.COPYFILE_EXCL);
  writeFileSync(file, JSON.stringify({key: randomBytes(32).toString('hex')})+'\n', {mode: 0o600});
}
if (!existsSync(file)) writeFileSync(file, JSON.stringify({key: randomBytes(32).toString('hex')})+'\n', {mode: 0o600, flag: 'wx'});
console.log('Clé du lien privé conservée localement dans '+file+'.');
