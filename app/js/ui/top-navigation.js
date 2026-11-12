'use strict';

const topNavigation = (() => {
  let permissionSignature = null, resizeObserver = null, navigation;
  const labels = {library:'M\u00e9mo', vault:'Coffre-fort', tools:'Outils', security:'S\u00e9curit\u00e9'};
  const signature = () => availablePrimarySections().join(',');
  function positionIndicator() {
    const button = navigation.querySelector('.workspace-section-button.active');
    if (!button || !button.offsetWidth) {
      navigation.style.setProperty('--tab-indicator-opacity', '0');
      return;
    }
    navigation.style.setProperty('--tab-indicator-x', (button.offsetLeft + 12) + 'px');
    navigation.style.setProperty('--tab-indicator-width', Math.max(0, button.offsetWidth - 24) + 'px');
    navigation.style.setProperty('--tab-indicator-opacity', '1');
    requestAnimationFrame(() => { navigation.dataset.indicatorReady = 'true'; });
  }
  function setActive(section) {
    if (!navigation) return;
    const active = primarySectionFor(section);
    navigation.dataset.activeSection = active;
    $('#app').dataset.primarySection = active;
    for (const button of navigation.querySelectorAll('[data-section]')) {
      const selected = button.dataset.section === active;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    positionIndicator();
    navigation.querySelector('.workspace-section-button.active')?.scrollIntoView({block:'nearest', inline:'nearest', behavior:'instant'});
    syncMemoDraftIndicator();
  }
  function init() {
    if (navigation) return;
    navigation = $('.global-tabs');
    if (!navigation) return;
    permissionSignature = signature();
    $('#agentsBtn')?.remove();
    $('#securityNavigation')?.remove();
    const sections = availablePrimarySections();
    navigation.classList.add('section-navigation');
    navigation.setAttribute('aria-label', 'Espaces de travail');
    const buttons = sections.map(section => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'workspace-section-button';
      button.dataset.section = section;
      if (section === 'security') {
        button.id = 'securityBtn';
        button.classList.add('workspace-security-button');
      }
      const icon = document.createElement('span');
      icon.className = 'workspace-section-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = workspaceSectionIcon(section === 'security' ? 'edr' : section);
      const label = document.createElement('span');
      label.className = 'workspace-section-label';
      label.textContent = labels[section];
      button.append(icon, label);
      button.onclick = () => switchPrimaryWorkspace(section).catch(console.error);
      return button;
    });
    navigation.replaceChildren(...buttons);
    navigation.hidden = buttons.length < 2;
    $('#app').classList.toggle('single-module', navigation.hidden);
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(positionIndicator);
    resizeObserver.observe(navigation);
    setActive(state.section);
  }
  return {
    init,
    refresh() { if (!navigation || signature() === permissionSignature) return; navigation = null; init(); },
    setActive
  };
})();
