// Single source for the repository test suites, used by npm scripts and CI.
// Usage: node scripts/run-tests.mjs <suite>   (node scripts/run-tests.mjs --list)
// Steps run in order and stop at the first failure, like the former "a && b" chains.
import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tests=path.join(root,'tests');
const python=process.env.PYTHON||'python';

// Every Node test file, except agent-signing which must run alone: the
// publication test temporarily alters the agent executable it watches.
const allNode=()=>readdirSync(tests).filter(name=>name.endsWith('.test.mjs')&&name!=='agent-signing.test.mjs').sort();

const suites={
  'all': [
    ['publication'],
    ['node',['migration.test.mjs', 'cloud.test.mjs', 'ai.test.mjs', 'browser-ai.test.mjs', 'access.test.mjs', 'users.test.mjs', 'permissions.test.mjs', 'shared-workspace.test.mjs', 'security.test.mjs', 'hardening.test.mjs', 'publication.test.mjs', 'server.test.mjs', 'organization.test.mjs', 'mail_cleanup.test.mjs', 'form_cleanup.test.mjs', 'memo-references.test.mjs', 'agent.test.mjs', 'topology.test.mjs', 'agent-update.test.mjs', 'scan-report.test.mjs', 'certfr.test.mjs', 'agent-posix.test.mjs', 'endpoint.test.mjs', 'remote.test.mjs', 'files.test.mjs', 'terminal.test.mjs', 'private-entry.test.mjs', 'report-integration.test.mjs', 'fleet-groups.test.mjs', 'antivirus.test.mjs', 'antivirus-api.test.mjs', 'antivirus-auto.test.mjs']],
    ['python','private_entry_test.py'],
    ['python','session_resume_test.py'],
    ['python','agent_window_test.py'],
    ['python','remote_desktop_test.py'],
    ['python','remote_terminal_test.py'],
    ['python','remote_files_test.py'],
    ['python','original_app_test.py'],
    ['python','vault_workspace_test.py'],
    ['python','vault_features_test.py'],
    ['python','share_workspace_test.py'],
    ['python','memo_templates_test.py'],
    ['python','scan_workspace_test.py'],
    ['python','certfr_workspace_test.py'],
    ['python','timeout_test.py'],
    ['python','security_test.py'],
    ['python','shared_workspace_test.py'],
    ['python','multiuser_test.py'],
    ['python','access_workspace_test.py'],
    ['python','permissions_workspace_test.py'],
    ['python','otp_workspace_test.py'],
    ['python','mandatory_mfa_test.py'],
    ['python','agent_workspace_test.py'],
    ['python','agent_updates_test.py'],
    ['python','edr_workspace_test.py']
  ],
  'security': [
    ['publication'],
    ['node',['hardening.test.mjs', 'security.test.mjs', 'permissions.test.mjs', 'access.test.mjs', 'server.test.mjs', 'users.test.mjs', 'endpoint.test.mjs', 'remote.test.mjs', 'terminal.test.mjs', 'files.test.mjs']]
  ],
  'report': [
    ['node',['report-integration.test.mjs', 'fleet-groups.test.mjs', 'fleet-group-access.test.mjs', 'access-groups.test.mjs', 'antivirus.test.mjs', 'antivirus-api.test.mjs', 'antivirus-auto.test.mjs', 'endpoint.test.mjs', 'remote.test.mjs', 'terminal.test.mjs', 'files.test.mjs']],
    ['python','report_workspace_test.py'],
    ['python','remote_desktop_test.py'],
    ['python','remote_terminal_test.py'],
    ['python','fleet_groups_test.py']
  ],
  // Every Node test, the signing check on its own, then headless browser
  // checks of the private entry, sessions, access control and the CSP/SRI.
  'ci': [
    ['publication'],
    ['node', allNode],
    ['node', ['agent-signing.test.mjs']],
    ['python','private_entry_test.py'],
    ['python','security_test.py'],
    ['python','session_resume_test.py'],
    ['python','access_workspace_test.py'],
    ['python','vault_features_test.py']
  ],
  'node': [
    ['node', allNode]
  ]
};

const name=process.argv[2];
if(!name||name==='--list'||!Object.hasOwn(suites,name)){
  console.log('Suites : '+Object.keys(suites).join(', '));
  process.exit(name&&name!=='--list'?1:0);
}
// In GitHub Actions, run every step and publish the end of each failing
// step's output as an annotation (annotations are readable without the logs).
const ci=process.env.GITHUB_ACTIONS==='true';
const annotate=(title,text)=>{
  const tail=text.split(/\r?\n/).filter(line=>line.trim()&&!/^\s+at /.test(line)).slice(-60).join('\n').slice(-12000);
  const escape=value=>value.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
  console.log('::error title='+escape(title).replace(/[:,]/g,' ')+'::'+escape(tail));
};
const failures=[];
for(const [kind,value] of suites[name]){
  const [command,args]=kind==='publication'?[process.execPath,[path.join('scripts','check-publication.mjs')]]
    :kind==='node'?[process.execPath,['--test',...(typeof value==='function'?value():value).map(file=>path.join('tests',file))]]
    :[python,[path.join('tests',value)]];
  const label=kind+(typeof value==='string'?' '+value:'');
  console.log('\n> '+[path.basename(command),...args].join(' '));
  const result=spawnSync(command,args,{cwd:root,stdio:ci?['inherit','pipe','pipe']:'inherit',encoding:'utf8',maxBuffer:256*1024*1024});
  if(ci){process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');}
  if(result.status!==0){
    console.error('Échec : '+label);
    if(!ci)process.exit(result.status||1);
    failures.push(label);annotate('Échec '+label,(result.stdout||'')+'\n'+(result.stderr||'')+(result.error?'\n'+result.error.message:''));
  }
}
if(failures.length){console.error('\nÉtapes en échec : '+failures.join(', '));process.exit(1);}
console.log('\nSuite '+name+' réussie.');
