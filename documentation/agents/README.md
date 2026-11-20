# Agents associés aux postes

Les sources sont dans `agent/`. Les notices `LIRE-MOI.txt` et `LIRE-MOI-POSIX.txt` restent dans ce dossier car elles sont intégrées aux archives d’installation.

## Exécution

Le moteur commun `agent.mjs` gère l’association et les échanges avec l’API. Les modules dédiés prennent en charge réseau, topologie, collecte, EDR, bureau, terminal et fichiers. Les opérations restent contrôlées côté serveur et par les règles de l’agent.

Windows utilise les lanceurs PowerShell/C# et les composants de capture. Linux et macOS utilisent les lanceurs shell et services utilisateur. Le composant de protection privilégié a son installation et ses droits propres ; une mise à jour de l’agent utilisateur ne doit pas l’écraser.

Pour le bureau Windows, les dépendances et composants natifs sont décrits dans `agent/remote-dependencies.json` et les modules `remote-*`. Le composant d’image doit être démarré depuis les ressources de la version courante.

Le moteur libre ClamAV peut être installé depuis la vue EDR sur Windows x64. Il analyse les dossiers utilisateur indiqués et traite ses détections dans une quarantaine chiffrée locale. Cette surveillance réactive ne bloque pas l’exécution avant le verdict et laisse les protections natives actives. Voir [Antivirus : activation, droits et limites](../antivirus.md).

## Association, droits et mise à jour

L’association d’un poste est indépendante de la connexion du compte navigateur. Un lien personnel peut permettre une association unique pendant une durée limitée. Garder les jetons d’agent hors des archives publiques.

Les permissions sont réglables poste par poste et restent limitées par les droits de section. Les opérations déjà en cours doivent être révoquées lorsque les accès nécessaires disparaissent. Voir [Droits](../droits.md).

Dans le parc, le bouton « Ajouter un poste » ouvre une fenêtre consacrée à l’association : choix Windows / Linux / macOS, installateur personnel ou lien à ouvrir sur un autre poste, puis confirmation automatique de son arrivée. Le lien est valable une heure pour un seul poste. Cette fenêtre ne présente ni liste de postes, ni sélecteur du poste utilisé, ni commande de révocation ou de désinstallation.

Le choix d’un poste se fait dans le parc. Sa fiche se répartit entre « Vue d’ensemble », « Outils » et « Détails » ; elle donne accès aux protections, aux diagnostics et à la mise à jour. La révocation se trouve uniquement dans « Détails → Retirer ce poste », avec une confirmation explicite. Une erreur conserve la fiche et permet de réessayer. Après succès, le poste disparaît du parc, son accès est refusé par l’API et une éventuelle sélection de ce poste est retirée. Le raccourci « Désinstaller l’agent » ouvre la fenêtre de désinstallation en sélectionnant ce poste. Le tableau s’adapte en cartes sur téléphone, avec les mêmes tris et filtres.

Le suivi d’association apparaît après la création de l’installateur ou du lien, pour confirmer l’arrivée du poste ou signaler l’expiration. Aucun encart d’attente n’est affiché à l’ouverture de la fenêtre ni après un changement de système.

La mise à jour télécharge uniquement les fichiers autorisés, contrôle le manifeste et les empreintes, puis attend le retour du poste avec la version attendue. Préserver son association. Un SHA-256 vérifié n’est pas une signature d’éditeur Windows.

## Désinstallation

Le bouton « Désinstaller », à côté d’« Ajouter un poste », regroupe la désinstallation à distance et les fichiers de désinstallation locale Windows/Linux/macOS. La révocation reste dans la fiche du poste et ne supprime pas les fichiers de l’agent.

La commande distante demande une confirmation nominative, un poste connecté avec `remote-terminal-v1`, les droits d’écriture Agents et Prise en main, et les droits correspondants sur ce poste. Elle utilise le transport du terminal existant, contrôlé par l’API, sans exposer les jetons d’agent. Le désinstalleur téléchargé est vérifié par son empreinte SHA-256, contrôle les chemins et les privilèges, puis démarre hors du service de l’agent. Aucune élévation interactive n’est demandée à distance. Sur Linux/macOS, un composant de protection système encore installé exige son retrait local par un administrateur avant la suppression de l’agent utilisateur. Windows refuse également de retirer un composant privilégié sans les droits requis.

Le statut « Désinstallation lancée » confirme le démarrage du désinstalleur, pas la suppression de tous les fichiers : la déconnexion seule ne prouve pas cette suppression. Une réponse perdue après envoi affiche un résultat non confirmé et invite à vérifier sur le poste avant de réessayer. Aucun accès n’est révoqué automatiquement.

Validation sans action sur le poste utilisateur : `node --test tests/agent-removal.test.mjs` (commandes et parcours simulés, analyse syntaxique PowerShell/shell uniquement) et `python tests/agent_removal_ui_test.py` (navigateur headless et agents factices).

## Packaging

```powershell
python scripts/package-agent.py --check
```

La reconstruction normale passe par `npm run build`. Le packaging utilise des listes de fichiers autorisés ; ajouter un module source à une archive exige de mettre à jour ce contrat et les tests correspondants. Les fichiers publics produits vivent dans `app/downloads/` et `docs/downloads/`.

## Tests

Les tests Node des agents et contrats peuvent s’exécuter sur des données temporaires. Ne pas lancer les tests de capture, saisie, clics, fenêtres natives ou modification des protections sur le poste utilisateur sans demande explicite.

Le parcours ajout → installation → fiche → révocation est vérifié sans fenêtre avec `python tests/enrollment_workspace_test.py`. Les tests `tests/agent_workspace_test.py` et `tests/agents_console_test.py` couvrent aussi les installateurs Windows/Linux/macOS, le poste sélectionné, les outils et les écrans mobiles.

La procédure [Signature Windows](signature-windows.md) reste facultative et exige un certificat reconnu réellement disponible. L’utilisateur a abandonné l’achat du certificat ; ne pas le relancer automatiquement.
