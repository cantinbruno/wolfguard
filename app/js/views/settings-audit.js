'use strict';

function settingsAuditHTML() {
  const groups = [
    ['Accès et authentification', [
      ['Code personnel', 'Accès par code de 8 chiffres. Les essais incorrects sont ralentis côté serveur.'],
      ['Double authentification', 'Authenticator et validation par téléphone sont pris en charge. Leur obligation dépend de la politique MFA du serveur.'],
      ['Droits des comptes', 'Les permissions sont contrôlées dans l’API pour les fiches, le coffre, les agents et la prise en main. Les comptes et agents peuvent être révoqués.']
    ]],
    ['Chiffrement et connexions', [
      ['Données et sauvegardes web', 'AES-256-GCM ; clé dérivée avec PBKDF2-HMAC-SHA-256 à 600 000 itérations. Sel aléatoire et nouvel IV à chaque écriture de l’espace.'],
      ['Code vérifié par le serveur', 'HMAC-SHA-256 avec un secret serveur, puis PBKDF2-SHA-256 à 100 000 itérations.'],
      ['Connexions HTTPS', 'Le navigateur et les agents communiquent avec l’API par HTTPS. Les jetons d’accès sont envoyés dans les en-têtes ; les requêtes API n’utilisent pas de cookies.'],
      ['Données côté serveur', 'Les informations sensibles et les clés de partage sont chiffrées au repos avec une clé serveur. Les réponses API interdisent la mise en cache.']
    ]],
    ['Protection de l’application', [
      ['Contenus importés', 'Le contenu HTML est nettoyé avec DOMPurify pour retirer les éléments dangereux.'],
      ['Scripts et ressources', 'La politique CSP limite les scripts et les destinations réseau. Les fichiers JavaScript et CSS publiés sont vérifiés par empreinte SRI SHA-384.'],
      ['Requêtes et autorisations', 'Origines web limitées par CORS, validation des entrées et requêtes SQL préparées côté serveur.'],
      ['Agents et mises à jour', 'Association à usage unique, jetons révocables et contrôle SHA-256 des paquets téléchargés. Les identifiants locaux sont protégés par DPAPI sous Windows ou par les permissions des fichiers sous Linux et macOS.']
    ]]
  ];
  const weaknesses = [
    ['Sessions sans expiration', 'Le verrouillage reste manuel. Une session laissée ouverte reste utilisable.'],
    ['Code limité à 8 chiffres', 'Une sauvegarde volée peut subir des essais hors ligne, sans les délais du serveur.'],
    ['Clés accessibles au serveur', 'Le serveur peut déchiffrer les espaces partagés : ses secrets et ses accès d’administration doivent être protégés.'],
    ['Prise en main et mises à jour', 'Un poste Windows associé peut être contrôlé sans confirmation locale. Les paquets et leurs empreintes viennent du même hébergement, sans signature indépendante vérifiée par ce mécanisme.']
  ];
  const list = entries => `<ul>${entries.map(([title,description])=>`<li><strong>${esc(title)}</strong><p>${esc(description)}</p></li>`).join('')}</ul>`;
  return `<header class="settings-panel-head"><div class="settings-heading">${settingsIcon('shield-check')}<h3>Protection de l’application</h3></div></header>
    <p class="settings-protection-intro">Les protections de WolfGuard et les points à renforcer pour limiter les risques de piratage.</p>
    ${groups.map(([title,entries])=>`<section class="settings-protection-group"><h4>${esc(title)}</h4>${list(entries)}</section>`).join('')}
    <section class="settings-protection-weaknesses"><h4>Points faibles à traiter</h4>${list(weaknesses)}</section>
    <p class="settings-protection-note">Cette page décrit les protections prévues dans le code. Leur configuration effective sur le serveur reste à vérifier.</p>`;
}
