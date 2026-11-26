# Serveur et API

Le dossier `server/` contient le source de l’API, sa chaîne Worker/Vinext, ses migrations D1 et sa configuration d’hébergement. Sa documentation est regroupée sur cette page.

## Hébergement à préserver

Le frontend reste sur GitHub Pages : `https://wolfguard.wavetools.fr/`. Le serveur existant est `https://wolfguard-web-cantin.cantin-bruno.chatgpt.site`.

Le projet Sites est identifié dans `server/.openai/hosting.json` ; ses bindings sont `DB` (D1) et `BUCKET` (R2). Ne pas recréer un Site, remplacer son stockage ou déplacer le domaine frontend. L’accès plateforme du serveur doit permettre les requêtes anonymes aux endpoints d’entrée ; l’authentification et les permissions de l’application restent obligatoires pour les données.

## Modules

| Domaine | Modules dans `server/lib/wolfguard/` |
| --- | --- |
| Entrée, connexion, sessions, snapshots | `core.mjs`, `request.mjs`, `session-policy.mjs` |
| Comptes, invitations et réinitialisations | `users.mjs` |
| Connexions, blocage d’IP et réputation Spamhaus | `access.mjs`, `threat-list.mjs`, `threat-seed.mjs` |
| TOTP et remplacement de téléphone | `otp.mjs` |
| Modèle et stockage des droits | `permissions.mjs`, `permission-store.mjs`, `access-groups.mjs`, `group-membership.mjs` |
| Espaces partagés et coffres personnels | `workspace-access.mjs`, `workspace-key.mjs`, `personal-vault.mjs` |
| Postes, sections de postes et contrôle d’accès | `agents.mjs`, `agent-access.mjs`, `fleet-groups.mjs` |
| Outils distants | `remote.mjs`, `terminal.mjs`, `files.mjs`, `endpoints.mjs` |
| Rapprochement des avis publics | `certfr.mjs` |
| Conservation des journaux et répartition du stockage | `retention.mjs`, `storage-usage.mjs` |
| IA via un poste et discussion | `ai.mjs`, `ai-input.mjs`, `chat-api.mjs`, `chat-history.mjs` |
| Notifications navigateur historiques (coupées par `MFA_BROWSER_PUSH_ENABLED=0`) | `push.mjs` |

L’ordre des contrôles d’une requête et la carte des routes sont décrits dans [Architecture](architecture.md#traitement-dune-requête-api). Le reste de `server/` est la chaîne fournie par Sites : `app/` (route API unique et page racine qui répond 404), `worker/index.ts`, `lib/connector*` (liaison de la plateforme), `scripts/` (installation et compilation), `db/` et `drizzle/` (schéma et migrations), `vendor/` (Web Push et thème CSS). Les suffixes `*-spec.mjs` définissent des contrats et limites utilisés par les API et agents. Lire le contrat avant de changer un format de message ou les limites d’un transfert.

## Authentification et données

Le lien privé est vérifié sans donner de session de données. L’utilisateur s’authentifie avec son code personnel et le facteur MFA requis. Les codes personnels sont uniques entre comptes et les essais sont limités côté serveur. L’adresse de compte reste utile à l’administration, même lorsqu’elle n’est pas saisie à la connexion.

Les sessions expirent après quatre heures d’inactivité. Une activité déclarée et validée peut prolonger l’échéance ; une ancienne session expirée ne peut pas être réanimée. La reprise après rafraîchissement concerne le même onglet et ne renouvelle pas automatiquement l’activité.

Les uploads R2 sont immuables ; D1 valide la référence et la révision par comparaison atomique. Les écritures obsolètes sont refusées et une erreur d’upload ne doit pas remplacer la copie validée. Le filtrage serveur des espaces et coffres fait partie du contrat de partage choisi par l’utilisateur.

## Secrets : noms seulement

- `AUTH_PEPPER` : secret de vérification et d’identification des codes.
- `STORAGE_KEY` : chiffrement serveur ; préserver cette clé pour relire les objets existants.
- `WORKSPACE_KEY_ENCRYPTION_KEY` : enveloppement indépendant de la clé partagée.
- `ENTRY_LINK_HASH` : empreinte de la clé du lien privé.
- `BOOTSTRAP_HASH` : empreinte du jeton d’initialisation, pour l’installation initiale uniquement.

D’autres réglages historiques peuvent exister. Leur présence ne justifie pas de les effacer. Ne pas afficher les valeurs, exporter l’environnement ou tourner les secrets pendant une tâche ordinaire. Ne pas initialiser une seconde fois un espace existant.

## Développement

Depuis `server/` :

```powershell
npm ci
node --test tests/security.test.mjs
npm run build
```

Les scripts `dev`, `preview` et `start` de `server/package.json` décrivent les modes locaux. Employer des bases et jetons synthétiques pour les essais. Les tests de la racine couvrent aussi l’API avec des bases temporaires.

Une modification de schéma demande une migration additionnelle dans la chaîne existante `server/db/` et `server/drizzle/`. Ne pas réécrire l’historique déjà appliqué ni réinitialiser D1/R2.

## Publication

1. Vérifier les modules, migrations et tests de la tâche ; publier le code Git selon [Publication](publication.md).
2. Utiliser les outils Sites et leur procédure du projet existant pour obtenir le checkout source de l’API.
3. Intégrer uniquement les fichiers serveur concernés, préserver ses fichiers d’hébergement et ses bindings.
4. Compiler avec le script de construction du serveur et préparer l’archive attendue par le flux Sites.
5. Sauvegarder une version de source et déployer cette version sur **le même projet**.
6. Attendre le statut de déploiement réussi et vérifier un endpoint public sans secret. Ne pas changer l’audience ni les secrets pour résoudre un problème de code.

Un agent local sans accès aux outils Sites peut préparer et pousser le code, mais doit annoncer explicitement que le déploiement API reste à faire. Un `git push` n’est pas un déploiement Sites.

## Groupes d’autorisations

`access-groups.mjs` gère les groupes d’accès et les appartenances multiples dans la table chiffrée `access_groups` (migration `0020_stiff_purifiers.sql`). `users/groups` expose lecture, reprise, création, duplication, renommage, politique, ajout, retrait et remplacement atomique des appartenances. Les écritures utilisent une révision commune et refusent les clients obsolètes. Les groupes automatiques suivent la nomenclature `GG_Acces_<Nom>_lecture|ecriture`, avec `GG_Acces_Application_administrateur` pour l’accès complet. Les politiques antérieures sont reprises sans élargissement dans des groupes conservés. `fleet_groups` reste distinct pour l’organisation des postes, mais sa création, son renommage et sa suppression réconcilient immédiatement les deux groupes d’accès associés, retirent les appartenances obsolètes et révoquent les sessions concernées.
