'use strict';

const COVERAGE_CATALOG_VERSION=1;
const COVERAGE_CATALOG_SETTING='coverageCatalogVersion';
const COVERAGE_REVIEW_DATE='2026-10-08';
const COVERAGE_SOURCES={
  nexus:['Cisco Nexus 9000 - Show Commands NX-OS 10.3','https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/103x/command-reference/show/b_n9k_show_commands_103x.pdf'],
  catalyst:['Cisco Catalyst 9300 IOS-XE 17.17 - Command Reference','https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-17/command_reference/b_1717_9300_cr/interface_and_hardware_commands.html'],
  ise:['Cisco ISE 3.3 - CLI Reference','https://www.cisco.com/c/en/us/td/docs/security/ise/3-3/cli_guide/b_ise_CLI_Reference_Guide_33.pdf'],
  dna:['Cisco Catalyst Center 2.3.7.9 - Command Runner API','https://developer.cisco.com/docs/catalyst-center/2-3-7-9/command-runner/'],
  checkpoint:['Check Point R81.20 - VPN CLI','https://sc1.checkpoint.com/documents/R81.20/WebAdminGuides/EN/CP_R81.20_CLI_ReferenceGuide/Content/Topics-CLIG/VPN/vpn-tu.htm'],
  fortigate:['FortiGate 7.6 - IPsec VPN troubleshooting','https://docs.fortinet.com/document/fortigate/7.6.0/administration-guide/44240/ipsec-vpn-troubleshooting'],
  aruba:['HPE ArubaOS 8.x - CLI Reference','https://www.arubanetworks.com/techdocs/ArubaOS-8.x-Books/ArubaOS-8.x-CLI-Reference-Guide.pdf'],
  identity:['Check Point Identity Collector - Ports and Protocols','https://sc1.checkpoint.com/documents/Identity_Awareness_Clients_Admin_Guide/Content/Topics-IA-Clients-AG/Identity-Collector-Ports-and-Protocols.htm'],
  fortiweb:['FortiWeb 7.6.4 - CLI Reference','https://docs.fortinet.com/document/fortiweb/7.6.4/cli-reference/680825/system-status'],
  ems:['FortiClient EMS 7.4.6 - CLI Reference','https://docs.fortinet.com/document/forticlient/7.4.6/ems-cli-reference/169972/execute-diagnostic'],
  juniper:['Juniper Junos OS - Operational Commands','https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/topic-map/operational-commands.html'],
  tufin:['Tufin TOS - CLI Reference','https://forum.tufin.com/support/kc/latest/Content/ST2/ManagingTOS/CLI.htm'],
  centreon:['Centreon - Troubleshooting plugins','https://docs.centreon.com/pp/integrations/plugin-packs/getting-started/how-to-guides/troubleshooting-plugins/'],
  oxidized:['Oxidized - Configuration','https://github.com/ytti/oxidized/blob/master/docs/Configuration.md'],
  observium:['Observium - Discovery operation','https://docs.observium.org/discovery/'],
  tippingpoint:['Trend Micro TippingPoint SMS 6.6 - System log','https://docs.trendmicro.com/en-us/documentation/article/security-management-system-6-6-0-system-log'],
  backbox:['BackBox - User Guide','https://backbox.com/wp-content/uploads/BACKBOX-Users-Manual-.pdf'],
  vision:['Trend Vision One - Private Access Connector management','https://docs.trendmicro.com/fr-fr/documentation/article/trend-vision-one-private-access-connector-management'],
  f5:['F5 BIG-IP - tmsh Reference Guide','https://techdocs.f5.com/content/kb/en-us/products/big-ip_ltm/manuals/product/bigip-tmsh-reference-12-0-0/_jcr_content/pdfAttach/download/file.res/bigip-tmsh-reference-12-0-0.pdf'],
  entra:['Microsoft Entra - Troubleshoot sign-in errors','https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-troubleshoot-sign-in-errors'],
  graph:['Microsoft Graph PowerShell - Sign-in logs','https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-powershell-reporting']
};
const COVERAGE_TECH={
  nexus:['Cisco Nexus','Cisco','Nexus - NX-OS (mode autonome)','nexus'],
  catalyst:['Cisco Catalyst','Cisco','Catalyst - IOS / IOS-XE','catalyst'],
  ise:['Cisco ISE','Cisco','ISE 3.x / ADE-OS','ise'],
  dna:['Cisco DNA / Catalyst Center','Cisco','Catalyst Center 2.3.x','dna'],
  checkpoint:['Check Point','Check Point','Gaia / Security Gateway R81.x','checkpoint'],
  fortigate:['FortiGate / FortiOS','Fortinet','FortiGate / FortiOS 7.x','fortigate'],
  aruba:['Aruba Wi-Fi','HPE Aruba','ArubaOS 8.x / Instant 8.x','aruba'],
  identity:['Identity Collector','Check Point','Identity Collector / Windows','identity'],
  fortiweb:['FortiWeb','Fortinet','FortiWeb 7.x','fortiweb'],
  ems:['FortiClient EMS','Fortinet','FortiClient EMS 7.4 VM','ems'],
  juniper:['Juniper','Juniper','Junos OS / SRX','juniper'],
  tufin:['Tufin','Tufin','TOS Aurora / SecureTrack','tufin'],
  centreon:['Centreon','Centreon','Centreon / poller Linux','centreon'],
  oxidized:['Oxidized','Oxidized','Oxidized / Linux','oxidized'],
  observium:['Observium','Observium','Observium / Linux','observium'],
  tippingpoint:['TippingPoint','Trend Micro','TippingPoint SMS / IPS','tippingpoint'],
  backbox:['BackBox','BackBox','BackBox Network Automation','backbox'],
  vision:['Vision One / ZTSA','Trend Micro','Vision One Zero Trust Secure Access','vision'],
  f5:['F5 BIG-IP','F5','BIG-IP TMOS / tmsh','f5'],
  entra:['Microsoft Authenticator / Entra ID','Microsoft','Microsoft Entra ID / Authenticator','entra']
};
const COVERAGE_COMMANDS=[
  ['nexus','if-errors','show interface counters errors','Lire les erreurs de toutes les interfaces avant de cibler un port.','show interface counters errors'],
  ['nexus','if-detail','show interface <INTERFACE>','Examiner \u00e9tat, d\u00e9bits, erreurs et transitions d\u2019une interface.','show interface ethernet1/1'],
  ['nexus','if-config','show running-config interface <INTERFACE>','Lire la configuration effective d\u2019une interface.','show running-config interface ethernet1/1'],
  ['nexus','vlans','show vlan brief','Lister les VLAN et leurs ports sur le switch.','show vlan brief'],
  ['nexus','stp','show spanning-tree vlan <VLAN_ID>','Contr\u00f4ler racine, r\u00f4les et ports STP du VLAN.','show spanning-tree vlan 120'],
  ['nexus','mac','show mac address-table vlan <VLAN_ID>','V\u00e9rifier l\u2019apprentissage MAC dans le VLAN cibl\u00e9.','show mac address-table vlan 120'],
  ['nexus','logs','show logging logfile','Lire le journal NX-OS ; filtrer la sortie si elle est volumineuse.','show logging logfile'],
  ['nexus','environment','show environment','Contr\u00f4ler alimentations, ventilateurs et temp\u00e9ratures.','show environment'],
  ['nexus','module','show module','V\u00e9rifier l\u2019\u00e9tat et les mod\u00e8les des modules.','show module'],
  ['nexus','ospf','show ip ospf neighbors','Contr\u00f4ler les adjacences OSPF dans le contexte courant.','show ip ospf neighbors'],
  ['nexus','bgp','show bgp ipv4 unicast summary','Contr\u00f4ler les voisins BGP IPv4 unicast et les compteurs de pr\u00e9fixes.','show bgp ipv4 unicast summary'],
  ['nexus','hsrp','show hsrp brief','V\u00e9rifier les groupes HSRP et les r\u00f4les actifs ou standby.','show hsrp brief'],
  ['nexus','acl','show access-lists','Lire les ACL et leurs compteurs sans modifier la politique.','show access-lists'],
  ['ise','cpu','show cpu usage','Lire l\u2019utilisation CPU de l\u2019appliance ISE.','show cpu usage'],
  ['ise','memory','show memory','Lire l\u2019utilisation m\u00e9moire de l\u2019appliance ISE.','show memory'],
  ['ise','disk','show disk','V\u00e9rifier l\u2019occupation des partitions ISE.','show disk'],
  ['ise','ports','show ports','Lister les ports r\u00e9seau vus par ADE-OS.','show ports'],
  ['ise','network','show network','Afficher les param\u00e8tres r\u00e9seau de l\u2019appliance.','show network'],
  ['dna','token','curl --fail --silent --show-error --user "<USER>" --request POST "https://<CATALYST_CENTER>/dna/system/api/v1/auth/token"','Obtenir un jeton API en laissant curl demander le mot de passe. La sortie est sensible.','curl --user "api-reader" --request POST "https://cc.example.test/dna/system/api/v1/auth/token"','Sensible'],
  ['dna','devices','curl --fail --silent --show-error --header "X-Auth-Token: <TOKEN>" "https://<CATALYST_CENTER>/dna/intent/api/v1/network-device"','Lire l\u2019inventaire des \u00e9quipements via l\u2019API Intent.','curl --header "X-Auth-Token: REDACTED" "https://cc.example.test/dna/intent/api/v1/network-device"','Sensible'],
  ['dna','task','curl --fail --silent --show-error --header "X-Auth-Token: <TOKEN>" "https://<CATALYST_CENTER>/dna/intent/api/v1/task/<TASK_ID>"','Lire l\u2019\u00e9tat d\u2019une t\u00e2che asynchrone Catalyst Center.','curl --header "X-Auth-Token: REDACTED" "https://cc.example.test/dna/intent/api/v1/task/00000000-0000-0000-0000-000000000000"','Sensible'],
  ['aruba','ap-long','show ap database long','Afficher l\u2019inventaire d\u00e9taill\u00e9 des AP sur ArubaOS.','show ap database long'],
  ['aruba','users','show user-table verbose','Lire les clients, r\u00f4les et points d\u2019attache sur ArubaOS.','show user-table verbose'],
  ['aruba','auth','show auth-tracebuf','Lire le tampon des authentifications r\u00e9centes ; filtrer par MAC si la version le permet.','show auth-tracebuf'],
  ['aruba','client-table','show ap debug client-table','Afficher la table des clients sur Aruba Instant.','show ap debug client-table'],
  ['identity','service','Get-Service | Where-Object {$_.DisplayName -match "Identity Collector|Check Point"}','Identifier les services Identity Collector install\u00e9s sans supposer leur nom interne.','Get-Service | Where-Object {$_.DisplayName -match "Identity Collector|Check Point"}'],
  ['identity','events','Get-WinEvent -FilterHashtable @{LogName="Application"; StartTime=(Get-Date).AddHours(-2)} | Where-Object {$_.ProviderName -match "Check Point|Identity Collector"} | Select-Object -First 100','Collecter les \u00e9v\u00e9nements applicatifs r\u00e9cents li\u00e9s au collecteur.','Get-WinEvent -FilterHashtable @{LogName="Application"; StartTime=(Get-Date).AddHours(-2)} | Where-Object {$_.ProviderName -match "Check Point|Identity Collector"} | Select-Object -First 100'],
  ['identity','ldaps','Test-NetConnection -ComputerName <CONTROLEUR_AD> -Port 636','Tester LDAPS depuis le serveur Identity Collector.','Test-NetConnection -ComputerName dc01.example.test -Port 636'],
  ['identity','smb','Test-NetConnection -ComputerName <CONTROLEUR_AD> -Port 445','Tester SMB vers un contr\u00f4leur de domaine lorsque le mode de collecte le requiert.','Test-NetConnection -ComputerName dc01.example.test -Port 445'],
  ['fortiweb','ping','execute ping <HOST>','Tester la joignabilit\u00e9 d\u2019un backend depuis FortiWeb.','execute ping 192.0.2.10'],
  ['fortiweb','traceroute','execute traceroute <HOST>','Localiser une rupture de chemin depuis FortiWeb.','execute traceroute 192.0.2.10'],
  ['fortiweb','ping-options','execute ping-options view-settings','Lire les options de ping actives avant d\u2019interpr\u00e9ter le test.','execute ping-options view-settings'],
  ['fortiweb','network-ip','diagnose network ip list','Lister les adresses d\u2019interface connues par FortiWeb.','diagnose network ip list'],
  ['ems','diagnostic','emscli execute diagnostic --compress-type zip --keep.file --yes','G\u00e9n\u00e9rer un paquet de diagnostic EMS local sans inclure explicitement la base.','emscli execute diagnostic --compress-type zip --keep.file --yes','Collecte locale'],
  ['ems','ping','emscli execute ping <HOST>','Tester la joignabilit\u00e9 depuis l\u2019appliance EMS.','emscli execute ping 192.0.2.10'],
  ['juniper','bgp','show bgp summary','Contr\u00f4ler les sessions BGP et les pr\u00e9fixes re\u00e7us sous Junos.','show bgp summary'],
  ['juniper','ospf','show ospf neighbor','Contr\u00f4ler les adjacences OSPF.','show ospf neighbor'],
  ['juniper','bgp-routes','show route protocol bgp','Lire les routes BGP actives et candidates.','show route protocol bgp'],
  ['juniper','cluster','show chassis cluster status','V\u00e9rifier les n\u0153uds et groupes de redondance d\u2019un SRX en cluster.','show chassis cluster status'],
  ['juniper','cluster-interfaces','show chassis cluster interfaces','Contr\u00f4ler les interfaces fabric et control d\u2019un cluster SRX.','show chassis cluster interfaces'],
  ['juniper','ike','show security ike security-associations detail','Lire les associations IKE d\u00e9taill\u00e9es sur SRX.','show security ike security-associations detail'],
  ['juniper','ipsec','show security ipsec security-associations detail','Lire les SA IPsec, SPI et compteurs sur SRX.','show security ipsec security-associations detail'],
  ['juniper','flow-status','show security flow status','V\u00e9rifier l\u2019\u00e9tat du moteur de flux SRX.','show security flow status'],
  ['tufin','version','sudo tos version','Afficher la version TOS Aurora install\u00e9e.','sudo tos version'],
  ['tufin','status','sudo tos status','Contr\u00f4ler cluster, services, bases, remote collectors et sauvegardes.','sudo tos status'],
  ['tufin','history','sudo tos status history','Afficher l\u2019historique de sant\u00e9 TOS.','sudo tos status history'],
  ['tufin','modules','sudo tos modules list','Lister les modules TOS actifs.','sudo tos modules list'],
  ['centreon','services','systemctl status centengine cbd gorgoned --no-pager','Contr\u00f4ler les principaux services d\u2019un poller ou serveur central.','systemctl status centengine cbd gorgoned --no-pager'],
  ['centreon','journals','journalctl -u centengine -u cbd -u gorgoned --since "-30 min" --no-pager','Corr\u00e9ler les journaux des composants Centreon sur une fen\u00eatre courte.','journalctl -u centengine -u cbd -u gorgoned --since "-30 min" --no-pager'],
  ['centreon','plugin-help','/usr/lib/centreon/plugins/<PLUGIN> --help','V\u00e9rifier les options support\u00e9es par le plugin install\u00e9 avant de reproduire un check.','/usr/lib/centreon/plugins/centreon_linux_snmp.pl --help'],
  ['oxidized','version','oxidized --version','Afficher la version r\u00e9elle d\u2019Oxidized.','oxidized --version'],
  ['oxidized','debug','oxidized --debug','Lancer Oxidized au premier plan en debug pendant une fen\u00eatre courte.','oxidized --debug','Diagnostic verbeux'],
  ['oxidized','nodes-api','curl --fail --silent "http://127.0.0.1:8888/nodes"','Lire les n\u0153uds expos\u00e9s par l\u2019API locale si le service HTTP est activ\u00e9.','curl --fail --silent "http://127.0.0.1:8888/nodes"'],
  ['observium','discovery-debug','./discovery.php -h <DEVICE> -d','Rejouer la discovery d\u2019un seul \u00e9quipement en mode debug.','./discovery.php -h router.example.test -d','Diagnostic verbeux'],
  ['observium','poller-debug','./poller.php -h <DEVICE> -d','Rejouer le polling d\u2019un seul \u00e9quipement en mode debug.','./poller.php -h router.example.test -d','Diagnostic verbeux'],
  ['observium','validate','./validate.php','V\u00e9rifier les d\u00e9pendances et la configuration de l\u2019installation Observium.','./validate.php'],
  ['f5','version','tmsh show sys version','Afficher la version TMOS et le build BIG-IP.','tmsh show sys version'],
  ['f5','performance','tmsh show sys performance','Lire les indicateurs de performance du BIG-IP.','tmsh show sys performance'],
  ['f5','failover','tmsh show sys failover','Contr\u00f4ler le r\u00f4le actif, standby ou offline.','tmsh show sys failover'],
  ['f5','ha-status','tmsh show sys ha-status','Afficher les conditions de haute disponibilit\u00e9 et de failover.','tmsh show sys ha-status'],
  ['f5','virtuals','tmsh show ltm virtual','Lister les virtual servers et leurs statistiques.','tmsh show ltm virtual'],
  ['f5','pools','tmsh show ltm pool','Lister les pools, membres et statistiques.','tmsh show ltm pool'],
  ['f5','pool','tmsh show ltm pool <POOL> members','Cibler l\u2019\u00e9tat des membres d\u2019un pool.','tmsh show ltm pool /Common/app_pool members'],
  ['f5','routes','tmsh show net route','Lire la table de routage BIG-IP.','tmsh show net route'],
  ['f5','connections','tmsh show sys connection','Lire la table des connexions ; filtrer sur un environnement charg\u00e9.','tmsh show sys connection'],
  ['f5','ltm-log','tail -n 100 /var/log/ltm','Lire les derniers \u00e9v\u00e9nements LTM depuis bash.','tail -n 100 /var/log/ltm'],
  ['entra','connect','Connect-MgGraph -Scopes "AuditLog.Read.All","UserAuthenticationMethod.Read.All"','Ouvrir une session Microsoft Graph avec les droits de lecture n\u00e9cessaires.','Connect-MgGraph -Scopes "AuditLog.Read.All","UserAuthenticationMethod.Read.All"','Authentification interactive','graph'],
  ['entra','signins','Get-MgAuditLogSignIn -Filter "userPrincipalName eq \'<UPN>\'" -Top 20 | Select-Object CreatedDateTime,AppDisplayName,Status,CorrelationId','Lire les connexions r\u00e9centes d\u2019un utilisateur et conserver le Correlation ID.','Get-MgAuditLogSignIn -Filter "userPrincipalName eq \'alice@example.test\'" -Top 20 | Select-Object CreatedDateTime,AppDisplayName,Status,CorrelationId','Donn\u00e9es d\u2019identit\u00e9','graph'],
  ['entra','methods','Get-MgUserAuthenticationMethod -UserId <UPN>','Lister les m\u00e9thodes d\u2019authentification enregistr\u00e9es pour un utilisateur autoris\u00e9.','Get-MgUserAuthenticationMethod -UserId alice@example.test','Donn\u00e9es d\u2019identit\u00e9','graph']
];
const COVERAGE_DOCUMENTS=[
  ['nexus','l2','procedure','Cisco Nexus - Isoler une panne VLAN ou interface','Suivre le chemin port, VLAN, STP, MAC et port-channel sans modifier le trafic.',
    ['Identifier interface, VLAN, VRF, h\u00f4tes et heure du d\u00e9faut.','Comparer \u00e9tat, configuration et compteurs du port.','V\u00e9rifier VLAN, STP, apprentissage MAC et port-channel sur tout le chemin.','Corr\u00e9ler les journaux puis comparer avec un port sain.'],
    ['Lien Up sans MAC : v\u00e9rifier VLAN, h\u00f4te et agr\u00e9gation.','Erreurs croissantes : traiter le support physique avant le niveau 2.']],
  ['nexus','routing','procedure','Cisco Nexus - Diagnostiquer une adjacence OSPF ou BGP','S\u00e9parer transport, VRF, protocole et filtrage de routes.',
    ['Confirmer VRF, voisins, adresses source et protocole attendu.','Valider route et connectivit\u00e9 vers le pair avant le protocole.','Comparer \u00e9tat des voisins, timers, familles d\u2019adresses et pr\u00e9fixes.','Contr\u00f4ler ACL, MTU, authentification et politiques sans clear de session.'],
    ['Transport absent : corriger route ou interface avant OSPF/BGP.','Session \u00e9tablie sans pr\u00e9fixe : examiner familles et politiques.']],
  ['catalyst','stack','procedure','Cisco Catalyst - Diagnostiquer un stack d\u00e9grad\u00e9','Analyser membres, StackWise, versions et r\u00f4les avant toute recharge.',
    ['Relever mod\u00e8les, versions, r\u00f4les et heure de l\u2019incident.','Comparer show switch et l\u2019\u00e9tat des stack-ports.','V\u00e9rifier alimentation, journaux et compatibilit\u00e9 des membres.','Conserver la topologie avant de planifier un remplacement ou une recharge.'],
    ['Membre absent : distinguer alimentation, c\u00e2ble StackWise et incompatibilit\u00e9.','Version diff\u00e9rente : appliquer la proc\u00e9dure de mise \u00e0 niveau valid\u00e9e.']],
  ['ise','pxgrid','procedure','Cisco ISE - Diagnostiquer pxGrid, profiling et contexte','Distinguer panne ISE, certificat, sonde et consommateur de contexte.',
    ['Identifier n\u0153ud pxGrid, PAN/MnT, client, certificat et heure.','V\u00e9rifier services ISE, temps, DNS et journaux pxGrid.','Comparer autorisations du client et cha\u00eene de certificats.','Pour le profiling, confirmer les sondes et attributs re\u00e7us avant la policy.'],
    ['Connexion TLS refus\u00e9e : v\u00e9rifier confiance et identit\u00e9 du certificat.','Endpoint mal profil\u00e9 : examiner les attributs bruts avant la r\u00e8gle.']],
  ['dna','sync','procedure','Cisco Catalyst Center - Equipement non g\u00e9r\u00e9 ou d\u00e9synchronis\u00e9','S\u00e9parer reachability, credentials, inventory, task et provisioning.',
    ['Identifier device ID, site, credentials, derni\u00e8re synchronisation et t\u00e2che en erreur.','V\u00e9rifier DNS, NTP, HTTPS, SSH/SNMP et reachability depuis Catalyst Center.','Lire l\u2019inventaire et l\u2019\u00e9tat de la t\u00e2che via interface ou API.','Comparer running configuration et intention avant toute reprovision.'],
    ['Unreachable : traiter transport ou credentials avant Assurance.','Managed mais Out of Sync : examiner le diff et la t\u00e2che avant de pousser.']],
  ['checkpoint','vpn','procedure','Check Point - Diagnostiquer un VPN site a site','Corr\u00e9ler communaut\u00e9, IKE, IPsec, routage et policy sans supprimer les SA.',
    ['Identifier peers, domaine VPN, communaut\u00e9, flux et heure.','V\u00e9rifier route, policy, NAT et trafic vers le peer.','Lire les SA IKE/IPsec et compteurs avec vpn tu en mode consultation.','Capturer de fa\u00e7on cibl\u00e9e si la n\u00e9gociation ou le trafic reste absent.'],
    ['Pas de SA : contr\u00f4ler reachability, proposals et identit\u00e9.','SA pr\u00e9sente sans trafic : examiner selectors, NAT et chemin retour.']],
  ['fortigate','ipsec','procedure','FortiGate - Diagnostiquer un tunnel IPsec','Analyser phase 1, phase 2, routes, policy et compteurs sans relancer le tunnel.',
    ['Identifier tunnel, peer, selectors, VDOM, flux et heure.','Lire summary, gateway IKE et d\u00e9tail du tunnel.','V\u00e9rifier route, policy, NAT et session du flux.','Utiliser le debug IKE uniquement cibl\u00e9 et l\u2019arr\u00eater proprement.'],
    ['Phase 1 absente : traiter transport UDP 500/4500 et proposals.','SA pr\u00e9sente sans paquets : examiner selectors et chemin retour.']],
  ['aruba','ap','procedure','Aruba Wi-Fi - AP absent ou radio d\u00e9grad\u00e9e','S\u00e9parer adoption, tunnel, alimentation, RF et population client.',
    ['Identifier AP, contr\u00f4leur ou cluster Instant, site, canal et heure.','V\u00e9rifier pr\u00e9sence dans la base et \u00e9tat actif.','Comparer radios, puissance, canal, bruit, clients et voisins.','Corr\u00e9ler switchport, PoE, VLAN de gestion et journaux.'],
    ['AP absent : traiter alimentation, DHCP/DNS et chemin de gestion.','AP actif sans client : examiner SSID, radio, authentification et RF.']],
  ['identity','service','procedure','Identity Collector - Service ou collecte AD en erreur','Contr\u00f4ler service Windows, droits, DC, ports et remont\u00e9e vers les PDP.',
    ['Identifier serveur Collector, domaine, DC, compte de service et heure.','V\u00e9rifier services et journaux Windows du collecteur.','Tester r\u00e9solution, RPC/LDAP/LDAPS/SMB selon le mode configur\u00e9.','Comparer les identit\u00e9s sur Collector, PDP puis PEP.'],
    ['Collecte vide : examiner droits et acc\u00e8s aux journaux DC.','Collecte correcte sans policy : poursuivre sur PDP/PEP et installation de policy.']],
  ['fortiweb','tls','procedure','FortiWeb - Diagnostiquer certificat, SNI et TLS','S\u00e9parer TLS client, profil FortiWeb et TLS vers le backend.',
    ['Relever FQDN, SNI, virtual server, certificat, cha\u00eene et backend.','Tester le handshake c\u00f4t\u00e9 client puis c\u00f4t\u00e9 backend.','Comparer profil TLS, certificat servi, dates et noms SAN.','Corr\u00e9ler journaux WAF et sant\u00e9 du serveur r\u00e9el.'],
    ['Mauvais certificat : v\u00e9rifier SNI et association au virtual server.','TLS frontal valide mais backend KO : examiner confiance et protocole c\u00f4t\u00e9 serveur.']],
  ['ems','policy','procedure','FortiClient EMS - Endpoint non conforme ou policy non appliquee','Distinguer t\u00e9l\u00e9m\u00e9trie, groupe, tags, policy et version du client.',
    ['Identifier endpoint, EMS, site, groupe, policy, tags et versions.','V\u00e9rifier derni\u00e8re t\u00e9l\u00e9m\u00e9trie et \u00e9tat de licence.','Comparer r\u00e8gles d\u2019affectation, exclusions et configuration effective.','Collecter un diagnostic EMS et FortiClient avant r\u00e9installation.'],
    ['Endpoint Online avec mauvaise policy : examiner ordre et crit\u00e8res des groupes.','Endpoint Offline : traiter r\u00e9seau, certificat et compatibilit\u00e9 de version.']],
  ['juniper','routing','procedure','Juniper Junos - Diagnostiquer OSPF ou BGP','Suivre interface, route, adjacence et politique dans la bonne routing-instance.',
    ['Identifier routing-instance, pair, protocole et famille.','V\u00e9rifier interface, route et reachability vers le pair.','Lire voisins OSPF/BGP et routes du protocole.','Comparer import/export policy et journaux sans clear.'],
    ['Pair absent : traiter transport et configuration locale.','Pair Up sans route : examiner familles et policy-options.']],
  ['juniper','vpn','procedure','Juniper SRX - Diagnostiquer cluster et VPN IPsec','Distinguer \u00e9tat HA, IKE, IPsec, policy et chemin retour.',
    ['V\u00e9rifier cluster, groupes de redondance et interfaces control/fabric.','Identifier VPN, peer, traffic selectors et routing-instance.','Lire SA IKE puis IPsec et leurs compteurs.','Contr\u00f4ler route, policy et session du trafic.'],
    ['Cluster d\u00e9grad\u00e9 : stabiliser HA avant le tunnel.','SA IPsec sans trafic : examiner selectors, policy et route retour.']],
  ['tippingpoint','sync','procedure','TippingPoint - Policy non deployee ou IPS desynchronise','Contr\u00f4ler SMS, distribution, sant\u00e9 IPS et inspection bypass.',
    ['Identifier SMS, IPS, profil, package et heure du d\u00e9ploiement.','V\u00e9rifier connectivit\u00e9 et statut de l\u2019IPS dans SMS.','Comparer version de policy attendue et appliqu\u00e9e.','Examiner system log, erreurs de distribution et \u00e9tat bypass.'],
    ['Distribution en erreur : traiter communication et compatibilit\u00e9 avant de republier.','Policy appliqu\u00e9e sans inspection : examiner segments et bypass.']],
  ['tufin','health','procedure','Tufin - Plateforme TOS ou collector degrade','Lire la sant\u00e9 TOS, les modules, remote collectors et sauvegardes.',
    ['Relever version, n\u0153ud, modules et heure du d\u00e9faut.','Ex\u00e9cuter tos status puis examiner uniquement les composants non OK.','Comparer historique de statut et connectivit\u00e9 des remote collectors.','V\u00e9rifier derni\u00e8re sauvegarde avant toute action de service.'],
    ['Cluster OK mais device expir\u00e9 : poursuivre dans SecureTrack.','Service non OK : collecter les preuves avant restart avec le support.']],
  ['centreon','pipeline','procedure','Centreon - Isoler une rupture poller, engine ou broker','Suivre le check depuis le plugin jusqu\u2019au stockage et \u00e0 l\u2019interface.',
    ['Identifier ressource, service, poller, commande et dernier r\u00e9sultat.','Rejouer le plugin sous le compte du moteur avec les m\u00eames arguments.','Contr\u00f4ler centengine, cbd, gorgoned et leurs journaux.','Comparer files, latence et flux entre poller et central.'],
    ['Plugin correct mais UI fig\u00e9e : examiner broker et stockage.','Plugin en erreur : corriger d\u00e9pendance, droits ou param\u00e8tres avant le moteur.']],
  ['oxidized','model','procedure','Oxidized - Authentification ou modele dequipement en erreur','Distinguer source, credentials, transport, prompt et mod\u00e8le Oxidized.',
    ['Identifier n\u0153ud, groupe, model, source et derni\u00e8re collecte.','V\u00e9rifier la r\u00e9solution du n\u0153ud et les credentials sans les afficher.','Lancer un debug court et rep\u00e9rer prompt, timeout ou commande refus\u00e9e.','Comparer le model d\u00e9clar\u00e9 au syst\u00e8me r\u00e9el et \u00e0 sa version.'],
    ['Connexion refus\u00e9e : traiter AAA ou transport.','Connexion ouverte puis timeout : examiner prompt et model.']],
  ['observium','snmp','procedure','Observium - Equipement joignable mais SNMP incomplet','Comparer SNMP direct, discovery, poller, modules et donn\u00e9es stock\u00e9es.',
    ['Identifier device ID, hostname, version SNMP et modules absents.','Tester SNMP depuis le serveur sans exposer le secret.','Lancer discovery cibl\u00e9e puis polling cibl\u00e9 en debug.','Examiner erreurs de MIB, permissions et horodatage des RRD.'],
    ['SNMP r\u00e9pond mais entit\u00e9 absente : examiner discovery et support du mod\u00e8le.','Discovery correcte sans graphe : examiner poller et RRD.']],
  ['backbox','restore','procedure','BackBox - Valider une restauration sans impacter la production','Transformer une sauvegarde r\u00e9ussie en preuve de restauration exploitable.',
    ['Choisir un \u00e9quipement de laboratoire ou une cible isol\u00e9e.','V\u00e9rifier date, taille, chiffrement et int\u00e9grit\u00e9 du backup.','Comparer le contenu restaurable aux attentes sans pousser en production.','Documenter dur\u00e9e, d\u00e9pendances, secrets requis et crit\u00e8res de succ\u00e8s.'],
    ['Backup vert sans test : preuve de collecte, pas preuve de restauration.','Echec en laboratoire : corriger parser, credentials ou proc\u00e9dure avant production.']],
  ['vision','connector','procedure','Vision One ZTSA - Connector prive degrade','S\u00e9parer sant\u00e9 du connector, DNS, acc\u00e8s applicatif et policy.',
    ['Identifier connector, groupe, application priv\u00e9e, utilisateur et heure.','V\u00e9rifier \u00e9tat, version et derni\u00e8re connexion dans Vision One.','Tester depuis le connector DNS et TCP vers la cible priv\u00e9e.','Comparer assignment, policy ZTSA, posture et journaux de session.'],
    ['Connector Offline : traiter sortie HTTPS, proxy, DNS et temps.','Connector Online sans application : examiner cible, port et policy.']],
  ['f5','traffic','procedure','F5 BIG-IP - Diagnostiquer virtual server, pool et node','Suivre une connexion du virtual server jusqu\u2019au membre de pool et au retour.',
    ['Identifier partition, virtual server, pool, node, port et heure.','V\u00e9rifier \u00e9tat du virtual, du pool et des membres.','Contr\u00f4ler route, SNAT, profils et table de connexions.','Corr\u00e9ler /var/log/ltm et les compteurs avant toute modification.'],
    ['Virtual disponible mais pool down : examiner monitor et reachability des membres.','Pool up sans trafic retour : examiner SNAT, route et serveur.']],
  ['f5','ha','procedure','F5 BIG-IP - Diagnostiquer HA et synchronisation','Contr\u00f4ler r\u00f4le, device trust, config-sync et causes de failover.',
    ['Relever device group, r\u00f4les, version et heure du changement.','Lire failover et ha-status sur les deux membres.','Comparer synchronisation et sant\u00e9 des interfaces de HA.','Conserver les preuves avant tout force-to-standby ou resync.'],
    ['R\u00f4les inattendus : examiner les causes avant de forcer.','Config diff\u00e9rente : identifier la source de v\u00e9rit\u00e9 avant synchronisation.']],
  ['entra','authenticator','procedure','Microsoft Authenticator - Diagnostiquer inscription et MFA','Corr\u00e9ler m\u00e9thodes enregistr\u00e9es, sign-in logs, Conditional Access et appareil.',
    ['Recueillir UPN, application, heure, Correlation ID et code d\u2019erreur.','Lire les m\u00e9thodes enregistr\u00e9es sans les modifier.','Examiner Authentication Details et Conditional Access du sign-in.','V\u00e9rifier heure, notifications, connectivit\u00e9 et enregistrement de l\u2019application mobile.'],
    ['Code 500121 : l\u2019utilisateur n\u2019a pas termin\u00e9 le challenge MFA.','M\u00e9thode absente : examiner policy d\u2019authentification et journaux d\u2019inscription.']]
];

function coverageSource(key){const [title,url]=COVERAGE_SOURCES[key];return {title,url}}
function coverageValue(value){return String(value||'').trim().toLowerCase().replace(/\s+/g,' ')}
function coverageKey(item,folderNames=new Map()){
  return item.type==='command'?'command\0'+coverageValue(folderNames.get(item.folderId))+'\0'+coverageValue(item.content):item.type+'\0'+coverageValue(item.title);
}
function coverageDocumentHTML(title,description,steps,interpretation,source){
  return '<h1>'+esc(title)+'</h1><p>'+esc(description)+'</p><h2>Diagnostic</h2><ol>'+steps.map(step=>'<li>'+esc(step)+'</li>').join('')+'</ol><h2>Interpr\u00e9tation</h2><ul>'+interpretation.map(line=>'<li>'+esc(line)+'</li>').join('')+'</ul><h2>Validation</h2><p>Conserver les r\u00e9sultats avant et apr\u00e8s, puis valider le service avec un test r\u00e9el et cibl\u00e9.</p><h2>Pr\u00e9cautions</h2><p>Lecture et collecte d\u2019abord. Ne pas red\u00e9marrer, vider une session, pousser une policy ou modifier la configuration sans fen\u00eatre et plan de retour.</p><h2>Source officielle</h2><ul><li><a href="'+esc(source.url)+'" target="_blank" rel="noopener noreferrer">'+esc(source.title)+'</a></li></ul><p>Documentation consult\u00e9e le '+COVERAGE_REVIEW_DATE+'. Confirmer produit, mod\u00e8le, version et droits avant ex\u00e9cution.</p>';
}
function enrichCoverageLibrary(data,stamp=now()){
  data.items??=[];data.folders??=[];data.settings??=[];
  if(Number(data.settings.find(record=>record.key===COVERAGE_CATALOG_SETTING)?.value)>=COVERAGE_CATALOG_VERSION)return data;
  const ids=new Set([...data.items,...data.folders].map(record=>record.id)),folderNames=new Map(data.folders.map(folder=>[folder.id,folder.name])),existing=new Set(data.items.filter(item=>!item.deletedAt).map(item=>coverageKey(item,folderNames))),folders=new Map();
  const uniqueId=preferred=>{const id=ids.has(preferred)?uid():preferred;ids.add(id);return id};
  const folderFor=(tech,section)=>{const [name]=COVERAGE_TECH[tech],key=section+'\0'+name;if(folders.has(key))return folders.get(key);let folder=data.folders.find(record=>record.section===section&&!record.deletedAt&&record.name===name);if(!folder){folder={id:uniqueId('coverage-folder-'+tech+'-'+section),section,name,parentId:null,createdAt:stamp,updatedAt:stamp};data.folders.push(folder)}folders.set(key,folder);return folder};
  for(const [tech,slug,title,description,example,impact='Lecture seule',sourceKey] of COVERAGE_COMMANDS){
    const content=title,[folderName,vendor,platform,defaultSource]=COVERAGE_TECH[tech],key='command\0'+coverageValue(folderName)+'\0'+coverageValue(content);if(existing.has(key))continue;
    const source=coverageSource(sourceKey||defaultSource),folder=folderFor(tech,'command');
    data.items.push({id:uniqueId('coverage-command-'+tech+'-'+slug),type:'command',title,content,description,example,folderId:folder.id,vendor,platform,
      context:'Contexte de diagnostic '+platform+'. Remplacer les param\u00e8tres entre chevrons. Impact : '+impact+'. Confirmer syntaxe, droits et version avant ex\u00e9cution.',tags:[tech,'diagnostic','lecture-seule'],sources:[source],quality:{reviewedAt:COVERAGE_REVIEW_DATE,validation:'documentation',impact},favorite:false,viewCount:0,attachments:[],createdAt:stamp,updatedAt:stamp});existing.add(key);
  }
  for(const [tech,slug,type,title,description,steps,interpretation] of COVERAGE_DOCUMENTS){
    const key=type+'\0'+title.toLowerCase();if(existing.has(key))continue;
    const [,vendor,platform,sourceKey]=COVERAGE_TECH[tech],source=coverageSource(sourceKey),folder=folderFor(tech,'memo');
    data.items.push({id:uniqueId('coverage-document-'+tech+'-'+slug),type,title,description,content:coverageDocumentHTML(title,description,steps,interpretation,source),folderId:folder.id,vendor,platform,
      tags:[tech,'diagnostic','procedure'],sources:[source],quality:{reviewedAt:COVERAGE_REVIEW_DATE,validation:'documentation-et-methode',impact:'R\u00e9f\u00e9rence'},favorite:false,viewCount:0,attachments:[],createdAt:stamp,updatedAt:stamp});existing.add(key);
  }
  const marker=data.settings.find(record=>record.key===COVERAGE_CATALOG_SETTING);if(marker)marker.value=COVERAGE_CATALOG_VERSION;else data.settings.push({key:COVERAGE_CATALOG_SETTING,value:COVERAGE_CATALOG_VERSION});
  data.updatedAt=stamp;return data;
}
async function enrichLocalCoverageLibrary(){
  return new Promise((resolve,reject)=>{
    const stores=['items','folders','settings'],transaction=db.transaction(stores,'readwrite'),records={};let failure,changed=false;
    transaction.oncomplete=()=>{if(changed)window.workspaceSearch?.invalidate();resolve(changed)};
    transaction.onerror=transaction.onabort=()=>reject(failure||transaction.error||new Error('Enrichissement de couverture interrompu'));
    const merge=()=>{if(stores.some(store=>!records[store]))return;if(!records.items.length)return;try{const payload=enrichCoverageLibrary(structuredClone(records));for(const store of stores){const previous=new Map(records[store].map(record=>[record.id||record.key,JSON.stringify(record)]));for(const record of payload[store])if(previous.get(record.id||record.key)!==JSON.stringify(record)){transaction.objectStore(store).put(record);changed=true}}}catch(error){failure=error;transaction.abort()}};
    for(const store of stores){const request=transaction.objectStore(store).getAll();request.onsuccess=()=>{records[store]=request.result;merge()}}
  });
}
