# Objectif : WolfGuard assure la protection antivirus

L’utilisateur veut que WolfGuard assure la détection et le traitement des menaces sur les postes. Le pilotage de Defender et des protections natives décrit dans le code actuel ne suffit pas à cet objectif.

**État : architecture à réaliser. Aucun moteur antivirus autonome n’a été ajouté par cette page.** Le choix entre intégration d’un moteur libre éprouvé et développement d’un moteur propre reste à préciser. Ne pas présenter une future fonctionnalité comme déjà installée ou validée.

## Composants nécessaires

| Composant | Comportement attendu |
| --- | --- |
| Moteur de détection | Analyse réelle des contenus, exécutables, documents et archives avec verdict explicite ; distinction entre sain, détecté, erreur et analyse incomplète. |
| Mises à jour | Vérification de l’origine et de l’intégrité du moteur et des bases ; conservation de la dernière version valide ; échec visible sans annoncer une protection à jour. |
| Quarantaine | Conservation sécurisée et non exécutable du contenu détecté, identité du fichier et empreinte vérifiées, contrôle des liens et des accès ; restauration autorisée et journalisée. |
| Surveillance | Définition explicite des fichiers et événements couverts ; distinction entre détection après écriture et blocage avant ouverture ou exécution. |
| Service du poste | Démarrage et récupération après panne, séparation des privilèges, communication locale contrôlée et état de santé vérifiable. |
| Interface et API | Actions autorisées poste par poste, événements fiables, visibilité sur les limites et sur l’état réel du moteur WolfGuard. |

Une erreur, une base absente ou périmée, un fichier inaccessible ou un dépassement de limite ne doit jamais devenir un verdict « sain ». Une perte de contact ne prouve pas que la protection du poste fonctionne encore.

## Choix du moteur

Une possibilité est d’intégrer ClamAV, qui fournit un moteur réel d’analyse et une base de signatures. Les obligations de licence et de redistribution doivent être respectées ; lier directement libclamav impose sa compatibilité GPL. Ne pas modifier la licence du projet ni redistribuer un binaire tiers sans examiner ce choix.

Un moteur développé entièrement pour WolfGuard exige aussi une base de détection, ses mises à jour, l’analyse des formats, les limites anti-déni de service et une évaluation des faux positifs et faux négatifs. Des listes d’extensions ou quelques empreintes maison ne constituent pas cette couverture.

## Particularité Windows

Le composant ClamOnAcc de ClamAV fournit le contrôle à l’accès sous Linux. Il n’apporte pas ce mécanisme sous Windows. Un watcher Windows qui déclenche un scan après l’écriture peut laisser un programme s’exécuter avant le verdict : le nommer protection réactive, sans annoncer un blocage préventif.

La prévention Windows demande un mécanisme d’interception adapté et des tests de concurrence. Si un pilote minifiltre est développé, sa distribution exige aussi le parcours de signature Windows approprié. La signature d’un exécutable et celle d’un pilote sont deux sujets distincts ; aucun certificat ne doit être acheté ou installé sans décision explicite.

## Quarantaine et autorisations

- Agir sur les octets effectivement analysés ; vérifier l’identité et l’empreinte avant déplacement pour éviter les substitutions entre scan et action.
- Refuser les chemins hors périmètre, liens symboliques, jonctions, points de réanalyse et restaurations qui écraseraient un autre fichier.
- Protéger le magasin, ses métadonnées et ses clés ; ne pas réutiliser le répertoire des téléchargements de l’utilisateur.
- Préférer une quarantaine réversible à la suppression automatique. La restauration et la suppression définitive demandent une action autorisée.
- Appliquer les droits de section et par poste sur chaque opération, y compris une commande déjà en attente après révocation.

## État affiché et compatibilité

Conserver des états distincts pour le moteur WolfGuard, l’antivirus natif et le pare-feu. Ne pas renommer une détection Defender en détection propre à WolfGuard. Le code actuel de collecte et de pilotage reste décrit dans [Agents](agents/README.md) et [Sécurité](securite.md).

Préserver les protections existantes pendant le développement. Ne pas désactiver Defender, ajouter des exclusions larges, activer un mode de pilotes de test ou contourner Secure Boot pour faire fonctionner un prototype sur un poste utilisé.

## Validation avant mise en production

Utiliser des machines virtuelles et fichiers de test inoffensifs. Aucun test de blocage, quarantaine, pilote ou changement de protection sur le poste de l’utilisateur sans demande explicite.

Vérifier au minimum : fichier de test reconnu, fichiers sains inchangés, absence de signatures, limites d’archives, fichiers verrouillés, changement de fichier pendant l’analyse, pannes, mises à jour altérées, droits révoqués, quarantaine et restauration. Les performances et la couverture doivent être mesurées sur les plateformes réellement prises en charge.

Le passage à un antivirus autonome est un chantier fonctionnel distinct. Cette spécification ne valide ni l’efficacité antivirus du produit actuel ni son remplacement des protections déjà actives.

## Références techniques

- [ClamAV : analyse et limites de l’outil](https://docs.clamav.net/manual/Usage/Scanning.html).
- [ClamAV : contrôle à l’accès sous Linux](https://docs.clamav.net/manual/OnAccess.html).
- [libclamav : interface et licence](https://docs.clamav.net/manual/Development/libclamav.html).
- [Microsoft : minifiltres de système de fichiers](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/creating-an-inf-file-for-a-minifilter-driver).
- [Microsoft : exigences de signature des pilotes](https://learn.microsoft.com/en-us/windows-hardware/drivers/dashboard/code-signing-reqs).
