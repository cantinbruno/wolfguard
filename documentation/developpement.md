# Développement et vérifications

Exécuter les commandes depuis la racine du dépôt, sauf mention contraire. Le projet web utilise Node.js et les tests navigateur utilisent Python.

## Préparer

```powershell
node --version
python --version
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
```

Le frontend n’a pas de dépendances npm à installer à la racine. Le serveur a son lockfile : utiliser `npm ci` dans `server/` seulement si cette chaîne de compilation est nécessaire. Réutiliser une installation valide plutôt que dupliquer les dépendances dans plusieurs checkouts.

## Frontend

```powershell
npm run build
npm run preview
```

La prévisualisation écoute sur `http://127.0.0.1:4173`. Le build exige le fichier privé de lien déjà existant. S’il manque, retrouver la configuration privée ; ne pas créer une nouvelle clé pour contourner l’erreur.

Les tests utilisent `.cache/site-document.html` et les sorties de compilation. Reconstruire avant un test navigateur après modification des sources.

## Choisir les tests utiles

| Sujet modifié | Contrôles ciblés |
| --- | --- |
| Documentation, liens et règles IA | Liens Markdown locaux, chemins cités, absence de secrets, `git diff --check` |
| Connexion, MFA | `node --test tests/users.test.mjs tests/cloud.test.mjs` ; tests sans fenêtre `tests/otp_workspace_test.py`, `tests/mandatory_mfa_test.py` |
| Inactivité et rafraîchissement | `node --test tests/users.test.mjs tests/cloud.test.mjs` ; `python tests/session_resume_test.py` |
| Permissions par poste | `node --test tests/permissions.test.mjs tests/access.test.mjs` ; `python tests/security_permissions_test.py` |
| Frontend et navigation Sécurité | `npm run test:agents-console` ; test navigateur de la vue concernée |
| Protection de l’application | `npm run test:security` |
| Agent et mises à jour | `node --test tests/agent.test.mjs tests/agent-update.test.mjs tests/agent-posix.test.mjs` |
| Antivirus intégré et quarantaine | `node --test tests/antivirus.test.mjs tests/antivirus-api.test.mjs tests/endpoint.test.mjs` ; `python tests/antivirus_workspace_test.py` |
| Bureau, terminal et fichiers | `node --test tests/remote.test.mjs tests/terminal.test.mjs tests/files.test.mjs` |
| Publication | `node scripts/check-publication.mjs` ; `node --test tests/publication.test.mjs` |

Vérifier que chaque fichier existe avant de lancer la commande. Les scripts de `package.json` sont la référence pour les commandes du dépôt. Le contrôle de publication vérifie aussi les archives d’agents et peut donc prendre du temps.

`npm test` est la suite étendue. Ne pas la relancer entièrement après un changement de prose si les contrôles adaptés suffisent. Les tests natifs Windows, PowerShell de durée de vie de l’agent et `remote-windows-native.mjs` ne sont pas à lancer sur le bureau de l’utilisateur sans demande explicite.

## Serveur

Dans `server/` : `npm ci`, `node --test tests/security.test.mjs`, `npm run build`. Une modification de schéma exige une migration supplémentaire ; ne pas modifier une migration déjà utilisée en production. Le déploiement est décrit dans [Serveur](serveur.md).

## Fin de tâche

Mettre à jour la documentation, sélectionner les fichiers du changement, vérifier les différences préparées et suivre [Publication](publication.md). Lancer les tests sur des données synthétiques ; ne pas employer les comptes, jetons ou agents personnels pour une vérification.
