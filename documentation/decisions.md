# Décisions à conserver

## 26 novembre 2026 — Ergonomie et échanges de données

Les déplacements de dossiers et de fiches conservent la collection affichée. Le coffre montre le nom et l’URL avec copie. Les tableaux des mémos proposent couleurs de fond par cellule, sélection, ligne ou tableau et redimensionnement par glissement des bordures, enregistrés et annulables. Les couleurs explicites sont conservées en lecture comme en édition ; les mots clés ne sont plus affichés comme champ de mémo. Les enregistrements concurrents du même éditeur sont bloqués et une erreur laisse le brouillon ouvert.

Mon compte conserve identité, code, MFA et verrouillage ; retirer le raccourci stockage et le sélecteur du délai fixe. La nouvelle demande remplace l’ancienne interdiction d’import/export : Données propose un transfert chiffré des fiches autorisées avec un code distinct de huit chiffres, sans restauration des droits ni des comptes. L’import ajoute des copies, remappe les dossiers et rechiffre les secrets du coffre.

Utilisateurs permet de rechercher les groupes, filtrer les appartenances et consulter les droits effectifs avec leurs sources. Groupes sépare Membres, Groupes liés, Autorisations et Vérifier un accès. Connexions et Blocage sont deux onglets. Blocage inclut Spamhaus DROP IPv4/IPv6, ses dates et son attribution, avec actualisation quotidienne à la demande entrante et cache R2 ; les données de plus de 72 h ne bloquent plus. Toute IP bloquée reçoit HTTP 404 « Adresse inconnue. », y compris sur la vérification du lien privé. Une panne réseau à l’ouverture offre Réessayer sans ouvrir les données.


Ces règles reprennent les choix fonctionnels de l’utilisateur. Si une nouvelle demande les change explicitement, mettre à jour le code et cette page ensemble.

## 21 novembre 2026 — Intégration du rapport

Reprise des 25 critères après les écarts signalés : vérifier le résultat visible, pas seulement l’état interne ou la présence du code. Ne pas présenter les essais synthétiques comme une validation sur tout le parc. La conservation du journal des droits est définie par 30 jours sans plafond destructif de nombre d’événements. Les anciens relevés Defender ne confirment pas la protection WolfGuard Windows. Les cartographies conservent les absences de réponse et erreurs pour les tableaux, compteurs et exports ; leur carte reste limitée aux réponses observées. Garder les checkouts de déploiement et leurs dépendances hors de `myapp` après publication.

À la demande « les droits comme dans un AD », les groupes peuvent maintenant inclure d’autres groupes : utilisateurs → groupes métier → groupes d’accès → autorisations. Ajouter des groupes automatiques par action, des autorisations/refus explicites dans les groupes personnalisés et une consultation des droits effectifs avec leurs sources. Les refus actifs priment sur les autorisations, sauf pour le propriétaire protégé. Préserver les groupes et appartenances existants, les restrictions de dossiers et les périmètres de postes. Révoquer aussi les membres indirects lors d’un changement et contrôler toute la chaîne de délégation. Les droits fixes des groupes automatiques restent protégés ; leurs utilisateurs et leurs groupes inclus sont administrables. Il s’agit du modèle d’autorisation interne, sans connexion LDAP créée implicitement. Voir [Droits](droits.md).

La [mise à jour point par point](integration-rapport.md) précise les nouveaux comportements et remplace les descriptions antérieures incompatibles : statut antivirus Windows indépendant de Defender, parcours progressif des disques locaux, surveillance système, rapports centralisés, rétention de 30 jours, couleurs des sections et paramètres personnels. Les protections natives ne sont pas désactivées. La surveillance reste réactive et ne doit pas être présentée comme un filtrage avant exécution.

Les bandeaux des sections de postes sont compacts : 32 px de contenu sur ordinateur, sans padding ajouté par les réglages de densité. Sur mobile, la hauteur suit les commandes pour éviter leur chevauchement avec les postes.

| Sujet | Décision |
| --- | --- |
| Hébergement | Frontend GitHub Pages, domaine `wolfguard.wavetools.fr`. API Sites distincte ; ne pas remplacer le DNS ni recréer un Site. |
| Publication | Vérifications, commit et `git push origin main` explicite après chaque tâche terminée. Surveillance Windows désactivée. |
| Documentation | Guides et consignes uniquement dans `documentation/`, sans README ni AGENTS.md à la racine et sans README dans `server/`. Les règles Continue renvoient directement aux consignes centralisées. |
| Données | Conserver le partage et ses permissions. Le serveur peut déchiffrer les espaces pour les filtrer ; ne pas présenter cela comme du chiffrement de bout en bout. |
| Sessions | 4 heures **d’inactivité**, pas 4 heures de durée totale. Les rafraîchissements et requêtes de fond ne sont pas de l’activité utilisateur. |
| MFA | Authenticator ; option « Changer de téléphone ». L’ancien facteur reste actif jusqu’à confirmation du nouveau. Les codes de secours restent nécessaires à la récupération MFA. |
| Données | Import/export chiffré des fiches autorisées dans Données, avec code de transfert. Import par ajout de copies, sans remplacement des données, comptes ou droits. Préserver les copies techniques de récupération. |
| Autorisations | Tous les droits sont configurés uniquement sur des groupes d’accès dans Paramètres → Groupes, sans surcharge individuelle ni raccourci depuis le parc. Un utilisateur peut cumuler plusieurs groupes. Chaque section ou paramètre reçoit automatiquement `GG_Acces_<Nom>_lecture` et `GG_Acces_<Nom>_ecriture` ; sans groupe correspondant, elle est invisible. `GG_Acces_Application_administrateur` donne l’accès complet. Les groupes des sections de postes suivent leur création, renommage et suppression. Le propriétaire reste protégé. |
| Organisation du parc | Sections de postes personnalisées à nommer, repliables, avec sélection par poste ou par section et déplacement multiple. Le clic droit vise la sélection si le poste est coché, sinon le seul poste visé. Les actions distantes gardent leurs confirmations et leurs contrôles par poste. |
| Antivirus | Moteur libre intégré choisi par l’utilisateur : ClamAV. Sur Windows x64, installation automatique après réception de la politique Protéger ; signatures vérifiées chaque heure, sans navigateur. Pauses explicites et mode Observer conservés. Le moteur validé évolue avec les mises à jour autonomes de l’agent. Analyse réactive de dossiers et quarantaine chiffrée ; sans blocage avant exécution ni remplacement complet de Defender. Protections natives conservées. Voir `documentation/antivirus.md`. |
| Interface sécurité | « Ajouter un poste » ouvre uniquement l’association (système, installateur ou lien, confirmation de l’arrivée). Le bouton voisin « Désinstaller » regroupe la désinstallation distante confirmée et les désinstalleurs locaux Windows/Linux/macOS ; un raccourci existe dans la fiche. La révocation reste uniquement dans la fiche du poste, onglet Détails, et ne supprime pas le logiciel. Fiche inspirée FortiClient EMS : lignes compactes, libellés courts, statuts lisibles, navigation latérale et panneaux « Protection du poste » / « Poste et agent », sans répétitions. Vue d’ensemble / Outils / Détails, actualisation directe. Navigation et tableau adaptés au mobile. Garder les outils et le poste sélectionné dans le même contexte. |
| Paramètres | Fenêtres des paramètres et de la fiche poste centrées, plafonnées à 1280 × 820 px avec une marge de 48 px sur ordinateur ; affichage adapté au plein écran sur téléphone. Un seul onglet « Mon compte » réunit identité, rôle, groupes, code personnel, Authenticator et session. Les anciennes ouvertures `security` et `audit` reviennent sur « Mon compte ». La section « Protection de l’application » reste supprimée. |
| Windows | Procédure Authenticode préparée ; l’obtention payante d’un certificat a été abandonnée. Ne pas relancer cet achat ni inventer une signature reconnue. |
| Tests du poste | Aucun test qui ouvre une fenêtre, prend le focus ou injecte clavier/souris sans demande explicite. Les tests Playwright sans fenêtre utilisent des profils temporaires. |
| IA locale | Continue dans VS Code et Ollama sur ce PC, modèle `wolfguard-code:9b`. Préserver le profil local et ses réglages. |

Avant de reprendre un chantier, examiner aussi les changements Git en attente : ils peuvent contenir des travaux de scans ou d’agents qui ne sont pas encore publiés. Une documentation du source local ne prouve pas que toutes ses fonctionnalités sont déjà en production.

## 20 novembre 2026 — Groupes et autorisations des postes

À la demande de l’utilisateur, les groupes deviennent la référence d’accès aux postes et sont partagés côté serveur. La gestion individuelle est supprimée. Le tableau propose création, duplication, renommage, suppression, déplier/replier, raccourci vers les droits et déplacement multiple par glisser-déposer ou menu contextuel. Paramètres → Utilisateurs et droits → Groupes règle les niveaux de chaque compte, sous les permissions générales des sections. La transition conserve les anciens accès, y compris les postes réservés, en séparant les groupes si nécessaire. Une duplication reste vide et invisible par défaut. Un déplacement applique les droits d’arrivée et ferme les opérations devenues interdites. Les anciens champs ne servent plus qu’à la compatibilité avant import ; ne pas réintroduire leur interface.

## 20 novembre 2026 — Tous les droits passent par les groupes

La demande suivante remplace le réglage individuel des comptes : une section Groupes dans les paramètres porte tous les droits (rôle, sections, durée et groupes de postes) et les membres. Chaque utilisateur est affecté à un groupe ; aucune exception individuelle ne doit être réintroduite. Reprendre les politiques existantes dans des groupes équivalents sans élargissement. Garder Invités sans accès et protéger le propriétaire. Les fenêtres sont réduites et centrées sur ordinateur. Le coffre s’ouvre directement dans le dossier de l’adresse mail connectée, avec maintien de l’isolation des coffres personnels.

## 20 novembre 2026 — Sections de postes, mêmes groupes partout

Le regroupement de machines se nomme « section », et non « groupe ». Les groupes restent exclusivement les groupes d’utilisateurs configurés dans les paramètres ; les mêmes groupes définissent les droits sur les sections de postes et sur toutes les autres sections. Le raccourci Droits d’une section ouvre ces groupes partagés avec la section ciblée. Conserver les identifiants et les permissions existants ; ne pas créer un second jeu de groupes ni des droits individuels pour les postes.

## 20 novembre 2026 — Droits uniquement depuis les paramètres

La demande suivante retire tous les raccourcis vers les droits du tableau et des en-têtes de sections de postes. La création et la gestion des autorisations passent uniquement par **Paramètres → Groupes**. À la première ouverture par le propriétaire, préparer automatiquement les groupes à partir des comptes et droits existants : les politiques identiques partagent un groupe, les variantes restent séparées et aucun accès n’est élargi.

## 21 novembre 2026 — Groupes d’accès par section

La demande remplace le groupe unique par des appartenances cumulatives. Créer automatiquement, pour chaque section ou paramètre, `GG_Acces_<Nom>_lecture` et `GG_Acces_<Nom>_ecriture`, plus `GG_Acces_Application_administrateur` pour l’accès complet. Une section sans groupe attribué reste invisible. La création, le renommage et la suppression d’une section de postes créent, renomment et suppriment ses deux groupes. Les groupes automatiques sont gérés par le système ; seuls leurs membres changent. Conserver les anciennes politiques dans des groupes `GG_Acces_conserve` sans élargir les accès.
