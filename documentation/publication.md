# Publication après chaque tâche

## Ce qui est automatique

L’IA doit terminer chaque changement autorisé par les vérifications adaptées, un commit et un **push Git explicite**. GitHub Pages publie ensuite le dossier `docs/` de `main`.

La tâche Windows `WolfGuard-Web-AutoPublish` est désactivée. **Ne pas la réactiver**, ne pas lancer `scripts/watch-myapp.ps1` et ne pas passer par `scripts/sync-myapp.ps1`. Le « push auto » de fin de tâche ne signifie pas surveiller et publier tout le dossier en continu.

## Vérifier puis publier

```powershell
git status --short --untracked-files=all
git diff
git diff --cached
```

Repérer les changements déjà préparés avant la tâche. Ne jamais utiliser `git add .` ou `git commit -am` pour publier un travail dans un dépôt qui contient d’autres modifications.

Pour une modification de `app/`, `browser/` ou d’un agent distribué : lancer `npm run build`, vérifier les sorties attendues dans `docs/`, puis les tests adaptés. Pour une modification limitée à la documentation et aux règles IA : vérifier les liens et chemins, le contrôle de publication et les différences ; aucune reconstruction du site n’est nécessaire.

```powershell
node scripts/check-publication.mjs
git diff --check
git add -- <liste-des-fichiers-du-changement>
git diff --cached --check
git diff --cached --stat
git commit -m "Description du changement"
git push origin main
```

Les chevrons ci-dessus désignent une liste à remplacer par les chemins exacts. Si des fichiers étrangers sont déjà préparés, utiliser un worktree ou un commit à chemins explicites après vérification ; ne pas les inclure silencieusement.

Après le push, comparer `git rev-parse HEAD` et `git rev-parse origin/main`. Pour une publication frontend, vérifier aussi la disponibilité de la nouvelle révision publique ; un push réussi ne prouve pas à lui seul que GitHub Pages a fini.

En cas de rejet du push, examiner le motif et l’état distant. Ne pas forcer l’historique. Conserver le commit local et signaler clairement ce qui reste à publier.

## Deux déploiements différents

| Cible | Source | Publication |
| --- | --- | --- |
| Application web | `app/`, `browser/`, sorties `docs/` | GitHub Pages après push sur `main` |
| API | `server/` | Version de source, compilation et déploiement du Site existant |

Un push de `server/` dans GitHub ne déploie pas l’API. Utiliser le flux Sites du projet existant et préserver D1, R2, l’accès public de la plateforme et tous les secrets. Voir [Serveur](serveur.md).

## Confidentialité et nettoyage

La clé du lien privé, les fichiers `.env`, bases, secrets de signature et profils personnels Continue ne doivent pas être préparés. Vérifier les chemins sans afficher leurs valeurs.

Après intégration, contrôles et push : supprimer les worktrees temporaires et leurs artefacts devenus inutiles. Vérifier les chemins absolus avant toute suppression et préserver tout travail non intégré. Ne pas nettoyer globalement `.cache/` lorsqu’un autre chantier l’utilise.
