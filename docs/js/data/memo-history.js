'use strict';

// Previous versions of a memo, kept inside the memo itself: they are encrypted
// with it, follow its rights and travel with it. Bounded so that one memo
// cannot fill the shared workspace.
const MEMO_HISTORY_LIMIT = 10, MEMO_HISTORY_ENTRY_CHARS = 200000, MEMO_HISTORY_TOTAL_CHARS = 600000;
const MEMO_HISTORY_FIELDS = ['title', 'description', 'content', 'commandBlocks'];

function memoVersion(item, stamp) {
  return {
    at: item.updatedAt || item.createdAt || stamp,
    title: String(item.title || ''),
    description: String(item.description || ''),
    content: String(item.content || ''),
    commandBlocks: Array.isArray(item.commandBlocks) ? structuredClone(item.commandBlocks) : []
  };
}

const memoHistoryValid = entry => entry && typeof entry === 'object' && typeof entry.at === 'string' && typeof entry.content === 'string' && typeof entry.title === 'string';

function memoChanged(previous, next) {
  return MEMO_HISTORY_FIELDS.some(field => JSON.stringify(previous[field] ?? (field === 'commandBlocks' ? [] : '')) !== JSON.stringify(next[field] ?? (field === 'commandBlocks' ? [] : '')));
}

// Returns `next` with the version of `previous` added in front of its history.
function withMemoHistory(previous, next, stamp = new Date().toISOString()) {
  const history = (Array.isArray(previous.history) ? previous.history : []).filter(memoHistoryValid);
  if (!memoChanged(previous, next)) return {...next, history};
  const entry = memoVersion(previous, stamp);
  let list = JSON.stringify(entry).length <= MEMO_HISTORY_ENTRY_CHARS ? [entry, ...history] : history;
  list = list.slice(0, MEMO_HISTORY_LIMIT);
  while (list.length && JSON.stringify(list).length > MEMO_HISTORY_TOTAL_CHARS) list = list.slice(0, -1);
  return {...next, history: list};
}

// The chosen version becomes the current one; the current one goes to history.
function restoreMemoVersion(item, index, stamp = new Date().toISOString()) {
  const history = (Array.isArray(item.history) ? item.history : []).filter(memoHistoryValid);
  const version = history[index];
  if (!version) throw new Error('Cette version n’existe plus.');
  const next = {...item, title: version.title || item.title, description: version.description, content: version.content, commandBlocks: structuredClone(version.commandBlocks || []), updatedAt: stamp};
  const restored = withMemoHistory(item, next, stamp);
  // The restored entry itself is not kept twice.
  restored.history = restored.history.filter(entry => entry !== version && !(entry.at === version.at && entry.content === version.content && entry.title === version.title));
  return restored;
}
