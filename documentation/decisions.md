# Décisions à conserver

Ces règles reprennent les choix fonctionnels de l’utilisateur. Si une nouvelle demande les change explicitement, mettre à jour le code et cette page ensemble.

| Sujet | Décision |
| --- | --- |
| Hébergement | Frontend GitHub Pages, domaine `wolfguard.wavetools.fr`. API Sites distincte ; ne pas remplacer le DNS ni recréer un Site. |
| Publication | Vérifications, commit et `git push origin main` explicite après chaque tâche terminée. Surveillance Windows désactivée. |
| Documentation | Guides et consignes uniquement dans `documentation/`, sans README ni AGENTS.md à la racine et sans README dans `server/`. Les règles Continue renvoient directement aux consignes centralisées. |
| Données | Conserver le partage et ses permissions. Le serveur peut déchiffrer les espaces pour les filtrer ; ne pas présenter cela comme du chiffrement de bout en bout. |
| Sessions | 4 heures **d’inactivité**, pas 4 heures de durée totale. Les rafraîchissements et requêtes de fond ne sont pas de l’activité utilisateur. |
| MFA | Authenticator ; option « Changer de téléphone ». L’ancien facteur reste actif jusqu’à confirmation du nouveau. Les codes de secours restent nécessaires à la récupération MFA. |
| Sauvegardes | Pas d’export/import de sauvegardes proposé dans l’interface. Ne pas supprimer les copies techniques de récupération ou les données existantes. |
| Agents | Réglages de droits par groupe, en plus des permissions de section. Un droit de groupe ne peut pas élargir les droits globaux. |
| Organisation du parc | Groupes personnalisés à nommer, repliables, avec sélection par poste ou par groupe et déplacement multiple. Le clic droit vise la sélection si le poste est coché, sinon le seul poste visé. Les actions distantes gardent leurs confirmations et leurs contrôles par poste. |
| Antivirus | Moteur libre intégré choisi par l’utilisateur : ClamAV. Sur Windows x64, installation automatique après réception de la politique Protéger ; signatures vérifiées chaque heure, sans navigateur. Pauses explicites et mode Observer conservés. Le moteur validé évolue avec les mises à jour autonomes de l’agent. Analyse réactive de dossiers et quarantaine chiffrée ; sans blocage avant exécution ni remplacement complet de Defender. Protections natives conservées. Voir `documentation/antivirus.md`. |
| Interface sécurité | « Ajouter un poste » ouvre uniquement l’association (système, installateur ou lien, confirmation de l’arrivée). Le bouton voisin « Désinstaller » regroupe la désinstallation distante confirmée et les désinstalleurs locaux Windows/Linux/macOS ; un raccourci existe dans la fiche. La révocation reste uniquement dans la fiche du poste, onglet Détails, et ne supprime pas le logiciel. Fiche inspirée FortiClient EMS : lignes compactes, libellés courts, statuts lisibles, navigation latérale et panneaux « Protection du poste » / « Poste et agent », sans répétitions. Vue d’ensemble / Outils / Détails, actualisation directe. Navigation et tableau adaptés au mobile. Garder les outils et le poste sélectionné dans le même contexte. |
| Paramètres | Fenêtre agrandie, presque plein écran sur ordinateur et plein écran sur téléphone, comme la fiche du poste. La section « Protection de l’application » est supprimée. Conserver l’onglet « Sécurité » pour le code et la session ; une ancienne ouverture de l’onglet `audit` revient sur « Sécurité ». |
| Windows | Procédure Authenticode préparée ; l’obtention payante d’un certificat a été abandonnée. Ne pas relancer cet achat ni inventer une signature reconnue. |
| Tests du poste | Aucun test qui ouvre une fenêtre, prend le focus ou injecte clavier/souris sans demande explicite. Les tests Playwright sans fenêtre utilisent des profils temporaires. |
| IA locale | Continue dans VS Code et Ollama sur ce PC, modèle `wolfguard-code:9b`. Préserver le profil local et ses réglages. |

Avant de reprendre un chantier, examiner aussi les changements Git en attente : ils peuvent contenir des travaux de scans ou d’agents qui ne sont pas encore publiés. Une documentation du source local ne prouve pas que toutes ses fonctionnalités sont déjà en production.

## 20 novembre 2026 — Groupes et autorisations des postes

À la demande de l’utilisateur, les groupes deviennent la référence d’accès aux postes et sont partagés côté serveur. La gestion individuelle est supprimée. Le tableau propose création, duplication, renommage, suppression, déplier/replier, raccourci vers les droits et déplacement multiple par glisser-déposer ou menu contextuel. Paramètres → Utilisateurs et droits → Groupes règle les niveaux de chaque compte, sous les permissions générales des sections. La transition conserve les anciens accès, y compris les postes réservés, en séparant les groupes si nécessaire. Une duplication reste vide et invisible par défaut. Un déplacement applique les droits d’arrivée et ferme les opérations devenues interdites. Les anciens champs ne servent plus qu’à la compatibilité avant import ; ne pas réintroduire leur interface.
