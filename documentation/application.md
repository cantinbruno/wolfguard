# Fonctionnement de l’application

Cette page décrit le source du projet. Pour connaître ce qui est effectivement publié, vérifier les commits et les déploiements.

## Navigation et données

Le Mémo conserve les dossiers, sous-dossiers, fiches, contenus riches, images, pièces jointes, commandes et recherches. Le Coffre-fort classe les accès et masque les champs sensibles ; il reste personnel, y compris pour les administrateurs. Outils regroupe les utilitaires réseau et de fichiers.

L’écran Sécurité conserve le poste choisi pendant l’utilisation de ses outils : scans, cartographie, vulnérabilités, EDR, bureau, terminal et fichiers. Un simple clic sur le nom ou une cellule du poste ouvre sa fiche. Le clic droit et l’appui long ouvrent les options du poste. Les paramètres regroupent les protections de l’application, Authenticator, les préférences et les écrans d’administration autorisés.

Pendant un changement de section, la vue précédente reste visible jusqu’à la préparation du contenu suivant. La nouvelle section s’affiche directement, sans glissement ni délai d’animation. Le Mémo conserve les nœuds de son éditeur, son brouillon et ses positions de défilement sans les retirer prématurément de l’écran. Une erreur de rendu affiche un message et un bouton « Réessayer » ; l’onglet courant peut aussi relancer une vue vide ou en erreur. Une erreur avant le changement laisse la vue précédente accessible. Les raccourcis Alt + chiffre fonctionnent aussi depuis les fenêtres d’outils Sécurité. Vérifications : `python tests/section_navigation_test.py`, `python tests/animations_test.py` et `python tests/editor_layout_test.py`, dans des navigateurs sans fenêtre et avec des données synthétiques.

Un nouveau changement de section interrompt les attentes du précédent : une préparation ou une lecture lente ne retient plus les clics suivants. Les rendus Mémo et Coffre vérifient après leurs lectures asynchrones qu’ils concernent toujours la demande active avant de modifier l’écran. Une réponse abandonnée ne remplace donc pas la nouvelle section. Le test de navigation suspend séparément une préparation et un rendu, les termine après le changement suivant, puis effectue 100 changements avec les boutons des quatre sections en vérifiant la conservation du brouillon et la réactivation du contenu.

La synchronisation télécharge et déchiffre sa réponse hors de la file des opérations de stockage. Seule son application locale entre dans cette file ; une réponse ancienne est ignorée si un enregistrement a modifié la version pendant le téléchargement. Les lectures locales et les enregistrements restent donc disponibles pendant une requête d’actualisation lente. Sécurité affiche sa structure sans attendre le chargement des postes, qui continue en arrière-plan. Le retour à un Mémo conservé ne relance pas ses migrations. Les rendus demandés dans une même tâche sont regroupés dans une microtâche, sans attendre une image d’animation ; les animations de déverrouillage et des paramètres restent indépendantes. L’arrivée des données distantes dépend toujours du serveur et du réseau. Vérifications supplémentaires : `node --test tests/cloud.test.mjs` et `python tests/shared_workspace_test.py` (réponse de synchronisation suspendue, navigation et enregistrement concurrents).

L’ouverture d’une fiche Mémo et la recherche lisent une copie de la dernière version confirmée en mémoire, sans attendre les statistiques ou autres écritures en cours. Ces lectures d’affichage restent distinctes de `get`, `all`, `flush` et des mutations, qui conservent leur ordre d’exécution. Ouvrir une fiche depuis le catalogue conserve l’arborescence et met seulement à jour sa sélection ; un accès direct à une fiche ne rend plus d’abord tout le catalogue. Les statistiques et l’historique continuent d’être enregistrés. Le test partagé suspend réellement la confirmation des statistiques d’une fiche et vérifie que la suivante s’affiche, tandis qu’une lecture ordinaire attend toujours la confirmation de l’écriture.

La fiche reprend une présentation de console de gestion de postes, inspirée de FortiClient EMS : navigation compacte à gauche, en-tête fixe avec actualisation et retour au parc. « Vue d’ensemble » présente un seul bandeau de synthèse pour l’état de sécurité et les compteurs, puis deux panneaux : « Protection du poste » regroupe les protections natives et WolfGuard Antivirus ; « Poste et agent » rassemble l’identité, la version, la politique EDR configurée, le dernier contact et la maintenance. Les informations sont disposées en lignes compactes avec des libellés courts. Le bleu identifie les informations du poste ; les états confirmés utilisent le vert, les points d’attention l’orange, les erreurs et menaces actives le rouge. Les états non confirmés restent gris et explicitement libellés. La politique configurée n’est pas présentée comme une preuve d’application. Les données communes ne sont pas répétées dans la navigation. Sur un écran de 1440 × 1000, les informations essentielles restent visibles sans défilement ; les écrans plus petits conservent un défilement vertical. « Outils » présente les accès à distance et diagnostics sous forme de lignes d’action ; « Détails » conserve la politique EDR et les identifiants techniques. Un rafraîchissement conserve la rubrique, l’ouverture des détails, le focus et la position de défilement. La navigation se parcourt aussi avec les flèches, Début et Fin ; elle devient horizontale sur téléphone. Une valeur inconnue n’est pas remplacée par zéro. Les informations matérielles et réseau absentes de la collecte ne sont pas inventées.

L’en-tête du parc possède **un seul bouton « Gérer les agents »**. L’ajout de postes reste dans cette fenêtre, à l’onglet « Ajouter un poste » ; ne pas réintroduire un bouton d’ajout séparé ni un second accès de gestion dans la fiche. Les droits poste par poste et les limitations hors ligne restent appliqués.

Le tableau conserve le tri, la recherche, les filtres et les états de mise à jour. Ses lignes sont plus espacées et les dates abrégées. Sur téléphone, chaque ligne devient une carte du poste sans défilement horizontal ; une sélection de colonne et un bouton de sens remplacent les en-têtes de tri. Le clic simple ouvre toujours la fiche ; clic droit et appui long conservent les options. Le rafraîchissement manuel reste à côté des filtres.

La section Données ne propose plus de sauvegardes utilisateur. Les anciens formats et outils de migration conservés dans le code servent à la compatibilité ; ne pas les remettre dans le parcours courant.

L’enregistrement partagé envoie directement la copie chiffrée avec la version de l’espace chargé, sans téléchargement préalable ni double chiffrement systématique. Le serveur vérifie cette version de façon atomique. Si une autre personne a enregistré entre-temps, le navigateur recharge la copie récente et fusionne les changements indépendants avant de réessayer (trois tentatives au total). Deux modifications incompatibles du même contenu restent refusées et le brouillon chiffré est conservé sur l’appareil. L’indicateur « Synchronisé » attend toujours la confirmation distante et l’écriture locale. Vérifications : `node --test tests/cloud.test.mjs tests/shared-workspace.test.mjs` et `python tests/shared_workspace_test.py` (sans fenêtre, données synthétiques).

## Scans et cartographie

Les quatre scans conservent leurs cibles et réglages séparément pendant la session. Les écrans servent uniquement au lancement, à la progression et à l’arrêt ; aucune prévisualisation du rapport ni export direct ne s’y affiche. Le poste choisi peut être commun. L’état occupé appartient au poste ; arrêter une rubrique ne doit pas arrêter arbitrairement une autre opération.

La cartographie représente des observations réseau, pas un schéma de câblage. Les noms doivent venir des observations DNS, les hôtes de réponses effectives, les sauts de parcours d’une réponse réelle de traçage. Ne pas inventer un nom, un saut ou une liaison physique.

Le travail local sur la cartographie prévoit jusqu’à 2 048 adresses par relevé, avec priorité aux passerelles et voisins connus et indication des grands réseaux partiellement explorés. Des changements de scans peuvent rester en attente dans Git : vérifier le diff et les tests avant d’annoncer leur disponibilité en production.

## Rapports et CERT-FR

Les rapports PDF se téléchargent uniquement dans la fiche du poste, onglet Historique. Cet historique couvre les quatre types de scan, filtre côté serveur par identifiant de poste, propose recherche, dates, état, pagination, PDF individuel et ZIP de PDF. Le bouton global « Rapports des scans », les historiques par outil et les boutons « Ouvrir » sont retirés. Les archives locales sans identifiant de poste restent stockées, sans attribution arbitraire à une machine. La fermeture ou le changement de poste annule les téléchargements en préparation.

Les rapports rapprochent les produits et versions observés des catalogues publics officiels CERT-FR. Le serveur ne transmet pas les IP ou noms de postes pour cette consultation. Les résultats distinguent correspondance de version, applicabilité à vérifier, produit non identifiable et absence de résultat.

Les versions rétroportées, avis multi-produits, échecs réseau et limites de catalogue doivent rester visibles. Une absence de correspondance ne confirme pas l’absence de vulnérabilité. Les références et liens des bulletins sont conservés dans les rapports et exports disponibles.

## Protection du poste et prise en main

Les rubriques Protection, Quarantaine et Journal de la fiche regroupent WolfGuard Antivirus avec ClamAV, la politique, les fichiers isolés et les événements. La page EDR séparée et le lien « Gérer dans EDR » sont supprimés. Les anciens accès ouvrent directement Protection dans la fiche. Il sépare protection active, état ancien, erreur de collecte et action confirmée. Les actions de protection nécessitent les droits correspondants. La [couverture antivirus actuelle](antivirus.md) reste réactive et limitée aux dossiers indiqués.

Bureau, terminal et fichiers sont des modes distincts, contrôlés côté API. Chaque nouvelle session exige une popup sur le poste distant, avec « Autoriser cette session » et « Refuser ». Aucun accès ne démarre sans accord explicite, y compris pour le terminal et les fichiers. Après une minute sans réponse, en cas de fermeture, de refus ou de popup indisponible, la demande est refusée. L’API bloque les actions avant cet accord et refuse les agents trop anciens ; les permissions et l’association restent nécessaires. Les transferts sont limités au périmètre accepté par l’agent et ne doivent pas écraser silencieusement des fichiers.

## Installation et mise à jour

Un lien de téléchargement personnel peut associer un poste une seule fois pendant sa durée limitée. Les téléchargements Windows/Linux/macOS et le désinstalleur restent accessibles depuis les outils d’agents.

Le travail local permet la mise à jour d’un poste depuis ses détails : téléchargement de la version publiée, contrôle SHA-256 et redémarrage avec conservation de l’association. Le succès exige le retour de la version attendue. Vérifier le module de mise à jour et les changements Git en attente avant de modifier ce flux ; une tâche en cours ou des droits insuffisants doivent bloquer l’action. Le composant de protection privilégié POSIX garde son installation distincte.

## Rapport du 26 novembre 2026

Le déplacement d’une fiche ou d’un dossier conserve le dossier consulté. Le coffre regroupe le titre et l’URL dans la colonne Accès, avec une commande de copie juste à côté de chaque valeur et sans répéter le nom. Les colonnes Dossier, Protection et Actions restent alignées, même sans dossier. Les longs titres se replient sur petit écran ; les URL restent sur une ligne avec une ellipse, leur valeur complète étant disponible au survol et à la copie. La fiche permet aussi de copier l’identifiant, le mot de passe et l’hôte.

Dans les mémos, sélectionner une cellule affiche la barre Tableau : fond sur les cellules sélectionnées, la ligne ou le tableau, suppression du fond et ajout/retrait de lignes et colonnes. Glisser près du bord droit d’une cellule règle la largeur, près du bord inférieur la hauteur. Les modifications se sauvegardent et s’annulent. Les couleurs explicites gardent la priorité sur les couleurs par défaut, notamment pour la cellule Économie du mémo russe. Aucun contenu personnel n’est réécrit automatiquement pour cette correction d’affichage. Les champs de mots clés sont retirés de la présentation, avec conservation des anciennes métadonnées pour la recherche.

Données propose Importer et Exporter. Un code de transfert de huit chiffres chiffre le fichier ; seuls les documents autorisés sont exportés. L’import demande ce code et une confirmation du nombre de fiches, puis ajoute des copies dans les dossiers importés. Les secrets du coffre sont rechiffrés avec la clé du nouvel espace. Les données existantes, comptes et groupes restent en place. Un fichier endommagé, un code erroné ou des droits insuffisants annulent l’opération complète.

Les enregistrements multiples du même éditeur sont empêchés. Les erreurs conservent les formulaires ; les lectures du coffre affichent le dernier état confirmé pendant les écritures de fond. Une panne de connexion à l’ouverture du lien privé propose Réessayer.

Vérification synthétique sans fenêtre : `python tests/rapport_improvements_test.py`. Groupes et Blocage : voir [Droits](droits.md) et [Sécurité](securite.md).

## Coffre-fort : robustesse, TOTP et import

Source : `app/js/views/vault-tools.js` (fonctions sans dépendance, testées par `tests/vault-tools.test.mjs`), `vault.js` et `vault-import.js`.

- **Robustesse** : une barre et un libellé (Très faible à Très fort, estimation en bits) s’affichent pendant la saisie et sur la fiche. Il s’agit d’une estimation (taille du jeu de caractères, répétitions, suites, mots courants), pas d’une garantie.
- **Réutilisation** : la fiche signale les autres accès du coffre qui ont exactement le même mot de passe. La comparaison se fait dans le navigateur, après déchiffrement.
- **Fuites connues** : le bouton « Vérifier les fuites » interroge `api.pwnedpasswords.com` par k-anonymat : seuls 5 caractères de l’empreinte SHA-1 sont envoyés, sans cookie ni référent, et uniquement sur clic. Ce service est le seul domaine externe autorisé par la politique de sécurité de la page (voir [Sécurité](securite.md)).
- **TOTP** : champ « Secret TOTP » (clé Base32 ou lien `otpauth://`, SHA-1, SHA-256 ou SHA-512, 6 à 8 chiffres, période de 10 à 120 s). Le code courant et le compte à rebours s’affichent sur la fiche, avec copie. Le secret est chiffré avec le reste de la fiche ; un secret invalide bloque l’enregistrement et laisse le brouillon ouvert.
- **Partage à usage unique** : sur une fiche, « Créer un lien… » (espace partagé connecté, droit `vault.secrets`). Les champs choisis sont chiffrés dans le navigateur (AES-256-GCM) avec une clé aléatoire placée dans le fragment du lien ; le serveur ne garde que le texte chiffré et une empreinte de l’identifiant. Validité 1 h, 24 h ou 7 j, 20 liens actifs au plus par compte. Le destinataire n’a pas besoin de compte : la page publique `share.html` ne contacte le serveur qu’au clic, affiche les champs (mot de passe masqué), détruit le lien et retire la clé de la barre d’adresse. Le créateur peut annuler un lien tant qu’il n’est pas ouvert. Sources : `app/js/share-crypto.js`, `app/js/views/vault-share.js`, `app/share.html`, `app/js/share.js`, `server/lib/wolfguard/share.mjs`.
- **Import CSV** : bouton « Importer des accès (CSV) » de la barre du coffre. Formats reconnus par leurs en-têtes : Bitwarden, KeePass, 1Password, Chrome, Edge, Firefox et CSV générique. Le fichier (5 Mo, 5 000 lignes maximum) est lu dans le navigateur, un aperçu sans mot de passe indique les accès prêts, les doublons ignorés (même nom, identifiant et URL) et les secrets TOTP invalides, puis chaque accès est chiffré à l’import dans le dossier ouvert. Le fichier n’est pas conservé : il faut le supprimer soi-même.

## Modèles de fiches

Le Mémo contient un dossier **Modèles** à la racine avec six fiches prêtes à remplir : procédure, compte rendu d’incident, mise en service d’un poste, compte rendu de réunion, fiche équipement ou serveur, demande de changement. Le bouton « Utiliser ce modèle » (ou « Dupliquer » du clic droit) crée une fiche ordinaire à la racine du Mémo, avec un titre neutre, et l’ouvre en modification ; le modèle reste intact.

Les modèles sont ajoutés une seule fois, avec les autres migrations atomiques de `ensureUnifiedLibrary()` (`app/js/data/memo-templates.js`, marqueur `memo-templates-version`). Un modèle ou un dossier supprimé n’est jamais recréé, une modification n’est jamais écrasée. Vérifications : `node --test tests/memo-templates.test.mjs` et `python tests/memo_templates_test.py`.

## État du parc

Dans la section Sécurité, le bouton **État du parc** ouvre une vue d’ensemble des postes visibles avec tes droits : nombre de postes, en ligne et hors ligne, protégés et à surveiller, alertes non acquittées, menaces bloquées sur 24 h et agents à mettre à jour. La liste « Postes à surveiller » classe les postes par risque avec leurs raisons (hors ligne, protection à vérifier, alertes, agent ancien). L’état de protection n’apparaît qu’avec le droit `edr.read`. Le bouton **Exporter en PDF** produit un rapport A4 paysage : synthèse, postes à surveiller, puis tous les postes classés par risque. Aucune nouvelle route serveur : la vue réutilise `agents`, `edr` et la publication de l’agent. Source : `app/js/ui/fleet-overview.js`, test `tests/fleet-overview.test.mjs`.

## Recherche globale

`Ctrl+K` (ou `Cmd+K`) ouvre la recherche sur les fiches du Mémo, les outils, le Coffre-fort et les onglets des Paramètres. Le filtre propose Tout, Mes fiches, Coffre-fort, Outils et Paramètres. Le coffre n’est indexé que par son titre, son dossier et ses étiquettes : un identifiant, un mot de passe ou une note n’est jamais recherché. Les onglets de paramètres proposés suivent les droits du compte ; choisir un résultat ouvre l’onglet. Sources : `app/js/search/engine.js`, `controller.js`, test `tests/global_search_test.py`.

## Accessibilité

- Le focus clavier est toujours visible (contour de 2 px de la couleur d’accent) sur les liens, boutons, champs et éléments focalisables, même là où un style retirait le contour ; un clic à la souris n’affiche pas ce contour (`:focus-visible`, fin de `app/css/base.css`).
- Les tailles de texte sont exprimées en `rem` : à réglage par défaut du navigateur, le rendu est identique, et une taille de texte plus grande choisie dans le navigateur s’applique à toute l’application, en plus du réglage « Taille du texte » de l’onglet Interface.
- Les couleurs principales des trois ambiances (texte, texte secondaire, texte discret et accent sur les fonds) dépassent le seuil WCAG AA de 4,5:1 (5,5:1 au minimum). Les couleurs fixées dans certains composants ne sont pas toutes vérifiées.
