# WolfGuard

Application web de gestion de mémos, coffres personnels et postes associés.

**Commencer par [la documentation](README.md).** Pour reprendre le développement avec l’IA locale, lire [Reprise IA](reprise-ia.md), puis les [consignes du dépôt](instructions-ia.md).

| Dossier | Rôle |
| --- | --- |
| `app/` | Interface et outils de l’application |
| `browser/` | Adaptation web, authentification, chiffrement et synchronisation |
| `server/` | API, autorisations, stockage D1/R2 et migrations |
| `agent/` | Agent Windows/Linux/macOS et outils exécutés sur les postes |
| `scripts/` | Compilation, contrôles, packaging et maintenance |
| `tests/` | Tests du navigateur, de l’API et des agents |
| `documentation/` | Documentation du projet et procédures de reprise |
| `docs/` | Site généré pour GitHub Pages : ne pas modifier directement |

Le frontend est publié sur **https://wolfguard.wavetools.fr/** depuis `main:/docs`. Le serveur Sites se déploie séparément. Le lien privé et les secrets restent hors du dépôt.

Après chaque tâche terminée : contrôles adaptés, ajout sélectif des fichiers, commit, puis **`git push origin main`**. GitHub Pages publie ensuite le frontend. La tâche Windows de surveillance reste désactivée. Voir [Publication](publication.md).

Les licences et notices des bibliothèques restent à côté des fichiers dans `app/vendor/` et `server/vendor/`. Les guides `agent/LIRE-MOI*.txt` restent inclus dans les installateurs.
