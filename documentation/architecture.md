# Architecture et points d’entrée

## Circulation des données

Le navigateur charge le site GitHub Pages, vérifie le lien privé auprès de l’API, puis déverrouille le compte avec le code personnel et la MFA requise. L’API contrôle les permissions et échange les espaces chiffrés avec D1/R2. Les agents associés exécutent les opérations autorisées sur leurs postes et remontent leurs résultats à l’API.

L’IA de développement Continue/Ollama est installée dans VS Code. Elle est distincte des anciens endpoints IA présents pour compatibilité dans l’application.

## Où modifier

| Changement | Sources principales |
| --- | --- |
| Navigation, listes, éditeur et paramètres | `app/index.html`, `app/js/views/`, `app/js/ui/`, `app/css/` |
| Interface web et liaison avec l’API | `browser/adapter.js`, `browser/cloud.js` |
| Chiffrement et stockage du navigateur | `browser/crypto.js`, `browser/storage.js`, `browser/shared-workspace.js` |
| Reprise après rafraîchissement | `browser/tab-session.js` |
| Connexion et sessions côté serveur | `server/lib/wolfguard/core.mjs`, `session-policy.mjs`, `users.mjs` |
| TOTP et remplacement de téléphone | `server/lib/wolfguard/otp.mjs` et `browser/adapter.js` |
| Permissions communes | `server/lib/wolfguard/permissions.mjs` |
| Filtrage des espaces et coffres personnels | `workspace-access.mjs`, `personal-vault.mjs`, `permission-store.mjs` dans `server/lib/wolfguard/` |
| Protection des clés partagées | `server/lib/wolfguard/workspace-key.mjs` |
| Association et autorisations des postes | `server/lib/wolfguard/agents.mjs`, `agent-access.mjs` |
| Scans et réseau | `agent/network.mjs`, `agent/topology.mjs`, `agent/collect.ps1`, vues `app/js/views/scan-*` |
| EDR | `agent/endpoint*`, `agent/protect.ps1`, `server/lib/wolfguard/endpoints.mjs` |
| Antivirus WolfGuard | `agent/antivirus*`, `server/lib/wolfguard/antivirus-spec.mjs`, `app/js/views/edr.js` ; voir [couverture et limites](antivirus.md) |
| Bureau, terminal et fichiers | modules `remote*`, `terminal*`, `files*` dans `agent/` et `server/lib/wolfguard/` |
| Avis CERT-FR | `server/lib/wolfguard/certfr.mjs` et vues de rapports |
| Mise à jour d’un agent | `agent/update-command.mjs`, `agent/auto-update.mjs`, `app/js/agent-updates.js` |
| Compilation et publication statique | `scripts/build-web.mjs`, `scripts/package-agent.py`, `scripts/check-publication.mjs` |

Les noms de modules de la colonne serveur sont relatifs à `server/lib/wolfguard/` lorsqu’ils ne donnent pas de chemin complet. Vérifier les fichiers présents avec `rg --files` avant d’ouvrir un module.

## Sources et fichiers générés

`scripts/build-web.mjs` copie l’interface dans `docs/`, produit les bundles navigateur, les empreintes SRI et la porte d’entrée chiffrée. Il copie le modèle de permissions du serveur vers `browser/permissions.js`. Modifier d’abord le modèle serveur, puis reconstruire.

Les archives et exécutables publiés dans `app/downloads/` et `docs/downloads/` proviennent du packaging. Ne pas les remplacer manuellement avec une version de test.

`server/` dispose de son propre `package.json`, de son lockfile et de sa chaîne de compilation Worker/Vinext. Le dépôt GitHub et l’hébergement API sont deux publications différentes.

## Arborescence conservée

Les dossiers de code n’ont pas été renommés : le build, les imports, le packaging et les tests utilisent leurs chemins actuels. La réorganisation rassemble les documents dans `documentation/`, donne des points d’entrée courts et écarte les sorties générées du contexte automatique de Continue.
