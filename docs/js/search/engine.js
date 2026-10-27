'use strict';

// MiniSearch is bundled locally: the index never leaves this browser session.
window.WorkspaceSearch = class WorkspaceSearch {
  static aliases = {
    cp: 'checkpoint',
    nxos: 'nexus',
    n2k: 'fex',
    h5: 'f5',
    authentificator: 'authenticator',
    fortios: 'fortigate',
    ad: 'activedirectory',
    ztsa: 'ztna',
    interfaces: 'interface',
    vlans: 'vlan',
    routes: 'route',
    logs: 'log'
  };
  constructor(options) {
    this.options = options;
    this.input = document.getElementById('globalSearch');
    this.box = document.getElementById('searchResults');
    this.clear = document.getElementById('clearGlobalSearch');
    this.scope = 'all';
    this.revision = 0;
    this.request = 0;
    this.cache = null;
    this.pending = null;
    this.rows = [];
    this.selected = -1;
    this.limit = 20;
    this.timer = null;
    this.input.oninput = () => this.schedule();
    this.input.onfocus = () => this.search(this.input.value);
    this.input.onclick = () => {
      if (this.box.hidden) this.search(this.input.value);
    };
    this.input.onkeydown = event => this.onKey(event);
    this.input.addEventListener('compositionstart', () => {
      this.composing = true;
      clearTimeout(this.timer);
    });
    this.input.addEventListener('compositionend', () => {
      this.composing = false;
      this.schedule();
    });
    this.clear.onclick = () => {
      this.input.value = '';
      this.input.focus();
      this.search('');
    };
    this.box.onclick = event => {
      const result = event.target.closest('[data-search-index]');
      if (result) return this.open(Number(result.dataset.searchIndex));
      const suggestion = event.target.closest('[data-search-suggestion]');
      if (suggestion) {
        this.input.value = suggestion.dataset.searchSuggestion;
        this.input.focus();
        this.search(this.input.value);
      }
      if (event.target.closest('[data-search-more]')) {
        this.limit += 20;
        this.render();
      }
    };
    this.box.onchange = event => {
      if (event.target.id !== 'globalSearchScope') return;
      this.scope = event.target.value;
      this.search(this.input.value);
    };
    this.box.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.input.focus();
        this.hide();
      }
    });
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && this.options.isUnlocked() && !document.querySelector('#modalRoot > *')) {
        event.preventDefault();
        this.input.focus();
        this.input.select();
        this.search(this.input.value);
      }
    });
    document.addEventListener('focusin', event => {
      if (!event.target.closest('.search')) this.hide();
    });
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    this.hide();
  }

  static fold(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  static canonical(value) {
    return this.fold(value)
      .replace(/\bcheck[ -]+point\b/g, 'checkpoint')
      .replace(/\bnx[ -]?os\b/g, 'nexus')
      .replace(/\bfabric[ -]+extender\b/g, 'fex')
      .replace(/\bnexus[ -]+2000\b/g, 'fex')
      .replace(/\bios[ -]?xe\b/g, 'catalyst')
      .replace(/\bactive[ -]+directory\b/g, 'activedirectory')
      .replace(/\bforti[ -]+(gate|web|client)\b/g, 'forti$1')
      .replace(/\bvision[ -]+one\b/g, 'visionone')
      .replace(/\befficient[ -]+ip\b/g, 'efficientip')
      .replace(/\btipping[ -]+point\b/g, 'tippingpoint')
      .replace(/\bcatalyst[ -]+center\b/g, 'dna')
      .replace(/\bwi[ -]+fi\b/g, 'wifi');
  }

  static tokens(value) {
    return this.canonical(value).match(/[a-z0-9]+(?:[._-][a-z0-9]+)*/g) || [];
  }

  static term(value) {
    const term = WorkspaceSearch.fold(value);
    return WorkspaceSearch.aliases[term] || term;
  }

  static plain(value, html = false) {
    if (!html || !/[<&]/.test(String(value ?? ''))) return String(value ?? '').replace(/\s+/g, ' ').trim();
    // Parse in an inert template, without loading images or executing markup.
    const template = document.createElement('template');
    template.innerHTML = String(value ?? '');
    template.content.querySelectorAll('script,style,template,noscript,iframe,object').forEach(node => node.remove());
    template.content.querySelectorAll('br,p,div,li,tr,td,th,h1,h2,h3,h4,pre,blockquote').forEach(node => node.appendChild(document.createTextNode(' ')));
    return (template.content.textContent || '').replace(/\s+/g, ' ').trim();
  }

  static fingerprint(item) {
    const fields = [item.type, item.title, item.folderId, item.tags, item.deletedAt];
    if (item.type !== 'vault') fields.push(item.facets, item.commandBlocks, item.documentType, item.content, item.description, item.context, item.example, item.vendor, item.platform,
      (item.attachments || []).map(attachment => attachment.name),
      item.protocol?.service, item.protocol?.port, item.protocol?.transport, item.protocol?.usage, item.protocol?.security);
    return JSON.stringify(fields);
  }

  invalidate(store, item) {
    const existing = store === 'items' && item ? this.cache?.documents.get(item.id) : null;
    if (existing && existing.fingerprint === WorkspaceSearch.fingerprint(item)) {
      existing.favorite = !!item.favorite;
      existing.updatedAt = item.updatedAt || item.createdAt || '';
      return;
    }
    this.revision++;
    this.cache = null;
    this.hide();
  }

  reset() {
    this.invalidate();
    this.input.value = '';
    this.scope = 'all';
    this.clear.hidden = true;
  }

  hide() {
    clearTimeout(this.timer);
    this.request++;
    this.box.hidden = true;
    this.box.classList.add('hidden');
    this.box.replaceChildren();
    this.rows = [];
    this.selected = -1;
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
    this.input.removeAttribute('aria-busy');
  }

  schedule() {
    this.request++;
    clearTimeout(this.timer);
    this.clear.hidden = !this.input.value;
    // Never leave results from the previous query actionable while typing.
    this.rows = [];
    this.box.querySelector('#globalSearchList')?.replaceChildren();
    this.input.removeAttribute('aria-activedescendant');
    if (!this.composing) this.timer = setTimeout(() => this.search(this.input.value), 75);
  }

  async index() {
    if (this.cache) return this.cache;
    if (this.pending?.revision === this.revision) return this.pending.promise;
    const revision = this.revision;
    const promise = (async () => {
      const items = await this.options.readItems();
      const folders = new Map((await this.options.readFolders()).map(folder => [folder.id, folder]));
      const documents = new Map();
      const engine = new MiniSearch({
        fields: ['title', 'technology', 'keywords', 'port', 'body'],
        tokenize: text => WorkspaceSearch.tokens(text),
        processTerm: term => WorkspaceSearch.term(term),
        searchOptions: {
          combineWith: 'AND',
          boost: {
            title: 8,
            technology: 5,
            keywords: 3,
            port: 10,
            body: 1
          },
          prefix: term => term.length >= 2 && !/^\d/.test(term),
          fuzzy: term => /^[a-z][a-z-]{3,}$/.test(term) ? (term.length >= 8 ? 2 : 1) : false,
          maxFuzzy: 2,
          weights: {
            fuzzy: 0.25,
            prefix: 0.65
          }
        }
      });
      for (let offset = 0; offset < items.length; offset += 60) {
        if (revision !== this.revision || !this.options.isUnlocked()) throw new DOMException('Search cancelled', 'AbortError');
        const batch = [];
        for (const item of items.slice(offset, offset + 60)) {
          if (item.deletedAt) continue;
          const path = [],
            seen = new Set();
          let folder = folders.get(item.folderId);
          while (folder && !seen.has(folder.id)) {
            seen.add(folder.id);
            path.unshift(String(folder.name || ''));
            folder = folders.get(folder.parentId);
          }
          const vault = item.type === 'vault';
          const rich = !vault && !['command', 'task'].includes(item.type);
          const title = String(item.title || 'Sans titre');
          const tags = (item.tags || []).filter(tag => typeof tag === 'string').join(' ');
          const technology = [path.join(' / '), vault ? '' : item.vendor, vault ? '' : item.platform].filter(Boolean).join(' ');
          const protocol = item.type === 'protocol' ? this.options.protocolMetadata(item) : null;
          const body = vault ? '' : [
            (sectionForItem(item) === 'library' ? libraryText(item) : WorkspaceSearch.plain(item.content, rich)), WorkspaceSearch.plain(item.description, true),
            WorkspaceSearch.plain(item.context, true), WorkspaceSearch.plain(item.example, true), protocol?.usage, protocol?.security
          ].filter(Boolean).join(' ');
          const document = {
            id: item.id,
            type: item.type,
            facets: sectionForItem(item) === 'library' ? libraryFacets(item) : [],
            section: this.options.sectionForItem(item),
            title,
            technology,
            body,
            path: path.join(' / '),
            port: String(protocol?.port || ''),
            keywords: [tags, protocol?.service, protocol?.transport, vault ? '' : (item.attachments || []).map(attachment => attachment.name).join(' ')].filter(Boolean).join(' '),
            favorite: !!item.favorite,
            updatedAt: item.updatedAt || item.createdAt || '',
            fingerprint: WorkspaceSearch.fingerprint(item),
            titleFold: WorkspaceSearch.canonical(title),
            technologyTerms: WorkspaceSearch.tokens(technology).map(WorkspaceSearch.term)
          };
          documents.set(item.id, document);
          batch.push(document);
        }
        engine.addAll(batch);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (revision !== this.revision) throw new DOMException('Search cancelled', 'AbortError');
      const cache = {
        engine,
        documents
      };
      this.cache = cache;
      return cache;
    })();
    this.pending = {
      revision,
      promise
    };
    try {
      return await promise;
    } finally {
      if (this.pending?.promise === promise) this.pending = null;
    }
  }

  parse(query) {
    const types = {
      commande: 'command',
      commandes: 'command',
      command: 'command',
      memo: 'memo',
      memos: 'memo',
      note: 'memo',
      procedure: 'memo',
      perso: 'personal',
      personnel: 'personal',
      personnelle: 'personal',
      personal: 'personal',
      protocole: 'protocol',
      protocoles: 'protocol',
      protocol: 'protocol',
      tache: 'task',
      task: 'task',
      checklist: 'task',
      template: 'template',
      templates: 'template',
      mail: 'template',
      rapport: 'template'
    };
    const filters = {
      types: [],
      tech: [],
      ports: [],
      phrases: []
    };
    let text = query.trim().slice(0, 200);
    text = text.replace(/\b(type|tech|port):(?:"([^"]+)"|([^\s]+))/gi, (whole, key, quoted, single) => {
      const value = quoted || single;
      if (key.toLowerCase() === 'type') {
        const type = types[WorkspaceSearch.fold(value)];
        if (!type) return whole;
        filters.types.push(type);
      } else if (key.toLowerCase() === 'tech') filters.tech.push(...WorkspaceSearch.tokens(value).map(WorkspaceSearch.term));
      else filters.ports.push(value);
      return ' ';
    });
    text = text.replace(/"([^"]+)"/g, (whole, phrase) => {
      filters.phrases.push(WorkspaceSearch.fold(phrase));
      return phrase;
    });
    const stop = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'ou', 'pour', 'sur', 'dans', 'avec', 'comment', 'quel', 'quelle', 'quels', 'quelles', 'je', 'veux', 'voir', 'afficher', 'trouver', 'est', 'ce', 'que', 'moi', 'mes']);
    let terms = [...new Set(WorkspaceSearch.tokens(text).map(WorkspaceSearch.term).filter(term => !stop.has(term)))];
    const intents = {
      commande: 'command',
      commandes: 'command',
      memo: 'memo',
      memos: 'memo',
      template: 'template',
      templates: 'template'
    };
    if (!filters.phrases.length && !filters.types.length && terms.length > 1 && intents[terms[0]]) {
      filters.types.push(intents[terms.shift()]);
    }
    return {
      text,
      terms,
      filters
    };
  }

  matches(document, parsed) {
    const filters = parsed.filters;
    if (this.scope !== 'all' && primarySectionFor(document.section) !== this.scope) return false;
    if (filters.types.some(type => ['command', 'memo', 'template', 'personal'].includes(type) ? !(document.facets || []).includes(type === 'personal' ? 'reference' : type) : document.section !== type)) return false;
    if (filters.ports.some(port => !document.port.split(/[^\d]+/).includes(port))) return false;
    if (filters.tech.some(term => !document.technologyTerms.some(word => word === term || (term.length >= 2 && !/^\d/.test(term) && word.startsWith(term))))) return false;
    if (!filters.phrases.length) return true;
    const plain = WorkspaceSearch.fold([document.title, document.technology, document.keywords, document.body].join(' '));
    return filters.phrases.every(phrase => plain.includes(phrase));
  }

  find(cache, parsed) {
    const rows = parsed.terms.length ? cache.engine.search(parsed.terms.join(' ')) : [...cache.documents.keys()].map(id => ({
      id,
      score: 0,
      terms: []
    }));
    const phrase = WorkspaceSearch.canonical(parsed.text).trim();
    return rows.map(row => {
      const document = cache.documents.get(row.id);
      const titleTerms = WorkspaceSearch.tokens(document.title).map(WorkspaceSearch.term);
      let score = row.score;
      if (phrase && document.titleFold === phrase) score += 5000;
      else if (phrase && document.titleFold.includes(phrase)) score += 500;
      if (parsed.terms.length && parsed.terms.every(term => titleTerms.includes(term))) score += 100;
      if (parsed.terms.length === 1 && /^\d+$/.test(parsed.terms[0]) && document.port.split(/[^\d]+/).includes(parsed.terms[0])) score += 1000;
      return {
        ...row,
        document,
        score
      };
    }).filter(row => this.matches(row.document, parsed)).sort((a, b) => b.score - a.score || Number(b.document.favorite) - Number(a.document.favorite) || a.document.title.localeCompare(b.document.title, 'fr'));
  }

  async search(query) {
    clearTimeout(this.timer);
    const request = ++this.request;
    if (!this.options.isUnlocked()) return this.hide();
    const revision = this.revision;
    this.clear.hidden = !this.input.value;
    this.input.setAttribute('aria-busy', 'true');
    try {
      const cache = await this.index();
      let parsed = this.parse(String(query || ''));
      const recent = !String(query || '').trim();
      let rows = this.find(cache, parsed),
        label = '';
      if (recent) {
        const activity = (await this.options.readActivity()).sort((a, b) => String(b.at).localeCompare(String(a.at)));
        const byId = new Map(rows.map(row => [row.id, row])),
          seen = new Set();
        rows = activity.filter(entry => byId.has(entry.itemId) && !seen.has(entry.itemId) && seen.add(entry.itemId)).map(entry => byId.get(entry.itemId)).slice(0, 10);
        label = 'R\u00e9cents';
        if (!rows.length) {
          rows = this.find(cache, parsed).filter(row => row.document.favorite).slice(0, 10);
          label = 'Favoris';
        }
        if (!rows.length) {
          rows = this.find(cache, parsed).sort((a, b) => b.document.updatedAt.localeCompare(a.document.updatedAt)).slice(0, 10);
          label = 'Biblioth\u00e8que';
        }
      }
      if (request !== this.request || revision !== this.revision || !this.options.isUnlocked()) return;
      this.rows = rows;
      this.parsed = parsed;
      this.label = label;
      this.limit = 20;
      this.selected = rows.length ? 0 : -1;
      this.suggestions = !rows.length && parsed.terms.length && !parsed.filters.phrases.length ? cache.engine.autoSuggest(parsed.terms.join(' '), {
        fuzzy: 0.2,
        maxFuzzy: 1,
        filter: result => this.matches(cache.documents.get(result.id), parsed)
      }).slice(0, 3).map(suggestion => suggestion.suggestion) : [];
      this.render();
    } catch (error) {
      if (error.name === 'AbortError' || request !== this.request) return;
      console.error('Workspace search:', error);
      this.rows = [];
      this.selected = -1;
      this.box.innerHTML = '<div class="search-empty" role="status">Recherche indisponible. Recharge la page.</div>';
      this.show();
    } finally {
      if (request === this.request) this.input.removeAttribute('aria-busy');
    }
  }

  highlight(text, terms) {
    const matches = new Set(terms);
    let last = 0,
      html = '';
    for (const match of String(text).matchAll(/[\p{L}\p{N}]+(?:[._-][\p{L}\p{N}]+)*/gu)) {
      html += this.options.escape(text.slice(last, match.index));
      const token = WorkspaceSearch.term(WorkspaceSearch.canonical(match[0]));
      const matched = matches.has(token) || [...matches].some(term => term.length >= 2 && !/^\d/.test(term) && token.startsWith(term));
      const word = this.options.escape(match[0]);
      html += matched ? '<mark>' + word + '</mark>' : word;
      last = match.index + match[0].length;
    }
    return html + this.options.escape(text.slice(last));
  }

  snippet(document, terms) {
    if (!document.body) return '';
    const body = document.body,
      folded = WorkspaceSearch.canonical(body);
    const positions = terms.map(term => folded.indexOf(term)).filter(position => position >= 0);
    const start = Math.max(0, (positions.length ? Math.min(...positions) : 0) - 45);
    const snippet = (start ? '\u2026' : '') + body.slice(start, start + 180) + (body.length > start + 180 ? '\u2026' : '');
    return this.highlight(snippet, terms);
  }

  render() {
    const escape = this.options.escape;
    const scopes = {
      all: 'Tout',
      library: 'Mes fiches',
      tools: 'Outils',
      checklist: 'Checklist'
    };
    const count = this.rows.length;
    const status = this.label || `${count} r\u00e9sultat${count === 1 ? '' : 's'}`;
    const previousScroll = this.box.querySelector('.search-list')?.scrollTop || 0;
    const focusedScope = document.activeElement?.id === 'globalSearchScope';
    this.box.innerHTML = `<div class="search-toolbar"><span id="globalSearchStatus" role="status" aria-live="polite">${escape(status)}</span><select id="globalSearchScope" aria-label="Filtrer la recherche par section">${Object.entries(scopes).map(([value,label]) => `<option value="${value}" ${value === this.scope ? 'selected' : ''}>${escape(label)}</option>`).join('')}</select></div>
      <div id="globalSearchList" class="search-list" role="listbox" aria-label="R\u00e9sultats de recherche">${this.rows.slice(0,this.limit).map((row,index) => {
        const document = row.document, terms = [...new Set([...(row.terms || []), ...this.parsed.terms])];
        const snippet = this.snippet(document, terms);
        return `<div id="global-search-option-${index}" class="search-result ${index === this.selected ? 'is-active' : ''}" role="option" aria-selected="${index === this.selected}" data-search-index="${index}"><span class="search-type-icon search-type-${document.section}">${this.options.icon(document.section)}</span><div class="search-result-copy"><div class="search-result-title">${this.highlight(document.title, terms)}</div><div class="search-result-meta"><span>${escape(this.options.typeLabel(document.type))}</span>${document.path ? `<span class="search-result-path">${this.highlight(document.path, terms)}</span>` : ''}</div>${snippet ? `<div class="search-snippet ${document.section === 'command' ? 'search-command-snippet' : ''}">${snippet}</div>` : ''}</div><span class="search-open-icon">${this.options.icon('open')}</span></div>`;
      }).join('')}${!count ? '<div class="search-empty">Aucun r\u00e9sultat</div>' : ''}</div>
      ${this.suggestions?.length ? `<div class="search-suggestions"><span>Suggestions</span>${this.suggestions.map(suggestion => `<button type="button" data-search-suggestion="${escape(suggestion)}">${escape(suggestion)}</button>`).join('')}</div>` : ''}
      ${count > this.limit ? `<button type="button" class="search-more" data-search-more>Afficher plus <span>${Math.min(this.limit,count)} / ${count}</span></button>` : ''}`;
    this.box.querySelector('.search-list').scrollTop = previousScroll;
    this.show();
    this.select(this.selected, false);
    if (focusedScope) this.box.querySelector('#globalSearchScope').focus();
  }

  show() {
    this.box.hidden = false;
    this.box.classList.remove('hidden');
    this.input.setAttribute('aria-expanded', 'true');
    this.resize();
  }

  resize() {
    if (this.box.hidden) return;
    const viewport = window.visualViewport;
    const bottom = viewport ? viewport.offsetTop + viewport.height : innerHeight;
    const top = this.input.closest('.search').getBoundingClientRect().bottom + 8;
    this.box.style.setProperty('--search-space', Math.max(80, bottom - top - 12) + 'px');
  }

  select(index, scroll = true) {
    this.selected = index;
    this.box.querySelectorAll('[data-search-index]').forEach(row => {
      const selected = Number(row.dataset.searchIndex) === index;
      row.classList.toggle('is-active', selected);
      row.setAttribute('aria-selected', String(selected));
    });
    const active = document.getElementById('global-search-option-' + index);
    if (active) {
      this.input.setAttribute('aria-activedescendant', active.id);
      if (scroll) active.scrollIntoView({
        block: 'nearest'
      });
    } else this.input.removeAttribute('aria-activedescendant');
  }

  onKey(event) {
    if (this.composing || event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.hide();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (this.box.hidden) {
      this.search(this.input.value);
      return;
    }
    if (event.key === 'Enter') {
      if (this.rows.length) this.open(this.selected);
      return;
    }
    if (!this.rows.length) return;
    const index = Math.max(0, Math.min(this.rows.length - 1, this.selected + (event.key === 'ArrowDown' ? 1 : -1)));
    if (index >= this.limit) {
      this.limit += 20;
      this.render();
    }
    this.select(index);
  }

  open(index) {
    const row = this.rows[index];
    if (!row || !this.options.isUnlocked()) return;
    this.hide();
    this.input.blur();
    this.options.openItem(row.id);
  }
};
