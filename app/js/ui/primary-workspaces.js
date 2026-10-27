'use strict';

const primaryWorkspaces = {
  memo: null,
  checklist: {
    section: 'checklist',
    folder: null,
    item: null,
    mode: 'view'
  },
  tools: {
    section: 'tools',
    tool: 'ip',
    folder: null,
    item: null,
    mode: 'view'
  }
};
const primarySectionFor = section => section === 'modules' ? 'modules' : section === 'checklist' ? 'checklist' : section === 'home' || LIBRARY_SECTIONS.includes(section) ? 'library' : 'tools';
const availablePrimarySections = () => ['library', 'tools', 'checklist'].filter(section => workspaceModules.allows(section));

function resetPrimaryWorkspaces() {
  primaryWorkspaces.memo = null;
  primaryWorkspaces.checklist = {
    section: 'checklist',
    folder: null,
    item: null,
    mode: 'view'
  };
  primaryWorkspaces.tools = {
    section: 'tools',
    tool: 'ip',
    folder: null,
    item: null,
    mode: 'view'
  };
  syncMemoDraftIndicator();
}

function hasParkedMemoDraft() {
  return !!primaryWorkspaces.memo?.dirty
}

function syncMemoDraftIndicator() {
  const button = $('.workspace-section-button[data-section="library"]');
  const draft = hasParkedMemoDraft() || (state.section === 'library' && state.mode === 'edit' && $('#detailHost')?.dataset.editorDirty === 'true');
  button?.classList.toggle('has-draft', draft);
  for (const tab of document.querySelectorAll('.workspace-section-button')) {
    const section = tab.dataset.section;
    const shortcut = {library: '1', tools: '2', checklist: '3'}[section];
    const label = tab.textContent + ' (Alt+' + shortcut + ')' + (section === 'library' && draft ? ' · Brouillon de fiche en cours' : '');
    tab.title = label;
    tab.setAttribute('aria-label', label);
    tab.setAttribute('aria-keyshortcuts', 'Alt+' + shortcut);
  }
}

function rememberPrimaryWorkspace(destination) {
  const from = primarySectionFor(state.section),
    to = primarySectionFor(destination);
  if (from === to) return;
  if (from === 'library') {
    const content = $('#content');
    const scrolls = [...content.querySelectorAll('*')].filter(node => node.scrollTop || node.scrollLeft).map(node => ({
      node,
      top: node.scrollTop,
      left: node.scrollLeft
    }));
    const fragment = document.createDocumentFragment();
    fragment.append(...content.childNodes);
    primaryWorkspaces.memo = {
      fragment,
      scrolls,
      key: state.vaultKey,
      dirty: fragment.querySelector('#detailHost')?.dataset.editorDirty === 'true',
      state: {
        section: state.section,
        folder: state.folder,
        item: state.item,
        mode: state.mode
      }
    };
  } else if (from === 'checklist') primaryWorkspaces.checklist = {
    section: 'checklist',
    folder: state.folder,
    item: state.item,
    mode: 'view'
  };
  else if (from === 'tools' && workspaceModules.has('tools')) primaryWorkspaces.tools = {
    section: state.section,
    tool: networkToolsView.tool,
    folder: state.folder,
    item: state.item,
    mode: 'view'
  };
  syncMemoDraftIndicator();
}

function restoreMemoWorkspace(itemId = null) {
  const saved = primaryWorkspaces.memo;
  if (!saved || saved.key !== state.vaultKey || (itemId && itemId !== saved.state.item)) return false;
  Object.assign(state, saved.state);
  $('#content').replaceChildren(saved.fragment);
  primaryWorkspaces.memo = null;
  requestAnimationFrame(() => {
    for (const {
        node,
        top,
        left
      }
      of saved.scrolls) {
      node.scrollTop = top;
      node.scrollLeft = left
    }
  });
  syncMemoDraftIndicator();
  return true;
}
async function switchPrimaryWorkspace(section) {
  if (!workspaceModules.allows(section)) return false;
  const target = primarySectionFor(section);
  if (target === primarySectionFor(state.section)) {
    // A click back to the current tab cancels a pending switch before its DOM swap.
    if (sectionTransition.active) return sectionTransition.navigate(state.section, async () => {
      topNavigation.setActive(state.section);
      return true
    });
    return true;
  }
  if (target === 'library') return openSection('library');
  if (target === 'modules') return openSection('modules');
  if (target === 'checklist') return openSection('checklist', null, {
    resume: primaryWorkspaces.checklist
  });
  const saved = primaryWorkspaces.tools;
  return openSection(saved.section, null, {
    resume: saved
  });
}
document.addEventListener('input', () => syncMemoDraftIndicator());
document.addEventListener('keydown', event => {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['1', '2', '3'].includes(event.key) || $('#app').classList.contains('hidden') || $('#modalRoot').children.length) return;
  event.preventDefault();
  switchPrimaryWorkspace({
    '1': 'library',
    '2': 'tools',
    '3': 'checklist'
  } [event.key]);
});
