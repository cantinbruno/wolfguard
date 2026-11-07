# Droits avancés WolfGuard

Dans **Paramètres → Utilisateurs**, le propriétaire ouvre **Droits et périmètres** sur un compte. Les nouveaux comptes commencent avec **Aucun accès**, y compris lorsqu’ils utilisent un lien d’invitation créé avant cette version. Les comptes déjà existants conservent leur profil **Accès existants** jusqu’à modification.

Les profils Lecture seule, Collaborateur, Analyste sécurité et Technicien fournissent un point de départ. Chaque action peut ensuite être accordée séparément : bibliothèque, coffre-fort et secrets, quatre types de scans, exports, agents, bureau distant, terminal, comptes et consultation des connexions. Seul le propriétaire attribue les droits et modifie les blocages IP ; son compte conserve tous les droits.

Les périmètres de bibliothèque et de coffre-fort fonctionnent indépendamment : accès à tous les dossiers, ou uniquement à une sélection. Une règle de fiche prime sur les règles de ses dossiers. Les sous-dossiers héritent du parent. Chaque règle peut refuser l’accès, autoriser la lecture ou autoriser les modifications. Les actions globales restent nécessaires : une règle « Modification » n’accorde pas à elle seule la suppression ou l’export. Une destination de déplacement doit aussi être autorisée.

Les postes peuvent être limités individuellement. Les scans et rapports sont filtrés selon leur type et leur poste, y compris via l’API directe. Bureau et terminal sont deux droits distincts. Associer de nouveaux postes nécessite un périmètre couvrant aussi les futurs postes.

Une date de fin peut limiter les autorisations. Chaque changement déconnecte les sessions du compte, change sa clé de copie restreinte, ferme ses prises en main et annule ses scans. L’expiration est contrôlée côté serveur, y compris lorsque le navigateur est fermé. Le journal conserve les 2 000 derniers changements chiffrés ; l’écran affiche les 100 plus récents avec auteur, motif, révision et état avant/après. Une sauvegarde concurrente de droits périmés est refusée.

Les gestionnaires de comptes délégués ne peuvent ni modifier leur propre compte, ni gérer le propriétaire, ni attribuer des droits. Pour empêcher une prise de contrôle par réinitialisation du code ou de la MFA, ils ne peuvent gérer que des membres dont les droits sont contenus dans les leurs. Pour les périmètres comportant des exceptions, cette vérification exige des règles identiques ; le propriétaire peut gérer les autres cas.

## Application réelle des restrictions

Les membres reçoivent une copie filtrée, chiffrée avec une clé propre à leur compte et à la révision de leurs droits. La clé maîtresse et les enregistrements interdits ne leur sont pas transmis. Les secrets du coffre-fort sont absents sans le droit de déchiffrement ; lorsqu’il est accordé, leur chiffrement est adapté à la clé du membre. Le serveur vérifie les écritures puis les fusionne dans la copie complète en préservant les données invisibles. Les réglages partagés restent gérés par le propriétaire ; les préférences des membres restent locales à leur session navigateur.

Les copies restreintes sont actuellement limitées à une base chiffrée de **8 Mo** pour respecter la mémoire du serveur. Au-delà, leur accès est refusé explicitement. Le propriétaire conserve l’accès complet et peut réduire les pièces jointes. Les sauvegardes complètes du propriétaire gardent leur limite habituelle.

Les données consultées ou exportées auparavant ne peuvent pas être effacées à distance. Cela concerne aussi les données et clés reçues par des membres avant cette version. Les restrictions empêchent la récupération de nouvelles données interdites auprès du serveur. L’autorisation de lire un secret permet également de le recopier ; la restriction d’export encadre les commandes d’export de l’application. Les outils exécutés uniquement dans le navigateur restent reproductibles hors de l’application.

La connexion personnelle, l’identification par e-mail, la notification MFA principale, Authenticator en secours et le délai d’inactivité d’une heure sont conservés.

## Vérification

`node --test tests/permissions.test.mjs` couvre le chiffrement, le filtrage, les écritures forgées, les droits de dossiers, les postes, les scans, la prise en main, la délégation, l’expiration, la révocation et le journal. `python tests/permissions_workspace_test.py` vérifie ces parcours dans Chromium sans fenêtre, y compris sur mobile et après actualisation.
