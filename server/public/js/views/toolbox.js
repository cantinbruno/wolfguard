'use strict';

const TOOLBOX_TOOLS = [{
  id: 'ip',
  section: 'tools',
  title: 'Analyse IP',
  description: 'Adresses et sous-réseaux',
  category: 'Réseau',
  icon: 'protocol'
}, {
  id: 'ports',
  section: 'protocol',
  title: 'Ports & services',
  description: 'Ports, protocoles et usages',
  category: 'Réseau',
  icon: 'protocol'
}, {
  id: 'hash',
  section: 'tools',
  title: 'Vérifier un fichier',
  description: 'Empreintes et comparaison',
  category: 'Fichiers',
  icon: 'hash'
}, {
  id: 'text',
  section: 'tools',
  title: 'Décodeur et formateur',
  description: 'Base64, URL, JSON et XML',
  category: 'Texte',
  icon: 'code'
}];

function toolboxIcon(tool) {
  if (tool.id === 'ip') return networkToolIcon('cidr');
  if (tool.id === 'passive') return networkToolIcon('activity');
  if (tool.id === 'active') return networkToolIcon('radar');
  if (tool.id === 'text') return networkToolIcon('code');
  return tool.icon === 'hash' ? networkToolIcon('hash') : workspaceSectionIcon(tool.icon)
}

function currentToolboxTool() {
  return TOOLBOX_TOOLS.find(tool => tool.section === state.section && (tool.section !== 'tools' || tool.id === networkToolsView.tool))
}
async function openToolboxTool(id) {
  const tool = TOOLBOX_TOOLS.find(tool => tool.id === id);
  if (!tool) return false;
  return openSection(tool.section, null, {
    tool: id
  });
}

function setToolboxNavigation(open, focus = true) {
  const shell = $('#toolboxShell');
  if (!shell) return;
  shell.classList.toggle('navigation-open', open);
  const trigger = shell.querySelector('.toolbox-navigation-toggle');
  trigger.setAttribute('aria-expanded', String(open));
  shell.querySelector('.workspace-navigation-backdrop').hidden = !open;
  if (focus && innerWidth <= 760) {
    (open ? shell.querySelector('[aria-current="page"]') : trigger)?.focus({preventScroll: true});
  }
}

function mountToolboxNavigation() {
  if (primarySectionFor(state.section) !== 'tools' || $('#toolboxShell')) return;
  const tool = currentToolboxTool();
  const content = $('#content'),
    shell = document.createElement('div'),
    bar = document.createElement('nav'),
    body = document.createElement('div');
  shell.id = 'toolboxShell';
  shell.className = 'toolbox-shell';
  body.className = 'toolbox-tool-body';
  bar.className = 'toolbox-context library-navigation';
  bar.id = 'toolboxNavigation';
  bar.setAttribute('aria-label', 'Navigation des outils');
  bar.innerHTML = '<div class="explorer-head"><div class="workspace-navigation-heading"><span class="workspace-navigation-symbol" aria-hidden="true">' + workspaceSectionIcon('tools') + '</span><div><h2>Outils</h2><p>' + TOOLBOX_TOOLS.length + ' outils</p></div></div></div><div class="toolbox-nav-list">' + TOOLBOX_TOOLS.map(entry => '<button type="button" class="toolbox-nav-tool tree-row' + (entry.id === tool?.id ? ' active' : '') + '" data-toolbox-nav="' + entry.id + '" ' + (entry.id === tool?.id ? 'aria-current="page"' : '') + '><span class="toolbox-nav-icon" aria-hidden="true">' + toolboxIcon(entry) + '</span><span class="toolbox-nav-copy">' + entry.title + '</span></button>').join('') + '</div>';
  body.append(...content.childNodes);
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbox-mobile-toolbar';
  toolbar.innerHTML = '<button type="button" class="secondary workspace-icon toolbox-navigation-toggle" title="Navigation des outils" aria-label="Ouvrir la navigation des outils" aria-controls="toolboxNavigation" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><span>Outils</span>';
  toolbar.querySelector('button').onclick = () => setToolboxNavigation(!shell.classList.contains('navigation-open'));
  body.prepend(toolbar);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'secondary workspace-icon workspace-navigation-close toolbox-nav-close';
  close.setAttribute('aria-label', 'Fermer la navigation');
  close.innerHTML = PROTOCOL_ICONS.clear;
  close.onclick = () => setToolboxNavigation(false);
  bar.querySelector('.explorer-head').append(close);
  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'workspace-navigation-backdrop';
  backdrop.setAttribute('aria-label', 'Fermer la navigation');
  backdrop.hidden = true;
  backdrop.onclick = () => setToolboxNavigation(false);
  const scanSymbol = body.querySelector('.scan-title > span');
  if (scanSymbol && tool) scanSymbol.innerHTML = toolboxIcon(tool);
  shell.append(bar, body, backdrop);
  content.append(shell);
  requestAnimationFrame(() => {
    if (bar.isConnected && innerWidth > 760) bar.querySelector('[aria-current="page"]')?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest'
    });
  });
  bar.querySelectorAll('[data-toolbox-nav]').forEach(button => button.onclick = async event => {
    if (button.dataset.toolboxNav === tool?.id) return setToolboxNavigation(false);
    const id = button.dataset.toolboxNav;
    if (await openToolboxTool(id) && event.detail === 0) (innerWidth <= 760 ? $('.toolbox-navigation-toggle') : $('#toolboxShell [data-toolbox-nav="' + id + '"]'))?.focus({
      preventScroll: true
    });
  });
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('#toolboxShell')?.classList.contains('navigation-open')) {
    event.preventDefault();
    setToolboxNavigation(false);
  }
});
