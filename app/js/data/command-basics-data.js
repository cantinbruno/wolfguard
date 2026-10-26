'use strict';

// Generated from maintenance/scripts/command-basics.json by maintenance/scripts/build-command-basics.py.
const BASIC_COMMANDS_DATA={
  "version": 1,
  "reviewedAt": "2026-10-10",
  "retiredContents": [
    "curl -q --version",
    "curl --version",
    "snmpget -V",
    "nmap --version",
    "nmap -V",
    "sqlmap --version",
    "show application version ise",
    "nuclei -version -duc",
    "tshark --version",
    "show version",
    "kubectl version --client -o json",
    "kubectl version --client",
    "tmsh show sys version",
    "oxidized --version",
    "sudo tos version",
    "./poller.php -V",
    "ffuf -V",
    "pkg-static info -x pfSense-upgrade",
    "/usr/bin/vmware-toolbox-cmd -v",
    "winver"
  ],
  "technologies": {
    "nmap": {
      "name": "Nmap",
      "vendor": "Nmap",
      "platform": "Terminal du poste de diagnostic"
    },
    "catalyst": {
      "name": "Cisco Catalyst",
      "vendor": "Cisco",
      "platform": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire"
    },
    "nexus": {
      "name": "Cisco Nexus",
      "vendor": "Cisco",
      "platform": "NX-OS autonome - pas une CLI ACI"
    },
    "ise": {
      "name": "Cisco ISE",
      "vendor": "Cisco",
      "platform": "CLI ADE-OS de l'appliance ISE"
    },
    "dna": {
      "name": "Cisco DNA / Catalyst Center",
      "vendor": "Cisco",
      "platform": "curl depuis un poste API autoris\u00e9"
    },
    "fortigate": {
      "name": "FortiGate / FortiOS",
      "vendor": "Fortinet",
      "platform": "CLI FortiOS - dans le VDOM appropri\u00e9"
    },
    "checkpoint": {
      "name": "Check Point",
      "vendor": "Check Point",
      "platform": "Gaia Clish ou Expert selon la commande"
    },
    "stormshield": {
      "name": "Stormshield",
      "vendor": "Stormshield",
      "platform": "CLI Serverd SNS - pas le shell SSH"
    },
    "juniper": {
      "name": "Juniper",
      "vendor": "Juniper",
      "platform": "Junos - mode op\u00e9rationnel sauf indication contraire"
    },
    "aruba": {
      "name": "Aruba Wi-Fi",
      "vendor": "HPE Aruba",
      "platform": "Contr\u00f4leur ArubaOS 8 - pas Aruba Central / AOS 10"
    },
    "f5": {
      "name": "F5 BIG-IP",
      "vendor": "F5",
      "platform": "Bash BIG-IP avec tmsh - bonne partition"
    },
    "fortiweb": {
      "name": "FortiWeb",
      "vendor": "Fortinet",
      "platform": "CLI FortiWeb"
    },
    "pfsense": {
      "name": "pfSense",
      "vendor": "Netgate",
      "platform": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9"
    },
    "linux": {
      "name": "Linux",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd"
    },
    "windows": {
      "name": "Windows",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows sauf commandes CMD indiqu\u00e9es"
    },
    "ad": {
      "name": "Active Directory",
      "vendor": "Microsoft",
      "platform": "PowerShell avec module ActiveDirectory / RSAT"
    },
    "gpo": {
      "name": "GPO",
      "vendor": "Microsoft",
      "platform": "PowerShell avec module GroupPolicy / poste joint au domaine"
    },
    "exchange": {
      "name": "Exchange",
      "vendor": "Microsoft",
      "platform": "Exchange Management Shell locale - pas Exchange Online"
    },
    "m365": {
      "name": "Microsoft 365",
      "vendor": "Microsoft",
      "platform": "PowerShell avec Microsoft Graph / ExchangeOnlineManagement selon la commande"
    },
    "entra": {
      "name": "Microsoft Authenticator / Entra ID",
      "vendor": "Microsoft",
      "platform": "Microsoft Graph PowerShell - tenant autoris\u00e9"
    },
    "iis": {
      "name": "IIS / ACME",
      "vendor": "Microsoft",
      "platform": "PowerShell sur le serveur IIS avec AppCmd install\u00e9"
    },
    "outlook": {
      "name": "Outlook",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows / Outlook classique"
    },
    "print": {
      "name": "Impression",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows avec PrintManagement"
    },
    "esxi": {
      "name": "VMware ESXi",
      "vendor": "VMware",
      "platform": "Shell ESXi autoris\u00e9"
    },
    "vcenter": {
      "name": "VMware vCenter",
      "vendor": "VMware",
      "platform": "VCSA - Appliance Shell pour service-control ; Bash pour df / tail"
    },
    "docker": {
      "name": "Docker",
      "vendor": "Docker",
      "platform": "CLI Docker - bon contexte / daemon"
    },
    "k8s": {
      "name": "Kubernetes",
      "vendor": "Kubernetes",
      "platform": "kubectl - bon contexte et namespace"
    },
    "dns": {
      "name": "DNS",
      "vendor": "ISC / Microsoft",
      "platform": "dig depuis Linux ou Resolve-DnsName depuis Windows"
    },
    "efficientip": {
      "name": "EfficientIP / SOLIDserver",
      "vendor": "EfficientIP",
      "platform": "Poste Linux de diagnostic - requ\u00eates au serveur DNS SOLIDserver"
    },
    "web": {
      "name": "Web / API",
      "vendor": "curl",
      "platform": "curl depuis le poste de diagnostic"
    },
    "tls": {
      "name": "TLS / PKI",
      "vendor": "OpenSSL",
      "platform": "OpenSSL sur le poste de diagnostic"
    },
    "ssh": {
      "name": "SSH",
      "vendor": "OpenSSH",
      "platform": "Terminal OpenSSH"
    },
    "captures": {
      "name": "Captures",
      "vendor": "Wireshark / tcpdump",
      "platform": "Poste de diagnostic avec acc\u00e8s \u00e0 l'interface ou au PCAP"
    },
    "smb": {
      "name": "SMB",
      "vendor": "Microsoft / Samba",
      "platform": "PowerShell Windows ou smbclient Linux selon la commande"
    },
    "ldap": {
      "name": "LDAP",
      "vendor": "OpenLDAP",
      "platform": "ldapsearch - poste de diagnostic"
    },
    "snmp": {
      "name": "SNMP",
      "vendor": "Net-SNMP",
      "platform": "Client Net-SNMP avec profil SNMPv3 authPriv pr\u00e9configur\u00e9"
    },
    "eset": {
      "name": "ESET",
      "vendor": "ESET",
      "platform": "PowerShell sur le poste ESET Windows"
    },
    "3cx": {
      "name": "3CX",
      "vendor": "3CX",
      "platform": "Shell du serveur Debian 3CX autoris\u00e9 - lecture uniquement"
    },
    "postfix": {
      "name": "Postfix",
      "vendor": "Postfix",
      "platform": "Shell du serveur Postfix"
    },
    "nas": {
      "name": "NAS",
      "vendor": "Multi-\u00e9diteur",
      "platform": "Shell Linux du NAS si l'\u00e9diteur autorise SSH"
    },
    "mac": {
      "name": "macOS",
      "vendor": "Apple",
      "platform": "Terminal macOS"
    },
    "ffuf": {
      "name": "ffuf",
      "vendor": "ffuf",
      "platform": "Poste d'audit / laboratoire autoris\u00e9"
    },
    "sqlmap": {
      "name": "SQLmap",
      "vendor": "SQLmap",
      "platform": "Laboratoire ou application express\u00e9ment autoris\u00e9e"
    },
    "nuclei": {
      "name": "Nuclei",
      "vendor": "ProjectDiscovery",
      "platform": "Poste d'audit autoris\u00e9 - templates approuv\u00e9s"
    },
    "trivy": {
      "name": "Trivy",
      "vendor": "Aqua Security",
      "platform": "Poste de diagnostic / CI sur fichiers ou image autoris\u00e9s"
    },
    "centreon": {
      "name": "Centreon",
      "vendor": "Centreon",
      "platform": "Shell Linux du poller / serveur central"
    },
    "oxidized": {
      "name": "Oxidized",
      "vendor": "Oxidized",
      "platform": "Shell Linux du collecteur / d\u00e9p\u00f4t de sauvegarde"
    },
    "observium": {
      "name": "Observium",
      "vendor": "Observium",
      "platform": "Shell Linux dans le r\u00e9pertoire d'installation Observium"
    },
    "ivanti": {
      "name": "Ivanti VPN",
      "vendor": "Ivanti",
      "platform": "PowerShell sur le client Windows VPN"
    },
    "identity": {
      "name": "Identity Collector",
      "vendor": "Check Point",
      "platform": "PowerShell Windows sur le serveur collecteur"
    },
    "ems": {
      "name": "FortiClient EMS",
      "vendor": "Fortinet",
      "platform": "Poste Windows de diagnostic vers EMS"
    },
    "tufin": {
      "name": "Tufin",
      "vendor": "Tufin",
      "platform": "Shell Linux TOS / poste de diagnostic selon la commande"
    },
    "wifi": {
      "name": "Wi-Fi",
      "vendor": "Microsoft / NetworkManager",
      "platform": "Poste client Wi-Fi Windows ou Linux selon la commande"
    },
    "reseau": {
      "name": "R\u00e9seau",
      "vendor": "Multi-\u00e9diteur",
      "platform": "Poste Windows / Linux de diagnostic"
    },
    "preuves": {
      "name": "Preuves et restitution",
      "vendor": "Microsoft / GNU",
      "platform": "PowerShell Windows ou shell Linux selon la commande"
    },
    "logiciels": {
      "name": "Logiciels",
      "vendor": "Microsoft / Python",
      "platform": "PowerShell Windows / environnement Python local"
    },
    "backup": {
      "name": "Sauvegarde",
      "vendor": "Microsoft / GNU",
      "platform": "PowerShell Windows ou shell Linux selon la commande"
    },
    "backbox": {
      "name": "BackBox",
      "vendor": "BackBox",
      "platform": "Poste Linux de diagnostic vers l'interface BackBox"
    },
    "vision": {
      "name": "Vision One / ZTSA",
      "vendor": "Trend Micro",
      "platform": "Poste Windows de diagnostic vers une application priv\u00e9e"
    },
    "tippingpoint": {
      "name": "TippingPoint",
      "vendor": "Trend Micro",
      "platform": "Poste Windows de diagnostic vers SMS"
    },
    "gophish": {
      "name": "Sensibilisation",
      "vendor": "Gophish",
      "platform": "Shell Linux de l'h\u00f4te Gophish autoris\u00e9"
    }
  },
  "commands": [
    {
      "id": "basic-command-nmap-simple",
      "basicCommandId": "nmap:simple",
      "tech": "nmap",
      "type": "command",
      "title": "Nmap - Scanner les ports TCP courants",
      "content": "nmap -sT --top-ports 100 --reason <HOTE>",
      "description": "Contr\u00f4ler les ports TCP les plus fr\u00e9quents d'un h\u00f4te.",
      "example": "nmap -sT --top-ports 100 --reason 192.0.2.10",
      "vendor": "Nmap",
      "platform": "Terminal du poste de diagnostic",
      "context": "Terminal du poste de diagnostic. Impact : Sonde r\u00e9seau. Sonder uniquement les h\u00f4tes et ports autoris\u00e9s ; un scan produit du trafic et peut d\u00e9clencher des alertes. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nmap",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Nmap - Options courantes",
          "url": "https://nmap.org/book/man-briefoptions.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nmap-ports",
      "basicCommandId": "nmap:ports",
      "tech": "nmap",
      "type": "command",
      "title": "Nmap - V\u00e9rifier des ports pr\u00e9cis",
      "content": "nmap -sT -p 22,80,443,3389 --reason <HOTE>",
      "description": "V\u00e9rifier les services attendus sans parcourir tous les ports.",
      "example": "nmap -sT -p 22,80,443,3389 --reason serveur.example.test",
      "vendor": "Nmap",
      "platform": "Terminal du poste de diagnostic",
      "context": "Terminal du poste de diagnostic. Impact : Sonde r\u00e9seau. Sonder uniquement les h\u00f4tes et ports autoris\u00e9s ; un scan produit du trafic et peut d\u00e9clencher des alertes. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nmap",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Nmap - Options courantes",
          "url": "https://nmap.org/book/man-briefoptions.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nmap-no-ping",
      "basicCommandId": "nmap:no-ping",
      "tech": "nmap",
      "type": "command",
      "title": "Nmap - Tester un h\u00f4te qui filtre le ping",
      "content": "nmap -sT -Pn -p <PORTS> --reason <HOTE>",
      "description": "Sonder les ports choisis sans exiger une r\u00e9ponse de d\u00e9couverte.",
      "example": "nmap -sT -Pn -p 443,8443 --reason 192.0.2.10",
      "vendor": "Nmap",
      "platform": "Terminal du poste de diagnostic",
      "context": "Terminal du poste de diagnostic. Impact : Sonde r\u00e9seau. Sonder uniquement les h\u00f4tes et ports autoris\u00e9s ; un scan produit du trafic et peut d\u00e9clencher des alertes. Cibler un seul h\u00f4te ; -Pn sur un grand r\u00e9seau lance le scan sur toutes les adresses. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nmap",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Nmap - Options courantes",
          "url": "https://nmap.org/book/man-briefoptions.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nmap-discover",
      "basicCommandId": "nmap:discover",
      "tech": "nmap",
      "type": "command",
      "title": "Nmap - Trouver les h\u00f4tes actifs d'un sous-r\u00e9seau",
      "content": "nmap -sn -n <RESEAU_CIDR>",
      "description": "Faire une d\u00e9couverte d'h\u00f4tes sans scan de ports.",
      "example": "nmap -sn -n 192.0.2.0/28",
      "vendor": "Nmap",
      "platform": "Terminal du poste de diagnostic",
      "context": "Terminal du poste de diagnostic. Impact : Sonde r\u00e9seau. Sonder uniquement les h\u00f4tes et ports autoris\u00e9s ; un scan produit du trafic et peut d\u00e9clencher des alertes. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nmap",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Nmap - Options courantes",
          "url": "https://nmap.org/book/man-briefoptions.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nmap-tcp-all",
      "basicCommandId": "nmap:tcp-all",
      "tech": "nmap",
      "type": "command",
      "title": "Nmap - Scanner tous les ports TCP d'un h\u00f4te",
      "content": "nmap -sT -p- --max-rate 100 --reason <HOTE>",
      "description": "Chercher un service sur un port non standard.",
      "example": "nmap -sT -p- --max-rate 100 --reason 192.0.2.10",
      "vendor": "Nmap",
      "platform": "Terminal du poste de diagnostic",
      "context": "Terminal du poste de diagnostic. Impact : Scan prolong\u00e9. Sonder uniquement les h\u00f4tes et ports autoris\u00e9s ; un scan produit du trafic et peut d\u00e9clencher des alertes. 65 535 ports : r\u00e9server ce test \u00e0 une cible et une fen\u00eatre autoris\u00e9es. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nmap",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Nmap - Options courantes",
          "url": "https://nmap.org/book/man-briefoptions.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Scan prolong\u00e9"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nmap-save",
      "basicCommandId": "nmap:save",
      "tech": "nmap",
      "type": "command",
      "title": "Nmap - Enregistrer un scan en texte et XML",
      "content": "nmap -sT -p <PORTS> -oA <NOM_SORTIE> <HOTE>",
      "description": "Conserver les r\u00e9sultats pour comparaison et restitution.",
      "example": "nmap -sT -p 22,443 -oA scan-pilote 192.0.2.10",
      "vendor": "Nmap",
      "platform": "Terminal du poste de diagnostic",
      "context": "Terminal du poste de diagnostic. Impact : Sonde et fichiers locaux. Sonder uniquement les h\u00f4tes et ports autoris\u00e9s ; un scan produit du trafic et peut d\u00e9clencher des alertes. Choisir un nom de sortie libre pour ne pas \u00e9craser un pr\u00e9c\u00e9dent scan. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nmap",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Nmap - Sorties et reprise",
          "url": "https://nmap.org/book/man-output.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde et fichiers locaux"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nmap-file",
      "basicCommandId": "nmap:file",
      "tech": "nmap",
      "type": "command",
      "title": "Nmap - Scanner une liste de cibles valid\u00e9e",
      "content": "nmap -sT -p <PORTS> --max-rate 100 -iL <FICHIER_CIBLES>",
      "description": "Utiliser un inventaire approuv\u00e9 plut\u00f4t qu'une plage implicite.",
      "example": "nmap -sT -p 443 --max-rate 100 -iL cibles-pilotes.txt",
      "vendor": "Nmap",
      "platform": "Terminal du poste de diagnostic",
      "context": "Terminal du poste de diagnostic. Impact : Sonde r\u00e9seau. Sonder uniquement les h\u00f4tes et ports autoris\u00e9s ; un scan produit du trafic et peut d\u00e9clencher des alertes. V\u00e9rifier chaque cible du fichier avant ex\u00e9cution. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nmap",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Nmap - Options courantes",
          "url": "https://nmap.org/book/man-briefoptions.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nmap-iflist",
      "basicCommandId": "nmap:iflist",
      "tech": "nmap",
      "type": "command",
      "title": "Nmap - Lire les interfaces et routes du poste",
      "content": "nmap --iflist",
      "description": "V\u00e9rifier le chemin local utilis\u00e9 par le scanner.",
      "example": "nmap --iflist",
      "vendor": "Nmap",
      "platform": "Terminal du poste de diagnostic",
      "context": "Terminal du poste de diagnostic. Impact : Lecture seule. Sonder uniquement les h\u00f4tes et ports autoris\u00e9s ; un scan produit du trafic et peut d\u00e9clencher des alertes. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nmap",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Nmap - Sorties et reprise",
          "url": "https://nmap.org/book/man-output.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nmap-resume",
      "basicCommandId": "nmap:resume",
      "tech": "nmap",
      "type": "command",
      "title": "Nmap - Reprendre un scan enregistr\u00e9",
      "content": "nmap --resume <FICHIER_NMAP>",
      "description": "Reprendre les param\u00e8tres et le p\u00e9rim\u00e8tre du scan interrompu.",
      "example": "nmap --resume scan-pilote.nmap",
      "vendor": "Nmap",
      "platform": "Terminal du poste de diagnostic",
      "context": "Terminal du poste de diagnostic. Impact : Sonde et fichiers locaux. Sonder uniquement les h\u00f4tes et ports autoris\u00e9s ; un scan produit du trafic et peut d\u00e9clencher des alertes. V\u00e9rifier que l'autorisation et la fen\u00eatre du scan sont toujours valables. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nmap",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Nmap - Sorties et reprise",
          "url": "https://nmap.org/book/man-output.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde et fichiers locaux"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-catalyst-running",
      "basicCommandId": "catalyst:running",
      "tech": "catalyst",
      "type": "command",
      "title": "Cisco IOS - Lire la configuration active",
      "content": "show running-config",
      "description": "Consulter la configuration actuellement appliqu\u00e9e.",
      "example": "show running-config",
      "vendor": "Cisco",
      "platform": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire",
      "context": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire. Impact : Lecture sensible. La configuration peut contenir des secrets. Une modification d'interface peut couper l'acc\u00e8s de gestion. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "catalyst",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Cisco - Configuration IOS-XE",
          "url": "https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-17/configuration_guide/sys_mgmt/b_1717_sys_mgmt_9300_cg.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-catalyst-startup",
      "basicCommandId": "catalyst:startup",
      "tech": "catalyst",
      "type": "command",
      "title": "Cisco IOS - Lire la configuration de d\u00e9marrage",
      "content": "show startup-config",
      "description": "Comparer ce qui sera charg\u00e9 au prochain d\u00e9marrage.",
      "example": "show startup-config",
      "vendor": "Cisco",
      "platform": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire",
      "context": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire. Impact : Lecture sensible. La configuration peut contenir des secrets. Une modification d'interface peut couper l'acc\u00e8s de gestion. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "catalyst",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Cisco - Configuration IOS-XE",
          "url": "https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-17/configuration_guide/sys_mgmt/b_1717_sys_mgmt_9300_cg.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-catalyst-ping",
      "basicCommandId": "catalyst:ping",
      "tech": "catalyst",
      "type": "command",
      "title": "Cisco IOS - Tester la joignabilit\u00e9",
      "content": "ping <IP>",
      "description": "Tester un h\u00f4te depuis le switch ou routeur.",
      "example": "ping 192.0.2.10",
      "vendor": "Cisco",
      "platform": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire",
      "context": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire. Impact : Sonde r\u00e9seau. La configuration peut contenir des secrets. Une modification d'interface peut couper l'acc\u00e8s de gestion. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "catalyst",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Cisco - Configuration IOS-XE",
          "url": "https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-17/configuration_guide/sys_mgmt/b_1717_sys_mgmt_9300_cg.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-catalyst-trace",
      "basicCommandId": "catalyst:trace",
      "tech": "catalyst",
      "type": "command",
      "title": "Cisco IOS - Suivre le chemin IP",
      "content": "traceroute <IP>",
      "description": "Relever les sauts depuis l'\u00e9quipement.",
      "example": "traceroute 192.0.2.10",
      "vendor": "Cisco",
      "platform": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire",
      "context": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire. Impact : Sonde r\u00e9seau. La configuration peut contenir des secrets. Une modification d'interface peut couper l'acc\u00e8s de gestion. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "catalyst",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Cisco - Configuration IOS-XE",
          "url": "https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-17/configuration_guide/sys_mgmt/b_1717_sys_mgmt_9300_cg.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-catalyst-paging",
      "basicCommandId": "catalyst:paging",
      "tech": "catalyst",
      "type": "command",
      "title": "Cisco IOS - D\u00e9sactiver la pagination de cette session",
      "content": "terminal length 0",
      "description": "Collecter une sortie compl\u00e8te sans pause interactive.",
      "example": "terminal length 0",
      "vendor": "Cisco",
      "platform": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire",
      "context": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire. Impact : Session locale. La configuration peut contenir des secrets. Une modification d'interface peut couper l'acc\u00e8s de gestion. Ne modifie pas la configuration de l'\u00e9quipement ; fermer la session ou r\u00e9tablir terminal length 24 ensuite. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "catalyst",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Cisco - Configuration IOS-XE",
          "url": "https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-17/configuration_guide/sys_mgmt/b_1717_sys_mgmt_9300_cg.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Session locale"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-catalyst-vlan-create",
      "basicCommandId": "catalyst:vlan-create",
      "tech": "catalyst",
      "type": "command",
      "title": "Cisco IOS - Cr\u00e9er et nommer un VLAN",
      "content": "configure terminal\nvlan <VLAN_ID>\nname <NOM_VLAN>\nend",
      "description": "D\u00e9clarer un VLAN valid\u00e9 dans le plan r\u00e9seau.",
      "example": "configure terminal\nvlan 120\nname TEST\nend",
      "vendor": "Cisco",
      "platform": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire",
      "context": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire. Impact : Modification de configuration. La configuration peut contenir des secrets. Une modification d'interface peut couper l'acc\u00e8s de gestion. V\u00e9rifier VTP et le plan VLAN ; ce bloc ne sauvegarde pas encore la configuration. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "catalyst",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Cisco - Configuration IOS-XE",
          "url": "https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-17/configuration_guide/sys_mgmt/b_1717_sys_mgmt_9300_cg.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Modification de configuration"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-catalyst-access-port",
      "basicCommandId": "catalyst:access-port",
      "tech": "catalyst",
      "type": "command",
      "title": "Cisco IOS - Affecter un port d'acc\u00e8s \u00e0 un VLAN",
      "content": "configure terminal\ninterface <INTERFACE>\nswitchport mode access\nswitchport access vlan <VLAN_ID>\nend",
      "description": "Configurer un port utilisateur pr\u00e9alablement identifi\u00e9.",
      "example": "configure terminal\ninterface GigabitEthernet1/0/10\nswitchport mode access\nswitchport access vlan 120\nend",
      "vendor": "Cisco",
      "platform": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire",
      "context": "IOS / IOS-XE - EXEC privil\u00e9gi\u00e9 sauf indication contraire. Impact : Modification de configuration. La configuration peut contenir des secrets. Une modification d'interface peut couper l'acc\u00e8s de gestion. Ne pas cibler un uplink, port-channel ou port de gestion ; relever la configuration initiale pour le retour. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "catalyst",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Cisco - Configuration IOS-XE",
          "url": "https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-17/configuration_guide/sys_mgmt/b_1717_sys_mgmt_9300_cg.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Modification de configuration"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nexus-running",
      "basicCommandId": "nexus:running",
      "tech": "nexus",
      "type": "command",
      "title": "Cisco Nexus - Lire la configuration active",
      "content": "show running-config",
      "description": "Consulter la configuration NX-OS.",
      "example": "show running-config",
      "vendor": "Cisco",
      "platform": "NX-OS autonome - pas une CLI ACI",
      "context": "NX-OS autonome - pas une CLI ACI. Impact : Lecture sensible. Conserver un acc\u00e8s de secours et prot\u00e9ger les exports de configuration. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nexus",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Cisco - Commandes NX-OS",
          "url": "https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/103x/command-reference/show/b_n9k_show_commands_103x.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nexus-startup",
      "basicCommandId": "nexus:startup",
      "tech": "nexus",
      "type": "command",
      "title": "Cisco Nexus - Lire la configuration de d\u00e9marrage",
      "content": "show startup-config",
      "description": "Comparer la configuration enregistr\u00e9e \u00e0 l'actif.",
      "example": "show startup-config",
      "vendor": "Cisco",
      "platform": "NX-OS autonome - pas une CLI ACI",
      "context": "NX-OS autonome - pas une CLI ACI. Impact : Lecture sensible. Conserver un acc\u00e8s de secours et prot\u00e9ger les exports de configuration. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nexus",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Cisco - Commandes NX-OS",
          "url": "https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/103x/command-reference/show/b_n9k_show_commands_103x.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nexus-save",
      "basicCommandId": "nexus:save",
      "tech": "nexus",
      "type": "command",
      "title": "Cisco Nexus - Sauvegarder la configuration active",
      "content": "copy running-config startup-config",
      "description": "Conserver les changements valid\u00e9s pour le prochain d\u00e9marrage.",
      "example": "copy running-config startup-config",
      "vendor": "Cisco",
      "platform": "NX-OS autonome - pas une CLI ACI",
      "context": "NX-OS autonome - pas une CLI ACI. Impact : \u00c9criture de configuration. Conserver un acc\u00e8s de secours et prot\u00e9ger les exports de configuration. Ne sauvegarder qu'apr\u00e8s validation du changement. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nexus",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Cisco - Commandes NX-OS",
          "url": "https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/103x/command-reference/show/b_n9k_show_commands_103x.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "\u00c9criture de configuration"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nexus-ipif",
      "basicCommandId": "nexus:ipif",
      "tech": "nexus",
      "type": "command",
      "title": "Cisco Nexus - Lire les interfaces IP",
      "content": "show ip interface brief",
      "description": "V\u00e9rifier adresses et \u00e9tats des interfaces L3.",
      "example": "show ip interface brief",
      "vendor": "Cisco",
      "platform": "NX-OS autonome - pas une CLI ACI",
      "context": "NX-OS autonome - pas une CLI ACI. Impact : Lecture seule. Conserver un acc\u00e8s de secours et prot\u00e9ger les exports de configuration. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nexus",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Cisco - Commandes NX-OS",
          "url": "https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/103x/command-reference/show/b_n9k_show_commands_103x.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nexus-arp",
      "basicCommandId": "nexus:arp",
      "tech": "nexus",
      "type": "command",
      "title": "Cisco Nexus - Lire la table ARP",
      "content": "show ip arp",
      "description": "V\u00e9rifier les voisins IP/MAC appris.",
      "example": "show ip arp",
      "vendor": "Cisco",
      "platform": "NX-OS autonome - pas une CLI ACI",
      "context": "NX-OS autonome - pas une CLI ACI. Impact : Lecture seule. Conserver un acc\u00e8s de secours et prot\u00e9ger les exports de configuration. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nexus",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Cisco - Commandes NX-OS",
          "url": "https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/103x/command-reference/show/b_n9k_show_commands_103x.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nexus-lldp",
      "basicCommandId": "nexus:lldp",
      "tech": "nexus",
      "type": "command",
      "title": "Cisco Nexus - Lire les voisins LLDP",
      "content": "show lldp neighbors detail",
      "description": "Identifier le voisin et le port de raccordement.",
      "example": "show lldp neighbors detail",
      "vendor": "Cisco",
      "platform": "NX-OS autonome - pas une CLI ACI",
      "context": "NX-OS autonome - pas une CLI ACI. Impact : Lecture seule. Conserver un acc\u00e8s de secours et prot\u00e9ger les exports de configuration. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nexus",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Cisco - Commandes NX-OS",
          "url": "https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/103x/command-reference/show/b_n9k_show_commands_103x.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nexus-ping",
      "basicCommandId": "nexus:ping",
      "tech": "nexus",
      "type": "command",
      "title": "Cisco Nexus - Tester la joignabilit\u00e9",
      "content": "ping <IP>",
      "description": "Tester un h\u00f4te depuis le Nexus dans le contexte courant.",
      "example": "ping 192.0.2.10",
      "vendor": "Cisco",
      "platform": "NX-OS autonome - pas une CLI ACI",
      "context": "NX-OS autonome - pas une CLI ACI. Impact : Sonde r\u00e9seau. Conserver un acc\u00e8s de secours et prot\u00e9ger les exports de configuration. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nexus",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Cisco - Commandes NX-OS",
          "url": "https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/103x/command-reference/show/b_n9k_show_commands_103x.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ise-app-status",
      "basicCommandId": "ise:app-status",
      "tech": "ise",
      "type": "command",
      "title": "Cisco ISE - Lire l'\u00e9tat des composants",
      "content": "show application status ise",
      "description": "V\u00e9rifier les composants ISE avant de lire leurs journaux.",
      "example": "show application status ise",
      "vendor": "Cisco",
      "platform": "CLI ADE-OS de l'appliance ISE",
      "context": "CLI ADE-OS de l'appliance ISE. Impact : Lecture seule. Les noms des journaux d\u00e9pendent du r\u00f4le du n\u0153ud ; les logs contiennent des identit\u00e9s. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ise",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Cisco ISE - Commandes de consultation",
          "url": "https://www.cisco.com/c/en/us/td/docs/security/ise/3-4/cli_guide/b_ise_CLI_Reference_Guide_34/b_ise_CLIReferenceGuide_chapter_010.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ise-running",
      "basicCommandId": "ise:running",
      "tech": "ise",
      "type": "command",
      "title": "Cisco ISE - Lire la configuration ADE-OS",
      "content": "show running-config",
      "description": "V\u00e9rifier la configuration syst\u00e8me de l'appliance, pas les policies ISE.",
      "example": "show running-config",
      "vendor": "Cisco",
      "platform": "CLI ADE-OS de l'appliance ISE",
      "context": "CLI ADE-OS de l'appliance ISE. Impact : Lecture sensible. Les noms des journaux d\u00e9pendent du r\u00f4le du n\u0153ud ; les logs contiennent des identit\u00e9s. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ise",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Cisco ISE - Commandes de consultation",
          "url": "https://www.cisco.com/c/en/us/td/docs/security/ise/3-4/cli_guide/b_ise_CLI_Reference_Guide_34/b_ise_CLIReferenceGuide_chapter_010.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ise-interfaces",
      "basicCommandId": "ise:interfaces",
      "tech": "ise",
      "type": "command",
      "title": "Cisco ISE - Lire les interfaces",
      "content": "show interface",
      "description": "V\u00e9rifier les interfaces syst\u00e8me du n\u0153ud.",
      "example": "show interface",
      "vendor": "Cisco",
      "platform": "CLI ADE-OS de l'appliance ISE",
      "context": "CLI ADE-OS de l'appliance ISE. Impact : Lecture seule. Les noms des journaux d\u00e9pendent du r\u00f4le du n\u0153ud ; les logs contiennent des identit\u00e9s. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ise",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Cisco ISE - Commandes de consultation",
          "url": "https://www.cisco.com/c/en/us/td/docs/security/ise/3-4/cli_guide/b_ise_CLI_Reference_Guide_34/b_ise_CLIReferenceGuide_chapter_010.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ise-route",
      "basicCommandId": "ise:route",
      "tech": "ise",
      "type": "command",
      "title": "Cisco ISE - Lire les routes",
      "content": "show ip route",
      "description": "Contr\u00f4ler les routes IP de l'appliance.",
      "example": "show ip route",
      "vendor": "Cisco",
      "platform": "CLI ADE-OS de l'appliance ISE",
      "context": "CLI ADE-OS de l'appliance ISE. Impact : Lecture seule. Les noms des journaux d\u00e9pendent du r\u00f4le du n\u0153ud ; les logs contiennent des identit\u00e9s. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ise",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Cisco ISE - Commandes de consultation",
          "url": "https://www.cisco.com/c/en/us/td/docs/security/ise/3-4/cli_guide/b_ise_CLI_Reference_Guide_34/b_ise_CLIReferenceGuide_chapter_010.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-dna-device",
      "basicCommandId": "dna:device",
      "tech": "dna",
      "type": "command",
      "title": "Catalyst Center - Lire un \u00e9quipement par son identifiant",
      "content": "curl --fail --silent --show-error --header \"X-Auth-Token: <TOKEN>\" \"https://<CATALYST_CENTER>/dna/intent/api/v1/network-device/<DEVICE_ID>\"",
      "description": "Lire l'\u00e9tat d'un seul \u00e9quipement connu.",
      "example": "Remplacer DEVICE_ID par l'identifiant de l'inventaire et utiliser un jeton de lecture autoris\u00e9.",
      "vendor": "Cisco",
      "platform": "curl depuis un poste API autoris\u00e9",
      "context": "curl depuis un poste API autoris\u00e9. Impact : Lecture API sensible. Jeton obtenu via l'authentification existante ; ne pas publier les jetons ni contourner TLS. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "dna",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Catalyst Center - Network devices API",
          "url": "https://developer.cisco.com/docs/dna-center/get-network-device-by-id/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture API sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-fortigate-ping",
      "basicCommandId": "fortigate:ping",
      "tech": "fortigate",
      "type": "command",
      "title": "FortiGate - Tester la joignabilit\u00e9",
      "content": "execute ping <IP>",
      "description": "Tester un h\u00f4te depuis le FortiGate.",
      "example": "execute ping 192.0.2.10",
      "vendor": "Fortinet",
      "platform": "CLI FortiOS - dans le VDOM appropri\u00e9",
      "context": "CLI FortiOS - dans le VDOM appropri\u00e9. Impact : Sonde r\u00e9seau. Les interfaces et routes doivent \u00eatre lues dans le bon VDOM ; la configuration est sensible. V\u00e9rifier les options de ping et le VDOM actif. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "fortigate",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "FortiGate - Ping et traceroute",
          "url": "https://docs.fortinet.com/document/fortigate/7.4.4/administration-guide/982816/running-ping-and-traceroute"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-fortigate-trace",
      "basicCommandId": "fortigate:trace",
      "tech": "fortigate",
      "type": "command",
      "title": "FortiGate - Suivre le chemin IP",
      "content": "execute traceroute <IP>",
      "description": "Relever les sauts depuis le VDOM courant.",
      "example": "execute traceroute 192.0.2.10",
      "vendor": "Fortinet",
      "platform": "CLI FortiOS - dans le VDOM appropri\u00e9",
      "context": "CLI FortiOS - dans le VDOM appropri\u00e9. Impact : Sonde r\u00e9seau. Les interfaces et routes doivent \u00eatre lues dans le bon VDOM ; la configuration est sensible. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "fortigate",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "FortiGate - Ping et traceroute",
          "url": "https://docs.fortinet.com/document/fortigate/7.4.4/administration-guide/982816/running-ping-and-traceroute"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-fortigate-ping-settings",
      "basicCommandId": "fortigate:ping-settings",
      "tech": "fortigate",
      "type": "command",
      "title": "FortiGate - Lire les options du ping",
      "content": "execute ping-options view-settings",
      "description": "Contr\u00f4ler source et param\u00e8tres du test.",
      "example": "execute ping-options view-settings",
      "vendor": "Fortinet",
      "platform": "CLI FortiOS - dans le VDOM appropri\u00e9",
      "context": "CLI FortiOS - dans le VDOM appropri\u00e9. Impact : Lecture seule. Les interfaces et routes doivent \u00eatre lues dans le bon VDOM ; la configuration est sensible. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "fortigate",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "FortiGate - Ping et traceroute",
          "url": "https://docs.fortinet.com/document/fortigate/7.4.4/administration-guide/982816/running-ping-and-traceroute"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-fortigate-interfaces",
      "basicCommandId": "fortigate:interfaces",
      "tech": "fortigate",
      "type": "command",
      "title": "FortiGate - Lire la configuration des interfaces",
      "content": "show system interface",
      "description": "Consulter adresses, VLAN et acc\u00e8s de gestion.",
      "example": "show system interface",
      "vendor": "Fortinet",
      "platform": "CLI FortiOS - dans le VDOM appropri\u00e9",
      "context": "CLI FortiOS - dans le VDOM appropri\u00e9. Impact : Lecture sensible. Les interfaces et routes doivent \u00eatre lues dans le bon VDOM ; la configuration est sensible. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "fortigate",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "FortiOS - CLI Reference",
          "url": "https://docs.fortinet.com/document/fortigate/7.4.8/cli-reference/84566/fortios-cli-reference"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-fortigate-policies",
      "basicCommandId": "fortigate:policies",
      "tech": "fortigate",
      "type": "command",
      "title": "FortiGate - Lire les policies firewall",
      "content": "show firewall policy",
      "description": "V\u00e9rifier sens, interfaces, objets et actions configur\u00e9s.",
      "example": "show firewall policy",
      "vendor": "Fortinet",
      "platform": "CLI FortiOS - dans le VDOM appropri\u00e9",
      "context": "CLI FortiOS - dans le VDOM appropri\u00e9. Impact : Lecture sensible. Les interfaces et routes doivent \u00eatre lues dans le bon VDOM ; la configuration est sensible. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "fortigate",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "FortiOS - CLI Reference",
          "url": "https://docs.fortinet.com/document/fortigate/7.4.8/cli-reference/84566/fortios-cli-reference"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-fortigate-static-routes",
      "basicCommandId": "fortigate:static-routes",
      "tech": "fortigate",
      "type": "command",
      "title": "FortiGate - Lire les routes statiques configur\u00e9es",
      "content": "show router static",
      "description": "Distinguer les routes configur\u00e9es de la table de routage effective.",
      "example": "show router static",
      "vendor": "Fortinet",
      "platform": "CLI FortiOS - dans le VDOM appropri\u00e9",
      "context": "CLI FortiOS - dans le VDOM appropri\u00e9. Impact : Lecture seule. Les interfaces et routes doivent \u00eatre lues dans le bon VDOM ; la configuration est sensible. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "fortigate",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "FortiOS - CLI Reference",
          "url": "https://docs.fortinet.com/document/fortigate/7.4.8/cli-reference/84566/fortios-cli-reference"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-fortigate-arp",
      "basicCommandId": "fortigate:arp",
      "tech": "fortigate",
      "type": "command",
      "title": "FortiGate - Lire la table ARP",
      "content": "get system arp",
      "description": "V\u00e9rifier les voisins IP/MAC connus du firewall.",
      "example": "get system arp",
      "vendor": "Fortinet",
      "platform": "CLI FortiOS - dans le VDOM appropri\u00e9",
      "context": "CLI FortiOS - dans le VDOM appropri\u00e9. Impact : Lecture seule. Les interfaces et routes doivent \u00eatre lues dans le bon VDOM ; la configuration est sensible. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "fortigate",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "FortiOS - CLI Reference",
          "url": "https://docs.fortinet.com/document/fortigate/7.4.8/cli-reference/84566/fortios-cli-reference"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-checkpoint-interfaces",
      "basicCommandId": "checkpoint:interfaces",
      "tech": "checkpoint",
      "type": "command",
      "title": "Check Point Gaia - Lire les interfaces",
      "content": "show interfaces all",
      "description": "Consulter les interfaces dans Gaia Clish.",
      "example": "show interfaces all",
      "vendor": "Check Point",
      "platform": "Gaia Clish ou Expert selon la commande",
      "context": "Gaia Clish ou Expert selon la commande. Impact : Lecture seule. Ne pas confondre Gaia Clish et le shell Expert. Les droits administrateur sont requis pour certaines lectures. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "checkpoint",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Check Point - Guide Gaia Clish et Expert",
          "url": "https://sc1.checkpoint.com/documents/R81.20/WebAdminGuides/EN/CP_R81.20_Gaia_AdminGuide/CP_R81.20_Gaia_AdminGuide.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-checkpoint-routes",
      "basicCommandId": "checkpoint:routes",
      "tech": "checkpoint",
      "type": "command",
      "title": "Check Point Gaia - Lire la table de routage",
      "content": "show route all",
      "description": "Afficher les routes dans Gaia Clish.",
      "example": "show route all",
      "vendor": "Check Point",
      "platform": "Gaia Clish ou Expert selon la commande",
      "context": "Gaia Clish ou Expert selon la commande. Impact : Lecture seule. Ne pas confondre Gaia Clish et le shell Expert. Les droits administrateur sont requis pour certaines lectures. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "checkpoint",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Check Point - Guide Gaia Clish et Expert",
          "url": "https://sc1.checkpoint.com/documents/R81.20/WebAdminGuides/EN/CP_R81.20_Gaia_AdminGuide/CP_R81.20_Gaia_AdminGuide.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-checkpoint-dns",
      "basicCommandId": "checkpoint:dns",
      "tech": "checkpoint",
      "type": "command",
      "title": "Check Point Gaia - Lire les DNS configur\u00e9s",
      "content": "show dns primary\nshow dns secondary\nshow dns tertiary",
      "description": "V\u00e9rifier les serveurs DNS de l'appliance dans Clish.",
      "example": "show dns primary\nshow dns secondary\nshow dns tertiary",
      "vendor": "Check Point",
      "platform": "Gaia Clish ou Expert selon la commande",
      "context": "Gaia Clish ou Expert selon la commande. Impact : Lecture seule. Ne pas confondre Gaia Clish et le shell Expert. Les droits administrateur sont requis pour certaines lectures. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "checkpoint",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Check Point - DNS Gaia Clish",
          "url": "https://sc1.checkpoint.com/documents/R81.20/WebAdminGuides/EN/CP_R81.20_Gaia_AdminGuide/Content/Topics-GAG/Hosts-and-DNS-DNS.htm"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-checkpoint-ping",
      "basicCommandId": "checkpoint:ping",
      "tech": "checkpoint",
      "type": "command",
      "title": "Check Point Expert - Tester la joignabilit\u00e9",
      "content": "ping -c 4 <IP>",
      "description": "Faire quatre sondes depuis le shell Expert autoris\u00e9.",
      "example": "ping -c 4 192.0.2.10",
      "vendor": "Check Point",
      "platform": "Gaia Clish ou Expert selon la commande",
      "context": "Gaia Clish ou Expert selon la commande. Impact : Sonde r\u00e9seau. Ne pas confondre Gaia Clish et le shell Expert. Les droits administrateur sont requis pour certaines lectures. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "checkpoint",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "iputils - Manuel ping",
          "url": "https://github.com/iputils/iputils/blob/master/doc/ping.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-checkpoint-disk",
      "basicCommandId": "checkpoint:disk",
      "tech": "checkpoint",
      "type": "command",
      "title": "Check Point Expert - Lire l'espace disque",
      "content": "df -h",
      "description": "Rep\u00e9rer une partition satur\u00e9e dans le shell Expert.",
      "example": "df -h",
      "vendor": "Check Point",
      "platform": "Gaia Clish ou Expert selon la commande",
      "context": "Gaia Clish ou Expert selon la commande. Impact : Lecture seule. Ne pas confondre Gaia Clish et le shell Expert. Les droits administrateur sont requis pour certaines lectures. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "checkpoint",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "GNU - Outils de base",
          "url": "https://www.gnu.org/software/coreutils/manual/coreutils.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-stormshield-interfaces",
      "basicCommandId": "stormshield:interfaces",
      "tech": "stormshield",
      "type": "command",
      "title": "Stormshield - Lire l'\u00e9tat des interfaces",
      "content": "MONITOR INTERFACE",
      "description": "Lire les compteurs et \u00e9tats des interfaces SNS.",
      "example": "MONITOR INTERFACE",
      "vendor": "Stormshield",
      "platform": "CLI Serverd SNS - pas le shell SSH",
      "context": "CLI Serverd SNS - pas le shell SSH. Impact : Lecture seule. Compte avec droit log_read ; les commandes MONITOR ne doivent pas \u00eatre lanc\u00e9es directement dans un shell Unix. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "stormshield",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Stormshield - CLI et supervision",
          "url": "https://documentation.stormshield.eu/SNS/v4/en/Content/User_Configuration_Manual_SNS_v4/SNMP_Agent/MIBS_and_traps_SNMP.htm"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-stormshield-routes",
      "basicCommandId": "stormshield:routes",
      "tech": "stormshield",
      "type": "command",
      "title": "Stormshield - Lire les routes et passerelles",
      "content": "MONITOR ROUTE",
      "description": "Contr\u00f4ler les routes et la sant\u00e9 des passerelles.",
      "example": "MONITOR ROUTE",
      "vendor": "Stormshield",
      "platform": "CLI Serverd SNS - pas le shell SSH",
      "context": "CLI Serverd SNS - pas le shell SSH. Impact : Lecture seule. Compte avec droit log_read ; les commandes MONITOR ne doivent pas \u00eatre lanc\u00e9es directement dans un shell Unix. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "stormshield",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Stormshield - CLI et supervision",
          "url": "https://documentation.stormshield.eu/SNS/v4/en/Content/User_Configuration_Manual_SNS_v4/SNMP_Agent/MIBS_and_traps_SNMP.htm"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-stormshield-policies",
      "basicCommandId": "stormshield:policies",
      "tech": "stormshield",
      "type": "command",
      "title": "Stormshield - Lire la policy active",
      "content": "MONITOR POLICY",
      "description": "V\u00e9rifier les informations de la politique active.",
      "example": "MONITOR POLICY",
      "vendor": "Stormshield",
      "platform": "CLI Serverd SNS - pas le shell SSH",
      "context": "CLI Serverd SNS - pas le shell SSH. Impact : Lecture seule. Compte avec droit log_read ; les commandes MONITOR ne doivent pas \u00eatre lanc\u00e9es directement dans un shell Unix. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "stormshield",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Stormshield - CLI et supervision",
          "url": "https://documentation.stormshield.eu/SNS/v4/en/Content/User_Configuration_Manual_SNS_v4/SNMP_Agent/MIBS_and_traps_SNMP.htm"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-stormshield-users",
      "basicCommandId": "stormshield:users",
      "tech": "stormshield",
      "type": "command",
      "title": "Stormshield - Lire les utilisateurs authentifi\u00e9s",
      "content": "MONITOR USER",
      "description": "Consulter les identit\u00e9s actives du firewall.",
      "example": "MONITOR USER",
      "vendor": "Stormshield",
      "platform": "CLI Serverd SNS - pas le shell SSH",
      "context": "CLI Serverd SNS - pas le shell SSH. Impact : Lecture sensible. Compte avec droit log_read ; les commandes MONITOR ne doivent pas \u00eatre lanc\u00e9es directement dans un shell Unix. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "stormshield",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Stormshield - CLI et supervision",
          "url": "https://documentation.stormshield.eu/SNS/v4/en/Content/User_Configuration_Manual_SNS_v4/SNMP_Agent/MIBS_and_traps_SNMP.htm"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-stormshield-sa",
      "basicCommandId": "stormshield:sa",
      "tech": "stormshield",
      "type": "command",
      "title": "Stormshield - Lire les associations IPsec",
      "content": "MONITOR GETSA",
      "description": "Consulter les associations de s\u00e9curit\u00e9 VPN.",
      "example": "MONITOR GETSA",
      "vendor": "Stormshield",
      "platform": "CLI Serverd SNS - pas le shell SSH",
      "context": "CLI Serverd SNS - pas le shell SSH. Impact : Lecture seule. Compte avec droit log_read ; les commandes MONITOR ne doivent pas \u00eatre lanc\u00e9es directement dans un shell Unix. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "stormshield",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Stormshield - CLI et supervision",
          "url": "https://documentation.stormshield.eu/SNS/v4/en/Content/User_Configuration_Manual_SNS_v4/SNMP_Agent/MIBS_and_traps_SNMP.htm"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-juniper-config",
      "basicCommandId": "juniper:config",
      "tech": "juniper",
      "type": "command",
      "title": "Juniper - Lire la configuration en commandes set",
      "content": "show configuration | display set",
      "description": "Afficher la configuration active sous une forme facilement comparable.",
      "example": "show configuration | display set",
      "vendor": "Juniper",
      "platform": "Junos - mode op\u00e9rationnel sauf indication contraire",
      "context": "Junos - mode op\u00e9rationnel sauf indication contraire. Impact : Lecture sensible. Les commandes de configuration sont \u00e0 lancer dans une session autoris\u00e9e avec retour arri\u00e8re pr\u00e9vu. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "juniper",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Juniper - CLI Junos",
          "url": "https://www.juniper.net/documentation/us/en/software/junos/cli/cli.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-juniper-routes",
      "basicCommandId": "juniper:routes",
      "tech": "juniper",
      "type": "command",
      "title": "Juniper - Lire les routes actives",
      "content": "show route",
      "description": "Afficher la table de routage courante.",
      "example": "show route",
      "vendor": "Juniper",
      "platform": "Junos - mode op\u00e9rationnel sauf indication contraire",
      "context": "Junos - mode op\u00e9rationnel sauf indication contraire. Impact : Lecture seule. Les commandes de configuration sont \u00e0 lancer dans une session autoris\u00e9e avec retour arri\u00e8re pr\u00e9vu. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "juniper",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Juniper - CLI Junos",
          "url": "https://www.juniper.net/documentation/us/en/software/junos/cli/cli.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-juniper-logs",
      "basicCommandId": "juniper:logs",
      "tech": "juniper",
      "type": "command",
      "title": "Juniper - Lire les derniers messages syst\u00e8me",
      "content": "show log messages | last 50",
      "description": "Examiner une fen\u00eatre courte de logs.",
      "example": "show log messages | last 50",
      "vendor": "Juniper",
      "platform": "Junos - mode op\u00e9rationnel sauf indication contraire",
      "context": "Junos - mode op\u00e9rationnel sauf indication contraire. Impact : Lecture seule. Les commandes de configuration sont \u00e0 lancer dans une session autoris\u00e9e avec retour arri\u00e8re pr\u00e9vu. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "juniper",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Juniper - CLI Junos",
          "url": "https://www.juniper.net/documentation/us/en/software/junos/cli/cli.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-juniper-ping",
      "basicCommandId": "juniper:ping",
      "tech": "juniper",
      "type": "command",
      "title": "Juniper - Tester la joignabilit\u00e9",
      "content": "ping <IP> count 5",
      "description": "Limiter le ping \u00e0 cinq paquets.",
      "example": "ping 192.0.2.10 count 5",
      "vendor": "Juniper",
      "platform": "Junos - mode op\u00e9rationnel sauf indication contraire",
      "context": "Junos - mode op\u00e9rationnel sauf indication contraire. Impact : Sonde r\u00e9seau. Les commandes de configuration sont \u00e0 lancer dans une session autoris\u00e9e avec retour arri\u00e8re pr\u00e9vu. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "juniper",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Juniper - CLI Junos",
          "url": "https://www.juniper.net/documentation/us/en/software/junos/cli/cli.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-juniper-compare",
      "basicCommandId": "juniper:compare",
      "tech": "juniper",
      "type": "command",
      "title": "Juniper - Comparer la configuration candidate",
      "content": "show | compare",
      "description": "Examiner les changements avant un commit.",
      "example": "show | compare",
      "vendor": "Juniper",
      "platform": "Junos - mode op\u00e9rationnel sauf indication contraire",
      "context": "Junos - mode op\u00e9rationnel sauf indication contraire. Impact : Lecture sensible. Les commandes de configuration sont \u00e0 lancer dans une session autoris\u00e9e avec retour arri\u00e8re pr\u00e9vu. Mode configuration ; ce n'est pas show configuration en mode op\u00e9rationnel. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "juniper",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Juniper - CLI Junos",
          "url": "https://www.juniper.net/documentation/us/en/software/junos/cli/cli.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-juniper-check",
      "basicCommandId": "juniper:check",
      "tech": "juniper",
      "type": "command",
      "title": "Juniper - Valider la configuration candidate",
      "content": "commit check",
      "description": "V\u00e9rifier la syntaxe et coh\u00e9rence avant application.",
      "example": "commit check",
      "vendor": "Juniper",
      "platform": "Junos - mode op\u00e9rationnel sauf indication contraire",
      "context": "Junos - mode op\u00e9rationnel sauf indication contraire. Impact : Validation de configuration. Les commandes de configuration sont \u00e0 lancer dans une session autoris\u00e9e avec retour arri\u00e8re pr\u00e9vu. Mode configuration. Si un commit confirmed est en attente, commit check peut le confirmer : ne pas l'utiliser comme simple lecture dans ce cas. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "juniper",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Juniper - CLI Junos",
          "url": "https://www.juniper.net/documentation/us/en/software/junos/cli/cli.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Validation de configuration"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-juniper-confirmed",
      "basicCommandId": "juniper:confirmed",
      "tech": "juniper",
      "type": "command",
      "title": "Juniper - Appliquer avec retour automatique",
      "content": "commit confirmed 5",
      "description": "Appliquer temporairement une configuration avec retour pr\u00e9vu apr\u00e8s cinq minutes.",
      "example": "commit confirmed 5",
      "vendor": "Juniper",
      "platform": "Junos - mode op\u00e9rationnel sauf indication contraire",
      "context": "Junos - mode op\u00e9rationnel sauf indication contraire. Impact : Modification de configuration. Les commandes de configuration sont \u00e0 lancer dans une session autoris\u00e9e avec retour arri\u00e8re pr\u00e9vu. Mode configuration. Tester l'acc\u00e8s et les services, puis confirmer par commit dans le d\u00e9lai si tout fonctionne. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "juniper",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Juniper - CLI Junos",
          "url": "https://www.juniper.net/documentation/us/en/software/junos/cli/cli.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Modification de configuration"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-juniper-history",
      "basicCommandId": "juniper:history",
      "tech": "juniper",
      "type": "command",
      "title": "Juniper - Lire l'historique des commits",
      "content": "show system commit",
      "description": "V\u00e9rifier les changements r\u00e9cents et un retour automatique en attente.",
      "example": "show system commit",
      "vendor": "Juniper",
      "platform": "Junos - mode op\u00e9rationnel sauf indication contraire",
      "context": "Junos - mode op\u00e9rationnel sauf indication contraire. Impact : Lecture seule. Les commandes de configuration sont \u00e0 lancer dans une session autoris\u00e9e avec retour arri\u00e8re pr\u00e9vu. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "juniper",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Juniper - CLI Junos",
          "url": "https://www.juniper.net/documentation/us/en/software/junos/cli/cli.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-aruba-interfaces",
      "basicCommandId": "aruba:interfaces",
      "tech": "aruba",
      "type": "command",
      "title": "ArubaOS - Lire les interfaces",
      "content": "show interface",
      "description": "Lire l'\u00e9tat des interfaces du contr\u00f4leur.",
      "example": "show interface",
      "vendor": "HPE Aruba",
      "platform": "Contr\u00f4leur ArubaOS 8 - pas Aruba Central / AOS 10",
      "context": "Contr\u00f4leur ArubaOS 8 - pas Aruba Central / AOS 10. Impact : Lecture seule. Les commandes Instant et contr\u00f4leur ne sont pas interchangeables. Les tables clients sont sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "aruba",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "ArubaOS - CLI Reference",
          "url": "https://arubanetworking.hpe.com/techdocs/ArubaOS-8.x-Books/ArubaOS-8.x-CLI-Reference-Guide.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-aruba-routes",
      "basicCommandId": "aruba:routes",
      "tech": "aruba",
      "type": "command",
      "title": "ArubaOS - Lire les routes IP",
      "content": "show ip route",
      "description": "V\u00e9rifier le chemin depuis le contr\u00f4leur.",
      "example": "show ip route",
      "vendor": "HPE Aruba",
      "platform": "Contr\u00f4leur ArubaOS 8 - pas Aruba Central / AOS 10",
      "context": "Contr\u00f4leur ArubaOS 8 - pas Aruba Central / AOS 10. Impact : Lecture seule. Les commandes Instant et contr\u00f4leur ne sont pas interchangeables. Les tables clients sont sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "aruba",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "ArubaOS - CLI Reference",
          "url": "https://arubanetworking.hpe.com/techdocs/ArubaOS-8.x-Books/ArubaOS-8.x-CLI-Reference-Guide.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-aruba-ssid",
      "basicCommandId": "aruba:ssid",
      "tech": "aruba",
      "type": "command",
      "title": "ArubaOS - Lister les profils SSID",
      "content": "show wlan ssid-profile",
      "description": "Retrouver les profils SSID d\u00e9finis.",
      "example": "show wlan ssid-profile",
      "vendor": "HPE Aruba",
      "platform": "Contr\u00f4leur ArubaOS 8 - pas Aruba Central / AOS 10",
      "context": "Contr\u00f4leur ArubaOS 8 - pas Aruba Central / AOS 10. Impact : Lecture seule. Les commandes Instant et contr\u00f4leur ne sont pas interchangeables. Les tables clients sont sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "aruba",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "ArubaOS - CLI Reference",
          "url": "https://arubanetworking.hpe.com/techdocs/ArubaOS-8.x-Books/ArubaOS-8.x-CLI-Reference-Guide.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-aruba-ap-radio",
      "basicCommandId": "aruba:ap-radio",
      "tech": "aruba",
      "type": "command",
      "title": "ArubaOS - Lire les radios d'un AP",
      "content": "show ap radio-summary ap-name <NOM_AP>",
      "description": "Contr\u00f4ler les radios d'un AP choisi.",
      "example": "show ap radio-summary ap-name AP-TEST",
      "vendor": "HPE Aruba",
      "platform": "Contr\u00f4leur ArubaOS 8 - pas Aruba Central / AOS 10",
      "context": "Contr\u00f4leur ArubaOS 8 - pas Aruba Central / AOS 10. Impact : Lecture seule. Les commandes Instant et contr\u00f4leur ne sont pas interchangeables. Les tables clients sont sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "aruba",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "ArubaOS - CLI Reference",
          "url": "https://arubanetworking.hpe.com/techdocs/ArubaOS-8.x-Books/ArubaOS-8.x-CLI-Reference-Guide.pdf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-f5-nodes",
      "basicCommandId": "f5:nodes",
      "tech": "f5",
      "type": "command",
      "title": "F5 - Lire l'\u00e9tat des nodes",
      "content": "tmsh show ltm node",
      "description": "Contr\u00f4ler les serveurs d\u00e9clar\u00e9s derri\u00e8re les pools.",
      "example": "tmsh show ltm node",
      "vendor": "F5",
      "platform": "Bash BIG-IP avec tmsh - bonne partition",
      "context": "Bash BIG-IP avec tmsh - bonne partition. Impact : Lecture seule. Les objets peuvent n\u00e9cessiter un chemin /Partition/Nom ; prot\u00e9ger les sorties de configuration. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "f5",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "F5 - tmsh Reference",
          "url": "https://clouddocs.f5.com/cli/tmsh-reference/latest/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-f5-interfaces",
      "basicCommandId": "f5:interfaces",
      "tech": "f5",
      "type": "command",
      "title": "F5 - Lire les interfaces",
      "content": "tmsh show net interface",
      "description": "Lire \u00e9tat et compteurs des interfaces.",
      "example": "tmsh show net interface",
      "vendor": "F5",
      "platform": "Bash BIG-IP avec tmsh - bonne partition",
      "context": "Bash BIG-IP avec tmsh - bonne partition. Impact : Lecture seule. Les objets peuvent n\u00e9cessiter un chemin /Partition/Nom ; prot\u00e9ger les sorties de configuration. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "f5",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "F5 - tmsh Reference",
          "url": "https://clouddocs.f5.com/cli/tmsh-reference/latest/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-f5-selfip",
      "basicCommandId": "f5:selfip",
      "tech": "f5",
      "type": "command",
      "title": "F5 - Lire les self IP",
      "content": "tmsh list net self",
      "description": "V\u00e9rifier les adresses propres au BIG-IP.",
      "example": "tmsh list net self",
      "vendor": "F5",
      "platform": "Bash BIG-IP avec tmsh - bonne partition",
      "context": "Bash BIG-IP avec tmsh - bonne partition. Impact : Lecture seule. Les objets peuvent n\u00e9cessiter un chemin /Partition/Nom ; prot\u00e9ger les sorties de configuration. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "f5",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "F5 - tmsh Reference",
          "url": "https://clouddocs.f5.com/cli/tmsh-reference/latest/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-f5-virtual-config",
      "basicCommandId": "f5:virtual-config",
      "tech": "f5",
      "type": "command",
      "title": "F5 - Lire la configuration d'un virtual server",
      "content": "tmsh list ltm virtual <VIRTUAL_SERVER>",
      "description": "Consulter destination, profils et pool de l'objet cibl\u00e9.",
      "example": "tmsh list ltm virtual /Common/vs-test",
      "vendor": "F5",
      "platform": "Bash BIG-IP avec tmsh - bonne partition",
      "context": "Bash BIG-IP avec tmsh - bonne partition. Impact : Lecture sensible. Les objets peuvent n\u00e9cessiter un chemin /Partition/Nom ; prot\u00e9ger les sorties de configuration. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "f5",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "F5 - tmsh Reference",
          "url": "https://clouddocs.f5.com/cli/tmsh-reference/latest/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-f5-pool-config",
      "basicCommandId": "f5:pool-config",
      "tech": "f5",
      "type": "command",
      "title": "F5 - Lire la configuration d'un pool",
      "content": "tmsh list ltm pool <POOL>",
      "description": "V\u00e9rifier les membres et monitors associ\u00e9s.",
      "example": "tmsh list ltm pool /Common/pool-test",
      "vendor": "F5",
      "platform": "Bash BIG-IP avec tmsh - bonne partition",
      "context": "Bash BIG-IP avec tmsh - bonne partition. Impact : Lecture sensible. Les objets peuvent n\u00e9cessiter un chemin /Partition/Nom ; prot\u00e9ger les sorties de configuration. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "f5",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "F5 - tmsh Reference",
          "url": "https://clouddocs.f5.com/cli/tmsh-reference/latest/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-fortiweb-backends",
      "basicCommandId": "fortiweb:backends",
      "tech": "fortiweb",
      "type": "command",
      "title": "FortiWeb - Lire la sant\u00e9 des backends d'une policy",
      "content": "diagnose policy pserver list \"<POLICY>\"",
      "description": "Consulter les \u00e9tats des serveurs prot\u00e9g\u00e9s.",
      "example": "diagnose policy pserver list \"POLICY-TEST\"",
      "vendor": "Fortinet",
      "platform": "CLI FortiWeb",
      "context": "CLI FortiWeb. Impact : Lecture seule. Utiliser le nom exact de la server policy. Une lecture globale de configuration peut contenir des secrets. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "fortiweb",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "FortiWeb - Diagnostic des policies",
          "url": "https://docs.fortinet.com/document/fortiweb/7.2.9/cli-reference/778665/policy"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-fortiweb-sessions",
      "basicCommandId": "fortiweb:sessions",
      "tech": "fortiweb",
      "type": "command",
      "title": "FortiWeb - Lire les sessions d'une policy",
      "content": "diagnose policy session list \"<POLICY>\"",
      "description": "Examiner les connexions de la policy choisie.",
      "example": "diagnose policy session list \"POLICY-TEST\"",
      "vendor": "Fortinet",
      "platform": "CLI FortiWeb",
      "context": "CLI FortiWeb. Impact : Lecture sensible. Utiliser le nom exact de la server policy. Une lecture globale de configuration peut contenir des secrets. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "fortiweb",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "FortiWeb - Diagnostic des policies",
          "url": "https://docs.fortinet.com/document/fortiweb/7.2.9/cli-reference/778665/policy"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-fortiweb-traffic",
      "basicCommandId": "fortiweb:traffic",
      "tech": "fortiweb",
      "type": "command",
      "title": "FortiWeb - Lire les compteurs de trafic d'une policy",
      "content": "diagnose policy traffic list \"<POLICY>\"",
      "description": "Contr\u00f4ler l'activit\u00e9 de la policy.",
      "example": "diagnose policy traffic list \"POLICY-TEST\"",
      "vendor": "Fortinet",
      "platform": "CLI FortiWeb",
      "context": "CLI FortiWeb. Impact : Lecture seule. Utiliser le nom exact de la server policy. Une lecture globale de configuration peut contenir des secrets. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "fortiweb",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "FortiWeb - Diagnostic des policies",
          "url": "https://docs.fortinet.com/document/fortiweb/7.2.9/cli-reference/778665/policy"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-pfsense-interfaces",
      "basicCommandId": "pfsense:interfaces",
      "tech": "pfsense",
      "type": "command",
      "title": "pfSense - Lire les interfaces du firewall",
      "content": "ifconfig",
      "description": "Consulter adresses et \u00e9tat des interfaces FreeBSD.",
      "example": "ifconfig",
      "vendor": "Netgate",
      "platform": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9",
      "context": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9. Impact : Lecture seule. Les r\u00e8gles effectives incluent celles g\u00e9n\u00e9r\u00e9es par pfSense ; ne pas utiliser pfctl pour modifier la configuration g\u00e9r\u00e9e par l'interface. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "pfsense",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "FreeBSD - netstat",
          "url": "https://man.freebsd.org/cgi/man.cgi?query=netstat&sektion=1"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-pfsense-routes",
      "basicCommandId": "pfsense:routes",
      "tech": "pfsense",
      "type": "command",
      "title": "pfSense - Lire les routes IPv4",
      "content": "netstat -rn -f inet",
      "description": "Afficher les routes num\u00e9riques sans requ\u00eate DNS.",
      "example": "netstat -rn -f inet",
      "vendor": "Netgate",
      "platform": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9",
      "context": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9. Impact : Lecture seule. Les r\u00e8gles effectives incluent celles g\u00e9n\u00e9r\u00e9es par pfSense ; ne pas utiliser pfctl pour modifier la configuration g\u00e9r\u00e9e par l'interface. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "pfsense",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "FreeBSD - netstat",
          "url": "https://man.freebsd.org/cgi/man.cgi?query=netstat&sektion=1"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-pfsense-rules",
      "basicCommandId": "pfsense:rules",
      "tech": "pfsense",
      "type": "command",
      "title": "pfSense - Lire les r\u00e8gles PF effectives",
      "content": "pfctl -sr",
      "description": "Consulter les r\u00e8gles de filtrage charg\u00e9es.",
      "example": "pfctl -sr",
      "vendor": "Netgate",
      "platform": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9",
      "context": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9. Impact : Lecture seule. Les r\u00e8gles effectives incluent celles g\u00e9n\u00e9r\u00e9es par pfSense ; ne pas utiliser pfctl pour modifier la configuration g\u00e9r\u00e9e par l'interface. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "pfsense",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "pfSense - Ruleset PF",
          "url": "https://docs.netgate.com/pfsense/en/latest/firewall/pf-ruleset.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-pfsense-nat",
      "basicCommandId": "pfsense:nat",
      "tech": "pfsense",
      "type": "command",
      "title": "pfSense - Lire les r\u00e8gles NAT effectives",
      "content": "pfctl -sn",
      "description": "Consulter les traductions charg\u00e9es dans PF.",
      "example": "pfctl -sn",
      "vendor": "Netgate",
      "platform": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9",
      "context": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9. Impact : Lecture seule. Les r\u00e8gles effectives incluent celles g\u00e9n\u00e9r\u00e9es par pfSense ; ne pas utiliser pfctl pour modifier la configuration g\u00e9r\u00e9e par l'interface. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "pfsense",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "pfSense - Ruleset PF",
          "url": "https://docs.netgate.com/pfsense/en/latest/firewall/pf-ruleset.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-pfsense-states",
      "basicCommandId": "pfsense:states",
      "tech": "pfsense",
      "type": "command",
      "title": "pfSense - Lire les \u00e9tats des connexions",
      "content": "pfctl -ss",
      "description": "Inspecter les \u00e9tats sans vider la table.",
      "example": "pfctl -ss",
      "vendor": "Netgate",
      "platform": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9",
      "context": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9. Impact : Lecture sensible. Les r\u00e8gles effectives incluent celles g\u00e9n\u00e9r\u00e9es par pfSense ; ne pas utiliser pfctl pour modifier la configuration g\u00e9r\u00e9e par l'interface. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "pfsense",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "pfSense - Ruleset PF",
          "url": "https://docs.netgate.com/pfsense/en/latest/firewall/pf-ruleset.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-pfsense-sockets",
      "basicCommandId": "pfsense:sockets",
      "tech": "pfsense",
      "type": "command",
      "title": "pfSense - Lire les sockets en \u00e9coute",
      "content": "sockstat -4 -l",
      "description": "Identifier les services qui \u00e9coutent sur le firewall.",
      "example": "sockstat -4 -l",
      "vendor": "Netgate",
      "platform": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9",
      "context": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9. Impact : Lecture seule. Les r\u00e8gles effectives incluent celles g\u00e9n\u00e9r\u00e9es par pfSense ; ne pas utiliser pfctl pour modifier la configuration g\u00e9r\u00e9e par l'interface. Ce n'est pas la liste des connexions qui transitent dans PF. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "pfsense",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "FreeBSD - netstat",
          "url": "https://man.freebsd.org/cgi/man.cgi?query=netstat&sektion=1"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-pfsense-capture",
      "basicCommandId": "pfsense:capture",
      "tech": "pfsense",
      "type": "command",
      "title": "pfSense - Faire une capture courte cibl\u00e9e",
      "content": "tcpdump -ni <INTERFACE> -c 100 host <IP>",
      "description": "Observer un flux avant et apr\u00e8s le filtrage sur l'interface choisie.",
      "example": "tcpdump -ni igb1 -c 100 host 192.0.2.10",
      "vendor": "Netgate",
      "platform": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9",
      "context": "Shell FreeBSD de pfSense via console ou SSH autoris\u00e9. Impact : Capture sensible. Les r\u00e8gles effectives incluent celles g\u00e9n\u00e9r\u00e9es par pfSense ; ne pas utiliser pfctl pour modifier la configuration g\u00e9r\u00e9e par l'interface. Arr\u00eater avec Ctrl+C si aucun paquet n'arrive ; le compteur ne fixe pas une dur\u00e9e. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "pfsense",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "tcpdump - Manuel",
          "url": "https://www.tcpdump.org/manpages/tcpdump.1.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Capture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-pwd",
      "basicCommandId": "linux:pwd",
      "tech": "linux",
      "type": "command",
      "title": "Linux - Lire le r\u00e9pertoire courant",
      "content": "pwd",
      "description": "Savoir dans quel r\u00e9pertoire une commande sera lanc\u00e9e.",
      "example": "pwd",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : Lecture seule. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "GNU - Outils de base",
          "url": "https://www.gnu.org/software/coreutils/manual/coreutils.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-ls",
      "basicCommandId": "linux:ls",
      "tech": "linux",
      "type": "command",
      "title": "Linux - Lister les fichiers et permissions",
      "content": "ls -lah <CHEMIN>",
      "description": "Lire fichiers cach\u00e9s, tailles et droits.",
      "example": "ls -lah /var/log",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : Lecture seule. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "GNU - Outils de base",
          "url": "https://www.gnu.org/software/coreutils/manual/coreutils.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-df",
      "basicCommandId": "linux:df",
      "tech": "linux",
      "type": "command",
      "title": "Linux - Lire l'espace disque",
      "content": "df -h",
      "description": "Rep\u00e9rer un syst\u00e8me de fichiers satur\u00e9.",
      "example": "df -h",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : Lecture seule. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "GNU - Outils de base",
          "url": "https://www.gnu.org/software/coreutils/manual/coreutils.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-du",
      "basicCommandId": "linux:du",
      "tech": "linux",
      "type": "command",
      "title": "Linux - Mesurer la taille d'un r\u00e9pertoire",
      "content": "du -sh <DOSSIER>",
      "description": "Mesurer l'occupation d'un dossier cibl\u00e9.",
      "example": "du -sh /var/log",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : Lecture locale. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. L'analyse d'un gros dossier peut \u00eatre co\u00fbteuse en I/O. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "GNU - Outils de base",
          "url": "https://www.gnu.org/software/coreutils/manual/coreutils.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture locale"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-processes",
      "basicCommandId": "linux:processes",
      "tech": "linux",
      "type": "command",
      "title": "Linux - Lire les processus et leur consommation",
      "content": "ps aux",
      "description": "Identifier les processus actifs et leurs ressources.",
      "example": "ps aux",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : Lecture sensible. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. Les arguments des processus peuvent contenir des secrets. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "procps - Manuels des outils de processus",
          "url": "https://gitlab.com/procps-ng/procps/-/tree/master/man"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-top",
      "basicCommandId": "linux:top",
      "tech": "linux",
      "type": "command",
      "title": "Linux - Observer la charge en direct",
      "content": "top",
      "description": "Observer CPU et m\u00e9moire avant une action.",
      "example": "top",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : Lecture locale. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. Quitter avec q. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "procps - Manuels des outils de processus",
          "url": "https://gitlab.com/procps-ng/procps/-/tree/master/man"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture locale"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-tail",
      "basicCommandId": "linux:tail",
      "tech": "linux",
      "type": "command",
      "title": "Linux - Lire les derni\u00e8res lignes d'un journal",
      "content": "tail -n 100 <FICHIER_LOG>",
      "description": "Consulter une fin de fichier sans charger le journal entier.",
      "example": "tail -n 100 /var/log/syslog",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : Lecture sensible. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "GNU - Outils de base",
          "url": "https://www.gnu.org/software/coreutils/manual/coreutils.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-services",
      "basicCommandId": "linux:services",
      "tech": "linux",
      "type": "command",
      "title": "Linux - Lister les services systemd",
      "content": "systemctl list-units --type=service --all --no-pager",
      "description": "Retrouver le nom exact d'une unit\u00e9 avant de la cibler.",
      "example": "systemctl list-units --type=service --all --no-pager",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : Lecture seule. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "systemd - systemctl",
          "url": "https://github.com/systemd/systemd/blob/main/man/systemctl.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-start",
      "basicCommandId": "linux:start",
      "tech": "linux",
      "type": "command",
      "title": "Linux - D\u00e9marrer un service approuv\u00e9",
      "content": "sudo systemctl start <SERVICE>",
      "description": "D\u00e9marrer une unit\u00e9 identifi\u00e9e.",
      "example": "sudo systemctl start nginx",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : Action sur service. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. Confirmer les d\u00e9pendances et le changement attendu. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "systemd - systemctl",
          "url": "https://github.com/systemd/systemd/blob/main/man/systemctl.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Action sur service"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-stop",
      "basicCommandId": "linux:stop",
      "tech": "linux",
      "type": "command",
      "title": "Linux - Arr\u00eater un service approuv\u00e9",
      "content": "sudo systemctl stop <SERVICE>",
      "description": "Arr\u00eater seulement l'unit\u00e9 pr\u00e9vue dans l'intervention.",
      "example": "sudo systemctl stop nginx",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : Interruption de service. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. Fen\u00eatre et retour pr\u00e9vus ; ne pas arr\u00eater SSH ou le r\u00e9seau d'une session distante. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "systemd - systemctl",
          "url": "https://github.com/systemd/systemd/blob/main/man/systemctl.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Interruption de service"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-restart",
      "basicCommandId": "linux:restart",
      "tech": "linux",
      "type": "command",
      "title": "Linux - Red\u00e9marrer un service approuv\u00e9",
      "content": "sudo systemctl restart <SERVICE>",
      "description": "Relancer un service apr\u00e8s diagnostic et validation.",
      "example": "sudo systemctl restart nginx",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : Interruption de service. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. Valider la configuration et les impacts avant relance. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "systemd - systemctl",
          "url": "https://github.com/systemd/systemd/blob/main/man/systemctl.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Interruption de service"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-journal",
      "basicCommandId": "linux:journal",
      "tech": "linux",
      "type": "command",
      "title": "Linux - Lire les derniers journaux d'un service",
      "content": "journalctl -u <SERVICE> -n 100 --no-pager",
      "description": "Collecter les messages de l'unit\u00e9 choisie.",
      "example": "journalctl -u nginx -n 100 --no-pager",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : Lecture sensible. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "systemd - journalctl",
          "url": "https://github.com/systemd/systemd/blob/main/man/journalctl.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-ping",
      "basicCommandId": "linux:ping",
      "tech": "linux",
      "type": "command",
      "title": "Linux - Tester un h\u00f4te avec quatre pings",
      "content": "ping -c 4 <IP>",
      "description": "Tester la joignabilit\u00e9 sans boucle infinie.",
      "example": "ping -c 4 192.0.2.10",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : Sonde r\u00e9seau. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "iputils - Manuel ping",
          "url": "https://github.com/iputils/iputils/blob/master/doc/ping.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-linux-copy",
      "basicCommandId": "linux:copy",
      "tech": "linux",
      "type": "command",
      "title": "Linux - Copier un fichier en conservant ses attributs",
      "content": "cp -p -i <SOURCE> <DESTINATION>",
      "description": "Copier un fichier avec confirmation avant \u00e9crasement.",
      "example": "cp -p -i config.conf config.conf.backup",
      "vendor": "Linux",
      "platform": "Terminal Linux / systemd",
      "context": "Terminal Linux / systemd. Impact : \u00c9criture de fichier. Adapter le nom du service et les chemins ; sudo seulement si n\u00e9cessaire. V\u00e9rifier les deux chemins ; une copie de fichier n'est pas une sauvegarde compl\u00e8te. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "linux",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "GNU - Outils de base",
          "url": "https://www.gnu.org/software/coreutils/manual/coreutils.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "\u00c9criture de fichier"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-windows-services",
      "basicCommandId": "windows:services",
      "tech": "windows",
      "type": "command",
      "title": "Windows - Lister les services et leur \u00e9tat",
      "content": "Get-Service | Sort-Object Status,DisplayName",
      "description": "Identifier le nom exact d'un service avant d'agir.",
      "example": "Get-Service | Sort-Object Status,DisplayName",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows sauf commandes CMD indiqu\u00e9es",
      "context": "PowerShell Windows sauf commandes CMD indiqu\u00e9es. Impact : Lecture seule. Ex\u00e9cuter dans la bonne session ; les changements r\u00e9seau et services peuvent interrompre le poste. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "windows",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - PowerShell Management",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-windows-processes",
      "basicCommandId": "windows:processes",
      "tech": "windows",
      "type": "command",
      "title": "Windows - Lire les processus les plus consommateurs",
      "content": "Get-Process | Sort-Object CPU -Descending | Select-Object -First 15 Name,Id,CPU,WorkingSet64",
      "description": "Rep\u00e9rer les processus \u00e0 examiner.",
      "example": "Get-Process | Sort-Object CPU -Descending | Select-Object -First 15 Name,Id,CPU,WorkingSet64",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows sauf commandes CMD indiqu\u00e9es",
      "context": "PowerShell Windows sauf commandes CMD indiqu\u00e9es. Impact : Lecture seule. Ex\u00e9cuter dans la bonne session ; les changements r\u00e9seau et services peuvent interrompre le poste. CPU est un temps cumul\u00e9, pas un pourcentage instantan\u00e9. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "windows",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - PowerShell Management",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-windows-disks",
      "basicCommandId": "windows:disks",
      "tech": "windows",
      "type": "command",
      "title": "Windows - Lire l'espace libre des volumes",
      "content": "Get-Volume | Select-Object DriveLetter,FileSystemLabel,HealthStatus,SizeRemaining,Size",
      "description": "Contr\u00f4ler les volumes et leur place libre.",
      "example": "Get-Volume | Select-Object DriveLetter,FileSystemLabel,HealthStatus,SizeRemaining,Size",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows sauf commandes CMD indiqu\u00e9es",
      "context": "PowerShell Windows sauf commandes CMD indiqu\u00e9es. Impact : Lecture seule. Ex\u00e9cuter dans la bonne session ; les changements r\u00e9seau et services peuvent interrompre le poste. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "windows",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - Volumes",
          "url": "https://learn.microsoft.com/en-us/powershell/module/storage/get-volume"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-windows-adapter",
      "basicCommandId": "windows:adapter",
      "tech": "windows",
      "type": "command",
      "title": "Windows - Lire l'\u00e9tat des cartes r\u00e9seau",
      "content": "Get-NetAdapter | Select-Object Name,Status,LinkSpeed,MacAddress",
      "description": "Identifier une carte d\u00e9connect\u00e9e ou un lien inattendu.",
      "example": "Get-NetAdapter | Select-Object Name,Status,LinkSpeed,MacAddress",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows sauf commandes CMD indiqu\u00e9es",
      "context": "PowerShell Windows sauf commandes CMD indiqu\u00e9es. Impact : Lecture seule. Ex\u00e9cuter dans la bonne session ; les changements r\u00e9seau et services peuvent interrompre le poste. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "windows",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - NetAdapter",
          "url": "https://learn.microsoft.com/en-us/powershell/module/netadapter/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-windows-dns",
      "basicCommandId": "windows:dns",
      "tech": "windows",
      "type": "command",
      "title": "Windows - Lire les serveurs DNS du poste",
      "content": "Get-DnsClientServerAddress -AddressFamily IPv4",
      "description": "Comparer les DNS affect\u00e9s \u00e0 chaque interface.",
      "example": "Get-DnsClientServerAddress -AddressFamily IPv4",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows sauf commandes CMD indiqu\u00e9es",
      "context": "PowerShell Windows sauf commandes CMD indiqu\u00e9es. Impact : Lecture seule. Ex\u00e9cuter dans la bonne session ; les changements r\u00e9seau et services peuvent interrompre le poste. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "windows",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - DnsClient",
          "url": "https://learn.microsoft.com/en-us/powershell/module/dnsclient/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-windows-ping",
      "basicCommandId": "windows:ping",
      "tech": "windows",
      "type": "command",
      "title": "Windows - Tester un h\u00f4te avec quatre pings",
      "content": "ping -n 4 <IP>",
      "description": "V\u00e9rifier la joignabilit\u00e9 depuis le poste.",
      "example": "ping -n 4 192.0.2.10",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows sauf commandes CMD indiqu\u00e9es",
      "context": "PowerShell Windows sauf commandes CMD indiqu\u00e9es. Impact : Sonde r\u00e9seau. Ex\u00e9cuter dans la bonne session ; les changements r\u00e9seau et services peuvent interrompre le poste. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "windows",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Commandes Windows",
          "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-windows-trace",
      "basicCommandId": "windows:trace",
      "tech": "windows",
      "type": "command",
      "title": "Windows - Suivre le chemin sans r\u00e9solution DNS",
      "content": "tracert -d <IP>",
      "description": "Relever les sauts sans attendre les r\u00e9solutions inverses.",
      "example": "tracert -d 192.0.2.10",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows sauf commandes CMD indiqu\u00e9es",
      "context": "PowerShell Windows sauf commandes CMD indiqu\u00e9es. Impact : Sonde r\u00e9seau. Ex\u00e9cuter dans la bonne session ; les changements r\u00e9seau et services peuvent interrompre le poste. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "windows",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Commandes Windows",
          "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-windows-flushdns",
      "basicCommandId": "windows:flushdns",
      "tech": "windows",
      "type": "command",
      "title": "Windows - Vider le cache DNS du poste",
      "content": "ipconfig /flushdns",
      "description": "Forcer une nouvelle r\u00e9solution apr\u00e8s collecte du cache.",
      "example": "ipconfig /flushdns",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows sauf commandes CMD indiqu\u00e9es",
      "context": "PowerShell Windows sauf commandes CMD indiqu\u00e9es. Impact : Modification du cache. Ex\u00e9cuter dans la bonne session ; les changements r\u00e9seau et services peuvent interrompre le poste. Lire le cache avant ; cette action ne change pas les DNS configur\u00e9s. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "windows",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Commandes Windows",
          "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Modification du cache"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-windows-start",
      "basicCommandId": "windows:start",
      "tech": "windows",
      "type": "command",
      "title": "Windows - D\u00e9marrer un service approuv\u00e9",
      "content": "Start-Service -Name <SERVICE>",
      "description": "D\u00e9marrer le service identifi\u00e9 dans l'intervention.",
      "example": "Start-Service -Name Spooler",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows sauf commandes CMD indiqu\u00e9es",
      "context": "PowerShell Windows sauf commandes CMD indiqu\u00e9es. Impact : Action sur service. Ex\u00e9cuter dans la bonne session ; les changements r\u00e9seau et services peuvent interrompre le poste. Droits administrateur et service cible valid\u00e9. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "windows",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - PowerShell Management",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Action sur service"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-windows-restart",
      "basicCommandId": "windows:restart",
      "tech": "windows",
      "type": "command",
      "title": "Windows - Red\u00e9marrer un service approuv\u00e9",
      "content": "Restart-Service -Name <SERVICE>",
      "description": "Relancer le seul service pr\u00e9vu apr\u00e8s diagnostic.",
      "example": "Restart-Service -Name Spooler",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows sauf commandes CMD indiqu\u00e9es",
      "context": "PowerShell Windows sauf commandes CMD indiqu\u00e9es. Impact : Interruption de service. Ex\u00e9cuter dans la bonne session ; les changements r\u00e9seau et services peuvent interrompre le poste. Consulter les d\u00e9pendances et obtenir l'accord avant relance ; pas de -Force par d\u00e9faut. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "windows",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - PowerShell Management",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Interruption de service"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-windows-files",
      "basicCommandId": "windows:files",
      "tech": "windows",
      "type": "command",
      "title": "Windows - Lister les fichiers d'un dossier",
      "content": "Get-ChildItem -LiteralPath '<DOSSIER>' -Force",
      "description": "Lire les fichiers y compris cach\u00e9s sans les modifier.",
      "example": "Get-ChildItem -LiteralPath 'C:\\Temp' -Force",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows sauf commandes CMD indiqu\u00e9es",
      "context": "PowerShell Windows sauf commandes CMD indiqu\u00e9es. Impact : Lecture seule. Ex\u00e9cuter dans la bonne session ; les changements r\u00e9seau et services peuvent interrompre le poste. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "windows",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - PowerShell Management",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ad-user",
      "basicCommandId": "ad:user",
      "tech": "ad",
      "type": "command",
      "title": "AD - Lire l'\u00e9tat d'un utilisateur",
      "content": "Get-ADUser -Identity '<UTILISATEUR>' -Properties Enabled,LockedOut,PasswordLastSet | Select-Object SamAccountName,Enabled,LockedOut,PasswordLastSet",
      "description": "Contr\u00f4ler l'\u00e9tat du compte sans modifier son mot de passe.",
      "example": "Get-ADUser -Identity 'user-test' -Properties Enabled,LockedOut,PasswordLastSet | Select-Object SamAccountName,Enabled,LockedOut,PasswordLastSet",
      "vendor": "Microsoft",
      "platform": "PowerShell avec module ActiveDirectory / RSAT",
      "context": "PowerShell avec module ActiveDirectory / RSAT. Impact : Lecture seule. Limiter le p\u00e9rim\u00e8tre et conserver les droits les plus restreints possibles ; exports d'identit\u00e9s sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ad",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - Active Directory PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/activedirectory/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ad-groups",
      "basicCommandId": "ad:groups",
      "tech": "ad",
      "type": "command",
      "title": "AD - Lire les groupes d'un utilisateur",
      "content": "Get-ADPrincipalGroupMembership -Identity '<UTILISATEUR>' | Select-Object Name,GroupScope",
      "description": "V\u00e9rifier les appartenances du compte cibl\u00e9.",
      "example": "Get-ADPrincipalGroupMembership -Identity 'user-test' | Select-Object Name,GroupScope",
      "vendor": "Microsoft",
      "platform": "PowerShell avec module ActiveDirectory / RSAT",
      "context": "PowerShell avec module ActiveDirectory / RSAT. Impact : Lecture seule. Limiter le p\u00e9rim\u00e8tre et conserver les droits les plus restreints possibles ; exports d'identit\u00e9s sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ad",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - Active Directory PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/activedirectory/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ad-dcs",
      "basicCommandId": "ad:dcs",
      "tech": "ad",
      "type": "command",
      "title": "AD - Lister les contr\u00f4leurs du domaine",
      "content": "Get-ADDomainController -Filter * | Select-Object HostName,Site,IPv4Address,IsGlobalCatalog",
      "description": "Retrouver les DC et leurs sites.",
      "example": "Get-ADDomainController -Filter * | Select-Object HostName,Site,IPv4Address,IsGlobalCatalog",
      "vendor": "Microsoft",
      "platform": "PowerShell avec module ActiveDirectory / RSAT",
      "context": "PowerShell avec module ActiveDirectory / RSAT. Impact : Lecture seule. Limiter le p\u00e9rim\u00e8tre et conserver les droits les plus restreints possibles ; exports d'identit\u00e9s sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ad",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - Active Directory PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/activedirectory/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ad-replication",
      "basicCommandId": "ad:replication",
      "tech": "ad",
      "type": "command",
      "title": "AD - Lire le bilan de r\u00e9plication",
      "content": "repadmin /replsummary",
      "description": "Identifier les erreurs et retards de r\u00e9plication.",
      "example": "repadmin /replsummary",
      "vendor": "Microsoft",
      "platform": "PowerShell avec module ActiveDirectory / RSAT",
      "context": "PowerShell avec module ActiveDirectory / RSAT. Impact : Lecture seule. Limiter le p\u00e9rim\u00e8tre et conserver les droits les plus restreints possibles ; exports d'identit\u00e9s sensibles. Console avec les outils AD et droits requis ; pas de /syncall dans ce diagnostic. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ad",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - Commandes Windows",
          "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ad-dcdiag",
      "basicCommandId": "ad:dcdiag",
      "tech": "ad",
      "type": "command",
      "title": "AD - Tester DNS sur un DC cibl\u00e9",
      "content": "dcdiag /s:<CONTROLEUR_AD> /test:DNS /v",
      "description": "Collecter le diagnostic DNS d'un DC pr\u00e9cis.",
      "example": "dcdiag /s:dc01.example.test /test:DNS /v",
      "vendor": "Microsoft",
      "platform": "PowerShell avec module ActiveDirectory / RSAT",
      "context": "PowerShell avec module ActiveDirectory / RSAT. Impact : Diagnostic actif. Limiter le p\u00e9rim\u00e8tre et conserver les droits les plus restreints possibles ; exports d'identit\u00e9s sensibles. Produit des requ\u00eates et tests ; ne pas ajouter /fix. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ad",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Commandes Windows",
          "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Diagnostic actif"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ad-unlock",
      "basicCommandId": "ad:unlock",
      "tech": "ad",
      "type": "command",
      "title": "AD - D\u00e9verrouiller un compte valid\u00e9",
      "content": "Unlock-ADAccount -Identity '<UTILISATEUR>' -Confirm",
      "description": "D\u00e9verrouiller un compte apr\u00e8s contr\u00f4le d'identit\u00e9 et de la cause.",
      "example": "Unlock-ADAccount -Identity 'user-test' -Confirm",
      "vendor": "Microsoft",
      "platform": "PowerShell avec module ActiveDirectory / RSAT",
      "context": "PowerShell avec module ActiveDirectory / RSAT. Impact : Modification d'identit\u00e9. Limiter le p\u00e9rim\u00e8tre et conserver les droits les plus restreints possibles ; exports d'identit\u00e9s sensibles. Tracer l'action et traiter la cause du verrouillage avant de r\u00e9p\u00e9ter l'op\u00e9ration. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ad",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Active Directory PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/activedirectory/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Modification d'identit\u00e9"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-gpo-list",
      "basicCommandId": "gpo:list",
      "tech": "gpo",
      "type": "command",
      "title": "GPO - Lister les strat\u00e9gies du domaine",
      "content": "Get-GPO -All | Select-Object DisplayName,Id,GpoStatus",
      "description": "Retrouver une strat\u00e9gie et son identifiant.",
      "example": "Get-GPO -All | Select-Object DisplayName,Id,GpoStatus",
      "vendor": "Microsoft",
      "platform": "PowerShell avec module GroupPolicy / poste joint au domaine",
      "context": "PowerShell avec module GroupPolicy / poste joint au domaine. Impact : Lecture seule. Un rapport est une lecture ; gpupdate applique les politiques et peut demander une fermeture de session. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "gpo",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - Group Policy PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/grouppolicy/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-gpo-report",
      "basicCommandId": "gpo:report",
      "tech": "gpo",
      "type": "command",
      "title": "GPO - Exporter le rapport d'une strat\u00e9gie",
      "content": "Get-GPOReport -Name '<NOM_GPO>' -ReportType Html -Path '<FICHIER_HTML>'",
      "description": "Lire les param\u00e8tres d'une GPO dans un rapport local.",
      "example": "Get-GPOReport -Name 'GPO-Test' -ReportType Html -Path 'C:\\Temp\\gpo-test.html'",
      "vendor": "Microsoft",
      "platform": "PowerShell avec module GroupPolicy / poste joint au domaine",
      "context": "PowerShell avec module GroupPolicy / poste joint au domaine. Impact : Export local sensible. Un rapport est une lecture ; gpupdate applique les politiques et peut demander une fermeture de session. Choisir un fichier libre dans un dossier existant. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "gpo",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Group Policy PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/grouppolicy/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Export local sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-gpo-rsop",
      "basicCommandId": "gpo:rsop",
      "tech": "gpo",
      "type": "command",
      "title": "GPO - Exporter les strat\u00e9gies appliqu\u00e9es au poste",
      "content": "gpresult /h <FICHIER_HTML>",
      "description": "Comparer les GPO effectives \u00e0 la configuration attendue.",
      "example": "gpresult /h C:\\Temp\\rsop.html",
      "vendor": "Microsoft",
      "platform": "PowerShell avec module GroupPolicy / poste joint au domaine",
      "context": "PowerShell avec module GroupPolicy / poste joint au domaine. Impact : Export local sensible. Un rapport est une lecture ; gpupdate applique les politiques et peut demander une fermeture de session. Droits adapt\u00e9s pour la partie ordinateur ; rapport li\u00e9 \u00e0 la session courante. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "gpo",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Commandes Windows",
          "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Export local sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-gpo-refresh",
      "basicCommandId": "gpo:refresh",
      "tech": "gpo",
      "type": "command",
      "title": "GPO - Actualiser les strat\u00e9gies du poste",
      "content": "gpupdate",
      "description": "Appliquer les changements de politique sur le poste autoris\u00e9.",
      "example": "gpupdate",
      "vendor": "Microsoft",
      "platform": "PowerShell avec module GroupPolicy / poste joint au domaine",
      "context": "PowerShell avec module GroupPolicy / poste joint au domaine. Impact : Application de politiques. Un rapport est une lecture ; gpupdate applique les politiques et peut demander une fermeture de session. Peut demander fermeture de session ou red\u00e9marrage ; ne pas utiliser /force syst\u00e9matiquement. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "gpo",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Commandes Windows",
          "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Application de politiques"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-exchange-stats",
      "basicCommandId": "exchange:stats",
      "tech": "exchange",
      "type": "command",
      "title": "Exchange local - Lire la taille d'une bo\u00eete",
      "content": "Get-MailboxStatistics -Identity '<BOITE>' | Select-Object DisplayName,ItemCount,TotalItemSize,LastLogonTime",
      "description": "Contr\u00f4ler le volume et l'utilisation de la bo\u00eete cibl\u00e9e.",
      "example": "Get-MailboxStatistics -Identity 'pilote@example.test' | Select-Object DisplayName,ItemCount,TotalItemSize,LastLogonTime",
      "vendor": "Microsoft",
      "platform": "Exchange Management Shell locale - pas Exchange Online",
      "context": "Exchange Management Shell locale - pas Exchange Online. Impact : Lecture seule. Les cmdlets d\u00e9pendent des r\u00f4les Exchange ; les objets et journaux de messagerie sont sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "exchange",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - Exchange PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-exchange-queues",
      "basicCommandId": "exchange:queues",
      "tech": "exchange",
      "type": "command",
      "title": "Exchange local - Lire les files de transport",
      "content": "Get-Queue | Select-Object Identity,Status,MessageCount,NextHopDomain,LastError",
      "description": "V\u00e9rifier les files sans supprimer ni relancer les messages.",
      "example": "Get-Queue | Select-Object Identity,Status,MessageCount,NextHopDomain,LastError",
      "vendor": "Microsoft",
      "platform": "Exchange Management Shell locale - pas Exchange Online",
      "context": "Exchange Management Shell locale - pas Exchange Online. Impact : Lecture sensible. Les cmdlets d\u00e9pendent des r\u00f4les Exchange ; les objets et journaux de messagerie sont sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "exchange",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Exchange PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-exchange-database",
      "basicCommandId": "exchange:database",
      "tech": "exchange",
      "type": "command",
      "title": "Exchange local - Lire les bases et leur espace",
      "content": "Get-MailboxDatabase -Status | Select-Object Name,Mounted,DatabaseSize,AvailableNewMailboxSpace",
      "description": "V\u00e9rifier montage et espace interne des bases.",
      "example": "Get-MailboxDatabase -Status | Select-Object Name,Mounted,DatabaseSize,AvailableNewMailboxSpace",
      "vendor": "Microsoft",
      "platform": "Exchange Management Shell locale - pas Exchange Online",
      "context": "Exchange Management Shell locale - pas Exchange Online. Impact : Lecture seule. Les cmdlets d\u00e9pendent des r\u00f4les Exchange ; les objets et journaux de messagerie sont sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "exchange",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - Exchange PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-exchange-permissions",
      "basicCommandId": "exchange:permissions",
      "tech": "exchange",
      "type": "command",
      "title": "Exchange local - Lire les d\u00e9l\u00e9gations d'une bo\u00eete",
      "content": "Get-MailboxPermission -Identity '<BOITE>'",
      "description": "Examiner les droits sans les modifier.",
      "example": "Get-MailboxPermission -Identity 'pilote@example.test'",
      "vendor": "Microsoft",
      "platform": "Exchange Management Shell locale - pas Exchange Online",
      "context": "Exchange Management Shell locale - pas Exchange Online. Impact : Lecture sensible. Les cmdlets d\u00e9pendent des r\u00f4les Exchange ; les objets et journaux de messagerie sont sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "exchange",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Exchange PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-exchange-trace",
      "basicCommandId": "exchange:trace",
      "tech": "exchange",
      "type": "command",
      "title": "Exchange local - Suivre un message r\u00e9cent",
      "content": "Get-MessageTrackingLog -Start (Get-Date).AddHours(-1) -End (Get-Date) -Recipients '<DESTINATAIRE>' -ResultSize 100",
      "description": "Relever les \u00e9v\u00e9nements de transport d'un destinataire sur une heure.",
      "example": "Get-MessageTrackingLog -Start (Get-Date).AddHours(-1) -End (Get-Date) -Recipients 'pilote@example.test' -ResultSize 100",
      "vendor": "Microsoft",
      "platform": "Exchange Management Shell locale - pas Exchange Online",
      "context": "Exchange Management Shell locale - pas Exchange Online. Impact : Lecture sensible. Les cmdlets d\u00e9pendent des r\u00f4les Exchange ; les objets et journaux de messagerie sont sensibles. Le journal est lu sur le serveur cibl\u00e9 par la session ; r\u00e9p\u00e9ter sur les autres serveurs du trajet si n\u00e9cessaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "exchange",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Exchange PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-exchange-services",
      "basicCommandId": "exchange:services",
      "tech": "exchange",
      "type": "command",
      "title": "Exchange local - Tester les services du serveur",
      "content": "Test-ServiceHealth",
      "description": "V\u00e9rifier les services requis pour les r\u00f4les install\u00e9s.",
      "example": "Test-ServiceHealth",
      "vendor": "Microsoft",
      "platform": "Exchange Management Shell locale - pas Exchange Online",
      "context": "Exchange Management Shell locale - pas Exchange Online. Impact : Diagnostic local. Les cmdlets d\u00e9pendent des r\u00f4les Exchange ; les objets et journaux de messagerie sont sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "exchange",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Exchange PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Diagnostic local"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-m365-exo-connect",
      "basicCommandId": "m365:exo-connect",
      "tech": "m365",
      "type": "command",
      "title": "Microsoft 365 - Se connecter \u00e0 Exchange Online",
      "content": "Connect-ExchangeOnline -UserPrincipalName '<UPN_ADMIN>'",
      "description": "Ouvrir la session moderne avec l'authentification requise.",
      "example": "Connect-ExchangeOnline -UserPrincipalName 'admin@example.test'",
      "vendor": "Microsoft",
      "platform": "PowerShell avec Microsoft Graph / ExchangeOnlineManagement selon la commande",
      "context": "PowerShell avec Microsoft Graph / ExchangeOnlineManagement selon la commande. Impact : Connexion authentifi\u00e9e. Connexion au bon tenant avec consentement et droits appropri\u00e9s. Ne pas utiliser AzureAD ou MSOnline pour ces exemples. Module ExchangeOnlineManagement install\u00e9 ; suivre MFA et les r\u00f4les du tenant. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "m365",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Connexion Exchange Online",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/connect-exchangeonline"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Connexion authentifi\u00e9e"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-m365-exo-mailbox",
      "basicCommandId": "m365:exo-mailbox",
      "tech": "m365",
      "type": "command",
      "title": "Exchange Online - Lire une bo\u00eete",
      "content": "Get-EXOMailbox -Identity '<BOITE>' | Select-Object DisplayName,PrimarySmtpAddress,RecipientTypeDetails",
      "description": "Consulter les propri\u00e9t\u00e9s de la bo\u00eete apr\u00e8s connexion.",
      "example": "Get-EXOMailbox -Identity 'pilote@example.test' | Select-Object DisplayName,PrimarySmtpAddress,RecipientTypeDetails",
      "vendor": "Microsoft",
      "platform": "PowerShell avec Microsoft Graph / ExchangeOnlineManagement selon la commande",
      "context": "PowerShell avec Microsoft Graph / ExchangeOnlineManagement selon la commande. Impact : Lecture sensible. Connexion au bon tenant avec consentement et droits appropri\u00e9s. Ne pas utiliser AzureAD ou MSOnline pour ces exemples. Session Exchange Online ouverte. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "m365",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Exchange PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-m365-exo-stats",
      "basicCommandId": "m365:exo-stats",
      "tech": "m365",
      "type": "command",
      "title": "Exchange Online - Lire la taille d'une bo\u00eete",
      "content": "Get-EXOMailboxStatistics -Identity '<BOITE>' | Select-Object DisplayName,ItemCount,TotalItemSize",
      "description": "Contr\u00f4ler la taille et le nombre d'\u00e9l\u00e9ments.",
      "example": "Get-EXOMailboxStatistics -Identity 'pilote@example.test' | Select-Object DisplayName,ItemCount,TotalItemSize",
      "vendor": "Microsoft",
      "platform": "PowerShell avec Microsoft Graph / ExchangeOnlineManagement selon la commande",
      "context": "PowerShell avec Microsoft Graph / ExchangeOnlineManagement selon la commande. Impact : Lecture sensible. Connexion au bon tenant avec consentement et droits appropri\u00e9s. Ne pas utiliser AzureAD ou MSOnline pour ces exemples. Session Exchange Online ouverte. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "m365",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Exchange PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-m365-graph-user",
      "basicCommandId": "m365:graph-user",
      "tech": "m365",
      "type": "command",
      "title": "Microsoft Graph - Lire un utilisateur cibl\u00e9",
      "content": "Get-MgUser -UserId '<UPN>' -Property Id,DisplayName,UserPrincipalName,AccountEnabled | Select-Object Id,DisplayName,UserPrincipalName,AccountEnabled",
      "description": "Lire un compte sans exporter tout le tenant.",
      "example": "Get-MgUser -UserId 'pilote@example.test' -Property Id,DisplayName,UserPrincipalName,AccountEnabled | Select-Object Id,DisplayName,UserPrincipalName,AccountEnabled",
      "vendor": "Microsoft",
      "platform": "PowerShell avec Microsoft Graph / ExchangeOnlineManagement selon la commande",
      "context": "PowerShell avec Microsoft Graph / ExchangeOnlineManagement selon la commande. Impact : Lecture sensible. Connexion au bon tenant avec consentement et droits appropri\u00e9s. Ne pas utiliser AzureAD ou MSOnline pour ces exemples. Session Graph avec User.Read.All ou permission ad\u00e9quate. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "m365",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Graph PowerShell utilisateurs",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.users/get-mguser"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-m365-graph-close",
      "basicCommandId": "m365:graph-close",
      "tech": "m365",
      "type": "command",
      "title": "Microsoft Graph - Fermer la session",
      "content": "Disconnect-MgGraph",
      "description": "Retirer le contexte d'authentification de cette session.",
      "example": "Disconnect-MgGraph",
      "vendor": "Microsoft",
      "platform": "PowerShell avec Microsoft Graph / ExchangeOnlineManagement selon la commande",
      "context": "PowerShell avec Microsoft Graph / ExchangeOnlineManagement selon la commande. Impact : Session locale. Connexion au bon tenant avec consentement et droits appropri\u00e9s. Ne pas utiliser AzureAD ou MSOnline pour ces exemples. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "m365",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Graph PowerShell authentification",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.authentication/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Session locale"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-m365-exo-close",
      "basicCommandId": "m365:exo-close",
      "tech": "m365",
      "type": "command",
      "title": "Exchange Online - Fermer la session",
      "content": "Disconnect-ExchangeOnline -Confirm:$false",
      "description": "Fermer les connexions Exchange Online de la session.",
      "example": "Disconnect-ExchangeOnline -Confirm:$false",
      "vendor": "Microsoft",
      "platform": "PowerShell avec Microsoft Graph / ExchangeOnlineManagement selon la commande",
      "context": "PowerShell avec Microsoft Graph / ExchangeOnlineManagement selon la commande. Impact : Session locale. Connexion au bon tenant avec consentement et droits appropri\u00e9s. Ne pas utiliser AzureAD ou MSOnline pour ces exemples. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "m365",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Exchange PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Session locale"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-entra-context",
      "basicCommandId": "entra:context",
      "tech": "entra",
      "type": "command",
      "title": "Entra / Graph - Lire le contexte de connexion",
      "content": "Get-MgContext | Select-Object TenantId,Account,AuthType,Scopes",
      "description": "V\u00e9rifier le compte, le tenant et les permissions actuelles.",
      "example": "Get-MgContext | Select-Object TenantId,Account,AuthType,Scopes",
      "vendor": "Microsoft",
      "platform": "Microsoft Graph PowerShell - tenant autoris\u00e9",
      "context": "Microsoft Graph PowerShell - tenant autoris\u00e9. Impact : Lecture sensible. Les permissions requises d\u00e9pendent de la lecture ; ne jamais r\u00e9initialiser une m\u00e9thode MFA pour un simple diagnostic. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "entra",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Graph PowerShell authentification",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.authentication/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-entra-close",
      "basicCommandId": "entra:close",
      "tech": "entra",
      "type": "command",
      "title": "Entra / Graph - Fermer la connexion",
      "content": "Disconnect-MgGraph",
      "description": "Terminer la session Graph apr\u00e8s diagnostic.",
      "example": "Disconnect-MgGraph",
      "vendor": "Microsoft",
      "platform": "Microsoft Graph PowerShell - tenant autoris\u00e9",
      "context": "Microsoft Graph PowerShell - tenant autoris\u00e9. Impact : Session locale. Les permissions requises d\u00e9pendent de la lecture ; ne jamais r\u00e9initialiser une m\u00e9thode MFA pour un simple diagnostic. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "entra",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Graph PowerShell authentification",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.authentication/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Session locale"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-iis-sites",
      "basicCommandId": "iis:sites",
      "tech": "iis",
      "type": "command",
      "title": "IIS - Lister les sites",
      "content": "& \"$env:windir\\System32\\inetsrv\\appcmd.exe\" list site",
      "description": "Lire les sites, bindings et \u00e9tats.",
      "example": "& \"$env:windir\\System32\\inetsrv\\appcmd.exe\" list site",
      "vendor": "Microsoft",
      "platform": "PowerShell sur le serveur IIS avec AppCmd install\u00e9",
      "context": "PowerShell sur le serveur IIS avec AppCmd install\u00e9. Impact : Lecture seule. AppCmd se trouve dans System32/inetsrv. Un recyclage de pool interrompt les requ\u00eates en cours. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "iis",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - Gestion IIS AppCmd",
          "url": "https://learn.microsoft.com/en-us/iis/get-started/getting-started-with-iis/getting-started-with-appcmdexe"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-iis-pools",
      "basicCommandId": "iis:pools",
      "tech": "iis",
      "type": "command",
      "title": "IIS - Lister les pools applicatifs",
      "content": "& \"$env:windir\\System32\\inetsrv\\appcmd.exe\" list apppool",
      "description": "V\u00e9rifier les pools et leur \u00e9tat.",
      "example": "& \"$env:windir\\System32\\inetsrv\\appcmd.exe\" list apppool",
      "vendor": "Microsoft",
      "platform": "PowerShell sur le serveur IIS avec AppCmd install\u00e9",
      "context": "PowerShell sur le serveur IIS avec AppCmd install\u00e9. Impact : Lecture seule. AppCmd se trouve dans System32/inetsrv. Un recyclage de pool interrompt les requ\u00eates en cours. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "iis",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - Gestion IIS AppCmd",
          "url": "https://learn.microsoft.com/en-us/iis/get-started/getting-started-with-iis/getting-started-with-appcmdexe"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-iis-workers",
      "basicCommandId": "iis:workers",
      "tech": "iis",
      "type": "command",
      "title": "IIS - Lire les processus workers",
      "content": "& \"$env:windir\\System32\\inetsrv\\appcmd.exe\" list wp",
      "description": "Associer PID et pool applicatif.",
      "example": "& \"$env:windir\\System32\\inetsrv\\appcmd.exe\" list wp",
      "vendor": "Microsoft",
      "platform": "PowerShell sur le serveur IIS avec AppCmd install\u00e9",
      "context": "PowerShell sur le serveur IIS avec AppCmd install\u00e9. Impact : Lecture seule. AppCmd se trouve dans System32/inetsrv. Un recyclage de pool interrompt les requ\u00eates en cours. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "iis",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - Gestion IIS AppCmd",
          "url": "https://learn.microsoft.com/en-us/iis/get-started/getting-started-with-iis/getting-started-with-appcmdexe"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-iis-requests",
      "basicCommandId": "iis:requests",
      "tech": "iis",
      "type": "command",
      "title": "IIS - Lire les requ\u00eates actives",
      "content": "& \"$env:windir\\System32\\inetsrv\\appcmd.exe\" list requests",
      "description": "Rep\u00e9rer les requ\u00eates lentes ou bloqu\u00e9es.",
      "example": "& \"$env:windir\\System32\\inetsrv\\appcmd.exe\" list requests",
      "vendor": "Microsoft",
      "platform": "PowerShell sur le serveur IIS avec AppCmd install\u00e9",
      "context": "PowerShell sur le serveur IIS avec AppCmd install\u00e9. Impact : Lecture sensible. AppCmd se trouve dans System32/inetsrv. Un recyclage de pool interrompt les requ\u00eates en cours. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "iis",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Gestion IIS AppCmd",
          "url": "https://learn.microsoft.com/en-us/iis/get-started/getting-started-with-iis/getting-started-with-appcmdexe"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-iis-recycle",
      "basicCommandId": "iis:recycle",
      "tech": "iis",
      "type": "command",
      "title": "IIS - Recycler un pool approuv\u00e9",
      "content": "& \"$env:windir\\System32\\inetsrv\\appcmd.exe\" recycle apppool /apppool.name:\"<POOL>\"",
      "description": "Relancer les workers du seul pool valid\u00e9.",
      "example": "& \"$env:windir\\System32\\inetsrv\\appcmd.exe\" recycle apppool /apppool.name:\"Pool-Test\"",
      "vendor": "Microsoft",
      "platform": "PowerShell sur le serveur IIS avec AppCmd install\u00e9",
      "context": "PowerShell sur le serveur IIS avec AppCmd install\u00e9. Impact : Interruption applicative. AppCmd se trouve dans System32/inetsrv. Un recyclage de pool interrompt les requ\u00eates en cours. Collecter les logs avant et v\u00e9rifier les impacts applicatifs ; pas de iisreset global. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "iis",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Gestion IIS AppCmd",
          "url": "https://learn.microsoft.com/en-us/iis/get-started/getting-started-with-iis/getting-started-with-appcmdexe"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Interruption applicative"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-outlook-safe",
      "basicCommandId": "outlook:safe",
      "tech": "outlook",
      "type": "command",
      "title": "Outlook classique - D\u00e9marrer en mode sans \u00e9chec",
      "content": "Start-Process outlook.exe -ArgumentList '/safe'",
      "description": "Tester un d\u00e9marrage sans compl\u00e9ments.",
      "example": "Start-Process outlook.exe -ArgumentList '/safe'",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows / Outlook classique",
      "context": "PowerShell Windows / Outlook classique. Impact : Lancement d'application. Les options de lancement ne s'appliquent pas au nouveau Outlook. Fermer Outlook avant le test de d\u00e9marrage. Fermer les instances Outlook ; ne pas supprimer le profil ou les fichiers de donn\u00e9es. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "outlook",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Options de lancement Outlook",
          "url": "https://support.microsoft.com/en-us/office/command-line-switches-for-microsoft-office-products-079164cd-4ef5-4178-b235-441737deb3a6"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lancement d'application"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-outlook-profiles",
      "basicCommandId": "outlook:profiles",
      "tech": "outlook",
      "type": "command",
      "title": "Outlook classique - Afficher le choix de profil",
      "content": "Start-Process outlook.exe -ArgumentList '/profiles'",
      "description": "Choisir un profil existant pour un test comparatif.",
      "example": "Start-Process outlook.exe -ArgumentList '/profiles'",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows / Outlook classique",
      "context": "PowerShell Windows / Outlook classique. Impact : Lancement d'application. Les options de lancement ne s'appliquent pas au nouveau Outlook. Fermer Outlook avant le test de d\u00e9marrage. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "outlook",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Options de lancement Outlook",
          "url": "https://support.microsoft.com/en-us/office/command-line-switches-for-microsoft-office-products-079164cd-4ef5-4178-b235-441737deb3a6"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lancement d'application"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-print-printers",
      "basicCommandId": "print:printers",
      "tech": "print",
      "type": "command",
      "title": "Impression - Lister les imprimantes du poste",
      "content": "Get-Printer | Select-Object Name,DriverName,PortName,PrinterStatus",
      "description": "Identifier file, pilote et port.",
      "example": "Get-Printer | Select-Object Name,DriverName,PortName,PrinterStatus",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows avec PrintManagement",
      "context": "PowerShell Windows avec PrintManagement. Impact : Lecture seule. Lire la file avant d'agir ; ne pas purger tous les travaux ni red\u00e9marrer le spouleur sans accord. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "print",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - PrintManagement",
          "url": "https://learn.microsoft.com/en-us/powershell/module/printmanagement/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-print-jobs",
      "basicCommandId": "print:jobs",
      "tech": "print",
      "type": "command",
      "title": "Impression - Lire les travaux d'une file",
      "content": "Get-PrintJob -PrinterName '<IMPRIMANTE>'",
      "description": "Inspecter les travaux sans les supprimer.",
      "example": "Get-PrintJob -PrinterName 'Imprimante-Test'",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows avec PrintManagement",
      "context": "PowerShell Windows avec PrintManagement. Impact : Lecture sensible. Lire la file avant d'agir ; ne pas purger tous les travaux ni red\u00e9marrer le spouleur sans accord. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "print",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - PrintManagement",
          "url": "https://learn.microsoft.com/en-us/powershell/module/printmanagement/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-print-ports",
      "basicCommandId": "print:ports",
      "tech": "print",
      "type": "command",
      "title": "Impression - Lire les ports d'imprimante",
      "content": "Get-PrinterPort | Select-Object Name,PrinterHostAddress,PortNumber",
      "description": "V\u00e9rifier la destination d'une file TCP/IP.",
      "example": "Get-PrinterPort | Select-Object Name,PrinterHostAddress,PortNumber",
      "vendor": "Microsoft",
      "platform": "PowerShell Windows avec PrintManagement",
      "context": "PowerShell Windows avec PrintManagement. Impact : Lecture seule. Lire la file avant d'agir ; ne pas purger tous les travaux ni red\u00e9marrer le spouleur sans accord. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "print",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - PrintManagement",
          "url": "https://learn.microsoft.com/en-us/powershell/module/printmanagement/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-esxi-vm-processes",
      "basicCommandId": "esxi:vm-processes",
      "tech": "esxi",
      "type": "command",
      "title": "ESXi - Lister les VM en cours",
      "content": "esxcli vm process list",
      "description": "Lire les VM actives et leurs World ID sans les arr\u00eater.",
      "example": "esxcli vm process list",
      "vendor": "VMware",
      "platform": "Shell ESXi autoris\u00e9",
      "context": "Shell ESXi autoris\u00e9. Impact : Lecture seule. SSH temporaire et droits requis. Ne pas tuer de VM ni red\u00e9marrer les agents pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "esxi",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Broadcom - ESXCLI VM",
          "url": "https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_vm.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-esxi-nics",
      "basicCommandId": "esxi:nics",
      "tech": "esxi",
      "type": "command",
      "title": "ESXi - Lister les cartes r\u00e9seau physiques",
      "content": "esxcli network nic list",
      "description": "V\u00e9rifier liens, vitesse et noms des vmnic.",
      "example": "esxcli network nic list",
      "vendor": "VMware",
      "platform": "Shell ESXi autoris\u00e9",
      "context": "Shell ESXi autoris\u00e9. Impact : Lecture seule. SSH temporaire et droits requis. Ne pas tuer de VM ni red\u00e9marrer les agents pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "esxi",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Broadcom - ESXCLI Network",
          "url": "https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-esxi-vmkernel",
      "basicCommandId": "esxi:vmkernel",
      "tech": "esxi",
      "type": "command",
      "title": "ESXi - Lire les interfaces VMkernel",
      "content": "esxcli network ip interface list",
      "description": "Identifier vmk, MTU et portgroups.",
      "example": "esxcli network ip interface list",
      "vendor": "VMware",
      "platform": "Shell ESXi autoris\u00e9",
      "context": "Shell ESXi autoris\u00e9. Impact : Lecture seule. SSH temporaire et droits requis. Ne pas tuer de VM ni red\u00e9marrer les agents pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "esxi",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Broadcom - ESXCLI Network",
          "url": "https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-esxi-ip",
      "basicCommandId": "esxi:ip",
      "tech": "esxi",
      "type": "command",
      "title": "ESXi - Lire les adresses IPv4 VMkernel",
      "content": "esxcli network ip interface ipv4 get",
      "description": "Contr\u00f4ler les adresses IPv4 des interfaces VMkernel.",
      "example": "esxcli network ip interface ipv4 get",
      "vendor": "VMware",
      "platform": "Shell ESXi autoris\u00e9",
      "context": "Shell ESXi autoris\u00e9. Impact : Lecture seule. SSH temporaire et droits requis. Ne pas tuer de VM ni red\u00e9marrer les agents pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "esxi",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Broadcom - ESXCLI Network",
          "url": "https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-esxi-routes",
      "basicCommandId": "esxi:routes",
      "tech": "esxi",
      "type": "command",
      "title": "ESXi - Lire les routes IPv4",
      "content": "esxcli network ip route ipv4 list",
      "description": "V\u00e9rifier les routes du stack courant.",
      "example": "esxcli network ip route ipv4 list",
      "vendor": "VMware",
      "platform": "Shell ESXi autoris\u00e9",
      "context": "Shell ESXi autoris\u00e9. Impact : Lecture seule. SSH temporaire et droits requis. Ne pas tuer de VM ni red\u00e9marrer les agents pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "esxi",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Broadcom - ESXCLI Network",
          "url": "https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-esxi-switches",
      "basicCommandId": "esxi:switches",
      "tech": "esxi",
      "type": "command",
      "title": "ESXi - Lister les vSwitch standards",
      "content": "esxcli network vswitch standard list",
      "description": "Lire les switches standards, MTU et uplinks.",
      "example": "esxcli network vswitch standard list",
      "vendor": "VMware",
      "platform": "Shell ESXi autoris\u00e9",
      "context": "Shell ESXi autoris\u00e9. Impact : Lecture seule. SSH temporaire et droits requis. Ne pas tuer de VM ni red\u00e9marrer les agents pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "esxi",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Broadcom - ESXCLI Network",
          "url": "https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-esxi-portgroups",
      "basicCommandId": "esxi:portgroups",
      "tech": "esxi",
      "type": "command",
      "title": "ESXi - Lire les portgroups standards",
      "content": "esxcli network vswitch standard portgroup list",
      "description": "V\u00e9rifier association au vSwitch et VLAN.",
      "example": "esxcli network vswitch standard portgroup list",
      "vendor": "VMware",
      "platform": "Shell ESXi autoris\u00e9",
      "context": "Shell ESXi autoris\u00e9. Impact : Lecture seule. SSH temporaire et droits requis. Ne pas tuer de VM ni red\u00e9marrer les agents pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "esxi",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Broadcom - ESXCLI Network",
          "url": "https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-esxi-datastores",
      "basicCommandId": "esxi:datastores",
      "tech": "esxi",
      "type": "command",
      "title": "ESXi - Lire les datastores et l'espace libre",
      "content": "esxcli storage filesystem list",
      "description": "Contr\u00f4ler montage, type et capacit\u00e9.",
      "example": "esxcli storage filesystem list",
      "vendor": "VMware",
      "platform": "Shell ESXi autoris\u00e9",
      "context": "Shell ESXi autoris\u00e9. Impact : Lecture seule. SSH temporaire et droits requis. Ne pas tuer de VM ni red\u00e9marrer les agents pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "esxi",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Broadcom - ESXCLI Storage",
          "url": "https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-esxi-paths",
      "basicCommandId": "esxi:paths",
      "tech": "esxi",
      "type": "command",
      "title": "ESXi - Lire les chemins de stockage",
      "content": "esxcli storage core path list",
      "description": "Rep\u00e9rer un chemin storage d\u00e9grad\u00e9.",
      "example": "esxcli storage core path list",
      "vendor": "VMware",
      "platform": "Shell ESXi autoris\u00e9",
      "context": "Shell ESXi autoris\u00e9. Impact : Lecture seule. SSH temporaire et droits requis. Ne pas tuer de VM ni red\u00e9marrer les agents pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "esxi",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Broadcom - ESXCLI Storage",
          "url": "https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-vcenter-services",
      "basicCommandId": "vcenter:services",
      "tech": "vcenter",
      "type": "command",
      "title": "VCSA - Lire l'\u00e9tat de tous les services",
      "content": "service-control --status --all",
      "description": "Identifier les composants arr\u00eat\u00e9s ou en erreur.",
      "example": "service-control --status --all",
      "vendor": "VMware",
      "platform": "VCSA - Appliance Shell pour service-control ; Bash pour df / tail",
      "context": "VCSA - Appliance Shell pour service-control ; Bash pour df / tail. Impact : Lecture seule. Il n'existe pas d'option service-control --restart ; cibler un service approuv\u00e9 plut\u00f4t que toute la plateforme. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "vcenter",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Broadcom - Gestion des services VCSA",
          "url": "https://knowledge.broadcom.com/external/article?legacyId=2147152"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-vcenter-list",
      "basicCommandId": "vcenter:list",
      "tech": "vcenter",
      "type": "command",
      "title": "VCSA - Lister les noms des services",
      "content": "service-control --list",
      "description": "Retrouver le nom exact d'un service avant de le cibler.",
      "example": "service-control --list",
      "vendor": "VMware",
      "platform": "VCSA - Appliance Shell pour service-control ; Bash pour df / tail",
      "context": "VCSA - Appliance Shell pour service-control ; Bash pour df / tail. Impact : Lecture seule. Il n'existe pas d'option service-control --restart ; cibler un service approuv\u00e9 plut\u00f4t que toute la plateforme. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "vcenter",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Broadcom - Gestion des services VCSA",
          "url": "https://knowledge.broadcom.com/external/article?legacyId=2147152"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-vcenter-service",
      "basicCommandId": "vcenter:service",
      "tech": "vcenter",
      "type": "command",
      "title": "VCSA - Lire l'\u00e9tat d'un service",
      "content": "service-control --status <SERVICE>",
      "description": "Interroger un composant pr\u00e9cis de vCenter.",
      "example": "service-control --status vmware-vpxd",
      "vendor": "VMware",
      "platform": "VCSA - Appliance Shell pour service-control ; Bash pour df / tail",
      "context": "VCSA - Appliance Shell pour service-control ; Bash pour df / tail. Impact : Lecture seule. Il n'existe pas d'option service-control --restart ; cibler un service approuv\u00e9 plut\u00f4t que toute la plateforme. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "vcenter",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Broadcom - Gestion des services VCSA",
          "url": "https://knowledge.broadcom.com/external/article?legacyId=2147152"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-vcenter-start",
      "basicCommandId": "vcenter:start",
      "tech": "vcenter",
      "type": "command",
      "title": "VCSA - D\u00e9marrer un service approuv\u00e9",
      "content": "service-control --start <SERVICE>",
      "description": "D\u00e9marrer le seul composant valid\u00e9.",
      "example": "service-control --start vmware-vpxd",
      "vendor": "VMware",
      "platform": "VCSA - Appliance Shell pour service-control ; Bash pour df / tail",
      "context": "VCSA - Appliance Shell pour service-control ; Bash pour df / tail. Impact : Action sur service. Il n'existe pas d'option service-control --restart ; cibler un service approuv\u00e9 plut\u00f4t que toute la plateforme. V\u00e9rifier les d\u00e9pendances et la cause de l'arr\u00eat. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "vcenter",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Broadcom - Gestion des services VCSA",
          "url": "https://knowledge.broadcom.com/external/article?legacyId=2147152"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Action sur service"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-vcenter-disk",
      "basicCommandId": "vcenter:disk",
      "tech": "vcenter",
      "type": "command",
      "title": "VCSA - Lire l'espace des partitions",
      "content": "df -h",
      "description": "Rep\u00e9rer une partition satur\u00e9e depuis Bash.",
      "example": "df -h",
      "vendor": "VMware",
      "platform": "VCSA - Appliance Shell pour service-control ; Bash pour df / tail",
      "context": "VCSA - Appliance Shell pour service-control ; Bash pour df / tail. Impact : Lecture seule. Il n'existe pas d'option service-control --restart ; cibler un service approuv\u00e9 plut\u00f4t que toute la plateforme. Ne pas supprimer des fichiers de base pour lib\u00e9rer l'espace. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "vcenter",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "GNU - Outils de base",
          "url": "https://www.gnu.org/software/coreutils/manual/coreutils.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-vcenter-logs",
      "basicCommandId": "vcenter:logs",
      "tech": "vcenter",
      "type": "command",
      "title": "VCSA - Lire les derniers messages vpxd",
      "content": "tail -n 100 /var/log/vmware/vpxd/vpxd.log",
      "description": "Lire le journal vCenter depuis Bash.",
      "example": "tail -n 100 /var/log/vmware/vpxd/vpxd.log",
      "vendor": "VMware",
      "platform": "VCSA - Appliance Shell pour service-control ; Bash pour df / tail",
      "context": "VCSA - Appliance Shell pour service-control ; Bash pour df / tail. Impact : Lecture sensible. Il n'existe pas d'option service-control --restart ; cibler un service approuv\u00e9 plut\u00f4t que toute la plateforme. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "vcenter",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "GNU - Outils de base",
          "url": "https://www.gnu.org/software/coreutils/manual/coreutils.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-docker-all",
      "basicCommandId": "docker:all",
      "tech": "docker",
      "type": "command",
      "title": "Docker - Lister tous les conteneurs",
      "content": "docker ps -a",
      "description": "Voir aussi les conteneurs arr\u00eat\u00e9s.",
      "example": "docker ps -a",
      "vendor": "Docker",
      "platform": "CLI Docker - bon contexte / daemon",
      "context": "CLI Docker - bon contexte / daemon. Impact : Lecture seule. L'acc\u00e8s au daemon donne des privil\u00e8ges \u00e9lev\u00e9s. Les logs et inspections peuvent contenir des secrets. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "docker",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Docker - Commandes conteneurs",
          "url": "https://docs.docker.com/reference/cli/docker/container/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-docker-logs",
      "basicCommandId": "docker:logs",
      "tech": "docker",
      "type": "command",
      "title": "Docker - Lire les derniers logs d'un conteneur",
      "content": "docker logs --tail 100 --timestamps <CONTENEUR>",
      "description": "Lire une sortie born\u00e9e du conteneur cibl\u00e9.",
      "example": "docker logs --tail 100 --timestamps app-test",
      "vendor": "Docker",
      "platform": "CLI Docker - bon contexte / daemon",
      "context": "CLI Docker - bon contexte / daemon. Impact : Lecture sensible. L'acc\u00e8s au daemon donne des privil\u00e8ges \u00e9lev\u00e9s. Les logs et inspections peuvent contenir des secrets. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "docker",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Docker - Commandes conteneurs",
          "url": "https://docs.docker.com/reference/cli/docker/container/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-docker-stats",
      "basicCommandId": "docker:stats",
      "tech": "docker",
      "type": "command",
      "title": "Docker - Lire la consommation des conteneurs",
      "content": "docker stats --no-stream",
      "description": "Prendre un instantan\u00e9 des ressources.",
      "example": "docker stats --no-stream",
      "vendor": "Docker",
      "platform": "CLI Docker - bon contexte / daemon",
      "context": "CLI Docker - bon contexte / daemon. Impact : Lecture seule. L'acc\u00e8s au daemon donne des privil\u00e8ges \u00e9lev\u00e9s. Les logs et inspections peuvent contenir des secrets. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "docker",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Docker - Commandes conteneurs",
          "url": "https://docs.docker.com/reference/cli/docker/container/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-docker-networks",
      "basicCommandId": "docker:networks",
      "tech": "docker",
      "type": "command",
      "title": "Docker - Lister les r\u00e9seaux",
      "content": "docker network ls",
      "description": "Identifier les bridges et r\u00e9seaux d\u00e9clar\u00e9s.",
      "example": "docker network ls",
      "vendor": "Docker",
      "platform": "CLI Docker - bon contexte / daemon",
      "context": "CLI Docker - bon contexte / daemon. Impact : Lecture seule. L'acc\u00e8s au daemon donne des privil\u00e8ges \u00e9lev\u00e9s. Les logs et inspections peuvent contenir des secrets. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "docker",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Docker - Commandes r\u00e9seau",
          "url": "https://docs.docker.com/reference/cli/docker/network/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-docker-network-detail",
      "basicCommandId": "docker:network-detail",
      "tech": "docker",
      "type": "command",
      "title": "Docker - Lire un r\u00e9seau cibl\u00e9",
      "content": "docker network inspect <RESEAU>",
      "description": "Consulter sous-r\u00e9seau, passerelle et conteneurs raccord\u00e9s.",
      "example": "docker network inspect app-test",
      "vendor": "Docker",
      "platform": "CLI Docker - bon contexte / daemon",
      "context": "CLI Docker - bon contexte / daemon. Impact : Lecture sensible. L'acc\u00e8s au daemon donne des privil\u00e8ges \u00e9lev\u00e9s. Les logs et inspections peuvent contenir des secrets. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "docker",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Docker - Commandes r\u00e9seau",
          "url": "https://docs.docker.com/reference/cli/docker/network/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-docker-start",
      "basicCommandId": "docker:start",
      "tech": "docker",
      "type": "command",
      "title": "Docker - D\u00e9marrer un conteneur existant",
      "content": "docker start <CONTENEUR>",
      "description": "D\u00e9marrer le conteneur pr\u00e9vu sans cr\u00e9er une nouvelle instance.",
      "example": "docker start app-test",
      "vendor": "Docker",
      "platform": "CLI Docker - bon contexte / daemon",
      "context": "CLI Docker - bon contexte / daemon. Impact : Action applicative. L'acc\u00e8s au daemon donne des privil\u00e8ges \u00e9lev\u00e9s. Les logs et inspections peuvent contenir des secrets. Valider volumes, ports et environnement avant lancement. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "docker",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Docker - Commandes conteneurs",
          "url": "https://docs.docker.com/reference/cli/docker/container/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Action applicative"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-docker-stop",
      "basicCommandId": "docker:stop",
      "tech": "docker",
      "type": "command",
      "title": "Docker - Arr\u00eater proprement un conteneur",
      "content": "docker stop --time 30 <CONTENEUR>",
      "description": "Laisser un d\u00e9lai d'arr\u00eat au processus applicatif.",
      "example": "docker stop --time 30 app-test",
      "vendor": "Docker",
      "platform": "CLI Docker - bon contexte / daemon",
      "context": "CLI Docker - bon contexte / daemon. Impact : Interruption applicative. L'acc\u00e8s au daemon donne des privil\u00e8ges \u00e9lev\u00e9s. Les logs et inspections peuvent contenir des secrets. Intervention approuv\u00e9e ; le processus peut \u00eatre tu\u00e9 apr\u00e8s expiration du d\u00e9lai. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "docker",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Docker - Commandes conteneurs",
          "url": "https://docs.docker.com/reference/cli/docker/container/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Interruption applicative"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-k8s-contexts",
      "basicCommandId": "k8s:contexts",
      "tech": "k8s",
      "type": "command",
      "title": "Kubernetes - Lister les contextes configur\u00e9s",
      "content": "kubectl config get-contexts",
      "description": "Identifier les clusters avant toute commande.",
      "example": "kubectl config get-contexts",
      "vendor": "Kubernetes",
      "platform": "kubectl - bon contexte et namespace",
      "context": "kubectl - bon contexte et namespace. Impact : Lecture seule. V\u00e9rifier le contexte avant l'action. Les logs peuvent contenir des secrets ; ne pas exporter les Secret pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "k8s",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Kubernetes - R\u00e9f\u00e9rence kubectl",
          "url": "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-k8s-namespaces",
      "basicCommandId": "k8s:namespaces",
      "tech": "k8s",
      "type": "command",
      "title": "Kubernetes - Lister les namespaces",
      "content": "kubectl get namespaces",
      "description": "Retrouver le namespace de l'application.",
      "example": "kubectl get namespaces",
      "vendor": "Kubernetes",
      "platform": "kubectl - bon contexte et namespace",
      "context": "kubectl - bon contexte et namespace. Impact : Lecture seule. V\u00e9rifier le contexte avant l'action. Les logs peuvent contenir des secrets ; ne pas exporter les Secret pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "k8s",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Kubernetes - R\u00e9f\u00e9rence kubectl",
          "url": "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-k8s-workloads",
      "basicCommandId": "k8s:workloads",
      "tech": "k8s",
      "type": "command",
      "title": "Kubernetes - Lire les workloads d'un namespace",
      "content": "kubectl get deployments,pods,services -n <NAMESPACE> -o wide",
      "description": "Comparer d\u00e9ploiements, pods et services d'une application.",
      "example": "kubectl get deployments,pods,services -n test -o wide",
      "vendor": "Kubernetes",
      "platform": "kubectl - bon contexte et namespace",
      "context": "kubectl - bon contexte et namespace. Impact : Lecture seule. V\u00e9rifier le contexte avant l'action. Les logs peuvent contenir des secrets ; ne pas exporter les Secret pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "k8s",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Kubernetes - R\u00e9f\u00e9rence kubectl",
          "url": "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-k8s-describe",
      "basicCommandId": "k8s:describe",
      "tech": "k8s",
      "type": "command",
      "title": "Kubernetes - Lire les d\u00e9tails d'un pod",
      "content": "kubectl describe pod <POD> -n <NAMESPACE>",
      "description": "Examiner \u00e9v\u00e9nements, volumes et \u00e9tat du pod.",
      "example": "kubectl describe pod app-test-123 -n test",
      "vendor": "Kubernetes",
      "platform": "kubectl - bon contexte et namespace",
      "context": "kubectl - bon contexte et namespace. Impact : Lecture sensible. V\u00e9rifier le contexte avant l'action. Les logs peuvent contenir des secrets ; ne pas exporter les Secret pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "k8s",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Kubernetes - R\u00e9f\u00e9rence kubectl",
          "url": "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-k8s-logs",
      "basicCommandId": "k8s:logs",
      "tech": "k8s",
      "type": "command",
      "title": "Kubernetes - Lire les logs d'un conteneur",
      "content": "kubectl logs <POD> -n <NAMESPACE> -c <CONTENEUR> --tail=100 --timestamps=true",
      "description": "Lire une fen\u00eatre born\u00e9e de logs.",
      "example": "kubectl logs app-test-123 -n test -c app --tail=100 --timestamps=true",
      "vendor": "Kubernetes",
      "platform": "kubectl - bon contexte et namespace",
      "context": "kubectl - bon contexte et namespace. Impact : Lecture sensible. V\u00e9rifier le contexte avant l'action. Les logs peuvent contenir des secrets ; ne pas exporter les Secret pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "k8s",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Kubernetes - R\u00e9f\u00e9rence kubectl",
          "url": "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-k8s-events",
      "basicCommandId": "k8s:events",
      "tech": "k8s",
      "type": "command",
      "title": "Kubernetes - Lire les \u00e9v\u00e9nements r\u00e9cents",
      "content": "kubectl get events -n <NAMESPACE> --sort-by=.metadata.creationTimestamp",
      "description": "Corr\u00e9ler scheduling, images et readiness.",
      "example": "kubectl get events -n test --sort-by=.metadata.creationTimestamp",
      "vendor": "Kubernetes",
      "platform": "kubectl - bon contexte et namespace",
      "context": "kubectl - bon contexte et namespace. Impact : Lecture seule. V\u00e9rifier le contexte avant l'action. Les logs peuvent contenir des secrets ; ne pas exporter les Secret pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "k8s",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Kubernetes - R\u00e9f\u00e9rence kubectl",
          "url": "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-k8s-endpoints",
      "basicCommandId": "k8s:endpoints",
      "tech": "k8s",
      "type": "command",
      "title": "Kubernetes - Lire les EndpointSlices d'un service",
      "content": "kubectl get endpointslices -n <NAMESPACE> -l kubernetes.io/service-name=<SERVICE>",
      "description": "V\u00e9rifier les endpoints publi\u00e9s par le service.",
      "example": "kubectl get endpointslices -n test -l kubernetes.io/service-name=app",
      "vendor": "Kubernetes",
      "platform": "kubectl - bon contexte et namespace",
      "context": "kubectl - bon contexte et namespace. Impact : Lecture seule. V\u00e9rifier le contexte avant l'action. Les logs peuvent contenir des secrets ; ne pas exporter les Secret pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "k8s",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Kubernetes - R\u00e9f\u00e9rence kubectl",
          "url": "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-k8s-rollout",
      "basicCommandId": "k8s:rollout",
      "tech": "k8s",
      "type": "command",
      "title": "Kubernetes - Lire l'avancement d'un d\u00e9ploiement",
      "content": "kubectl rollout status deployment/<DEPLOIEMENT> -n <NAMESPACE> --timeout=60s",
      "description": "Attendre un r\u00e9sultat born\u00e9 sans modifier le workload.",
      "example": "kubectl rollout status deployment/app -n test --timeout=60s",
      "vendor": "Kubernetes",
      "platform": "kubectl - bon contexte et namespace",
      "context": "kubectl - bon contexte et namespace. Impact : Lecture seule. V\u00e9rifier le contexte avant l'action. Les logs peuvent contenir des secrets ; ne pas exporter les Secret pour un inventaire. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "k8s",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Kubernetes - R\u00e9f\u00e9rence kubectl",
          "url": "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-k8s-dryrun",
      "basicCommandId": "k8s:dryrun",
      "tech": "k8s",
      "type": "command",
      "title": "Kubernetes - Valider un manifeste c\u00f4t\u00e9 serveur",
      "content": "kubectl apply --dry-run=server -f <MANIFESTE>",
      "description": "Valider le manifeste avec l'API et les admission controllers sans persister l'objet.",
      "example": "kubectl apply --dry-run=server -f app-test.yaml",
      "vendor": "Kubernetes",
      "platform": "kubectl - bon contexte et namespace",
      "context": "kubectl - bon contexte et namespace. Impact : Validation API. V\u00e9rifier le contexte avant l'action. Les logs peuvent contenir des secrets ; ne pas exporter les Secret pour un inventaire. V\u00e9rifier contexte, namespace et contenu ; cette commande contacte le cluster. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "k8s",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Kubernetes - R\u00e9f\u00e9rence kubectl",
          "url": "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Validation API"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-dns-mx",
      "basicCommandId": "dns:mx",
      "tech": "dns",
      "type": "command",
      "title": "DNS - Lire les serveurs de messagerie d'un domaine",
      "content": "dig @<DNS> <DOMAINE> MX +noall +answer",
      "description": "V\u00e9rifier les enregistrements MX.",
      "example": "dig @192.0.2.53 example.test MX +noall +answer",
      "vendor": "ISC / Microsoft",
      "platform": "dig depuis Linux ou Resolve-DnsName depuis Windows",
      "context": "dig depuis Linux ou Resolve-DnsName depuis Windows. Impact : Sonde DNS. Choisir le serveur DNS attendu ; un test DNS ne modifie pas la zone. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "dns",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "ISC BIND - Manuel dig",
          "url": "https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde DNS"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-dns-txt",
      "basicCommandId": "dns:txt",
      "tech": "dns",
      "type": "command",
      "title": "DNS - Lire les enregistrements TXT",
      "content": "dig @<DNS> <NOM> TXT +noall +answer",
      "description": "Contr\u00f4ler SPF ou un TXT attendu.",
      "example": "dig @192.0.2.53 example.test TXT +noall +answer",
      "vendor": "ISC / Microsoft",
      "platform": "dig depuis Linux ou Resolve-DnsName depuis Windows",
      "context": "dig depuis Linux ou Resolve-DnsName depuis Windows. Impact : Sonde DNS. Choisir le serveur DNS attendu ; un test DNS ne modifie pas la zone. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "dns",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "ISC BIND - Manuel dig",
          "url": "https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde DNS"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-dns-ptr",
      "basicCommandId": "dns:ptr",
      "tech": "dns",
      "type": "command",
      "title": "DNS - Lire la r\u00e9solution inverse d'une IP",
      "content": "dig @<DNS> -x <IP> +noall +answer",
      "description": "Contr\u00f4ler l'enregistrement PTR.",
      "example": "dig @192.0.2.53 -x 192.0.2.10 +noall +answer",
      "vendor": "ISC / Microsoft",
      "platform": "dig depuis Linux ou Resolve-DnsName depuis Windows",
      "context": "dig depuis Linux ou Resolve-DnsName depuis Windows. Impact : Sonde DNS. Choisir le serveur DNS attendu ; un test DNS ne modifie pas la zone. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "dns",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "ISC BIND - Manuel dig",
          "url": "https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde DNS"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-dns-srv",
      "basicCommandId": "dns:srv",
      "tech": "dns",
      "type": "command",
      "title": "DNS - Lire un enregistrement SRV",
      "content": "dig @<DNS> <NOM_SRV> SRV +noall +answer",
      "description": "V\u00e9rifier cibles, ports et priorit\u00e9s du service.",
      "example": "dig @192.0.2.53 _ldap._tcp.example.test SRV +noall +answer",
      "vendor": "ISC / Microsoft",
      "platform": "dig depuis Linux ou Resolve-DnsName depuis Windows",
      "context": "dig depuis Linux ou Resolve-DnsName depuis Windows. Impact : Sonde DNS. Choisir le serveur DNS attendu ; un test DNS ne modifie pas la zone. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "dns",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "ISC BIND - Manuel dig",
          "url": "https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde DNS"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-efficientip-mx",
      "basicCommandId": "efficientip:mx",
      "tech": "efficientip",
      "type": "command",
      "title": "SOLIDserver - Tester les enregistrements MX",
      "content": "dig @<DNS_SOLIDSERVER> <DOMAINE> MX +time=2 +tries=1",
      "description": "Lire MX depuis le poste de diagnostic.",
      "example": "dig @192.0.2.53 example.test MX +time=2 +tries=1",
      "vendor": "EfficientIP",
      "platform": "Poste Linux de diagnostic - requ\u00eates au serveur DNS SOLIDserver",
      "context": "Poste Linux de diagnostic - requ\u00eates au serveur DNS SOLIDserver. Impact : Sonde DNS. Ces commandes sont des tests DNS externes, pas une CLI d'administration SOLIDserver. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "efficientip",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "ISC BIND - Manuel dig",
          "url": "https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde DNS"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-efficientip-txt",
      "basicCommandId": "efficientip:txt",
      "tech": "efficientip",
      "type": "command",
      "title": "SOLIDserver - Tester un enregistrement TXT",
      "content": "dig @<DNS_SOLIDSERVER> <NOM> TXT +time=2 +tries=1",
      "description": "V\u00e9rifier un TXT sur le serveur attendu.",
      "example": "dig @192.0.2.53 example.test TXT +time=2 +tries=1",
      "vendor": "EfficientIP",
      "platform": "Poste Linux de diagnostic - requ\u00eates au serveur DNS SOLIDserver",
      "context": "Poste Linux de diagnostic - requ\u00eates au serveur DNS SOLIDserver. Impact : Sonde DNS. Ces commandes sont des tests DNS externes, pas une CLI d'administration SOLIDserver. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "efficientip",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "ISC BIND - Manuel dig",
          "url": "https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde DNS"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-web-get",
      "basicCommandId": "web:get",
      "tech": "web",
      "type": "command",
      "title": "curl - Lire une r\u00e9ponse HTTPS avec d\u00e9lais born\u00e9s",
      "content": "curl --fail --silent --show-error --connect-timeout 5 --max-time 15 \"https://<HOTE>/<CHEMIN>\"",
      "description": "Lire une URL pr\u00e9cise avec v\u00e9rification TLS.",
      "example": "curl --fail --silent --show-error --connect-timeout 5 --max-time 15 https://app.example.test/health",
      "vendor": "curl",
      "platform": "curl depuis le poste de diagnostic",
      "context": "curl depuis le poste de diagnostic. Impact : Requ\u00eate HTTP. Conserver la v\u00e9rification TLS ; utiliser une CA approuv\u00e9e plut\u00f4t que -k. Ne pas exposer de jeton dans les exports. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "web",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "curl - Manuel",
          "url": "https://curl.se/docs/manpage.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Requ\u00eate HTTP"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-web-redirects",
      "basicCommandId": "web:redirects",
      "tech": "web",
      "type": "command",
      "title": "curl - Lire une cha\u00eene de redirections",
      "content": "curl --head --location --max-redirs 5 --max-time 15 \"https://<HOTE>/\"",
      "description": "Observer les redirections HTTPS born\u00e9es.",
      "example": "curl --head --location --max-redirs 5 --max-time 15 https://app.example.test/",
      "vendor": "curl",
      "platform": "curl depuis le poste de diagnostic",
      "context": "curl depuis le poste de diagnostic. Impact : Requ\u00eates HTTP. Conserver la v\u00e9rification TLS ; utiliser une CA approuv\u00e9e plut\u00f4t que -k. Ne pas exposer de jeton dans les exports. Ne pas ajouter --location-trusted avec des identifiants. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "web",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "curl - Manuel",
          "url": "https://curl.se/docs/manpage.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Requ\u00eates HTTP"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-web-basic-auth",
      "basicCommandId": "web:basic-auth",
      "tech": "web",
      "type": "command",
      "title": "curl - Tester une URL avec authentification interactive",
      "content": "curl --fail --user \"<UTILISATEUR>\" --connect-timeout 5 --max-time 15 \"https://<HOTE>/<CHEMIN>\"",
      "description": "Laisser curl demander le mot de passe sans le stocker dans la commande.",
      "example": "curl --fail --user 'api-reader' --connect-timeout 5 --max-time 15 https://app.example.test/status",
      "vendor": "curl",
      "platform": "curl depuis le poste de diagnostic",
      "context": "curl depuis le poste de diagnostic. Impact : Requ\u00eate authentifi\u00e9e. Conserver la v\u00e9rification TLS ; utiliser une CA approuv\u00e9e plut\u00f4t que -k. Ne pas exposer de jeton dans les exports. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "web",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "curl - Manuel",
          "url": "https://curl.se/docs/manpage.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Requ\u00eate authentifi\u00e9e"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-tls-verify",
      "basicCommandId": "tls:verify",
      "tech": "tls",
      "type": "command",
      "title": "TLS - V\u00e9rifier cha\u00eene et nom du serveur",
      "content": "openssl s_client -connect <HOTE>:443 -servername <HOTE> -verify_hostname <HOTE> -verify_return_error -brief",
      "description": "Contr\u00f4ler le nom et la confiance du serveur.",
      "example": "openssl s_client -connect app.example.test:443 -servername app.example.test -verify_hostname app.example.test -verify_return_error -brief",
      "vendor": "OpenSSL",
      "platform": "OpenSSL sur le poste de diagnostic",
      "context": "OpenSSL sur le poste de diagnostic. Impact : Sonde TLS. La n\u00e9gociation cr\u00e9e une connexion. Ne pas confondre certificat affich\u00e9 et validation de la cha\u00eene. Utiliser un magasin CA adapt\u00e9 au poste ; ajouter -CAfile pour une CA priv\u00e9e approuv\u00e9e. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "tls",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "OpenSSL - s_client",
          "url": "https://docs.openssl.org/master/man1/openssl-s_client/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde TLS"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ssh-connect",
      "basicCommandId": "ssh:connect",
      "tech": "ssh",
      "type": "command",
      "title": "SSH - Ouvrir une session distante",
      "content": "ssh <UTILISATEUR>@<HOTE>",
      "description": "Se connecter au compte et \u00e0 l'h\u00f4te autoris\u00e9s.",
      "example": "ssh admin@serveur.example.test",
      "vendor": "OpenSSH",
      "platform": "Terminal OpenSSH",
      "context": "Terminal OpenSSH. Impact : Connexion authentifi\u00e9e. V\u00e9rifier l'empreinte h\u00f4te via un canal de confiance ; ne pas d\u00e9sactiver StrictHostKeyChecking. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ssh",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "OpenSSH - ssh",
          "url": "https://man.openbsd.org/ssh"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Connexion authentifi\u00e9e"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ssh-port",
      "basicCommandId": "ssh:port",
      "tech": "ssh",
      "type": "command",
      "title": "SSH - Utiliser un port et une cl\u00e9 sp\u00e9cifiques",
      "content": "ssh -p <PORT> -i <CLE_PRIVEE> <UTILISATEUR>@<HOTE>",
      "description": "Choisir une identit\u00e9 et un port explicites.",
      "example": "ssh -p 2222 -i ~/.ssh/id_ed25519 admin@serveur.example.test",
      "vendor": "OpenSSH",
      "platform": "Terminal OpenSSH",
      "context": "Terminal OpenSSH. Impact : Connexion authentifi\u00e9e. V\u00e9rifier l'empreinte h\u00f4te via un canal de confiance ; ne pas d\u00e9sactiver StrictHostKeyChecking. La cl\u00e9 priv\u00e9e reste sur le poste et doit \u00eatre prot\u00e9g\u00e9e. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ssh",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "OpenSSH - ssh",
          "url": "https://man.openbsd.org/ssh"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Connexion authentifi\u00e9e"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ssh-verbose",
      "basicCommandId": "ssh:verbose",
      "tech": "ssh",
      "type": "command",
      "title": "SSH - Diagnostiquer la connexion",
      "content": "ssh -v -o ConnectTimeout=10 <UTILISATEUR>@<HOTE>",
      "description": "Voir l'\u00e9tape de connexion et d'authentification qui \u00e9choue.",
      "example": "ssh -v -o ConnectTimeout=10 admin@serveur.example.test",
      "vendor": "OpenSSH",
      "platform": "Terminal OpenSSH",
      "context": "Terminal OpenSSH. Impact : Connexion et logs sensibles. V\u00e9rifier l'empreinte h\u00f4te via un canal de confiance ; ne pas d\u00e9sactiver StrictHostKeyChecking. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ssh",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "OpenSSH - ssh",
          "url": "https://man.openbsd.org/ssh"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Connexion et logs sensibles"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ssh-copy",
      "basicCommandId": "ssh:copy",
      "tech": "ssh",
      "type": "command",
      "title": "SCP - Copier un fichier vers un serveur",
      "content": "scp <FICHIER_LOCAL> <UTILISATEUR>@<HOTE>:<CHEMIN_DISTANT>",
      "description": "Transf\u00e9rer un fichier par SSH.",
      "example": "scp rapport.txt admin@serveur.example.test:/home/admin/rapport-test.txt",
      "vendor": "OpenSSH",
      "platform": "Terminal OpenSSH",
      "context": "Terminal OpenSSH. Impact : \u00c9criture distante. V\u00e9rifier l'empreinte h\u00f4te via un canal de confiance ; ne pas d\u00e9sactiver StrictHostKeyChecking. Choisir un nom destination libre ; scp peut \u00e9craser un fichier existant. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ssh",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "OpenSSH - scp",
          "url": "https://man.openbsd.org/scp"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "\u00c9criture distante"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-captures-read",
      "basicCommandId": "captures:read",
      "tech": "captures",
      "type": "command",
      "title": "tcpdump - Lire un PCAP sans r\u00e9solution DNS",
      "content": "tcpdump -nn -r <FICHIER_PCAP>",
      "description": "Inspecter une capture existante sans capturer le r\u00e9seau.",
      "example": "tcpdump -nn -r incident.pcap",
      "vendor": "Wireshark / tcpdump",
      "platform": "Poste de diagnostic avec acc\u00e8s \u00e0 l'interface ou au PCAP",
      "context": "Poste de diagnostic avec acc\u00e8s \u00e0 l'interface ou au PCAP. Impact : Lecture sensible. Limiter volume et dur\u00e9e ; une capture contient des donn\u00e9es sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "captures",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "tcpdump - Manuel",
          "url": "https://www.tcpdump.org/manpages/tcpdump.1.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-captures-write",
      "basicCommandId": "captures:write",
      "tech": "captures",
      "type": "command",
      "title": "tcpdump - Enregistrer une capture cibl\u00e9e",
      "content": "tcpdump -ni <INTERFACE> -c 100 -w <FICHIER_PCAP> host <IP>",
      "description": "Conserver au plus cent paquets du flux choisi.",
      "example": "tcpdump -ni eth0 -c 100 -w incident-test.pcap host 192.0.2.10",
      "vendor": "Wireshark / tcpdump",
      "platform": "Poste de diagnostic avec acc\u00e8s \u00e0 l'interface ou au PCAP",
      "context": "Poste de diagnostic avec acc\u00e8s \u00e0 l'interface ou au PCAP. Impact : Capture et fichier sensibles. Limiter volume et dur\u00e9e ; une capture contient des donn\u00e9es sensibles. Compteur de paquets, pas dur\u00e9e ; Ctrl+C si attente prolong\u00e9e. Nom de fichier libre. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "captures",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "tcpdump - Manuel",
          "url": "https://www.tcpdump.org/manpages/tcpdump.1.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Capture et fichier sensibles"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-captures-tshark-fields",
      "basicCommandId": "captures:tshark-fields",
      "tech": "captures",
      "type": "command",
      "title": "TShark - Extraire les endpoints et ports d'un PCAP",
      "content": "tshark -r <FICHIER_PCAP> -Y tcp -T fields -e frame.number -e ip.src -e tcp.srcport -e ip.dst -e tcp.dstport",
      "description": "Extraire une vue tabulaire des communications TCP.",
      "example": "tshark -r incident.pcap -Y tcp -T fields -e frame.number -e ip.src -e tcp.srcport -e ip.dst -e tcp.dstport",
      "vendor": "Wireshark / tcpdump",
      "platform": "Poste de diagnostic avec acc\u00e8s \u00e0 l'interface ou au PCAP",
      "context": "Poste de diagnostic avec acc\u00e8s \u00e0 l'interface ou au PCAP. Impact : Lecture sensible. Limiter volume et dur\u00e9e ; une capture contient des donn\u00e9es sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "captures",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Wireshark - TShark",
          "url": "https://www.wireshark.org/docs/man-pages/tshark.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-smb-connections",
      "basicCommandId": "smb:connections",
      "tech": "smb",
      "type": "command",
      "title": "Windows SMB - Lire les connexions du client",
      "content": "Get-SmbConnection | Select-Object ServerName,ShareName,UserName,Dialect,NumOpens",
      "description": "V\u00e9rifier le serveur et le partage r\u00e9ellement utilis\u00e9s.",
      "example": "Get-SmbConnection | Select-Object ServerName,ShareName,UserName,Dialect,NumOpens",
      "vendor": "Microsoft / Samba",
      "platform": "PowerShell Windows ou smbclient Linux selon la commande",
      "context": "PowerShell Windows ou smbclient Linux selon la commande. Impact : Lecture sensible. Les permissions du partage et NTFS s'appliquent ensemble ; ne jamais saisir le mot de passe dans la commande. PowerShell Windows ; ce n'est pas une commande smbclient. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "smb",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - SMB PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/smbshare/get-smbconnection"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-smb-sessions",
      "basicCommandId": "smb:sessions",
      "tech": "smb",
      "type": "command",
      "title": "Windows SMB - Lire les sessions du serveur",
      "content": "Get-SmbSession | Select-Object ClientComputerName,ClientUserName,NumOpens",
      "description": "Identifier les clients actifs sans les d\u00e9connecter.",
      "example": "Get-SmbSession | Select-Object ClientComputerName,ClientUserName,NumOpens",
      "vendor": "Microsoft / Samba",
      "platform": "PowerShell Windows ou smbclient Linux selon la commande",
      "context": "PowerShell Windows ou smbclient Linux selon la commande. Impact : Lecture sensible. Les permissions du partage et NTFS s'appliquent ensemble ; ne jamais saisir le mot de passe dans la commande. Sur le serveur de fichiers Windows avec droits requis. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "smb",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - SMB PowerShell",
          "url": "https://learn.microsoft.com/en-us/powershell/module/smbshare/get-smbconnection"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ldap-user",
      "basicCommandId": "ldap:user",
      "tech": "ldap",
      "type": "command",
      "title": "LDAP - Lire un compte pr\u00e9cis via LDAPS",
      "content": "ldapsearch -LLL -x -H ldaps://<CONTROLEUR_AD>:636 -D '<UPN_LECTURE>' -W -b '<BASE_DN>' -s sub -z 10 '(sAMAccountName=<UTILISATEUR>)' dn cn memberOf",
      "description": "Limiter la recherche aux attributs d'un compte cibl\u00e9.",
      "example": "ldapsearch -LLL -x -H ldaps://dc01.example.test:636 -D 'reader@example.test' -W -b 'DC=example,DC=test' -s sub -z 10 '(sAMAccountName=user-test)' dn cn memberOf",
      "vendor": "OpenLDAP",
      "platform": "ldapsearch - poste de diagnostic",
      "context": "ldapsearch - poste de diagnostic. Impact : Lecture r\u00e9seau sensible. V\u00e9rifier TLS ; -W demande le mot de passe de mani\u00e8re interactive. Filtre et base limit\u00e9s au p\u00e9rim\u00e8tre autoris\u00e9. Compte et CA configur\u00e9s ; le filtre ci-dessus est propre \u00e0 Active Directory. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ldap",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "OpenLDAP - ldapsearch",
          "url": "https://www.openldap.org/software/man.cgi?query=ldapsearch&sektion=1"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture r\u00e9seau sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-snmp-uptime",
      "basicCommandId": "snmp:uptime",
      "tech": "snmp",
      "type": "command",
      "title": "SNMPv3 - Lire le temps de fonctionnement de l'agent",
      "content": "snmpget -v 3 -l authPriv -t 2 -r 1 <AGENT> .1.3.6.1.2.1.1.3.0",
      "description": "Lire sysUpTime avec le profil local prot\u00e9g\u00e9.",
      "example": "snmpget -v 3 -l authPriv -t 2 -r 1 192.0.2.10 .1.3.6.1.2.1.1.3.0",
      "vendor": "Net-SNMP",
      "platform": "Client Net-SNMP avec profil SNMPv3 authPriv pr\u00e9configur\u00e9",
      "context": "Client Net-SNMP avec profil SNMPv3 authPriv pr\u00e9configur\u00e9. Impact : Sonde SNMP. Les identifiants sont dans un fichier de configuration prot\u00e9g\u00e9 du compte ; pas de -A ou -X contenant un secret dans la ligne de commande. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "snmp",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Net-SNMP - snmpget",
          "url": "https://www.net-snmp.org/docs/man/snmpget.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde SNMP"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-snmp-name",
      "basicCommandId": "snmp:name",
      "tech": "snmp",
      "type": "command",
      "title": "SNMPv3 - Lire le nom de l'agent",
      "content": "snmpget -v 3 -l authPriv -t 2 -r 1 <AGENT> .1.3.6.1.2.1.1.5.0",
      "description": "Lire sysName sans parcourir toute la MIB.",
      "example": "snmpget -v 3 -l authPriv -t 2 -r 1 192.0.2.10 .1.3.6.1.2.1.1.5.0",
      "vendor": "Net-SNMP",
      "platform": "Client Net-SNMP avec profil SNMPv3 authPriv pr\u00e9configur\u00e9",
      "context": "Client Net-SNMP avec profil SNMPv3 authPriv pr\u00e9configur\u00e9. Impact : Sonde SNMP. Les identifiants sont dans un fichier de configuration prot\u00e9g\u00e9 du compte ; pas de -A ou -X contenant un secret dans la ligne de commande. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "snmp",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Net-SNMP - snmpget",
          "url": "https://www.net-snmp.org/docs/man/snmpget.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde SNMP"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-eset-services",
      "basicCommandId": "eset:services",
      "tech": "eset",
      "type": "command",
      "title": "ESET Windows - Lire les services install\u00e9s",
      "content": "Get-Service | Where-Object {$_.DisplayName -match 'ESET'} | Select-Object Name,DisplayName,Status",
      "description": "Retrouver le service de protection et l'agent install\u00e9s.",
      "example": "Get-Service | Where-Object {$_.DisplayName -match 'ESET'} | Select-Object Name,DisplayName,Status",
      "vendor": "ESET",
      "platform": "PowerShell sur le poste ESET Windows",
      "context": "PowerShell sur le poste ESET Windows. Impact : Lecture seule. Ne pas d\u00e9sactiver la protection pour diagnostiquer. Le chemin de ecls.exe varie selon le produit install\u00e9. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "eset",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - PowerShell Management",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-eset-agent-log",
      "basicCommandId": "eset:agent-log",
      "tech": "eset",
      "type": "command",
      "title": "ESET Agent - Lire la fin du journal de trace",
      "content": "Get-Content -LiteralPath 'C:\\ProgramData\\ESET\\RemoteAdministrator\\Agent\\EraAgentApplicationData\\Logs\\trace.log' -Tail 100",
      "description": "Lire le journal de l'agent si ce chemin correspond \u00e0 l'installation.",
      "example": "Get-Content -LiteralPath 'C:\\ProgramData\\ESET\\RemoteAdministrator\\Agent\\EraAgentApplicationData\\Logs\\trace.log' -Tail 100",
      "vendor": "ESET",
      "platform": "PowerShell sur le poste ESET Windows",
      "context": "PowerShell sur le poste ESET Windows. Impact : Lecture sensible. Ne pas d\u00e9sactiver la protection pour diagnostiquer. Le chemin de ecls.exe varie selon le produit install\u00e9. Confirmer le chemin de logs dans la configuration ESET Agent. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "eset",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "ESET - Journaux de l'agent",
          "url": "https://help.eset.com/protect_cloud/en-US/fs_agent_connection_troubleshooting.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-eset-scan",
      "basicCommandId": "eset:scan",
      "tech": "eset",
      "type": "command",
      "title": "ESET - Analyser un dossier sans nettoyage automatique",
      "content": "& '<CHEMIN_ECLS_EXE>' /clean-mode=none /no-symlink '<DOSSIER>'",
      "description": "Lancer une analyse cibl\u00e9e sans supprimer les fichiers d\u00e9tect\u00e9s.",
      "example": "& 'C:\\Program Files\\ESET\\ESET Security\\ecls.exe' /clean-mode=none /no-symlink 'C:\\Temp'",
      "vendor": "ESET",
      "platform": "PowerShell sur le poste ESET Windows",
      "context": "PowerShell sur le poste ESET Windows. Impact : Analyse antivirus. Ne pas d\u00e9sactiver la protection pour diagnostiquer. Le chemin de ecls.exe varie selon le produit install\u00e9. Le dossier doit \u00eatre approuv\u00e9 ; charge CPU/I/O et journaux possibles. Ce param\u00e8tre ne d\u00e9sactive pas la protection temps r\u00e9el. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "eset",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "ESET - Scanner en ligne de commande",
          "url": "https://help.eset.com/ees/13/en-US/advanced_cmd.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Analyse antivirus"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-3cx-units",
      "basicCommandId": "3cx:units",
      "tech": "3cx",
      "type": "command",
      "title": "3CX Debian - Retrouver les unit\u00e9s du PBX",
      "content": "systemctl list-units --type=service --all --no-pager '3CX*'",
      "description": "Lire les noms d'unit\u00e9s existants sans les relancer.",
      "example": "systemctl list-units --type=service --all --no-pager '3CX*'",
      "vendor": "3CX",
      "platform": "Shell du serveur Debian 3CX autoris\u00e9 - lecture uniquement",
      "context": "Shell du serveur Debian 3CX autoris\u00e9 - lecture uniquement. Impact : Lecture seule. Les noms d'unit\u00e9s sont \u00e0 relever sur le serveur ; ne pas appliquer de mise \u00e0 jour Debian ou relancer toute la t\u00e9l\u00e9phonie comme simple test. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "3cx",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "systemd - systemctl",
          "url": "https://github.com/systemd/systemd/blob/main/man/systemctl.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-3cx-status",
      "basicCommandId": "3cx:status",
      "tech": "3cx",
      "type": "command",
      "title": "3CX Debian - Lire l'\u00e9tat d'une unit\u00e9",
      "content": "systemctl status <UNITE_3CX> --no-pager",
      "description": "Examiner l'unit\u00e9 relev\u00e9e sur ce serveur.",
      "example": "Remplacer UNITE_3CX par le nom exact issu de la liste des services.",
      "vendor": "3CX",
      "platform": "Shell du serveur Debian 3CX autoris\u00e9 - lecture uniquement",
      "context": "Shell du serveur Debian 3CX autoris\u00e9 - lecture uniquement. Impact : Lecture seule. Les noms d'unit\u00e9s sont \u00e0 relever sur le serveur ; ne pas appliquer de mise \u00e0 jour Debian ou relancer toute la t\u00e9l\u00e9phonie comme simple test. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "3cx",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "systemd - systemctl",
          "url": "https://github.com/systemd/systemd/blob/main/man/systemctl.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-3cx-logs",
      "basicCommandId": "3cx:logs",
      "tech": "3cx",
      "type": "command",
      "title": "3CX Debian - Lire les logs d'une unit\u00e9",
      "content": "journalctl -u <UNITE_3CX> -n 100 --no-pager",
      "description": "Collecter les messages r\u00e9cents du composant cibl\u00e9.",
      "example": "Remplacer UNITE_3CX par le nom exact relev\u00e9 sur le serveur.",
      "vendor": "3CX",
      "platform": "Shell du serveur Debian 3CX autoris\u00e9 - lecture uniquement",
      "context": "Shell du serveur Debian 3CX autoris\u00e9 - lecture uniquement. Impact : Lecture sensible. Les noms d'unit\u00e9s sont \u00e0 relever sur le serveur ; ne pas appliquer de mise \u00e0 jour Debian ou relancer toute la t\u00e9l\u00e9phonie comme simple test. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "3cx",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "systemd - journalctl",
          "url": "https://github.com/systemd/systemd/blob/main/man/journalctl.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-3cx-disk",
      "basicCommandId": "3cx:disk",
      "tech": "3cx",
      "type": "command",
      "title": "3CX Debian - Lire l'espace disque",
      "content": "df -h",
      "description": "V\u00e9rifier l'espace utilis\u00e9 par journaux et enregistrements.",
      "example": "df -h",
      "vendor": "3CX",
      "platform": "Shell du serveur Debian 3CX autoris\u00e9 - lecture uniquement",
      "context": "Shell du serveur Debian 3CX autoris\u00e9 - lecture uniquement. Impact : Lecture seule. Les noms d'unit\u00e9s sont \u00e0 relever sur le serveur ; ne pas appliquer de mise \u00e0 jour Debian ou relancer toute la t\u00e9l\u00e9phonie comme simple test. Ne pas supprimer les enregistrements ou sauvegardes pour un simple test. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "3cx",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "GNU - Outils de base",
          "url": "https://www.gnu.org/software/coreutils/manual/coreutils.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-postfix-config",
      "basicCommandId": "postfix:config",
      "tech": "postfix",
      "type": "command",
      "title": "Postfix - Lire les param\u00e8tres personnalis\u00e9s",
      "content": "postconf -n",
      "description": "Consulter les param\u00e8tres qui diff\u00e8rent des valeurs par d\u00e9faut.",
      "example": "postconf -n",
      "vendor": "Postfix",
      "platform": "Shell du serveur Postfix",
      "context": "Shell du serveur Postfix. Impact : Lecture sensible. Les files et journaux contiennent des adresses et messages ; ne pas supprimer ou vider toute la file. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "postfix",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Postfix - postconf",
          "url": "https://www.postfix.org/postconf.1.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-postfix-queue",
      "basicCommandId": "postfix:queue",
      "tech": "postfix",
      "type": "command",
      "title": "Postfix - Lire la file de messages",
      "content": "postqueue -p",
      "description": "Rep\u00e9rer attente et erreurs sans supprimer de messages.",
      "example": "postqueue -p",
      "vendor": "Postfix",
      "platform": "Shell du serveur Postfix",
      "context": "Shell du serveur Postfix. Impact : Lecture sensible. Les files et journaux contiennent des adresses et messages ; ne pas supprimer ou vider toute la file. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "postfix",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Postfix - postqueue",
          "url": "https://www.postfix.org/postqueue.1.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-postfix-status",
      "basicCommandId": "postfix:status",
      "tech": "postfix",
      "type": "command",
      "title": "Postfix - Lire l'\u00e9tat du service",
      "content": "systemctl status postfix --no-pager",
      "description": "V\u00e9rifier le service sur un serveur systemd.",
      "example": "systemctl status postfix --no-pager",
      "vendor": "Postfix",
      "platform": "Shell du serveur Postfix",
      "context": "Shell du serveur Postfix. Impact : Lecture seule. Les files et journaux contiennent des adresses et messages ; ne pas supprimer ou vider toute la file. Nom d'unit\u00e9 \u00e0 adapter \u00e0 l'installation. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "postfix",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "systemd - systemctl",
          "url": "https://github.com/systemd/systemd/blob/main/man/systemctl.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-postfix-logs",
      "basicCommandId": "postfix:logs",
      "tech": "postfix",
      "type": "command",
      "title": "Postfix - Lire les logs r\u00e9cents du service",
      "content": "journalctl -u postfix --since '-30 min' --no-pager",
      "description": "Examiner les erreurs de transport sur une fen\u00eatre courte.",
      "example": "journalctl -u postfix --since '-30 min' --no-pager",
      "vendor": "Postfix",
      "platform": "Shell du serveur Postfix",
      "context": "Shell du serveur Postfix. Impact : Lecture sensible. Les files et journaux contiennent des adresses et messages ; ne pas supprimer ou vider toute la file. Selon le syslog, les messages peuvent aussi \u00eatre dans /var/log/mail.log ou /var/log/maillog. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "postfix",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "systemd - journalctl",
          "url": "https://github.com/systemd/systemd/blob/main/man/journalctl.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-postfix-check",
      "basicCommandId": "postfix:check",
      "tech": "postfix",
      "type": "command",
      "title": "Postfix - Contr\u00f4ler la configuration",
      "content": "sudo postfix check",
      "description": "V\u00e9rifier les fichiers et permissions avant un rechargement.",
      "example": "sudo postfix check",
      "vendor": "Postfix",
      "platform": "Shell du serveur Postfix",
      "context": "Shell du serveur Postfix. Impact : Validation locale. Les files et journaux contiennent des adresses et messages ; ne pas supprimer ou vider toute la file. Peut cr\u00e9er les r\u00e9pertoires manquants : ce n'est pas une lecture totalement sans \u00e9criture. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "postfix",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Postfix - postfix",
          "url": "https://www.postfix.org/postfix.1.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Validation locale"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-postfix-reload",
      "basicCommandId": "postfix:reload",
      "tech": "postfix",
      "type": "command",
      "title": "Postfix - Recharger une configuration valid\u00e9e",
      "content": "sudo postfix reload",
      "description": "Faire prendre en compte les modifications approuv\u00e9es.",
      "example": "sudo postfix reload",
      "vendor": "Postfix",
      "platform": "Shell du serveur Postfix",
      "context": "Shell du serveur Postfix. Impact : Action sur service. Les files et journaux contiennent des adresses et messages ; ne pas supprimer ou vider toute la file. Contr\u00f4ler la configuration et les impacts mail avant action. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "postfix",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Postfix - postfix",
          "url": "https://www.postfix.org/postfix.1.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Action sur service"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nas-disk",
      "basicCommandId": "nas:disk",
      "tech": "nas",
      "type": "command",
      "title": "NAS Linux - Lire l'espace des volumes",
      "content": "df -h",
      "description": "Consulter capacit\u00e9 et occupation sans modifier les volumes.",
      "example": "df -h",
      "vendor": "Multi-\u00e9diteur",
      "platform": "Shell Linux du NAS si l'\u00e9diteur autorise SSH",
      "context": "Shell Linux du NAS si l'\u00e9diteur autorise SSH. Impact : Lecture seule. Ne pas activer SSH ni modifier le stockage juste pour ces lectures ; utiliser l'interface du NAS si aucun shell n'est support\u00e9. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nas",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "GNU - Outils de base",
          "url": "https://www.gnu.org/software/coreutils/manual/coreutils.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nas-mounts",
      "basicCommandId": "nas:mounts",
      "tech": "nas",
      "type": "command",
      "title": "NAS Linux - Lire les volumes mont\u00e9s",
      "content": "mount",
      "description": "Contr\u00f4ler les points de montage visibles.",
      "example": "mount",
      "vendor": "Multi-\u00e9diteur",
      "platform": "Shell Linux du NAS si l'\u00e9diteur autorise SSH",
      "context": "Shell Linux du NAS si l'\u00e9diteur autorise SSH. Impact : Lecture seule. Ne pas activer SSH ni modifier le stockage juste pour ces lectures ; utiliser l'interface du NAS si aucun shell n'est support\u00e9. Aucun argument de montage n'est ajout\u00e9 : commande de lecture. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nas",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "util-linux - Manuel mount",
          "url": "https://github.com/util-linux/util-linux/blob/master/sys-utils/mount.8.adoc"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nas-raid",
      "basicCommandId": "nas:raid",
      "tech": "nas",
      "type": "command",
      "title": "NAS Linux - Lire l'\u00e9tat des ensembles md",
      "content": "cat /proc/mdstat",
      "description": "V\u00e9rifier les ensembles RAID Linux md lorsque le NAS utilise ce m\u00e9canisme.",
      "example": "cat /proc/mdstat",
      "vendor": "Multi-\u00e9diteur",
      "platform": "Shell Linux du NAS si l'\u00e9diteur autorise SSH",
      "context": "Shell Linux du NAS si l'\u00e9diteur autorise SSH. Impact : Lecture seule. Ne pas activer SSH ni modifier le stockage juste pour ces lectures ; utiliser l'interface du NAS si aucun shell n'est support\u00e9. Ne s'applique pas aux NAS ZFS ou \u00e0 un RAID mat\u00e9riel non expos\u00e9 en md. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nas",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Linux - Ensembles RAID md",
          "url": "https://www.kernel.org/doc/html/latest/admin-guide/md.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-mac-hardware-ports",
      "basicCommandId": "mac:hardware-ports",
      "tech": "mac",
      "type": "command",
      "title": "macOS - Lister les interfaces mat\u00e9rielles",
      "content": "networksetup -listallhardwareports",
      "description": "Relier nom de service, interface et adresse mat\u00e9rielle.",
      "example": "networksetup -listallhardwareports",
      "vendor": "Apple",
      "platform": "Terminal macOS",
      "context": "Terminal macOS. Impact : Lecture seule. Lecture locale ; ne pas d\u00e9sactiver le trousseau, le pare-feu ou une interface pour diagnostiquer. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "mac",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Apple - Utilisation de Terminal",
          "url": "https://support.apple.com/guide/terminal/welcome/mac"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-mac-ip",
      "basicCommandId": "mac:ip",
      "tech": "mac",
      "type": "command",
      "title": "macOS - Lire l'adresse IPv4 d'une interface",
      "content": "ipconfig getifaddr <INTERFACE>",
      "description": "Lire l'adresse du lien identifi\u00e9.",
      "example": "ipconfig getifaddr en0",
      "vendor": "Apple",
      "platform": "Terminal macOS",
      "context": "Terminal macOS. Impact : Lecture seule. Lecture locale ; ne pas d\u00e9sactiver le trousseau, le pare-feu ou une interface pour diagnostiquer. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "mac",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Apple - Utilisation de Terminal",
          "url": "https://support.apple.com/guide/terminal/welcome/mac"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-mac-routes",
      "basicCommandId": "mac:routes",
      "tech": "mac",
      "type": "command",
      "title": "macOS - Lire les routes IP",
      "content": "netstat -rn",
      "description": "Consulter les routes sans r\u00e9solution inverse.",
      "example": "netstat -rn",
      "vendor": "Apple",
      "platform": "Terminal macOS",
      "context": "Terminal macOS. Impact : Lecture seule. Lecture locale ; ne pas d\u00e9sactiver le trousseau, le pare-feu ou une interface pour diagnostiquer. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "mac",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Apple - Utilisation de Terminal",
          "url": "https://support.apple.com/guide/terminal/welcome/mac"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-mac-dns",
      "basicCommandId": "mac:dns",
      "tech": "mac",
      "type": "command",
      "title": "macOS - Lire la configuration des r\u00e9solveurs",
      "content": "scutil --dns",
      "description": "V\u00e9rifier les DNS globaux et ceux affect\u00e9s aux domaines/VPN.",
      "example": "scutil --dns",
      "vendor": "Apple",
      "platform": "Terminal macOS",
      "context": "Terminal macOS. Impact : Lecture seule. Lecture locale ; ne pas d\u00e9sactiver le trousseau, le pare-feu ou une interface pour diagnostiquer. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "mac",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Apple - Utilisation de Terminal",
          "url": "https://support.apple.com/guide/terminal/welcome/mac"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-mac-disk",
      "basicCommandId": "mac:disk",
      "tech": "mac",
      "type": "command",
      "title": "macOS - Lire l'espace disque",
      "content": "df -h",
      "description": "Rep\u00e9rer un volume local satur\u00e9.",
      "example": "df -h",
      "vendor": "Apple",
      "platform": "Terminal macOS",
      "context": "Terminal macOS. Impact : Lecture seule. Lecture locale ; ne pas d\u00e9sactiver le trousseau, le pare-feu ou une interface pour diagnostiquer. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "mac",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Apple - Utilisation de Terminal",
          "url": "https://support.apple.com/guide/terminal/welcome/mac"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ffuf-extensions",
      "basicCommandId": "ffuf:extensions",
      "tech": "ffuf",
      "type": "command",
      "title": "ffuf - Tester une liste courte de fichiers",
      "content": "ffuf -w <LISTE> -u 'https://<HOTE>/FUZZ' -e .html,.txt -rate 5 -t 2 -maxtime 60 -of json -o <SORTIE_JSON>",
      "description": "Chercher des chemins autoris\u00e9s avec deux extensions et un d\u00e9bit born\u00e9.",
      "example": "ffuf -w chemins-test.txt -u 'https://app.example.test/FUZZ' -e .html,.txt -rate 5 -t 2 -maxtime 60 -of json -o ffuf-test.json",
      "vendor": "ffuf",
      "platform": "Poste d'audit / laboratoire autoris\u00e9",
      "context": "Poste d'audit / laboratoire autoris\u00e9. Impact : Test applicatif actif. Liste courte, cible approuv\u00e9e et d\u00e9bit born\u00e9. Les requ\u00eates peuvent d\u00e9clencher des actions applicatives. Choisir un fichier de sortie libre ; inspecter et limiter la liste avant le test. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ffuf",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "ffuf - Documentation du projet",
          "url": "https://github.com/ffuf/ffuf"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Test applicatif actif"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-sqlmap-request",
      "basicCommandId": "sqlmap:request",
      "tech": "sqlmap",
      "type": "command",
      "title": "SQLmap - Tester un param\u00e8tre d'une requ\u00eate captur\u00e9e",
      "content": "sqlmap -r <REQUETE_HTTP> -p <PARAMETRE> --batch --level=1 --risk=1 --technique=B --threads=1 --delay=1",
      "description": "Tester un param\u00e8tre explicitement approuv\u00e9 avec une technique born\u00e9e.",
      "example": "sqlmap -r requete-labo.txt -p id --batch --level=1 --risk=1 --technique=B --threads=1 --delay=1",
      "vendor": "SQLmap",
      "platform": "Laboratoire ou application express\u00e9ment autoris\u00e9e",
      "context": "Laboratoire ou application express\u00e9ment autoris\u00e9e. Impact : Test d'injection actif. Les tests d'injection peuvent modifier le comportement applicatif ; pas de dump, shell, brute force ni cible externe sans autorisation. Le fichier peut contenir cookies et jetons. Inspecter cible et contenu avant usage ; ne pas lancer sur la production sans validation. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "sqlmap",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "SQLmap - Usage",
          "url": "https://github.com/sqlmapproject/sqlmap/wiki/Usage"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Test d'injection actif"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-sqlmap-offline",
      "basicCommandId": "sqlmap:offline",
      "tech": "sqlmap",
      "type": "command",
      "title": "SQLmap - Relire les r\u00e9sultats d'une session locale",
      "content": "sqlmap -u '<URL_TESTEE>' --offline",
      "description": "Consulter une session d'analyse existante sans nouvelle sonde.",
      "example": "sqlmap -u 'https://labo.example.test/item?id=1' --offline",
      "vendor": "SQLmap",
      "platform": "Laboratoire ou application express\u00e9ment autoris\u00e9e",
      "context": "Laboratoire ou application express\u00e9ment autoris\u00e9e. Impact : Lecture de session sensible. Les tests d'injection peuvent modifier le comportement applicatif ; pas de dump, shell, brute force ni cible externe sans autorisation. N\u00e9cessite les r\u00e9sultats locaux pr\u00e9existants de cette cible. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "sqlmap",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "SQLmap - Usage",
          "url": "https://github.com/sqlmapproject/sqlmap/wiki/Usage"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture de session sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-nuclei-list",
      "basicCommandId": "nuclei:list",
      "tech": "nuclei",
      "type": "command",
      "title": "Nuclei - Ex\u00e9cuter un template approuv\u00e9 sur une liste courte",
      "content": "nuclei -l <FICHIER_CIBLES> -t <TEMPLATE_YAML> -rl 5 -c 1 -timeout 5 -retries 0 -jsonl -o <SORTIE_JSONL>",
      "description": "Conserver les r\u00e9sultats d'un seul template sur les cibles valid\u00e9es.",
      "example": "nuclei -l cibles-pilotes.txt -t templates/check-approuve.yaml -rl 5 -c 1 -timeout 5 -retries 0 -jsonl -o nuclei-test.jsonl",
      "vendor": "ProjectDiscovery",
      "platform": "Poste d'audit autoris\u00e9 - templates approuv\u00e9s",
      "context": "Poste d'audit autoris\u00e9 - templates approuv\u00e9s. Impact : Test applicatif actif. Inspecter les templates avant usage ; pas de s\u00e9lection globale de templates ni de workflows non v\u00e9rifi\u00e9s. V\u00e9rifier la signature et les requ\u00eates du template ; fichier sortie libre. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "nuclei",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Nuclei - Ex\u00e9cution",
          "url": "https://docs.projectdiscovery.io/opensource/nuclei/running"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Test applicatif actif"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-trivy-image",
      "basicCommandId": "trivy:image",
      "tech": "trivy",
      "type": "command",
      "title": "Trivy - Analyser les vuln\u00e9rabilit\u00e9s d'une image",
      "content": "trivy image --scanners vuln --severity HIGH,CRITICAL <IMAGE>",
      "description": "Lire les vuln\u00e9rabilit\u00e9s importantes d'une image cibl\u00e9e.",
      "example": "trivy image --scanners vuln --severity HIGH,CRITICAL registry.example.test/app:test",
      "vendor": "Aqua Security",
      "platform": "Poste de diagnostic / CI sur fichiers ou image autoris\u00e9s",
      "context": "Poste de diagnostic / CI sur fichiers ou image autoris\u00e9s. Impact : Analyse et t\u00e9l\u00e9chargements. Le scanner peut t\u00e9l\u00e9charger des bases et images. Prot\u00e9ger les rapports ; aucun correctif n'est appliqu\u00e9 par ces exemples. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "trivy",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Trivy - CLI",
          "url": "https://trivy.dev/docs/latest/references/configuration/cli/trivy/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Analyse et t\u00e9l\u00e9chargements"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-trivy-fs",
      "basicCommandId": "trivy:fs",
      "tech": "trivy",
      "type": "command",
      "title": "Trivy - Analyser les d\u00e9pendances d'un dossier",
      "content": "trivy fs --scanners vuln --skip-dirs .git <DOSSIER>",
      "description": "Contr\u00f4ler les d\u00e9pendances locales sans analyser les secrets.",
      "example": "trivy fs --scanners vuln --skip-dirs .git ./app-test",
      "vendor": "Aqua Security",
      "platform": "Poste de diagnostic / CI sur fichiers ou image autoris\u00e9s",
      "context": "Poste de diagnostic / CI sur fichiers ou image autoris\u00e9s. Impact : Analyse et t\u00e9l\u00e9chargements. Le scanner peut t\u00e9l\u00e9charger des bases et images. Prot\u00e9ger les rapports ; aucun correctif n'est appliqu\u00e9 par ces exemples. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "trivy",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Trivy - CLI",
          "url": "https://trivy.dev/docs/latest/references/configuration/cli/trivy/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Analyse et t\u00e9l\u00e9chargements"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-trivy-config",
      "basicCommandId": "trivy:config",
      "tech": "trivy",
      "type": "command",
      "title": "Trivy - V\u00e9rifier les fichiers de configuration",
      "content": "trivy config <DOSSIER>",
      "description": "Analyser les manifests IaC locaux.",
      "example": "trivy config ./infra-test",
      "vendor": "Aqua Security",
      "platform": "Poste de diagnostic / CI sur fichiers ou image autoris\u00e9s",
      "context": "Poste de diagnostic / CI sur fichiers ou image autoris\u00e9s. Impact : Analyse locale. Le scanner peut t\u00e9l\u00e9charger des bases et images. Prot\u00e9ger les rapports ; aucun correctif n'est appliqu\u00e9 par ces exemples. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "trivy",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Trivy - CLI",
          "url": "https://trivy.dev/docs/latest/references/configuration/cli/trivy/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Analyse locale"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-trivy-report",
      "basicCommandId": "trivy:report",
      "tech": "trivy",
      "type": "command",
      "title": "Trivy - Exporter un rapport JSON d'image",
      "content": "trivy image --scanners vuln --format json --output <RAPPORT_JSON> <IMAGE>",
      "description": "Conserver un rapport exploitable par les outils de suivi.",
      "example": "trivy image --scanners vuln --format json --output trivy-test.json registry.example.test/app:test",
      "vendor": "Aqua Security",
      "platform": "Poste de diagnostic / CI sur fichiers ou image autoris\u00e9s",
      "context": "Poste de diagnostic / CI sur fichiers ou image autoris\u00e9s. Impact : Analyse et export local. Le scanner peut t\u00e9l\u00e9charger des bases et images. Prot\u00e9ger les rapports ; aucun correctif n'est appliqu\u00e9 par ces exemples. Choisir un nom libre et prot\u00e9ger le rapport. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "trivy",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Trivy - CLI",
          "url": "https://trivy.dev/docs/latest/references/configuration/cli/trivy/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Analyse et export local"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-centreon-check",
      "basicCommandId": "centreon:check",
      "tech": "centreon",
      "type": "command",
      "title": "Centreon - Valider la configuration du moteur",
      "content": "/usr/sbin/centengine -v /etc/centreon-engine/centengine.cfg",
      "description": "V\u00e9rifier la configuration Engine avant rechargement.",
      "example": "/usr/sbin/centengine -v /etc/centreon-engine/centengine.cfg",
      "vendor": "Centreon",
      "platform": "Shell Linux du poller / serveur central",
      "context": "Shell Linux du poller / serveur central. Impact : Validation locale. Identifier le r\u00f4le du serveur et valider la configuration avant un rechargement du moteur. Le chemin doit correspondre \u00e0 l'installation ; -v valide la configuration, ce n'est pas une commande de version. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "centreon",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Centreon - Diagnostic Engine",
          "url": "https://docs-older.centreon.com/docs/centreon-engine/en/19.10/exploit/running.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Validation locale"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-centreon-reload",
      "basicCommandId": "centreon:reload",
      "tech": "centreon",
      "type": "command",
      "title": "Centreon - Recharger le moteur apr\u00e8s validation",
      "content": "sudo systemctl reload centengine",
      "description": "Appliquer la configuration g\u00e9n\u00e9r\u00e9e et valid\u00e9e du poller.",
      "example": "sudo systemctl reload centengine",
      "vendor": "Centreon",
      "platform": "Shell Linux du poller / serveur central",
      "context": "Shell Linux du poller / serveur central. Impact : Action sur supervision. Identifier le r\u00f4le du serveur et valider la configuration avant un rechargement du moteur. Valider la configuration et la prise en charge de reload par l'unit\u00e9 avant action. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "centreon",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "systemd - systemctl",
          "url": "https://github.com/systemd/systemd/blob/main/man/systemctl.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Action sur supervision"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-oxidized-git-status",
      "basicCommandId": "oxidized:git-status",
      "tech": "oxidized",
      "type": "command",
      "title": "Oxidized - Lire l'\u00e9tat du d\u00e9p\u00f4t de sauvegarde",
      "content": "git -C <DEPOT> status --short",
      "description": "Examiner les changements locaux si la sortie Git utilise un d\u00e9p\u00f4t de travail.",
      "example": "git -C /srv/backups/oxidized status --short",
      "vendor": "Oxidized",
      "platform": "Shell Linux du collecteur / d\u00e9p\u00f4t de sauvegarde",
      "context": "Shell Linux du collecteur / d\u00e9p\u00f4t de sauvegarde. Impact : Lecture sensible. Le d\u00e9p\u00f4t contient des configurations sensibles. Identifier le chemin et la branche utilis\u00e9s par le collecteur. Ne s'applique pas \u00e0 un d\u00e9p\u00f4t bare sans worktree. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "oxidized",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Git - Documentation",
          "url": "https://git-scm.com/docs"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-oxidized-git-show",
      "basicCommandId": "oxidized:git-show",
      "tech": "oxidized",
      "type": "command",
      "title": "Oxidized - Lire la derni\u00e8re configuration sauvegard\u00e9e",
      "content": "git -C <DEPOT> show HEAD:<CHEMIN_EQUIPEMENT>",
      "description": "Afficher la version enregistr\u00e9e d'un \u00e9quipement, pas la version logicielle du collecteur.",
      "example": "git -C /srv/backups/oxidized show HEAD:switch-test",
      "vendor": "Oxidized",
      "platform": "Shell Linux du collecteur / d\u00e9p\u00f4t de sauvegarde",
      "context": "Shell Linux du collecteur / d\u00e9p\u00f4t de sauvegarde. Impact : Lecture sensible. Le d\u00e9p\u00f4t contient des configurations sensibles. Identifier le chemin et la branche utilis\u00e9s par le collecteur. Adapter chemin de d\u00e9p\u00f4t, branche et nom d'\u00e9quipement. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "oxidized",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Git - Documentation",
          "url": "https://git-scm.com/docs"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-observium-poller",
      "basicCommandId": "observium:poller",
      "tech": "observium",
      "type": "command",
      "title": "Observium - Ex\u00e9cuter un polling cibl\u00e9",
      "content": "./poller.php -h <DEVICE>",
      "description": "Actualiser les donn\u00e9es d'un seul \u00e9quipement.",
      "example": "./poller.php -h router.example.test",
      "vendor": "Observium",
      "platform": "Shell Linux dans le r\u00e9pertoire d'installation Observium",
      "context": "Shell Linux dans le r\u00e9pertoire d'installation Observium. Impact : Polling et \u00e9critures locales. Le polling \u00e9crit des donn\u00e9es locales et contacte les \u00e9quipements. Cibler un seul device. Contacter un seul \u00e9quipement autoris\u00e9 ; ne pas ajouter -h all. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "observium",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Observium - Poller",
          "url": "https://docs.observium.org/poller/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Polling et \u00e9critures locales"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-observium-disk",
      "basicCommandId": "observium:disk",
      "tech": "observium",
      "type": "command",
      "title": "Observium - Lire l'espace du serveur de collecte",
      "content": "df -h",
      "description": "V\u00e9rifier les volumes utilis\u00e9s par RRD, logs et base.",
      "example": "df -h",
      "vendor": "Observium",
      "platform": "Shell Linux dans le r\u00e9pertoire d'installation Observium",
      "context": "Shell Linux dans le r\u00e9pertoire d'installation Observium. Impact : Lecture seule. Le polling \u00e9crit des donn\u00e9es locales et contacte les \u00e9quipements. Cibler un seul device. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "observium",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "GNU - Outils de base",
          "url": "https://www.gnu.org/software/coreutils/manual/coreutils.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ivanti-interfaces",
      "basicCommandId": "ivanti:interfaces",
      "tech": "ivanti",
      "type": "command",
      "title": "Ivanti client - Lire les interfaces et m\u00e9triques IPv4",
      "content": "Get-NetIPInterface -AddressFamily IPv4 | Sort-Object InterfaceMetric",
      "description": "Comparer les interfaces du VPN et du r\u00e9seau local.",
      "example": "Get-NetIPInterface -AddressFamily IPv4 | Sort-Object InterfaceMetric",
      "vendor": "Ivanti",
      "platform": "PowerShell sur le client Windows VPN",
      "context": "PowerShell sur le client Windows VPN. Impact : Lecture seule. Tests du poste et des routes, pas commandes d'administration de la passerelle Ivanti. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ivanti",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - NetTCPIP",
          "url": "https://learn.microsoft.com/en-us/powershell/module/nettcpip/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ivanti-dns",
      "basicCommandId": "ivanti:dns",
      "tech": "ivanti",
      "type": "command",
      "title": "Ivanti client - Lire les DNS de chaque interface",
      "content": "Get-DnsClientServerAddress -AddressFamily IPv4",
      "description": "V\u00e9rifier les DNS assign\u00e9s au tunnel.",
      "example": "Get-DnsClientServerAddress -AddressFamily IPv4",
      "vendor": "Ivanti",
      "platform": "PowerShell sur le client Windows VPN",
      "context": "PowerShell sur le client Windows VPN. Impact : Lecture seule. Tests du poste et des routes, pas commandes d'administration de la passerelle Ivanti. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ivanti",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - DnsClient",
          "url": "https://learn.microsoft.com/en-us/powershell/module/dnsclient/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-identity-dns",
      "basicCommandId": "identity:dns",
      "tech": "identity",
      "type": "command",
      "title": "Identity Collector - R\u00e9soudre le nom d'un DC",
      "content": "Resolve-DnsName -Name '<CONTROLEUR_AD>' -DnsOnly",
      "description": "V\u00e9rifier la r\u00e9solution depuis le serveur collecteur.",
      "example": "Resolve-DnsName -Name 'dc01.example.test' -DnsOnly",
      "vendor": "Check Point",
      "platform": "PowerShell Windows sur le serveur collecteur",
      "context": "PowerShell Windows sur le serveur collecteur. Impact : Sonde DNS. Identifier le service r\u00e9el avant intervention. Les journaux et identit\u00e9s collect\u00e9es sont sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "identity",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - DnsClient",
          "url": "https://learn.microsoft.com/en-us/powershell/module/dnsclient/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde DNS"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-identity-service-detail",
      "basicCommandId": "identity:service-detail",
      "tech": "identity",
      "type": "command",
      "title": "Identity Collector - Lire les d\u00e9pendances d'un service",
      "content": "Get-Service -Name '<SERVICE_COLLECTOR>' | Select-Object Name,Status,ServicesDependedOn,DependentServices",
      "description": "Examiner le service relev\u00e9 sur ce serveur sans le red\u00e9marrer.",
      "example": "Remplacer SERVICE_COLLECTOR par le nom interne issu de l'inventaire de services.",
      "vendor": "Check Point",
      "platform": "PowerShell Windows sur le serveur collecteur",
      "context": "PowerShell Windows sur le serveur collecteur. Impact : Lecture seule. Identifier le service r\u00e9el avant intervention. Les journaux et identit\u00e9s collect\u00e9es sont sensibles. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "identity",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - PowerShell Management",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ems-https",
      "basicCommandId": "ems:https",
      "tech": "ems",
      "type": "command",
      "title": "EMS - Tester le port HTTPS depuis Windows",
      "content": "Test-NetConnection -ComputerName <EMS> -Port <PORT_HTTPS> -InformationLevel Detailed",
      "description": "Contr\u00f4ler TCP vers le port configur\u00e9 de l'interface EMS.",
      "example": "Test-NetConnection -ComputerName ems.example.test -Port 443 -InformationLevel Detailed",
      "vendor": "Fortinet",
      "platform": "Poste Windows de diagnostic vers EMS",
      "context": "Poste Windows de diagnostic vers EMS. Impact : Sonde TCP. Ces tests sont externes et ne remplacent pas les diagnostics natifs EMS disponibles dans le dossier. Adapter le port \u00e0 l'installation ; un succ\u00e8s TCP ne valide pas l'authentification ou TLS. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ems",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - NetTCPIP",
          "url": "https://learn.microsoft.com/en-us/powershell/module/nettcpip/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde TCP"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-ems-dns",
      "basicCommandId": "ems:dns",
      "tech": "ems",
      "type": "command",
      "title": "EMS - Tester la r\u00e9solution du serveur",
      "content": "Resolve-DnsName -Name '<EMS>' -DnsOnly",
      "description": "V\u00e9rifier la destination choisie par le poste.",
      "example": "Resolve-DnsName -Name 'ems.example.test' -DnsOnly",
      "vendor": "Fortinet",
      "platform": "Poste Windows de diagnostic vers EMS",
      "context": "Poste Windows de diagnostic vers EMS. Impact : Sonde DNS. Ces tests sont externes et ne remplacent pas les diagnostics natifs EMS disponibles dans le dossier. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "ems",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - DnsClient",
          "url": "https://learn.microsoft.com/en-us/powershell/module/dnsclient/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde DNS"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-tufin-disk",
      "basicCommandId": "tufin:disk",
      "tech": "tufin",
      "type": "command",
      "title": "Tufin - Lire l'espace de l'h\u00f4te",
      "content": "df -h",
      "description": "Contr\u00f4ler les volumes de l'h\u00f4te TOS autoris\u00e9.",
      "example": "df -h",
      "vendor": "Tufin",
      "platform": "Shell Linux TOS / poste de diagnostic selon la commande",
      "context": "Shell Linux TOS / poste de diagnostic selon la commande. Impact : Lecture seule. Lecture de l'h\u00f4te ; ne pas contourner les outils TOS pour modifier ses conteneurs ou services. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "tufin",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "GNU - Outils de base",
          "url": "https://www.gnu.org/software/coreutils/manual/coreutils.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-wifi-win-if",
      "basicCommandId": "wifi:win-if",
      "tech": "wifi",
      "type": "command",
      "title": "Wi-Fi Windows - Lire l'\u00e9tat de la connexion",
      "content": "netsh wlan show interfaces",
      "description": "Voir SSID, signal, radio et d\u00e9bits du lien.",
      "example": "netsh wlan show interfaces",
      "vendor": "Microsoft / NetworkManager",
      "platform": "Poste client Wi-Fi Windows ou Linux selon la commande",
      "context": "Poste client Wi-Fi Windows ou Linux selon la commande. Impact : Lecture seule. Les scans Wi-Fi sont locaux ; ne pas exporter de cl\u00e9 pr\u00e9partag\u00e9e. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "wifi",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - Commandes Windows",
          "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-wifi-networks",
      "basicCommandId": "wifi:networks",
      "tech": "wifi",
      "type": "command",
      "title": "Wi-Fi Windows - Lister les r\u00e9seaux visibles",
      "content": "netsh wlan show networks mode=bssid",
      "description": "Comparer les BSSID et canaux re\u00e7us par le poste.",
      "example": "netsh wlan show networks mode=bssid",
      "vendor": "Microsoft / NetworkManager",
      "platform": "Poste client Wi-Fi Windows ou Linux selon la commande",
      "context": "Poste client Wi-Fi Windows ou Linux selon la commande. Impact : Sonde Wi-Fi locale. Les scans Wi-Fi sont locaux ; ne pas exporter de cl\u00e9 pr\u00e9partag\u00e9e. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "wifi",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Commandes Windows",
          "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde Wi-Fi locale"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-wifi-drivers",
      "basicCommandId": "wifi:drivers",
      "tech": "wifi",
      "type": "command",
      "title": "Wi-Fi Windows - Lire les capacit\u00e9s radio du pilote",
      "content": "netsh wlan show drivers",
      "description": "V\u00e9rifier modes radio et authentifications pris en charge.",
      "example": "netsh wlan show drivers",
      "vendor": "Microsoft / NetworkManager",
      "platform": "Poste client Wi-Fi Windows ou Linux selon la commande",
      "context": "Poste client Wi-Fi Windows ou Linux selon la commande. Impact : Lecture seule. Les scans Wi-Fi sont locaux ; ne pas exporter de cl\u00e9 pr\u00e9partag\u00e9e. La sortie inclut parfois une version mais fournit surtout les capacit\u00e9s de la carte. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "wifi",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - Commandes Windows",
          "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-reseau-pathping",
      "basicCommandId": "reseau:pathping",
      "tech": "reseau",
      "type": "command",
      "title": "R\u00e9seau Windows - Mesurer les pertes par saut",
      "content": "pathping -n <IP>",
      "description": "Observer pertes et latence sur le trajet.",
      "example": "pathping -n 192.0.2.10",
      "vendor": "Multi-\u00e9diteur",
      "platform": "Poste Windows / Linux de diagnostic",
      "context": "Poste Windows / Linux de diagnostic. Impact : Sondes r\u00e9seau. Tester une cible autoris\u00e9e ; un test de d\u00e9bit consomme de la bande passante. Test plus long qu'un ping ; les routeurs peuvent limiter ICMP sans perdre le trafic transit\u00e9. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "reseau",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Commandes Windows",
          "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sondes r\u00e9seau"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-reseau-iperf3-server",
      "basicCommandId": "reseau:iperf3-server",
      "tech": "reseau",
      "type": "command",
      "title": "iPerf 3 - D\u00e9marrer un serveur pour un seul test",
      "content": "iperf3 -s -1",
      "description": "Accepter un test puis quitter le serveur.",
      "example": "iperf3 -s -1",
      "vendor": "Multi-\u00e9diteur",
      "platform": "Poste Windows / Linux de diagnostic",
      "context": "Poste Windows / Linux de diagnostic. Impact : Ouverture de port. Tester une cible autoris\u00e9e ; un test de d\u00e9bit consomme de la bande passante. Port par d\u00e9faut 5201 ; iPerf 3 n'est pas compatible avec iPerf 2. Serveur de test autoris\u00e9. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "reseau",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "iPerf 3 - Manuel",
          "url": "https://software.es.net/iperf/invoking.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Ouverture de port"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-reseau-iperf3-client",
      "basicCommandId": "reseau:iperf3-client",
      "tech": "reseau",
      "type": "command",
      "title": "iPerf 3 - Mesurer le d\u00e9bit TCP",
      "content": "iperf3 -c <SERVEUR> -t 10",
      "description": "Effectuer un test TCP de dix secondes.",
      "example": "iperf3 -c 192.0.2.10 -t 10",
      "vendor": "Multi-\u00e9diteur",
      "platform": "Poste Windows / Linux de diagnostic",
      "context": "Poste Windows / Linux de diagnostic. Impact : Trafic soutenu. Tester une cible autoris\u00e9e ; un test de d\u00e9bit consomme de la bande passante. Planifier le test pour ne pas saturer un lien de production. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "reseau",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "iPerf 3 - Manuel",
          "url": "https://software.es.net/iperf/invoking.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Trafic soutenu"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-preuves-ps-hash",
      "basicCommandId": "preuves:ps-hash",
      "tech": "preuves",
      "type": "command",
      "title": "Windows - Calculer le SHA-256 d'un fichier",
      "content": "Get-FileHash -LiteralPath '<FICHIER>' -Algorithm SHA256",
      "description": "Comparer l'empreinte \u00e0 une valeur obtenue depuis une source de confiance.",
      "example": "Get-FileHash -LiteralPath 'C:\\Temp\\installateur.exe' -Algorithm SHA256",
      "vendor": "Microsoft / GNU",
      "platform": "PowerShell Windows ou shell Linux selon la commande",
      "context": "PowerShell Windows ou shell Linux selon la commande. Impact : Lecture seule. Conserver les empreintes et fichiers dans un emplacement prot\u00e9g\u00e9. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "preuves",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - PowerShell Security",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-preuves-signature",
      "basicCommandId": "preuves:signature",
      "tech": "preuves",
      "type": "command",
      "title": "Windows - Lire la signature d'un installateur",
      "content": "Get-AuthenticodeSignature -LiteralPath '<FICHIER>' | Select-Object Status,StatusMessage,SignerCertificate",
      "description": "Contr\u00f4ler signature et signataire sans lancer le fichier.",
      "example": "Get-AuthenticodeSignature -LiteralPath 'C:\\Temp\\installateur.exe' | Select-Object Status,StatusMessage,SignerCertificate",
      "vendor": "Microsoft / GNU",
      "platform": "PowerShell Windows ou shell Linux selon la commande",
      "context": "PowerShell Windows ou shell Linux selon la commande. Impact : Lecture seule. Conserver les empreintes et fichiers dans un emplacement prot\u00e9g\u00e9. Une signature valide ne garantit pas \u00e0 elle seule qu'un logiciel convient \u00e0 l'usage pr\u00e9vu. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "preuves",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Microsoft - PowerShell Security",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-logiciels-python-packages",
      "basicCommandId": "logiciels:python-packages",
      "tech": "logiciels",
      "type": "command",
      "title": "Python - Lister les paquets de l'environnement",
      "content": "python -m pip list",
      "description": "Lire les paquets du Python explicitement choisi.",
      "example": "python -m pip list",
      "vendor": "Microsoft / Python",
      "platform": "PowerShell Windows / environnement Python local",
      "context": "PowerShell Windows / environnement Python local. Impact : Lecture seule. Les installations ou mises \u00e0 jour se font uniquement avec une source valid\u00e9e et l'accord du responsable. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "logiciels",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Python Packaging - pip",
          "url": "https://pip.pypa.io/en/stable/cli/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-logiciels-python-check",
      "basicCommandId": "logiciels:python-check",
      "tech": "logiciels",
      "type": "command",
      "title": "Python - V\u00e9rifier les d\u00e9pendances install\u00e9es",
      "content": "python -m pip check",
      "description": "Rep\u00e9rer des d\u00e9pendances manquantes ou incompatibles.",
      "example": "python -m pip check",
      "vendor": "Microsoft / Python",
      "platform": "PowerShell Windows / environnement Python local",
      "context": "PowerShell Windows / environnement Python local. Impact : Lecture seule. Les installations ou mises \u00e0 jour se font uniquement avec une source valid\u00e9e et l'accord du responsable. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "logiciels",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "Python Packaging - pip",
          "url": "https://pip.pypa.io/en/stable/cli/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-backup-robocopy-preview",
      "basicCommandId": "backup:robocopy-preview",
      "tech": "backup",
      "type": "command",
      "title": "Sauvegarde Windows - Simuler une copie de dossier",
      "content": "robocopy \"<SOURCE>\" \"<DESTINATION>\" /E /L /R:0 /W:0",
      "description": "Afficher ce qui serait copi\u00e9 sans toucher \u00e0 la destination.",
      "example": "robocopy \"C:\\Users\\Test\\Documents\" \"D:\\Backup\\Documents-test\" /E /L /R:0 /W:0",
      "vendor": "Microsoft / GNU",
      "platform": "PowerShell Windows ou shell Linux selon la commande",
      "context": "PowerShell Windows ou shell Linux selon la commande. Impact : Simulation de copie. Simulation avant copie ; ne pas utiliser /MIR ou --delete par d\u00e9faut, et tester une restauration. V\u00e9rifier source et destination ; /L est essentiel pour la simulation. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "backup",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Commandes Windows",
          "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Simulation de copie"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-backup-robocopy",
      "basicCommandId": "backup:robocopy",
      "tech": "backup",
      "type": "command",
      "title": "Sauvegarde Windows - Copier un dossier sans miroir destructif",
      "content": "robocopy \"<SOURCE>\" \"<DESTINATION>\" /E /COPY:DAT /R:1 /W:1 /XJ",
      "description": "Copier les fichiers en limitant les reprises et jonctions.",
      "example": "robocopy \"C:\\Users\\Test\\Documents\" \"D:\\Backup\\Documents-test\" /E /COPY:DAT /R:1 /W:1 /XJ",
      "vendor": "Microsoft / GNU",
      "platform": "PowerShell Windows ou shell Linux selon la commande",
      "context": "PowerShell Windows ou shell Linux selon la commande. Impact : \u00c9criture de sauvegarde. Simulation avant copie ; ne pas utiliser /MIR ou --delete par d\u00e9faut, et tester une restauration. Peut remplacer des fichiers destination ; simuler d'abord. Codes Robocopy 0 \u00e0 7 non fatals, 8 ou plus indiquent un \u00e9chec. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "backup",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - Commandes Windows",
          "url": "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "\u00c9criture de sauvegarde"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-backbox-https",
      "basicCommandId": "backbox:https",
      "tech": "backbox",
      "type": "command",
      "title": "BackBox - Tester la r\u00e9ponse HTTPS de gestion",
      "content": "curl --head --connect-timeout 5 --max-time 15 \"https://<BACKBOX>/\"",
      "description": "V\u00e9rifier la connexion HTTP/TLS depuis le poste de diagnostic.",
      "example": "curl --head --connect-timeout 5 --max-time 15 https://backbox.example.test/",
      "vendor": "BackBox",
      "platform": "Poste Linux de diagnostic vers l'interface BackBox",
      "context": "Poste Linux de diagnostic vers l'interface BackBox. Impact : Sonde HTTPS. Tests externes DNS/TLS/HTTPS uniquement ; administration et restauration par la console/API document\u00e9e pour l'installation. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "backbox",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "curl - Manuel",
          "url": "https://curl.se/docs/manpage.html"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde HTTPS"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-vision-tcp",
      "basicCommandId": "vision:tcp",
      "tech": "vision",
      "type": "command",
      "title": "Vision One ZTSA - Tester le port d'une application priv\u00e9e",
      "content": "Test-NetConnection -ComputerName <APPLICATION> -Port <PORT> -InformationLevel Detailed",
      "description": "Contr\u00f4ler le flux depuis un poste qui doit avoir l'acc\u00e8s autoris\u00e9.",
      "example": "Test-NetConnection -ComputerName app-interne.example.test -Port 443 -InformationLevel Detailed",
      "vendor": "Trend Micro",
      "platform": "Poste Windows de diagnostic vers une application priv\u00e9e",
      "context": "Poste Windows de diagnostic vers une application priv\u00e9e. Impact : Sonde TCP. Tests externes de la cible autoris\u00e9e ; ne pas inventer une CLI du connector ni modifier sa protection. Ne valide pas la policy ZTSA ; corr\u00e9ler avec la console Vision One. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "vision",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - NetTCPIP",
          "url": "https://learn.microsoft.com/en-us/powershell/module/nettcpip/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde TCP"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-vision-dns",
      "basicCommandId": "vision:dns",
      "tech": "vision",
      "type": "command",
      "title": "Vision One ZTSA - Tester la r\u00e9solution de la cible",
      "content": "Resolve-DnsName -Name '<APPLICATION>' -DnsOnly",
      "description": "V\u00e9rifier le nom r\u00e9solu par le poste.",
      "example": "Resolve-DnsName -Name 'app-interne.example.test' -DnsOnly",
      "vendor": "Trend Micro",
      "platform": "Poste Windows de diagnostic vers une application priv\u00e9e",
      "context": "Poste Windows de diagnostic vers une application priv\u00e9e. Impact : Sonde DNS. Tests externes de la cible autoris\u00e9e ; ne pas inventer une CLI du connector ni modifier sa protection. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "vision",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - DnsClient",
          "url": "https://learn.microsoft.com/en-us/powershell/module/dnsclient/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde DNS"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-tippingpoint-sms-tcp",
      "basicCommandId": "tippingpoint:sms-tcp",
      "tech": "tippingpoint",
      "type": "command",
      "title": "TippingPoint SMS - Tester le port de gestion",
      "content": "Test-NetConnection -ComputerName <SMS> -Port <PORT_GESTION> -InformationLevel Detailed",
      "description": "V\u00e9rifier TCP vers le service de gestion choisi.",
      "example": "Test-NetConnection -ComputerName sms.example.test -Port 443 -InformationLevel Detailed",
      "vendor": "Trend Micro",
      "platform": "Poste Windows de diagnostic vers SMS",
      "context": "Poste Windows de diagnostic vers SMS. Impact : Sonde TCP. Tests externes de gestion ; l'\u00e9tat inspection et la policy sont \u00e0 v\u00e9rifier dans SMS, pas avec ces commandes. Adapter le port \u00e0 la configuration ; ceci ne valide pas l'inspection IPS. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "tippingpoint",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "Microsoft - NetTCPIP",
          "url": "https://learn.microsoft.com/en-us/powershell/module/nettcpip/"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Sonde TCP"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-gophish-service",
      "basicCommandId": "gophish:service",
      "tech": "gophish",
      "type": "command",
      "title": "Gophish - Lire l'\u00e9tat du service de l'h\u00f4te",
      "content": "systemctl status <UNITE_GOPHISH> --no-pager",
      "description": "V\u00e9rifier l'unit\u00e9 systemd d\u00e9ploy\u00e9e par l'organisation.",
      "example": "Remplacer UNITE_GOPHISH par le nom d'unit\u00e9 r\u00e9el ; aucun nom de service n'est impos\u00e9 par cet exemple.",
      "vendor": "Gophish",
      "platform": "Shell Linux de l'h\u00f4te Gophish autoris\u00e9",
      "context": "Shell Linux de l'h\u00f4te Gophish autoris\u00e9. Impact : Lecture seule. Diagnostic d'h\u00f4te uniquement ; aucune campagne ni collecte de mots de passe n'est lanc\u00e9e. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "gophish",
        "base",
        "diagnostic"
      ],
      "sources": [
        {
          "title": "systemd - systemctl",
          "url": "https://github.com/systemd/systemd/blob/main/man/systemctl.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture seule"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    },
    {
      "id": "basic-command-gophish-logs",
      "basicCommandId": "gophish:logs",
      "tech": "gophish",
      "type": "command",
      "title": "Gophish - Lire les logs r\u00e9cents du service",
      "content": "journalctl -u <UNITE_GOPHISH> -n 100 --no-pager",
      "description": "Collecter les messages de l'h\u00f4te sans lancer de campagne.",
      "example": "Remplacer UNITE_GOPHISH par le nom exact de l'unit\u00e9 d\u00e9ploy\u00e9e.",
      "vendor": "Gophish",
      "platform": "Shell Linux de l'h\u00f4te Gophish autoris\u00e9",
      "context": "Shell Linux de l'h\u00f4te Gophish autoris\u00e9. Impact : Lecture sensible. Diagnostic d'h\u00f4te uniquement ; aucune campagne ni collecte de mots de passe n'est lanc\u00e9e. Remplacer les param\u00e8tres entre chevrons. Commande non ex\u00e9cut\u00e9e sur l'infrastructure.",
      "tags": [
        "gophish",
        "base",
        "action-controlee"
      ],
      "sources": [
        {
          "title": "systemd - journalctl",
          "url": "https://github.com/systemd/systemd/blob/main/man/journalctl.xml"
        }
      ],
      "quality": {
        "reviewedAt": "2026-10-10",
        "validation": "documentation",
        "impact": "Lecture sensible"
      },
      "favorite": false,
      "viewCount": 0,
      "attachments": []
    }
  ]
};
