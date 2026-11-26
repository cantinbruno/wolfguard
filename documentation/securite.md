# Sécurité de l’application

Référence de maintenance, à vérifier dans les sources et les tests lors d’un changement. Le dernier contrôle des dépendances date du 26 novembre 2026 (voir [Revue du 26 novembre 2026](#revue-du-26-novembre-2026)) ; il ne décrit pas les alertes npm ultérieures.

## Connexion et sessions

L’ouverture du frontend exige le lien privé. La clé de ce lien n’est pas publiée et le serveur n’en conserve qu’une empreinte pour `POST /api/entry`. Cette étape ne délivre pas une session de données. Le code personnel comporte huit chiffres ; la MFA protège ensuite les comptes qui l’exigent.

Le serveur vérifie le code avec un sel, un secret indépendant et PBKDF2-SHA-256. Les échecs imposent un délai partagé croissant et un bail empêche de vérifier en parallèle pour le contourner. Les sessions sont des jetons aléatoires de 256 bits dont l’empreinte est stockée en base.

L’expiration est **4 heures après la dernière activité réelle**, sans plafond absolu de durée. Le navigateur suit l’horloge civile et monotone. Le serveur renouvelle l’échéance via `POST /api/touch` avec un âge d’activité valide ; le polling seul ne renouvelle pas. Un jeton expiré ne se réactive pas. Le verrouillage, la révocation, les changements de code ou de droits restent applicables. Sources : `browser/adapter.js`, `browser/tab-session.js`, `server/lib/wolfguard/core.mjs`, `session-policy.mjs`.

Une erreur réseau, un délai dépassé ou une indisponibilité temporaire pendant `POST /api/touch` conserve la session et déclenche une nouvelle tentative automatique. L’activité non confirmée est renvoyée avec son âge réel. Une réponse qui refuse la session verrouille toujours l’application ; le délai local d’inactivité continue de s’appliquer pendant la coupure. Régression : `tests/session_resume_test.py`.

Le serveur valide la durée maximale d’une session par rapport à son activité enregistrée, et non au début de la requête en cours. Un renouvellement concurrent ne doit pas faire refuser une lecture déjà commencée ni remplacer son jeton lors d’une connexion simultanée. Les horodatages restent croissants. Régressions : `tests/server.test.mjs` et `tests/users.test.mjs`.

## MFA et changement de téléphone

TOTP utilise six chiffres et des périodes de 30 secondes, avec consommation atomique des compteurs. Les secrets et états en attente sont chiffrés. Les codes de secours sont à usage unique ; ils ne sont pas des sauvegardes des données.

Le remplacement Authenticator exige le code personnel et l’ancien OTP ou un code de secours. Le nouvel enrôlement est temporaire ; l’ancien facteur reste actif jusqu’à confirmation du nouveau. La confirmation remplace le secret, renouvelle les codes de secours et invalide les anciennes sessions. Une annulation ou expiration laisse l’ancien facteur actif. Source : `server/lib/wolfguard/otp.mjs`.

Le parcours web courant utilise Authenticator ; la présence de modules historiques Web Push ne signifie pas qu’une seconde validation push est requise dans l’interface.

Dans Mon compte, un seul bloc « Double authentification » réunit le statut MFA, une phrase sur le code à six chiffres, le bouton « Changer de téléphone » et le rappel des codes de secours. Les étapes et titres répétés sont retirés de la vue courante. Un espace au-dessus et au-dessous de l’encadré le sépare des traits et des sections voisines. Les formulaires de configuration, de vérification et de remplacement restent accessibles dans ce bloc, avec les mêmes contrôles et confirmations.

## Données et clés

L’espace enregistré dans le navigateur est chiffré avec AES-256-GCM ; la dérivation client emploie PBKDF2-HMAC-SHA-256 à 600 000 itérations. Les clés Web Crypto sont non extractibles. La reprise d’un rafraîchissement conserve temporairement une clé non extractible et le jeton du même onglet ; elle ne conserve pas le code personnel.

Le stockage serveur ajoute son chiffrement aux objets R2. La clé partagée est enveloppée séparément avec `WORKSPACE_KEY_ENCRYPTION_KEY`, qui doit être distincte de `STORAGE_KEY` et `AUTH_PEPPER`. Cela réduit les conséquences d’un vol de la base ; **le serveur peut toujours déchiffrer et filtrer les espaces partagés**. Le fonctionnement n’est pas à connaissance nulle ni inaccessible à un hébergeur compromis.

Les coffres personnels et le filtrage des documents restent contrôlés côté serveur. Voir [Droits](droits.md). Données permet un transfert de fiches chiffré par AES-GCM/PBKDF2 avec un code de transfert distinct de huit chiffres. Seules les fiches exportables sont incluses ; le coffre exige aussi la lecture des secrets. L’import crée de nouveaux identifiants et rechiffre les secrets pour l’espace courant, sans importer comptes, paramètres, droits ou journaux. Les permissions sont vérifiées sur la mutation complète. Préserver les anciens fichiers et copies techniques nécessaires à la récupération.

## Frontières à conserver

- CSP, empreintes SRI, nettoyage des contenus riches et absence de CDN dans l’application.
- Validation des JSON : taille, profondeur, UTF-8 et types ; contrôle des modes et autorisations sur chaque API sensible.
- API sans cache, restrictions d’intégration, HSTS en HTTPS et origines CORS autorisées.
- Agent : association, authentification et droits effectifs du poste ; cloisonnement des modes bureau/terminal/fichiers.
- Publication : exclusion des données, secrets, profils personnels, fichiers privés et liens symboliques.
- SHA-256 contrôle les fichiers livrés mais ne remplace pas Authenticode. Voir [Signature Windows](agents/signature-windows.md).

Le code à huit chiffres reste une limite face à des essais hors ligne sur d’anciens fichiers chiffrés uniquement avec ce code. La MFA protège la connexion au serveur, pas ces fichiers. Une session ouverte ou un serveur compromis reste une frontière importante.

## Vérification

WolfGuard intègre ClamAV sur Windows x64 : moteur épinglé et contrôlé par SHA-256, signatures officielles, quarantaine AES-256-GCM avec clé DPAPI, restauration sans écrasement et commandes autorisées poste par poste. La surveillance est réactive et limitée aux dossiers affichés ; elle ne remplace pas la prévention de Defender. Les limites, contrôles et procédures sont détaillés dans [Antivirus](antivirus.md).

Voir [Développement](developpement.md) pour les suites ciblées. Les contrôles couvrent les permissions, sessions, MFA, stockage et modes distants. Ils ne constituent pas un audit indépendant ni une garantie d’absence de faille.

## Réputation des IP

L’API filtre l’adresse `CF-Connecting-IP` de l’edge, jamais un `X-Forwarded-For` client. Les blocages manuels et les réseaux [Spamhaus DROP](https://www.spamhaus.org/blocklists/do-not-route-or-peer/) retournent la même réponse 404 « Adresse inconnue. » que la mauvaise URL. La vérification `/api/entry` applique aussi ce filtre. Le navigateur de production rejoint ensuite la même destination introuvable.

Un instantané IPv4/IPv6 avec dates et copyright est livré dans `threat-seed.mjs`. R2 conserve les mises à jour sous `security/spamhaus-drop-v1.json`. Les requêtes de production vérifient quotidiennement la source ; une mise à jour manuelle est limitée à une par heure, sous `access.block`. Les sources sont fixes, HTTPS, sans redirection, bornées à 2 Mo et 5 secondes par source. Une erreur conserve la dernière liste ; après 72 h la réputation automatique cesse de bloquer. Les blocages manuels persistent. Ce filtrage protège l’accès API, sans constituer un pare-feu sur les fichiers statiques publics.

Vérifications : `node --test tests/threat-list.test.mjs tests/access.test.mjs` et `python tests/access_workspace_test.py`.

## Revue du 26 novembre 2026

Revue ciblée du code par l’IA de développement, sans audit indépendant ni test d’intrusion.

| Point contrôlé | Constat | Suite donnée |
| --- | --- | --- |
| Requêtes SQL du serveur | Toutes les valeurs passent par `bind()` ; les fragments concaténés sont des constantes internes | Aucun changement |
| Comparaison des secrets | Empreintes comparées en temps constant (`equal`), jetons de 256 bits, codes PBKDF2 avec secret serveur | Aucun changement |
| Droits des API utilisateurs, accès et postes | Permission précise vérifiée par action, puis droits par poste et périmètre du gestionnaire | Aucun changement |
| Dépendances de production du serveur | `npm audit --omit=dev` : 0 vulnérabilité connue | À refaire avant chaque déploiement |
| Contrôles d’IP en double | Jusqu’à cinq vérifications identiques (D1, HMAC, Spamhaus) dans une même requête de connexion | Contexte d’adresse calculé une fois par requête ; vérification générale unique, conservée autour de l’émission des sessions |
| En-tête `Retry-After` | Une réponse 401/429 non JSON pouvait faire échouer la réponse entière | Lecture tolérante, seul un entier positif est recopié |
| Tests de prise en main | Quatre tests ne déclaraient pas l’accord distant obligatoire depuis le 26 novembre | Tests alignés sur `remote-consent-v1` et l’accord explicite |

Compléments du même jour : intégration continue GitHub Actions sans la clé réelle du lien (voir [Publication](publication.md#intégration-continue)), avec `npm audit` des dépendances de production à chaque push ; suppression du gabarit d’interface inutilisé du serveur et de ses 19 dépendances npm, ce qui réduit la surface d’attaque de la chaîne d’approvisionnement.

Résultat après corrections : 338/338 tests Node, `npm run test:security`, `tests/security_test.py`, `tests/access_workspace_test.py`, `tests/session_resume_test.py` et `tests/private_entry_test.py` réussis. Les changements de `server/` ne sont en production qu’après un déploiement Sites.

Pistes non traitées, à arbitrer : `expire()` relit à chaque `agent/poll` les scans actifs et les droits de leurs auteurs (coût proportionnel au nombre de postes, mais nécessaire à la révocation immédiate) .
