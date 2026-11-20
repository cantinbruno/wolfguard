# Droits, postes et confidentialité

## Sections et comptes

La gestion repose sur cinq rôles :

- **Propriétaire** : le compte d’origine, protégé, avec tous les droits. Ce rôle ne s’attribue pas à un autre compte.
- **Administrateur** : écriture partout, y compris les utilisateurs, les droits et les connexions.
- **Éditeur** : écriture partout sauf dans Utilisateurs et droits, qui reste en lecture.
- **Observateur** : lecture de toutes les sections, sans modification.
- **Invité** : rôle initial des nouveaux comptes et invitations ; toutes les sections sont invisibles.

Les coffres personnels restent isolés. Les postes héritent des droits de leur groupe. Les anciens profils restent lisibles sans élargir leurs autorisations ; un compte qui ne correspond à aucun rôle est signalé comme « Personnalisé ».

Dans **Paramètres → Groupes**, créer et nommer les groupes d’autorisations, configurer leur rôle, leurs sections, leur durée, les accès aux sections de postes et leurs membres. Un utilisateur appartient à un seul groupe ; tous ses droits viennent de ce groupe, sans surcharge individuelle. Les niveaux de poste restent limités par les sections du groupe. Le propriétaire reste protégé et conserve ses droits complets.

La section **Utilisateurs et droits** affiche le groupe de chaque utilisateur et permet son affectation, ainsi que les opérations de compte : adresse, MFA, sessions, activation et suppression. L’ancien éditeur individuel et son onglet de droits de postes sont retirés. Les changements de groupe en attente sont conservés entre Groupe et Compte et demandent confirmation avant abandon.

Le premier chargement des paramètres par le propriétaire reprend les politiques existantes dans des groupes équivalents. Les politiques différentes restent séparées, y compris les restrictions héritées et les dates de fin. Les anciens champs individuels restent une source de migration avant activation, puis sont ignorés par le calcul des droits et les modifications individuelles sont refusées. La reprise vérifie atomiquement les révisions des comptes et des sections de postes. Les nouveaux comptes sont dans **Invités**, groupe protégé sans accès. La duplication reprend les droits d’un groupe sans ses membres ; un groupe occupé ne peut pas être supprimé.

Modifier les droits d’un groupe révoque les sessions et les opérations de tous ses membres ; déplacer un membre ne touche que ce membre. Les versions des comptes changent dans la même transaction que le groupe. Un gestionnaire délégué ne peut attribuer des droits au-delà de son propre périmètre ni de son échéance. Le journal chiffré conserve l’auteur, les changements et leurs membres ; le bouton **Journal des droits** est dans la section Groupes.

Vérifications : `node --test tests/access-groups.test.mjs`, `python tests/permissions_workspace_test.py`, `python tests/security_permissions_test.py`, `python tests/users_panes_test.py`. Les fixtures utilisent des comptes et postes synthétiques, dans un navigateur sans fenêtre.

## Sections de postes et groupes d’utilisateurs

Une **section de postes** organise les machines (Atelier, Bureau, Serveurs…). Un **groupe d’utilisateurs** rassemble les comptes et définit tous leurs droits, sur Mémo, Coffre-fort, les outils, les autres sections de l’application et les sections de postes. Ce sont les mêmes groupes partout ; aucun groupe d’autorisations distinct n’est créé pour les postes.

Dans Sécurité, créer, renommer, dupliquer, supprimer et déplacer des postes concerne les **sections**. Les noms existants, les affectations et le glisser-déposer sont conservés. La section par défaut s’appelle **Sans section** ; les nouveaux postes y arrivent. Dupliquer une section ne copie ni postes ni droits. Supprimer une section replace ses postes dans Sans section avec les droits définis pour cette destination.

Le bouton **Droits** de chaque section ouvre **Paramètres → Groupes** avec cette section indiquée et ses réglages mis en évidence. Choisir un groupe d’utilisateurs existant, puis attribuer Lecture, Écriture ou Invisible dans **Sections de postes**. Le même écran contient les droits de ce groupe sur Mémo, Coffre-fort et les autres sections. Les droits sur les postes sont limités par ceux des outils ; une section en Écriture ne peut pas augmenter une autorisation globale en Lecture. Une nouvelle section reste invisible par défaut pour les groupes non administrateurs.

Les contrôles serveur existants restent applicables à l’inventaire, aux scans et historiques, à l’EDR, au bureau, au terminal et aux fichiers. Déplacer un poste applique les droits de sa nouvelle section et arrête les opérations devenues interdites. Le propriétaire et les groupes administrateurs actifs gardent l’accès complet. Aucun droit individuel n’est réintroduit.

Les noms techniques `fleet_groups`, `groupLevels`, les identifiants et les routes historiques restent compatibles avec le stockage existant : ils représentent désormais les sections de postes dans l’interface. La table `access_groups` reste la source unique des groupes d’utilisateurs et de leurs politiques. Les changements sont consignés dans le journal chiffré des droits.

Vérifications : `python tests/fleet_groups_test.py` contrôle le raccourci de section, la réutilisation du même groupe que Mémo, la sauvegarde des droits, le glisser-déposer et les petits écrans ; `python tests/security_permissions_test.py` et `node --test tests/access-groups.test.mjs tests/fleet-group-access.test.mjs` contrôlent l’application des politiques partagées.

## Coffres et partage

Les coffres sont personnels, administrateurs compris. Ouvrir le Coffre-fort sélectionne directement le dossier de l’adresse mail du compte connecté ; revenir à la racine conserve ce dossier personnel. Les sous-dossiers restent navigables. Le serveur filtre la copie remise au navigateur et utilise une clé liée au compte et à la révision des droits. Les écritures doivent préserver les données invisibles et contrôler les conflits de version.

Les changements de droits sont versionnés, journalisés sous chiffrement et révoquent les accès concernés, y compris les opérations en cours. Supprimer un compte retire son coffre de la copie courante ; les copies techniques de récupération déjà présentes ne sont pas des données à effacer lors d’une réorganisation du code.

Les anciennes politiques restent lisibles sans élargissement de droits. `vault.all` n’ouvre pas les coffres des autres comptes.

## Sessions et limites

Une session expire après **4 heures d’inactivité**. Les changements de droits, verrouillages et révocations peuvent la terminer plus tôt. Les requêtes en arrière-plan ne prolongent pas à elles seules la session.

Les données précédemment consultées ou exportées ne peuvent pas être effacées à distance. Les permissions protègent les réponses et opérations suivantes du serveur.

Tests principaux : `tests/permissions.test.mjs`, `tests/access.test.mjs`, `tests/security_permissions_test.py`, `tests/users.test.mjs`.
