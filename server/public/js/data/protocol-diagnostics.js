'use strict';

// Examples are copied by the user into their own terminal. Never executed here.
const PROTOCOL_DIAGNOSTIC_SOURCES = Object.freeze({
  tcp: {
    title: 'Microsoft · Test-NetConnection',
    url: 'https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection'
  },
  udp: {
    title: 'Microsoft · Get-NetUDPEndpoint',
    url: 'https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netudpendpoint'
  },
  dns: {
    title: 'Microsoft · Resolve-DnsName',
    url: 'https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname'
  },
  tls: {
    title: 'OpenSSL · s_client',
    url: 'https://docs.openssl.org/3.4/man1/openssl-s_client/'
  },
  curl: {
    title: 'curl · Manuel',
    url: 'https://curl.se/docs/manpage.html'
  },
  http3: {
    title: 'curl · HTTP/3',
    url: 'https://curl.se/docs/http3.html'
  },
  postgres: {
    title: 'PostgreSQL · Vérification TLS',
    url: 'https://www.postgresql.org/docs/current/libpq-ssl.html'
  },
  pgstats: {
    title: 'PostgreSQL · pg_stat_ssl',
    url: 'https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-SSL-VIEW'
  },
  prometheus: {
    title: 'Prometheus · État du service',
    url: 'https://prometheus.io/docs/prometheus/latest/management_api/'
  },
  promtls: {
    title: 'Prometheus · TLS et authentification',
    url: 'https://prometheus.io/docs/prometheus/latest/configuration/https/'
  },
  redis: {
    title: 'Redis · Sécurité',
    url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/security/'
  },
  ntp: {
    title: 'Microsoft · Outils du service de temps',
    url: 'https://learn.microsoft.com/en-us/windows-server/networking/windows-time-service/windows-time-service-tools-and-settings'
  },
  wireshark: {
    title: 'Wireshark · Champs IPv6',
    url: 'https://www.wireshark.org/docs/dfref/i/ipv6.html'
  },
  sctp: {
    title: 'Wireshark · Champs SCTP',
    url: 'https://www.wireshark.org/docs/dfref/s/sctp.html'
  }
});
const PROTOCOL_DIAGNOSTIC_DETAILS = Object.freeze({
  dns: {
    symptoms: ['Un nom ne se résout plus ou renvoie une adresse inattendue.', 'Une petite réponse fonctionne, mais certaines requêtes échouent.'],
    checks: ['Comparer la réponse du résolveur attendu avec celle utilisée par le client.', 'Tester aussi TCP/53 : une réponse DNS peut nécessiter ce transport.']
  },
  https: {
    symptoms: ['Le site ne charge pas ou le navigateur signale un certificat invalide.'],
    checks: ['Comparer le nom demandé avec les noms du certificat.', 'Vérifier la chaîne de confiance et la date de validité, puis le protocole TLS négocié.']
  },
  http: {
    symptoms: ['Le site répond avec une erreur, une redirection ou une page inattendue.'],
    checks: ['Lire le code HTTP et la destination des redirections.', 'Vérifier le nom d’hôte et le port du service attendu.']
  },
  http3: {
    symptoms: ['Le site fonctionne en HTTPS sur TCP mais échoue en HTTP/3.'],
    checks: ['Vérifier que le client curl prend en charge HTTP/3 avec curl.exe --version.', 'Contrôler le passage d’UDP/443 et le support QUIC côté serveur et intermédiaires.']
  },
  ldap: {
    symptoms: ['L’application atteint l’annuaire mais la liaison LDAP échoue.'],
    checks: ['Vérifier STARTTLS sur 389 lorsque cette protection est utilisée.', 'Contrôler le certificat et les exigences d’authentification de l’annuaire.']
  },
  ldaps: {
    symptoms: ['La connexion sécurisée à l’annuaire échoue.'],
    checks: ['Vérifier le certificat du contrôleur et la confiance du client.', 'Comparer le nom du contrôleur avec le certificat présenté.']
  },
  rdp: {
    symptoms: ['Le bureau distant reste inaccessible ou échoue après la connexion réseau.'],
    checks: ['Vérifier NLA, les droits de connexion et les journaux RDS.', 'Contrôler le chemin via la passerelle ou le VPN utilisé.']
  },
  ssh: {
    symptoms: ['La connexion SSH expire ou l’authentification est refusée.'],
    checks: ['Comparer le port d’écoute effectif et la règle réseau.', 'Après le test TCP, distinguer un refus d’authentification d’un problème de transport.']
  },
  smb: {
    symptoms: ['Un partage réseau est inaccessible ou la connexion est très lente.'],
    checks: ['Vérifier le nom du serveur et les droits sur le partage et le système de fichiers.', 'Contrôler la version SMB et les exigences de signature et de chiffrement.']
  },
  kerberos: {
    symptoms: ['L’authentification au domaine échoue alors que le réseau répond.'],
    checks: ['Comparer les horloges des clients et des contrôleurs.', 'Vérifier la résolution DNS, les SPN et les journaux d’authentification.']
  },
  postgres: {
    symptoms: ['Le client atteint le serveur mais la connexion à la base est refusée.'],
    checks: ['Vérifier listen_addresses et les règles pg_hba.conf applicables.', 'Utiliser sslmode=verify-full avec une autorité de confiance côté client.']
  },
  redis: {
    symptoms: ['Redis refuse une connexion ou répond avec une erreur d’authentification.'],
    checks: ['Contrôler bind, protected-mode et les ACL de l’utilisateur.', 'Vérifier si l’instance expose un port TLS distinct ; 6379 seul ne garantit pas TLS.']
  },
  prometheus: {
    symptoms: ['L’interface répond mais les requêtes ou les scrapes échouent.'],
    checks: ['Distinguer la disponibilité du processus et son état prêt à servir.', 'Contrôler --web.config.file pour les paramètres TLS et l’authentification.']
  },
  ntp: {
    symptoms: ['L’horloge dérive ou les authentifications deviennent intermittentes.'],
    checks: ['Identifier la source de temps configurée avant de tester une autre source.', 'Une absence de réponse peut venir du serveur ou du filtrage UDP.']
  },
  'smtp-submission': {
    symptoms: ['Le client de messagerie échoue lors de l’établissement TLS.'],
    checks: ['Vérifier l’annonce et la négociation STARTTLS sur 587.', 'Distinguer une erreur TLS d’un refus d’authentification ou de relais.']
  },
  'kube-api': {
    symptoms: ['kubectl ne parvient pas à joindre le cluster.'],
    checks: ['Comparer le serveur du kubeconfig avec l’API réellement exposée.', 'Vérifier le certificat, l’autorité de confiance et les droits du compte.']
  },
  'pve-web': {
    symptoms: ['La console Proxmox ne s’ouvre pas ou présente une erreur de certificat.'],
    checks: ['Contrôler le nom du nœud, TCP/8006 et le certificat attendu.', 'Vérifier l’état du proxy web du nœud si le transport répond.']
  }
});

function protocolDiagnostic(data) {
  if (data.origin === 'iana' || !data.profileId) return null;
  const endpoint = String(data.kind === 'ip' ? data.number : data.port || ''),
    port = endpoint.split('-')[0],
    range = endpoint.includes('-');
  const transports = new Set(data.transport.split('/'));
  const specialized = ['ldap', 'cldap'].includes(data.profileId) && !transports.has('TCP') ? {
      symptoms: ['La découverte d’un contrôleur de domaine ne reçoit pas la réponse attendue.'],
      checks: ['Contrôler UDP/389 dans le chemin de découverte du contrôleur.', 'La négociation LDAP STARTTLS concerne TCP ; un test TCP ne valide pas ce flux UDP.']
    } : PROTOCOL_DIAGNOSTIC_DETAILS[data.profileId],
    steps = [],
    sources = new Set();
  const add = (step, refs) => {
    steps.push(step);
    refs.forEach(ref => sources.add(ref))
  };
  if (data.transport.split('/').includes('TCP')) add({
    title: range ? 'Tester un port de la plage' : 'Vérifier la connexion TCP',
    platform: 'PowerShell · Windows',
    command: "$cible = 'serveur.example.com'\nTest-NetConnection -ComputerName $cible -Port " + port + ' -InformationLevel Detailed',
    expected: 'TcpTestSucceeded : True indique qu’une connexion TCP a été établie sur le port testé.',
    failure: range ? 'Adapter le port au service réellement configuré. Ce test ne vérifie pas toute la plage.' : 'Si le test échoue, vérifier la résolution du nom, le routage, l’écoute du service et les règles réseau.'
  }, ['tcp']);
  if (transports.has('UDP')) add({
    title: range ? 'Observer un port UDP de la plage' : 'Vérifier l’écoute UDP sur le serveur',
    platform: 'PowerShell · sur le serveur Windows',
    command: 'Get-NetUDPEndpoint -LocalPort ' + port + ' |\n  Select-Object LocalAddress, LocalPort, OwningProcess',
    expected: 'Un point d’écoute local apparaît si un processus est lié à ce port UDP sur ce serveur Windows.',
    failure: (range ? 'Adapter -LocalPort au port utilisé ; la commande ne vérifie pas toute la plage. ' : '') + 'Une écoute locale ne valide pas le trajet réseau. Tester ensuite avec le client du service ; Test-NetConnection -Port teste TCP.'
  }, ['udp']);
  else if (data.kind === 'ip') add({
    title: 'Observer le protocole sur le trajet',
    platform: 'Wireshark · filtre d’affichage',
    command: 'ip.proto == ' + endpoint + ' || ipv6.nxt == ' + endpoint,
    expected: 'Le filtre sélectionne le numéro de protocole dans les champs IP indiqués ; ce numéro n’est pas un port.',
    failure: 'Capturer sur l’interface concernée. Pour IPv6, examiner aussi la chaîne des en-têtes d’extension.'
  }, ['wireshark']);
  if (transports.has('SCTP')) add({
    title: 'Observer l’association SCTP',
    platform: 'Wireshark · filtre d’affichage',
    command: range ? 'sctp.srcport in {' + endpoint.replace('-', '..') + '} || sctp.dstport in {' + endpoint.replace('-', '..') + '}' : 'sctp.srcport == ' + port + ' || sctp.dstport == ' + port,
    expected: 'Les paquets SCTP correspondant au port ou à la plage apparaissent dans la capture.',
    failure: 'Vérifier l’échange d’établissement de l’association et les adresses des pairs. Un test TCP ne valide pas SCTP.'
  }, ['sctp']);
  if (data.profileId === 'dns') add({
    title: 'Interroger le résolveur attendu',
    platform: 'PowerShell · Windows',
    command: "Resolve-DnsName -Name 'serveur.example.com' -Server '192.0.2.53' -DnsOnly" + (data.transport === 'TCP' ? ' -TcpOnly' : ''),
    expected: 'La réponse doit correspondre au nom et aux enregistrements attendus dans votre environnement.',
    failure: 'Remplacer l’adresse de documentation 192.0.2.53 par votre DNS. Comparer les codes d’erreur et les réponses TCP/UDP.'
  }, ['dns']);
  const starttls = {
    ldap: 'ldap',
    smtp: 'smtp',
    'smtp-submission': 'smtp',
    'ftps-explicit': 'ftp',
    imap: 'imap',
    pop3: 'pop3',
    postgres: 'postgres'
  } [data.profileId];
  if (data.transport.split('/').includes('TCP') && (data.protection === 'tls' || starttls)) add({
    title: starttls ? 'Vérifier la négociation STARTTLS' : 'Vérifier le certificat et TLS',
    platform: 'OpenSSL 3 · à installer si nécessaire',
    command: 'openssl s_client -connect serveur.example.com:' + port + ' -servername serveur.example.com -verify_hostname serveur.example.com -verify_return_error -brief' + (starttls ? ' -starttls ' + starttls : ''),
    expected: 'La négociation aboutit et la vérification du certificat réussit pour le nom demandé.',
    failure: 'Utiliser le nom réel du service. Une autorité interne doit être fournie au magasin de confiance ou avec -CAfile ; contrôler aussi la date et la chaîne.'
  }, ['tls']);
  if (['http', 'https', 'http3'].includes(data.profileId)) add({
    title: data.profileId === 'http3' ? 'Tester HTTP/3 sans repli TCP' : 'Lire la réponse HTTP',
    platform: 'curl · curl.exe sous Windows',
    command: 'curl.exe ' + (data.profileId === 'http3' ? '--http3-only ' : '') + '--head --connect-timeout 5 --max-time 15 ' + (data.profileId === 'http' ? 'http' : 'https') + '://serveur.example.com',
    expected: 'Un code HTTP est reçu. Une redirection, un refus 401/403 ou un HEAD non accepté restent des réponses applicatives à interpréter.',
    failure: data.profileId === 'http3' ? 'Le binaire curl doit prendre en charge HTTP/3 ; sinon utiliser un client compatible.' : 'Un code HTTP ne suffit pas à confirmer le bon fonctionnement de l’application. Lire le statut et les en-têtes.'
  }, [data.profileId === 'http3' ? 'http3' : 'curl']);
  if (data.profileId === 'postgres') add({
    title: 'Contrôler le TLS de la session courante',
    platform: 'SQL · dans une session PostgreSQL autorisée',
    command: 'SELECT ssl, version, cipher\nFROM pg_stat_ssl\nWHERE pid = pg_backend_pid();',
    expected: 'ssl = true et les colonnes version et cipher renseignées indiquent le TLS de cette session.',
    failure: 'La requête ne prouve pas à elle seule la vérification du nom par le client. Contrôler aussi sslmode et l’autorité de confiance.'
  }, ['postgres', 'pgstats']);
  if (data.profileId === 'prometheus') add({
    title: 'Contrôler si Prometheus est prêt',
    platform: 'curl · curl.exe sous Windows',
    command: 'curl.exe --head --connect-timeout 5 --max-time 15 http://serveur.example.com:9090/-/ready',
    expected: 'HTTP 200 indique que Prometheus est prêt à servir les requêtes.',
    failure: 'Adapter le schéma à HTTPS si TLS est configuré. Comparer avec /-/healthy et examiner les journaux du service.'
  }, ['prometheus', 'promtls']);
  if (data.profileId === 'ntp') add({
    title: 'Mesurer le décalage avec la source NTP',
    platform: 'Invite de commandes · Windows',
    command: 'w32tm /stripchart /computer:serveur.example.com /samples:5 /dataonly',
    expected: 'Des échantillons de décalage sont affichés lorsque la source NTP répond.',
    failure: 'Remplacer le nom par la source réelle. Vérifier le trajet UDP et la configuration de la source de temps.'
  }, ['ntp']);
  if (!steps.length) return null;
  if (data.profileId === 'redis') sources.add('redis');
  return {
    symptoms: specialized?.symptoms || ['Le client n’obtient pas la réponse attendue du service.'],
    checks: specialized?.checks || [data.security, 'Comparer le port, le transport et la version effectivement configurés avec la fiche.'],
    steps,
    sources: [...sources].map(key => PROTOCOL_DIAGNOSTIC_SOURCES[key]),
    checkedAt: '2026-10-17',
    specific: !!specialized || steps.length > 1
  };
}

function protocolDiagnosticHTML(data) {
  const guide = protocolDiagnostic(data);
  if (!guide) return '';
  return '<section class="reference-diagnostics"><div class="diagnostic-heading">' + protocolFamilyIcon('monitoring') + '<div><span>Passer au diagnostic</span><h4>Vérifier, puis interpréter</h4></div></div><div class="diagnostic-symptoms"><h5>Quand l’utiliser</h5><ul>' + guide.symptoms.map(text => '<li>' + esc(text) + '</li>').join('') + '</ul></div><ol class="diagnostic-steps">' + guide.steps.map((step, index) => '<li><div class="diagnostic-step-title"><span>' + String(index + 1).padStart(2, '0') + '</span><h5>' + esc(step.title) + '</h5></div><p class="diagnostic-platform">' + esc(step.platform) + '</p><div class="diagnostic-command"><pre><code>' + esc(step.command) + '</code></pre><button type="button" class="secondary protocol-icon" data-diagnostic-copy title="Copier la commande" aria-label="Copier la commande ' + esc(step.title) + '">' + ITEM_ACTION_ICONS.copy + '</button></div><p class="diagnostic-expected"><strong>À observer</strong>' + esc(step.expected) + '</p><p class="diagnostic-interpretation">' + esc(step.failure) + '</p></li>').join('') + '</ol><details class="diagnostic-checks"><summary>Points de configuration à contrôler</summary><ul>' + guide.checks.map(text => '<li>' + esc(text) + '</li>').join('') + '</ul></details><div class="diagnostic-sources">' + guide.sources.map(source => '<a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">' + esc(source.title) + '</a>').join('') + '<span>Exemples relus le ' + esc(guide.checkedAt) + ' · À adapter à votre environnement</span></div></section>';
}

function protocolDiagnosticText(data) {
  const guide = protocolDiagnostic(data);
  if (!guide) return '';
  return ['Diagnostic · ' + guide.symptoms.join(' '), ...guide.steps.map(step => [step.title, step.platform, step.command, 'À observer : ' + step.expected, step.failure].join('\n')), 'Configuration : ' + guide.checks.join(' '), ...guide.sources.map(source => source.title + ' — ' + source.url), 'Exemples relus le ' + guide.checkedAt].join('\n\n');
}
