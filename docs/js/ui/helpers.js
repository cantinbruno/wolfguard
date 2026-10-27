'use strict';

function documentHTML(html) {
  return DOMPurify.sanitize(String(html || ''), {
    USE_PROFILES: {
      html: true
    },
    FORBID_TAGS: ['style', 'form', 'button', 'input', 'select', 'textarea']
  })
}

async function breadcrumbHTML(item) {
  try {
    const folders = await activeFolders();
    const section = sectionForItem(item);
    const sec = {
      library: 'Mes fiches',
      checklist: 'Checklist',
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
    return `<div class="breadcrumb"><span onclick="openSection('${section}')">${esc(sec)}</span>${chain.map(f=>`<span class="sep">›</span><span onclick="selectFolder('${f.id}')">${esc(f.name)}</span>`).join('')}<span class="sep">›</span><span>${esc(item.title||'Sans titre')}</span></div>`;
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
