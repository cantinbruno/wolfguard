'use strict';

function libraryCommands(item) {
  const blocks = Array.isArray(item.commandBlocks) ? [...item.commandBlocks] : item.type === 'command' ? [{
    title: item.title || 'Commande',
    code: item.content || '',
    context: item.context || '',
    example: item.example || ''
  }] : [];
  const holder = document.createElement('div');
  holder.innerHTML = libraryBody(item);
  let title = '';
  holder.querySelectorAll('h1,h2,h3,h4,pre').forEach(node => {
    if (node.tagName !== 'PRE') {
      title = node.textContent.trim();
      return;
    }
    const code = node.textContent;
    if (!code.trim() || blocks.some(block => block.code === code)) return;
    blocks.push({
      title: title || 'Bloc technique',
      code,
      context: '',
      example: '',
      fromMemo: true
    });
  });
  return blocks;
}

function libraryBody(item) {
  return item.type === 'command' && !item.unifiedDocument ? '' : item.content || ''
}

function libraryMemoBody(item) {
  const body = libraryBody(item),
    blocks = libraryCommands(item).filter(block => block.fromMemo);
  if (!blocks.length) return body || (item.context ? '<p>' + esc(item.context) + '</p>' : '');
  const holder = document.createElement('div');
  holder.innerHTML = body;
  holder.querySelectorAll('pre').forEach(node => {
    if (blocks.some(block => block.code === node.textContent)) node.remove();
  });
  return holder.innerHTML;
}

function libraryCommandDescription(item, block) {
  if (block.context || block.description) return block.context || block.description;
  const holder = document.createElement('div');
  holder.innerHTML = libraryBody(item);
  const source = [...holder.querySelectorAll('pre')].find(node => node.textContent === block.code);
  if (source?.previousElementSibling?.tagName === 'P' && source.previousElementSibling.textContent.trim()) return source.previousElementSibling.textContent.trim();
  return item.description || item.context || (block.fromMemo ? 'Bloc technique extrait du mémo.' : 'Bloc réutilisable de cette fiche.');
}

function libraryDocument(item) {
  const commands = libraryCommands(item).map(block => {
    const description = libraryCommandDescription(item, block);
    return '<section class="library-command-card"><h3>' + esc(block.title || 'Commande') + '</h3><p class="library-command-description" title="' + esc(description) + '">' + esc(description) + '</p><pre><code>' + esc(block.code) + '</code></pre></section>';
  }).join('');
  const metadata = [
    ['Environnement', item.platform],
    ['Éditeur / technologie', item.vendor],
    ['Prérequis', item.prerequisites],
    ['Mots clés', (item.tags || []).join(' · ')]
  ].filter(([, value]) => value);
  const part = (key, title, body) => '<section class="library-document-part" data-library-part="' + key + '"><h2>' + title + '</h2>' + body + '</section>';
  const content = part('reference', 'Fiche · repères', (item.description ? '<p>' + esc(item.description) + '</p>' : '') + (metadata.length ? '<dl class="library-reference-grid">' + metadata.map(([label, value]) => '<div><dt>' + label + '</dt><dd>' + esc(value) + '</dd></div>').join('') + '</dl>' : '')) +
    part('memo', 'Mémo', libraryMemoBody(item)) +
    part('command', 'Commandes & blocs techniques', commands);
  return {
    ...item,
    type: 'memo',
    content
  };
}

function libraryText(item) {
  return itemContentText(libraryDocument(item).content)
}

function normalizeLibraryItem(item) {
  if (!LIBRARY_TYPES.includes(item.type)) return item;

  const normalized = {
    ...item,
    type: 'memo',
    unifiedDocument: true,
    unifiedDocumentVersion: 2,
    originalType: item.originalType || item.type,
    content: libraryBody(item),
    facets: libraryFacets(item),
    commandBlocks: libraryCommands(item)
  };

  return JSON.stringify(item) === JSON.stringify(normalized) ? item : normalized;
}
