# WolfGuard Antivirus avec ClamAV

L’utilisateur a choisi un **moteur libre intégré**. L’agent Windows x64 intègre désormais l’installation de ClamAV, ses mises à jour de signatures, l’analyse réelle des contenus et une quarantaine chiffrée réversible. L’antivirus natif et le pare-feu restent actifs.

**Couverture : surveillance réactive avec parcours progressif des disques locaux Windows accessibles, sans interception avant ouverture ou exécution.** Le statut antivirus est calculé à partir de WolfGuard/ClamAV, indépendamment de Defender. Cette intégration n’est pas un antivirus inscrit au Centre de sécurité Windows ni un EDR complet. Les protections natives restent actives. Linux et macOS conservent leur collecte native ; aucun moteur WolfGuard n’y est activé par cette version.

## Activation sur un poste

1. Installer ou mettre à jour l’agent Windows x64 depuis les fichiers publiés.
2. Dès que l’agent associé reçoit sa politique « Protéger », il installe le moteur officiel et télécharge ses signatures, sans commande d’installation ni navigateur ouvert.
3. La surveillance est activée seulement après confirmation de l’installation et des signatures. Les agents déjà associés bénéficient du même amorçage après leur mise à jour.
4. Dans Sécurité → fiche du poste → EDR, vérifier les versions, les signatures, les dossiers couverts et les éventuelles erreurs. Le bouton « Réessayer l’installation maintenant » reste un recours immédiat après un échec.

L’installation automatique concerne Windows x64 en mode « Protéger ». Elle attend une politique reçue du relais authentifié ; un état ancien ou une absence de connexion ne suffit pas à démarrer une nouvelle installation. « Observer » empêche cet amorçage et suspend la surveillance. Une pause explicite est conservée après redémarrage, y compris les anciens états sauvegardés désactivés ; elle n’est pas annulée par l’automatisation. Les signatures d’un moteur installé restent entretenues pendant une pause, sans réactiver la surveillance. Les analyses manuelles restent possibles. Suspendre WolfGuard ne désactive jamais Defender ni le pare-feu.

Un téléchargement ou une première mise à jour interrompus sont retentés automatiquement après une heure, avec un délai mémorisé entre les redémarrages. Le mode « Observer », une pause ou l’arrêt de l’agent annulent l’installation automatique en cours. Une commande en attente ou un téléchargement terminé ne valent pas installation opérationnelle. Les installations et les actualisations confirmées ou en échec apparaissent dans le [journal du poste](agents/journal.md).

## Moteur et signatures

Le manifeste `agent/antivirus-dependencies.json` fixe ClamAV 1.5.5 Windows x64 : archive officielle de 225 800 047 octets, SHA-256 imposé, téléchargement HTTPS limité aux domaines de distribution GitHub autorisés. Version vérifiée sur la publication officielle le 20 novembre 2026 ; taille, SHA-256 et chemins du scanner et de FreshClam contrôlés sur l’archive téléchargée, sans exécution du moteur sur le poste de développement. L’archive complète est extraite dans un dossier protégé ; chemins sortants, doublons, liens et extractions excessives sont refusés. Une installation interrompue ne devient pas le moteur actif et peut être relancée. Les exécutables sont contrôlés à la reprise de l’agent.

Le moteur extrait représente environ 940 Mo ; prévoir plusieurs Go libres pour l’archive, les bases, les copies temporaires et la quarantaine. Il n’est pas inclus dans le petit installateur WolfGuard : le poste le télécharge lors de l’activation.

FreshClam télécharge et vérifie les bases officielles. L’agent vérifie les signatures toutes les heures, même si les bases présentes sont récentes et si le site est fermé. Les vérifications DNS officielles et les mises à jour différentielles restent activées. Le délai entre les essais est mémorisé après un échec et un redémarrage. « Actualiser les signatures maintenant » permet une demande immédiate. L’état affiche la date réelle du contenu CVD/CLD, pas la date du fichier. Des bases absentes ou âgées de plus de deux jours empêchent de confirmer une mise à jour et de conclure qu’un fichier est sain.

Le moteur reste épinglé à une version validée : les mises à jour autonomes de l’agent diffusent le manifeste suivant et déclenchent l’installation de sa version du moteur. Une ancienne version installée n’empêche donc pas la montée de version automatique. L’agent ne télécharge pas une version arbitraire de ClamAV sans son empreinte approuvée.

ClamAV est exécuté comme programme séparé avec ses notices et sa licence GNU GPL v2, conservées dans l’archive officielle. L’intégration ne modifie pas la licence du reste du projet et ne lie pas directement libclamav. Sources et notices de cette version : [publication officielle](https://github.com/Cisco-Talos/clamav/releases/tag/clamav-1.5.5), [libclamav et licence](https://docs.clamav.net/manual/Development/libclamav.html).

## Analyse et limites

Les racines Windows sont les disques locaux fixes remontés par `Win32_LogicalDisk`. Avant leur découverte, la racine du disque du compte est utilisée. Le parcours comprend les répertoires accessibles des autres comptes selon les droits du service. Les volumes réseau, les liens/jonctions et les fichiers OneDrive uniquement présents dans le cloud ne sont pas couverts. Consulter les racines effectivement remontées et le compteur des fichiers ignorés.

La surveillance vérifie les fichiers nouveaux ou modifiés, avec un délai de 30 secondes après la fin du passage précédent. Un curseur reprend le parcours pour éviter de laisser les derniers répertoires sans visite. Limites : profondeur 64, 10 000 fichiers visités par passe, 100 fichiers à examiner automatiquement ou 2 000 manuellement, 64 Mio par fichier ; l’analyse des archives est aussi bornée. Un lot contient au maximum 20 fichiers et 64 Mio. Les opérations sont annulables ; une analyse dure au maximum dix minutes. La mise en route du scanner et la taille des bases peuvent ajouter un délai notable. Une limite ou une erreur est signalée sans produire un verdict sain. Cette couverture ne détecte pas toutes les menaces, les attaques en mémoire ou un processus déjà exécuté. Le curseur de parcours n’est pas persisté après redémarrage de l’agent.

L’EDR ajoute un inventaire système et des observations indépendantes des fichiers : processus, services, connexions, démarrage et certains événements des journaux System et Security. Les limites d’accès aux journaux sont remontées. Les événements et les rapports terminés sont conservés 30 jours côté serveur. Voir le [suivi du rapport](integration-rapport.md).

Le moteur analyse une copie privée des octets lus. Chaque verdict est associé au chemin exact de cette copie. Après détection, l’agent vérifie à nouveau l’identité et l’empreinte du fichier avant de le déplacer. Un fichier modifié, un lien, un fichier à liens multiples ou une action non confirmée n’est pas supprimé automatiquement.

## Quarantaine et droits

Le contenu et les métadonnées sont chiffrés avec AES-256-GCM, IV aléatoire et données authentifiées distinctes. La clé aléatoire est protégée par DPAPI pour le compte Windows de l’agent. Les ACL limitent le magasin au compte autorisé, aux administrateurs et à SYSTEM ; une exécution élevée protège aussi son écriture contre le jeton non élevé. Cela ne rend pas le magasin inaccessible à un administrateur ou à un compte d’agent compromis. Ne pas supprimer sa clé : elle est nécessaire à la restauration.

Le magasin est placé dans le dossier de données de l’agent, sous `antivirus/`, et limité à 100 entrées et 2 Gio. Sur un autre volume, un déplacement peut échouer : le fichier original est alors conservé et la détection reste non résolue. Un échec nécessitant une récupération manuelle bloque la suppression de sa copie de secours. Aucun nettoyage ne doit effacer une récupération encore nécessaire.

La restauration ne remplace jamais un fichier existant, reste dans le périmètre du poste et exige une confirmation. Un fichier restauré peut être détecté à nouveau lors du passage suivant. « Supprimer la copie » efface la copie chiffrée, sans promettre de supprimer un original dont le déplacement a échoué.

Toutes les commandes passent par les droits `edr.manage` et les restrictions **poste par poste**, contrôlés à la demande, à l’attribution et au résultat. Les requêtes ne transportent pas un chemin libre à supprimer/restaurer, mais un identifiant opaque local. Une révocation ou expiration annule une commande en cours au prochain échange. La suspension peut annuler une analyse ou installation déjà attribuée. Les états hors ligne sont présentés comme non confirmés. Aucun contenu de fichier analysé n’est envoyé au serveur ; les chemins et verdicts remontent dans la télémétrie chiffrée existante.

## Maintenance et validation

### Incident de collecte Windows du 21 novembre 2026

Sur le poste associé, le moteur ClamAV 1.5.5 et les bases étaient présents, mais la version distribuée de `endpoint.ps1` échouait avant toute remontée EDR. Les apostrophes typographiques dans deux chaînes entre apostrophes simples étaient reconnues comme délimiteurs par PowerShell lorsque le fichier empaqueté était décodé correctement en UTF-8 avec BOM. Un essai du seul fichier source sans BOM ne reproduisait pas cet échec. Les messages concernés et ceux du désinstalleur utilisent maintenant des formulations sans délimiteur ambigu.

Le packaging Windows analyse désormais la syntaxe de tous les fichiers PowerShell avec les octets et l’encodage de l’archive avant de produire une distribution. `tests/agent_powershell_package_test.py` vérifie aussi le refus d’un exemple cassé et exécute uniquement la collecte du fichier empaqueté, sans modification des protections du système.

Deux autres défauts au redémarrage ont été corrigés : le disque parent contenant le magasin antivirus était retiré du périmètre initial, et un moteur présent avec des signatures valides conservait parfois le message initial « pas encore installé ». Le disque système est maintenant surveillé dès le démarrage ; seul le contenu du magasin privé est exclu pendant le parcours. Un périmètre réellement vide n’est jamais déclaré prêt et une analyse vide ne confirme pas une protection.

### Reprise du poste du 26 novembre 2026

Le poste installé en version `0c0456a1e3a4` restait connecté mais échouait à chaque collecte EDR : l’analyse syntaxique de son `endpoint.ps1` distribuait cinq erreurs, dont un jeton inattendu à la ligne 54. Les corrections locales ci-dessus n’avaient pas encore été publiées. La nouvelle distribution les intègre et vérifie le fichier réellement empaqueté avant publication.

La collecte Windows et l’état ClamAV sont désormais indépendants. Une défaillance de PowerShell conserve la remontée antivirus et la réception de sa politique ; une défaillance du magasin antivirus conserve l’inventaire Windows et le pare-feu. Le relevé précise les éléments non confirmés et ne déclare pas le poste protégé à partir d’un état partiel. Le nom du poste et le compte du processus peuvent être fournis directement par Node ; le compte du processus n’est jamais présenté comme l’utilisateur interactif. L’annulation de l’agent annule aussi ce relevé partiel.

L’état technique `protection-connected` est écrit uniquement après réception du relevé par l’API et lecture de sa politique. Il permet de distinguer la connexion générale de l’agent d’une remontée EDR effectivement acceptée, sans consigner de jeton ni de contenu de document.

Vérification du 26 novembre après mise à jour sur le poste concerné : version `fb13c2e0bb96`, relevé accepté par l’API, santé `protected`, moteur ClamAV `1.5.5` installé et activé, surveillance et pare-feu activés, signatures à jour, disque `C:\` couvert, zéro erreur et aucun avertissement dans le relevé contrôlé. L’utilisateur interactif, le compte du processus et le domaine sont renseignés. Ce contrôle ponctuel confirme la réparation de ce poste ; il ne remplace pas le suivi des prochains relevés.

Sources : `agent/antivirus.mjs`, `antivirus-engine.mjs`, `antivirus-store.mjs`, `antivirus-windows.ps1`, `agent/endpoint.mjs`, `server/lib/wolfguard/antivirus-spec.mjs`, `endpoints.mjs`, `app/js/views/edr.js`.

```powershell
node --test tests/antivirus-startup.test.mjs tests/antivirus-auto.test.mjs tests/antivirus.test.mjs tests/antivirus-api.test.mjs tests/endpoint.test.mjs
python tests/agent_powershell_package_test.py
python tests/antivirus_workspace_test.py
python scripts/package-agent.py --check
```

Les tests couvrent les erreurs de moteur, téléchargements altérés, limites, substitutions, stockage chiffré, restauration sans écrasement, commandes annulées, droits révoqués, compatibilité des anciens agents et interface mobile. Le moteur officiel et ses bases ont aussi été exécutés sur des fichiers témoins inoffensifs isolés. Ces contrôles ne constituent pas une certification antivirus ou un audit indépendant. Aucun pilote, exclusion Defender ou changement des protections du poste utilisateur n’est nécessaire à ces tests.

Le blocage préventif Windows reste un chantier distinct : [ClamOnAcc concerne Linux](https://docs.clamav.net/manual/OnAccess.html). Si un minifiltre Windows est développé ultérieurement, il faudra aussi traiter [son intégration](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/creating-an-inf-file-for-a-minifilter-driver) et [sa signature](https://learn.microsoft.com/en-us/windows-hardware/drivers/dashboard/code-signing-reqs). L’utilisateur a abandonné l’achat d’un certificat : ne pas engager cette démarche sans nouvelle demande.
