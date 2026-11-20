# Journal des alertes du poste

Dans **Sécurité**, la liste des postes occupe une hauteur stable, indépendamment du nombre de lignes ou des filtres. La molette fait défiler les lignes dans le tableau ; les en-têtes restent visibles sur ordinateur. Sur mobile, les cartes défilent dans le même espace borné.

Ouvrir une fiche, puis **Journal**, affiche les événements de ce poste, du plus récent au plus ancien : date, statut, gravité, fournisseur et détails. La recherche, les filtres, la pause et le chargement des événements plus anciens restent dans la fiche. La vue charge 50 événements par page, sans interroger les journaux de tous les postes. Elle s’actualise avec le parc, environ toutes les 10 secondes, tant qu’elle est ouverte, hors pause et hors consultation des pages anciennes. Une panne conserve les lignes déjà chargées en signalant l’échec. « Gérer dans EDR » ouvre les commandes et l’acquittement existants.

L’agent collecte déjà les détections et blocages natifs ainsi que les événements de WolfGuard Antivirus. La nouvelle version ajoute les observations suivantes : antivirus, temps réel ou pare-feu explicitement désactivé, signatures à actualiser, moteur WolfGuard activé mais en erreur. Un état inconnu ne devient ni une alerte de désactivation ni une confirmation de rétablissement. Les plateformes non prises en charge et une pause volontaire du moteur WolfGuard ne produisent pas d’alerte inventée.

Chaque incident est transmis une fois, puis reste silencieux tant que son état persiste. Les événements en attente restent en mémoire pour réessayer après une panne du relais, dans la limite de 100 observations. La réception confirmée retire ces événements de la file ; un redémarrage de l’agent réinitialise cette file en mémoire. Un relevé confirmé comme rétabli ferme l’alerte d’état précédente et ajoute une ligne de rétablissement au journal. Les détections natives conservent leur propre cycle de traitement.

La remontée utilise les relevés EDR existants, normalement espacés de 30 secondes, et nécessite la nouvelle version de l’agent. Aucun nouveau service ni migration serveur n’est requis. L’API conserve le chiffrement et les droits par poste ; le journal ne rend aucun poste réservé accessible à un autre rôle.

Vérifications sans fenêtre : `node --test tests/endpoint-alerts.test.mjs tests/endpoint.test.mjs`, `python tests/agent_journal_test.py` et `python tests/agents_console_test.py`. Les données et les postes sont synthétiques.
