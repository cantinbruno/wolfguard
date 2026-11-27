# Publication après chaque tâche

## Ce qui est automatique

Chaque changement terminé se conclut par les vérifications adaptées, un commit et un **push Git explicite**. GitHub Pages publie ensuite le dossier `docs/` de `main`.

La tâche Windows `WolfGuard-Web-AutoPublish` est désactivée et ses scripts de surveillance ont été supprimés. **Ne pas la réactiver** ni recréer de surveillance. Le « push auto » de fin de tâche ne signifie pas surveiller et publier tout le dossier en continu.

## Intégration continue

Chaque push et chaque pull request vers `main` déclenchent `.github/workflows/ci.yml` (lancement manuel possible depuis l’onglet Actions) :

| Tâche | Machine | Contrôles |
| --- | --- | --- |
| Site, agents et API | Windows | `npm run build` avec une clé de lien **jetable**, puis `npm run test:ci` : contrôle de publication, tous les tests Node, signature, et tests navigateur sans fenêtre (entrée privée, CSP/SRI, sessions, blocage d’IP) |
| Serveur | Ubuntu | `npm ci`, `npm audit --omit=dev --audit-level=high`, TypeScript, ESLint, `server/tests/security.test.mjs`, `npm run build` |

La clé réelle du lien privé et les secrets Sites ne sont jamais fournis à GitHub. Le build de CI est jeté : GitHub Pages continue de servir le `docs/` commité. Un échec de CI ne bloque pas Pages ; corriger puis pousser un nouveau commit. Le résultat se lit dans l’onglet **Actions** du dépôt ou par l’API publique `https://api.github.com/repos/cantinbruno/wolfguard/actions/runs`.

Un fichier de `.github/workflows/` ne peut être poussé qu’avec un identifiant Git ayant le droit `workflow`.

## Vérifier puis publier

```powershell
git status --short --untracked-files=all
git diff
git diff --cached
```

Repérer les changements déjà préparés avant la tâche. Ne jamais utiliser `git add .` ou `git commit -am` pour publier un travail dans un dépôt qui contient d’autres modifications.

Pour une modification de `app/`, `browser/` ou d’un agent distribué : lancer `npm run build`, vérifier les sorties attendues dans `docs/`, puis les tests adaptés. Pour une modification limitée à la documentation et aux règles de reprise : vérifier les liens et chemins, le contrôle de publication et les différences ; aucune reconstruction du site n’est nécessaire.

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

La clé du lien privé, les fichiers `.env`, bases, secrets de signature et profils personnels ne doivent pas être préparés. Vérifier les chemins sans afficher leurs valeurs.

Après intégration, contrôles et push : supprimer les worktrees temporaires et leurs artefacts devenus inutiles. Vérifier les chemins absolus avant toute suppression et préserver tout travail non intégré. Ne pas nettoyer globalement `.cache/` lorsqu’un autre chantier l’utilise.
