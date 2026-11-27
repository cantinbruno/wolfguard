import { can, recordLevel, recordSection } from './permissions.mjs';

const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;
// Count serialized records (including encrypted attachments) without returning
// contents. Physical envelopes have additional encryption/serialization overhead.
export function workspaceUsage(payload, user, now = Date.now()) {
  const administrator = user?.role === 'admin' || (user?.permissions?.admin === true && can(user, 'data.read', now));
  const folders = new Map(payload.folders.map(row => [row.id, row])),
    homes = new Map();
  for (const folder of payload.folders)
    if (folder.systemVaultHome)
      homes.set(folder.id, { id: folder.ownerUserId, name: folder.name, bytes: 0, items: 0, folders: 0 });
  function owner(folderId) {
    const visited = new Set();
    while (folderId && !visited.has(folderId)) {
      visited.add(folderId);
      if (homes.has(folderId)) return homes.get(folderId);
      folderId = folders.get(folderId)?.parentId;
    }
    return null;
  }
  const shared = { name: 'Espace partagé accessible', bytes: 0, items: 0, folders: 0 };
  const itemOwners = new Map();
  for (const kind of ['folders', 'items'])
    for (const record of payload[kind]) {
      const personal = owner(kind === 'folders' ? record.id : record.folderId);
      if (kind === 'items') itemOwners.set(record.id, personal);
      if (personal) {
        personal.bytes += bytes(record);
        personal[kind]++;
      } else if (
        recordSection(record, kind) !== 'vault' &&
        (administrator ||
          (can(user, 'data.read', now) && recordLevel(user, record, kind, payload.folders, now) !== 'deny'))
      ) {
        shared.bytes += bytes(record);
        shared[kind]++;
      }
    }
  for (const row of payload.activity || []) {
    const personal = itemOwners.get(row.itemId);
    if (personal) personal.bytes += bytes(row);
    else if (administrator) shared.bytes += bytes(row);
  }
  const accounts = [...homes.values()].filter(account => administrator || account.id === user?.id);
  const result = {
    administrator,
    accounts,
    shared,
    totalBytes: shared.bytes + accounts.reduce((n, row) => n + row.bytes, 0),
    measuredAt: now,
    measurement: 'serialized-records'
  };
  if (administrator) {
    result.metadataBytes = bytes({ version: payload.version, settings: payload.settings || [] });
    result.totalBytes += result.metadataBytes;
    result.shared.name = 'Espace partagé';
  }
  return result;
}
