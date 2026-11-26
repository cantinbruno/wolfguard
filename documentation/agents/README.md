# Agents associés aux postes

Le [journal des alertes](journal.md) décrit le tableau à hauteur fixe, les événements horodatés dans la fiche et la remontée des changements de protection par l’agent.

Les sources sont dans `agent/`. Les notices `LIRE-MOI.txt` et `LIRE-MOI-POSIX.txt` restent dans ce dossier car elles sont intégrées aux archives d’installation.

## Exécution

Le moteur commun `agent.mjs` gère l’association et les échanges avec l’API. Les modules dédiés prennent en charge réseau, topologie, collecte, EDR, bureau, terminal et fichiers. Les opérations restent contrôlées côté serveur et par les règles de l’agent.

Windows utilise les lanceurs PowerShell/C# et les composants de capture. Linux et macOS utilisent les lanceurs shell et services utilisateur. Le composant de protection privilégié a son installation et ses droits propres ; une mise à jour de l’agent utilisateur ne doit pas l’écraser.

Pour le bureau Windows, les dépendances et composants natifs sont décrits dans `agent/remote-dependencies.json` et les modules `remote-*`. Le composant d’image doit être démarré depuis les ressources de la version courante.

La prise en main Windows affiche tous les écrans dans une image commune, selon leur disposition dans Windows, y compris à gauche ou au-dessus de l’écran principal. Les coordonnées de souris suivent ce bureau complet. « Taille réelle » permet de faire défiler l’image reçue, aussi en plein écran ; « Adapter à la fenêtre » revient à la vue complète. Les très grandes configurations sont réduites avant allocation de la capture, puis l’image transmise reste limitée à 1600 × 1000. Un changement de disposition ou de résolution pendant la session demande une reconnexion et bloque les actions sur l’ancienne géométrie. Aucun sélecteur d’écran individuel n’est ajouté.

Le terminal Windows supprime les notifications de progression avant le premier chargement de modules PowerShell et convertit les autres flux en texte. Le XML technique `#< CLIXML` n’apparaît plus pour la préparation des modules ; résultats, avertissements, messages hôte, détails explicites et erreurs restent visibles en UTF-8. Les erreurs conservent leur code d’échec. Le texte explicitement produit par la commande n’est pas filtré.

Contrôles : `node --test tests/terminal.test.mjs tests/remote.test.mjs`, puis `python tests/remote_desktop_test.py` et `python tests/remote_terminal_test.py` après compilation. Le shell est testé sans fenêtre ; les écrans multiples et les clics sont simulés, sans capturer ni piloter le bureau de l’utilisateur.

Le moteur libre ClamAV peut être installé depuis la rubrique Protection de la fiche du poste sur Windows x64. Il analyse les dossiers utilisateur indiqués et traite ses détections dans une quarantaine chiffrée locale. Cette surveillance réactive ne bloque pas l’exécution avant le verdict et laisse les protections natives actives. Voir [Antivirus : activation, droits et limites](../antivirus.md).

## Association, droits et mise à jour

L’association d’un poste est indépendante de la connexion du compte navigateur. Un lien personnel peut permettre une association unique pendant une durée limitée. Garder les jetons d’agent hors des archives publiques.

Les permissions sont réglables poste par poste et restent limitées par les droits de section. Les opérations déjà en cours doivent être révoquées lorsque les accès nécessaires disparaissent. Voir [Droits](../droits.md).

Dans le parc, le bouton « Ajouter un poste » ouvre une fenêtre consacrée à l’association : choix Windows / Linux / macOS, installateur personnel ou lien à ouvrir sur un autre poste, puis confirmation automatique de son arrivée. Le lien est valable une heure pour un seul poste. Cette fenêtre ne présente ni liste de postes, ni sélecteur du poste utilisé, ni commande de révocation ou de désinstallation.

Le choix d’un poste se fait dans le parc. Sa fiche se répartit entre « Vue d’ensemble », « Protection », « Quarantaine », « Journal », « Outils » et « Détails » ; elle donne accès aux protections, aux diagnostics et à la mise à jour. La révocation se trouve uniquement dans « Détails → Retirer ce poste », avec une confirmation explicite. Une erreur conserve la fiche et permet de réessayer. Après succès, le poste disparaît du parc, son accès est refusé par l’API et une éventuelle sélection de ce poste est retirée. Le raccourci « Désinstaller l’agent » ouvre la fenêtre de désinstallation en sélectionnant ce poste. Le tableau s’adapte en cartes sur téléphone, avec les mêmes tris et filtres.

Le tableau occupe la hauteur disponible de l’écran, même avec un seul poste. La molette et le défilement tactile restent dans la liste ; les filtres, les commandes et le pied du tableau restent accessibles et les titres des colonnes restent en place. Sur petit écran, la liste conserve son affichage en cartes et son défilement interne ; les métriques sont masquées lorsque la hauteur disponible est réduite ou pendant une sélection multiple.

« Nouveau groupe » crée une section nommée et repliable du tableau. Le groupe peut être renommé ou supprimé ; sa suppression remet les postes dans « Sans groupe », sans supprimer ni désinstaller aucun agent. Une case par groupe sélectionne ses postes correspondant aux filtres, même lorsque la section est repliée. Les plages Maj + clic suivent les lignes actuellement dépliées. Le mode « Tableau simple » conserve la liste plate. Les groupes, affectations, replis et mode d’affichage sont enregistrés dans les préférences existantes : espace chiffré pour le propriétaire, préférences de session isolées par compte pour les autres utilisateurs. Il s’agit d’une organisation de la vue, sans élargissement des droits ni nouveau groupe d’autorisation serveur.

Les cases à cocher sélectionnent plusieurs postes sans ouvrir leurs fiches. La case générale agit sur les postes affichés par les filtres ; les postes déjà cochés hors filtre sont conservés et leur nombre est indiqué. Maj + clic sélectionne une plage, Ctrl/⌘ + clic ajoute ou retire un poste. Ctrl/⌘ + A dans la liste sélectionne les postes affichés ; Échap ou « Effacer » vide la sélection. Un rafraîchissement réussi retire de la sélection les postes devenus inaccessibles. Le poste actif pour les outils reste indépendant des cases cochées.

La barre d’actions propose la mise à jour des agents, la désinstallation distante, la réservation aux administrateurs ou son retrait et l’export CSV. Chaque commande distante demande une confirmation avec le nombre de postes, les noms et le nombre de postes éligibles. Les droits, la disponibilité et les capacités sont vérifiés poste par poste ; les postes non éligibles sont ignorés avec un motif. Les modifications de visibilité sont réservées au propriétaire et aux administrateurs, et la révocation reste uniquement dans la fiche du poste. Les commandes passent successivement par les mêmes services et contrôles serveur que les actions individuelles. « Arrêter la file » conserve la commande déjà lancée et arrête les suivantes. Un verrouillage ou une sortie du parc interrompt également la suite de la file. Le bilan distingue réussites, erreurs et postes ignorés ; pour une désinstallation, la réussite indique uniquement son lancement. L’export inclut seulement les postes cochés et neutralise les formules CSV dans les noms.

Le clic droit, Maj + F10 et l’appui long ouvrent un menu contextuel. Sur un poste coché dans une sélection multiple, il cible tous les postes cochés et affiche leur nombre ; sur un poste non coché, il cible ce seul poste et conserve les autres cases. Le menu donne accès à la fiche, au journal, à « Outils et diagnostics » et au déplacement vers un groupe existant ou nouveau. Les actions groupées affichent le nombre de postes éligibles avant confirmation. Le menu défile dans les limites de l’écran et conserve sa navigation au clavier.

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

Le parcours ajout → installation → fiche → révocation est vérifié sans fenêtre avec `python tests/enrollment_workspace_test.py`. Les tests `tests/agent_workspace_test.py` et `tests/agents_console_test.py` couvrent aussi les installateurs Windows/Linux/macOS, le poste sélectionné, les outils et les écrans mobiles. `python tests/agents_bulk_test.py` vérifie la hauteur fixe, la molette, les sélections, les confirmations groupées, les erreurs partielles, les droits par poste, l’annulation de la file et l’export CSV sur des postes factices. `python tests/fleet_groups_test.py` couvre les sections nommées, la persistance, les affectations multiples, les replis, les erreurs d’enregistrement et la portée du menu contextuel.

La procédure [Signature Windows](signature-windows.md) reste facultative et exige un certificat reconnu réellement disponible. L’utilisateur a abandonné l’achat du certificat ; ne pas le relancer automatiquement.

## Protection depuis la fiche du poste

L’ancienne page EDR et son raccourci sont supprimés. Les commandes antivirus et la politique sont dans Protection, les fichiers isolés dans Quarantaine, les événements et l’acquittement dans Journal. Les onglets appartiennent à la même fiche et conservent le poste ciblé. Une actualisation garde les champs en cours et le focus ; changer de poste ou fermer la fiche demande confirmation pour une politique modifiée. Les commandes ne passent jamais sur le poste sélectionné pour un autre outil.

Contrôles sans fenêtre : `python tests/antivirus_workspace_test.py`, `python tests/edr_workspace_test.py`, `python tests/agent_journal_test.py` et `python tests/agents_console_test.py`, avec postes synthétiques uniquement.
