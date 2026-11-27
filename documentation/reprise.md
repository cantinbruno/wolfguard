# Reprendre le projet

Page à lire au début d’une nouvelle tâche : elle réunit les règles de travail du dépôt. Tous les guides restent dans `documentation/` ; le dépôt a seulement un court `README.md` à la racine qui renvoie ici.

## Première lecture

1. Lire [les décisions](decisions.md) et [l’architecture](architecture.md), puis la page utile depuis le [sommaire](README.md).
2. Examiner `git status --short --untracked-files=all`, `git diff`, `git diff --cached` et `git log -5 --oneline`.
3. Identifier les fichiers déjà modifiés par le propriétaire. Ne pas les écraser ni les inclure dans un commit sans rapport avec la tâche.
4. Chercher avec `rg`, puis lire seulement les portions de fichiers utiles.
5. Réaliser un changement ciblé, avec les contrôles de [développement](developpement.md).

Un dépôt avec des modifications en attente n’est pas un motif pour s’arrêter. Utiliser si nécessaire un worktree temporaire vérifié dans `.cache/`. Ne jamais exécuter `git reset --hard`, `git clean -fd`, ni un ajout global pour résoudre les changements en attente.

## Repères de comportement

- Session : expiration après **4 heures d’inactivité**, et au plus 24 heures après la connexion. Le polling ne compte pas comme activité.
- MFA : Authenticator TOTP, seul second facteur. Le remplacement d’appareil ne désactive pas le facteur actuel avant validation du nouveau.
- Partage et permissions conservés. Tous les droits viennent de groupes d’accès cumulatifs dans Paramètres → Groupes, sans réglage individuel. Chaque section ou paramètre possède `GG_Acces_<Nom>_lecture` et `GG_Acces_<Nom>_ecriture` ; sans appartenance, la section est invisible. `GG_Acces_Application_administrateur` donne l’accès complet. Les sections de postes créent, renomment et suppriment automatiquement leurs deux groupes. Reprise sans élargissement des anciens accès ; coffres personnels isolés et ouverts directement dans le dossier de l’adresse mail. Voir [Droits](droits.md).
- Données : import/export chiffré autorisé. L’import ajoute des copies sans remplacer les comptes, droits ou données existantes. Préserver les copies techniques.
- L’agent Windows ne doit pas être annoncé comme signé par Windows sans vérification Authenticode.
- Le domaine, le lien privé et les clés ne sont pas à recréer ou à déplacer pour une tâche ordinaire.
- Un changement du site reste compatible avec l’API déjà en production (aucun nouvel en-tête HTTP, voir [Publication](publication.md#ordre-de-déploiement)).
- Rien de payant : ne pas proposer ni mettre en place un service payant.
- Aucune mention de version ni de journal des changements : l’application évolue trop vite pour cela.

## Fin de tâche obligatoire

1. Mettre à jour la documentation concernée.
2. Reconstruire `docs/` avec `npm run build` si des sources du frontend, du navigateur ou de l’agent distribué changent.
3. Exécuter les contrôles adaptés (voir [Développement](developpement.md)) et examiner `git diff --check`.
4. Préparer uniquement les fichiers du changement : `git add -- <chemins explicites>`.
5. Vérifier `git diff --cached`, puis créer un commit. Le message ne contient aucune ligne de signature ou de co-auteur.
6. Exécuter **`git push origin main`** : le dépôt GitHub doit toujours contenir la même chose que le dossier local. En cas d’échec, conserver le commit et signaler que la publication reste à faire.
7. Consulter le résultat de GitHub Actions avant d’annoncer une publication saine.
8. Nettoyer seulement les fichiers temporaires devenus inutiles après intégration et publication.

Cette séquence est le « push automatique » attendu en fin de tâche. Elle ne réactive pas la surveillance du dossier : ne pas recréer de surveillance ni réactiver la tâche Windows `WolfGuard-Web-AutoPublish` (ses scripts ont été supprimés le 26 novembre 2026).

Le push GitHub ne déploie pas l’API Sites. Une tâche sur le serveur exige aussi son déploiement distinct si l’objectif comprend la mise en production. Voir [Publication](publication.md).

## Nettoyage après chaque modification

Ne pas conserver de versions de travail obsolètes. Après intégration, vérification et publication, supprimer les worktrees temporaires, anciens checkouts, archives de déploiement, artefacts d’essai et dépendances dupliquées devenus inutiles. Conserver uniquement les fichiers utiles à la version courante.

Avant suppression, vérifier que les changements utiles sont intégrés ou publiés et que les chemins restent dans le dossier temporaire prévu. Préserver les clés privées, les données utilisateur, les sauvegardes encore nécessaires et tout travail non intégré.

Ne pas lancer de tests qui ouvrent des fenêtres, prennent le focus ou injectent des clics et touches sur le poste sans demande explicite.

## Ne pas ouvrir

Les clés privées, fichiers `.env`, profils de connexion personnels, bases, jetons et données utilisateur ne servent pas à comprendre l’architecture. Ne pas en afficher le contenu, ne pas les ajouter à Git et ne pas les publier. Les contrôles doivent masquer les valeurs.
