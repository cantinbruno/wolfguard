# Reprise de la migration d’hébergement

## Demande et état réel

La migration de l’API hors de Sites a été demandée le 28 novembre 2026. Le but est de pouvoir modifier et publier le serveur avec des outils de déploiement standards. Cette demande autorise la préparation et la migration ; il n’est pas nécessaire de redemander l’autorisation de principe.

Contraintes confirmées : aucun service payant et aucun nouveau compte d’hébergement. Aucun serveur de destination n’a été fourni. L’utilisation de ce PC comme serveur permanent n’a pas été confirmée. La disponibilité lorsque le PC est éteint reste à préciser si cette piste est retenue. Ne pas présenter une destination comme choisie, une sauvegarde comme effectuée ou la migration comme terminée.

L’application en ligne utilise toujours son hébergement actuel. Une piste de Worker Cloudflare avec stockage D1 seul a été essayée localement puis retirée après le refus de créer un compte. Il n’en reste pas d’implémentation à déployer. Aucun changement de DNS, d’URL d’API, de secret ou de données de production n’a été effectué pendant cette préparation.

## Sources et points d’entrée

Lire [Reprise](reprise.md), [Décisions](decisions.md), [Architecture](architecture.md), [Serveur](serveur.md), [Sécurité](securite.md), [Développement](developpement.md) et [Publication](publication.md).

| Élément | Emplacement ou valeur publique |
| --- | --- |
| Frontend actuel | `https://wolfguard.wavetools.fr/`, GitHub Pages |
| API actuelle | `https://wolfguard-web-cantin.cantin-bruno.chatgpt.site` |
| Identité du projet et bindings | `server/.openai/hosting.json` ; `DB` pour D1, `BUCKET` pour R2 |
| Gestionnaire d’API réutilisable | `server/lib/wolfguard/core.mjs`, export `handleAPI(request, env)` |
| Entrée actuelle de l’API | `server/app/api/[...segments]/route.ts` |
| Enveloppe d’hébergement actuelle | `server/worker/index.ts`, `server/vite.config.ts` |
| Schéma et migrations locales | `server/db/schema.ts`, `server/drizzle/` |
| Exemples d’adaptateurs SQLite et stockage pour les tests | `tests/server.test.mjs` ; ces doublures en mémoire ne sont pas un serveur persistant |
| Configuration privée locale | Chemins calculés par `scripts/private-paths.mjs` |

Le projet frontend et le dépôt source du serveur Sites ont des historiques Git distincts. Comparer les sources avant de porter les changements : leurs SHA ne désignent pas automatiquement les mêmes contenus. Un push GitHub ne déploie pas l’API Sites.

## État local transmis

Depuis la racine :

```powershell
node scripts/migration-inventory.mjs --output .cache/migration-handoff/inventory.json
```

Cette commande utilise une base temporaire en mémoire pour calculer les noms de tables attendus par les migrations locales. Elle ne lit ni secrets, ni profils de connexion, ni données de production. Le rapport reste dans `.cache/`, ignoré par Git. Il indique les fichiers de configuration privée présents sans ouvrir leur contenu, les références à l’ancienne URL et l’écart entre schéma local et inventaire distant lorsqu’un relevé de plateforme est disponible.

Le relevé `.cache/migration-handoff/sites-metadata.json`, lorsqu’il est présent, contient uniquement des métadonnées vérifiées de plateforme : projet, dernier déploiement contrôlé, noms des tables, noms des variables et disponibilité de leurs valeurs, emplacement de la copie séparée du source. Il n’accorde aucun droit d’accès et ne contient aucune valeur secrète. Sa date fait foi ; ce n’est pas une observation en temps réel.

Le fichier local `.cache/migration-handoff/runtime-public-settings.json` conserve séparément les valeurs des réglages que la plateforme a explicitement déclarés non secrets. Il ne contient pas les clés du serveur et reste exclu de la publication.

Le contrôle du 28 novembre a trouvé en production des tables historiques, notamment `duo_config`, `duo_requests`, `push_devices` et `push_requests`, alors que les sources locales prévoient leur retrait. Vérifier aussi les tables ajoutées localement. Ne pas rejouer aveuglément toutes les migrations locales sur la base existante. L’inventaire de tables n’est pas une sauvegarde SQL.

## Accès et secrets à préserver

L’accès Sites est fourni par la connexion de plateforme de la session qui dispose du plugin. Il n’est pas transmis par les fichiers de ce dépôt. Aucune clé SSH ni clé de déploiement Sites réutilisable n’a été récupérée. Un identifiant de projet, une URL ou un jeton d’agent n’est pas un accès administrateur à l’hébergeur.

Les outils de gestion Sites ont confirmé la présence des secrets suivants mais en ont masqué les valeurs. Leur transfert effectif reste à résoudre avant une restauration fonctionnelle.

| Nom | Rôle à conserver |
| --- | --- |
| `AUTH_PEPPER` | Vérification des codes, empreintes et données liées à l’authentification |
| `STORAGE_KEY` | Lecture des données chiffrées du serveur, dont les objets |
| `WORKSPACE_KEY_ENCRYPTION_KEY` | Lecture de l’enveloppe de la clé partagée |
| `ENTRY_LINK_HASH` | Vérification du lien privé existant |
| `BOOTSTRAP_HASH` | Configuration historique d’initialisation ; ne pas réinitialiser l’espace |

Des variables MFA et des clés historiques de notification existent aussi ; conserver leur inventaire et vérifier leur usage dans le source réellement en production avant de les retirer. Le fichier privé `site-access.json` contient la clé du lien frontend, pas les trois secrets de chiffrement et d’authentification du serveur. Sa présence ne prouve pas que les secrets du serveur sont sauvegardés localement.

Pour la migration demandée, les données et secrets nécessaires doivent être transférés directement entre stockages privés ou via une sauvegarde chiffrée. Ne jamais les afficher dans un terminal, une conversation, un rapport public ou Git. Ne pas générer de nouvelles clés pour remplacer des clés manquantes : cela ne permettrait pas de relire les données existantes. Une valeur masquée par l’hébergeur doit être récupérée par un mécanisme autorisé ; il n’existe pas de fichier d’export complet fourni par cette reprise.

## Données à transférer et validation de restauration

Conserver la totalité de la base réelle : comptes, codes et MFA, droits et groupes, espaces et coffres personnels, agents associés, tâches, journaux et autres tables applicatives, avec leurs colonnes, contraintes et index. Conserver tous les objets du stockage avec leurs clés exactes, octets et métadonnées personnalisées. Les chemins `snapshots/…`, `remote/…` et `security/…` sont documentés ; un inventaire réel de tous les objets reste nécessaire.

Les snapshots sont chiffrés par blocs de 64 Kio avec des métadonnées `format`, `nonce` et `size`. Une copie des seuls octets, sans métadonnées et sans clés d’origine, ne suffit pas. L’export de fiches de l’interface utilisateur est un transfert de contenu ; il ne sauvegarde pas les comptes, la MFA, les droits, les associations des postes ou l’ensemble de la base.

L’aperçu de base proposé par Sites ne fournit que des pages de lignes avec des limites et une projection éventuellement tronquée. Il ne constitue pas un outil de sauvegarde intégrale. Les outils actuellement identifiés ne fournissent pas non plus d’export complet R2. Il faudra obtenir des exports supportés ou préparer un mécanisme temporaire, authentifié, chiffré et révocable, dans le source du serveur existant. Aucune route d’export des secrets ou des données n’a été ajoutée par cette reprise.

Préparer la destination et une sauvegarde restaurable avant toute interruption. Organiser une période sans écriture pour la copie finale, comparer les données et objets source/cible, puis tester la restauration et le déchiffrement avant de basculer. Conserver le service existant et un retour arrière jusqu’à validation ; éviter deux bases indépendantes acceptant simultanément des modifications après la bascule.

## Changement d’adresse et postes installés

L’URL actuelle apparaît dans `browser/cloud.js`, `browser/private-entry.js`, `browser/private-entry.html`, `scripts/build-web.mjs` et `agent/agent.mjs`. Le rapport d’inventaire donne les lignes trouvées. Rechercher les autres références avec `rg` avant modification, y compris les politiques CSP et les tests.

Le navigateur, l’entrée privée et la politique `connect-src` doivent accepter la nouvelle API. Préserver le domaine frontend et le lien privé existants.

Les agents sont épinglés à l’origine actuelle. Dans `agent/agent.mjs`, `AgentClient` contrôle l’origine et les identifiants enregistrés comportent un champ `api` qui doit correspondre à cette origine. Remplacer seulement la constante `API` ferait refuser les associations déjà enregistrées. Préparer explicitement la transition de ces identifiants et la distribution de la mise à jour ; ne pas contourner l’authentification des agents ni leur imposer une réassociation sans nécessité démontrée. Les agents refusent aussi les redirections HTTP (`redirect: 'error'`) : une redirection de l’ancien serveur ne suffit pas.

Un hébergement différent doit restituer une IP client fiable. Le contrôle actuel utilise `CF-Connecting-IP`. Sur un serveur directement exposé, ne jamais faire confiance à cet en-tête envoyé par un client ; définir les proxys de confiance ou utiliser l’adresse de connexion avant de conserver les limites par IP.

## Contrôles et publication

Utiliser des données synthétiques. Les premiers contrôles ciblés sont :

```powershell
node --test tests/server.test.mjs tests/users.test.mjs tests/access.test.mjs tests/shared-workspace.test.mjs
node --test tests/agent.test.mjs tests/agent-update.test.mjs tests/agent-posix.test.mjs
node scripts/check-publication.mjs
git diff --check
```

Ajouter des tests de persistance, restauration, concurrence et refus d’accès adaptés à la destination réellement retenue. Pour les modifications frontend ou agents distribués, reconstruire avec `npm run build` et suivre les contrôles complémentaires de [Développement](developpement.md). Pour le serveur actuel, utiliser ses tests et sa compilation décrits dans [Serveur](serveur.md).

Suivre le commit sélectif et le push de [Publication](publication.md). Préserver le travail déjà présent, notamment les fichiers non suivis sans rapport avec cette tâche. Une compilation locale, une sauvegarde Git ou un test avec une base temporaire ne prouve pas qu’une migration de production est réussie.
