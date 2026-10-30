# Publication du dépôt

La synchronisation automatique du dossier est désactivée à la demande de l’utilisateur.
Ne pas réactiver la tâche Windows `WolfGuard-Web-AutoPublish` ni lancer `scripts/watch-myapp.ps1`.

Après chaque changement terminé, effectuer les vérifications adaptées, créer un commit puis exécuter explicitement `git push origin main` depuis ce dépôt.
Utiliser directement les commandes Git pour cette publication, sans passer par `scripts/sync-myapp.ps1`.
