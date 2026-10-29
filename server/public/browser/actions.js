'use strict';

// A closed command list replaces executable HTML attributes. No eval/Function.
(() => {
  const commands = {
    closeModal: () => closeModal(), setMode: value => setMode(value),
    openPasswordGenerator: () => openPasswordGenerator(), addCustom: () => addCustom(),
    saveVault: id => saveVault(id), duplicateItem: id => duplicateItem(id), deleteItem: id => deleteItem(id),
    changeAccessCode: () => changeAccessCode(), connectWorkspaceFolder: () => connectWorkspaceFolder(),
    reconnectSavedWorkspace: () => reconnectSavedWorkspace(), writePortableFile: () => writePortableFile(),
    newLibraryItem: () => newLibraryItem(), cancelLibraryEdit: () => cancelLibraryEdit(),
    saveLibraryItem: id => saveLibraryItem(id), addLibraryCommand: () => addLibraryCommand(),
    editorObjectClick: event => editorObjectClick(event), insertImageFromFile: input => insertImageFromFile(input),
    importWorkspaceModule: (button, id) => importWorkspaceModule(button, id),
    newVault: () => newVault(), newFolder: () => newFolder(),
    applyEditorBlockStyle: value => applyEditorBlockStyle(value),
    syncRichEditorSelection: () => syncRichEditorSelection(), applyEditorTextColor: value => applyEditorTextColor(value),
    fmt: (command, value) => fmt(command, value), insertEditorLink: () => insertEditorLink(),
    insertTable: () => insertTable(), insertHTML: html => insertHTML(html), editEditorTable: action => editEditorTable(action),
    folderDragStart: (event, id) => folderDragStart(event, id), dragEnd: event => dragEnd(event),
    folderDragOver: (event, id) => folderDragOver(event, id), dragLeave: event => dragLeave(event),
    dropOnFolder: (event, id) => dropOnFolder(event, id), selectFolder: id => selectFolder(id),
    folderContextMenu: (event, id) => folderContextMenu(event, id), toggleFolderCollapse: id => toggleFolderCollapse(id),
    folderMenu: id => folderMenu(id), itemDragStart: (event, id) => itemDragStart(event, id),
    openItem: id => openItem(id), itemContextMenu: (event, id) => itemContextMenu(event, id),
    rootDragOver: event => rootDragOver(event), dropOnRoot: event => dropOnRoot(event),
    navigationContextMenu: event => navigationContextMenu(event), openSection: section => openSection(section)
  };
  const events = ['click','change','mousedown','pointerdown','focus','dragstart','dragend','dragover','dragenter','dragleave','drop','contextmenu'];
  // User-authored HTML cannot carry application commands, including forged ones.
  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (/^data-wg-/i.test(data.attrName)) data.keepAttr = false;
    if (data.attrName === 'target' && data.attrValue === '_blank') _node.setAttribute('rel', 'noopener noreferrer');
  });
  function invoke(source, event, element) {
    if (source.startsWith('event.stopPropagation();')) {
      event.stopPropagation(); source = source.slice('event.stopPropagation();'.length);
    }
    if (source === "if(event.target.closest('button'))event.preventDefault()") {
      if (event.target.closest('button')) event.preventDefault(); return;
    }
    if (source === 'this.parentElement.remove()') { element.parentElement.remove(); return; }
    if (source === "$('#changeCodeArea').innerHTML='';$('#changeCodeBtn').focus()") {
      $('#changeCodeArea').replaceChildren(); $('#changeCodeBtn').focus(); return;
    }
    if (source === "document.querySelector('#richEditorImagePicker').click()") { $('#richEditorImagePicker')?.click(); return; }
    if (source === "copySecret($('#fPass').value)") { return copySecret($('#fPass').value); }
    const match = /^([A-Za-z]+)\((.*)\)$/.exec(source);
    if (!match || !Object.hasOwn(commands, match[1])) throw new Error('Action HTML non autorisée.');
    const args = [];
    let rest = match[2];
    while (rest) {
      const argument = /^(?:'([^'\\]*)'|(event|this\.value|this|null))(?:,|$)/.exec(rest);
      if (!argument) throw new Error('Paramètre HTML non autorisé.');
      args.push(argument[1] !== undefined ? argument[1] : argument[2] === 'event' ? new Proxy(event, {
        get(target, key) { if (key === 'currentTarget') return element; const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; }
      }) : argument[2] === 'this.value' ? element.value : argument[2] === 'this' ? element : null);
      rest = rest.slice(argument[0].length);
    }
    return commands[match[1]](...args);
  }
  for (const name of events) document.addEventListener(name, event => {
    if (!state.vaultKey || $('#app').classList.contains('hidden')) return;
    for (const element of event.composedPath()) {
      if (!(element instanceof Element)) continue;
      const source = element.getAttribute('data-wg-' + name);
      if (source !== null && !element.matches(':disabled')) {
        try { Promise.resolve(invoke(source, event, element)).catch(error => appNotify(error.message, {kind:'error'})); }
        catch (error) { appNotify(error.message, {kind:'error'}); }
      }
      if (event.cancelBubble) break;
    }
  }, name === 'focus');
})();
