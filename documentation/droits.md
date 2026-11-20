# Droits, postes et confidentialité

## Sections et comptes

La gestion repose sur cinq rôles :

- **Propriétaire** : le compte d’origine, protégé, avec tous les droits. Ce rôle ne s’attribue pas à un autre compte.
- **Administrateur** : écriture partout, y compris les utilisateurs, les droits et les connexions.
- **Éditeur** : écriture partout sauf dans Utilisateurs et droits, qui reste en lecture.
- **Observateur** : lecture de toutes les sections, sans modification.
- **Invité** : rôle initial des nouveaux comptes et invitations ; toutes les sections sont invisibles.

Les coffres personnels restent isolés. Les postes héritent des droits de leur groupe. Les anciens profils restent lisibles sans élargir leurs autorisations ; un compte qui ne correspond à aucun rôle est signalé comme « Personnalisé ».

Dans **Paramètres → Groupes**, créer et nommer les groupes d’autorisations, configurer leur rôle, leurs sections, leur durée, les accès aux groupes de postes et leurs membres. Un utilisateur appartient à un seul groupe ; tous ses droits viennent de ce groupe, sans surcharge individuelle. Les niveaux de poste restent limités par les sections du groupe. Le propriétaire reste protégé et conserve ses droits complets.

La section **Utilisateurs et droits** affiche le groupe de chaque utilisateur et permet son affectation, ainsi que les opérations de compte : adresse, MFA, sessions, activation et suppression. L’ancien éditeur individuel et son onglet de droits de postes sont retirés. Les changements de groupe en attente sont conservés entre Groupe et Compte et demandent confirmation avant abandon.

Le premier chargement des paramètres par le propriétaire reprend les politiques existantes dans des groupes équivalents. Les politiques différentes restent séparées, y compris les restrictions héritées et les dates de fin. Les anciens champs individuels restent une source de migration avant activation, puis sont ignorés par le calcul des droits et les modifications individuelles sont refusées. La reprise vérifie atomiquement les révisions des comptes et des groupes de postes. Les nouveaux comptes sont dans **Invités**, groupe protégé sans accès. La duplication reprend les droits d’un groupe sans ses membres ; un groupe occupé ne peut pas être supprimé.

Modifier les droits d’un groupe révoque les sessions et les opérations de tous ses membres ; déplacer un membre ne touche que ce membre. Les versions des comptes changent dans la même transaction que le groupe. Un gestionnaire délégué ne peut attribuer des droits au-delà de son propre périmètre ni de son échéance. Le journal chiffré conserve l’auteur, les changements et leurs membres ; le bouton **Journal des droits** est dans la section Groupes.

Vérifications : `node --test tests/access-groups.test.mjs`, `python tests/permissions_workspace_test.py`, `python tests/security_permissions_test.py`, `python tests/users_panes_test.py`. Les fixtures utilisent des comptes et postes synthétiques, dans un navigateur sans fenêtre.

## Droits hérités du groupe

Les groupes du tableau Sécurité sont partagés et enregistrés chiffrés côté serveur, dans `fleet_groups`. Chaque poste appartient à un groupe ; les nouvelles associations arrivent dans « Sans groupe ». Paramètres → **Groupes** → choisir un groupe d’autorisations règle `groupLevels` : Lecture, Écriture ou Invisible. Ces niveaux limitent les permissions générales des outils ; ils ne peuvent pas les augmenter. Un groupe absent de la liste de droits est invisible par défaut. Le propriétaire et les administrateurs actifs conservent l’accès complet.

La gestion individuelle des postes et l’interrupteur « Réservé aux administrateurs » sont retirés. Les anciennes politiques restent comprises uniquement avant l’activation des groupes. Le premier chargement des groupes par le propriétaire importe les noms et affectations existants. Le serveur répartit les postes selon leurs anciens accès effectifs, avec des groupes de compatibilité si nécessaire : aucune restriction individuelle ni réservation antérieure ne doit élargir l’accès pendant la transition. La configuration entière s’active atomiquement ; une modification concurrente des anciens droits ou des postes fait échouer l’import plutôt que d’écraser un changement.

Créer, renommer, dupliquer, supprimer et déplacer les membres sont réservés aux administrateurs. La duplication crée un groupe vide sans droits attribués. Le glisser-déposer déplace le poste saisi ou tous les postes cochés si le poste saisi est sélectionné. Le menu contextuel propose la même opération sur téléphone et au clavier. Déplier/replier tous les groupes reste une préférence personnelle. Supprimer un groupe replace ses postes dans « Sans groupe », avec les autorisations de ce groupe. Les révisions serveur refusent les écritures concurrentes obsolètes.

Le déplacement applique immédiatement les droits du groupe d’arrivée aux API de flotte, scans, historique, EDR, bureau, terminal et fichiers. Les scans et prises en main devenus interdits sont arrêtés. Les identifiants des postes invisibles ne sont pas projetés dans la politique du navigateur. Les lectures de la configuration sont mutualisées uniquement pendant une même requête serveur, sans cache global des permissions. Les changements de groupes et les droits sont consignés dans le journal chiffré des droits.

Vérifications synthétiques : `node --test tests/fleet-group-access.test.mjs tests/fleet-groups.test.mjs`, `python tests/fleet_groups_test.py`, `python tests/security_permissions_test.py`, `python tests/users_panes_test.py`. Les anciens tests des politiques individuelles vérifient la compatibilité avant activation ; les nouveaux contrôlent leur remplacement et le refus des anciens clients après activation.

## Coffres et partage

Les coffres sont personnels, administrateurs compris. Ouvrir le Coffre-fort sélectionne directement le dossier de l’adresse mail du compte connecté ; revenir à la racine conserve ce dossier personnel. Les sous-dossiers restent navigables. Le serveur filtre la copie remise au navigateur et utilise une clé liée au compte et à la révision des droits. Les écritures doivent préserver les données invisibles et contrôler les conflits de version.

Les changements de droits sont versionnés, journalisés sous chiffrement et révoquent les accès concernés, y compris les opérations en cours. Supprimer un compte retire son coffre de la copie courante ; les copies techniques de récupération déjà présentes ne sont pas des données à effacer lors d’une réorganisation du code.

Les anciennes politiques restent lisibles sans élargissement de droits. `vault.all` n’ouvre pas les coffres des autres comptes.

## Sessions et limites

Une session expire après **4 heures d’inactivité**. Les changements de droits, verrouillages et révocations peuvent la terminer plus tôt. Les requêtes en arrière-plan ne prolongent pas à elles seules la session.

Les données précédemment consultées ou exportées ne peuvent pas être effacées à distance. Les permissions protègent les réponses et opérations suivantes du serveur.

Tests principaux : `tests/permissions.test.mjs`, `tests/access.test.mjs`, `tests/security_permissions_test.py`, `tests/users.test.mjs`.
