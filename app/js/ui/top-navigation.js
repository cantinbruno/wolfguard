'use strict';

const topNavigation = (() => {
  let permissionSignature=null,resizeObserver=null;
  let navigation;
  const labels = {
    library: 'Mémo',
    'scan-passive': 'Scan passif',
    'scan-active': 'Scan actif',
    'scan-map': 'Cartographie',
    'scan-vulnerability': 'Vulnérabilités',
    tools: 'Outils',
    remote: 'Prise en main',
    vault: 'Coffre-fort'
  };

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
    navigation.querySelector('.workspace-section-button.active')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    syncMemoDraftIndicator();
  }

  function init() {
    if (navigation) return;
    navigation = $('.global-tabs');
    if (!navigation) return;
    permissionSignature=availablePrimarySections().join(',');
    navigation.hidden=false;
    navigation.classList.add('section-navigation');
    navigation.setAttribute('aria-label', 'Espaces de travail');
    $('#app').classList.toggle('single-module', !workspaceModules.canSwitch);
    if (!workspaceModules.canSwitch) {
      navigation.replaceChildren();
      navigation.hidden = true;
      setActive(state.section);
      return;
    }
    const buttons = availablePrimarySections().map(section => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'workspace-section-button';
      button.dataset.section = section;
      const icon = document.createElement('span');
      icon.className = 'workspace-section-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = workspaceSectionIcon(section);
      const label = document.createElement('span');
      label.className = 'workspace-section-label';
      label.textContent = labels[section];
      button.append(icon, label);
      button.onclick = () => switchPrimaryWorkspace(section).catch(console.error);
      return button;
    });
    navigation.replaceChildren(...buttons);
    resizeObserver?.disconnect();resizeObserver=new ResizeObserver(()=>{positionIndicator();navigation.querySelector('.workspace-section-button.active')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});});resizeObserver.observe(navigation);
    setActive(state.section);
  }
  return {
    init,
    refresh(){const signature=availablePrimarySections().join(',');if(!navigation||signature===permissionSignature)return;permissionSignature=signature;navigation=null;init();},
    setActive
  };
})();
