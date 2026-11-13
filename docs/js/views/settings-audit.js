'use strict';

function settingsAuditHTML() {
  const groups = [
    ['Accès et authentification', [
      ['Code personnel', 'Accès par code de 8 chiffres. Les essais incorrects sont ralentis côté serveur.'],
      ['Double authentification', 'Authenticator et validation par téléphone sont pris en charge. Leur obligation dépend de la politique MFA du serveur.'],
      ['Droits des comptes', 'Les permissions sont contrôlées dans l’API pour les fiches, le coffre, les agents et la prise en main. Chaque poste peut être invisible, consultable en lecture ou autorisé en écriture, dans les limites des droits du compte. Les comptes et agents peuvent être révoqués.'],
      ['Sessions de 4 heures', 'La session expire au plus tard après 4 heures, même si l’application reste utilisée ou est rechargée. Une nouvelle authentification est ensuite nécessaire.']
    ]],
    ['Chiffrement et connexions', [
      ['Données de l’espace web', 'AES-256-GCM ; clé dérivée avec PBKDF2-HMAC-SHA-256 à 600 000 itérations. Sel aléatoire et nouvel IV à chaque écriture de l’espace.'],
      ['Code vérifié par le serveur', 'HMAC-SHA-256 avec un secret serveur, puis PBKDF2-SHA-256 à 100 000 itérations.'],
      ['Connexions HTTPS', 'Le navigateur et les agents communiquent avec l’API par HTTPS. Les jetons d’accès sont envoyés dans les en-têtes ; les requêtes API n’utilisent pas de cookies.'],
      ['Clés de partage protégées séparément', 'Les clés de partage sont chiffrées avec un secret serveur dédié, distinct de celui des données. Les anciennes clés sont migrées sans changer les données. Ce secret reste hors du code et du dépôt.'],
      ['Partage et permissions conservés', 'Le serveur déchiffre les espaces partagés pour appliquer les droits de chaque compte. Ce fonctionnement est conservé : il implique de faire confiance au serveur, dont les clés restent protégées par le secret dédié.'],
      ['Données côté serveur', 'Les informations sensibles sont chiffrées au repos. Les réponses API interdisent la mise en cache. L’accès aux clés nécessite une session authentifiée et les droits prévus.']
    ]],
    ['Protection de l’application', [
      ['Contenus importés', 'Le contenu HTML est nettoyé avec DOMPurify pour retirer les éléments dangereux.'],
      ['Scripts et ressources', 'La politique CSP limite les scripts et les destinations réseau. Les fichiers JavaScript et CSS publiés sont vérifiés par empreinte SRI SHA-384.'],
      ['Requêtes et autorisations', 'Origines web limitées par CORS, validation des entrées et requêtes SQL préparées côté serveur.'],
      ['Agents et mises à jour', 'Association à usage unique, jetons révocables et contrôle SHA-256 des paquets téléchargés. Les identifiants locaux sont protégés par DPAPI sous Windows ou par les permissions des fichiers sous Linux et macOS.'],
      ['Prise en main autorisée', 'Sur un poste Windows associé, le démarrage sans confirmation locale est le fonctionnement prévu. L’accès dépend des droits du compte et de l’agent ; le partage peut être arrêté et l’agent révoqué.']
    ]]
  ];
  const weaknesses = [
    ['Signature Windows', 'La procédure Authenticode est préparée, mais l’agent ne dispose pas encore d’un certificat d’éditeur reconnu par Windows. Le contrôle SHA-256 ne remplace pas cette signature.']
  ];
  const list = entries => `<ul>${entries.map(([title,description])=>`<li><strong>${esc(title)}</strong><p>${esc(description)}</p></li>`).join('')}</ul>`;
  return `<header class="settings-panel-head"><div class="settings-heading">${settingsIcon('shield-check')}<h3>Protection de l’application</h3></div></header>
    <p class="settings-protection-intro">Les protections de WolfGuard et les points à renforcer pour limiter les risques de piratage.</p>
    ${groups.map(([title,entries])=>`<section class="settings-protection-group"><h4>${esc(title)}</h4>${list(entries)}</section>`).join('')}
    <section class="settings-protection-weaknesses"><h4>Points à finaliser</h4>${list(weaknesses)}</section>
    <p class="settings-protection-note">Cette page décrit les protections prévues dans le code. Leur configuration effective sur le serveur reste à vérifier.</p>`;
}
