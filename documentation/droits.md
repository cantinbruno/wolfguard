# Droits, postes et confidentialité

## Sections et comptes

La gestion repose sur cinq rôles :

- **Propriétaire** : le compte d’origine, protégé, avec tous les droits. Ce rôle ne s’attribue pas à un autre compte.
- **Administrateur** : écriture partout, y compris les utilisateurs, les droits et les connexions.
- **Éditeur** : écriture partout sauf dans Utilisateurs et droits, qui reste en lecture.
- **Observateur** : lecture de toutes les sections, sans modification.
- **Invité** : rôle initial des nouveaux comptes et invitations ; toutes les sections sont invisibles.

Les coffres personnels restent isolés. Les postes héritent des droits de leur groupe. Les anciens profils restent lisibles sans élargir leurs autorisations ; un compte qui ne correspond à aucun rôle est signalé comme « Personnalisé ».

Dans Paramètres → Utilisateurs et droits, la liste indique le rôle de chaque compte. La fiche propose trois vues : **Droits** pour choisir un rôle ou personnaliser les sections et la durée, **Groupes** pour les outils de sécurité et les accès aux groupes de postes, **Compte** pour renommer, consulter la MFA et les sessions ou agir sur le compte. Changer de vue conserve les modifications en cours sans recharger les droits. Un point indique un brouillon non enregistré ; la barre d’enregistrement apparaît uniquement après une modification et reste accessible en bas des vues Droits et Groupes. Choisir un rôle conserve la date d’expiration et les droits des groupes ; les restrictions héritées sur les dossiers sont remplacées par les droits du rôle choisi. « Appliquer à toutes les sections » conserve les restrictions de dossiers existantes. Enregistrer révoque les sessions concernées. En cas d’échec, les modifications restent disponibles pour réessayer. Vérifications : `python tests/permissions_workspace_test.py`, `python tests/users_workspace_test.py` et `python tests/users_panes_test.py`, sans fenêtre et avec des comptes synthétiques.

Les nouvelles invitations commencent sans droits. Un gestionnaire délégué ne peut pas dépasser son propre périmètre, prolonger un droit au-delà de sa date de fin ni prendre le contrôle du propriétaire.

Dans la vue Compte, les « Actions du compte » sont toujours dépliées : leurs boutons sont directement accessibles, y compris après un changement de compte ou une actualisation. Les confirmations et protections du propriétaire restent appliquées.

## Droits hérités du groupe

Les groupes du tableau Sécurité sont partagés et enregistrés chiffrés côté serveur, dans `fleet_groups`. Chaque poste appartient à un groupe ; les nouvelles associations arrivent dans « Sans groupe ». Paramètres → Utilisateurs et droits → choisir un compte → **Groupes** règle `groupLevels` : Lecture, Écriture ou Invisible. Ces niveaux limitent les permissions générales des outils ; ils ne peuvent pas les augmenter. Un groupe absent de la liste de droits est invisible par défaut. Le propriétaire et les administrateurs actifs conservent l’accès complet.

La gestion individuelle des postes et l’interrupteur « Réservé aux administrateurs » sont retirés. Les anciennes politiques restent comprises uniquement avant l’activation des groupes. Le premier chargement des groupes par le propriétaire importe les noms et affectations existants. Le serveur répartit les postes selon leurs anciens accès effectifs, avec des groupes de compatibilité si nécessaire : aucune restriction individuelle ni réservation antérieure ne doit élargir l’accès pendant la transition. La configuration entière s’active atomiquement ; une modification concurrente des anciens droits ou des postes fait échouer l’import plutôt que d’écraser un changement.

Créer, renommer, dupliquer, supprimer et déplacer les membres sont réservés aux administrateurs. La duplication crée un groupe vide sans droits attribués. Le glisser-déposer déplace le poste saisi ou tous les postes cochés si le poste saisi est sélectionné. Le menu contextuel propose la même opération sur téléphone et au clavier. Déplier/replier tous les groupes reste une préférence personnelle. Supprimer un groupe replace ses postes dans « Sans groupe », avec les autorisations de ce groupe. Les révisions serveur refusent les écritures concurrentes obsolètes.

Le déplacement applique immédiatement les droits du groupe d’arrivée aux API de flotte, scans, historique, EDR, bureau, terminal et fichiers. Les scans et prises en main devenus interdits sont arrêtés. Les identifiants des postes invisibles ne sont pas projetés dans la politique du navigateur. Les lectures de la configuration sont mutualisées uniquement pendant une même requête serveur, sans cache global des permissions. Les changements de groupes et les droits sont consignés dans le journal chiffré des droits.

Vérifications synthétiques : `node --test tests/fleet-group-access.test.mjs tests/fleet-groups.test.mjs`, `python tests/fleet_groups_test.py`, `python tests/security_permissions_test.py`, `python tests/users_panes_test.py`. Les anciens tests des politiques individuelles vérifient la compatibilité avant activation ; les nouveaux contrôlent leur remplacement et le refus des anciens clients après activation.

## Coffres et partage

Les coffres sont personnels, administrateurs compris. Le serveur filtre la copie remise au navigateur et utilise une clé liée au compte et à la révision des droits. Les écritures doivent préserver les données invisibles et contrôler les conflits de version.

Les changements de droits sont versionnés, journalisés sous chiffrement et révoquent les accès concernés, y compris les opérations en cours. Supprimer un compte retire son coffre de la copie courante ; les copies techniques de récupération déjà présentes ne sont pas des données à effacer lors d’une réorganisation du code.

Les anciennes politiques restent lisibles sans élargissement de droits. `vault.all` n’ouvre pas les coffres des autres comptes.

## Sessions et limites

Une session expire après **4 heures d’inactivité**. Les changements de droits, verrouillages et révocations peuvent la terminer plus tôt. Les requêtes en arrière-plan ne prolongent pas à elles seules la session.

Les données précédemment consultées ou exportées ne peuvent pas être effacées à distance. Les permissions protègent les réponses et opérations suivantes du serveur.

Tests principaux : `tests/permissions.test.mjs`, `tests/access.test.mjs`, `tests/security_permissions_test.py`, `tests/users.test.mjs`.
