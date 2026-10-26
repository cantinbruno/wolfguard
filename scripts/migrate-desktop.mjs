export {readSection,convert,encrypt} from './transfer-desktop.mjs';
import {main} from './transfer-desktop.mjs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
