# Droits et confidentialité

L’administrateur ouvre Paramètres → Utilisateurs et droits, sélectionne un compte puis choisit Lecture, Écriture ou Invisible pour chaque section : Mémo, Coffre-fort, les quatre scans, Prise en main, Agents, EDR, Outils, Utilisateurs et Connexions. La case Administrateur donne l’écriture sur toutes les sections. Le compte propriétaire reste protégé contre la suppression et la désactivation.

Lecture autorise la consultation et les exports. Écriture permet aussi la création, les modifications, les suppressions et les actions propres à la section. Une prise en main ou une action de protection exige l’écriture. Invisible retire la section de la navigation et refuse ses accès directs sur le serveur. Les nouvelles invitations commencent sans droits ; l’utilisateur choisit lui-même son code et son Authenticator.

Les coffres restent individuels pour tous les comptes, y compris les administrateurs. La copie remise au navigateur ne contient aucun enregistrement du coffre d’un autre compte. Sa clé est propre au compte et à la révision des droits ; les secrets imbriqués sont rechiffrés pour cette clé. Les écritures sont contrôlées et fusionnées côté serveur en préservant les données invisibles. Supprimer un compte révoque ses sessions et supprime son coffre de la copie courante ; les anciennes sauvegardes chiffrées de récupération sont conservées.

Dans Agents, la case Restreint réserve un poste aux administrateurs dans toutes les sections et API : inventaire, scans et historiques, EDR, bureau, terminal, fichiers et anciennes opérations IA. Un utilisateur ne peut pas contourner cette restriction en connaissant l’identifiant du poste. Les restrictions s’appliquent aussi aux opérations déjà en cours.

Les changements de droits sont versionnés et journalisés sous chiffrement. Ils révoquent les sessions du compte et arrêtent ses opérations en cours. Une modification basée sur une ancienne révision est refusée. Un gestionnaire délégué ne peut pas dépasser son propre périmètre, s’octroyer des droits ou prendre le contrôle du propriétaire.

Les anciennes politiques et leurs limites par dossier/poste sont conservées à la lecture. Une modification dans la nouvelle matrice remplace les règles de données détaillées par les niveaux affichés ; les anciennes limitations de postes restent conservées. Le droit historique vault.all n’accorde plus l’accès aux coffres des autres comptes.

Les données précédemment consultées ou exportées ne peuvent pas être effacées à distance. Les restrictions protègent les nouvelles réponses du serveur ; les sauvegardes restent des copies distinctes. Les sessions n’expirent plus automatiquement et une connexion validée au même compte reprend la session existante. Le verrouillage explicite ou la révocation met fin à ses accès.
