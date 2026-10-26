# WolfGuard Web

Version statique indépendante : Mémo, dossiers, coffre d’identifiants et outils de navigateur. L’application Windows et ses bases restent à leur emplacement d’origine.

Site : **https://wolfguard.wavetools.fr/**. Dépôt : [cantinbruno/wolfguard](https://github.com/cantinbruno/wolfguard).

## Lancer localement

Depuis la racine de ce dépôt, avec Python 3 :

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory docs
```

Ouvrir `http://127.0.0.1:4173`. Pour un hébergement distant, HTTPS est obligatoire. Ne pas ouvrir `index.html` par double-clic.

Le premier accès crée un espace vide avec un mot de passe maître d’au moins 14 caractères. Préférer plusieurs mots choisis aléatoirement. Les espaces sont propres au profil du navigateur et à l’origine du site. Il n’y a ni compte, ni synchronisation, ni récupération de mot de passe.

## Données et sécurité

- Toutes les fiches et tous les dossiers, y compris les titres, sont chiffrés avant écriture dans IndexedDB. Aucun mot de passe maître ni vérificateur rapide de ce mot de passe n’est enregistré.
- Web Crypto natif : AES-256-GCM, IV aléatoire de 96 bits à chaque écriture, sel aléatoire de 128 bits, PBKDF2-HMAC-SHA-256 à 600 000 itérations, clé non extractible.
- Les clés et les contenus déchiffrés sont conservés en mémoire pendant la session. Le verrouillage abandonne leurs références et nettoie l’interface ; JavaScript ne garantit pas l’effacement physique immédiat de toutes les chaînes en mémoire.
- Verrouillage après cinq minutes sans activité et quand l’onglet est masqué. Le presse-papiers du système reste sous le contrôle de l’utilisateur : remplacer son contenu après une copie sensible.
- Un verrou Web Locks exclut un second éditeur ; les écritures IndexedDB vérifient aussi la révision et n’annoncent leur succès qu’après validation de la transaction.
- Aucun chargement de code tiers, aucune télémétrie ni requête applicative externe. Les contenus sont affichés avec `textContent`. CSP sans scripts intégrés, gestionnaires HTML intégrés ou `eval`.
- La CSP dans la page s’applique sur GitHub Pages. GitHub Pages n’applique pas le fichier `_headers` ; les directives HTTP comme `frame-ancestors` ne sont donc pas actives sur cet hébergement. Le fichier est conservé pour les hébergeurs qui le prennent en charge.

Le chiffrement protège les données stockées et exportées. Il ne protège pas une session ouverte contre un site modifié par un attaquant, une extension malveillante ou un appareil compromis. HTTPS, la protection du compte Git et de l’hébergement, et la revue des modifications restent nécessaires. Cette version a des tests automatisés ; elle n’a pas reçu d’audit de sécurité indépendant.

Repères : [OWASP, stockage cryptographique](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html), [OWASP, paramètres PBKDF2](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [W3C, limites de Web Crypto](https://www.w3.org/TR/WebCryptoAPI/).

## Sauvegarder et restaurer

Dans Paramètres, « Exporter une sauvegarde » télécharge un fichier `.wgweb` entièrement chiffré. Le conserver hors du dépôt et de l’hébergement. « Ouvrir une sauvegarde chiffrée » permet de le restaurer sur un autre navigateur avec son mot de passe. Une restauration remplace l’espace local après confirmation, uniquement après déchiffrement et validation réussis.

Exporter régulièrement : vider les données du navigateur, utiliser une session privée, changer de domaine ou perdre l’appareil peut rendre l’espace inaccessible. Une ancienne sauvegarde garde son ancien mot de passe après un changement du mot de passe local.

## Transférer les données Windows

Le transfert est volontaire et local. Aucun fichier personnel n’est inclus dans le dépôt ou le déploiement. Fermer d’abord l’application Windows. Node.js 22.13 ou supérieur est nécessaire pour cet outil de conversion ; il n’est pas nécessaire pour utiliser le site.

Depuis la racine du dépôt :

```powershell
node scripts/migrate-desktop.mjs --source "C:/Users/Cantin/Desktop/myapp" --output "C:/Users/Cantin/Desktop/WolfGuard-transfert.wgweb"
```

Le script demande le code Windows puis un nouveau mot de passe maître avec saisie masquée. Il ouvre les bases SQLite en lecture seule et produit directement une sauvegarde web chiffrée, sans fichier intermédiaire déchiffré. Il refuse une sortie dans le dépôt et l’écrasement d’un fichier existant. Ouvrir ensuite le fichier via « Ouvrir une sauvegarde chiffrée ».

Le texte enrichi est converti en texte simple ; les chemins des sous-dossiers deviennent des noms de dossiers. Les champs personnalisés du coffre deviennent des notes. En présence de pièces jointes, la conversion s’arrête pour éviter une perte. Les bases originales restent disponibles pour les fonctions et formats avancés.

## Périmètre

La version web couvre la création, modification, recherche et suppression des mémos et identifiants, les dossiers, les sauvegardes et le changement du mot de passe. Les outils incluent le générateur de mots de passe, JSON, Base64 Unicode, encodage URL et SHA-256 de fichiers.

Les scans réseau, commandes système, modules Windows, pièces jointes et éditeur riche de l’application d’origine ne sont pas portés dans cette première version statique. Elle n’est pas un remplacement fonctionnel complet de l’application Windows. Limites : 10 000 fiches, 1 000 dossiers, 500 000 caractères par note, 32 Mo de contenu total.

## Git et publication

GitHub Pages publie la branche **`main`**, dossier **`/docs`**, sans étape de compilation. Chaque push sur `main` déclenche sa publication. Le domaine personnalisé existant est conservé dans les paramètres Pages et dans `docs/CNAME`. `docs/.nojekyll` active la publication directe des fichiers statiques.

Publier uniquement `docs/`, jamais le dossier complet de l’application Windows. `docs/` contient uniquement le code, le logo et la configuration statique. Les exclusions Git protègent les bases, sauvegardes, exécutables et fichiers d’environnement. Aucun serveur applicatif, clé API ou service de base de données n’est nécessaire.

Changer de domaine ou de profil de navigateur crée un autre espace de stockage local. Pour reprendre un espace créé sur une autre URL, exporter sa sauvegarde `.wgweb` sur l’ancien site puis la restaurer sur le nouveau. Les données ne sont jamais transférées automatiquement entre les deux sites.

## Vérification

```powershell
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
python tests/browser_test.py
node --test tests/migration.test.mjs
```

Les tests utilisent exclusivement des données synthétiques et des profils temporaires : CRUD, contenu XSS inerte, stockage chiffré, refus d’une altération et d’un mauvais mot de passe, IV frais, export/restauration, changement de mot de passe, conflits d’écriture, nettoyage au verrouillage, vue mobile, CSP et conversion Windows → web. Les captures de test sont dans `.cache/`, exclu de Git.
