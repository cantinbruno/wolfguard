// Recent agent messages kept in memory, and the journal sent on request by the
// "Récupérer le journal" action. Secrets that could appear in a message are
// masked before anything leaves the workstation.
import {open} from 'node:fs/promises';
import {release} from 'node:os';
import path from 'node:path';

const LINES = 400, FILE_TAIL_BYTES = 32000, MAX_CHARS = 64000;
const lines = [];

export function rememberStatus(message) {
  const text = String(message ?? '').replace(/[\r\n]+/g, ' ').slice(0, 500);
  if (!text) return;
  lines.push(new Date().toISOString() + ' · ' + text);
  if (lines.length > LINES) lines.splice(0, lines.length - LINES);
}

export function redact(text) {
  return String(text)
    .replace(/\b(Bearer|Agent)\s+[A-Za-z0-9._~+/=-]{8,}/g, '$1 ‹masqué›')
    .replace(/\b[a-f0-9]{40,}\b/gi, '‹masqué›')
    .replace(/(password|mot de passe|token|secret|code)(\s*[:=]\s*)\S+/gi, '$1$2‹masqué›');
}

async function tail(file, bytes = FILE_TAIL_BYTES) {
  let handle;
  try {
    handle = await open(file, 'r');
    const {size} = await handle.stat();
    const start = Math.max(0, size - bytes), buffer = Buffer.alloc(size - start);
    await handle.read(buffer, 0, buffer.length, start);
    return (start ? '…\n' : '') + buffer.toString('utf8');
  } catch {
    return null;
  } finally {
    await handle?.close().catch(() => {});
  }
}

// The Windows launcher writes agent.log; other systems rely on the messages above.
export function agentLogFiles({platform = process.platform, env = process.env} = {}) {
  if (platform !== 'win32') return [];
  return [env.ProgramData && path.join(env.ProgramData, 'WolfGuardAgent', 'agent.log'), env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'WolfGuardAgent', 'agent.log')].filter(Boolean);
}

export async function collectAgentLogs({platform = process.platform, version = '', files = agentLogFiles({platform})} = {}) {
  const parts = ['WolfGuard · journal de l’agent', 'Collecté le ' + new Date().toISOString(), 'Système : ' + platform + ' ' + release() + (version ? ' · agent ' + version.slice(0, 12) : ''), '', '--- Messages récents de l’agent ---', lines.length ? lines.join('\n') : '(aucun message depuis le démarrage)'];
  for (const file of files) {
    const content = await tail(file);
    if (content !== null) parts.push('', '--- ' + path.basename(path.dirname(file)) + path.sep + path.basename(file) + ' (fin du fichier) ---', content.trimEnd());
  }
  return redact(parts.join('\n')).slice(-MAX_CHARS);
}

export function clearRecentStatus() { lines.length = 0; }
