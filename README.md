# WolfGuard : la même application sur le Web

Site : **https://wolfguard.wavetools.fr/** · GitHub Pages : branche `main`, dossier `/docs`.

La version web utilise directement le HTML, les styles, les vues et les outils de l’application Windows. La navigation, les dossiers et sous-dossiers, l’éditeur riche, les commandes intégrées, les images et pièces jointes existantes, la recherche, les vues liste/cartes, le coffre avec ses champs personnalisés et les paramètres sont conservés. La bibliothèque fournie contient 811 fiches au premier démarrage. Les bases personnelles ne sont pas publiées avec le code.

Mémo, Outils et Coffre-fort sont intégrés au site : les paramètres web proposent Sécurité, Données et Interface, sans écran ni onglet d’import des sections Windows.

Le clavier apparaît directement à l’ouverture du site, sans animation avant la saisie du code. Le loup grandit puis éclate uniquement après un code correct. Les espaces et outils glissent réellement grâce à l’animation directe du contenu, sans dépendre de View Transitions. Les paramètres gardent leur animation d’ouverture. Ces effets restent actifs même si Windows réduit ses animations.

Les six outils d’origine restent visibles : analyse IP, référentiels ports/services, scan passif, scan actif, empreintes de fichiers et décodeur/formateur. **L’exécution des scans nécessite toujours WolfGuard.exe** : un site statique ne peut pas accéder aux sockets, à ICMP ou aux tables réseau Windows. Le site l’indique et désactive leur lancement. Il n’invente aucun résultat réseau.

## Sources et publication automatique

- `myapp/` est directement le dépôt Git `cantinbruno/wolfguard`, avec la même arborescence et le même historique que GitHub.
- `app/` : sources de l’interface d’origine, désormais modifiées directement dans ce dépôt.
- `browser/` : adaptation du stockage, du code d’accès et des sauvegardes au navigateur.
- `docs/` : résultat de `scripts/build-web.mjs`, publié par GitHub Pages. `CNAME` conserve le domaine personnalisé.

La surveillance locale `scripts/watch-myapp.ps1` détecte les modifications de `app/`, `browser/`, `scripts/`, `tests/` et des fichiers de configuration du dépôt, attend la fin des écritures, prépare `docs/`, exécute les tests puis crée un commit et pousse sur GitHub. Les mises à jour distantes sont récupérées quand le dossier local est propre. GitHub Pages publie chaque push sur `main`.

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

## Données locales et coffre

Un code d’accès de **huit chiffres exactement**, de 0 à 9, remplace le mot de passe maître dans le même écran d’accès que l’application d’origine. Les zéros au début sont conservés ; lettres et espaces sont exclus. Le code est choisi et confirmé à la création, ou changé dans Paramètres → Sécurité. Les bases et sauvegardes existantes restent accessibles avec leur ancien mot de passe jusqu’à leur changement volontaire.

La saisie utilise le pavé numérique d’origine avec huit pastilles masquées. Les touches du clavier, le retour arrière et l’effacement sont aussi pris en charge. La huitième touche déverrouille directement ; la création demande de saisir le code une seconde fois pour le confirmer. Aucun bouton de sauvegarde ni d’ancien mot de passe n’apparaît sur l’écran de déverrouillage. Les sauvegardes s’importent depuis les paramètres. Pour une ancienne base, coller son ancien mot de passe sur l’écran du code permet encore de l’ouvrir et de changer ensuite son accès dans les paramètres.

Les touches physiques de la rangée des chiffres fonctionnent aussi sur AZERTY sans Maj. Le pavé numérique fonctionne avec ou sans Verr Num. Retour arrière efface le dernier chiffre ; Suppr et Échap effacent la saisie. Le clavier reste actif après un clic sur les boutons du pavé à l’écran.

L’espace complet, titres et métadonnées compris, est chiffré avant son enregistrement dans IndexedDB : AES-256-GCM, IV aléatoire par écriture, sel aléatoire, PBKDF2-HMAC-SHA-256 à 600 000 itérations. Aucun code ni vérificateur rapide n’est enregistré. Les clés Web Crypto sont non extractibles. Le coffre conserve également le chiffrement de ses champs.

Les écritures sont transactionnelles, vérifient leur révision et excluent un deuxième onglet éditeur. Les références aux clés et les contenus affichés sont abandonnés au verrouillage. JavaScript ne garantit pas l’effacement physique immédiat de toutes les chaînes en mémoire. Le délai de verrouillage est réglable dans les paramètres ; masquer l’onglet verrouille aussi l’espace.

Chaque code incorrect au déverrouillage impose un délai croissant : **5 secondes au premier échec, 10 au deuxième, 15 au troisième, puis 5 secondes supplémentaires par échec**. Pendant ce délai, la souris, le clavier physique et le collage ne peuvent pas soumettre un nouveau code. Le compteur et l’échéance, sans secret ni code, sont enregistrés dans IndexedDB pour cet espace et partagés entre les onglets. Recharger la page ne les remet pas à zéro. Un code correct remet le compteur à zéro. Cette limitation est locale au navigateur ; un site uniquement front ne peut pas imposer de limite à une attaque hors ligne sur une copie chiffrée ou à un navigateur dont le stockage a été effacé.

La page ne charge aucune bibliothèque depuis un CDN. Les dépendances d’origine sont incluses dans `app/vendor/` avec leurs licences. La CSP bloque les scripts intégrés et `eval` ; elle autorise les gestionnaires d’événements HTML historiques nécessaires à cette interface et WebAssembly pour les empreintes. Les contenus riches sont nettoyés par DOMPurify lors de la lecture et du collage HTML. Les identifiants des fiches et dossiers sont validés avant leur utilisation dans les vues d’origine.

GitHub Pages ne permet pas de personnaliser tous les en-têtes HTTP, notamment `frame-ancestors`. La protection du compte GitHub, du domaine, de l’appareil et du navigateur reste essentielle : du code compromis peut lire une session ouverte. Cette version est testée automatiquement, sans audit de sécurité indépendant.

## Sauvegardes et données déjà présentes

Les données créées avec la première version web simplifiée sur ce même domaine sont reprises automatiquement après déverrouillage. Leurs sauvegardes `.wgweb` restent importables.

Paramètres → Données → Exporter crée une sauvegarde chiffrée complète `.wgweb`. L’import la valide et demande son code, ou son ancien mot de passe, avant de remplacer l’espace local. Les sauvegardes conservent le texte riche, les commandes, images, pièces jointes, sous-dossiers et champs personnalisés. Une ancienne sauvegarde garde son ancien accès après un changement local.

Pour transférer les bases de l’application Windows sur ce PC, fermer d’abord WolfGuard.exe puis lancer depuis le dépôt :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/transfer-myapp.ps1
```

Le script utilise le runtime Node.js installé pour la synchronisation et crée la sauvegarde sur le Bureau. Sur ce PC, il retrouve automatiquement les anciennes bases dans `.local-archive/windows-original/`. Il ouvre les quatre bases en lecture seule, demande le code Windows et un nouveau code web de huit chiffres avec saisie masquée, puis produit directement une sauvegarde chiffrée. Il conserve les documents complets et rechiffre les secrets du coffre. Il refuse d’écraser une sauvegarde ou de la placer dans le dépôt. Aucun fichier intermédiaire déchiffré ni envoi réseau n’est nécessaire. Importer ensuite cette sauvegarde depuis Paramètres → Données sur le site.

Exporter régulièrement : les données sont propres au domaine et au profil du navigateur. Les effacer, perdre l’appareil ou oublier le code rend l’espace inaccessible. Limite de l’espace chiffré : 32 Mo.

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
node --test tests/migration.test.mjs
```

Les tests couvrent l’interface d’origine, la bibliothèque fournie, l’éditeur riche, les commandes intégrées, le nettoyage des contenus, le coffre, les outils, les sauvegardes, le changement du mot de passe, la reprise de l’ancienne version web et le transfert sans perte depuis Windows. Ils utilisent uniquement des données synthétiques et des profils de navigateur temporaires.
