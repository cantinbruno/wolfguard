# Reprise de la migration d’hébergement

## Demande et état réel

La migration de l’API hors de Sites a été demandée le 28 novembre 2026. Le but est de pouvoir modifier et publier le serveur avec des outils de déploiement standards. Cette demande autorise la préparation et la migration ; il n’est pas nécessaire de redemander l’autorisation de principe.

Contraintes confirmées : aucun service payant et aucun nouveau compte d’hébergement. Aucun serveur de destination n’a été fourni. L’utilisation de ce PC comme serveur permanent n’a pas été confirmée. La disponibilité lorsque le PC est éteint reste à préciser si cette piste est retenue. Une sauvegarde chiffrée a été réalisée et vérifiée le 28 novembre ; la destination et la bascule restent à traiter.

L’application en ligne utilise toujours son hébergement actuel. Le source local contient une couche de stockage d’objets dans D1 lorsque R2 est absent ; cela ne constitue pas un hébergement de destination. Aucun changement de DNS, d’URL d’API, de secret ou de données de production n’a été effectué pour la sauvegarde. Seule une route d’export temporaire a été publiée, puis retirée ; le source Sites final retrouve exactement le contenu déployé avant l’opération.

## Sources et points d’entrée

Lire [Reprise](reprise.md), [Décisions](decisions.md), [Architecture](architecture.md), [Serveur](serveur.md), [Sécurité](securite.md), [Développement](developpement.md) et [Publication](publication.md).

## Mesures de production du 28 novembre 2026

Le relevé authentifié du Worker donne les tailles suivantes, sans écriture dans D1 ou R2 :

| Élément | Mesure |
| --- | --- |
| Base D1, tables et index compris (`meta.size_after`) | 1 114 112 octets (1,0625 Mio) |
| Tables exportables | 32, dont `__appgarden_migrations` ; 346 lignes, plus la ligne de séquence SQLite (33 tables et 347 lignes restaurées au total) |
| R2, tous préfixes | 1 025 objets ; 3 585 612 920 octets (3,59 Go) |
| `snapshots/` | 1 024 objets ; 3 585 527 254 octets |
| `remote/` | Aucun objet |
| `security/` | 1 objet ; 85 666 octets |
| Plus gros objet | 4 335 048 octets |
| Snapshot courant | `vault.version = 1024` ; 3 479 241 octets ; clé exacte conservée dans `vault.object_key` dans l’archive |

Le registre réel `__appgarden_migrations` confirme les 21 migrations de `0000_brainy_jigsaw.sql` à `0020_stiff_purifiers.sql`. Les migrations locales suivantes ne sont pas appliquées. Le schéma réel est exporté avec les lignes ; la restauration ne repose pas sur la réexécution des migrations locales. `_cf_KV` est une table interne réservée de Cloudflare, inaccessible aux requêtes applicatives ; sa définition est inventoriée séparément, et ses données internes ne font pas partie de la sauvegarde applicative.

La base structurée seule est très en dessous des 500 Mo. En revanche, conserver **tout** R2 dans la couche D1 locale demanderait au minimum 4 780 818 568 octets pour l’encodage base64, avant les tables, index et métadonnées : l’historique complet ne tient pas dans une base gratuite. Aucune ancienne copie de production n’a été supprimée. Le snapshot courant seul est petit, mais choisir une politique de conservation pour la destination reste une décision distincte.

Les limites vérifiées sont [500 Mo par base gratuite](https://developers.cloudflare.com/d1/platform/limits/) et [100 000 lignes écrites par jour](https://developers.cloudflare.com/d1/platform/pricing/). Ce dernier quota compte les insertions, modifications et suppressions, ainsi que les écritures d’index ; il ne s’agit pas d’un nombre de requêtes SQL. Les outils Sites disponibles ne donnent pas les métriques historiques du compte Cloudflare géré par Sites. Le volume quotidien réel n’est donc **pas mesuré**, et la compatibilité avec ce quota n’est pas certifiée par cet inventaire. La taille actuelle et le nombre de lignes ne permettent pas de le déduire.

## Outil de sauvegarde chiffrée

Les outils sont dans `scripts/migration-export/` : module temporaire du Worker, client local et protection Windows. Ils n’ajoutent aucune route à `server/` ni au frontend distribué. Une installation temporaire exige le checkout du Site existant, une clé publique de transfert épinglée et une expiration de deux heures. Les requêtes sont signées en RSA-PSS ; chaque réponse est chiffrée en AES-256-GCM et sa clé est enveloppée en RSA-OAEP. La clé de transfert est indépendante des clés existantes de l’application.

Le propriétaire a choisi une sauvegarde liée à son compte Windows, sans mot de passe. L’archive contient sa clé privée de transfert protégée par **DPAPI CurrentUser** ; elle est autonome, mais son ouverture nécessite ce profil Windows et sa protection DPAPI. Les clés originales du serveur restent exclusivement à l’intérieur du contenu chiffré. Le répertoire de sortie est hors dépôt, limité au propriétaire Windows et à SYSTEM. Les fichiers `.enc` sont ignorés par Git et refusés par le contrôle de publication.

Le client conserve le schéma SQL réel (contraintes, index, vues, triggers et colonnes), les lignes et leurs types SQLite exacts, les noms/valeurs des réglages nécessaires au retour arrière, et chaque objet R2 avec sa clé, ses octets, `customMetadata`, `httpMetadata` et les contrôles disponibles. Les entiers 64 bits, TEXT contenant des octets NUL et BLOB ne passent pas par une conversion JavaScript avec perte. D1 est lu dans un seul `batch` transactionnel ; R2 est copié par plages conditionnées à l’ETag, avec comparaison de l’inventaire et de la version du coffre avant/après la copie.

La vérification lit l’archive en flux, contrôle son SHA-256 et celui du clair reconstitué, restaure D1 en mémoire, vérifie l’intégrité et les références étrangères, déchiffre les champs de comptes contrôlés et tous les snapshots. Aucun fichier en clair n’est créé. Le registre des migrations, le rapport de tailles et le rapport de vérification restent à côté de l’archive. Pour revérifier depuis la racine :

```powershell
node scripts/migration-export/backup.mjs verify 'C:/Users/Cantin/AppData/Local/WolfGuardWeb/migration/export-20261128/sauvegarde-2026-11-28T10-56-56-620Z.enc'
```

La sauvegarde a été vérifiée le **28 novembre à 12 h 06, heure de Paris** : 6 382 662 909 octets chiffrés, 33 tables et 347 lignes restaurées, intégrité et références étrangères valides, 2 champs de comptes et les 1 024 snapshots déchiffrés avec succès. Les cinq secrets requis, la clé historique de notification et les réglages MFA sont conservés. La version du coffre est restée à 1024 pendant la copie et les inventaires R2 avant/après correspondent.

SHA-256 du fichier chiffré : `a7833a37b7800300f6a367276fd35d8e5d114242695ba38cf17ed28bd471beaf`. SHA-256 du flux clair vérifié : `ddddc1f918ecbe2dfb681241f1c9e8559139539874a02c7701a4af196e4824a8`. Les valeurs secrètes ne figurent ni dans les rapports ni dans Git.

La route temporaire a été retirée et le source sans export redéployé avec succès sur le même Site. Le contrôle final confirme `GET /api/status` → 200 et les requêtes d’export, y compris signées, → 404. L’environnement est resté à la révision 10. Le commit source Sites final est `f2212db0eb51c0e6c8a40683d56f37fea796b735` ; son contenu est identique à celui d’avant l’export. Cette sauvegarde est un état à une date donnée : elle ne bascule pas l’application et ne dispense pas d’une copie finale contrôlée lors de la migration.

## Repères du source

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

Les outils de gestion Sites masquent toujours les valeurs des secrets suivants. Leur copie a été obtenue à l’intérieur du Worker, chiffrée pour le destinataire Windows, et vérifiée dans la sauvegarde décrite plus haut. Aucun secret n’a été régénéré.

| Nom | Rôle à conserver |
| --- | --- |
| `AUTH_PEPPER` | Vérification des codes, empreintes et données liées à l’authentification |
| `STORAGE_KEY` | Lecture des données chiffrées du serveur, dont les objets |
| `WORKSPACE_KEY_ENCRYPTION_KEY` | Lecture de l’enveloppe de la clé partagée |
| `ENTRY_LINK_HASH` | Vérification du lien privé existant |
| `BOOTSTRAP_HASH` | Configuration historique d’initialisation ; ne pas réinitialiser l’espace |

Des variables MFA et des clés historiques de notification existent aussi ; conserver leur inventaire et vérifier leur usage dans le source réellement en production avant de les retirer. Le fichier privé `site-access.json` contient la clé du lien frontend, pas les trois secrets de chiffrement et d’authentification du serveur. Sa présence ne prouve pas que les secrets du serveur sont sauvegardés localement.

Pour la migration demandée, les données et secrets nécessaires doivent être transférés directement entre stockages privés ou via la sauvegarde chiffrée. Ne jamais les afficher dans un terminal, une conversation, un rapport public ou Git. Ne pas générer de nouvelles clés pour remplacer des clés manquantes : cela ne permettrait pas de relire les données existantes. Préserver le profil Windows nécessaire à l’ouverture de l’archive DPAPI et les copies privées utiles.

## Données à transférer et validation de restauration

Conserver la totalité de la base réelle : comptes, codes et MFA, droits et groupes, espaces et coffres personnels, agents associés, tâches, journaux et autres tables applicatives, avec leurs colonnes, contraintes et index. Conserver tous les objets du stockage avec leurs clés exactes, octets et métadonnées personnalisées. Les chemins `snapshots/…`, `remote/…` et `security/…` sont documentés ; un inventaire réel de tous les objets reste nécessaire.

Les snapshots sont chiffrés par blocs de 64 Kio avec des métadonnées `format`, `nonce` et `size`. Une copie des seuls octets, sans métadonnées et sans clés d’origine, ne suffit pas. L’export de fiches de l’interface utilisateur est un transfert de contenu ; il ne sauvegarde pas les comptes, la MFA, les droits, les associations des postes ou l’ensemble de la base.

L’aperçu de base proposé par Sites ne fournit que des pages de lignes avec des limites et une projection éventuellement tronquée. Il ne constitue pas un outil de sauvegarde intégrale. Les outils natifs identifiés ne fournissent pas non plus d’export complet R2. La sauvegarde décrite plus haut a utilisé un mécanisme temporaire authentifié, chiffré et révocable dans le source du serveur existant ; cette route a ensuite été retirée.

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

## Destination préparée : Cloudflare Workers + D1 seul

Le propriétaire a choisi un compte Cloudflare gratuit et **D1 sans R2** (R2 exige une carte). Une copie de test complète est en ligne ; la production n’a pas changé.

| Élément | Valeur |
| --- | --- |
| Worker | `wolfguard-api` sur `https://wolfguard-api.wgapi-k4x7q2.workers.dev` (sous-domaine neutre) |
| Base | D1 `wolfguard-db`, région WEUR, liaison `DB`, aucune liaison `BUCKET` |
| Code | `server/standalone/worker.mjs` : seulement `/api/*` via `handleAPI`, le reste répond 404. Modèle de configuration : `server/standalone/wrangler.example.toml` (copier en `wrangler.toml`, ignoré par Git, avec l’identifiant D1) |
| Objets | `server/lib/wolfguard/object-store.mjs` (voir [Serveur](serveur.md)) |

Préparation et restauration, depuis la racine (Windows, même profil que la sauvegarde) :

```powershell
node scripts/migration-restore/restore.mjs prepare <archive.enc> <dossier>   # data.sql + objects.sql, sans secret
cd server/standalone
npx wrangler d1 execute wolfguard-db --remote --yes --file <dossier>/data.sql
# migrations 0021 à 0024 (sans les marqueurs de rupture), puis :
npx wrangler d1 execute wolfguard-db --remote --yes --file <dossier>/objects.sql
npx wrangler deploy
node scripts/migration-restore/restore.mjs secrets <archive.enc> wolfguard-api server/standalone
```

`prepare` n’importe que le snapshot courant (celui de `vault.object_key`) et les caches `security/` : la base fait 1,1 Mo, le snapshot 3,5 Mo, alors que les 1 024 anciennes versions (3,59 Go) ne tiendraient pas dans D1. Les lignes sont réécrites en texte normal quand c’est possible, car D1 refuse une instruction SQL de plus de 100 Ko. La commande `secrets` envoie les cinq secrets et les réglages MFA directement à `wrangler secret bulk` : rien n’est écrit ni affiché.

Contrôles effectués le 28 novembre : intégrité SQLite et clés étrangères valides ; migrations 0021 à 0024 appliquées sur le schéma réel ; snapshot relu depuis D1, identique octet pour octet et déchiffré avec la vraie clé de stockage ; `GET /api/status` → `{"initialized":true}` sur les deux hôtes ; la racine répond 404 ; sans clé d’entrée, `/api/login` répond 404 « Adresse inconnue. ». Non vérifié : connexion avec le code du propriétaire et sa MFA, transition des agents, volume d’écritures quotidien.

**Reste à faire avant de basculer** : une copie finale (les données ont pu changer depuis la sauvegarde de 12 h 06), la transition des agents (identifiants épinglés à l’ancienne origine ; l’ancien serveur refuse toute redirection), puis le changement d’adresse dans `browser/cloud.js`, `browser/private-entry.js`, `scripts/build-web.mjs` (CSP) et `agent/agent.mjs`, avec un retour arrière possible tant que l’ancien hébergement existe.
