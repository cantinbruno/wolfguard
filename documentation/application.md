# Fonctionnement de l’application

Cette page décrit le source du projet. Pour connaître ce qui est effectivement publié, vérifier les commits et les déploiements.

## Navigation et données

Le Mémo conserve les dossiers, sous-dossiers, fiches, contenus riches, images, pièces jointes, commandes et recherches. Le Coffre-fort classe les accès et masque les champs sensibles ; il reste personnel, y compris pour les administrateurs. Outils regroupe les utilitaires réseau et de fichiers.

L’écran Sécurité conserve le poste choisi pendant l’utilisation de ses outils : scans, cartographie, vulnérabilités, EDR, bureau, terminal et fichiers. Un simple clic sur le nom ou une cellule du poste ouvre sa fiche. Le clic droit et l’appui long ouvrent les options du poste. Les paramètres regroupent les protections de l’application, Authenticator, les préférences et les écrans d’administration autorisés.

La fiche présente l’identité et la connexion du poste, ses protections récentes, WolfGuard Antivirus, les alertes et les outils regroupés par usage. La maintenance et la mise à jour de l’agent sont directement accessibles. Les identifiants complets et la politique EDR sont repliables ; un rafraîchissement conserve leur ouverture et le focus. Une valeur inconnue n’est pas remplacée par zéro.

« Gérer les agents » ouvre explicitement la liste de gestion : choix du poste utilisé, options de visibilité et révocation confirmée. « Ajouter un agent » ouvre directement l’installation, même après le premier chargement ou avec une liste vide. Ces deux destinations sont distinctes. « Gérer ce poste » depuis une fiche déplie l’agent concerné ; fermer la gestion revient à sa fiche. Les droits poste par poste et les limitations hors ligne restent appliqués.

La section Données ne propose plus de sauvegardes utilisateur. Les anciens formats et outils de migration conservés dans le code servent à la compatibilité ; ne pas les remettre dans le parcours courant.

## Scans et cartographie

Les quatre scans conservent leurs cibles, réglages, filtres, résultats et références de comparaison séparément pendant la session. Le poste choisi peut être commun. L’état occupé appartient au poste ; arrêter une rubrique ne doit pas arrêter arbitrairement une autre opération.

La cartographie représente des observations réseau, pas un schéma de câblage. Les noms doivent venir des observations DNS, les hôtes de réponses effectives, les sauts de parcours d’une réponse réelle de traçage. Ne pas inventer un nom, un saut ou une liaison physique.

Le travail local sur la cartographie prévoit jusqu’à 2 048 adresses par relevé, avec priorité aux passerelles et voisins connus et indication des grands réseaux partiellement explorés. Des changements de scans peuvent rester en attente dans Git : vérifier le diff et les tests avant d’annoncer leur disponibilité en production.

## Rapports et CERT-FR

Les rapports rapprochent les produits et versions observés des catalogues publics officiels CERT-FR. Le serveur ne transmet pas les IP ou noms de postes pour cette consultation. Les résultats distinguent correspondance de version, applicabilité à vérifier, produit non identifiable et absence de résultat.

Les versions rétroportées, avis multi-produits, échecs réseau et limites de catalogue doivent rester visibles. Une absence de correspondance ne confirme pas l’absence de vulnérabilité. Les références et liens des bulletins sont conservés dans les rapports et exports disponibles.

## EDR et prise en main

L’EDR distingue WolfGuard Antivirus avec ClamAV et les protections natives. Il sépare protection active, état ancien, erreur de collecte et action confirmée. Les actions de protection nécessitent les droits correspondants. La [couverture antivirus actuelle](antivirus.md) reste réactive et limitée aux dossiers indiqués.

Bureau, terminal et fichiers sont des modes distincts, contrôlés côté API. Un agent associé peut accepter une prise en main sans confirmation locale ; l’association et les droits sont donc déterminants. Les transferts sont limités au périmètre accepté par l’agent et ne doivent pas écraser silencieusement des fichiers.

## Installation et mise à jour

Un lien de téléchargement personnel peut associer un poste une seule fois pendant sa durée limitée. Les téléchargements Windows/Linux/macOS et le désinstalleur restent accessibles depuis les outils d’agents.

Le travail local permet la mise à jour d’un poste depuis ses détails : téléchargement de la version publiée, contrôle SHA-256 et redémarrage avec conservation de l’association. Le succès exige le retour de la version attendue. Vérifier le module de mise à jour et les changements Git en attente avant de modifier ce flux ; une tâche en cours ou des droits insuffisants doivent bloquer l’action. Le composant de protection privilégié POSIX garde son installation distincte.
