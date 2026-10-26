# WolfGuard : la même application sur le Web

Site : **https://wolfguard.wavetools.fr/** · GitHub Pages : branche `main`, dossier `/docs`.

La version web utilise directement le HTML, les styles, les vues et les outils de l’application Windows. La navigation, les dossiers et sous-dossiers, l’éditeur riche, les commandes intégrées, les images et pièces jointes existantes, la recherche, les vues liste/cartes, le coffre avec ses champs personnalisés et les paramètres sont conservés. La bibliothèque fournie contient 811 fiches au premier démarrage. Les bases personnelles ne sont pas publiées avec le code.

Mémo, Outils et Coffre-fort sont intégrés au site : les paramètres web proposent Sécurité, Données et Interface, sans écran ni onglet d’import des sections Windows.

Les six outils d’origine restent visibles : analyse IP, référentiels ports/services, scan passif, scan actif, empreintes de fichiers et décodeur/formateur. **L’exécution des scans nécessite toujours WolfGuard.exe** : un site statique ne peut pas accéder aux sockets, à ICMP ou aux tables réseau Windows. Le site l’indique et désactive leur lancement. Il n’invente aucun résultat réseau.

## Sources et publication automatique

- `myapp/general/assets/` : sources communes d’origine, utilisées par l’application Windows et surveillées sur ce PC.
- `app/` : copie exacte de ces sources dans ce dépôt ; elle n’est pas réécrite pour fabriquer une autre interface.
- `browser/` : adaptation du stockage, du code d’accès et des sauvegardes au navigateur.
- `docs/` : résultat de `scripts/build-web.mjs`, publié par GitHub Pages. `CNAME` conserve le domaine personnalisé.

La surveillance locale `scripts/watch-myapp.ps1` détecte les modifications des sources communes, attend la fin des écritures, les copie dans `app/`, prépare `docs/`, exécute les tests puis crée un commit et pousse sur ce dépôt. GitHub Pages publie chaque push sur `main`.

Elle fonctionne pendant que ce PC est allumé, avec la session utilisateur ouverte, Internet et l’accès GitHub disponibles. Elle démarre avec la tâche Windows **WolfGuard-Web-AutoPublish** à l’ouverture de session. Une erreur de test, un conflit distant ou des changements locaux hors de `app/` et `docs/` suspendent le push ; aucun historique n’est forcé et les modifications sont conservées. Le journal est `.cache/auto-publication.log`, exclu de Git. Les échecs de connexion sont réessayés.

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

Pour travailler uniquement à partir d’un clone GitHub, modifier `app/` et `browser/`, lancer `node scripts/build-web.mjs`, vérifier puis pousser. Sur le PC qui synchronise `myapp`, modifier les sources communes `general/assets/` : elles font autorité pour la copie `app/`. Les adaptations `browser/` restent propres au navigateur.

## Données locales et coffre

Un code d’accès de **huit chiffres exactement**, de 0 à 9, remplace le mot de passe maître dans le même écran d’accès que l’application d’origine. Les zéros au début sont conservés ; lettres et espaces sont exclus. Le code est choisi et confirmé à la création, ou changé dans Paramètres → Sécurité. Les bases et sauvegardes existantes restent accessibles avec leur ancien mot de passe jusqu’à leur changement volontaire.

La saisie utilise le pavé numérique d’origine avec huit pastilles masquées. Les touches du clavier, le retour arrière et l’effacement sont aussi pris en charge. La huitième touche déverrouille directement ; la création demande de saisir le code une seconde fois pour le confirmer. Aucun bouton de sauvegarde ni d’ancien mot de passe n’apparaît sur l’écran de déverrouillage. Les sauvegardes s’importent depuis les paramètres. Pour une ancienne base, coller son ancien mot de passe sur l’écran du code permet encore de l’ouvrir et de changer ensuite son accès dans les paramètres.

Les touches physiques de la rangée des chiffres fonctionnent aussi sur AZERTY sans Maj. Le pavé numérique fonctionne avec ou sans Verr Num. Retour arrière efface le dernier chiffre ; Suppr et Échap effacent la saisie. Le clavier reste actif après un clic sur les boutons du pavé à l’écran.

L’espace complet, titres et métadonnées compris, est chiffré avant son enregistrement dans IndexedDB : AES-256-GCM, IV aléatoire par écriture, sel aléatoire, PBKDF2-HMAC-SHA-256 à 600 000 itérations. Aucun code ni vérificateur rapide n’est enregistré. Les clés Web Crypto sont non extractibles. Le coffre conserve également le chiffrement de ses champs.

Les écritures sont transactionnelles, vérifient leur révision et excluent un deuxième onglet éditeur. Les références aux clés et les contenus affichés sont abandonnés au verrouillage. JavaScript ne garantit pas l’effacement physique immédiat de toutes les chaînes en mémoire. Le délai de verrouillage est réglable dans les paramètres ; masquer l’onglet verrouille aussi l’espace.

La page ne charge aucune bibliothèque depuis un CDN. Les dépendances d’origine sont incluses dans `app/vendor/` avec leurs licences. La CSP bloque les scripts intégrés et `eval` ; elle autorise les gestionnaires d’événements HTML historiques nécessaires à cette interface et WebAssembly pour les empreintes. Les contenus riches sont nettoyés par DOMPurify lors de la lecture et du collage HTML. Les identifiants des fiches et dossiers sont validés avant leur utilisation dans les vues d’origine.

GitHub Pages ne permet pas de personnaliser tous les en-têtes HTTP, notamment `frame-ancestors`. La protection du compte GitHub, du domaine, de l’appareil et du navigateur reste essentielle : du code compromis peut lire une session ouverte. Cette version est testée automatiquement, sans audit de sécurité indépendant.

## Sauvegardes et données déjà présentes

Les données créées avec la première version web simplifiée sur ce même domaine sont reprises automatiquement après déverrouillage. Leurs sauvegardes `.wgweb` restent importables.

Paramètres → Données → Exporter crée une sauvegarde chiffrée complète `.wgweb`. L’import la valide et demande son code, ou son ancien mot de passe, avant de remplacer l’espace local. Les sauvegardes conservent le texte riche, les commandes, images, pièces jointes, sous-dossiers et champs personnalisés. Une ancienne sauvegarde garde son ancien accès après un changement local.

Pour transférer les bases de l’application Windows sur ce PC, fermer d’abord WolfGuard.exe puis lancer depuis le dépôt :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/transfer-myapp.ps1
```

Le script utilise le runtime Node.js installé pour la synchronisation et crée la sauvegarde sur le Bureau. Il ouvre les quatre bases en lecture seule, demande le code Windows et un nouveau code web de huit chiffres avec saisie masquée, puis produit directement une sauvegarde chiffrée. Il conserve les documents complets et rechiffre les secrets du coffre. Il refuse d’écraser une sauvegarde ou de la placer dans le dépôt. Aucun fichier intermédiaire déchiffré ni envoi réseau n’est nécessaire. Ouvrir ensuite cette sauvegarde depuis l’écran d’accès du site.

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
node --test tests/migration.test.mjs
```

Les tests couvrent l’interface d’origine, la bibliothèque fournie, l’éditeur riche, les commandes intégrées, le nettoyage des contenus, le coffre, les outils, les sauvegardes, le changement du mot de passe, la reprise de l’ancienne version web et le transfert sans perte depuis Windows. Ils utilisent uniquement des données synthétiques et des profils de navigateur temporaires.
