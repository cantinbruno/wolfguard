'use strict';

const checklistView = {query: '', filter: 'all'};
const CHECKLIST_PRIORITIES = {high: 'Haute', normal: 'Normale', low: 'Basse'};
const checklistToday = () => {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};
const checklistOverdue = task => !task.completed && !!task.dueDate && task.dueDate < checklistToday();
const checklistSessionValid = key => !!key && state.vaultKey === key && state.section === 'checklist';
function resetChecklistView() {
  checklistView.query = '';
  checklistView.filter = 'all';
}

async function renderChecklistWorkspace() {
  const key = state.vaultKey;
  let tasks = (await activeItems()).filter(item => item.type === 'task');
  if (!checklistSessionValid(key)) return;
  if (state.item) resetChecklistView();
  $('#content').innerHTML = `<section class="checklist-workspace" aria-labelledby="checklistHeading">
    <header class="checklist-header"><div class="checklist-heading"><span aria-hidden="true">${workspaceSectionIcon('checklist')}</span><div><h1 id="checklistHeading">Checklist</h1><p>Tes tâches et vérifications, au même endroit.</p></div></div><button type="button" class="primary" id="checklistAdd">${PROTOCOL_ICONS.plus}Ajouter une tâche</button></header>
    <div class="checklist-stats" aria-live="polite" id="checklistStats"></div>
    <div class="checklist-progress"><span id="checklistProgressLabel"></span><progress id="checklistProgress" max="100" value="0" aria-label="Progression des tâches"></progress></div>
    <div class="checklist-toolbar"><label class="checklist-search">${PROTOCOL_ICONS.search}<input id="checklistSearch" type="search" maxlength="200" placeholder="Rechercher une tâche…" aria-label="Rechercher une tâche" value="${esc(checklistView.query)}"></label><select id="checklistFilter" aria-label="Filtrer les tâches"><option value="all">Toutes les tâches</option><option value="todo">À faire</option><option value="done">Terminées</option><option value="overdue">En retard</option></select></div>
    <div id="checklistTasks" class="checklist-tasks"></div><p id="checklistCount" class="checklist-count" role="status"></p>
  </section>`;
  const root = $('#content .checklist-workspace');
  let saving = false;
  const update = () => {
    if (!root.isConnected || !checklistSessionValid(key)) return;
    const done = tasks.filter(task => task.completed).length;
    const overdue = tasks.filter(checklistOverdue).length;
    root.querySelector('#checklistStats').innerHTML = `<div><strong>${tasks.length - done}</strong><span>À faire</span></div><div><strong>${done}</strong><span>Terminées</span></div><div><strong>${overdue}</strong><span>En retard</span></div>`;
    const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    root.querySelector('#checklistProgressLabel').textContent = done + ' / ' + tasks.length + ' terminées';
    root.querySelector('#checklistProgress').value = percent;
    const query = workspaceCatalogText(checklistView.query);
    const visible = tasks.filter(task => (!query || workspaceCatalogText(task.title + ' ' + task.content).includes(query)) && (checklistView.filter === 'todo' ? !task.completed : checklistView.filter === 'done' ? task.completed : checklistView.filter === 'overdue' ? checklistOverdue(task) : true));
    const priority = {high: 0, normal: 1, low: 2};
    visible.sort((a, b) => Number(a.completed) - Number(b.completed) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || priority[a.priority] - priority[b.priority] || (a.createdAt || '').localeCompare(b.createdAt || ''));
    root.querySelector('#checklistTasks').innerHTML = visible.map(task => {
      const overdue = checklistOverdue(task);
      const date = task.dueDate ? new Date(task.dueDate + 'T12:00:00').toLocaleDateString('fr-FR', {day: 'numeric', month: 'short', year: 'numeric'}) : '';
      return `<article class="checklist-task${task.completed ? ' is-complete' : ''}${state.item === task.id ? ' is-selected' : ''}" data-task-id="${esc(task.id)}"><label class="checklist-toggle"><input type="checkbox" data-task-complete="${esc(task.id)}" ${task.completed ? 'checked' : ''} aria-label="${esc('Terminer : ' + task.title)}"><span aria-hidden="true">${PROTOCOL_ICONS.check}</span></label><div class="checklist-task-copy"><h2>${esc(task.title)}</h2>${task.content ? `<p>${esc(task.content)}</p>` : ''}<div class="checklist-task-meta"><span class="checklist-priority" data-priority="${esc(task.priority)}">Priorité ${esc(CHECKLIST_PRIORITIES[task.priority])}</span>${date ? `<time datetime="${esc(task.dueDate)}" class="${overdue ? 'is-overdue' : ''}">${overdue ? 'En retard · ' : ''}${esc(date)}</time>` : ''}</div></div><div class="checklist-task-actions"><button type="button" class="secondary" data-task-edit="${esc(task.id)}" aria-label="${esc('Modifier : ' + task.title)}">Modifier</button><button type="button" class="secondary" data-task-delete="${esc(task.id)}" aria-label="${esc('Supprimer : ' + task.title)}">${PROTOCOL_ICONS.trash}</button></div></article>`;
    }).join('') || (tasks.length ? '<div class="checklist-empty"><h2>Aucune tâche correspondante</h2><p>Essaie un autre filtre ou une autre recherche.</p></div>' : `<div class="checklist-empty"><span class="checklist-empty-icon" aria-hidden="true">${workspaceSectionIcon('checklist')}</span><h2>Une chose après l’autre.</h2><p>Ajoute ta première tâche ou pars d’une checklist de sécurité.</p><button type="button" class="secondary" id="checklistTemplate">Créer une checklist de sécurité</button></div>`);
    root.querySelector('#checklistCount').textContent = visible.length + ' tâche' + (visible.length === 1 ? '' : 's') + (visible.length < tasks.length ? ' sur ' + tasks.length : '');
  };
  const mutate = async action => {
    if (saving || !checklistSessionValid(key) || !root.isConnected) return;
    saving = true;
    root.setAttribute('aria-busy', 'true');
    root.querySelectorAll('button,input[type=checkbox]').forEach(control => { control.disabled = true; });
    try {
      await action();
      tasks = (await activeItems()).filter(item => item.type === 'task');
    } catch (error) {
      if (checklistSessionValid(key)) appNotify(error.message, {kind: 'error'});
    } finally {
      saving = false;
      if (root.isConnected && checklistSessionValid(key)) {
        root.removeAttribute('aria-busy');
        root.querySelectorAll('button').forEach(control => { control.disabled = false; });
        update();
      }
    }
  };
  root.querySelector('#checklistFilter').value = checklistView.filter;
  root.querySelector('#checklistFilter').onchange = event => { checklistView.filter = event.target.value; update(); };
  root.querySelector('#checklistSearch').oninput = event => { checklistView.query = event.target.value; update(); };
  root.querySelector('#checklistAdd').onclick = () => editChecklistTask();
  root.onchange = event => {
    const input = event.target.closest('[data-task-complete]');
    if (!input) return;
    const completed = input.checked;
    mutate(() => updateItemRecord(input.dataset.taskComplete, task => { task.completed = completed; task.updatedAt = now(); }));
  };
  root.onclick = async event => {
    const edit = event.target.closest('[data-task-edit]');
    if (edit) return editChecklistTask(edit.dataset.taskEdit);
    const remove = event.target.closest('[data-task-delete]');
    if (remove) {
      const id = remove.dataset.taskDelete;
      if (await appConfirm('Supprimer définitivement cette tâche ?', {title: 'Supprimer la tâche', confirmLabel: 'Supprimer', danger: true})) await mutate(() => deleteItemRecord(id));
    }
    if (event.target.closest('#checklistTemplate')) await mutate(() => {
      const titles = ['Vérifier la dernière sauvegarde', 'Tester la restauration d’un fichier', 'Vérifier les mises à jour des appareils', 'Activer la double authentification des comptes importants', 'Revoir les accès et comptes inutilisés'];
      const timestamp = now();
      return db.batch(titles.map(title => ({action: 'put', store: 'items', record: {id: uid(), type: 'task', title, content: '', completed: false, priority: 'normal', dueDate: '', tags: [], createdAt: timestamp, updatedAt: timestamp}})));
    });
  };
  update();
  if (state.item) requestAnimationFrame(() => root.querySelector('.is-selected')?.scrollIntoView({block: 'nearest'}));
}

async function editChecklistTask(id = null) {
  const key = state.vaultKey;
  const task = id ? await get('items', id) : null;
  if (!checklistSessionValid(key) || (id && (!task || task.type !== 'task' || isDeleted(task)))) return;
  modal(task ? 'Modifier la tâche' : 'Ajouter une tâche', `<form id="checklistForm" class="checklist-form"><label>Tâche<input id="taskTitle" maxlength="300" required value="${esc(task?.title || '')}" placeholder="Que veux-tu faire ?"></label><label>Notes<textarea id="taskNotes" maxlength="10000" rows="4" placeholder="Détails, étapes ou informations utiles…">${esc(task?.content || '')}</textarea></label><div class="checklist-form-fields"><label>Priorité<select id="taskPriority">${Object.entries(CHECKLIST_PRIORITIES).map(([value, label]) => `<option value="${value}" ${task?.priority === value || (!task && value === 'normal') ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Échéance<input id="taskDueDate" type="date" min="0001-01-01" max="9999-12-31" value="${esc(task?.dueDate || '')}"></label></div><p id="taskError" role="alert"></p><div class="checklist-form-actions"><button type="button" class="secondary" id="taskCancel">Annuler</button><button type="submit" class="primary">Enregistrer</button></div></form>`);
  const form = $('#checklistForm');
  const dialog = form.closest('.modal');
  dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
  dialog.querySelector('h2').id = 'taskDialogTitle'; dialog.setAttribute('aria-labelledby', 'taskDialogTitle');
  const close = () => { closeModal(); $('#checklistAdd')?.focus(); };
  form.querySelector('#taskCancel').onclick = close;
  dialog.onkeydown = event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const controls = [...form.querySelectorAll('input,textarea,select,button')].filter(control => !control.disabled);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  form.onsubmit = async event => {
    event.preventDefault();
    if (!checklistSessionValid(key) || !form.isConnected || form.dataset.saving) return;
    const title = form.querySelector('#taskTitle').value.trim();
    if (!title) { form.querySelector('#taskTitle').focus(); return; }
    const values = {title, content: form.querySelector('#taskNotes').value, priority: form.querySelector('#taskPriority').value, dueDate: form.querySelector('#taskDueDate').value, updatedAt: now()};
    form.dataset.saving = 'true';
    form.querySelectorAll('button').forEach(button => { button.disabled = true; });
    try {
      if (task) await updateItemRecord(task.id, record => Object.assign(record, values));
      else await put('items', {...values, id: uid(), type: 'task', completed: false, tags: [], createdAt: now()});
      if (!checklistSessionValid(key) || !form.isConnected) return;
      closeModal(); resetChecklistView(); state.item = null;
      await renderChecklistWorkspace(); $('#checklistAdd')?.focus();
    } catch (error) {
      if (form.isConnected) form.querySelector('#taskError').textContent = error.message;
    } finally {
      delete form.dataset.saving;
      form.querySelectorAll('button').forEach(button => { button.disabled = false; });
    }
  };
  form.querySelector('#taskTitle').focus();
}
