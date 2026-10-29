'use strict';

const documentReaderPreferences = {
  wide: false,
  fontStep: 0
};
const READER_EXPAND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>';

function readerDate(value) {
  const date = new Date(value || '');
  return Number.isFinite(date.getTime()) ? '<time datetime="' + esc(date.toISOString()) + '" title="' + esc(date.toLocaleString('fr-FR')) + '">' + esc(date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })) + '</time>' : '';
}

function readerURL(value) {
  try {
    const url = new URL(String(value || ''));
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function prepareReaderContent(item) {
  const holder = document.createElement('div');
  holder.innerHTML = documentHTML(item.content);
  // Each source document can have its own #introduction or #verification.
  // Resolve those anchors inside its chapter before namespacing the guide.
  holder.querySelectorAll('[data-guide-chapter]').forEach((chapter,chapterIndex)=>{
    const local=new Map();
    chapter.querySelectorAll('[id]').forEach((node,index)=>{
      const old=node.id,plain=old.replace(/^user-content-/,''),id='chapter-'+chapterIndex+'-anchor-'+index;
      local.set(old,id);local.set(plain,id);node.id=id;
    });
    chapter.querySelectorAll('a[href^="#"]:not([data-guide-link])').forEach(link=>{
      const target=local.get(link.getAttribute('href').slice(1));
      if(target)link.setAttribute('href','#'+target);
    });
  });
  const titleKey = value => String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr');
  const first = holder.firstElementChild;
  if (first?.tagName === 'H1' && titleKey(first.textContent) === titleKey(item.title)) first.remove();
  const memo = holder.querySelector('[data-library-part="memo"]');
  if (memo) {
    const intro = [...memo.children].slice(1).filter(node => node.textContent.trim() || node.matches('img,table,hr'));
    const removeDuplicate = node => {
      // Keep destinations for any links to the original introduction.
      if (node.id) {
        const anchor = document.createElement('span');
        anchor.id = node.id;
        node.replaceWith(anchor);
      } else node.remove();
    };
    if (intro[0]?.tagName === 'H1' && titleKey(intro[0].textContent) === titleKey(item.title)) removeDuplicate(intro.shift());
    if (intro[0]?.tagName === 'P' && item.description && titleKey(intro[0].textContent) === titleKey(item.description)) removeDuplicate(intro[0]);
  }
  // Namespace existing anchors, retaining links within the document.
  const prefix = 'reader-' + String(item.id || 'document').replace(/[^a-zA-Z0-9_-]/g, ''),
    anchors = new Map();
  holder.querySelectorAll('[id]').forEach((node, index) => {
    const old = node.id;
    node.id = prefix + '-anchor-' + index;
    if (!anchors.has(old)) anchors.set(old, node.id)
  });
  holder.querySelectorAll('a[href^="#"]').forEach(link => {
    const id = link.getAttribute('href').slice(1);
    if (anchors.has(id)) link.setAttribute('href', '#' + anchors.get(id))
  });
  holder.querySelectorAll('h1,h2,h3,h4').forEach((heading, index) => {
    if (!heading.id) heading.id = prefix + '-section-' + index
  });
  const text = itemContentText(holder.innerHTML),
    words = text ? text.split(/\s+/).length : 0;
  const hasContent = !!text || !!holder.querySelector('img,table,video,audio,hr');
  return {
    html: hasContent ? holder.innerHTML : '',
    words
  };
}

function readerSupplementHTML(item, content) {
  const holder = document.createElement('div');
  holder.innerHTML = content;
  const existing = new Set([...holder.querySelectorAll('a[href]')].map(link => readerURL(link.getAttribute('href'))).filter(Boolean)),
    seen = new Set();
  const sources = [...(Array.isArray(item.sources) ? item.sources : []), ...(Array.isArray(item.references) ? item.references : [])].filter(source => {
    const url = readerURL(source?.url);
    if (!url || existing.has(url) || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
  return sources.length ? '<section class="reader-sources"><h2>Références complémentaires</h2><ul>' + sources.map(source => '<li><a href="' + esc(readerURL(source.url)) + '" target="_blank" rel="noopener noreferrer">' + esc(source.title || new URL(source.url).hostname) + '</a></li>').join('') + '</ul></section>' : '';
}

function readerAttachmentsHTML(item) {
  const files = Array.isArray(item.attachments) ? item.attachments : [];
  if (!files.length) return '';
  return '<section class="reader-attachments"><h2>Pièces jointes <span>' + files.length + '</span></h2><div class="reader-files">' + files.map((file, index) => {
    const available = /^data:[\w.+-]+\/[\w.+-]+(?:;charset=[^;,]+)?;base64,/i.test(file.dataUrl || '');
    return '<div class="reader-file">' + workspaceNavigationIcon('file-text') + '<div><strong>' + esc(file.name || 'Fichier') + '</strong><small>' + esc(humanBytes(file.size)) + (file.type ? ' · ' + esc(file.type) : '') + '</small></div><button type="button" class="secondary" data-reader-file="' + index + '" ' + (available ? '' : 'disabled') + '>' + (available ? 'Télécharger' : 'Indisponible') + '</button></div>';
  }).join('') + '</div></section>';
}
async function renderDocumentReader(item, crumb, options = {}) {
  const host = $('#detailHost'),
    key = state.vaultKey;
  if (!host || state.item !== item.id) return;
  const personal = item.type === 'personal',
    procedure = item.type === 'procedure' || item.documentType === 'procedure',
    content = prepareReaderContent(item);
  const kind = personal ? 'Note' : procedure ? 'Procédure' : 'Mémo technique',
    date = readerDate(item.updatedAt || item.createdAt),
    created = readerDate(item.createdAt);
  const minutes = Math.max(1, Math.ceil(content.words / 200));
  host.innerHTML = `<div class="document-reader ${personal?'personal-note-view note-reader':'memo-reader'}" data-reader-kind="${personal?'note':procedure?'procedure':'memo'}">
    <div class="reader-toolbar">
      <div class="reader-location"><div class="reader-navigation-slot"></div><div class="reader-breadcrumb">${crumb}</div></div>
      <div class="reader-tools"><div class="reader-font-tools" role="group" aria-label="Taille du texte"><button type="button" class="secondary" data-reader-font="-1" title="Réduire le texte" aria-label="Réduire le texte">A−</button><span data-reader-font-label>100 %</span><button type="button" class="secondary" data-reader-font="1" title="Agrandir le texte" aria-label="Agrandir le texte">A+</button></div><button type="button" class="secondary reader-wide-button" data-reader-wide aria-pressed="false" title="Élargir la lecture" aria-label="Élargir la lecture">${READER_EXPAND_ICON}</button><div class="detail-actions reader-item-actions">${itemActionsHTML(item)}</div></div>
    </div>
    <div class="reader-scroll ${personal?'memo-document personal-note-document':'procedure-body-wrap'}" role="region" aria-label="${personal?'Contenu de la note':'Contenu du mémo'}" tabindex="0">
      <div class="reader-layout">
        <article class="reader-article ${personal?'memo-paper personal-note-paper':procedure?'procedure-document':'memo-paper'}">
          <header class="reader-document-heading"><div class="reader-eyebrow">${workspaceSectionIcon(personal?'personal':'memo')}<span>${kind}</span>${content.words?'<span class="reader-reading-time">'+minutes+' min de lecture</span>':''}</div><h1>${esc(item.title||'Sans titre')}</h1>
            <div class="reader-metadata">${date?'<span>Mis à jour le '+date+'</span>':''}<span>${content.words.toLocaleString('fr-FR')} mot${content.words===1?'':'s'}</span>${item.vendor?'<span>'+esc(item.vendor)+'</span>':''}</div>
          </header>
          ${personal&&options.outline!==false?'<details class="reader-note-outline" hidden><summary>Dans cette note <span data-reader-outline-count></span></summary><nav aria-label="Sommaire de la note" data-reader-outline></nav></details>':''}
          <div class="reader-rich-content">${content.html||'<div class="reader-empty"><h2>'+ (personal?'Une note à écrire':'Un mémo à compléter')+'</h2><p>'+ (personal?'Ajoute tes idées, tes repères ou tes prochaines actions.':'Ajoute le contexte, les étapes et les contrôles utiles.')+'</p><button type="button" class="primary" data-item-action="edit" data-item-id="'+esc(item.id)+'">'+ITEM_ACTION_ICONS.edit+'Commencer à écrire</button></div>'}</div>
          <footer class="reader-extras">${readerSupplementHTML(item,content.html)}${readerAttachmentsHTML(item)}<div class="reader-origin">${created?'Créé le '+created:''}${item.platform?'<span>'+esc(item.platform)+'</span>':''}</div></footer>
        </article>
        ${personal||options.outline===false?'':'<aside class="reader-outline procedure-toc" hidden><details open><summary>Sommaire <span data-reader-outline-count></span></summary><nav aria-label="Sommaire du mémo" data-reader-outline></nav></details></aside>'}
      </div>
    </div>
  </div>`;
  const root = host.querySelector('.document-reader'),
    extras = root.querySelector('.reader-extras');
  bindDocumentReader(root, item, key);
  if (options.relations !== false) await renderItemRelations(item, extras);
  if (!root.isConnected || state.item !== item.id || !itemActionSessionValid(key)) return;
  extras.appendChild(extras.querySelector('.reader-origin'));
  if (options.outline !== false) buildDocumentOutline(root, item);
}

function buildDocumentOutline(root, item) {
  const headings = [...root.querySelectorAll(item.consolidatedGuideVersion?'.reader-rich-content [data-guide-chapter] > h2':'.reader-rich-content :is(h1,h2,h3,h4),.library-command-panel :is(h1,h2,h3,h4)')].filter(heading => heading.textContent.trim() && !heading.closest('.reader-empty'));
  const scroll = root.querySelector('.reader-scroll');
  if (root.readerOutlineTrack) scroll.removeEventListener('scroll', root.readerOutlineTrack);
  const outline = root.querySelector('[data-reader-outline]'),
    container = root.querySelector('.reader-outline,.reader-note-outline');
  if (!outline || !container) return;
  container.hidden = !headings.length;
  root.classList.toggle('reader-has-outline', !!headings.length);
  root.querySelector('[data-reader-outline-count]').textContent = headings.length;
  outline.innerHTML = headings.map((heading, index) => '<a class="' + heading.tagName.toLowerCase() + '" href="#' + esc(heading.id) + '"><span class="reader-outline-number">' + String(index + 1).padStart(2, '0') + '</span><span>' + esc(heading.textContent.trim()) + '</span></a>').join('');
  const details = container.matches('details') ? container : container.querySelector('details');
  if (root.classList.contains('memo-reader') && root.clientWidth < 840) details.open = false;
  if (!root.classList.contains('note-reader')) {
    const track = () => {
      if (!root.isConnected) return;
      const top = scroll.getBoundingClientRect().top + 48;
      const panel = root.querySelector('.library-command-panel');
      const readingHeadings = panel && getComputedStyle(panel).position === 'sticky' ? headings.filter(heading => !panel.contains(heading)) : headings;
      const active = [...readingHeadings].reverse().find(heading => heading.getBoundingClientRect().top <= top) || readingHeadings[0];
      const part = active?.closest('[data-library-part]')?.dataset.libraryPart;
      root.querySelectorAll('[data-library-jump]').forEach(link => {
        if (link.dataset.libraryJump === part) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      outline.querySelectorAll('a').forEach(link => {
        if (link.getAttribute('href') === '#' + active?.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current')
      });
    };
    scroll.addEventListener('scroll', track, {
      passive: true
    });
    root.readerOutlineTrack = track;
    track();
  }
}

function bindDocumentReader(root, item, key) {
  const scroll = root.querySelector('.reader-scroll'),
    workspace = root.closest('.library-workspace'),
    personal = item.type === 'personal';
  const valid = () => root.isConnected && state.item === item.id && state.mode === 'view' && itemActionSessionValid(key);
  const updatePreferences = () => {
    const button = root.querySelector('[data-reader-wide]'),
      base = personal ? 16 : 15;
    workspace.classList.toggle('reader-wide', documentReaderPreferences.wide);
    button.setAttribute('aria-pressed', String(documentReaderPreferences.wide));
    button.title = documentReaderPreferences.wide ? 'Rétablir la navigation' : 'Élargir la lecture';
    button.setAttribute('aria-label', button.title);
    root.style.setProperty('--reader-font-size', (base + documentReaderPreferences.fontStep) + 'px');
    root.querySelector('[data-reader-font-label]').textContent = Math.round((base + documentReaderPreferences.fontStep) / base * 100) + ' %';
    root.querySelector('[data-reader-font="-1"]').disabled = documentReaderPreferences.fontStep <= -1;
    root.querySelector('[data-reader-font="1"]').disabled = documentReaderPreferences.fontStep >= 3;
  };
  root.querySelector('[data-reader-wide]').onclick = () => {
    if (!valid()) return;
    documentReaderPreferences.wide = !documentReaderPreferences.wide;
    updatePreferences()
  };
  root.querySelectorAll('[data-reader-font]').forEach(button => button.onclick = () => {
    if (!valid()) return;
    documentReaderPreferences.fontStep = Math.max(-1, Math.min(3, documentReaderPreferences.fontStep + Number(button.dataset.readerFont)));
    updatePreferences()
  });
  root.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !valid()) return;
    if (link.dataset.guideLink) {
      event.preventDefault();
      const chapter=[...root.querySelectorAll('[data-guide-chapter]')].find(node=>node.dataset.guideChapter===link.dataset.guideLink);
      if(chapter)chapter.scrollIntoView({block:'start',behavior:'instant'});
      else openById(link.dataset.guideLink);
      return;
    }
    const target = [...root.querySelectorAll('[id]')].find(node => node.id === link.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();
    const top = scroll.scrollTop + target.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 20;
    scroll.scrollTo({
      top: Math.max(0, top),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
  });
  root.querySelectorAll('.reader-rich-content pre').forEach(pre => {
    const text = pre.textContent || '',
      wrapper = document.createElement('figure');
    wrapper.className = 'reader-code';
    const bar = document.createElement('figcaption');
    bar.innerHTML = '<span>Bloc de code</span><button type="button" aria-label="Copier ce bloc de code">' + ITEM_ACTION_ICONS.copy + 'Copier</button>';
    pre.before(wrapper);
    wrapper.append(bar, pre);
    bar.querySelector('button').onclick = async event => {
      if (!valid()) return;
      const button = event.currentTarget;
      button.disabled = true;
      const success = await copyText(text);
      if (!valid()) return;
      button.innerHTML = (success ? ITEM_ACTION_ICONS.check : ITEM_ACTION_ICONS.copy) + (success ? 'Copié' : 'Réessayer');
      button.disabled = false;
    };
  });
  root.querySelectorAll('.reader-rich-content table').forEach(table => {
    const wrapper = document.createElement('div');
    wrapper.className = 'reader-table-scroll';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', table.caption?.textContent || 'Tableau — défilement horizontal');
    table.before(wrapper);
    wrapper.append(table);
  });
  root.querySelectorAll('.reader-rich-content img').forEach(image => {
    if (image.closest('a')) return;
    image.classList.add('reader-zoomable');
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', 'Agrandir : ' + (image.alt || 'illustration'));
    image.title = 'Agrandir l’illustration';
    image.onclick = () => {
      if (valid()) openReaderImage(image, key)
    };
    image.onkeydown = event => {
      if (['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        image.click()
      }
    };
  });
  root.querySelectorAll('[data-reader-file]').forEach(button => button.onclick = () => {
    if (!valid() || button.disabled) return;
    const file = item.attachments[Number(button.dataset.readerFile)];
    downloadDataUrl(file.name || 'fichier', file.dataUrl)
  });
  updatePreferences();
}

function openReaderImage(image, key) {
  modal(image.alt || 'Illustration', `<div class="reader-image-canvas"><img src="${esc(image.currentSrc||image.src)}" alt="${esc(image.alt||'Illustration')}"></div><div class="reader-image-actions"><button type="button" class="secondary" data-reader-image-size aria-pressed="false">Taille réelle</button><button type="button" class="primary" data-reader-image-close>Fermer</button></div>`);
  const dialog = $('#modalRoot .modal');
  dialog.classList.add('reader-image-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', image.alt || 'Illustration');
  const close = () => {
    closeModal();
    if (image.isConnected && itemActionSessionValid(key)) image.focus({
      preventScroll: true
    })
  };
  dialog.querySelector('[data-reader-image-close]').onclick = close;
  dialog.querySelector('[data-reader-image-size]').onclick = event => {
    const expanded = dialog.classList.toggle('reader-image-original');
    event.currentTarget.setAttribute('aria-pressed', String(expanded));
    event.currentTarget.textContent = expanded ? 'Adapter à la fenêtre' : 'Taille réelle';
  };
  dialog.onkeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close()
    }
    if (event.key === 'Tab') {
      const first = dialog.querySelector('[data-reader-image-size]'),
        last = dialog.querySelector('[data-reader-image-close]');
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus()
      }
    }
  };
  dialog.querySelector('[data-reader-image-close]').focus();
}
