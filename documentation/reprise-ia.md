# Reprendre le projet avec l’IA locale

Lire ce document et les [instructions du dépôt](instructions-ia.md) au début d’une nouvelle tâche. La conversation passée n’est pas nécessaire pour retrouver les règles du projet.

## Première lecture

1. Lire [les décisions](decisions.md) et [l’architecture](architecture.md).
2. Examiner `git status --short --untracked-files=all`, `git diff`, `git diff --cached` et `git log -5 --oneline`.
3. Identifier les fichiers déjà modifiés par l’utilisateur. Ne pas les écraser ni les inclure dans un commit sans rapport avec la tâche.
4. Lire uniquement les modules et la page de documentation utiles. Le modèle local est configuré pour 16 384 tokens : chercher avec `rg`, puis lire des portions de fichiers.
5. Proposer et réaliser un changement ciblé, avec les contrôles de [développement](developpement.md).

Un dépôt sale n’est pas un motif pour abandonner. Utiliser si nécessaire un worktree temporaire vérifié dans `.cache/`. Ne jamais exécuter `git reset --hard`, `git clean -fd`, ni un ajout global pour résoudre les changements en attente.

## Repères de comportement

- Session : expiration après **4 heures d’inactivité**, sans maximum absolu de durée. Le polling ne compte pas comme activité.
- MFA : Authenticator TOTP ; remplacement du téléphone sans désactiver le facteur actuel avant validation du nouveau.
- Partage et permissions conservés. Les droits d’un agent se règlent poste par poste.
- Aucune fonction de sauvegarde utilisateur à réintroduire. Préserver les données et copies techniques déjà présentes.
- L’agent Windows ne doit pas être annoncé comme signé par Windows sans vérification Authenticode.
- Le domaine, le lien privé et les clés ne sont pas à recréer ou à déplacer pour une tâche ordinaire.

## Fin obligatoire de la tâche

1. Mettre à jour la documentation concernée.
2. Reconstruire `docs/` avec `npm run build` si des sources du frontend, du navigateur ou de l’agent distribué changent.
3. Exécuter les contrôles adaptés et examiner `git diff --check`.
4. Préparer uniquement les fichiers du changement : `git add -- <chemins explicites>`.
5. Vérifier `git diff --cached`, puis créer un commit.
6. Depuis le dépôt principal, exécuter **`git push origin main`**. En cas d’échec, conserver le commit et annoncer que la publication reste à faire.
7. Nettoyer seulement les fichiers temporaires devenus inutiles après intégration et publication.

Cette séquence est le « push automatique » attendu en fin de tâche de l’IA. Elle ne réactive pas la surveillance du dossier. Ne pas lancer `scripts/watch-myapp.ps1` ou `scripts/sync-myapp.ps1`, ni la tâche Windows `WolfGuard-Web-AutoPublish`.

Le push GitHub ne déploie pas l’API Sites. Une tâche sur le serveur exige aussi son déploiement distinct si l’objectif comprend la mise en production.

## Ne pas ouvrir

Les clés privées, fichiers `.env`, profils de connexion dans `.continue/agents/`, bases, jetons et données utilisateur ne servent pas à comprendre l’architecture. Ne pas en afficher le contenu, les copier dans un prompt, les ajouter à Git ou les publier. Les contrôles doivent masquer les valeurs.

Pour continuer sans historique de conversation : « Lis documentation/instructions-ia.md et documentation/reprise-ia.md, examine l’état Git, puis réalise la tâche suivante : … ».
