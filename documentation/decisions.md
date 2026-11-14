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
| Agents | Réglages de droits poste par poste, en plus des permissions de section. Une restriction individuelle ne peut pas élargir les droits globaux. |
| Objectif antivirus | WolfGuard doit à terme assurer lui-même la détection et la gestion des menaces. Le pilotage actuel des protections natives reste en place pendant ce chantier. Voir `documentation/antivirus.md` ; aucun moteur autonome n’est encore livré. |
| Interface sécurité | Présentation cohérente et compacte ; garder les outils et le poste sélectionné dans le même contexte. |
| Windows | Procédure Authenticode préparée ; l’obtention payante d’un certificat a été abandonnée. Ne pas relancer cet achat ni inventer une signature reconnue. |
| Tests du poste | Aucun test qui ouvre une fenêtre, prend le focus ou injecte clavier/souris sans demande explicite. Les tests Playwright sans fenêtre utilisent des profils temporaires. |
| IA locale | Continue dans VS Code et Ollama sur ce PC, modèle `wolfguard-code:9b`. Préserver le profil local et ses réglages. |

Avant de reprendre un chantier, examiner aussi les changements Git en attente : ils peuvent contenir des travaux de scans ou d’agents qui ne sont pas encore publiés. Une documentation du source local ne prouve pas que toutes ses fonctionnalités sont déjà en production.
