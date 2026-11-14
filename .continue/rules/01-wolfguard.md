---
name: WolfGuard - reprise et publication
alwaysApply: true
---

Lire AGENTS.md et documentation/reprise-ia.md avant de modifier ce projet.
Utiliser documentation/README.md pour trouver le guide utile et lire seulement les fichiers concernés.

Préserver les changements Git existants et les secrets. Ne pas lire les profils personnels .continue/agents/ ni les fichiers de clés.
Modifier les sources app/, browser/, server/ ou agent/ selon la tâche ; docs/ est généré.
Respecter les décisions de documentation/decisions.md, notamment les 4 heures d’inactivité et les droits par poste.

Après chaque changement terminé : vérifications adaptées, documentation à jour, commit des seuls fichiers concernés, puis exécuter explicitement git push origin main depuis le dépôt principal.
Reconstruire docs/ si les sources de l’application ou de l’agent distribué changent.
Ne pas lancer scripts/watch-myapp.ps1, scripts/sync-myapp.ps1 ou la tâche Windows WolfGuard-Web-AutoPublish.
Le push GitHub ne déploie pas l’API Sites ; ne pas annoncer un déploiement qui n’a pas été réalisé.

Aucun test ouvrant une fenêtre ou injectant clavier/souris sur le poste sans demande explicite.
