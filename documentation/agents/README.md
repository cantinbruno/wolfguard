# Agents associés aux postes

Les sources sont dans `agent/`. Les notices `LIRE-MOI.txt` et `LIRE-MOI-POSIX.txt` restent dans ce dossier car elles sont intégrées aux archives d’installation.

## Exécution

Le moteur commun `agent.mjs` gère l’association et les échanges avec l’API. Les modules dédiés prennent en charge réseau, topologie, collecte, EDR, bureau, terminal et fichiers. Les opérations restent contrôlées côté serveur et par les règles de l’agent.

Windows utilise les lanceurs PowerShell/C# et les composants de capture. Linux et macOS utilisent les lanceurs shell et services utilisateur. Le composant de protection privilégié a son installation et ses droits propres ; une mise à jour de l’agent utilisateur ne doit pas l’écraser.

Pour le bureau Windows, les dépendances et composants natifs sont décrits dans `agent/remote-dependencies.json` et les modules `remote-*`. Le composant d’image doit être démarré depuis les ressources de la version courante.

## Association, droits et mise à jour

L’association d’un poste est indépendante de la connexion du compte navigateur. Un lien personnel peut permettre une association unique pendant une durée limitée. Garder les jetons d’agent hors des archives publiques.

Les permissions sont réglables poste par poste et restent limitées par les droits de section. Les opérations déjà en cours doivent être révoquées lorsque les accès nécessaires disparaissent. Voir [Droits](../droits.md).

La mise à jour télécharge uniquement les fichiers autorisés, contrôle le manifeste et les empreintes, puis attend le retour du poste avec la version attendue. Préserver son association. Un SHA-256 vérifié n’est pas une signature d’éditeur Windows.

## Packaging

```powershell
python scripts/package-agent.py --check
```

La reconstruction normale passe par `npm run build`. Le packaging utilise des listes de fichiers autorisés ; ajouter un module source à une archive exige de mettre à jour ce contrat et les tests correspondants. Les fichiers publics produits vivent dans `app/downloads/` et `docs/downloads/`.

## Tests

Les tests Node des agents et contrats peuvent s’exécuter sur des données temporaires. Ne pas lancer les tests de capture, saisie, clics, fenêtres natives ou modification des protections sur le poste utilisateur sans demande explicite.

La procédure [Signature Windows](signature-windows.md) reste facultative et exige un certificat reconnu réellement disponible. L’utilisateur a abandonné l’achat du certificat ; ne pas le relancer automatiquement.
