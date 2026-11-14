# Droits, postes et confidentialité

## Sections et comptes

La matrice propose Lecture, Écriture ou Invisible pour chaque section. Lecture permet les actions de consultation autorisées ; Écriture ajoute les modifications et opérations de la section ; Invisible masque la section et refuse l’accès direct sur l’API. La case Administrateur accorde l’écriture partout. Le propriétaire conserve ses protections particulières.

Les nouvelles invitations commencent sans droits. Un gestionnaire délégué ne peut pas dépasser son propre périmètre, prolonger un droit au-delà de sa date de fin ni prendre le contrôle du propriétaire.

## Chaque poste a ses limites

Les niveaux de `agentLevels` sont réglables poste par poste : `read`, `write`, `deny`. Ils **restreignent** les permissions de section, sans jamais les augmenter. Ainsi, `write` sur un poste ne transforme pas une section globale Lecture en Écriture.

Les anciennes listes de postes autorisés restent prises en compte. La case Restreint réserve un poste aux administrateurs dans les API concernées : inventaire, scans et historiques, EDR, bureau, terminal et fichiers. Connaître l’identifiant d’un poste ne contourne pas ces contrôles.

Le modèle commun est `server/lib/wolfguard/permissions.mjs`. Le build génère sa copie `browser/permissions.js`. L’API reste l’autorité ; masquer un bouton ne suffit pas à protéger une opération.

## Coffres et partage

Les coffres sont personnels, administrateurs compris. Le serveur filtre la copie remise au navigateur et utilise une clé liée au compte et à la révision des droits. Les écritures doivent préserver les données invisibles et contrôler les conflits de version.

Les changements de droits sont versionnés, journalisés sous chiffrement et révoquent les accès concernés, y compris les opérations en cours. Supprimer un compte retire son coffre de la copie courante ; les copies techniques de récupération déjà présentes ne sont pas des données à effacer lors d’une réorganisation du code.

Les anciennes politiques restent lisibles sans élargissement de droits. `vault.all` n’ouvre pas les coffres des autres comptes.

## Sessions et limites

Une session expire après **4 heures d’inactivité**. Les changements de droits, verrouillages et révocations peuvent la terminer plus tôt. Les requêtes en arrière-plan ne prolongent pas à elles seules la session.

Les données précédemment consultées ou exportées ne peuvent pas être effacées à distance. Les permissions protègent les réponses et opérations suivantes du serveur.

Tests principaux : `tests/permissions.test.mjs`, `tests/access.test.mjs`, `tests/security_permissions_test.py`, `tests/users.test.mjs`.
