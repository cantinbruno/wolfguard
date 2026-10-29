'use strict';

const textTransforms = (() => {
  const maximumInput = 2000000, maximumOutput = 6000000, maximumDepth = 128;
  const encoder = new TextEncoder();
  const serializer = new XMLSerializer();

  function json(text, pretty, spaces) {
    try { JSON.parse(text); }
    catch (error) { throw new Error('JSON invalide : ' + error.message); }
    // Format the validated tokens, preserving large numbers, key order and escapes.
    const tokens = text.match(/"(?:[^"\\]|\\[\s\S])*"|true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}\[\]:,]/g);
    if (!pretty) return tokens.join('');
    const output = [];
    let depth = 0, length = 0;
    const append = value => {
      length += value.length;
      if (length > maximumOutput) throw new Error('Le résultat est trop volumineux. Utilise une indentation plus courte ou un texte plus petit.');
      output.push(value);
    };
    const newline = () => '\n' + ' '.repeat(spaces * depth);
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === '{' || token === '[') {
        append(token);
        if (tokens[i + 1] === (token === '{' ? '}' : ']')) { append(tokens[++i]); continue; }
        if (++depth > maximumDepth) throw new Error('JSON trop imbriqué pour être mis en forme.');
        append(newline());
      } else if (token === '}' || token === ']') {
        depth--;
        append(newline() + token);
      } else if (token === ',') append(',' + newline());
      else append(token === ':' ? ': ' : token);
    }
    return output.join('');
  }

  function xml(text, pretty, spaces) {
    const declarations = text.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g, '');
    if (/<!DOCTYPE\b/i.test(declarations)) throw new Error('Les déclarations DTD et les entités externes ne sont pas prises en charge.');
    const document = new DOMParser().parseFromString(text, 'application/xml');
    const problem = ['http://www.mozilla.org/newlayout/xml/parsererror.xml', 'http://www.w3.org/1999/xhtml']
      .some(namespace => document.getElementsByTagNameNS(namespace, 'parsererror').length);
    if (problem || !document.documentElement) throw new Error('XML invalide : vérifie les balises, les attributs et les caractères échappés.');
    let added = 0;
    function visit(element, depth) {
      if (depth > maximumDepth) throw new Error('XML trop imbriqué pour être mis en forme.');
      const children = [...element.childNodes];
      // Preserve mixed content, CDATA and xml:space, including their descendants.
      if (element.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'space') === 'preserve'
          || children.some(node => node.nodeType === Node.CDATA_SECTION_NODE || node.nodeType === Node.TEXT_NODE && /[^\t\r\n ]/.test(node.data))) return;
      if (!children.some(node => node.nodeType === Node.ELEMENT_NODE)) return;
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) visit(child, depth + 1);
        else if (child.nodeType === Node.TEXT_NODE && !/[^\t\r\n ]/.test(child.data)) child.remove();
      }
      if (pretty) {
        const nodes = [...element.childNodes];
        const indentation = '\n' + ' '.repeat((depth + 1) * spaces);
        added += indentation.length * nodes.length + 1 + depth * spaces;
        if (text.length + added > maximumOutput) throw new Error('Le résultat XML est trop volumineux. Réduis la taille du texte ou son indentation.');
        for (const node of nodes) element.insertBefore(document.createTextNode(indentation), node);
        element.append(document.createTextNode('\n' + ' '.repeat(depth * spaces)));
      }
    }
    visit(document.documentElement, 0);
    const declaration = text.match(/^(?:\uFEFF)?(<\?xml\s[\s\S]*?\?>)/)?.[1];
    const parts = [...document.childNodes].map(node => serializer.serializeToString(node));
    if (declaration) parts.unshift(declaration);
    return parts.join(pretty ? '\n' : '');
  }

  function base64(text, decode) {
    if (!decode) {
      for (const character of text) {
        if (character.length === 1 && /[\uD800-\uDFFF]/.test(character)) throw new Error('Le texte contient un caractère Unicode incomplet.');
      }
      const bytes = encoder.encode(text), chunks = [];
      for (let i = 0; i < bytes.length; i += 32768) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 32768)));
      return btoa(chunks.join(''));
    }
    const value = text.replace(/[\t\n\r ]/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 === 1 || value.includes('=') && value.length % 4 !== 0)
      throw new Error('Base64 invalide : vérifie les caractères et le remplissage « = ».');
    let binary;
    try { binary = atob(value); }
    catch { throw new Error('Base64 invalide : la valeur est incomplète ou mal formée.'); }
    try { return new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(Uint8Array.from(binary, character => character.charCodeAt(0))); }
    catch { throw new Error('Ce Base64 contient des données binaires, pas un texte UTF-8 valide.'); }
  }

  function transform(format, action, text, indentation = 2) {
    if (typeof text !== 'string' || text.length > maximumInput) throw new Error('Le texte doit contenir au maximum 2 000 000 de caractères.');
    const spaces = Number(indentation) === 4 ? 4 : 2;
    let output;
    if (format === 'base64' && ['encode', 'decode'].includes(action)) output = base64(text, action === 'decode');
    else if (format === 'url' && ['encode', 'decode'].includes(action)) {
      try { output = action === 'encode' ? encodeURIComponent(text) : decodeURIComponent(text); }
      catch { throw new Error('URL invalide : vérifie les séquences « %xx » et l’encodage UTF-8.'); }
    } else if (format === 'json' && ['format', 'compact'].includes(action)) output = json(text, action === 'format', spaces);
    else if (format === 'xml' && ['format', 'compact'].includes(action)) output = xml(text, action === 'format', spaces);
    else throw new Error('Choisis un format et une opération valides.');
    if (output.length > maximumOutput) throw new Error('Le résultat dépasse la taille maximale de 6 000 000 de caractères.');
    return output;
  }
  return Object.freeze({transform});
})();

const TEXT_TOOL_FORMATS = {
  base64: {label: 'Base64', help: 'Texte UTF-8. Le décodage accepte aussi le Base64 URL-safe.', actions: {encode: 'Encoder', decode: 'Décoder'}},
  url: {label: 'URL', help: 'Encodage d’un composant d’URL en %xx. Le signe + est conservé au décodage.', actions: {encode: 'Encoder', decode: 'Décoder'}},
  json: {label: 'JSON', help: 'Mise en forme ou version compacte, en conservant les nombres et l’ordre des clés.', actions: {format: 'Mettre en forme', compact: 'Compacter'}},
  xml: {label: 'XML', help: 'Mise en forme ou version compacte, en conservant les textes, commentaires et CDATA.', actions: {format: 'Mettre en forme', compact: 'Compacter'}}
};
const textToolState = {format: 'base64', action: 'encode', indentation: '2', input: '', output: '', hasResult: false, error: ''};

function resetTextTools() {
  Object.assign(textToolState, {format: 'base64', action: 'encode', indentation: '2', input: '', output: '', hasResult: false, error: ''});
  for (const id of ['textToolInput', 'textToolOutput']) if ($('#' + id)) $('#' + id).value = '';
  if ($('#textToolError')) { $('#textToolError').textContent = ''; $('#textToolError').hidden = true; }
  for (const id of ['textToolCopy', 'textToolReuse']) if ($('#' + id)) $('#' + id).disabled = true;
}

function renderTextTools() {
  const model = textToolState, format = TEXT_TOOL_FORMATS[model.format], key = state.vaultKey;
  $('#content').innerHTML = '<div class="toolbox-network-workspace"><div id="detailHost"><section class="network-tools-page text-tools-page" aria-labelledby="textToolTitle">' +
    '<header class="network-tool-heading"><span class="toolbox-page-symbol" aria-hidden="true">' + networkToolIcon('code') + '</span><div><h2 id="textToolTitle">Décodeur et formateur</h2><p>Transformer du texte en Base64, URL, JSON ou XML.</p></div><button type="button" class="secondary workspace-icon" id="textToolReset" title="Effacer les textes" aria-label="Effacer les textes">' + networkToolIcon('reset') + '</button></header>' +
    '<form id="textToolForm" novalidate><div class="text-tool-controls"><div class="text-tool-formats" role="group" aria-label="Format du texte">' +
    Object.entries(TEXT_TOOL_FORMATS).map(([id, entry]) => '<button type="button" data-text-format="' + id + '" aria-pressed="' + (model.format === id) + '">' + entry.label + '</button>').join('') +
    '</div><label class="text-tool-choice" for="textToolAction">Opération<select id="textToolAction">' + Object.entries(format.actions).map(([id, label]) => '<option value="' + id + '" ' + (model.action === id ? 'selected' : '') + '>' + label + '</option>').join('') +
    '</select></label><label class="text-tool-choice" for="textToolIndent" ' + (['json', 'xml'].includes(model.format) ? '' : 'hidden') + '>Indentation<select id="textToolIndent"><option value="2" ' + (model.indentation === '2' ? 'selected' : '') + '>2 espaces</option><option value="4" ' + (model.indentation === '4' ? 'selected' : '') + '>4 espaces</option></select></label></div>' +
    '<p id="textToolHelp" class="text-tool-help">' + format.help + '</p><div class="text-tool-editors"><section class="text-tool-panel"><header><label for="textToolInput">Texte à transformer</label><span id="textToolInputCount"></span></header>' +
    '<textarea id="textToolInput" spellcheck="false" autocomplete="off" autocapitalize="off" aria-describedby="textToolHelp textToolError" placeholder="Colle ou saisis ton texte ici…"></textarea><footer><button type="submit" class="primary network-submit" id="textToolRun"></button></footer></section>' +
    '<section class="text-tool-panel"><header><label for="textToolOutput">Résultat</label><span id="textToolOutputCount"></span></header><textarea id="textToolOutput" spellcheck="false" readonly placeholder="Le résultat apparaîtra ici."></textarea>' +
    '<footer><button type="button" class="secondary" id="textToolReuse">Utiliser comme entrée</button><button type="button" class="secondary" id="textToolCopy">' + ITEM_ACTION_ICONS.copy + '<span>Copier</span></button></footer></section></div>' +
    '<p id="textToolError" class="network-error" role="alert" hidden></p><p id="textToolStatus" class="text-tool-status" role="status" aria-live="polite"></p></form></section></div></div>';
  const form = $('#textToolForm'), input = $('#textToolInput'), output = $('#textToolOutput'), copy = $('#textToolCopy');
  const active = () => form.isConnected && state.section === 'tools' && networkToolsView.tool === 'text' && itemActionSessionValid(key);
  input.value = model.input;
  output.value = model.output;
  function refresh() {
    $('#textToolInputCount').textContent = model.input.length.toLocaleString('fr-FR') + ' caractères';
    $('#textToolOutputCount').textContent = model.hasResult ? model.output.length.toLocaleString('fr-FR') + ' caractères' : '';
    $('#textToolRun').textContent = TEXT_TOOL_FORMATS[model.format].actions[model.action];
    $('#textToolRun').disabled = !model.input.length;
    $('#textToolIndent').disabled = model.action !== 'format';
    copy.disabled = $('#textToolReuse').disabled = !model.hasResult;
    copy.querySelector('span').textContent = 'Copier';
    $('#textToolError').textContent = model.error;
    $('#textToolError').hidden = !model.error;
    input.setAttribute('aria-invalid', String(!!model.error));
    $('#textToolStatus').textContent = model.hasResult ? 'Transformation terminée.' : '';
  }
  function invalidate() {
    model.output = model.error = '';
    model.hasResult = false;
    output.value = '';
    refresh();
  }
  input.oninput = () => { if (active()) { model.input = input.value; invalidate(); } };
  form.querySelectorAll('[data-text-format]').forEach(button => button.onclick = () => {
    if (!active() || model.format === button.dataset.textFormat) return;
    model.format = button.dataset.textFormat;
    model.action = Object.keys(TEXT_TOOL_FORMATS[model.format].actions)[0];
    model.output = model.error = ''; model.hasResult = false;
    renderTextTools(); mountToolboxNavigation();
    $('[data-text-format="' + model.format + '"]')?.focus({preventScroll: true});
  });
  $('#textToolAction').onchange = event => { if (active()) { model.action = event.target.value; invalidate(); } };
  $('#textToolIndent').onchange = event => { if (active()) { model.indentation = event.target.value; invalidate(); } };
  form.onsubmit = event => {
    event.preventDefault();
    if (!active()) return;
    try {
      model.output = textTransforms.transform(model.format, model.action, model.input, model.indentation);
      model.hasResult = true; model.error = ''; output.value = model.output;
    } catch (error) {
      model.output = ''; model.hasResult = false; model.error = error.message; output.value = '';
    }
    refresh();
  };
  $('#textToolReset').onclick = () => { if (active()) { resetTextTools(); renderTextTools(); mountToolboxNavigation(); $('#textToolInput').focus(); } };
  $('#textToolReuse').onclick = () => { if (active() && model.hasResult) { model.input = model.output; input.value = model.input; invalidate(); input.focus(); } };
  copy.onclick = async () => {
    if (!active() || !model.hasResult) return;
    const value = model.output;
    copy.disabled = true;
    const success = await copyText(value);
    if (!active() || !model.hasResult || model.output !== value) return;
    copy.disabled = false;
    copy.querySelector('span').textContent = success ? 'Copié' : 'Réessayer';
    $('#textToolStatus').textContent = success ? 'Résultat copié.' : 'Copie impossible. Sélectionne le résultat pour le copier manuellement.';
  };
  refresh();
}
