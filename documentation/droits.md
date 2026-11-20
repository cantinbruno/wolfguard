# Droits, postes et confidentialité

## Sections et comptes

La gestion repose sur cinq rôles :

- **Propriétaire** : le compte d’origine, protégé, avec tous les droits. Ce rôle ne s’attribue pas à un autre compte.
- **Administrateur** : écriture partout, y compris les utilisateurs, les droits et les connexions.
- **Éditeur** : écriture partout sauf dans Utilisateurs et droits, qui reste en lecture.
- **Observateur** : lecture de toutes les sections, sans modification.
- **Invité** : rôle initial des nouveaux comptes et invitations ; toutes les sections sont invisibles.

Les coffres personnels et les postes réservés conservent leurs protections pour chaque rôle. Les anciens profils restent lisibles sans élargir leurs autorisations ; un compte qui ne correspond à aucun rôle est signalé comme « Personnalisé ».

Dans Paramètres → Utilisateurs et droits, la liste indique le rôle de chaque compte. La fiche présente un seul titre « Rôle et accès », quatre choix compacts et une description du rôle sélectionné. La barre d’enregistrement apparaît uniquement lorsqu’il y a des modifications. Les réglages par section, par poste, la durée et le motif sont regroupés dans « Options avancées » ; le lien « Accès aux postes » ouvre directement les droits individuels. Choisir un rôle conserve la date d’expiration et les restrictions par poste ; les restrictions héritées sur les dossiers sont remplacées par les droits du rôle choisi. « Appliquer à toutes les sections » conserve les restrictions de dossiers existantes. Enregistrer révoque les sessions concernées. En cas d’échec, les modifications restent disponibles pour réessayer. Vérifications : `python tests/permissions_workspace_test.py` et `python tests/users_workspace_test.py`, sans fenêtre et avec des comptes synthétiques.

Les nouvelles invitations commencent sans droits. Un gestionnaire délégué ne peut pas dépasser son propre périmètre, prolonger un droit au-delà de sa date de fin ni prendre le contrôle du propriétaire.

## Chaque poste a ses limites

Les niveaux de `agentLevels` sont réglables poste par poste : `read`, `write`, `deny`. Ils **restreignent** les permissions de section, sans jamais les augmenter. Ainsi, `write` sur un poste ne transforme pas une section globale Lecture en Écriture.

Les anciennes listes de postes autorisés restent prises en compte. L’interrupteur « Réservé aux administrateurs et au propriétaire » se trouve dans la vue d’ensemble de la fiche du poste. Il s’enregistre immédiatement. Le poste devient invisible et inaccessible aux autres rôles dans l’inventaire, les scans et leurs historiques, l’EDR, le bureau, le terminal et les fichiers. Connaître son identifiant ne contourne pas ces contrôles. L’ajout est réservé aux comptes qui ont le droit `agents.pair` ; la révocation se trouve dans la fiche et demande `agents.revoke` ainsi que l’écriture sur le poste concerné.

Le modèle commun est `server/lib/wolfguard/permissions.mjs`. Le build génère sa copie `browser/permissions.js`. L’API reste l’autorité ; masquer un bouton ne suffit pas à protéger une opération.

## Coffres et partage

Les coffres sont personnels, administrateurs compris. Le serveur filtre la copie remise au navigateur et utilise une clé liée au compte et à la révision des droits. Les écritures doivent préserver les données invisibles et contrôler les conflits de version.

Les changements de droits sont versionnés, journalisés sous chiffrement et révoquent les accès concernés, y compris les opérations en cours. Supprimer un compte retire son coffre de la copie courante ; les copies techniques de récupération déjà présentes ne sont pas des données à effacer lors d’une réorganisation du code.

Les anciennes politiques restent lisibles sans élargissement de droits. `vault.all` n’ouvre pas les coffres des autres comptes.

## Sessions et limites

Une session expire après **4 heures d’inactivité**. Les changements de droits, verrouillages et révocations peuvent la terminer plus tôt. Les requêtes en arrière-plan ne prolongent pas à elles seules la session.

Les données précédemment consultées ou exportées ne peuvent pas être effacées à distance. Les permissions protègent les réponses et opérations suivantes du serveur.

Tests principaux : `tests/permissions.test.mjs`, `tests/access.test.mjs`, `tests/security_permissions_test.py`, `tests/users.test.mjs`.
