'use strict';

function documentHTML(html) {
  return DOMPurify.sanitize(String(html || ''), {
    USE_PROFILES: {
      html: true
    },
    FORBID_TAGS: ['style', 'form', 'button', 'input', 'select', 'textarea', 'iframe', 'object', 'embed'],
    SANITIZE_NAMED_PROPS: true
  })
}

async function breadcrumbHTML(item) {
  try {
    const folders = await activeFolders();
    const section = sectionForItem(item);
    const sec = {
      library: 'Mes fiches',
      vault: 'Coffre',
      command: 'Commandes',
      memo: 'Mémo',
      personal: 'Notes',
      protocol: 'Protocoles',
      template: 'Templates'
    } [section];
    const chain = [];
    let id = item.folderId || null,
      guard = 0;
    while (id && guard++ < 80) {
      const f = folders.find(x => x.id === id);
      if (!f) break;
      chain.unshift(f);
      id = f.parentId || null;
    }
    return `<div class="breadcrumb"><span data-wg-click="openSection('${section}')">${esc(sec)}</span>${chain.map(f=>`<span class="sep">›</span><span data-wg-click="selectFolder('${f.id}')">${esc(f.name)}</span>`).join('')}<span class="sep">›</span><span>${esc(item.title||'Sans titre')}</span></div>`;
  } catch {
    return '';
  }
}

function humanBytes(n) {
  if (!Number.isFinite(Number(n)) || Number(n) <= 0) return '0 o';
  const u = ['o', 'Ko', 'Mo', 'Go'];
  let i = 0,
    v = Number(n);
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++
  }
  return `${v.toFixed(i?1:0)} ${u[i]}`;
}

function downloadDataUrl(name, dataUrl) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name || 'fichier';
  a.click();
}
async function copyText(t) {
  const text = String(t ?? '');
  if (desktopBridge.available) {
    try {
      return await desktopBridge.call('clipboard.write', {
        text
      })
    } catch {
      return false
    }
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true
    }
  } catch {}

  // The local-file fallback must not leave a secret or disturb the editor selection.
  const active = document.activeElement;
  const inputSelection = typeof active?.selectionStart === 'number' ? {
    start: active.selectionStart,
    end: active.selectionEnd,
    direction: active.selectionDirection
  } : null;
  const selection = window.getSelection();
  const ranges = selection ? Array.from({
    length: selection.rangeCount
  }, (_, i) => selection.getRangeAt(i).cloneRange()) : [];
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  Object.assign(textarea.style, {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    opacity: '0'
  });
  try {
    document.body.appendChild(textarea);
    textarea.focus({
      preventScroll: true
    });
    textarea.select();
    return !!document.execCommand('copy');
  } catch {
    return false
  } finally {
    textarea.value = '';
    textarea.remove();
    try {
      if (active?.isConnected) {
        active.focus({
          preventScroll: true
        });
        if (inputSelection) active.setSelectionRange(inputSelection.start, inputSelection.end, inputSelection.direction);
      }
      if (selection && !inputSelection) {
        selection.removeAllRanges();
        ranges.forEach(range => selection.addRange(range))
      }
    } catch {}
  }
}

// Never erase clipboard contents copied afterwards, and never request read access.
const secretClipboard = (() => {
  let timer=null, expected=null, generation=0;
  async function digest(text) {
    const bytes=new TextEncoder().encode(text);
    try { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).join(','); }
    finally { bytes.fill(0); }
  }
  async function clear() {
    clearTimeout(timer);timer=null;
    const token=generation, hash=expected;
    if(!hash || !navigator.clipboard?.readText || !navigator.permissions)return;
    try {
      const permission=await navigator.permissions.query({name:'clipboard-read'});
      if(permission.state!=='granted')return;
      const current=await navigator.clipboard.readText();
      const currentHash=await digest(current);
      if(token===generation && expected===hash && currentHash===hash)await navigator.clipboard.writeText('');
    } catch {} finally { if(token===generation)expected=null; }
  }
  async function track(text) {
    const token=++generation;
    clearTimeout(timer);
    const hash=await digest(text);
    if(token!==generation)return;
    expected=hash;timer=setTimeout(clear,30000);
  }
  return {clear,track};
})();
async function copySecret(text) {
  const copied=await copyText(text);
  if(copied){await secretClipboard.track(String(text ?? ''));if($('#app').classList.contains('hidden'))secretClipboard.clear();}
  return copied;
}

/* EDITORS */
function foldersForSection(sec) {
  return activeFolders().then(fs => fs.filter(f => f.section === sec).map(f => ({
    ...f,
    parentId: f.parentId || null
  })).sort((a, b) => a.name.localeCompare(b.name)))
}

function folderSelectOptions(folders, currentId = '', excludeId = null) {
  function walk(parentId = null, depth = 0) {
    return folders.filter(f => (f.parentId || null) === (parentId || null) && f.id !== excludeId).map(f => {
      return `<option value="${f.id}" ${currentId===f.id?'selected':''}>${'— '.repeat(depth)}${esc(f.name)}</option>` + walk(f.id, depth + 1);
    }).join('');
  }
  return walk(null, 0);
}
