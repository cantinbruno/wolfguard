# Décisions à conserver

Cette page rassemble les choix fonctionnels de l’utilisateur. Si une nouvelle demande les change explicitement, mettre à jour le code et cette page ensemble.

Lecture : le tableau donne les règles en vigueur ; l’historique suit, du plus récent au plus ancien. En cas de conflit, l’entrée la plus récente remplace la plus ancienne.

Avant de reprendre un chantier, examiner aussi les changements Git en attente : ils peuvent contenir des travaux de scans ou d’agents qui ne sont pas encore publiés. Une documentation du source local ne prouve pas que toutes ses fonctionnalités sont déjà en production.

## Règles en vigueur

| Sujet | Décision |
| --- | --- |
| Hébergement | Frontend GitHub Pages, domaine `wolfguard.wavetools.fr`. API Sites distincte ; ne pas remplacer le DNS ni recréer un Site. |
| Publication | Vérifications, commit et `git push origin main` explicite après chaque tâche terminée. GitHub Actions recompile et teste chaque push, sans la clé réelle du lien. Surveillance Windows désactivée et ses scripts supprimés. |
| Documentation | Guides et consignes uniquement dans `documentation/`, sans README ni AGENTS.md à la racine et sans README dans `server/`. Les règles Continue renvoient directement aux consignes centralisées. |
| Données | Conserver le partage et ses permissions. Le serveur peut déchiffrer les espaces pour les filtrer ; ne pas présenter cela comme du chiffrement de bout en bout. |
| Sessions | 4 heures **d’inactivité**, et au plus **24 heures** après la connexion (demande du 27 novembre). Les rafraîchissements et requêtes de fond ne sont pas de l’activité utilisateur. |
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
| Prise en main à distance | Bureau, Terminal et Fichiers exigent à chaque session l’accord explicite de l’utilisateur du poste par popup. Refus par défaut après 60 secondes, sans dialogue possible ou pour un agent trop ancien (capacité `remote-consent-v1` absente). Aucune action avant l’accord. |
| Rapports | Uniquement en PDF dans l’Historique de la fiche du poste, sans prévisualisation, export direct ni historique global. |

## Historique des demandes

### 27 novembre 2026 — Sécurité et session

Limiter les essais de code par adresse IP (plus de blocage commun à tous les comptes), exiger la clé du lien privé avant toute tentative de connexion, plafonner une session à 24 h en plus des 4 h d’inactivité, durcir HSTS, et ajouter dans Paramètres un onglet Journal dont les événements sont supprimés après un mois. Rien de payant. Ne plus mentionner d’IA dans le dépôt ni dans les commits.

### 26 novembre 2026 — Intégration continue et nettoyage

Mettre en place une vérification automatique GitHub Actions à chaque push. Supprimer ce qui est inutile et restructurer librement, à condition de ne modifier aucune fonctionnalité. Seuls les fichiers prouvés inutilisés sont retirés (aucune référence, compilation, lint et tests verts) ; les dossiers publiés ou utilisés par les agents installés ne sont pas renommés. Voir [Architecture](architecture.md#arborescence-conservée).

### 26 novembre 2026 — Accord distant, rapports par poste et groupes

Bureau, Terminal et Fichiers nécessitent chacun un accord explicite de l’utilisateur du poste distant par popup, à chaque session. Refuser par défaut, après 60 secondes sans réponse ou si aucun dialogue ne peut être affiché. Bloquer toute action avant l’accord et les agents trop anciens. Les rapports ne sont proposés qu’en PDF dans l’Historique de la fiche du poste ; retirer les prévisualisations, exports directs et historique global. Pour les groupes de droits de Paramètres, privilégier les groupes métier et ranger les groupes automatiques dans une vue avancée, sans suppression ni modification des droits existants.

### 26 novembre 2026 — Terminal et écrans multiples

Le terminal ne doit pas afficher le CLIXML de progression PowerShell à la préparation des modules. Conserver les résultats et erreurs de commande, les avertissements et l’UTF-8. La prise en main Windows montre tous les écrans dans une vue commune, avec les coordonnées négatives et les grandes résolutions prises en charge. Conserver l’adaptation à la fenêtre, le défilement en taille réelle et le plein écran. Un changement de géométrie pendant la session exige une reconnexion avant toute nouvelle saisie.

### 26 novembre 2026 — Protection dans la fiche du poste

Supprimer la page séparée de gestion EDR et le bouton « Gérer dans EDR ». Toute la gestion de protection passe par la fiche du poste : Protection pour le moteur, les analyses, les signatures, la surveillance, la politique et le suivi des actions ; Quarantaine pour rechercher, restaurer et supprimer les copies chiffrées ; Journal pour les événements et leur acquittement. Les anciens accès EDR ouvrent directement la fiche sur Protection. Préserver les permissions `edr.*`, les droits par poste, les confirmations et les états hors ligne. Un brouillon de politique survit aux onglets et rafraîchissements et demande confirmation avant fermeture ou changement de poste.

### 26 novembre 2026 — Ergonomie et échanges de données

Réparer la remontée réelle de protection du poste : publier les corrections PowerShell et de périmètre antivirus restées locales, puis vérifier la version installée et un relevé avec le runtime distribué. Une erreur de collecte Windows ne doit plus empêcher de transmettre l’état du moteur ni de recevoir sa politique ; une erreur antivirus ne doit plus masquer l’inventaire Windows. Conserver les états inconnus et les avertissements quand une source échoue, sans inventer une protection active.

Les déplacements de dossiers et de fiches conservent la collection affichée. Le coffre montre le nom et l’URL avec copie. Les tableaux des mémos proposent couleurs de fond par cellule, sélection, ligne ou tableau et redimensionnement par glissement des bordures, enregistrés et annulables. Les couleurs explicites sont conservées en lecture comme en édition ; les mots clés ne sont plus affichés comme champ de mémo. Les enregistrements concurrents du même éditeur sont bloqués et une erreur laisse le brouillon ouvert.

Mon compte conserve identité, code, MFA et verrouillage ; retirer le raccourci stockage et le sélecteur du délai fixe. La nouvelle demande remplace l’ancienne interdiction d’import/export : Données propose un transfert chiffré des fiches autorisées avec un code distinct de huit chiffres, sans restauration des droits ni des comptes. L’import ajoute des copies, remappe les dossiers et rechiffre les secrets du coffre.

Utilisateurs permet de rechercher les groupes, filtrer les appartenances et consulter les droits effectifs avec leurs sources. Groupes sépare Membres, Groupes liés, Autorisations et Vérifier un accès. Connexions et Blocage sont deux onglets. Blocage inclut Spamhaus DROP IPv4/IPv6, ses dates et son attribution, avec actualisation quotidienne à la demande entrante et cache R2 ; les données de plus de 72 h ne bloquent plus. Toute IP bloquée reçoit HTTP 404 « Adresse inconnue. », y compris sur la vérification du lien privé. Une panne réseau à l’ouverture offre Réessayer sans ouvrir les données.

### 21 novembre 2026 — Groupes d’accès par section

La demande remplace le groupe unique par des appartenances cumulatives. Créer automatiquement, pour chaque section ou paramètre, `GG_Acces_<Nom>_lecture` et `GG_Acces_<Nom>_ecriture`, plus `GG_Acces_Application_administrateur` pour l’accès complet. Une section sans groupe attribué reste invisible. La création, le renommage et la suppression d’une section de postes créent, renomment et suppriment ses deux groupes. Les groupes automatiques sont gérés par le système ; seuls leurs membres changent. Conserver les anciennes politiques dans des groupes `GG_Acces_conserve` sans élargir les accès.

### 21 novembre 2026 — Intégration du rapport

Incident antivirus reproduit sur le poste installé : tester les fichiers PowerShell distribués en UTF-8/BOM avec le runtime de l’agent, pas uniquement les sources du dépôt. Le packaging doit refuser toute erreur de syntaxe des scripts Windows. Le périmètre antivirus conserve le disque parent du magasin privé et exclut seulement ce magasin pendant le parcours. Un périmètre vide ne confirme pas la protection. Les messages d’état doivent être reconstruits à partir du moteur et des signatures après redémarrage.

Reprise des 25 critères après les écarts signalés : vérifier le résultat visible, pas seulement l’état interne ou la présence du code. Ne pas présenter les essais synthétiques comme une validation sur tout le parc. La conservation du journal des droits est définie par 30 jours sans plafond destructif de nombre d’événements. Les anciens relevés Defender ne confirment pas la protection WolfGuard Windows. Les cartographies conservent les absences de réponse et erreurs pour les tableaux, compteurs et exports ; leur carte reste limitée aux réponses observées. Garder les checkouts de déploiement et leurs dépendances hors de `myapp` après publication.

À la demande « les droits comme dans un AD », les groupes peuvent maintenant inclure d’autres groupes : utilisateurs → groupes métier → groupes d’accès → autorisations. Ajouter des groupes automatiques par action, des autorisations/refus explicites dans les groupes personnalisés et une consultation des droits effectifs avec leurs sources. Les refus actifs priment sur les autorisations, sauf pour le propriétaire protégé. Préserver les groupes et appartenances existants, les restrictions de dossiers et les périmètres de postes. Révoquer aussi les membres indirects lors d’un changement et contrôler toute la chaîne de délégation. Les droits fixes des groupes automatiques restent protégés ; leurs utilisateurs et leurs groupes inclus sont administrables. Il s’agit du modèle d’autorisation interne, sans connexion LDAP créée implicitement. Voir [Droits](droits.md).

La [mise à jour point par point](integration-rapport.md) précise les nouveaux comportements et remplace les descriptions antérieures incompatibles : statut antivirus Windows indépendant de Defender, parcours progressif des disques locaux, surveillance système, rapports centralisés, rétention de 30 jours, couleurs des sections et paramètres personnels. Les protections natives ne sont pas désactivées. La surveillance reste réactive et ne doit pas être présentée comme un filtrage avant exécution.

Les bandeaux des sections de postes sont compacts : 32 px de contenu sur ordinateur, sans padding ajouté par les réglages de densité. Sur mobile, la hauteur suit les commandes pour éviter leur chevauchement avec les postes.

### 20 novembre 2026 — Groupes et autorisations des postes

À la demande de l’utilisateur, les groupes deviennent la référence d’accès aux postes et sont partagés côté serveur. La gestion individuelle est supprimée. Le tableau propose création, duplication, renommage, suppression, déplier/replier, raccourci vers les droits et déplacement multiple par glisser-déposer ou menu contextuel. Paramètres → Utilisateurs et droits → Groupes règle les niveaux de chaque compte, sous les permissions générales des sections. La transition conserve les anciens accès, y compris les postes réservés, en séparant les groupes si nécessaire. Une duplication reste vide et invisible par défaut. Un déplacement applique les droits d’arrivée et ferme les opérations devenues interdites. Les anciens champs ne servent plus qu’à la compatibilité avant import ; ne pas réintroduire leur interface.

### 20 novembre 2026 — Tous les droits passent par les groupes

La demande suivante remplace le réglage individuel des comptes : une section Groupes dans les paramètres porte tous les droits (rôle, sections, durée et groupes de postes) et les membres. Chaque utilisateur est affecté à un groupe ; aucune exception individuelle ne doit être réintroduite. Reprendre les politiques existantes dans des groupes équivalents sans élargissement. Garder Invités sans accès et protéger le propriétaire. Les fenêtres sont réduites et centrées sur ordinateur. Le coffre s’ouvre directement dans le dossier de l’adresse mail connectée, avec maintien de l’isolation des coffres personnels.

### 20 novembre 2026 — Sections de postes, mêmes groupes partout

Le regroupement de machines se nomme « section », et non « groupe ». Les groupes restent exclusivement les groupes d’utilisateurs configurés dans les paramètres ; les mêmes groupes définissent les droits sur les sections de postes et sur toutes les autres sections. Le raccourci Droits d’une section ouvre ces groupes partagés avec la section ciblée. Conserver les identifiants et les permissions existants ; ne pas créer un second jeu de groupes ni des droits individuels pour les postes.

### 20 novembre 2026 — Droits uniquement depuis les paramètres

La demande suivante retire tous les raccourcis vers les droits du tableau et des en-têtes de sections de postes. La création et la gestion des autorisations passent uniquement par **Paramètres → Groupes**. À la première ouverture par le propriétaire, préparer automatiquement les groupes à partir des comptes et droits existants : les politiques identiques partagent un groupe, les variantes restent séparées et aucun accès n’est élargi.
