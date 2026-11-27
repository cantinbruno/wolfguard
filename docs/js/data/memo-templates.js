'use strict';

// A "Modèles" folder with ready-to-fill memo templates. Duplicating one creates
// a normal memo outside the folder. Added once; whatever the user deletes or
// edits afterwards is never restored or overwritten.
const MEMO_TEMPLATES_VERSION = 1;
const MEMO_TEMPLATES_SETTING = 'memo-templates-version';
const MEMO_TEMPLATES_FOLDER = 'memo-templates';

const MEMO_TEMPLATES = [
  {
    id: 'procedure', title: 'Modèle — Procédure', copyTitle: 'Nouvelle procédure', description: 'Étapes, vérification et retour arrière.',
    content: '<h2>Objectif</h2><p>Ce que cette procédure permet de faire, en une phrase.</p>'
      + '<h2>Prérequis</h2><ul><li>Accès ou droits nécessaires</li><li>Outils et documents</li></ul>'
      + '<h2>Étapes</h2><ol><li>Première action</li><li>Deuxième action</li><li>Troisième action</li></ol>'
      + '<h2>Vérification</h2><p>Comment confirmer que le résultat est correct.</p>'
      + '<h2>Retour arrière</h2><p>Comment annuler si quelque chose se passe mal.</p>'
      + '<h2>Contacts</h2><p>Qui prévenir en cas de blocage.</p>'
  },
  {
    id: 'incident', title: 'Modèle — Compte rendu d’incident', copyTitle: 'Incident du jour', description: 'Chronologie, impact, cause et actions.',
    content: '<h2>Résumé</h2><p>Ce qui s’est passé, en deux phrases.</p>'
      + '<h2>Chronologie</h2><table><thead><tr><th>Heure</th><th>Événement</th></tr></thead><tbody><tr><td>00:00</td><td>Détection</td></tr><tr><td>00:00</td><td>Première action</td></tr><tr><td>00:00</td><td>Retour à la normale</td></tr></tbody></table>'
      + '<h2>Impact</h2><p>Services, postes ou personnes touchés, et durée.</p>'
      + '<h2>Cause</h2><p>Cause identifiée ou hypothèses restantes.</p>'
      + '<h2>Résolution</h2><p>Ce qui a été fait pour rétablir le service.</p>'
      + '<h2>Actions préventives</h2><ul><li>Action 1 — responsable — échéance</li></ul>'
  },
  {
    id: 'poste', title: 'Modèle — Mise en service d’un poste', copyTitle: 'Mise en service d’un poste', description: 'Liste de contrôle d’installation d’un poste.',
    content: '<h2>Poste</h2><p>Nom, utilisateur, date.</p>'
      + '<h2>Système</h2><ul><li>☐ Système installé et à jour</li><li>☐ Nom du poste conforme</li><li>☐ Disque chiffré</li></ul>'
      + '<h2>Sécurité</h2><ul><li>☐ Agent WolfGuard installé et associé</li><li>☐ Antivirus actif</li><li>☐ Pare-feu activé</li><li>☐ Compte administrateur local sécurisé</li></ul>'
      + '<h2>Logiciels et accès</h2><ul><li>☐ Logiciels métier installés</li><li>☐ Imprimantes et partages</li><li>☐ Messagerie configurée</li></ul>'
      + '<h2>Remise</h2><ul><li>☐ Documentation remise à l’utilisateur</li><li>☐ Fiche équipement mise à jour</li></ul>'
  },
  {
    id: 'reunion', title: 'Modèle — Compte rendu de réunion', copyTitle: 'Compte rendu de réunion', description: 'Participants, décisions et actions.',
    content: '<h2>Réunion</h2><p>Sujet, date, lieu ou lien.</p>'
      + '<h2>Participants</h2><ul><li>Nom — rôle</li></ul>'
      + '<h2>Ordre du jour</h2><ol><li>Point 1</li><li>Point 2</li></ol>'
      + '<h2>Décisions</h2><ul><li>Décision prise</li></ul>'
      + '<h2>Actions</h2><table><thead><tr><th>Qui</th><th>Quoi</th><th>Pour quand</th></tr></thead><tbody><tr><td></td><td></td><td></td></tr></tbody></table>'
  },
  {
    id: 'equipement', title: 'Modèle — Fiche équipement ou serveur', copyTitle: 'Fiche équipement', description: 'Identité, réseau, sauvegarde et maintenance.',
    content: '<h2>Identité</h2><table><tbody><tr><th>Nom</th><td></td></tr><tr><th>Rôle</th><td></td></tr><tr><th>Marque et modèle</th><td></td></tr><tr><th>Numéro de série</th><td></td></tr><tr><th>Emplacement</th><td></td></tr></tbody></table>'
      + '<h2>Réseau</h2><p>Adresse IP, VLAN, nom DNS, ports ouverts.</p>'
      + '<h2>Accès</h2><p>Comment s’y connecter. Les mots de passe se trouvent dans le Coffre-fort, jamais ici.</p>'
      + '<h2>Sauvegarde</h2><p>Quoi, quand, où, et dernière restauration testée.</p>'
      + '<h2>Maintenance</h2><p>Garantie, dernières mises à jour, prochaine intervention.</p>'
  },
  {
    id: 'changement', title: 'Modèle — Demande de changement', copyTitle: 'Demande de changement', description: 'Justification, risques, tests et retour arrière.',
    content: '<h2>Description</h2><p>Le changement demandé.</p>'
      + '<h2>Justification</h2><p>Pourquoi il est nécessaire.</p>'
      + '<h2>Risques</h2><ul><li>Risque — probabilité — mesure</li></ul>'
      + '<h2>Plan de test</h2><ol><li>Test avant</li><li>Test après</li></ol>'
      + '<h2>Retour arrière</h2><p>Comment revenir à l’état précédent.</p>'
      + '<h2>Validation</h2><p>Qui valide et à quelle date.</p>'
  }
];

function buildMemoTemplates(snapshot, stamp = new Date().toISOString()) {
  const {items = [], folders = [], settings = []} = snapshot;
  if (Number(settings.find(row => row.key === MEMO_TEMPLATES_SETTING)?.value) >= MEMO_TEMPLATES_VERSION) return {operations: []};
  const operations = [];
  const folder = folders.find(row => row.id === MEMO_TEMPLATES_FOLDER);
  // A folder the user deleted is not brought back.
  if (!folder) operations.push({action: 'put', store: 'folders', record: {id: MEMO_TEMPLATES_FOLDER, name: 'Modèles', section: 'library', parentId: null, createdAt: stamp, updatedAt: stamp}});
  if (!folder || (!folder.deletedAt && !folder.deleted)) {
    const taken = new Set(items.map(row => row.id));
    for (const template of MEMO_TEMPLATES) {
      const id = 'memo-template-' + template.id;
      if (taken.has(id) || items.some(row => row.memoTemplateId === template.id)) continue;
      operations.push({action: 'put', store: 'items', record: {
        id, type: 'memo', originalType: 'memo', documentType: 'memo', unifiedDocument: true, unifiedDocumentVersion: 2,
        title: template.title, description: template.description, folderId: MEMO_TEMPLATES_FOLDER, content: template.content,
        tags: ['Modèle'], facets: libraryFacets(), favorite: false, attachments: [], commandBlocks: [], createdAt: stamp, updatedAt: stamp,
        memoTemplateId: template.id, memoTemplateTitle: template.copyTitle, memoTemplateVersion: MEMO_TEMPLATES_VERSION
      }});
    }
  }
  operations.push({action: 'put', store: 'settings', record: {key: MEMO_TEMPLATES_SETTING, value: MEMO_TEMPLATES_VERSION}});
  return {operations};
}
