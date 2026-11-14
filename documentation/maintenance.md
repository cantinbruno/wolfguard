# Maintenance et dépannage

## Symptômes fréquents

| Symptôme | Vérification |
| --- | --- |
| Le build refuse la clé du lien privé | Vérifier l’existence de la configuration privée déjà utilisée. Ne pas afficher sa valeur ni générer une clé de remplacement. |
| Modification invisible sur le site | Vérifier le build `docs/`, le commit, le push et la fin de publication Pages. |
| Le frontend est à jour mais pas l’API | Le serveur Sites demande un déploiement séparé. |
| Expiration après quatre heures malgré une utilisation continue | Contrôler activité réelle, `X-WG-Activity`, `POST /api/touch` et tests de reprise ; ne pas remettre une durée absolue. |
| L’agent image Windows ne démarre pas | Vérifier les ressources natives et la version effectivement installée ; voir [Agents](agents/README.md). |
| Mauvais modèle dans Continue | Vérifier le profil local et la sélection pour ce projet ; voir [IA locale](ia-locale.md). |
| Une ancienne notice contredit le code | Mettre à jour la page centrale et les tests concernés, sans ajouter un second guide divergent. |

## Fichiers privés

La configuration privée du lien et des protections de WolfGuard est hors dépôt, dans `%LOCALAPPDATA%/WolfGuardWeb/private/` sous Windows, ou le chemin géré par `scripts/private-paths.mjs`. `WOLFGUARD_PRIVATE_DIR` peut définir une autre racine.

Les clés de signature, jetons, fichiers de données, profils Continue privés et bases existantes sont à préserver. Un répertoire ancien n’est pas automatiquement supprimable : vérifier son usage et ses changements non intégrés.

## Nettoyage

Le nettoyage doit se limiter aux fichiers devenus inutiles après vérification et publication. Ne pas supprimer toute la racine `.cache/` si un worktree ou une autre tâche y travaille.

`scripts/clean-myapp.ps1` affiche un plan sans `-Apply`. Son périmètre comprend des caches et peut inclure d’anciennes copies ; examiner les chemins avant toute exécution. Ne pas utiliser ce script pour contourner un refus automatique de suppression.

Les anciennes versions hors du dépôt ne sont pas des cibles par défaut. Préserver les données, clés et travaux non intégrés. Les worktrees temporaires entièrement intégrés se retirent avec les commandes Git adaptées après contrôle de leur chemin et de leur publication.

## État Git

Un fichier préparé peut appartenir à une tâche précédente. Lire les différences avant d’ajouter ou de committer. Les conflits demandent une intégration des deux changements utiles ; ne pas sélectionner arbitrairement une version entière.

Si une vérification, un push ou un déploiement échoue, noter l’action réellement réussie et celle qui reste à faire. Ne pas annoncer une production à jour sur la seule base d’un commit local.
