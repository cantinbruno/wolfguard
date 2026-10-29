# WolfGuard : la même application sur le Web

Site : **https://wolfguard.wavetools.fr/** · GitHub Pages : branche `main`, dossier `/docs`.

L’ouverture exige le lien privé complet : `https://wolfguard.wavetools.fr/` suivi de `?access=` et d’une clé aléatoire de 256 bits. Le code habituel à huit chiffres reste nécessaire ensuite. Le frontend reste hébergé sur **GitHub Pages** ; le DNS pointe toujours vers `cantinbruno.github.io` et ne doit pas être modifié. Sites reste uniquement le serveur de données existant. Aucun domaine personnalisé n’y est raccordé.

Le document de démarrage est chiffré avec AES-256-GCM et la clé reste absente des fichiers publics. Sa vérification passe par l’en-tête Authorization de `POST /api/entry`. Le serveur conserve seulement son empreinte `ENTRY_LINK_HASH` et ne délivre aucune session de données à cette étape. La clé est conservée dans `.local-archive/site-access.json`, exclu de Git ; une compilation refuse de continuer si elle manque. `scripts/create-private-link.mjs` crée une clé absente ; `--rotate` génère explicitement une nouvelle clé en conservant l’ancienne copie localement. Une rotation impose de mettre à jour `ENTRY_LINK_HASH` dans Sites, de redéployer l’API et de republier le frontend. Le paramètre privé est transmis à GitHub par HTTPS ; le référent est désactivé.

Sans clé, avec une mauvaise clé, un ancien fragment `#access=`, un paramètre supplémentaire ou une panne du vérificateur, le navigateur rejoint `/404`, chemin inexistant qui reçoit une **vraie réponse HTTP 404 GitHub Pages**. Aucun message d’erreur WolfGuard ni page 404 personnalisée n’est publié. Limite explicite : la requête initiale vers la racine reçoit HTTP 200, puis JavaScript navigue vers la 404 ; GitHub Pages ne peut pas choisir le statut de la racine en fonction d’une clé privée. Les chemins inexistants reçoivent directement leur 404. Les tests vérifient ce parcours, le bon lien, le rechargement, le mobile et l’absence de clé dans les fichiers publics.

La version web utilise directement le HTML, les styles, les vues et les outils de l’application Windows. Les dossiers et sous-dossiers, l’éditeur riche, les commandes intégrées, les images et pièces jointes existantes, la recherche, les vues liste/cartes et les paramètres sont conservés. La bibliothèque présente une centaine de fiches regroupant le contenu des 740 fiches conservées après le retrait des six modèles de mails et des 65 formulaires vierges. Les bases personnelles ne sont pas publiées avec le code.

La navigation comprend **Mémo, Scan passif, Scan actif et Outils**, accessibles aussi avec Alt+1 à Alt+4. Le Mémo conserve son fonctionnement et son classement. Chaque scan dispose de son propre écran ; Outils garde l’analyse IP, les ports et services, la vérification de fichiers et le décodeur/formateur. Les paramètres proposent Sécurité, Données et Interface, sans écran d’import des sections Windows.

Le Mémo regroupe désormais le contenu des **740 anciennes fiches en une centaine de fiches par sujet**, plutôt qu’en un dossier par technologie contenant de nombreuses petites fiches. La cohérence des sujets détermine le nombre de fiches ; une centaine est un ordre de grandeur, sans quota exact. Chaque fiche réunit les explications, procédures et commandes de son sujet (Active Directory, ESET, ESXi, Docker, DNS, etc.), avec un sommaire par chapitre et des blocs de code copiables. Six grands dossiers suffisent à les ranger : Réseaux et équipements ; Systèmes et virtualisation ; Sécurité et identité ; Cloud, données et automatisation ; Exploitation et supervision ; Archives et anciennes versions. Les commandes liées exclusivement à un sujet rejoignent la même fiche ; les commandes partagées restent accessibles par des liens entre les guides.

Ce regroupement s’applique une seule fois à la prochaine ouverture avec le code habituel, puis se synchronise sur les autres appareils. Les textes riches, commandes, exemples, précautions, références et pièces jointes restent accessibles dans les chapitres. Les enregistrements sources complets conservent aussi leurs identifiants et tous leurs champs dans l’espace chiffré ; ils ne sont plus affichés comme des fiches séparées. Les anciens liens ouvrent le chapitre correspondant. Les notes et dossiers personnels, le coffre et la corbeille sont conservés. Les anciennes versions de la bibliothèque rejoignent la fiche Archives.

Une sauvegarde chiffrée complète distincte est disponible dans Paramètres → Données → **Exporter avant le regroupement des fiches** ; les sauvegardes antérieures restent conservées. Si cette sauvegarde échoue, aucun regroupement n’est appliqué. Les modifications et déplacements manuels ultérieurs des guides ne sont pas annulés à la réouverture.

Le rangement version 2 reste une étape de compatibilité avant le regroupement : il répartit les anciens dossiers dans les thèmes Réseaux, Systèmes, Identité et accès, Sécurité, Virtualisation, Cloud et DevOps, Données et stockage, Supervision et Archives. Le regroupement réunit ensuite ces contenus dans les fiches par sujet et les six grands dossiers décrits ci-dessus. Les dossiers personnels non reconnus restent en place ; les destinations des notes dans la corbeille restent restaurables.

Le nettoyage retire les fiches de type mail et les modèles de messages reconnaissables à leur titre ou à un objet avec champs à compléter et une formule d’appel ou une signature. Les procédures Exchange, Outlook et SMTP, les commandes PowerShell et les fiches de diagnostic restent conservées. Les crochets dans une commande ne suffisent jamais à supprimer une fiche. Les liens et l’activité des seuls modèles supprimés sont nettoyés ; les anciennes données du coffre et les tâches restent intactes. Les modèles créés volontairement après ce passage ne sont pas supprimés à chaque ouverture.

Le nettoyage et le rangement sont enregistrés en une seule écriture chiffrée et synchronisée. Leurs versions empêchent de défaire les déplacements manuels ultérieurs. Avant cette écriture, le navigateur conserve une sauvegarde complète chiffrée distincte de l’ancien rangement, accessible dans Paramètres → Données → **Exporter avant le nettoyage des mails**. Ce fichier garde le code utilisé au moment du nettoyage. Si la sauvegarde échoue, aucune suppression ni réorganisation n’est appliquée. Un autre appareil reçoit le résultat à sa prochaine ouverture avec le code habituel.

Un passage supplémentaire retire les formulaires vierges avec plusieurs champs à compléter entre accolades ou crochets, même quand ils ont déjà été réunis dans le Mémo. Il couvre notamment « Analyse d’une protection Spanning Tree » et les 64 autres modèles de compte rendu, diagnostic et fiche vierge de la bibliothèque. Les procédures, commandes, exemples de code et rapports remplis restent conservés ; des crochets dans une référence ou une commande ne déclenchent pas cette suppression. Les liens vers les formulaires et les dossiers générés devenus vides sont nettoyés, sans déplacer les dossiers personnels. Le passage est effectué une seule fois à la prochaine ouverture avec le code et synchronisé. Une sauvegarde distincte, **Exporter avant le nettoyage des formulaires**, conserve l’état complet avant ce passage ; les anciennes sauvegardes ne sont pas remplacées.

L’ouverture sur le site utilise uniquement le **même code de huit chiffres sur tous les appareils**, sans connexion GitHub ou ChatGPT. GitHub Pages conserve le frontend ; un serveur Sites avec D1 et R2 conserve la copie partagée chiffrée. Les données personnelles ne sont jamais enregistrées dans le dépôt Git public.

Le partage a été activé une seule fois depuis le navigateur contenant les données d’origine, avec le code existant. Cette opération a transféré l’espace complet chiffré ; elle ne doit pas être répétée pour changer le lien privé. Pour retrouver cet espace sur un autre appareil, ouvrir le lien privé complet puis saisir le même code. Une connexion Internet au serveur est nécessaire ; une panne ne crée pas silencieusement une nouvelle base locale. Le mécanisme d’activation initiale reste disponible sur le serveur et dans les outils locaux pour un espace neuf, sans possibilité de réinitialiser un espace déjà activé.

Chaque ouverture récupère la copie partagée avant de déchiffrer son contenu. Les modifications sont signalées comme enregistrées après confirmation du serveur. Les écritures concurrentes vérifient une version : un appareil en retard reçoit un conflit et conserve sa modification dans une copie locale de secours exportable. Verrouiller et rouvrir récupère la dernière version. Les autres appareils déjà ouverts rechargent les nouvelles données à leur prochaine ouverture ; il ne s’agit pas d’une fusion en direct. Les copies locales antérieures et l’ancien dépôt privé GitHub de données sont conservés.

Le Coffre-fort est retiré de la navigation. Ses anciennes données et les éventuelles tâches de l’ancienne Checklist restent conservées dans l’espace chiffré et les sauvegardes, sans apparaître dans la navigation, la recherche ou les fiches liées. Leur rechiffrement reste pris en charge lors d’un changement de code ou d’une restauration.

Le clavier apparaît après validation du lien privé, sans animation avant la saisie du code. Le loup grandit puis éclate uniquement après un code correct. Les espaces et outils glissent réellement grâce à l’animation directe du contenu, sans dépendre de View Transitions. Les paramètres gardent leur animation d’ouverture. Ces effets restent actifs même si Windows réduit ses animations.

La barre supérieure reste fixe pendant le glissement des sections : la zone centrale coupe le débordement des vues animées et empêche le défilement horizontal de la page. En modification, les commandes présentes dans le corps d’une fiche restent à leur place dans le texte. Les blocs complémentaires sont regroupés sur la même feuille, avec un champ de code lisible et un contexte facultatif. La barre de mise en forme s’arrête à la fin du texte et ne recouvre pas les commandes. Les anciennes commandes déjà extraites, leurs exemples et leurs métadonnées restent conservés lors de l’enregistrement.

En lecture, les commandes font partie de la feuille principale, avant les références et les pièces jointes, sans panneau latéral séparé. Un lien avec leur nombre dans l’en-tête permet d’y accéder directement, même dans une longue fiche. Les commandes sont visibles et copiables sur ordinateur, tablette et mobile sans passer en modification ; leur code reste inchangé après un aller-retour dans l’éditeur.

Le mode Modifier expose aussi la description, le contexte, l’environnement, la technologie et les prérequis des anciennes fiches qui possèdent ces informations. Ils étaient conservés mais absents du formulaire d’édition, ce qui laissait notamment le corps des anciennes fiches de commande vide. Ces champs sont enregistrés séparément du texte libre et des commandes ; les sources, exemples et autres métadonnées restent conservés. Les mémos sans ces repères gardent leur éditeur habituel.

Les scans se lancent depuis le site et s’exécutent via un **agent Windows** sur le poste sélectionné. **Scan passif** lit les voisins ARP/NDP, les écoutes TCP, les connexions et les sockets UDP. **Scan actif** effectue les sondes TCP ou la découverte et, en option, identifie les services par bannière, HTTP HEAD ou négociation TLS validée. Les résultats et la progression remontent automatiquement sur le web ; le dernier rapport est accessible sur un autre appareil avec le code habituel. Nmap n’est pas nécessaire pour les scans de l’agent. L’import de rapports XML Nmap, JSON, CSV ou texte reste disponible en complément.

Pour associer un poste : ouvrir Scan → **Connecter un poste**, télécharger **WolfGuard-Agent-Windows.exe**, puis ouvrir ce fichier. Une fenêtre native Windows affiche le grand logo WolfGuard et prépare les composants nécessaires dans la session utilisateur, sans extraction manuelle ni console. Générer le code temporaire sur le site, le coller dans la fenêtre et cliquer sur **Associer ce poste**. Le téléchargement ZIP reste disponible en alternative ; il contient `WolfGuard-Agent.exe`.

La fenêtre indique À associer, Connexion, Connecté, Scan en cours avec progression, Scan terminé, Hors ligne, Agent arrêté ou Association requise. « Connecté » n’apparaît qu’après une réponse effective du serveur ; une coupure déclenche une nouvelle tentative et un accès révoqué permet une nouvelle association. Arrêter ou fermer la fenêtre interrompt le moteur et le scan ; réduire la fenêtre le garde disponible. La case **Ouvrir l’agent avec ma session Windows** est facultative et remplace l’ancien démarrage programmé pour le même utilisateur.

L’association ne transmet pas le code WolfGuard à l’agent. Une association existante reste lisible avec Windows DPAPI ; fermer l’ancienne console avant d’ouvrir la nouvelle version. Le moteur Node.js est téléchargé depuis son site officiel et son SHA-256 est vérifié avant extraction et exécution. Aucun droit administrateur n’est demandé. L’exécutable n’est pas signé numériquement. Sa compilation inclut les seules sources autorisées ; `agent/windows-build.json` conserve leurs empreintes ainsi que celles du programme et de sa charge utile. Le contrôle de publication refuse un programme modifié ou qui ne correspond plus aux sources. Les tests natifs vérifient le rendu de la fenêtre, l’extraction et le protocole du moteur dans un profil temporaire, sans installer l’agent ni modifier le démarrage réel.

L’agent effectue uniquement des connexions HTTPS sortantes au relais ; aucun port entrant n’est ouvert. Les cibles actives sont limitées aux IP privées, locales ou de boucle locale, sans résolution DNS : 256 adresses, 4096 tests et 32 tests simultanés au maximum, avec arrêt après trois minutes. Un seul scan par agent, arrêt depuis le web, bail de collecte et détection des déconnexions empêchent les relances silencieuses d’un scan perdu. Un changement du code WolfGuard nécessite une nouvelle association de l’agent.

Le relais conserve les résultats pendant sept jours, chiffrés côté serveur avec les cibles et le nom du poste. L’accès à ces résultats nécessite la session WolfGuard ; le jeton d’agent ne donne pas accès au Mémo. Pour conserver durablement un rapport dans les sauvegardes chiffrées et la synchronisation habituelle de l’espace, utiliser **Enregistrer**. Les résultats non archivés restent accessibles sur un autre appareil pendant leur durée de conservation.

Chaque espace propose une synthèse, les adresses observées, une table avec recherche, filtres, tri et pagination, le détail d’une observation et la comparaison avec un relevé de référence conservé pour la session. Les états ambigus Nmap restent ambigus ; une entrée en cache n’est pas présentée comme une preuve de présence. Les XML avec entités ou DTD externes sont refusés et les contenus importés ne sont jamais exécutés. Limites : 2 Mo et 5 000 observations par import. Aucun exemple fictif n’est présenté comme un résultat réel.

Le bouton Enregistrer conserve jusqu’à trois relevés par section (collection limitée à 2 Mo), avec le chiffrement et la synchronisation de l’espace existant. Un remplacement ou une suppression demande une confirmation ; un import ou une sauvegarde en échec conserve le relevé courant. Les relevés enregistrés peuvent être chargés sur un autre appareil. Les imports non enregistrés et la référence sont effacés au verrouillage. L’export CSV suit les filtres ; le JSON exporte le relevé complet. Ces fichiers exportés sont lisibles en clair. Pour une copie chiffrée de l’ensemble, utiliser la sauvegarde dans Paramètres → Données.

## Sources et publication automatique

- `myapp/` est directement le dépôt Git `cantinbruno/wolfguard`, avec la même arborescence et le même historique que GitHub.
- `app/` : sources de l’interface d’origine, désormais modifiées directement dans ce dépôt.
- `browser/` : adaptation du stockage, du code d’accès et des sauvegardes au navigateur.
- `agent/` : moteur de scan, association et lanceurs Windows ; l’archive publique est construite depuis une liste explicite de sources, sans identifiant local.
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
