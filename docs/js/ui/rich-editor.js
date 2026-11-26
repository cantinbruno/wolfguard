'use strict';

function richTextToolbar() {
  return `<div class="word-toolbar" role="group" aria-label="Mise en forme du texte" data-wg-mousedown="if(event.target.closest('button'))event.preventDefault()">
    <div class="group"><select id="editorBlockStyle" aria-label="Style du texte" data-wg-change="applyEditorBlockStyle(this.value)">
      <option value="p">Texte normal</option><option value="h1">Titre 1</option><option value="h2">Titre 2</option><option value="h3">Titre 3</option>
    </select></div>
    <div class="group"><label class="editor-text-color">Couleur<input id="editorTextColor" type="color" value="#000000" aria-label="Couleur du texte" title="Couleur du texte sélectionné" data-wg-pointerdown="syncRichEditorSelection()" data-wg-focus="syncRichEditorSelection()" data-wg-change="applyEditorTextColor(this.value)"></label></div>
    <div class="group"><button type="button" title="Annuler la dernière action" aria-label="Annuler la dernière action" data-wg-click="fmt('undo')">↶</button><button type="button" title="Rétablir la dernière action" aria-label="Rétablir la dernière action" data-wg-click="fmt('redo')">↷</button></div>
    <div class="group"><button type="button" title="Gras" aria-label="Gras" data-wg-click="fmt('bold')"><b>G</b></button><button type="button" title="Italique" aria-label="Italique" data-wg-click="fmt('italic')"><i>I</i></button><button type="button" title="Souligné" aria-label="Souligné" data-wg-click="fmt('underline')"><u>S</u></button><button type="button" title="Barré" aria-label="Barré" data-wg-click="fmt('strikeThrough')"><s>S</s></button></div>
    <div class="group"><button type="button" title="Liste à puces" data-wg-click="fmt('insertUnorderedList')">• Liste</button><button type="button" title="Liste numérotée" data-wg-click="fmt('insertOrderedList')">1. Liste</button><button type="button" data-wg-click="insertEditorLink()">Lien</button><button type="button" data-wg-click="document.querySelector('#richEditorImagePicker').click()">Image</button></div>
    <div class="group"><button type="button" data-wg-click="insertTable()">Tableau</button><button type="button" data-wg-click="fmt('formatBlock','blockquote')">Citation</button><button type="button" data-wg-click="insertHTML('<hr><p><br></p>')">Séparateur</button></div>
    <div class="group"><button type="button" title="Aligner à gauche" data-wg-click="fmt('justifyLeft')">Gauche</button><button type="button" title="Centrer le texte" data-wg-click="fmt('justifyCenter')">Centrer</button><button type="button" title="Aligner à droite" data-wg-click="fmt('justifyRight')">Droite</button><button type="button" title="Justifier le texte" data-wg-click="fmt('justifyFull')">Justifier</button></div>
    <div class="group"><button type="button" title="Diminuer le retrait" data-wg-click="fmt('outdent')">− Retrait</button><button type="button" title="Augmenter le retrait" data-wg-click="fmt('indent')">+ Retrait</button><button type="button" data-wg-click="fmt('removeFormat')">Effacer le format</button></div>
  </div><div class="editor-table-tools" role="group" aria-label="Modifier le tableau" hidden data-wg-mousedown="if(event.target.closest('button'))event.preventDefault()">
    <span>Tableau</span><label>Fond<input id="editorCellColor" type="color" value="#dbeafe" aria-label="Couleur de fond des cellules" data-wg-pointerdown="syncRichEditorSelection()" data-wg-change="applyEditorCellColor(this.value)"></label><select id="editorColorScope" aria-label="Appliquer la couleur à"><option value="cell">Cellules sélectionnées</option><option value="row">Ligne</option><option value="table">Tableau entier</option></select><button type="button" data-wg-click="applyEditorCellColor('')">Sans couleur</button><button type="button" data-wg-click="editEditorTable('add-row')">+ Ligne</button><button type="button" data-wg-click="editEditorTable('add-column')">+ Colonne</button><button type="button" data-wg-click="editEditorTable('delete-row')">− Ligne</button><button type="button" data-wg-click="editEditorTable('delete-column')">− Colonne</button><button type="button" data-wg-click="editEditorTable('delete-table')">Retirer le tableau</button><span class="editor-table-hint">Glissez les bordures pour redimensionner.</span>
  </div>`;
}

function syncRichEditorSelection() {
  const editor = document.querySelector('#richEditor'),
    selection = window.getSelection();
  if (!editor || !selection?.rangeCount || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return;
  editor.savedSelection = selection.getRangeAt(0).cloneRange();
  const node = selection.focusNode.nodeType === Node.ELEMENT_NODE ? selection.focusNode : selection.focusNode.parentElement;
  const heading = node.closest('h1,h2,h3');
  const style = document.querySelector('#editorBlockStyle');
  if (style) style.value = heading && editor.contains(heading) ? heading.tagName.toLowerCase() : 'p';
  const color = document.querySelector('#editorTextColor');
  const rgb = getComputedStyle(node).color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (color && document.activeElement !== color && rgb) color.value = '#' + rgb.slice(1, 4).map(value => Number(value).toString(16).padStart(2, '0')).join('');
  const tableTools = document.querySelector('.editor-table-tools');
  if (tableTools) tableTools.hidden = !node.closest('td,th');
}

function focusRichEditor() {
  const editor = document.querySelector('#richEditor');
  if (!editor) return null;
  const saved = editor.savedSelection;
  editor.focus({
    preventScroll: true
  });
  if (saved && editor.contains(saved.commonAncestorContainer)) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(saved.cloneRange());
  }
  return editor;
}

function applyEditorBlockStyle(style) {
  if (['p', 'h1', 'h2', 'h3'].includes(style)) fmt('formatBlock', style);
}

function applyEditorTextColor(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color) || !focusRichEditor()) return;
  // Keep color in the document markup, including Undo and saved reading views.
  document.execCommand('styleWithCSS', false, false);
  fmt('foreColor', color);
}

document.addEventListener('selectionchange', syncRichEditorSelection);

window.fmt = (c, v = null) => {
  const editor = focusRichEditor();
  if (!editor) return;
  if (document.execCommand(c, false, v)) editor.dispatchEvent(new Event('input', {
    bubbles: true
  }));
  syncRichEditorSelection();
};

function insertHTML(html) {
  const ed = focusRichEditor();
  if (!ed) return;
  if (document.execCommand('insertHTML', false, html)) ed.dispatchEvent(new Event('input', {bubbles: true}));
  syncRichEditorSelection();
}

async function insertEditorLink() {
  syncRichEditorSelection();
  const u = await appPrompt('Adresse du lien', '', {title: 'Ajouter un lien', confirmLabel: 'Insérer', placeholder: 'https://…'});
  if (u?.trim()) fmt('createLink', u.trim());
}

async function insertTable() {
  syncRichEditorSelection();
  const rowValue = await appPrompt('Nombre de lignes, en-tête compris (1 à 20)', '3', {title: 'Insérer un tableau', confirmLabel: 'Continuer'});
  if (rowValue === null) return;
  const columnValue = await appPrompt('Nombre de colonnes (1 à 10)', '2', {title: 'Insérer un tableau', confirmLabel: 'Insérer'});
  if (columnValue === null) return;
  const rows = Math.max(1, Math.min(20, parseInt(rowValue) || 3));
  const cols = Math.max(1, Math.min(10, parseInt(columnValue) || 2));
  let t = '<table><tbody>';
  for (let r = 0; r < rows; r++) {
    t += '<tr>';
    for (let c = 0; c < cols; c++) t += r === 0 ? `<th scope="col">Colonne ${c + 1}</th>` : '<td><br></td>';
    t += '</tr>'
  }
  t += '</tbody></table><p><br></p>';
  insertHTML(t);
}

function editorTableContext() {
  const editor = document.querySelector('#richEditor');
  const range = editor?.savedSelection;
  if (!range || !editor.contains(range.startContainer)) return null;
  const node = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
  const cell = node.closest('td,th');
  const table = cell?.closest('table');
  return table && editor.contains(table) ? {editor, cell, table} : null;
}

function replaceEditorTable(table, copy) {
  const editor = document.querySelector('#richEditor');
  if (!editor?.contains(table)) return;
  const index = [...editor.querySelectorAll('table')].indexOf(table);
  const range = document.createRange();
  range.selectNode(table);
  editor.focus({preventScroll:true});
  const selection = window.getSelection();
  selection.removeAllRanges(); selection.addRange(range);
  document.execCommand('insertHTML', false, copy.outerHTML);
  const cell = editor.querySelectorAll('table')[index]?.querySelector('td,th');
  if (cell) { range.selectNodeContents(cell); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); }
  editor.dispatchEvent(new Event('input', {bubbles:true}));
  syncRichEditorSelection();
}

function applyEditorCellColor(color) {
  if (color && !/^#[0-9a-f]{6}$/i.test(color)) return;
  const context = editorTableContext();
  if (!context) return;
  const {editor,cell,table} = context, copy = table.cloneNode(true);
  const cells = [...table.querySelectorAll('td,th')], scope = document.querySelector('#editorColorScope').value;
  const range = editor.savedSelection;
  const chosen = cells.filter(node => scope === 'table' || (scope === 'row' ? node.parentElement === cell.parentElement : range.collapsed ? node === cell : range.intersectsNode(node)));
  for (const node of chosen) {
    const target = copy.querySelectorAll('td,th')[cells.indexOf(node)];
    target.removeAttribute('bgcolor'); target.style.removeProperty('background');
    target.style.backgroundColor = color;
    // Give newly filled cells a readable foreground, including pasted spans.
    if (color) {
      const rgb = color.slice(1).match(/../g).map(value=>parseInt(value,16));
      target.style.color = rgb[0]*.299+rgb[1]*.587+rgb[2]*.114 > 150 ? '#111827' : '#ffffff';
      target.querySelectorAll('[color],[style]').forEach(child=>{child.removeAttribute('color');child.style.removeProperty('color');});
    } else target.style.removeProperty('color');
  }
  replaceEditorTable(table, copy);
}

// The cell edges act as handles; no editing controls enter the saved document.
function editorResizeEdge(event) {
  const cell = event.target.closest?.('#richEditor td,#richEditor th');
  if (!cell) return null;
  const rect = cell.getBoundingClientRect(), table = cell.closest('table');
  const x = Math.abs(event.clientX-rect.right) <= 7, y = Math.abs(event.clientY-rect.bottom) <= 7;
  return x || y ? {cell,table,x,y} : null;
}
document.addEventListener('pointermove', event => {
  const editor = document.querySelector('#richEditor');
  if (!editor || event.buttons) return;
  const edge = editorResizeEdge(event);
  editor.style.cursor = edge ? edge.x && edge.y ? 'nwse-resize' : edge.x ? 'col-resize' : 'row-resize' : '';
});
document.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  const edge = editorResizeEdge(event);
  if (!edge) return;
  const {cell,table,x,y} = edge, editor = table.closest('#richEditor');
  event.preventDefault();
  const original = table.cloneNode(true), row = cell.parentElement, startX = event.clientX, startY = event.clientY;
  const width = table.getBoundingClientRect().width, height = row.getBoundingClientRect().height;
  const column = cell.cellIndex, columnWidth = cell.getBoundingClientRect().width;
  const simple = ![...table.querySelectorAll('td,th')].some(node=>node.colSpan>1||node.rowSpan>1);
  const next = simple ? row.cells[column+1] : null, nextWidth=next?.getBoundingClientRect().width;
  if (x && simple) for (const current of table.rows) for (const node of current.cells) node.style.width = node.getBoundingClientRect().width+'px';
  let changed = false;
  const drag = new AbortController();
  const move = current => {
    if (!editor.isConnected) return drag.abort();
    const delta = Math.max(40-columnWidth, Math.min(next?nextWidth-40:editor.clientWidth-width, current.clientX-startX));
    if (x) {
      table.style.width = Math.max(120,width+(next?0:delta))+'px'; table.style.tableLayout = 'fixed';
      if (simple) for (const currentRow of table.rows) {currentRow.cells[column].style.width = columnWidth+delta+'px';if(next)currentRow.cells[column+1].style.width=nextWidth-delta+'px';}
    }
    if (y) row.style.height = Math.max(28,height+current.clientY-startY)+'px';
    changed = true;
  };
  const finish = current => {
    drag.abort();
    if (!editor.isConnected) return;
    const copy = table.cloneNode(true);
    table.replaceWith(original);
    editor.style.cursor = '';
    if (changed && current.type !== 'pointercancel') replaceEditorTable(original,copy);
  };
  document.addEventListener('pointermove',move,{signal:drag.signal});
  document.addEventListener('pointerup',finish,{once:true,signal:drag.signal});
  document.addEventListener('pointercancel',finish,{once:true,signal:drag.signal});
});

function editEditorTable(action) {
  const context = editorTableContext();
  if (!context) return;
  const {editor, cell, table} = context;
  const copy = table.cloneNode(true);
  const tableIndex = [...editor.querySelectorAll('table')].indexOf(table);
  let rowIndex = cell.parentElement.rowIndex;
  let columnIndex = cell.cellIndex;
  let remove = action === 'delete-table';
  if (!remove && [...copy.querySelectorAll('td,th')].some(node => node.colSpan > 1 || node.rowSpan > 1)) {
    appNotify('Ce tableau contient des cellules fusionnées. Modifiez leur contenu ou insérez un nouveau tableau.');
    return;
  }
  const row = copy.rows[rowIndex];
  if (action === 'add-row') {
    const added = document.createElement('tr');
    for (let i = 0; i < row.cells.length; i++) added.insertCell().innerHTML = '<br>';
    if (row.parentElement.tagName === 'THEAD') {
      const body = copy.tBodies[0] || copy.createTBody();
      body.insertBefore(added, body.firstChild);
    } else row.after(added);
    rowIndex++;
  } else if (action === 'add-column') {
    for (const current of copy.rows) {
      const added = document.createElement(current.cells[columnIndex]?.tagName || 'td');
      added.innerHTML = '<br>';
      if (added.tagName === 'TH') added.scope = 'col';
      current.insertBefore(added, current.cells[columnIndex + 1] || null);
    }
    columnIndex++;
  } else if (action === 'delete-row') {
    remove = copy.rows.length === 1;
    const parent = row.parentElement;
    row.remove();
    if (!parent.children.length) parent.remove();
    rowIndex = Math.max(0, rowIndex - 1);
  } else if (action === 'delete-column') {
    remove = row.cells.length === 1;
    for (const current of copy.rows) current.cells[columnIndex]?.remove();
    columnIndex = Math.max(0, columnIndex - 1);
  } else if (!remove) return;

  // Replace through the editing command so Undo can restore the original table.
  editor.focus({preventScroll: true});
  const range = document.createRange();
  range.selectNode(table);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  if (!document.execCommand('insertHTML', false, remove ? '' : copy.outerHTML)) return;
  if (!remove) {
    const inserted = editor.querySelectorAll('table')[tableIndex];
    const target = inserted?.rows[rowIndex]?.cells[columnIndex] || inserted?.querySelector('td,th');
    if (target) {
      range.selectNodeContents(target);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  editor.dispatchEvent(new Event('input', {bubbles: true}));
  syncRichEditorSelection();
}

function insertPageBreak() {
  insertHTML('<div class="page-break" contenteditable="false"></div><p><br></p>')
}

function insertImageFromFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return appNotify('Sélectionne une image.');
  const reader = new FileReader();
  reader.onload = () => {
    insertHTML(`<p><img src="${reader.result}" alt="${esc(file.name)}" style="width:100%;height:auto"></p><p><br></p>`);
    input.value = ''
  };
  reader.readAsDataURL(file);
}

function editorObjectClick(e) {
  document.querySelectorAll('#richEditor img').forEach(i => i.classList.remove('editor-image-selected'));
  if (e.target.tagName === 'IMG') {
    selectedEditorImage = e.target;
    e.target.classList.add('editor-image-selected')
  } else selectedEditorImage = null;
}

function enableEditorImagePaste() {
  const ed = $('#richEditor');
  if (!ed) return;
  ed.onpaste = e => {
    const files = [...(e.clipboardData?.files || [])];
    const image = files.find(f => f.type.startsWith('image/'));
    if (!image) return;
    e.preventDefault();
    const r = new FileReader();
    r.onload = () => insertHTML(`<p><img src="${r.result}" alt="Capture d’écran collée"></p><p><br></p>`);
    r.readAsDataURL(image);
  };
}
