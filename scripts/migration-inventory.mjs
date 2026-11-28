// Read-only handoff inventory. Never reads private keys, environment files,
// stored credentials, user records, or the contents of a production database.
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { privateDirectory, siteAccessFile } from './private-paths.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({ options: { output: { type: 'string' } } });
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const migrationFolder = path.join(root, 'server/drizzle');
const migrations = readdirSync(migrationFolder).filter(name => name.endsWith('.sql')).sort();
const database = new DatabaseSync(':memory:');
let expectedTables;
try {
  for (const name of migrations) database.exec(readFileSync(path.join(migrationFolder, name), 'utf8'));
  expectedTables = database.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all().map(row => row.name);
} finally { database.close(); }

const snapshotFile = path.join(root, '.cache/migration-handoff/sites-metadata.json');
const snapshot = existsSync(snapshotFile) ? JSON.parse(readFileSync(snapshotFile, 'utf8')) : null;
const observedTables = snapshot?.database?.tables;
const hostname = 'wolfguard-web-cantin.cantin-bruno.chatgpt.site';
const references = [];
for (const file of ['browser/cloud.js', 'browser/private-entry.js', 'browser/private-entry.html', 'scripts/build-web.mjs', 'agent/agent.mjs']) {
  readFileSync(path.join(root, file), 'utf8').split(/\r?\n/).forEach((line, index) => {
    if (line.includes(hostname)) references.push({ file, line: index + 1 });
  });
}

const report = {
  generated_at: new Date().toISOString(),
  workspace: root,
  guide: 'documentation/migration-hebergement.md',
  git: {
    head: git(['rev-parse', 'HEAD']), branch: git(['branch', '--show-current']),
    working_tree: git(['status', '--short', '--untracked-files=all']).split(/\r?\n/).filter(Boolean)
  },
  hosting: JSON.parse(readFileSync(path.join(root, 'server/.openai/hosting.json'), 'utf8')),
  frontend: 'https://wolfguard.wavetools.fr/',
  current_api: 'https://' + hostname,
  local_private_configuration: {
    directory: privateDirectory, directory_exists: existsSync(privateDirectory),
    private_link_file: siteAccessFile, private_link_file_exists: existsSync(siteAccessFile),
    contents_read: false
  },
  required_runtime_secret_names: ['AUTH_PEPPER', 'STORAGE_KEY', 'WORKSPACE_KEY_ENCRYPTION_KEY', 'ENTRY_LINK_HASH', 'BOOTSTRAP_HASH'],
  local_migrations: migrations,
  local_expected_tables: expectedTables,
  platform_snapshot_file: existsSync(snapshotFile) ? snapshotFile : null,
  platform_observation: snapshot,
  schema_comparison: observedTables ? {
    only_in_observed_production: observedTables.filter(name => !expectedTables.includes(name)),
    only_in_local_schema: expectedTables.filter(name => !observedTables.includes(name)),
    note: 'Names only; compare columns, indexes and applied migrations before any restore.'
  } : null,
  api_origin_references: references,
  migration_state: {
    cutover_done: false, destination_selected: false, new_accounts_allowed: false, paid_services_allowed: false,
    use_of_this_pc_as_server_confirmed: false,
    production_database_export_created_by_this_handoff: false,
    production_object_export_created_by_this_handoff: false,
    production_secret_values_retrieved_by_this_handoff: false
  }
};

if (values.output) {
  const output = path.resolve(root, values.output);
  const relative = path.relative(path.join(root, '.cache'), output);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative))
    throw new Error('Le rapport local doit être écrit dans .cache/, hors publication.');
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log('Inventaire sans valeurs secrètes : ' + output);
} else console.log(JSON.stringify(report, null, 2));
