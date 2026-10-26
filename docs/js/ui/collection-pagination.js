'use strict';

const COLLECTION_PAGE_SIZE = 80;

function collectionPageSlice(entries, view) {
  view.page = Math.max(0, Math.min(view.page || 0, Math.max(0, Math.ceil(entries.length / COLLECTION_PAGE_SIZE) - 1)));
  return entries.slice(view.page * COLLECTION_PAGE_SIZE, (view.page + 1) * COLLECTION_PAGE_SIZE);
}

function renderCollectionPagination(scroll, view, count, update) {
  scroll.querySelector(':scope > .collection-pagination')?.remove();
  if (count <= COLLECTION_PAGE_SIZE) return;
  const footer = document.createElement('div');
  footer.className = 'collection-pagination';
  footer.innerHTML = '<button type="button" class="secondary workspace-icon" title="Page pr\u00e9c\u00e9dente" aria-label="Page pr\u00e9c\u00e9dente" ' + (view.page === 0 ? 'disabled' : '') + '>' + PROTOCOL_ICONS.back + '</button><span>' + (view.page * COLLECTION_PAGE_SIZE + 1) + '\u2013' + Math.min((view.page + 1) * COLLECTION_PAGE_SIZE, count) + ' / ' + count.toLocaleString('fr-FR') + '</span><button type="button" class="secondary workspace-icon" title="Page suivante" aria-label="Page suivante" ' + ((view.page + 1) * COLLECTION_PAGE_SIZE >= count ? 'disabled' : '') + '>' + PROTOCOL_ICONS.open + '</button>';
  const buttons = footer.querySelectorAll('button');
  for (const [index, button] of [...buttons].entries()) button.onclick = () => {
    view.page += index ? 1 : -1;
    update();
    scroll.scrollTop = 0;
    scroll.querySelector('.workspace-item-title,.command-sheet-title,.protocol-service')?.focus({
      preventScroll: true
    })
  };
  scroll.appendChild(footer);
}
