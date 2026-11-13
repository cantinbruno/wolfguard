'use strict';

// Reviewed against the repository, not an assertion about a deployed server.
const SETTINGS_AUDIT_GROUPS = {crypto: 'Algorithmes et données', access: 'Accès et sessions', browser: 'Application et mises à jour', network: 'Connectivité et traitements'};
const SETTINGS_AUDIT_RECORDS = [
  {id:'workspace',group:'crypto',title:'Espace web et sauvegardes',tech:'AES-256-GCM · PBKDF2-HMAC-SHA-256 · 600 000 itérations',
    protection:'Sel aléatoire de 16 octets, IV de 12 octets renouvelé à chaque écriture, tag de 128 bits. Le format v3 authentifie aussi la révision et les paramètres. Limite de 32 Mo par enveloppe.',
    limit:'Un code de 8 chiffres offre seulement 100 millions de possibilités. Une copie volée permet des essais hors ligne ; les délais du site ne protègent pas cette copie.',
    check:'Vérifier le format v3, les 600 000 itérations, la variation des IV entre écritures et le refus d’une sauvegarde altérée. Tester une restauration.',
    sources:['browser/crypto.js','browser/storage.js']},
  {id:'vault',group:'crypto',title:'Champs sensibles du coffre',tech:'AES-256-GCM · clé Web Crypto non extractible',
    protection:'Chiffrement des champs sensibles avec un IV aléatoire. Le navigateur web utilise la clé de son espace pour le coffre.',
    limit:'Les valeurs deviennent lisibles dans la session déverrouillée. Une clé non extractible peut encore être utilisée par un script qui contrôle cette session.',
    check:'Vérifier le masquage des mots de passe, le retrait des données au verrouillage et la protection du presse-papiers et des exports.',
    sources:['app/js/security.js','browser/adapter.js','app/js/views/vault.js']},
  {id:'desktop',group:'crypto',title:'Compatibilité avec l’application native',tech:'PBKDF2-HMAC-SHA-256 · 250 000 itérations · AES-256-GCM',
    protection:'Le parcours natif historique dérive la clé du coffre avec un sel de 16 octets. Le vérificateur historique utilise SHA-256 avec le préfixe ITW_ACCESS|.',
    limit:'Le chiffrement des champs du coffre ne prouve pas que tout le fichier SQLite natif est chiffré. Le vérificateur historique est distinct du format web.',
    check:'Identifier le mode utilisé avant d’évaluer la protection des titres, métadonnées et fichiers SQLite. Contrôler les droits du dossier de données.',
    sources:['app/js/security.js','app/js/data/database.js','app/js/desktop.js']},
  {id:'server-storage',group:'crypto',title:'Chiffrement côté serveur et partage',tech:'AES-GCM · STORAGE_KEY · dérivation HMAC-SHA-256',
    protection:'Données sensibles et matériel de clés protégés au repos avec une clé serveur. Les projections partagées dépendent du compte et de sa révision de permissions.',
    limit:'Le serveur dispose du matériel pour déchiffrer et filtrer les espaces partagés. Ce partage n’est donc pas un chiffrement de bout en bout inaccessible à l’hébergeur.',
    check:'Contrôler la séparation et la rotation de STORAGE_KEY et AUTH_PEPPER, les accès à D1/R2, les sauvegardes et les projections visibles pour chaque compte.',
    sources:['server/lib/wolfguard/access.mjs','server/lib/wolfguard/users.mjs','server/lib/wolfguard/workspace-access.mjs']},
  {id:'server-pin',group:'crypto',title:'Vérification du code personnel sur le serveur',tech:'HMAC-SHA-256 avec pepper · PBKDF2-SHA-256 à 100 000 itérations',
    protection:'Le pepper AUTH_PEPPER reste côté serveur. La vérification du code utilise aussi un sel et une comparaison qui parcourt les valeurs.',
    limit:'La protection dépend du secret serveur et de la limitation des essais. Ce traitement est distinct des 600 000 itérations du chiffrement de la sauvegarde.',
    check:'Vérifier que le pepper est absent des fichiers publics et journaux, et que les requêtes répétées déclenchent le délai serveur.',
    sources:['server/lib/wolfguard/core.mjs']},
  {id:'otp',group:'crypto',title:'Authenticator et codes de récupération',tech:'TOTP · HMAC-SHA-1 · 6 chiffres · période de 30 secondes',
    protection:'Secret aléatoire de 20 octets chiffré au repos. Fenêtre courante et ±1 période ; refus des pas de temps déjà consommés. Empreintes SHA-256 des codes de récupération.',
    limit:'La disponibilité du facteur dépend de la configuration du compte et de la politique MFA du serveur. L’horloge et les codes de secours sont à protéger.',
    check:'Tester l’obligation MFA, le refus de réutilisation d’un OTP et l’usage unique des codes de récupération. Vérifier la révocation après réinitialisation.',
    sources:['server/lib/wolfguard/otp.mjs','server/lib/wolfguard/core.mjs']},
  {id:'push',group:'crypto',title:'Approbation par téléphone et Web Push',tech:'ECDSA P-256 / SHA-256 · ECDH P-256 · HKDF-SHA-256 · aes128gcm',
    protection:'Approbations vérifiées avec la clé publique du téléphone. Web Push chiffre sa charge utile ; VAPID authentifie l’émetteur. Tickets d’inscription signés avec HMAC-SHA-256.',
    limit:'Les notifications passent par le service push du navigateur. Le téléphone, ses clés et les abonnements font partie de la surface de confiance.',
    check:'Vérifier le compte, le téléphone associé, l’expiration des demandes et le refus d’une signature invalide. Révoquer un appareil perdu.',
    sources:['server/lib/wolfguard/push.mjs','server/vendor/webpush.mjs','app/js/push-device.js']},
  {id:'hashes',group:'crypto',title:'Empreintes, aléatoire et identifiants',tech:'SHA-256 / SHA-384 / SHA-512 · MD5 / SHA-1 dans l’outil de comparaison',
    protection:'Web Crypto fournit les octets aléatoires et UUID. Les jetons serveur sont aléatoires et identifiés par empreinte SHA-256. Le générateur web de mots de passe évite le biais de modulo.',
    limit:'MD5 et SHA-1 restent des options de compatibilité dans l’outil de fichiers ; ils ne constituent pas une preuve moderne d’authenticité. Un hachage n’est pas un chiffrement.',
    check:'Identifier l’usage de chaque empreinte et la provenance de la valeur attendue ; privilégier SHA-256 ou supérieur pour comparer des fichiers.',
    sources:['browser/crypto.js','app/js/network/hash-tools.js','server/lib/wolfguard/core.mjs']},
  {id:'attempts',group:'access',title:'Protection contre les essais de code',tech:'Délais locaux et serveur · comptage atomique',
    protection:'Le stockage web ajoute 5 secondes par échec. Le pavé natif prévoit 60 secondes après 3 échecs. Le serveur compte avant vérification et impose un délai progressif avec un bail.',
    limit:'Les protections locales peuvent être contournées en contrôlant le navigateur ou une copie de la base. Elles ne remplacent pas la limitation serveur ni un secret fort.',
    check:'Tester les réponses 429 et Retry-After, les essais simultanés et la persistance du délai après rechargement, sans utiliser un compte de production.',
    sources:['browser/storage.js','app/js/security.js','server/lib/wolfguard/core.mjs']},
  {id:'session',group:'access',title:'Durée et reprise des sessions',tech:'Session sans expiration automatique · reprise après rechargement',
    protection:'Jeton Bearer aléatoire de 32 octets. Révocation et contrôles du compte côté serveur. Une CryptoKey non extractible est conservée dans IndexedDB pour reprendre l’onglet.',
    limit:'Le code configure Number.MAX_SAFE_INTEGER pour les échéances et désactive le verrouillage automatique. Le jeton de reprise est conservé dans sessionStorage ; le risque persiste sur un poste laissé ouvert.',
    check:'Vérifier le verrouillage manuel, la déconnexion et la révocation réelle du jeton. Décider d’une durée maximale et d’un délai d’inactivité adaptés.',
    sources:['browser/tab-session.js','browser/cloud.js','browser/adapter.js','server/lib/wolfguard/core.mjs']},
  {id:'permissions',group:'access',title:'Droits des utilisateurs et des agents',tech:'Rôles · permissions par section, dossier, fiche et poste',
    protection:'Contrôles dans l’interface et dans l’API ; filtrage serveur des espaces partagés. Comptes désactivés, versions de code et générations de session vérifiés.',
    limit:'Masquer un bouton ne constitue pas une autorisation. Les données déjà exportées ou copiées ne peuvent pas être reprises par une révocation.',
    check:'Tester directement l’API avec un compte restreint : lecture, écriture, export, secrets du coffre, agents et refus après révocation.',
    sources:['server/lib/wolfguard/permissions.mjs','server/lib/wolfguard/agent-access.mjs','server/lib/wolfguard/workspace-access.mjs','browser/access-control.js']},
  {id:'agent-credentials',group:'access',title:'Association et identifiants des agents',tech:'Ticket à usage unique · jeton Agent · DPAPI sous Windows',
    protection:'Association limitée dans le temps, jetons hachés côté serveur et révocables. Sous Windows, données locales protégées par DPAPI ; sous POSIX, fichier en mode 0600 et répertoire restreint.',
    limit:'Un processus ayant les droits de la session de l’agent peut compromettre ses accès. Les permissions POSIX ne chiffrent pas le fichier.',
    check:'Vérifier les ACL ou modes du dossier, le compte du service, la révocation d’un agent et le refus d’un ticket déjà utilisé.',
    sources:['agent/agent.mjs','server/lib/wolfguard/agents.mjs']},
  {id:'browser-policy',group:'browser',title:'Contenus, scripts et navigation',tech:'CSP · DOMPurify · SRI SHA-384 · no-referrer',
    protection:'Scripts locaux avec intégrité ajoutée à la compilation. CSP restreignant les ressources et les destinations ; scripts HTML en attribut interdits. Contenu riche nettoyé avec DOMPurify.',
    limit:'La CSP autorise les styles inline et WebAssembly. SRI dépend du document qui fixe les empreintes ; une compromission complète de la publication reste critique.',
    check:'Contrôler la CSP servie, les empreintes de chaque ressource, le traitement des HTML importés et les versions des dépendances.',
    sources:['app/index.html','app/js/ui/helpers.js','scripts/build-web.mjs']},
  {id:'private-entry',group:'browser',title:'Lien privé de l’application',tech:'AES-256-GCM · clé dans le fragment du lien',
    protection:'Le document d’application publié est chiffré. La page d’entrée utilise le fragment pour le déchiffrer ; la clé n’est pas une ressource publique du dépôt.',
    limit:'Toute personne possédant le lien peut ouvrir le document d’application. Ce lien reste distinct de l’authentification de l’API et peut être divulgué par copie ou historique.',
    check:'Vérifier le refus d’un lien incomplet et l’absence de clé dans Git, captures, journaux et URL de requêtes. Protéger le partage du lien.',
    sources:['browser/private-entry.js','scripts/build-web.mjs']},
  {id:'updates',group:'browser',title:'Publication et mises à jour des agents',tech:'HTTPS · SHA-256 · origine de téléchargement fixe',
    protection:'Exécutable ou archive comparé à l’empreinte du manifeste. Contrôle périodique des mises à jour lorsque l’agent est disponible. Vérification des fichiers publiables avant publication.',
    limit:'Le manifeste et le paquet viennent de la même origine ; une empreinte ne remplace pas une signature indépendante de l’éditeur. Le dépôt et l’hébergement sont des points de confiance.',
    check:'Vérifier l’origine, les droits de publication, les empreintes et le refus d’un paquet altéré. Examiner la signature des exécutables séparément.',
    sources:['agent/auto-update.mjs','agent/update-command.mjs','scripts/check-publication.mjs']},
  {id:'web-api',group:'network',title:'Navigateur → application et API',tech:'HTTPS sortant · API JSON · Authorization: Bearer',
    protection:'Interface publiée depuis GitHub Pages sur wolfguard.wavetools.fr ; API configurée sur https://wolfguard-web-cantin.cantin-bruno.chatgpt.site (HTTPS, port TCP 443 par défaut). Requêtes sans cookies, sans cache, sans redirection et avec no-referrer ; délais et annulation.',
    limit:'Les versions TLS et suites négociées dépendent de l’hébergement et du client. Cette page ne peut pas les certifier.',
    check:'Dans les outils réseau, vérifier HTTPS, le certificat, les destinations et les en-têtes. Contrôler CORS avec une origine non autorisée.',
    sources:['browser/cloud.js','server/lib/wolfguard/core.mjs','docs/CNAME']},
  {id:'api-policy',group:'network',title:'API → stockage et contrôles HTTP',tech:'Cloudflare D1 / R2 · CORS par origine · HSTS sur HTTPS',
    protection:'Requêtes SQL préparées et paramètres liés. Réponses API no-store, nosniff, no-referrer, interdiction d’encadrement et politique de permissions ; HSTS sur les requêtes HTTPS.',
    limit:'L’origine du frontal, son domaine GitHub Pages et l’origine propre de l’API sont admises par le code. Les secrets et politiques effectifs de l’hébergeur ne sont pas visibles ici.',
    check:'Vérifier les en-têtes réellement reçus, les origines admises, la taille maximale des requêtes, les droits D1/R2 et les sauvegardes.',
    sources:['server/lib/wolfguard/core.mjs','server/lib/wolfguard/request.mjs']},
  {id:'agent-relay',group:'network',title:'Agent → relais → navigateur',tech:'HTTPS sortant · interrogations périodiques · Authorization: Agent',
    protection:'L’agent récupère les tâches et publie les résultats via l’API. Les tâches ont un propriétaire, un bail et une échéance ; l’association est vérifiée côté serveur.',
    limit:'Le relais traite les résultats. Le transport ne rend pas les données invisibles au serveur. Les fonctions d’administration héritent des privilèges de l’agent.',
    check:'Vérifier les flux HTTPS vers l’API, la révocation, les droits sur les tâches et l’absence de service entrant requis pour ce canal.',
    sources:['agent/agent.mjs','server/lib/wolfguard/agents.mjs']},
  {id:'remote',group:'network',title:'Bureau, terminal et fichiers à distance',tech:'Relais HTTPS · images JPEG et commandes structurées · PowerShell / sh',
    protection:'Autorisation serveur sur le poste et la session. Le bureau valide un protocole fini d’entrées ; le terminal est une fonction distincte. Session distante limitée à 20 minutes.',
    limit:'Sur un poste Windows déjà associé, la prise en main autorisée démarre sans confirmation locale. Le terminal et les fichiers peuvent agir avec les droits de l’agent.',
    check:'Vérifier les permissions, l’indicateur de partage, l’arrêt local, la fin à la déconnexion, les restrictions de chemins et les traces d’actions.',
    sources:['server/lib/wolfguard/remote.mjs','server/lib/wolfguard/remote-spec.mjs','server/lib/wolfguard/terminal.mjs','server/lib/wolfguard/files.mjs','agent/remote.mjs']},
  {id:'scans',group:'network',title:'Agent → cibles réseau et protection du poste',tech:'DNS · TCP · ICMP · HTTP / TLS · collecte système et règles',
    protection:'Scans bornés par cible, ports, concurrence et délais. Identification par connexion et bannières ; collecte passive et évaluation des réglages de sécurité du poste.',
    limit:'Un port ouvert ou une bannière ne prouve pas une faille exploitable ; une absence de réponse ne prouve pas l’absence de machine. Les règles ne couvrent pas toutes les attaques.',
    check:'Vérifier le périmètre autorisé, les protocoles réellement sondés, les preuves, les données non collectées et les résultats non vérifiés.',
    sources:['agent/network.mjs','server/lib/wolfguard/scan-spec.mjs','agent/security-rules.mjs','agent/security.ps1']},
  {id:'external',group:'network',title:'Services externes : IA, notifications et CERT-FR',tech:'HTTPS · Groq / flux SSE · services Web Push · CERT-FR',
    protection:'Le chatbot utilise un fournisseur et une URL fixes côté serveur : Groq, modèle openai/gpt-oss-120b. Les bulletins CERT-FR sont récupérés depuis cert.cyber.gouv.fr. Notifications via les abonnements push.',
    limit:'Les messages transmis au chatbot quittent l’environnement WolfGuard. Un nom de modèle commençant par openai/ ne signifie pas que l’API OpenAI est utilisée. L’IA sur agent constitue un parcours distinct.',
    check:'Examiner le contenu envoyé, la configuration IA du poste, les endpoints push, les contrats des fournisseurs et les accès aux clés API.',
    sources:['server/lib/wolfguard/chat-api.mjs','server/lib/wolfguard/ai.mjs','server/lib/wolfguard/push.mjs','server/lib/wolfguard/certfr.mjs']},
  {id:'exports',group:'network',title:'Stockage du navigateur, sauvegardes et exports',tech:'IndexedDB · sessionStorage · fichiers ITW / PDF / pièces jointes',
    protection:'Enveloppes chiffrées conservées localement et dans les copies de sauvegarde web. Le moteur PDF et les polices sont fournis localement.',
    limit:'Les PDF, copies de mots de passe et fichiers téléchargés sont lisibles hors de l’application. Les politiques du navigateur, du disque et du presse-papiers restent déterminantes.',
    check:'Tester l’effacement au verrouillage, la restauration, les droits des dossiers de téléchargement et le contenu de chaque type d’export.',
    sources:['browser/storage.js','browser/tab-session.js','app/js/views/scan-pdf.js','app/js/data/workspace-file.js']}
];

function settingsAuditObservations() {
  const cloud = typeof WolfGuardCloud === 'undefined' ? null : WolfGuardCloud;
  const user = cloud?.currentUser();
  const mfa = user?.mfa;
  return [
    {label:'Transport de cette page',value:location.protocol === 'https:' ? 'HTTPS observé' : 'HTTPS non observé',state:location.protocol === 'https:' ? 'observed' : 'attention'},
    {label:'API Web Crypto',value:window.isSecureContext && !!globalThis.crypto?.subtle ? 'Disponible en contexte sécurisé' : 'Indisponible ou contexte non sécurisé',state:window.isSecureContext && !!globalThis.crypto?.subtle ? 'observed' : 'attention'},
    {label:'MFA du compte courant',value:!cloud?.enabled || !mfa ? 'Non observable dans cette session' : `Authenticator ${mfa.authenticator ? 'configuré' : 'absent'} · téléphone ${mfa.phone ? 'configuré' : 'absent'} · obligation ${mfa.required ? 'déclarée par l’API' : 'non déclarée'}`,state:!cloud?.enabled || !mfa ? 'unknown' : mfa.complete && mfa.required ? 'observed' : 'attention'},
    {label:'Expiration automatique',value:'Désactivée dans les sources actuelles',state:'attention'}
  ];
}

function settingsAuditHTML() {
  return `<header class="settings-panel-head"><div class="settings-heading">${settingsIcon('shield-check')}<h3>Architecture et sécurité</h3></div></header>
    <p class="settings-audit-intro">Les algorithmes, protections et flux de WolfGuard, avec leurs limites et les contrôles à effectuer.</p>
    <div class="settings-audit-scope"><strong>Périmètre de cette fiche</strong><p>Inventaire des sources de cette version, complété par quelques observations du navigateur. Aucun scan n’est lancé. Une protection décrite dans le code ne prouve pas sa configuration sur le serveur déployé ; une case cochée indique uniquement votre vérification manuelle.</p></div>
    <h4 class="settings-group-title">Observations de cette session</h4><div class="settings-audit-observations" id="settingsAuditObservations"></div>
    <div class="settings-audit-priorities"><strong>Points de vigilance prioritaires</strong><p>Code limité à 8 chiffres · sessions sans expiration automatique · serveur capable de déchiffrer le partage · privilèges de la prise en main · confiance dans la publication des mises à jour.</p></div>
    <div class="settings-audit-controls"><label>Rechercher<input type="search" id="settingsAuditSearch" maxlength="200" placeholder="AES, MFA, TLS, agent, export…"></label><label>Thème<select id="settingsAuditGroup"><option value="">Tous les thèmes</option>${Object.entries(SETTINGS_AUDIT_GROUPS).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label></div>
    <div class="settings-audit-toolbar"><p id="settingsAuditCount" role="status" aria-live="polite"></p><button type="button" class="settings-btn" id="settingsAuditExport">${settingsIcon('download')}Exporter la fiche</button></div>
    <p class="settings-audit-help">Ouvrez un point pour consulter la protection, ses limites, le contrôle proposé et les fichiers sources. Les vérifications cochées restent uniquement dans cette fenêtre.</p>
    <div id="settingsAuditRecords"></div><p id="settingsAuditEmpty" hidden>Aucun point ne correspond à la recherche.</p>`;
}

function mountSettingsAudit(panel) {
  const checked = new Set();
  const fold = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const records = SETTINGS_AUDIT_RECORDS.map(record => ({...record,search:fold([SETTINGS_AUDIT_GROUPS[record.group],...Object.values(record).flat()].join(' '))}));
  const host = panel.querySelector('#settingsAuditRecords');
  host.innerHTML = records.map(record=>`<details class="settings-audit-record" data-audit-id="${record.id}"><summary><span class="settings-audit-category">${esc(SETTINGS_AUDIT_GROUPS[record.group])}</span><strong>${esc(record.title)}</strong><span>${esc(record.tech)}</span></summary><dl><div><dt>Protection en place dans le code</dt><dd>${esc(record.protection)}</dd></div><div class="settings-audit-limit"><dt>Limites et exposition</dt><dd>${esc(record.limit)}</dd></div><div><dt>Comment vérifier</dt><dd>${esc(record.check)}</dd></div><div><dt>Sources à examiner</dt><dd class="settings-audit-sources">${record.sources.map(source=>`<code>${esc(source)}</code>`).join('')}</dd></div></dl><label class="settings-audit-check"><input type="checkbox" value="${record.id}"><span>Contrôle effectué manuellement</span></label></details>`).join('');
  const nodes = [...host.children];
  const update = () => {
    const terms = fold(panel.querySelector('#settingsAuditSearch').value).trim().split(/\s+/).filter(Boolean);
    const group = panel.querySelector('#settingsAuditGroup').value;
    let visible = 0;
    records.forEach((record,index)=>{const matches=(!group || record.group===group) && terms.every(term=>record.search.includes(term));nodes[index].hidden=!matches;if(matches)visible++;});
    panel.querySelector('#settingsAuditCount').textContent = `${visible} / ${records.length} points · ${checked.size} vérifié${checked.size>1?'s':''} manuellement`;
    panel.querySelector('#settingsAuditEmpty').hidden = visible > 0;
  };
  panel.querySelector('#settingsAuditSearch').oninput = update;
  panel.querySelector('#settingsAuditGroup').onchange = update;
  host.onchange = event => {if(!event.target.matches('input[type="checkbox"]'))return;event.target.checked?checked.add(event.target.value):checked.delete(event.target.value);update();};
  panel.querySelector('#settingsAuditExport').onclick = () => {
    const observations = settingsAuditObservations();
    const content = `# WolfGuard — Architecture et sécurité\n\nVersion : ${WOLFGUARD_APP_VERSION}\nExport : ${new Date().toISOString()}\n\nInventaire des sources, sans scan ni certification de la configuration déployée. Les coches correspondent à des vérifications manuelles. Export de tous les points, indépendamment des filtres.\n\n## Observations\n\n${observations.map(row=>`- ${row.label} : ${row.value}`).join('\n')}\n\n` + records.map(record=>`## ${record.title}\n\nThème : ${SETTINGS_AUDIT_GROUPS[record.group]}\nTechnique : ${record.tech}\n\nProtection : ${record.protection}\n\nLimites : ${record.limit}\n\nContrôle : ${record.check}\n\n- [${checked.has(record.id)?'x':' '}] Contrôle effectué manuellement\n\nSources :\n${record.sources.map(source=>'- '+source).join('\n')}\n`).join('\n');
    const url = URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));
    const anchor = document.createElement('a');anchor.href=url;anchor.download='WolfGuard-architecture-securite.md';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  update();
}

function refreshSettingsAudit(panel) {
  panel.querySelector('#settingsAuditObservations').innerHTML = settingsAuditObservations().map(row=>`<div data-state="${row.state}"><span>${esc(row.label)}</span><strong>${esc(row.value)}</strong></div>`).join('');
}
