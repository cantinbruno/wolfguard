# Sécurité de l’application

Référence de maintenance, à vérifier dans les sources et les tests lors d’un changement. Le dernier contrôle historique des dépendances était documenté au 12 novembre 2026 ; il ne décrit pas les alertes npm du jour.

## Connexion et sessions

L’ouverture du frontend exige le lien privé. La clé de ce lien n’est pas publiée et le serveur n’en conserve qu’une empreinte pour `POST /api/entry`. Cette étape ne délivre pas une session de données. Le code personnel comporte huit chiffres ; la MFA protège ensuite les comptes qui l’exigent.

Le serveur vérifie le code avec un sel, un secret indépendant et PBKDF2-SHA-256. Les échecs imposent un délai partagé croissant et un bail empêche de vérifier en parallèle pour le contourner. Les sessions sont des jetons aléatoires de 256 bits dont l’empreinte est stockée en base.

L’expiration est **4 heures après la dernière activité réelle**, sans plafond absolu de durée. Le navigateur suit l’horloge civile et monotone. Le serveur renouvelle l’échéance via `POST /api/touch` avec un âge d’activité valide ; le polling seul ne renouvelle pas. Un jeton expiré ne se réactive pas. Le verrouillage, la révocation, les changements de code ou de droits restent applicables. Sources : `browser/adapter.js`, `browser/tab-session.js`, `server/lib/wolfguard/core.mjs`, `session-policy.mjs`.

## MFA et changement de téléphone

TOTP utilise six chiffres et des périodes de 30 secondes, avec consommation atomique des compteurs. Les secrets et états en attente sont chiffrés. Les codes de secours sont à usage unique ; ils ne sont pas des sauvegardes des données.

Le remplacement Authenticator exige le code personnel et l’ancien OTP ou un code de secours. Le nouvel enrôlement est temporaire ; l’ancien facteur reste actif jusqu’à confirmation du nouveau. La confirmation remplace le secret, renouvelle les codes de secours et invalide les anciennes sessions. Une annulation ou expiration laisse l’ancien facteur actif. Source : `server/lib/wolfguard/otp.mjs`.

Le parcours web courant utilise Authenticator ; la présence de modules historiques Web Push ne signifie pas qu’une seconde validation push est requise dans l’interface.

## Données et clés

L’espace enregistré dans le navigateur est chiffré avec AES-256-GCM ; la dérivation client emploie PBKDF2-HMAC-SHA-256 à 600 000 itérations. Les clés Web Crypto sont non extractibles. La reprise d’un rafraîchissement conserve temporairement une clé non extractible et le jeton du même onglet ; elle ne conserve pas le code personnel.

Le stockage serveur ajoute son chiffrement aux objets R2. La clé partagée est enveloppée séparément avec `WORKSPACE_KEY_ENCRYPTION_KEY`, qui doit être distincte de `STORAGE_KEY` et `AUTH_PEPPER`. Cela réduit les conséquences d’un vol de la base ; **le serveur peut toujours déchiffrer et filtrer les espaces partagés**. Le fonctionnement n’est pas à connaissance nulle ni inaccessible à un hébergeur compromis.

Les coffres personnels et le filtrage des documents restent contrôlés côté serveur. Voir [Droits](droits.md). Aucun export/import de sauvegarde utilisateur n’est proposé. Préserver les anciens fichiers et copies techniques nécessaires à la récupération.

## Frontières à conserver

- CSP, empreintes SRI, nettoyage des contenus riches et absence de CDN dans l’application.
- Validation des JSON : taille, profondeur, UTF-8 et types ; contrôle des modes et autorisations sur chaque API sensible.
- API sans cache, restrictions d’intégration, HSTS en HTTPS et origines CORS autorisées.
- Agent : association, authentification et droits effectifs du poste ; cloisonnement des modes bureau/terminal/fichiers.
- Publication : exclusion des données, secrets, profils personnels, fichiers privés et liens symboliques.
- SHA-256 contrôle les fichiers livrés mais ne remplace pas Authenticode. Voir [Signature Windows](agents/signature-windows.md).

Le code à huit chiffres reste une limite face à des essais hors ligne sur d’anciens fichiers chiffrés uniquement avec ce code. La MFA protège la connexion au serveur, pas ces fichiers. Une session ouverte ou un serveur compromis reste une frontière importante.

## Vérification

Voir [Développement](developpement.md) pour les suites ciblées. Les contrôles couvrent les permissions, sessions, MFA, stockage et modes distants. Ils ne constituent pas un audit indépendant ni une garantie d’absence de faille.
