# Durcissement de sécurité

Contrôle effectué le 12 novembre 2026, sans changement du code personnel,
des clés de chiffrement, des droits existants ou de la durée habituelle des sessions.

- Mise à jour du serveur et de sa chaîne de compilation : Next.js, React,
  React Server Components, Vinext, Vite, Cloudflare, Zod et dépendances transitives.
  Les versions sont verrouillées et les remplacements ciblés sont contrôlés par compilation.
  `npm audit` ne signale plus de vulnérabilité dans cet ensemble au moment du contrôle.
- Validation commune des objets JSON pour l'authentification et les agents : limites
  en octets, UTF-8 strict, contrôle du type de contenu, profondeur maximale de 64,
  rejet des tableaux et valeurs primitives, interruption des flux trop volumineux.
  Les limites existantes des rapports et transferts sont conservées.
- Un administrateur délégué temporaire ne peut plus attribuer des droits au-delà
  de sa propre date de fin, y compris à son propre compte.
- Un jeton dont l'expiration a été explicitement fixée est refusé. Une nouvelle
  authentification ne réactive pas cet ancien jeton. Les sessions habituelles restent ouvertes
  jusqu'au verrouillage ou à une révocation, conformément au fonctionnement existant.
- Les modes Bureau, Terminal et Fichiers restent séparés côté API, même lorsqu'un
  client forge des requêtes avec un bail valide pour un autre mode.
- La déconnexion supprime immédiatement les images, les saisies et les commandes
  temporaires des prises en main concernées.
- Les réponses de l'API imposent l'absence de cache et d'intégration en frame,
  limitent les capacités du navigateur et ajoutent HSTS sur HTTPS. Le CORS autorisé
  reste compatible avec le site et les agents.
- Le chiffrement des grands journaux et politiques ne dépend plus d'un appel JavaScript
  avec un nombre d'arguments proportionnel à la taille des données.

Vérifications reproductibles : `npm run test:security`, `npm run test:agents-console`,
les suites navigateur de sécurité, droits, sessions, EDR et prise en main en mode sans fenêtre.
Dans `server/` : `npm audit`, `node --test tests/security.test.mjs` et `npm run build`.
Les tests utilisent des comptes, fichiers et agents jetables ; aucune commande de contrôle
n'est injectée sur le poste de l'utilisateur.

Les anciens tests `server/tests/migration.test.mjs` et `browser_test.py` visaient une
ancienne application statique dans `dist/crypto.js`. Leur couverture actuelle se trouve
dans les tests de migration, de chiffrement et d'interface à la racine du dépôt ; le serveur
dispose désormais d'une suite autonome adaptée à son API.

Ce contrôle ne constitue pas une garantie d'invulnérabilité ni un audit indépendant.
Les alertes de dépendances évoluent ; l'accès au navigateur, à l'hébergement et aux postes
autorisés reste une frontière de sécurité. Les fonctions de terminal et de prise en main
conservent leur puissance et doivent rester réservées aux comptes habilités.

Références : [OWASP REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html),
[avis Next.js](https://github.com/advisories/GHSA-2464-fhr4-w9xw),
[avis Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
