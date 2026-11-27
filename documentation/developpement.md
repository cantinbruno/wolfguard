# Développement et vérifications

Exécuter les commandes depuis la racine du dépôt, sauf mention contraire. Le projet web utilise Node.js (version 22.13 ou plus récente, `node:sqlite` est requis par les tests) et les tests navigateur utilisent Python avec Playwright.

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

La prévisualisation écoute sur `http://127.0.0.1:4173`. Le build exige le fichier privé de lien déjà existant (`%LOCALAPPDATA%\WolfGuardWeb\private\site-access.json`, ou le dossier indiqué par `WOLFGUARD_PRIVATE_DIR`). S’il manque, retrouver la configuration privée ; ne pas créer une nouvelle clé pour contourner l’erreur.

Les tests utilisent `.cache/site-document.html` et les sorties de compilation. Reconstruire avant un test navigateur après modification des sources.

## Suites de tests

Les listes de tests sont définies une seule fois dans `scripts/run-tests.mjs` ; les scripts npm l’appellent (`node scripts/run-tests.mjs --list` affiche les suites). Les étapes s’exécutent dans l’ordre et s’arrêtent au premier échec.

| Commande | Contenu | Durée indicative |
| --- | --- | --- |
| `npm run test:node` | Tous les tests Node (sauf `agent-signing`, à lancer seul) : API sur D1 en mémoire, agents, permissions, publication | ~10 s |
| `npm run test:ci` | Ce que lance GitHub Actions : publication, tous les tests Node, signature, tests navigateur clés | quelques minutes |
| `npm run test:security` | Contrôle de publication et tests de sécurité Node | ~10 s |
| `npm run test:report` | Rapports, groupes, antivirus, outils distants, tests navigateur associés | quelques minutes |
| `npm test` | Suite étendue Node puis Python | longue |
| `node --test tests/security.test.mjs` dans `server/` | Contrôles propres au Worker | ~1 s |

Pour ajouter un test à une suite, modifier uniquement `scripts/run-tests.mjs`. Un nouveau fichier `tests/*.test.mjs` est inclus automatiquement dans `test:node` et `test:ci`.

Seuls les tests importants sont conservés (sécurité, connexion, droits, coffre, agents, publication) ; les tests d’apparence et d’animation ont été supprimés le 27 novembre 2026. Les tests Python lancent Chromium **sans fenêtre** (`p.chromium.launch()`, mode headless par défaut) avec des profils temporaires et des comptes synthétiques.

## Choisir les tests utiles

| Sujet modifié | Contrôles ciblés |
| --- | --- |
| Documentation, liens et règles de reprise | Liens Markdown locaux, chemins cités, absence de secrets, `git diff --check` |
| Connexion, MFA | `node --test tests/users.test.mjs tests/cloud.test.mjs` ; tests sans fenêtre `tests/otp_workspace_test.py`, `tests/mandatory_mfa_test.py` |
| Inactivité et rafraîchissement | `node --test tests/users.test.mjs tests/cloud.test.mjs` ; `python tests/session_resume_test.py` |
| Blocage d’IP et réputation | `node --test tests/threat-list.test.mjs tests/access.test.mjs` ; `python tests/access_workspace_test.py` |
| Permissions par poste | `node --test tests/permissions.test.mjs tests/access.test.mjs` ; `python tests/security_permissions_test.py` |
| Frontend et navigation Sécurité | `python tests/security_navigation_test.py` et `python tests/agents_console_test.py` |
| Sécurité et chiffrement | `npm run test:security` ; `python tests/security_test.py` |
| Agent et mises à jour | `node --test tests/agent.test.mjs tests/agent-update.test.mjs tests/agent-posix.test.mjs` |
| Antivirus intégré et quarantaine | `node --test tests/antivirus.test.mjs tests/antivirus-api.test.mjs tests/endpoint.test.mjs` ; `python tests/antivirus_workspace_test.py` |
| Bureau, terminal et fichiers | `node --test tests/remote.test.mjs tests/terminal.test.mjs tests/files.test.mjs tests/hardening.test.mjs` |
| Publication | `node scripts/check-publication.mjs` ; `node --test tests/publication.test.mjs` |

Vérifier que chaque fichier existe avant de lancer la commande. Les scripts de `package.json` sont la référence pour les commandes du dépôt. Le contrôle de publication vérifie aussi les archives d’agents et peut donc prendre du temps.

`npm test` est la suite étendue. Ne pas la relancer entièrement après un changement de prose si les contrôles adaptés suffisent. Les tests natifs Windows, PowerShell de durée de vie de l’agent et `remote-windows-native.mjs` ne sont pas à lancer sur le bureau de l’utilisateur sans demande explicite.

## Écrire un test

- Un agent de test déclare les capacités qu’il simule lors de son premier `agent/poll`. Une session Bureau, Terminal ou Fichiers exige `remote-consent-v1` puis l’accord explicite `POST /api/agent/remote/consent` avec `status:'accepted'` avant tout échange (voir `remote()` dans `tests/hardening.test.mjs`).
- Les tests navigateur démarrent l’API de test avec `node_executable()` (`tests/node_runtime.py`) : le runtime privé de l’agent s’il existe, sinon le Node du `PATH`.
- Comparer les chemins Windows sous leur forme canonique (`fs.realpath`) : l’agent renvoie la lettre de lecteur dans sa casse réelle (`C:`), alors que le terminal de VS Code peut démarrer en `c:`.
- `tests/publication.test.mjs` modifie temporairement `app/downloads/WolfGuard-Agent-Windows.exe` pour vérifier le refus. Ne pas l’exécuter en parallèle de `tests/agent-signing.test.mjs`, qui contrôle que ces fichiers restent inchangés ; lancer ce dernier seul.
- Dans un test Playwright qui intercepte l’API avec `context.route`, appeler `context.unroute_all(behavior='wait')` avant `context.close()` pour laisser finir les requêtes en cours.

## Tests à remettre à jour

`tests/scan_workspace_test.py` et `tests/agent_workspace_test.py` attendent encore l’ancien affichage des rapports de scan (`#wgScanMetrics`, `#wgScanReportStamp`), retiré par la décision du 26 novembre 2026 (rapports en PDF dans la fiche du poste). Ils échouaient déjà avant les changements du 27 novembre et sont sortis des suites ; leurs fonctions utilitaires restent utilisées par d’autres tests.

## Serveur

Dans `server/` : `npm ci`, `node --test tests/security.test.mjs`, `npm run lint` (aucun avertissement toléré), `npm run build`. Le code de `server/lib/wolfguard/` est mis en forme par Prettier (`npm run format`, réglages dans `server/.prettierrc.json`) : le relancer après une modification. Une modification de schéma exige une migration supplémentaire ; ne pas modifier une migration déjà utilisée en production. Le déploiement est décrit dans [Serveur](serveur.md).

## Fin de tâche

Mettre à jour la documentation, sélectionner les fichiers du changement, vérifier les différences préparées et suivre [Publication](publication.md). Lancer les tests sur des données synthétiques ; ne pas employer les comptes, jetons ou agents personnels pour une vérification.
