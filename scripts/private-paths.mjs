import path from 'node:path';
import {homedir} from 'node:os';

// The current private-link key is local configuration, stored outside the checkout.
const configRoot=process.platform==='win32'
  ?path.join(process.env.LOCALAPPDATA||path.join(homedir(),'AppData','Local'),'WolfGuardWeb')
  :path.join(process.env.XDG_CONFIG_HOME||path.join(homedir(),'.config'),'wolfguard-web');
export const privateDirectory=path.resolve(process.env.WOLFGUARD_PRIVATE_DIR||path.join(configRoot,'private'));
export const siteAccessFile=path.join(privateDirectory,'site-access.json');
