'use strict';

const ITEM_ACTION_ICONS = {
  copy: '<svg class="lucide lucide-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
  edit: '<svg class="lucide lucide-pencil" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/></svg>',
  delete: '<svg class="lucide lucide-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  check: '<svg class="lucide lucide-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m20 6-11 11-5-5"/></svg>'
};

function itemCopyLabel(item) {
  if (item.type === 'vault') return 'Copier le mot de passe';
  if (sectionForItem(item) === 'library') return 'Copier la fiche';
  if (item.type === 'protocol' && item.documentType !== 'procedure') return protocolEndpoint(protocolData(item)).copyLabel;
  return 'Copier le contenu';
}

function itemActionsHTML(item, buttonClass = 'workspace-icon', copyButton = null) {
  const button = (action, label, style) => `<button type="button" class="${style} item-action-button ${buttonClass}" data-item-action="${action}" data-item-id="${esc(item.id)}" title="${esc(label)}" aria-label="${esc(label)}">${ITEM_ACTION_ICONS[action]}</button>`;
  return (copyButton ?? button('copy', itemCopyLabel(item), 'primary')) + button('edit', 'Modifier', 'secondary') + button('delete', 'Supprimer', 'secondary item-delete-btn');
}

function itemContentText(content) {
  const template = document.createElement('template');
  template.innerHTML = String(content || '');
  template.content.querySelectorAll('script,style,template,noscript,iframe,object').forEach(node => node.remove());
  template.content.querySelectorAll('br').forEach(node => node.replaceWith(document.createTextNode('\n')));
  template.content.querySelectorAll('td,th').forEach(node => node.appendChild(document.createTextNode('\t')));
  template.content.querySelectorAll('p,div,li,tr,h1,h2,h3,h4,h5,h6,pre,blockquote').forEach(node => node.appendChild(document.createTextNode('\n')));
  return (template.content.textContent || '').replace(/\t+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function itemActionSessionValid(key) {
  return !$('#app').classList.contains('hidden') && state.vaultKey === key
}
async function copyItemById(id) {
  const key = state.vaultKey;
  if (!itemActionSessionValid(key)) return false;
  const item = await get('items', id);
  if (!item || isDeleted(item) || !itemActionSessionValid(key)) return false;
  let text;
  if (item.type === 'vault') {
    if (!key) return false;
    const data = await vaultData(item, false);
    text = data.password;
  } else if (sectionForItem(item) === 'library') text = libraryText(item);
  else if (item.type === 'protocol' && item.documentType !== 'procedure') text = protocolEndpoint(protocolData(item)).value;
  else text = itemContentText(item.content);
  if (!text || !itemActionSessionValid(key)) return false;
  return item.type==='vault' ? copySecret(text) : copyText(text);
}
async function editItemById(id) {
  const key = state.vaultKey;
  if (!itemActionSessionValid(key)) return false;
  const item = await get('items', id);
  if (!item || isDeleted(item) || !itemActionSessionValid(key)) return false;
  const section = sectionForItem(item);
  if (section !== state.section && !await openSection(section)) return false;
  if (!itemActionSessionValid(key)) return false;
  saveExplorerScroll();
  if (section === 'protocol') protocolView.focusId = id;
  else workspaceView(section).focusId = id;
  state.item = id;
  state.folder = item.folderId || null;
  state.mode = 'edit';
  await renderWorkspace();
  return true;
}
const itemCopyFeedback = new WeakMap();
document.addEventListener('click', async event => {
  const button = event.target.closest?.('button[data-item-action]');
  if (!button || button.disabled || $('#app').classList.contains('hidden')) return;
  event.preventDefault();
  event.stopPropagation();
  const id = button.dataset.itemId,
    action = button.dataset.itemAction;
  try {
    if (action === 'edit') {
      await editItemById(id);
      return
    }
    if (action === 'delete') {
      await deleteItem(id);
      return;
    }
    if (action !== 'copy') return;
    button.disabled = true;
    const copied = await copyItemById(id);
    if (!button.isConnected || $('#app').classList.contains('hidden')) return;
    if (!copied) {
      appNotify('Impossible de copier cet \u00e9l\u00e9ment.', {kind: 'error'});
      return
    }
    const label = itemCopyFeedback.get(button)?.label || button.title;
    clearTimeout(itemCopyFeedback.get(button)?.timer);
    button.innerHTML = ITEM_ACTION_ICONS.check;
    button.title = 'Copi\u00e9';
    button.setAttribute('aria-label', 'Copi\u00e9');
    const timer = setTimeout(() => {
      if (button.isConnected) {
        button.innerHTML = ITEM_ACTION_ICONS.copy;
        button.title = label;
        button.setAttribute('aria-label', label)
      }
      itemCopyFeedback.delete(button)
    }, 1800);
    itemCopyFeedback.set(button, {
      label,
      timer
    });
  } catch {
    if (!$('#app').classList.contains('hidden')) appNotify('Impossible d\u2019effectuer cette action.', {kind: 'error'})
  } finally {
    if (button.isConnected) button.disabled = false
  }
});
