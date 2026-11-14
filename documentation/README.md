# Documentation WolfGuard

Ce dossier centralise les explications du projet. **`docs/` est le site généré, pas la documentation de développement.**

## Parcours de reprise

1. [Reprise IA](reprise-ia.md) : travail à effectuer à chaque nouvelle session.
2. [Architecture](architecture.md) : sources à modifier selon la tâche.
3. [Décisions à conserver](decisions.md) : comportements demandés par l’utilisateur.
4. [Développement et tests](developpement.md), puis [Publication](publication.md).

## Références par sujet

| Besoin | Document |
| --- | --- |
| Fonctions de l’application et limites des scans | [Application](application.md) |
| Connexion, chiffrement, MFA et limites de sécurité | [Sécurité](securite.md) |
| Permissions des comptes et droits poste par poste | [Droits](droits.md) |
| API, stockage, migrations et déploiement du serveur | [Serveur](serveur.md) |
| Installateurs, services et prise en main | [Agents](agents/README.md) |
| Procédure facultative Authenticode | [Signature Windows](agents/signature-windows.md) |
| Continue, Ollama et réglages de ce PC | [IA locale](ia-locale.md) |
| Nettoyage et dépannage | [Maintenance](maintenance.md) |

Les faits de sécurité sont à vérifier dans le code et les tests cités. Une date de contrôle n’est pas une garantie permanente. Mettre à jour le document concerné quand le comportement change ; ne pas recréer des copies concurrentes dans les README.
