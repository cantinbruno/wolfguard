# IA locale dans VS Code

## Configuration de ce PC

Continue utilise le profil **WolfGuard - IA locale** et le mode **Agent**. Le modèle affiché est **Qwen3.5 9B - Agent local**.

| Élément | Réglage |
| --- | --- |
| Service | Ollama sur `http://127.0.0.1:11434` |
| Modèle principal | `wolfguard-code:9b`, dérivé de `qwen3.5:9b` |
| Profil matériel | RTX 4060 Ti 8 Go, 32 Go RAM |
| Contexte | 16 384 tokens |
| Réglages du modèle | `num_batch=128`, `num_gpu=99`, `num_ctx=16384` |
| Suggestions | `qwen2.5-coder:1.5b-base-cpu`, exécuté sur CPU |
| Confidentialité | Cloud Ollama et télémétrie Continue désactivés |
| Inactivité | Déchargement des modèles après cinq minutes |

La configuration personnelle est dans `%USERPROFILE%/.continue/config.yaml`. La sélection du profil par projet est conservée par Continue dans son contexte global. Les alias réutilisent les poids ; ils ne constituent pas deux téléchargements du même modèle.

Les essais locaux du 14 novembre 2026 ont mesuré environ 20–32 tokens/seconde pour le modèle principal et 39–42 pour les suggestions. Ces mesures dépendent de la tâche et de la charge du PC, pas d’une garantie. Le mode de réflexion longue a été retiré car il épuisait les petits budgets sans produire de réponse.

## Reprendre une tâche

Les règles partagées sont dans `.continue/rules/01-wolfguard.md`. Elles demandent de lire les consignes et le guide de reprise, puis de terminer par les vérifications, le commit et le push explicite.

Découper les tâches importantes : une vue, un contrat d’API ou un comportement à la fois. Demander à l’agent de chercher les symboles puis de lire les fichiers utiles. Ne pas envoyer tout le dépôt dans une seule question.

`.continueignore` écarte du contexte automatique les sorties `docs/`, caches, dépendances et profils personnels. L’agent peut toujours lancer les commandes de build et contrôles nécessaires depuis le terminal.

## Vérifications sans interface

```powershell
Invoke-RestMethod http://127.0.0.1:11434/api/version
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

Dans Continue, le bouton de mode doit afficher **Agent** et le sélecteur le modèle local. Si un ancien profil `new-config.yaml` est sélectionné, choisir le profil local. Ne pas recopier les anciennes clés API dans le dépôt.

Pour rétablir les alias, si les modèles d’origine sont déjà présents :

```powershell
$local = @{model='wolfguard-code:9b'; from='qwen3.5:9b'; parameters=@{num_batch=128;num_ctx=16384;num_gpu=99}; stream=$false} | ConvertTo-Json -Depth 4
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:11434/api/create -ContentType application/json -Body $local
$completion = @{model='qwen2.5-coder:1.5b-base-cpu'; from='qwen2.5-coder:1.5b-base'; parameters=@{num_gpu=0;num_ctx=2048}; stream=$false} | ConvertTo-Json -Depth 4
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:11434/api/create -ContentType application/json -Body $completion
```

Ne pas réinstaller les modèles si seuls le profil ou la sélection de VS Code sont incorrects. Les anciens profils personnels peuvent contenir des clés API : ils restent locaux, exclus de Git.
