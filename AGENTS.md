# Reprise du projet

Lire `documentation/reprise-ia.md`, puis `documentation/decisions.md` et la page utile depuis `documentation/README.md` avant de modifier le projet. La documentation de développement est centralisée dans `documentation/` ; `docs/` reste le site généré pour GitHub Pages.

Examiner `git status`, `git diff` et `git diff --cached` avant chaque tâche. Préserver les modifications en attente et préparer uniquement les fichiers concernés. Ne pas utiliser un ajout Git global ni écraser un changement préexistant pour faciliter la publication.

Les secrets, données et profils personnels `.continue/agents/` restent locaux. Ne pas les lire pour comprendre le code, les afficher ou les committer. Les règles partagées de Continue sont dans `.continue/rules/`.

Mettre à jour le guide concerné après un changement de comportement. Reconstruire `docs/` avec `npm run build` pour les changements de l'application ou des agents distribués ; un changement de documentation seule ne demande pas de reconstruction du site. Les vérifications et les procédures de publication sont décrites dans `documentation/developpement.md` et `documentation/publication.md`.

# Publication du dépôt

La synchronisation automatique du dossier est désactivée à la demande de l’utilisateur.
Ne pas réactiver la tâche Windows `WolfGuard-Web-AutoPublish` ni lancer `scripts/watch-myapp.ps1`.

Après chaque changement terminé, effectuer les vérifications adaptées, créer un commit puis exécuter explicitement `git push origin main` depuis ce dépôt.
Utiliser directement les commandes Git pour cette publication, sans passer par `scripts/sync-myapp.ps1`.

# Nettoyage après chaque modification

Ne pas conserver de versions de travail obsolètes. Après intégration, vérification et publication, supprimer les worktrees temporaires, anciens checkouts, archives de déploiement, artefacts d’essai et dépendances dupliquées devenus inutiles. Conserver uniquement les fichiers utiles à la version courante.

Avant suppression, vérifier que les changements utiles sont intégrés ou publiés et que les chemins restent dans le dossier temporaire prévu. Préserver les clés privées, les données utilisateur, les sauvegardes encore nécessaires et tout travail non intégré.

Ne pas lancer de tests qui ouvrent des fenêtres, prennent le focus ou injectent des clics et touches sur le poste de l’utilisateur sans demande explicite.
