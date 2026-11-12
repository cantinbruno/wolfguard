'use strict';

const topNavigation = (() => {
  let permissionSignature=null,resizeObserver=null;
  let navigation, securityNavigation, securityButton;
  let lastSecuritySection = null;
  const isSecuritySection = section => isScanSection(section) || ['agents','edr','remote'].includes(section);
  const signature = () => availablePrimarySections().join(',');
  const labels = {
    agents: 'Agents',
    library: 'Mémo',
    'scan-passive': 'Scan passif',
    'scan-active': 'Scan actif',
    'scan-map': 'Cartographie',
    'scan-vulnerability': 'Vulnérabilités',
    tools: 'Outils',
    remote: 'Prise en main',
    vault: 'Coffre-fort',
    edr: 'EDR'
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
    const securityActive = isSecuritySection(active);
    if (securityActive) lastSecuritySection = active;
    securityNavigation.hidden = !securityActive;
    securityButton?.classList.toggle('active', securityActive);
    securityButton?.setAttribute('aria-pressed', String(securityActive));
    securityButton?.setAttribute('aria-expanded', String(securityActive));
    for (const button of [...navigation.querySelectorAll('[data-section]'), ...securityNavigation.querySelectorAll('[data-section]')]) {
      const selected = button.dataset.section === active;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    positionIndicator();
    navigation.querySelector('.workspace-section-button.active')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    securityNavigation.querySelector('.workspace-section-button.active')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    syncMemoDraftIndicator();
  }

  function init() {
    if (navigation) return;
    navigation = $('.global-tabs');
    if (!navigation) return;
    permissionSignature=signature();
    securityNavigation = $('#securityNavigation');
    if (!securityNavigation) {
      securityNavigation = document.createElement('nav');
      securityNavigation.id = 'securityNavigation';
      securityNavigation.className = 'security-navigation';
      securityNavigation.setAttribute('aria-label', 'Sécurité');
      $('.topbar').after(securityNavigation);
    }
    $('#agentsBtn')?.remove();
    const sections = availablePrimarySections();
    const securitySections = [...(sections.includes('agents') ? ['agents'] : []), ...sections.filter(section => isSecuritySection(section) && section !== 'agents')];
    securityButton = null;
    navigation.hidden=false;
    navigation.classList.add('section-navigation');
    navigation.setAttribute('aria-label', 'Espaces de travail');
    const makeButton = section => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'workspace-section-button';
      button.dataset.section = section;
      if (section === 'agents') button.id = 'agentsBtn';
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
    };
    const buttons = [];
    for (const section of sections) {
      if (isSecuritySection(section)) continue;
      buttons.push(makeButton(section));
    }
    if (securitySections.length) {
      securityButton = document.createElement('button');
      securityButton.type = 'button';
      securityButton.className = 'workspace-section-button workspace-security-button';
      securityButton.textContent = 'Sécurité';
      securityButton.setAttribute('aria-controls', 'securityNavigation');
      securityButton.onclick = () => {
        const target = securitySections.includes('agents') ? 'agents' : securitySections.includes(lastSecuritySection) ? lastSecuritySection : securitySections[0];
        switchPrimaryWorkspace(target).catch(console.error);
      };
      const securityIndex = sections.findIndex(isSecuritySection);
      buttons.splice(securityIndex < 0 ? buttons.length : securityIndex, 0, securityButton);
    }
    securityNavigation.replaceChildren(...securitySections.map(makeButton));
    navigation.replaceChildren(...buttons);
    navigation.hidden = buttons.length < 2 && !securityButton;
    $('#app').classList.toggle('single-module', navigation.hidden);
    resizeObserver?.disconnect();resizeObserver=new ResizeObserver(()=>{positionIndicator();navigation.querySelector('.workspace-section-button.active')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});});resizeObserver.observe(navigation);
    setActive(state.section);
  }
  return {
    init,
    refresh(){if(!navigation||signature()===permissionSignature)return;navigation=null;init();},
    setActive
  };
})();
