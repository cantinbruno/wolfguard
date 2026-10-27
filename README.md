# WolfGuard : la même application sur le Web

Site : **https://wolfguard.wavetools.fr/** · GitHub Pages : branche `main`, dossier `/docs`.

La version web utilise directement le HTML, les styles, les vues et les outils de l’application Windows. La navigation, les dossiers et sous-dossiers, l’éditeur riche, les commandes intégrées, les images et pièces jointes existantes, la recherche, les vues liste/cartes, le coffre avec ses champs personnalisés et les paramètres sont conservés. La bibliothèque fournie contient 811 fiches au premier démarrage. Les bases personnelles ne sont pas publiées avec le code.

Mémo, Outils et Coffre-fort sont intégrés au site : les paramètres web proposent Sécurité, Données et Interface, sans écran ni onglet d’import des sections Windows.

L’ouverture sur le site utilise uniquement le **même code de huit chiffres sur tous les appareils**, sans connexion GitHub ou ChatGPT. GitHub Pages conserve le frontend ; un serveur Sites avec D1 et R2 conserve la copie partagée chiffrée. Les données personnelles ne sont jamais enregistrées dans le dépôt Git public.

Une activation unique est nécessaire : ouvrir le lien privé d’activation sur le domaine habituel, dans le navigateur contenant les données actuelles, puis saisir le code existant. Le navigateur vérifie et transfère automatiquement son espace complet chiffré. Sans espace existant, il demande de choisir et confirmer un code. Le lien n’est pas publié dans Git et ne peut pas réinitialiser un espace déjà activé. Ensuite, ouvrir simplement https://wolfguard.wavetools.fr/ et saisir le même code suffit sur un autre appareil. Une connexion Internet au serveur est nécessaire ; une panne ne crée pas silencieusement une nouvelle base locale.

Chaque ouverture récupère la copie partagée avant de déchiffrer son contenu. Les modifications sont signalées comme enregistrées après confirmation du serveur. Les écritures concurrentes vérifient une version : un appareil en retard reçoit un conflit et conserve sa modification dans une copie locale de secours exportable. Verrouiller et rouvrir récupère la dernière version. Les autres appareils déjà ouverts rechargent les nouvelles données à leur prochaine ouverture ; il ne s’agit pas d’une fusion en direct. Les copies locales antérieures et l’ancien dépôt privé GitHub de données sont conservés.

Le Coffre-fort a repris sa place dans la navigation. Les éventuelles tâches créées pendant la version Checklist restent conservées dans l’espace chiffré et les sauvegardes, sans apparaître dans la navigation, la recherche ou les fiches liées.

Le clavier apparaît directement à l’ouverture du site, sans animation avant la saisie du code. Le loup grandit puis éclate uniquement après un code correct. Les espaces et outils glissent réellement grâce à l’animation directe du contenu, sans dépendre de View Transitions. Les paramètres gardent leur animation d’ouverture. Ces effets restent actifs même si Windows réduit ses animations.

Les six outils d’origine restent visibles : analyse IP, référentiels ports/services, scan passif, scan actif, empreintes de fichiers et décodeur/formateur. **L’exécution des scans nécessite toujours WolfGuard.exe** : un site statique ne peut pas accéder aux sockets, à ICMP ou aux tables réseau Windows. Le site l’indique et désactive leur lancement. Il n’invente aucun résultat réseau.

## Sources et publication automatique

- `myapp/` est directement le dépôt Git `cantinbruno/wolfguard`, avec la même arborescence et le même historique que GitHub.
- `app/` : sources de l’interface d’origine, désormais modifiées directement dans ce dépôt.
- `browser/` : adaptation du stockage, du code d’accès et des sauvegardes au navigateur.
- `server/` : source complète du serveur Sites, schéma D1 et migrations ; les secrets restent configurés uniquement chez l’hébergeur.
- `docs/` : résultat de `scripts/build-web.mjs`, publié par GitHub Pages. `CNAME` conserve le domaine personnalisé.

La surveillance locale `scripts/watch-myapp.ps1` détecte les modifications de `app/`, `browser/`, `server/`, `scripts/`, `tests/` et des fichiers de configuration du dépôt, attend la fin des écritures, prépare `docs/`, exécute les tests puis crée un commit et pousse sur GitHub. Les mises à jour distantes sont récupérées quand le dossier local est propre. GitHub Pages publie chaque push sur `main`. Le serveur Sites utilise un déploiement distinct ; pousser son code sur GitHub ne redéploie pas son API. Voir `server/README.md`.

Elle fonctionne pendant que ce PC est allumé, avec la session utilisateur ouverte, Internet et l’accès GitHub disponibles. Elle démarre avec la tâche Windows **WolfGuard-Web-AutoPublish** à l’ouverture de session. Une erreur de test, un conflit distant, une préparation Git en cours ou un fichier hors des sources autorisées suspendent le push ; aucun historique n’est forcé et les modifications sont conservées. Le journal est `.cache/auto-publication.log`, exclu de Git. Les échecs de connexion sont réessayés.

Lancer une synchronisation manuellement depuis ce dépôt :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync-myapp.ps1
```

Pour arrêter ou reprendre la surveillance :

```powershell
Stop-ScheduledTask -TaskName WolfGuard-Web-AutoPublish
Disable-ScheduledTask -TaskName WolfGuard-Web-AutoPublish
# Pour reprendre :
Enable-ScheduledTask -TaskName WolfGuard-Web-AutoPublish
Start-ScheduledTask -TaskName WolfGuard-Web-AutoPublish
```

Modifier directement `app/` et `browser/` dans `myapp`. Il n’existe plus de copie intermédiaire `github-wolfguard/`. Pour publier manuellement, lancer `node scripts/build-web.mjs`, vérifier puis pousser, ou utiliser `scripts/sync-myapp.ps1`.

Sur ce PC, l’ancienne application Windows complète et ses bases sont conservées dans `.local-archive/windows-original/` ; l’ancienne version web séparée est dans `.local-archive/previous-web/`. L’intégralité de `.local-archive/` est exclue de Git et de la publication. Les empreintes des fichiers de données ont été vérifiées après leur déplacement. L’ancienne application peut être lancée avec `.local-archive/windows-original/WolfGuard.exe`.

## Données partagées et coffre

Un code d’accès de **huit chiffres exactement**, de 0 à 9, remplace le mot de passe maître dans le même écran d’accès que l’application d’origine. Les zéros au début sont conservés ; lettres et espaces sont exclus. Le code est choisi et confirmé à la création, ou changé dans Paramètres → Sécurité. Les bases et sauvegardes existantes restent accessibles avec leur ancien mot de passe jusqu’à leur changement volontaire.

La saisie utilise le pavé numérique d’origine avec huit pastilles masquées. Les touches du clavier, le retour arrière et l’effacement sont aussi pris en charge. La huitième touche déverrouille directement ; la création demande de saisir le code une seconde fois pour le confirmer. Aucun bouton de sauvegarde ni d’ancien mot de passe n’apparaît sur l’écran de déverrouillage. Les sauvegardes s’importent depuis les paramètres. Pour une ancienne base, coller son ancien mot de passe sur l’écran du code permet encore de l’ouvrir et de changer ensuite son accès dans les paramètres.

Les touches physiques de la rangée des chiffres fonctionnent aussi sur AZERTY sans Maj. Le pavé numérique fonctionne avec ou sans Verr Num. Retour arrière efface le dernier chiffre ; Suppr et Échap effacent la saisie. Le clavier reste actif après un clic sur les boutons du pavé à l’écran.

L’espace complet, titres et métadonnées compris, est chiffré avant son enregistrement dans IndexedDB : AES-256-GCM, IV aléatoire par écriture, sel aléatoire, PBKDF2-HMAC-SHA-256 à 600 000 itérations. Aucun code ni vérificateur rapide n’est enregistré. Les clés Web Crypto sont non extractibles. Le coffre conserve également le chiffrement de ses champs. Le format d’enveloppe v3 authentifie aussi la révision, le sel, l’IV et les paramètres de chiffrement. Les anciens formats v1/v2 restent lisibles et passent au format v3 après déverrouillage réussi, sans changer le code ni les données. Les buffers temporaires de texte clair sont remis à zéro lorsque c’est possible.

Les écritures sont transactionnelles, vérifient leur révision et excluent un deuxième onglet éditeur. Les références aux clés et les contenus affichés sont abandonnés au verrouillage. JavaScript ne garantit pas l’effacement physique immédiat de toutes les chaînes en mémoire. La politique renforcée impose **une minute d’inactivité et quinze minutes maximum par session**, même si un ancien réglage désactivait le verrouillage. Masquer l’onglet verrouille aussi l’espace. Les échéances sont vérifiées avec l’horloge civile et une horloge monotone ; une lecture ou une écriture après expiration est refusée même si le minuteur n’a pas encore été exécuté. Des événements synthétiques ne prolongent pas une session.

Les mots de passe sont masqués pendant l’édition et se remasquent quinze secondes après affichage dans une fiche. Une copie sensible est suivie par une empreinte en mémoire : après trente secondes ou au verrouillage, le navigateur tente de l’effacer seulement si la permission de lecture du presse-papiers était déjà accordée et si le contenu lu correspond encore à cette copie. Il ne demande pas de permission supplémentaire et n’efface pas volontairement une nouvelle copie différente. Ce nettoyage est une mesure de précaution, pas une garantie : il dépend du navigateur, de son état de focus et des changements concurrents du presse-papiers.

Chaque code incorrect au déverrouillage impose un délai croissant : **5 secondes au premier échec, 10 au deuxième, 15 au troisième, puis 5 secondes supplémentaires par échec**. Le compteur et le délai sont persistants côté serveur, partagés entre les appareils, et ne disparaissent pas en effaçant le stockage du navigateur. Un verrou transactionnel empêche les vérifications parallèles de contourner le délai. Le navigateur conserve aussi l’échéance pour bloquer son clavier, le collage et les boutons pendant l’attente. Un code correct remet le compteur à zéro. Cette protection ne limite pas les attaques hors ligne sur une sauvegarde exportée.

Le serveur vérifie le code avec un secret indépendant, un sel aléatoire et PBKDF2-SHA-256 à 100 000 itérations, compatible avec la limite de production Workers. Les sessions utilisent des jetons aléatoires de 256 bits, conservés seulement en mémoire par le navigateur et sous forme d’empreinte dans D1. Elles expirent après une minute d’inactivité et quinze minutes maximum. R2 applique une seconde couche AES-256-GCM avec une clé serveur indépendante sur des blocs authentifiés de 64 Kio. L’enveloppe chiffrée par le navigateur n’est donc pas stockée telle quelle dans R2. Les anciens objets chiffrés sont conservés pour récupération. Un changement du code et son nouvel espace chiffré sont validés ensemble, puis les anciennes sessions sont révoquées. Le serveur reçoit le code via HTTPS pour le vérifier ; ce n’est pas un protocole à connaissance nulle.

La page ne charge aucune bibliothèque depuis un CDN. Les dépendances sont incluses dans `app/vendor/` avec leurs licences. La CSP bloque les scripts intégrés, les attributs d’événements HTML (`script-src-attr 'none'`) et `eval` ; WebAssembly reste autorisé pour les empreintes. Les actions historiques sont remplacées par une liste fermée de commandes dans `browser/actions.js`, sans compilation de chaînes de caractères. DOMPurify nettoie les contenus riches, retire les commandes forgées et isole les noms des éléments pour réduire les risques de collision avec l’interface. Les identifiants, étiquettes et liens sont validés. Tous les scripts et feuilles de style de la page portent une empreinte SRI SHA-384 ; les fichiers modifiés sans mise à jour de la page sont refusés par le navigateur. La politique de référent est `no-referrer`.

`scripts/check-publication.mjs` bloque les bases locales, sauvegardes, liens symboliques, enveloppes chiffrées et certains formats de clés privées ou jetons reconnus dans les fichiers suivis ou publiables. Les journaux ne montrent que les noms de fichiers. Ce contrôle et les tests de sécurité font partie de la publication automatique ; ce détecteur ne remplace pas une revue des fichiers et ne prétend pas reconnaître tous les secrets possibles.

GitHub Pages ne permet pas de personnaliser tous les en-têtes HTTP, notamment `frame-ancestors`. L’application refuse d’initialiser le déverrouillage lorsqu’elle s’exécute dans une frame ; cela reste une vérification JavaScript et ne remplace pas cet en-tête. La protection du compte GitHub, du domaine, de l’appareil et du navigateur reste essentielle : du code compromis peut lire une session ouverte, et modifier simultanément le HTML et ses empreintes contourne SRI. Cette version est testée automatiquement, sans audit de sécurité indépendant. Le code à huit chiffres est conservé à la demande de l’utilisateur : il offre au plus 100 millions de combinaisons et reste une limite face aux attaques hors ligne. Une phrase secrète aléatoire plus longue permettrait d’aller plus loin.

Références de conception : [OWASP — stockage des mots de passe](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [MDN — CSP et exécution des scripts](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).

## Sauvegardes et données déjà présentes

Les données créées avec la première version web simplifiée sur ce même domaine sont reprises automatiquement après déverrouillage. Leurs sauvegardes `.wgweb` restent importables.

Paramètres → Données → Exporter crée une sauvegarde chiffrée complète `.wgweb`. Sur le site partagé, l’import demande le code de la sauvegarde, conserve une copie de l’espace actuel puis restaure son contenu dans l’espace partagé avec le code actuel. Les secrets internes du coffre sont rechiffrés avec la clé actuelle. Les sauvegardes conservent le texte riche, les commandes, images, pièces jointes, sous-dossiers et champs personnalisés. Un fichier déjà exporté garde son ancien code après un changement.

Pour transférer les bases de l’application Windows sur ce PC, fermer d’abord WolfGuard.exe puis lancer depuis le dépôt :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/transfer-myapp.ps1
```

Le script utilise le runtime Node.js installé pour la synchronisation et crée la sauvegarde sur le Bureau. Sur ce PC, il retrouve automatiquement les anciennes bases dans `.local-archive/windows-original/`. Il ouvre les quatre bases en lecture seule, demande le code Windows et un nouveau code web de huit chiffres avec saisie masquée, puis produit directement une sauvegarde chiffrée. Il conserve les documents complets et rechiffre les secrets du coffre. Il refuse d’écraser une sauvegarde ou de la placer dans le dépôt. Aucun fichier intermédiaire déchiffré ni envoi réseau n’est nécessaire. Importer ensuite cette sauvegarde depuis Paramètres → Données sur le site.

Après activation et confirmation du transfert, effacer le cache ou changer d’appareil permet de retrouver la copie partagée en saisissant le code. Les données uniquement locales avant cette activation doivent être transférées depuis leur navigateur d’origine. Garder aussi des exports chiffrés : oublier le code ou perdre l’accès à l’hébergement reste une limite. Limite de l’espace chiffré : 32 Mo. Le mode de développement sur localhost reste local par défaut ; `?sync-test` active le partage pour les tests avec une API de test interceptée.

## Développement et vérification

```powershell
node scripts/build-web.mjs
python -m http.server 4173 --bind 127.0.0.1 --directory docs
# Ouvrir http://127.0.0.1:4173

python -m pip install -r tests/requirements.txt
python -m playwright install chromium
python tests/original_app_test.py
python tests/keyboard_test.py
python tests/animations_test.py
python tests/timeout_test.py
python tests/security_test.py
node --test tests/migration.test.mjs tests/security.test.mjs tests/publication.test.mjs
node scripts/check-publication.mjs
```

Les tests couvrent l’interface d’origine, la bibliothèque fournie, l’éditeur riche, les commandes intégrées, le nettoyage des contenus, le coffre, les outils, les sauvegardes, le changement du mot de passe, la reprise de l’ancienne version web et le transfert sans perte depuis Windows. Les tests de sécurité vérifient aussi les injections HTML, les métadonnées chiffrées altérées, les clés non extractibles, les échéances de session, les anciennes enveloppes v2, le presse-papiers simulé, les erreurs de stockage des tentatives, l’ouverture dans une frame, les fichiers SRI modifiés et le refus d’une sauvegarde privée copiée parmi les JSON publics. Ils utilisent uniquement des données synthétiques et des profils de navigateur temporaires.
