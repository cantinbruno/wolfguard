'use strict';

const MEMO_SECURITY_CONTENT_VERSION = 1;
const MEMO_SECURITY_GENERIC_OBJECTIVE = 'R\u00e9duire la surface d\u2019attaque, limiter les privil\u00e8ges et am\u00e9liorer la visibilit\u00e9.';
const MEMO_SECURITY_GENERIC_PRACTICES = ['Moindre privil\u00e8ge.', 'Segmentation.', 'Centralisation logs.', 'MFA.', 'Revue r\u00e9guli\u00e8re des r\u00e8gles/comptes.', 'Tests de reprise.'];
const MEMO_SECURITY_SOURCES = {
  waf: ['FortiWeb - Faux positifs et signatures', 'https://docs.fortinet.com/document/fortiweb/8.0.5/administration-guide/99155/reducing-false-positives'],
  tls: ['RFC 8446 - Authentification TLS', 'https://www.rfc-editor.org/rfc/rfc8446.html'],
  pam: ['Microsoft Entra PIM - Activation des privileges', 'https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure'],
  mab: ['Cisco - MAC Authentication Bypass', 'https://www.cisco.com/c/en/us/td/docs/solutions/Enterprise/Security/TrustSec_1-99/MAB/MAB_Dep_Guide.html'],
  nac: ['NIST - Network Access Control', 'https://csrc.nist.gov/glossary/term/network_access_control'],
  dot1x: ['RFC 3580 - 802.1X et RADIUS', 'https://www.rfc-editor.org/rfc/rfc3580.html'],
  soar: ['Microsoft Sentinel - Playbooks', 'https://learn.microsoft.com/en-us/azure/sentinel/automation/run-playbooks'],
  idps: ['NIST SP 800-94 - Detection et prevention', 'https://csrc.nist.gov/pubs/sp/800/94/final'],
  logs: ['NIST SP 800-92 - Gestion des journaux', 'https://csrc.nist.gov/pubs/sp/800/92/final'],
  xdr: ['Microsoft Defender XDR - Correlation des alertes', 'https://learn.microsoft.com/en-us/defender-xdr/alerts-incidents-correlation'],
  radius: ['RFC 2865 - RADIUS', 'https://www.rfc-editor.org/rfc/rfc2865.html'],
  edr: ['Microsoft Defender for Endpoint - Investigation', 'https://learn.microsoft.com/en-us/defender-endpoint/investigate-machines'],
  ssh: ['OpenSSH - ProxyJump et configuration client', 'https://man.openbsd.org/ssh_config'],
  aaa: ['RFC 8907 - TACACS+ et AAA', 'https://www.rfc-editor.org/rfc/rfc8907.html'],
  mfa: ['NIST SP 800-63B-4 - Authentification', 'https://pages.nist.gov/800-63-4/sp800-63b.html'],
  zt: ['NIST SP 800-207 - Zero Trust Architecture', 'https://csrc.nist.gov/pubs/sp/800/207/final'],
  controls: ['NIST SP 800-53 - Controles de securite', 'https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final'],
  firewall: ['NIST SP 800-41 - Politique firewall', 'https://csrc.nist.gov/pubs/sp/800/41/r1/final'],
  hsts: ['RFC 6797 - HSTS', 'https://www.rfc-editor.org/rfc/rfc6797.html'],
  csp: ['W3C - Content Security Policy', 'https://www.w3.org/TR/CSP3/'],
  bastion: ['Microsoft Azure Bastion - Acces aux machines', 'https://learn.microsoft.com/en-us/azure/bastion/bastion-overview']
};
const MEMO_SECURITY_DEFINITIONS = [
  ['WAF', "Filtrer les requ\u00eates HTTP malveillantes destin\u00e9es \u00e0 une application web, sans confondre cette protection avec la correction du code vuln\u00e9rable.", [
    "Associer la r\u00e8gle au host, \u00e0 l'URI et au param\u00e8tre concern\u00e9 ; distinguer d\u00e9tection et blocage effectif.",
    "Qualifier les faux positifs avant une exception, limit\u00e9e \u00e0 la signature et au parcours n\u00e9cessaires.",
    "V\u00e9rifier le chemin TLS inspect\u00e9 et conserver un exemple anonymis\u00e9 de requ\u00eate autoris\u00e9e et bloqu\u00e9e."
  ], 'waf'],
  ['mTLS', "Authentifier les deux extr\u00e9mit\u00e9s d'une connexion TLS par certificat ; un client authentifi\u00e9 doit encore \u00eatre autoris\u00e9 \u00e0 la ressource demand\u00e9e.", [
    "Limiter les autorit\u00e9s de confiance et v\u00e9rifier cha\u00eene, identit\u00e9 attendue, usages et dates des certificats.",
    "Prot\u00e9ger les cl\u00e9s priv\u00e9es et pr\u00e9voir renouvellement et retrait des certificats compromis.",
    "V\u00e9rifier le refus d'un client sans certificat ou non approuv\u00e9, puis ses droits applicatifs apr\u00e8s authentification."
  ], 'tls'],
  ['PAM', "Ma\u00eetriser l'attribution et l'utilisation des acc\u00e8s administrateur, en limitant leur dur\u00e9e et en attribuant chaque action \u00e0 une personne.", [
    "S\u00e9parer les comptes d'administration des comptes quotidiens et retirer les droits permanents non justifi\u00e9s.",
    "Utiliser une activation temporaire, une justification et une approbation selon la sensibilit\u00e9 de la ressource.",
    "Revoir les droits \u00e9ligibles, les activations et les comptes d'urgence ; pr\u00e9voir leur traitement hors du parcours habituel."
  ], 'pam'],
  ['MAB', "Permettre un acc\u00e8s restreint aux \u00e9quipements sans supplicant 802.1X ; une adresse MAC reconnue n'est pas une preuve forte d'identit\u00e9.", [
    "R\u00e9server MAB aux appareils inventori\u00e9s qui ne peuvent pas utiliser le parcours 802.1X pr\u00e9vu.",
    "Limiter leur VLAN ou ACL aux services indispensables ; prendre en compte l'usurpation possible d'une adresse MAC.",
    "V\u00e9rifier les temporisations de fallback et le r\u00e9sultat d'autorisation, sans accorder un acc\u00e8s complet en cas d'\u00e9chec."
  ], 'mab'],
  ['SOAR', "Orchestrer des actions de r\u00e9ponse reproductibles \u00e0 partir d'un incident, tout en ma\u00eetrisant les permissions et les effets des automatisations.", [
    "Relier chaque playbook \u00e0 un d\u00e9clencheur, des conditions et un propri\u00e9taire ; tracer son historique d'ex\u00e9cution.",
    "Limiter les permissions des connecteurs et faire approuver les actions sensibles comme l'isolement d'un poste.",
    "Tester sur des incidents fictifs, traiter les \u00e9checs et pr\u00e9voir la reprise sans rejouer une action destructive."
  ], 'soar'],
  ['NAC', "D\u00e9cider de l'acc\u00e8s r\u00e9seau d'un terminal selon son identit\u00e9 et les crit\u00e8res de conformit\u00e9 disponibles, puis appliquer les droits accord\u00e9s.", [
    "Distinguer identification, authentification, posture et autorisation ; un profil d'appareil seul ne prouve pas son identit\u00e9.",
    "Comparer la d\u00e9cision du serveur NAC avec le VLAN ou l'ACL r\u00e9ellement appliqu\u00e9s au port ou au SSID.",
    "Cadrer les parcours invit\u00e9, MAB et serveur indisponible ; \u00e9viter qu'une exception ouvre toute la zone interne."
  ], 'nac'],
  ['IPS', "D\u00e9tecter puis bloquer en ligne des tentatives d'exploitation reconnues, en tenant compte des faux positifs et du trafic effectivement inspect\u00e9.", [
    "V\u00e9rifier le placement en ligne, l'action des signatures et la politique appliqu\u00e9e au flux concern\u00e9.",
    "Qualifier les exclusions par application ou signature plut\u00f4t que d'exclure largement une source ou une zone.",
    "Documenter les limites de visibilit\u00e9, l'impact sur la latence et le comportement de bypass ou de panne."
  ], 'idps'],
  ['XDR', "Relier des signaux de plusieurs couches, comme le terminal et l'identit\u00e9, pour reconstituer un incident et d\u00e9limiter les ressources touch\u00e9es.", [
    "V\u00e9rifier quelles sources alimentent la plateforme et distinguer une absence d'alerte d'une absence de collecte.",
    "Rapprocher les horodatages, utilisateurs et appareils avant de valider la corr\u00e9lation propos\u00e9e.",
    "Conserver les alertes d'origine et faire approuver les actions de r\u00e9ponse selon le p\u00e9rim\u00e8tre r\u00e9el de l'incident."
  ], 'xdr'],
  ['SIEM', "Rendre les \u00e9v\u00e9nements exploitables pour la d\u00e9tection et l'investigation, gr\u00e2ce \u00e0 une collecte fiable, une normalisation et des corr\u00e9lations contextualis\u00e9es.", [
    "Suivre la fra\u00eecheur des sources, les pertes de collecte et les d\u00e9calages horaires.",
    "V\u00e9rifier le parsing des utilisateurs, h\u00f4tes, adresses et actions avant de conclure sur une r\u00e8gle de d\u00e9tection.",
    "Adapter r\u00e9tention et acc\u00e8s aux journaux ; qualifier les faux positifs sans supprimer les preuves utiles."
  ], 'logs'],
  ['RADIUS', "Centraliser les d\u00e9cisions d'acc\u00e8s r\u00e9seau et transmettre les attributs d'autorisation attendus aux clients RADIUS d\u00e9clar\u00e9s.", [
    "D\u00e9clarer les clients attendus et prot\u00e9ger leurs secrets partag\u00e9s ; restreindre le chemin r\u00e9seau vers le serveur.",
    "Distinguer timeout et Access-Reject, puis examiner la m\u00e9thode d'authentification et la politique choisie.",
    "V\u00e9rifier les attributs renvoy\u00e9s et appliqu\u00e9s ; traiter l'accounting et CoA comme des fonctions distinctes."
  ], 'radius'],
  ['EDR', "Observer l'activit\u00e9 des terminaux pour qualifier un comportement suspect, reconstituer sa chronologie et encadrer les actions de confinement.", [
    "V\u00e9rifier la sant\u00e9 du capteur, sa derni\u00e8re communication et la couverture des postes attendus.",
    "Relier processus parent, utilisateur, fichier et connexions dans la chronologie du terminal.",
    "Faire approuver isolement ou rem\u00e9diation et conserver les preuves utiles avant une action qui modifie le poste."
  ], 'edr'],
  ['Jump host', "Joindre un \u00e9quipement d'administration via un relais identifi\u00e9, sans exposer directement sa connexion SSH au poste d'origine.", [
    "D\u00e9finir les relais et destinations autoris\u00e9s ; \u00e9viter les rebonds vers des h\u00f4tes hors du p\u00e9rim\u00e8tre.",
    "Valider les cl\u00e9s d'h\u00f4te du relais et de la destination ; pr\u00e9f\u00e9rer ProxyJump au transfert d'agent non justifi\u00e9.",
    "Limiter les comptes et les flux sortants du relais ; ne pas y stocker les cl\u00e9s priv\u00e9es des administrateurs."
  ], 'ssh'],
  ['AAA', "S\u00e9parer la preuve d'identit\u00e9, les actions autoris\u00e9es et leur tra\u00e7abilit\u00e9, afin qu'une authentification r\u00e9ussie ne donne pas automatiquement tous les droits.", [
    "D\u00e9finir les profils d'autorisation et v\u00e9rifier leurs droits effectifs sur l'\u00e9quipement.",
    "Relier les traces d'authentification, d'autorisation et d'accounting au m\u00eame utilisateur et \u00e0 la m\u00eame session.",
    "Cadrer le recours aux comptes locaux si le serveur AAA est indisponible, sans transformer le fallback en acc\u00e8s libre."
  ], 'aaa'],
  ['MFA', "R\u00e9duire l'impact d'un mot de passe vol\u00e9 en exigeant des facteurs distincts, et prot\u00e9ger aussi l'enr\u00f4lement et la r\u00e9cup\u00e9ration du compte.", [
    "Privil\u00e9gier un authentificateur r\u00e9sistant au phishing lorsque le parcours le permet ; un OTP peut \u00eatre relay\u00e9.",
    "V\u00e9rifier les exemptions et m\u00e9thodes de secours afin qu'elles ne contournent pas l'exigence principale.",
    "Encadrer l'ajout et le retrait des facteurs, puis la r\u00e9cup\u00e9ration ; deux secrets du m\u00eame type ne constituent pas deux facteurs."
  ], 'mfa'],
  ['Microsegmentation', "Limiter les communications est-ouest entre charges de travail, pour contenir les mouvements lat\u00e9raux au-del\u00e0 des grandes zones r\u00e9seau.", [
    "Cartographier les d\u00e9pendances applicatives avant de d\u00e9finir les politiques entre workloads.",
    "Identifier le point d'application et le contexte d'identit\u00e9 utilis\u00e9 ; un simple d\u00e9coupage en VLAN ne suffit pas.",
    "V\u00e9rifier les chemins autoris\u00e9s et interdits, y compris lors d'un changement d'adresse ou de d\u00e9placement du workload."
  ], 'zt'],
  ['802.1X', "Conditionner l'acc\u00e8s au port ou au SSID \u00e0 une authentification EAP, avant d'appliquer l'autorisation r\u00e9seau correspondante.", [
    "Identifier supplicant, authenticator et serveur d'authentification ; examiner la m\u00e9thode EAP utilis\u00e9e.",
    "Valider l'identit\u00e9 du serveur ; avec EAP-TLS, g\u00e9rer aussi confiance et cycle de vie du certificat client.",
    "V\u00e9rifier l'autorisation obtenue et les cas d'\u00e9chec ; MAB en secours doit rester un acc\u00e8s explicitement limit\u00e9."
  ], 'dot1x'],
  ['IDS', "Signaler les activit\u00e9s r\u00e9seau suspectes \u00e0 partir du trafic observ\u00e9 ; une alerte d'un capteur passif ne prouve pas qu'un paquet a \u00e9t\u00e9 bloqu\u00e9.", [
    "V\u00e9rifier la couverture du TAP ou du mirroring et les pertes de paquets visibles par le capteur.",
    "Contextualiser la signature avec le flux, la cible et les journaux disponibles avant de qualifier l'incident.",
    "Documenter le traitement de l'alerte par le SOC et les limites li\u00e9es au chiffrement ou au trafic non observ\u00e9."
  ], 'idps'],
  ['Defense in Depth', "Combiner des protections compl\u00e9mentaires pour que la d\u00e9faillance d'un contr\u00f4le unique ne compromette pas toute la cha\u00eene de d\u00e9fense.", [
    "Relier pr\u00e9vention, d\u00e9tection et r\u00e9ponse aux risques du sc\u00e9nario consid\u00e9r\u00e9.",
    "Identifier les d\u00e9pendances communes, comme une m\u00eame identit\u00e9 administrateur ou une m\u00eame console de gestion.",
    "V\u00e9rifier les chemins qui restent prot\u00e9g\u00e9s lorsqu'une couche est indisponible, plut\u00f4t que compter les produits install\u00e9s."
  ], 'controls'],
  ['TACACS+', "Contr\u00f4ler l'administration des \u00e9quipements par une autorisation des actions et un accounting adapt\u00e9, distincts de l'authentification.", [
    "V\u00e9rifier les profils et jeux de commandes effectivement accord\u00e9s, notamment les privil\u00e8ges de configuration.",
    "Prot\u00e9ger les secrets et le r\u00e9seau d'administration ; l'obfuscation du protocole historique ne remplace pas un transport s\u00e9curis\u00e9.",
    "Examiner l'accounting des commandes et le compte de secours ; le fallback ne doit pas neutraliser l'autorisation."
  ], 'aaa'],
  ['Segmentation', "S\u00e9parer les zones de confiance et imposer des communications interzones justifi\u00e9es, pour r\u00e9duire les chemins d'acc\u00e8s non n\u00e9cessaires.", [
    "D\u00e9crire les zones, propri\u00e9taires et flux n\u00e9cessaires dans une matrice d'acc\u00e8s.",
    "V\u00e9rifier les ACL ou politiques firewall au point de passage ; un VLAN sans filtrage ne suffit pas \u00e0 bloquer les flux.",
    "Qualifier les r\u00e8gles larges et les chemins alternatifs, puis valider un flux autoris\u00e9 et un flux refus\u00e9."
  ], 'firewall'],
  ['HSTS', "Faire utiliser HTTPS au navigateur pour un domaine connu et interdire le contournement des erreurs TLS ; une redirection HTTP seule n'est pas \u00e9quivalente.", [
    "V\u00e9rifier Strict-Transport-Security sur une r\u00e9ponse HTTPS valide et adapter max-age au d\u00e9ploiement.",
    "Confirmer la disponibilit\u00e9 HTTPS de tous les sous-domaines concern\u00e9s avant includeSubDomains ou une demande de preload.",
    "Distinguer premi\u00e8re visite et politique d\u00e9j\u00e0 m\u00e9moris\u00e9e ; HSTS ne remplace ni les protections XSS ni l'authentification."
  ], 'hsts'],
  ['CSP', "Restreindre les contenus que le navigateur peut charger ou ex\u00e9cuter, afin de r\u00e9duire l'impact de certaines injections c\u00f4t\u00e9 client.", [
    "Construire une politique adapt\u00e9e aux scripts, frames et connexions de l'application ; \u00e9viter les sources trop larges.",
    "Pr\u00e9f\u00e9rer des nonces ou hashes appropri\u00e9s aux autorisations g\u00e9n\u00e9riques de scripts inline.",
    "Qualifier les violations en Report-Only avant application ; ce mode collecte des rapports mais ne bloque pas les chargements."
  ], 'csp'],
  ['Zero Trust', "Autoriser l'acc\u00e8s \u00e0 chaque ressource selon l'identit\u00e9 et le contexte, sans accorder une confiance implicite parce que le client est sur le LAN ou le VPN.", [
    "Identifier la ressource, la d\u00e9cision d'acc\u00e8s et son point d'application, plut\u00f4t que traiter le r\u00e9seau comme une autorisation.",
    "Limiter les droits \u00e0 la session et au besoin ; tenir compte du terminal et du risque lorsque ces signaux sont disponibles.",
    "Pr\u00e9voir la r\u00e9\u00e9valuation et la r\u00e9vocation de l'acc\u00e8s, ainsi que les exceptions explicitement document\u00e9es."
  ], 'zt'],
  ['DMZ', "H\u00e9berger les services expos\u00e9s dans une zone s\u00e9par\u00e9e, afin qu'un serveur public compromis n'obtienne pas un acc\u00e8s direct au r\u00e9seau interne.", [
    "Distinguer les flux Internet vers DMZ, DMZ vers interne et administration ; ne pas d\u00e9duire une autorisation du seul NAT.",
    "Limiter les acc\u00e8s aux backends aux destinations et services indispensables, sans r\u00e8gle globale DMZ vers LAN.",
    "V\u00e9rifier les chemins sortants et la gestion des machines expos\u00e9es ; le placement en DMZ ne corrige pas l'application."
  ], 'firewall'],
  ['Bastion', "Concentrer les connexions d'administration dans un point d'acc\u00e8s contr\u00f4l\u00e9, pour limiter l'exposition des cibles et ma\u00eetriser qui peut les joindre.", [
    "Limiter les acc\u00e8s au bastion et les cibles joignables par r\u00f4le ; supprimer les chemins directs qui contournent le parcours.",
    "Relier l'identit\u00e9 de l'administrateur \u00e0 la connexion cible ; pr\u00e9ciser les traces ou enregistrements disponibles selon le produit.",
    "Isoler la gestion du bastion et pr\u00e9voir un acc\u00e8s d'urgence cadr\u00e9, sans publier les services d'administration sur Internet."
  ], 'bastion'],
  ['Least Privilege', "Accorder uniquement les droits n\u00e9cessaires \u00e0 une t\u00e2che, sur les seules ressources concern\u00e9es et pendant la dur\u00e9e utile.", [
    "Comparer les droits effectifs aux besoins, en incluant h\u00e9ritages, groupes imbriqu\u00e9s et comptes de service.",
    "S\u00e9parer consultation et modification ; retirer les privil\u00e8ges inutilis\u00e9s plut\u00f4t que multiplier les comptes administrateur.",
    "Faire expirer les \u00e9l\u00e9vations temporaires et attribuer un propri\u00e9taire aux exceptions qui restent n\u00e9cessaires."
  ], 'controls']
];
const memoSecurityText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
const MEMO_SECURITY_BY_TOPIC = new Map(MEMO_SECURITY_DEFINITIONS.map(definition => [memoSecurityText(definition[0]), definition]));

function replaceGeneratedMemoBlock(content, doc, label, tag, expected, replacement) {
  const headings = [...doc.body.querySelectorAll('h2')].filter(heading => memoSecurityText(heading.textContent) === memoSecurityText(label));
  if (headings.length !== 1) return content;
  const heading = headings[0],
    block = heading.nextElementSibling;
  if (!block || block.tagName !== tag || block.attributes.length) return content;
  const texts = tag === 'UL' ? [...block.children] : [block];
  if (texts.length !== expected.length || texts.some((node, index) => node.childElementCount || node.attributes.length || (tag === 'UL' && node.tagName !== 'LI') || memoSecurityText(node.textContent) !== memoSecurityText(expected[index]))) return content;
  // Patch the original source only; do not reserialize neighboring user HTML.
  const headingStart = content.indexOf(heading.outerHTML);
  if (headingStart < 0) return content;
  const headingEnd = headingStart + heading.outerHTML.length,
    blockStart = content.indexOf(block.outerHTML, headingEnd);
  if (blockStart < 0 || !/^\s*$/.test(content.slice(headingEnd, blockStart))) return content;
  return content.slice(0, blockStart) + replacement + content.slice(blockStart + block.outerHTML.length);
}

function upgradeSecurityMemo(item, stamp = now()) {
  if (item.type !== 'memo' || item.deletedAt || Number(item.memoSecurityContentVersion) >= MEMO_SECURITY_CONTENT_VERSION) return false;
  const match = memoSecurityText(item.title).match(/^securite\s*[\u2014\u2013-]\s*(.+)$/),
    definition = match && MEMO_SECURITY_BY_TOPIC.get(match[1]);
  if (!definition || typeof item.content !== 'string') return false;
  const [, objective, practices, sourceKey] = definition, doc = new DOMParser().parseFromString(item.content, 'text/html');
  let content = replaceGeneratedMemoBlock(item.content, doc, 'Objectif securite', 'P', [MEMO_SECURITY_GENERIC_OBJECTIVE], '<p>' + esc(objective) + '</p>');
  content = replaceGeneratedMemoBlock(content, doc, 'Bonnes pratiques', 'UL', MEMO_SECURITY_GENERIC_PRACTICES, '<ul>' + practices.map(text => '<li>' + esc(text) + '</li>').join('') + '</ul>');
  if (content === item.content) return false;
  const source = MEMO_SECURITY_SOURCES[sourceKey];
  if (![...doc.querySelectorAll('a[href]')].some(link => link.getAttribute('href') === source[1])) content += '<h2>R\u00e9f\u00e9rences</h2><ul><li><a href="' + esc(source[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(source[0]) + '</a></li></ul>';
  item.content = content;
  item.memoSecurityContentVersion = MEMO_SECURITY_CONTENT_VERSION;
  item.updatedAt = stamp;
  return true;
}

function upgradeMemoLibrary(data, stamp = now()) {
  let changed = 0;
  for (const item of data.items || [])
    if (upgradeSecurityMemo(item, stamp)) changed++;
  if (changed) data.updatedAt = stamp;
  return changed;
}
async function upgradeLocalMemoLibrary() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('items', 'readwrite'),
      store = transaction.objectStore('items');
    let changed = 0,
      failure;
    transaction.oncomplete = () => {
      if (changed) window.workspaceSearch?.invalidate();
      resolve(changed)
    };
    transaction.onerror = transaction.onabort = () => reject(failure || transaction.error || new Error('Mise a jour des memos interrompue'));
    const request = store.getAll();
    request.onsuccess = () => {
      try {
        for (const item of request.result)
          if (upgradeSecurityMemo(item)) {
            store.put(item);
            changed++
          }
      } catch (error) {
        failure = error;
        transaction.abort()
      }
    };
  });
}
