'use strict';

// Generated from the reviewed local source manifest; rebuild with maintenance/scripts/build-procedure-catalog.py.
const PROCEDURE_CATALOG_DATA={
  "version": 1,
  "reviewedAt": "2026-10-10",
  "fileCount": 159,
  "sourceCount": 127,
  "technologies": {
    "windows": [
      "Windows",
      "Microsoft",
      "Windows client / serveur"
    ],
    "esxi": [
      "VMware ESXi",
      "VMware",
      "ESXi / vSphere"
    ],
    "vcenter": [
      "VMware vCenter",
      "VMware",
      "vCenter Server Appliance"
    ],
    "3cx": [
      "3CX",
      "3CX",
      "3CX / Debian"
    ],
    "eset": [
      "ESET",
      "ESET",
      "ESET PROTECT / Endpoint / EFDE"
    ],
    "ad": [
      "Active Directory",
      "Microsoft",
      "Windows Server / AD DS"
    ],
    "gpo": [
      "GPO",
      "Microsoft",
      "Windows Server / Group Policy"
    ],
    "iis": [
      "IIS / ACME",
      "Microsoft",
      "Windows Server / IIS / ACME"
    ],
    "cisco": [
      "Cisco Catalyst",
      "Cisco",
      "IOS / IOS-XE"
    ],
    "cyber": [
      "Sensibilisation",
      "Gophish",
      "Campagne de sensibilisation autoris\u00e9e"
    ],
    "k8s": [
      "Kubernetes",
      "Kubernetes",
      "Debian / kubeadm / cri-dockerd"
    ],
    "pfsense": [
      "pfSense",
      "Netgate",
      "pfSense CE / Plus"
    ],
    "linux": [
      "Linux",
      "Linux",
      "Debian / Linux"
    ],
    "logiciel": [
      "Logiciels",
      "Multi-\u00e9diteur",
      "Applications Windows"
    ],
    "navigateur": [
      "Navigateurs",
      "Google / Mozilla",
      "Chrome / Firefox"
    ],
    "mac": [
      "macOS",
      "Apple",
      "macOS / Trousseau"
    ],
    "outlook": [
      "Outlook",
      "Microsoft",
      "Outlook classique / mobile"
    ],
    "exchange": [
      "Exchange",
      "Microsoft",
      "Exchange Server local / Exchange Management Shell"
    ],
    "m365": [
      "Microsoft 365",
      "Microsoft",
      "Microsoft 365 / Entra ID"
    ],
    "postfix": [
      "Postfix",
      "Postfix",
      "Linux / SMTP / IMAP / webmail"
    ],
    "nas": [
      "NAS",
      "QNAP / Multi-\u00e9diteur",
      "NAS / stockage"
    ],
    "reseau": [
      "R\u00e9seau",
      "Multi-\u00e9diteur",
      "R\u00e9seau IP"
    ],
    "backup": [
      "Sauvegarde",
      "Multi-\u00e9diteur",
      "Sauvegarde fichiers / serveurs"
    ],
    "wifi": [
      "Wi-Fi",
      "Zyxel / Multi-\u00e9diteur",
      "Wi-Fi / supervision"
    ],
    "print": [
      "Impression",
      "Multi-\u00e9diteur",
      "Windows / pilote d'impression"
    ]
  },
  "documents": [
    {
      "slug": "outlook-2011-mac-rebuild",
      "tech": "outlook",
      "type": "procedure",
      "title": "Outlook 2011 Mac - Reconstruire une identit\u00e9 (historique)",
      "description": "R\u00e9f\u00e9rence historique pour restaurer une base Outlook 2011 Mac apr\u00e8s une sauvegarde compl\u00e8te de l'identit\u00e9.",
      "content": "<h1>Outlook 2011 Mac - Reconstruire une identit\u00e9 (historique)</h1><p>R\u00e9f\u00e9rence historique pour restaurer une base Outlook 2011 Mac apr\u00e8s une sauvegarde compl\u00e8te de l&#x27;identit\u00e9.</p><h2>Proc\u00e9dure</h2><ol><li>Confirmer qu&#x27;il s&#x27;agit bien d&#x27;Outlook 2011 Mac ; quitter Outlook et toutes les applications Office.</li><li>Dans Documents &gt; Microsoft User Data (Donn\u00e9es utilisateurs Microsoft), sauvegarder le dossier Office 2011 Identities complet vers un emplacement distinct et prot\u00e9g\u00e9.</li><li>V\u00e9rifier l&#x27;espace disque disponible ; le document historique demande au moins trois fois la taille de l&#x27;identit\u00e9 pour la reconstruction.</li><li>Maintenir Option en lan\u00e7ant Outlook 2011, ou ouvrir Applications &gt; Microsoft Office 2011 &gt; Office &gt; Microsoft Database Utility.app.</li><li>S\u00e9lectionner la bonne identit\u00e9, cliquer sur Reconstruire et attendre la confirmation avant de fermer l&#x27;utilitaire.</li><li>Relancer Outlook et tester la base. En cas d&#x27;\u00e9chec persistant, cr\u00e9er une identit\u00e9 distincte dans l&#x27;utilitaire, la d\u00e9finir par d\u00e9faut et reconfigurer les comptes sans supprimer l&#x27;ancienne.</li></ol><h2>Validation</h2><ul><li>Dossiers, messages locaux, contacts et calendrier attendus sont accessibles ; envoi et r\u00e9ception test\u00e9s.</li><li>La sauvegarde de l&#x27;identit\u00e9 initiale reste disponible et relisible.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Proc\u00e9dure historique issue du document Microsoft KB2360509, dat\u00e9 de 2014 : ne pas l&#x27;appliquer aux versions actuelles d&#x27;Outlook Mac.</li><li>La reconstruction modifie la base. Ne jamais supprimer l&#x27;identit\u00e9 initiale ni vider la corbeille avant une sauvegarde v\u00e9rifi\u00e9e ; une nouvelle identit\u00e9 ne r\u00e9cup\u00e8re pas automatiquement les messages locaux.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Outlook%202011%20Mac%20Reconstruction%20base%20ou%20identit%C3%A9.pdf\">Mail/Outlook 2011 Mac Reconstruction base ou identit\u00e9.pdf</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Outlook 2011 Mac Reconstruction base ou identit\u00e9.pdf",
          "relativePath": "Mail/Outlook 2011 Mac Reconstruction base ou identit\u00e9.pdf",
          "sha256": "8f6974af71ea47fd9630352393cd33558d9b530c6fd05ee1dc95270be4c84e3e"
        }
      ],
      "sources": []
    },
    {
      "slug": "windows-logs",
      "tech": "windows",
      "type": "procedure",
      "title": "Windows - Diagnostiquer un incident avec les journaux",
      "description": "Relier un sympt\u00f4me, les \u00e9v\u00e9nements Windows et les services concern\u00e9s avant d'intervenir.",
      "content": "<h1>Windows - Diagnostiquer un incident avec les journaux</h1><p>Relier un sympt\u00f4me, les \u00e9v\u00e9nements Windows et les services concern\u00e9s avant d&#x27;intervenir.</p><h2>Proc\u00e9dure</h2><ol><li>Relever la machine, l&#x27;heure, le compte et le message exact ; reproduire une seule fois le probl\u00e8me.</li><li>Ouvrir l&#x27;Observateur d&#x27;\u00e9v\u00e9nements et choisir les journaux de l&#x27;application, du syst\u00e8me ou de Remote Desktop Services.</li><li>Filtrer autour de l&#x27;incident ; relever source, ID et d\u00e9tails de l&#x27;\u00e9v\u00e9nement.</li><li>Contr\u00f4ler l&#x27;\u00e9tat, le type de d\u00e9marrage et les d\u00e9pendances des services cit\u00e9s ; comparer avec un poste fonctionnel.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Windows - Journaux syst\u00e8me r\u00e9cents</h3><p><strong>Impact : Lecture seule.</strong> Les journaux peuvent contenir des identifiants et donn\u00e9es internes ; limiter leur partage.</p><pre>Get-WinEvent -LogName System -MaxEvents 50</pre><h2>Validation</h2><ul><li>Le test initial fonctionne et les erreurs ne r\u00e9apparaissent pas.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Un service en automatique peut \u00eatre arr\u00eat\u00e9 : chercher la cause avant de changer son d\u00e9marrage ou de le relancer.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/0%20-%20A%20classer/D%C3%A9bogage%20syst%C3%A9matique%20par%20les%20logs.docx\">0 - A classer/D\u00e9bogage syst\u00e9matique par les logs.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "win-events-system"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\0 - A classer\\D\u00e9bogage syst\u00e9matique par les logs.docx",
          "relativePath": "0 - A classer/D\u00e9bogage syst\u00e9matique par les logs.docx",
          "sha256": "ef6f29719a07072e8c94a2386926ad13af9785ef3ccaf68e4f170d60b2ebbe58"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-thin",
      "tech": "esxi",
      "type": "procedure",
      "title": "VMware ESXi - Convertir un disque VMDK en thin",
      "description": "Cloner un disque virtuel vers un disque en provisionnement dynamique sans supprimer l'original.",
      "content": "<h1>VMware ESXi - Convertir un disque VMDK en thin</h1><p>Cloner un disque virtuel vers un disque en provisionnement dynamique sans supprimer l&#x27;original.</p><h2>Proc\u00e9dure</h2><ol><li>Sauvegarder la VM, relever son contr\u00f4leur et consolider les snapshots selon la proc\u00e9dure VMware adapt\u00e9e.</li><li>\u00c9teindre la VM ; activer SSH temporairement sur l&#x27;h\u00f4te et rep\u00e9rer son r\u00e9pertoire dans /vmfs/volumes.</li><li>Identifier le descripteur .vmdk source, pas le fichier -flat.vmdk ; v\u00e9rifier l&#x27;espace libre et un nom destination distinct.</li><li>Ex\u00e9cuter le clonage vmkfstools avec le format thin, puis attendre sa fin.</li><li>Remplacer le disque dans les param\u00e8tres de la VM en conservant le contr\u00f4leur et l&#x27;original pour le retour arri\u00e8re.</li></ol><h2>Commandes associ\u00e9es</h2><h3>ESXi - Cloner un VMDK au format thin</h3><p><strong>Impact : Cr\u00e9ation de disque / I/O stockage.</strong> VM \u00e9teinte, snapshots trait\u00e9s, sauvegarde v\u00e9rifi\u00e9e et destination distincte avec assez d&#x27;espace. Ne pas utiliser le fichier -flat.vmdk comme descripteur.</p><pre>vmkfstools -i &quot;&lt;SOURCE_VMDK&gt;&quot; &quot;&lt;DESTINATION_VMDK&gt;&quot; -d thin</pre><h3>ESXi - Lister les fichiers du r\u00e9pertoire VM</h3><p><strong>Impact : Lecture seule.</strong> V\u00e9rifier le datastore et le r\u00e9pertoire avant toute commande suivante.</p><pre>ls -l</pre><h2>Validation</h2><ul><li>La VM d\u00e9marre, les volumes sont accessibles et le service applicatif fonctionne.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>VM imp\u00e9rativement \u00e9teinte. Ne pas supprimer le disque source avant validation. Ne pas forcer lsilogic si le contr\u00f4leur de la VM est diff\u00e9rent.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/0%20-%20A%20classer/Modification%20du%20type%20de%20disque%20VM%20Ware.docx\">0 - A classer/Modification du type de disque VM Ware.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "esxi-thin-clone",
        "esxi-list-files"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\0 - A classer\\Modification du type de disque VM Ware.docx",
          "relativePath": "0 - A classer/Modification du type de disque VM Ware.docx",
          "sha256": "d86eec60ddf7d29fa7bdfcc5adaba755e8858aa250da6d418f8f1f0193da0123"
        }
      ],
      "sources": []
    },
    {
      "slug": "3cx-install",
      "tech": "3cx",
      "type": "procedure",
      "title": "3CX - Pr\u00e9parer et d\u00e9ployer un IPBX",
      "description": "Mettre en place une VM ou un IPBX 3CX et valider extensions, trunk et r\u00e8gles d'appels.",
      "content": "<h1>3CX - Pr\u00e9parer et d\u00e9ployer un IPBX</h1><p>Mettre en place une VM ou un IPBX 3CX et valider extensions, trunk et r\u00e8gles d&#x27;appels.</p><h2>Proc\u00e9dure</h2><ol><li>Pr\u00e9parer licence, FQDN, sauvegarde, ISO support\u00e9e, r\u00e9seau et ressources selon la version 3CX choisie.</li><li>Cr\u00e9er la VM sur l&#x27;h\u00f4te et le datastore pr\u00e9vus, connecter l&#x27;ISO et installer le syst\u00e8me.</li><li>Configurer IP, DNS, nom et acc\u00e8s d&#x27;administration ; terminer l&#x27;assistant 3CX et activer la licence.</li><li>Ajouter les extensions, associer les t\u00e9l\u00e9phones et configurer le trunk ainsi que les r\u00e8gles entrantes/sortantes.</li><li>Lancer le contr\u00f4le du pare-feu 3CX et tester un appel interne puis un appel entrant/sortant.</li></ol><h2>Validation</h2><ul><li>Audio bidirectionnel, extensions enregistr\u00e9es et sauvegarde export\u00e9e.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Les captures d&#x27;origine concernent d&#x27;anciennes versions. Ne pas recopier leurs IP, ressources minimales ou r\u00e8gles WAN any sans validation.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/3CX/Procedure%20Vm%203cx.docx\">3CX/Procedure Vm 3cx.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/T%C3%A9l%C3%A9phonie/Procedure%20Vm%203cx.docx\">T\u00e9l\u00e9phonie/Procedure Vm 3cx.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/T%C3%A9l%C3%A9phonie/Installation%203cx.docx\">T\u00e9l\u00e9phonie/Installation 3cx.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\3CX\\Procedure Vm 3cx.docx",
          "relativePath": "3CX/Procedure Vm 3cx.docx",
          "sha256": "b6f0024314f0a81e5271882ba415b103a37bfae923e5b56b2213791706283028"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\T\u00e9l\u00e9phonie\\Procedure Vm 3cx.docx",
          "relativePath": "T\u00e9l\u00e9phonie/Procedure Vm 3cx.docx",
          "sha256": "b6f0024314f0a81e5271882ba415b103a37bfae923e5b56b2213791706283028"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\T\u00e9l\u00e9phonie\\Installation 3cx.docx",
          "relativePath": "T\u00e9l\u00e9phonie/Installation 3cx.docx",
          "sha256": "dbadfd6fb4a7cf3c3fc5ea8e7e75e7f03ecffaf3dfbaeff686abb56b9e5d120e"
        }
      ],
      "sources": []
    },
    {
      "slug": "3cx-phones",
      "tech": "3cx",
      "type": "procedure",
      "title": "3CX - Provisionner un t\u00e9l\u00e9phone ou une extension",
      "description": "Associer chaque utilisateur \u00e0 la bonne extension et transmettre sa configuration de fa\u00e7on prot\u00e9g\u00e9e.",
      "content": "<h1>3CX - Provisionner un t\u00e9l\u00e9phone ou une extension</h1><p>Associer chaque utilisateur \u00e0 la bonne extension et transmettre sa configuration de fa\u00e7on prot\u00e9g\u00e9e.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier extension, destinataire, mod\u00e8le du t\u00e9l\u00e9phone et adresse de provisionnement de l&#x27;instance.</li><li>Depuis la console 3CX, envoyer l&#x27;e-mail de bienvenue au bon utilisateur.</li><li>Dans le webclient, choisir l&#x27;application adapt\u00e9e et appliquer son profil ; pour un t\u00e9l\u00e9phone, configurer l&#x27;URL Auto Provision correspondant \u00e0 cette extension.</li><li>Red\u00e9marrer seulement le t\u00e9l\u00e9phone cibl\u00e9 si n\u00e9cessaire, puis tester appel et touches BLF.</li></ol><h2>Validation</h2><ul><li>L&#x27;extension attendue est enregistr\u00e9e et le t\u00e9l\u00e9phone re\u00e7oit les appels.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Le lien de provisionnement contient un secret. Ne pas le publier ni r\u00e9utiliser l&#x27;URL d&#x27;un autre client. Ne pas modifier l&#x27;extension d&#x27;administration.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/3CX/Proc%C3%A9dure%203cx%20Conf%20T%C3%A9l%C3%A9phone.docx\">3CX/Proc\u00e9dure 3cx Conf T\u00e9l\u00e9phone.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/T%C3%A9l%C3%A9phonie/Proc%203cx.docx\">T\u00e9l\u00e9phonie/Proc 3cx.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\3CX\\Proc\u00e9dure 3cx Conf T\u00e9l\u00e9phone.docx",
          "relativePath": "3CX/Proc\u00e9dure 3cx Conf T\u00e9l\u00e9phone.docx",
          "sha256": "cd7a0bc099a3028d7c82c0761d71f813d92c30dab94603a90fba7a0be053f9a5"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\T\u00e9l\u00e9phonie\\Proc 3cx.docx",
          "relativePath": "T\u00e9l\u00e9phonie/Proc 3cx.docx",
          "sha256": "f3241c7479ce9d6cfff7b8ba6f67d584f3f05f5314812804d1d1560b63fece93"
        }
      ],
      "sources": []
    },
    {
      "slug": "3cx-desktop",
      "tech": "3cx",
      "type": "procedure",
      "title": "3CX - Installer et connecter l'application utilisateur",
      "description": "Installer le client 3CX et connecter l'utilisateur \u00e0 son instance.",
      "content": "<h1>3CX - Installer et connecter l&#x27;application utilisateur</h1><p>Installer le client 3CX et connecter l&#x27;utilisateur \u00e0 son instance.</p><h2>Proc\u00e9dure</h2><ol><li>Installer l&#x27;application officielle adapt\u00e9e au syst\u00e8me et \u00e0 la version du PBX.</li><li>Renseigner le FQDN 3CX valid\u00e9 et l&#x27;extension de l&#x27;utilisateur ; utiliser le parcours de connexion pr\u00e9vu par l&#x27;instance.</li><li>En cas d&#x27;oubli, effectuer une r\u00e9initialisation sur le portail officiel vers l&#x27;adresse de l&#x27;utilisateur.</li><li>V\u00e9rifier microphone, casque, notifications et appel de test.</li></ol><h2>Validation</h2><ul><li>Connexion au bon PBX, appels et audio fonctionnels.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas renseigner un domaine client figurant dans un ancien exemple ; ne pas transmettre les secrets dans le m\u00e9mo.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/3CX/Proc%C3%A9dure%20de%20mise%20en%20place%20du%20nouveau%20logiciel%203CX.docx\">3CX/Proc\u00e9dure de mise en place du nouveau logiciel 3CX.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\3CX\\Proc\u00e9dure de mise en place du nouveau logiciel 3CX.docx",
          "relativePath": "3CX/Proc\u00e9dure de mise en place du nouveau logiciel 3CX.docx",
          "sha256": "eb84edb061a687edd917d63d66b38c49633d5087c67c02832784e82771a7d802"
        }
      ],
      "sources": []
    },
    {
      "slug": "linux-vmtools",
      "tech": "linux",
      "type": "procedure",
      "title": "Debian - Installer et v\u00e9rifier open-vm-tools",
      "description": "Installer les outils d'int\u00e9gration VMware dans une VM Debian, notamment une VM 3CX compatible.",
      "content": "<h1>Debian - Installer et v\u00e9rifier open-vm-tools</h1><p>Installer les outils d&#x27;int\u00e9gration VMware dans une VM Debian, notamment une VM 3CX compatible.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier la distribution, la compatibilit\u00e9 du produit h\u00e9berg\u00e9 et disposer d&#x27;une sauvegarde.</li><li>Actualiser les index APT puis installer open-vm-tools avec les droits administrateur.</li><li>Contr\u00f4ler la version avec vmware-toolbox-cmd et l&#x27;\u00e9tat du service.</li><li>V\u00e9rifier dans vSphere que les outils sont reconnus et que l&#x27;arr\u00eat invit\u00e9 est disponible.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Debian - Actualiser les index APT</h3><p><strong>Impact : R\u00e9seau / modification des index locaux.</strong> V\u00e9rifier la distribution et les d\u00e9p\u00f4ts autoris\u00e9s.</p><pre>sudo apt-get update</pre><h3>Debian - Installer open-vm-tools</h3><p><strong>Impact : Installation logicielle.</strong> Lire les changements propos\u00e9s par APT et v\u00e9rifier la compatibilit\u00e9 du produit h\u00e9berg\u00e9.</p><pre>sudo apt-get install open-vm-tools</pre><h3>VMware Tools - Lire la version invit\u00e9e</h3><p><strong>Impact : Lecture seule.</strong> Chemin \u00e0 v\u00e9rifier selon la distribution.</p><pre>/usr/bin/vmware-toolbox-cmd -v</pre><h3>Debian - Contr\u00f4ler le service open-vm-tools</h3><p><strong>Impact : Lecture seule.</strong> Le nom du service peut varier selon l&#x27;installation.</p><pre>systemctl status open-vm-tools --no-pager</pre><h2>Validation</h2><ul><li>Service actif et version d\u00e9tect\u00e9e par l&#x27;h\u00f4te.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>La capture Debian 10 est historique ; ne pas lancer une mise \u00e0 niveau g\u00e9n\u00e9rale de la distribution 3CX en m\u00eame temps.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/3CX/VMTOOLS%20Debian%2010%20pour%203CX.docx\">3CX/VMTOOLS Debian 10 pour 3CX.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/T%C3%A9l%C3%A9phonie/VMTOOLS%20Debian%2010%20pour%203CX.docx\">T\u00e9l\u00e9phonie/VMTOOLS Debian 10 pour 3CX.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Linux/Proc%C3%A9dure%20pour%20VM%20Tools%20sur%20Debian.docx\">Linux/Proc\u00e9dure pour VM Tools sur Debian.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "apt-update",
        "install-vmtools",
        "version-vmtools",
        "status-vmtools"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\3CX\\VMTOOLS Debian 10 pour 3CX.docx",
          "relativePath": "3CX/VMTOOLS Debian 10 pour 3CX.docx",
          "sha256": "bbec2a4e898e282808d37064f9f33d40a23b60c8ca52b9d614d184ff4a1269d2"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\T\u00e9l\u00e9phonie\\VMTOOLS Debian 10 pour 3CX.docx",
          "relativePath": "T\u00e9l\u00e9phonie/VMTOOLS Debian 10 pour 3CX.docx",
          "sha256": "bbec2a4e898e282808d37064f9f33d40a23b60c8ca52b9d614d184ff4a1269d2"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Linux\\Proc\u00e9dure pour VM Tools sur Debian.docx",
          "relativePath": "Linux/Proc\u00e9dure pour VM Tools sur Debian.docx",
          "sha256": "34efb9077f34e8ba118bb5bca776d904f3b45192aacbf41279846055c2f6619c"
        }
      ],
      "sources": []
    },
    {
      "slug": "eset-encryption-policy",
      "tech": "eset",
      "type": "procedure",
      "title": "ESET - Cr\u00e9er et affecter une politique de chiffrement",
      "description": "Activer EFDE sur un p\u00e9rim\u00e8tre pilote avec une politique clairement affect\u00e9e.",
      "content": "<h1>ESET - Cr\u00e9er et affecter une politique de chiffrement</h1><p>Activer EFDE sur un p\u00e9rim\u00e8tre pilote avec une politique clairement affect\u00e9e.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier licence, module EFDE d\u00e9ploy\u00e9, compatibilit\u00e9 mat\u00e9rielle et sauvegarde des postes.</li><li>Dans PROTECT, cr\u00e9er une politique pour le produit de chiffrement et activer le chiffrement des disques pr\u00e9vus.</li><li>V\u00e9rifier la priorit\u00e9 des param\u00e8tres et la politique de tentatives de connexion ; ne pas recopier automatiquement la valeur 50 de l&#x27;exemple.</li><li>Affecter d&#x27;abord un groupe pilote, puis suivre l&#x27;application de la politique et le chiffrement.</li></ol><h2>Validation</h2><ul><li>Poste pilote chiffr\u00e9, authentification pr\u00e9d\u00e9marrage valid\u00e9e et r\u00e9cup\u00e9ration disponible.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Une politique contradictoire ou une mauvaise affectation peut bloquer le chiffrement. V\u00e9rifier les cl\u00e9s de r\u00e9cup\u00e9ration avant tout d\u00e9ploiement.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Anti-virus/Cr%C3%A9ation%20d%20une%20politique%20de%20chiffrement.docx\">Anti-virus/Cr\u00e9ation d une politique de chiffrement.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/ESET/Cr%C3%A9ation%20d%20une%20politique%20de%20chiffrement.docx\">ESET/Cr\u00e9ation d une politique de chiffrement.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Cr\u00e9ation d une politique de chiffrement.docx",
          "relativePath": "Anti-virus/Cr\u00e9ation d une politique de chiffrement.docx",
          "sha256": "f985986f41e328eafb36339d1283ae39059ffa0ccc319963f2e73b24c6db22ef"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESET\\Cr\u00e9ation d une politique de chiffrement.docx",
          "relativePath": "ESET/Cr\u00e9ation d une politique de chiffrement.docx",
          "sha256": "f985986f41e328eafb36339d1283ae39059ffa0ccc319963f2e73b24c6db22ef"
        }
      ],
      "sources": []
    },
    {
      "slug": "eset-gpo-agent",
      "tech": "eset",
      "type": "procedure",
      "title": "ESET - D\u00e9ployer l'agent Management par GPO",
      "description": "Installer l'agent ESET depuis un partage accessible aux ordinateurs cibl\u00e9s.",
      "content": "<h1>ESET - D\u00e9ployer l&#x27;agent Management par GPO</h1><p>Installer l&#x27;agent ESET depuis un partage accessible aux ordinateurs cibl\u00e9s.</p><h2>Proc\u00e9dure</h2><ol><li>G\u00e9n\u00e9rer l&#x27;installateur d&#x27;agent pour GPO dans PROTECT ; conserver le MSI et la configuration requise.</li><li>Placer les fichiers sur un partage UNC en lecture pour les comptes ordinateurs concern\u00e9s.</li><li>Cr\u00e9er une GPO d&#x27;installation logicielle dans Configuration ordinateur et s\u00e9lectionner le MSI par son chemin UNC.</li><li>Lier la GPO \u00e0 une OU pilote, v\u00e9rifier son filtrage et attendre l&#x27;application au d\u00e9marrage.</li></ol><h2>Validation</h2><ul><li>Agent install\u00e9 et derni\u00e8re communication visible dans PROTECT.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>L&#x27;agent seul n&#x27;est pas l&#x27;antivirus. Ne pas donner aux utilisateurs le droit de modifier le package sur le partage.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Anti-virus/D%C3%A9ploiement%20agent%20ESET%20par%20GPO.docx\">Anti-virus/D\u00e9ploiement agent ESET par GPO.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/DC/D%C3%A9ploiement%20agent%20ESET%20par%20GPO.docx\">DC/D\u00e9ploiement agent ESET par GPO.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\D\u00e9ploiement agent ESET par GPO.docx",
          "relativePath": "Anti-virus/D\u00e9ploiement agent ESET par GPO.docx",
          "sha256": "8c86fbd11c5d73358979c6373823395d3591d0d11220124536bb81fbc32e0d68"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\DC\\D\u00e9ploiement agent ESET par GPO.docx",
          "relativePath": "DC/D\u00e9ploiement agent ESET par GPO.docx",
          "sha256": "8c86fbd11c5d73358979c6373823395d3591d0d11220124536bb81fbc32e0d68"
        }
      ],
      "sources": []
    },
    {
      "slug": "eset-deploy-server",
      "tech": "eset",
      "type": "procedure",
      "title": "ESET - D\u00e9ployer agent et protection serveur",
      "description": "Installer s\u00e9par\u00e9ment agent et protection adapt\u00e9e au serveur, puis v\u00e9rifier la licence.",
      "content": "<h1>ESET - D\u00e9ployer agent et protection serveur</h1><p>Installer s\u00e9par\u00e9ment agent et protection adapt\u00e9e au serveur, puis v\u00e9rifier la licence.</p><h2>Proc\u00e9dure</h2><ol><li>Ajouter la licence dans le compte ESET de l&#x27;organisation et la rendre disponible dans PROTECT.</li><li>Cr\u00e9er un package pour le bon OS et le bon produit : protection serveur ou protection poste.</li><li>Tester l&#x27;installation de l&#x27;agent et sa communication, puis lancer la t\u00e2che d&#x27;installation du produit de s\u00e9curit\u00e9 si le package complet n&#x27;a install\u00e9 que l&#x27;agent.</li><li>Affecter le serveur au bon groupe, v\u00e9rifier politique, activation et notifications SMTP.</li></ol><h2>Validation</h2><ul><li>Agent et antivirus pr\u00e9sents, licence valide, mises \u00e0 jour et alertes fonctionnelles.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Un ping refus\u00e9 ne prouve pas un \u00e9chec d&#x27;installation. Ne pas d\u00e9sactiver globalement pare-feu ou UAC pour contourner un probl\u00e8me de d\u00e9ploiement.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Anti-virus/D%C3%A9ploiement%20ESET-TIFR.docx\">Anti-virus/D\u00e9ploiement ESET-TIFR.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/ESET/D%C3%A9ploiement%20ESET-TIFR.docx\">ESET/D\u00e9ploiement ESET-TIFR.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\D\u00e9ploiement ESET-TIFR.docx",
          "relativePath": "Anti-virus/D\u00e9ploiement ESET-TIFR.docx",
          "sha256": "39c2a2a7cf87bfad2376483a316373056c8625a65303f20fefd55df3c45279e2"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESET\\D\u00e9ploiement ESET-TIFR.docx",
          "relativePath": "ESET/D\u00e9ploiement ESET-TIFR.docx",
          "sha256": "39c2a2a7cf87bfad2376483a316373056c8625a65303f20fefd55df3c45279e2"
        }
      ],
      "sources": []
    },
    {
      "slug": "eset-mac",
      "tech": "eset",
      "type": "procedure",
      "title": "ESET - Installer ou migrer la protection macOS",
      "description": "Installer le produit ESET compatible avec macOS et contr\u00f4ler les autorisations syst\u00e8me.",
      "content": "<h1>ESET - Installer ou migrer la protection macOS</h1><p>Installer le produit ESET compatible avec macOS et contr\u00f4ler les autorisations syst\u00e8me.</p><h2>Proc\u00e9dure</h2><ol><li>Relever la version de macOS et du produit ; consulter la matrice de compatibilit\u00e9 avant migration.</li><li>Si une d\u00e9sinstallation est requise, utiliser le d\u00e9sinstalleur fourni dans le paquet ESET et red\u00e9marrer au moment pr\u00e9vu.</li><li>Installer le produit officiel, activer la licence et accorder les permissions n\u00e9cessaires : extensions syst\u00e8me, acc\u00e8s disque et filtrage selon la version.</li><li>Contr\u00f4ler l&#x27;\u00e9tat de protection et le profil r\u00e9seau choisi.</li></ol><h2>Validation</h2><ul><li>Protection active sans alerte d&#x27;autorisation et mises \u00e0 jour r\u00e9centes.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Le courrier Big Sur de 2020 n&#x27;est pas une matrice actuelle. Ne pas d\u00e9sactiver syst\u00e9matiquement le contr\u00f4le des appareils sur les versions r\u00e9centes.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Anti-virus/Eset%20Cybersecurite%20pour%20MAC.docx\">Anti-virus/Eset Cybersecurite pour MAC.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Anti-virus/Proc%20eset%20mac.docx\">Anti-virus/Proc eset mac.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Eset Cybersecurite pour MAC.docx",
          "relativePath": "Anti-virus/Eset Cybersecurite pour MAC.docx",
          "sha256": "eacb231a1a3a417c34c82ea805144e3685a8991fc2c6873093a1475329014a14"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Proc eset mac.docx",
          "relativePath": "Anti-virus/Proc eset mac.docx",
          "sha256": "cf7b21d9bb65eda413bd11cd08439e66945269628c2c60d6d797e4da6156fd23"
        }
      ],
      "sources": []
    },
    {
      "slug": "eset-eee-migrate",
      "tech": "eset",
      "type": "procedure",
      "title": "ESET Endpoint Encryption - Sauvegarder et migrer le serveur",
      "description": "Transf\u00e9rer un serveur EEE \u00e0 partir de sa sauvegarde sans faire fonctionner deux serveurs avec le m\u00eame Proxy ID.",
      "content": "<h1>ESET Endpoint Encryption - Sauvegarder et migrer le serveur</h1><p>Transf\u00e9rer un serveur EEE \u00e0 partir de sa sauvegarde sans faire fonctionner deux serveurs avec le m\u00eame Proxy ID.</p><h2>Proc\u00e9dure</h2><ol><li>Confirmer qu&#x27;il s&#x27;agit d&#x27;EEE Server et non d&#x27;EFDE ; relever version, Proxy ID et conditions de migration.</li><li>Dans Control Panel &gt; Server Backup, cr\u00e9er une sauvegarde et prot\u00e9ger server_backup.zip hors du serveur.</li><li>Pr\u00e9parer la destination et la version compatible ; placer la sauvegarde dans le r\u00e9pertoire attendu par l&#x27;assistant.</li><li>Arr\u00eater l&#x27;ancienne instance au moment du basculement, restaurer via Restore from backup et v\u00e9rifier les clients.</li></ol><h2>Validation</h2><ul><li>Politiques, clients et mises \u00e0 jour remontent sur la nouvelle instance.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>La sauvegarde contient des informations sensibles. Deux serveurs utilisant le m\u00eame Proxy ID risquent de perturber les mises \u00e0 jour des clients.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Anti-virus/Eset%20Endpoint%20Encryption%20migration.docx\">Anti-virus/Eset Endpoint Encryption migration.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://support.eset.com/en/kb7547-backup-or-migrate-eset-endpoint-encryption-server-v21010-and-later\" target=\"_blank\" rel=\"noopener noreferrer\">ESET - Migration Endpoint Encryption Server</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Eset Endpoint Encryption migration.docx",
          "relativePath": "Anti-virus/Eset Endpoint Encryption migration.docx",
          "sha256": "0133b22e919b27aaaf0d0750d5a3ac868da0c5bbc8f8776925c42b764249428b"
        }
      ],
      "sources": [
        {
          "title": "ESET - Migration Endpoint Encryption Server",
          "url": "https://support.eset.com/en/kb7547-backup-or-migrate-eset-endpoint-encryption-server-v21010-and-later"
        }
      ]
    },
    {
      "slug": "eset-bitlocker",
      "tech": "eset",
      "type": "procedure",
      "title": "ESET - Chiffrement bloqu\u00e9 par BitLocker",
      "description": "Identifier un chiffrement BitLocker existant avant d'envisager une migration vers ESET.",
      "content": "<h1>ESET - Chiffrement bloqu\u00e9 par BitLocker</h1><p>Identifier un chiffrement BitLocker existant avant d&#x27;envisager une migration vers ESET.</p><h2>Proc\u00e9dure</h2><ol><li>Contr\u00f4ler chaque volume avec manage-bde -status et relever l&#x27;\u00e9tat r\u00e9el du chiffrement.</li><li>Sauvegarder les donn\u00e9es et les cl\u00e9s de r\u00e9cup\u00e9ration ; faire approuver la migration et la p\u00e9riode sans chiffrement.</li><li>Si la migration est valid\u00e9e, d\u00e9chiffrer uniquement les volumes pr\u00e9vus et attendre leur d\u00e9chiffrement complet.</li><li>Rafra\u00eechir les informations du poste dans ESET, puis relancer le parcours de chiffrement.</li></ol><h2>Commandes associ\u00e9es</h2><h3>BitLocker - Lire l&#x27;\u00e9tat des volumes</h3><p><strong>Impact : Lecture seule.</strong> Ex\u00e9cuter dans une console autoris\u00e9e, souvent \u00e9lev\u00e9e ; ne pas d\u00e9duire un d\u00e9chiffrement d&#x27;une protection suspendue.</p><pre>manage-bde -status</pre><h3>BitLocker - Lire les \u00e9v\u00e9nements du pilote</h3><p><strong>Impact : Lecture seule.</strong> La source ne garantit pas la pr\u00e9sence d&#x27;\u00e9v\u00e9nements sur chaque poste.</p><pre>Get-WinEvent -FilterHashtable @{LogName=&#x27;System&#x27;; ProviderName=&#x27;Microsoft-Windows-BitLocker-Driver&#x27;}</pre><h3>BitLocker - D\u00e9chiffrer un volume approuv\u00e9</h3><p><strong>Impact : Retrait de protection / d\u00e9chiffrement.</strong> Ce n&#x27;est pas un diagnostic. Sauvegarde, cl\u00e9s de r\u00e9cup\u00e9ration, alimentation et autorisation indispensables ; attendre la fin et rechiffrer selon le plan.</p><pre>manage-bde -off &lt;VOLUME&gt;</pre><h2>Validation</h2><ul><li>Un seul produit de chiffrement actif ; poste ESET chiffr\u00e9 et r\u00e9cup\u00e9ration valid\u00e9e.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas superposer deux solutions de chiffrement. manage-bde -off retire la protection du volume : ce n&#x27;est pas un test de diagnostic.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Anti-virus/Eset%20full%20Encryption%20-%20Echec%20%C3%A0%20cause%20de%20BitLocker.docx\">Anti-virus/Eset full Encryption - Echec \u00e0 cause de BitLocker.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/ESET/Eset%20full%20Encryption%20-%20Echec%20%C3%A0%20cause%20de%20BitLocker.docx\">ESET/Eset full Encryption - Echec \u00e0 cause de BitLocker.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://support.eset.com/en/kb7191-using-bitlocker-and-eset-endpoint-encryption-full-disk-encryption-at-the-same-time\" target=\"_blank\" rel=\"noopener noreferrer\">ESET - BitLocker et chiffrement ESET</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "bitlocker-status",
        "bitlocker-events",
        "bitlocker-decrypt"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "relativePath": "Anti-virus/Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "sha256": "4310a7ff5922b1b9b8f2e0397d1df40eba7f6ea90864a9dfd2c72ea2ebc61b0a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESET\\Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "relativePath": "ESET/Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "sha256": "4310a7ff5922b1b9b8f2e0397d1df40eba7f6ea90864a9dfd2c72ea2ebc61b0a"
        }
      ],
      "sources": [
        {
          "title": "ESET - BitLocker et chiffrement ESET",
          "url": "https://support.eset.com/en/kb7191-using-bitlocker-and-eset-endpoint-encryption-full-disk-encryption-at-the-same-time"
        }
      ]
    },
    {
      "slug": "eset-efde-errors",
      "tech": "eset",
      "type": "procedure",
      "title": "ESET EFDE - Interpr\u00e9ter les alertes de chiffrement",
      "description": "Distinguer incompatibilit\u00e9 TPM/Opal, licence, pr\u00e9d\u00e9marrage et progression du chiffrement.",
      "content": "<h1>ESET EFDE - Interpr\u00e9ter les alertes de chiffrement</h1><p>Distinguer incompatibilit\u00e9 TPM/Opal, licence, pr\u00e9d\u00e9marrage et progression du chiffrement.</p><h2>Proc\u00e9dure</h2><ol><li>Copier l&#x27;alerte exacte et identifier le poste, la politique et la version EFDE.</li><li>Si TPM 2.0 ou Opal est requis, comparer cette exigence avec le mat\u00e9riel disponible ; ne pas supprimer l&#x27;exigence sans validation.</li><li>Si la licence est expir\u00e9e, distinguer chiffrement des donn\u00e9es et authentification pr\u00e9d\u00e9marrage ; r\u00e9activer la licence.</li><li>Pour un \u00e9chec de d\u00e9marrage s\u00e9curis\u00e9 ou du chiffrement, consulter les journaux EFDE et l&#x27;\u00e9tat du microprogramme.</li><li>V\u00e9rifier si un mot de passe initial, un red\u00e9marrage ou la sortie du mode pr\u00e9sentation est attendu.</li></ol><h2>Validation</h2><ul><li>L&#x27;alerte dispara\u00eet et la progression ainsi que le pr\u00e9d\u00e9marrage sont coh\u00e9rents.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Une licence expir\u00e9e ne signifie pas que les disques sont d\u00e9chiffr\u00e9s. Le tableau source est une capture d&#x27;\u00e9cran, pas un journal du poste.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Anti-virus/Fiche%20de%20d%C3%A9pannage%20ESET.docx\">Anti-virus/Fiche de d\u00e9pannage ESET.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/ESET/Fiche%20de%20d%C3%A9pannage%20ESET.docx\">ESET/Fiche de d\u00e9pannage ESET.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Fiche de d\u00e9pannage ESET.docx",
          "relativePath": "Anti-virus/Fiche de d\u00e9pannage ESET.docx",
          "sha256": "99c48ec2a3c20fc801df91fe7356c9d6ff073197833c141bb543392dffff9127"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESET\\Fiche de d\u00e9pannage ESET.docx",
          "relativePath": "ESET/Fiche de d\u00e9pannage ESET.docx",
          "sha256": "99c48ec2a3c20fc801df91fe7356c9d6ff073197833c141bb543392dffff9127"
        }
      ],
      "sources": []
    },
    {
      "slug": "eset-windows-update",
      "tech": "eset",
      "type": "procedure",
      "title": "ESET Endpoint Security - Mettre \u00e0 jour le client Windows",
      "description": "Mettre \u00e0 jour le client sans perdre la politique ni laisser le poste sans protection.",
      "content": "<h1>ESET Endpoint Security - Mettre \u00e0 jour le client Windows</h1><p>Mettre \u00e0 jour le client sans perdre la politique ni laisser le poste sans protection.</p><h2>Proc\u00e9dure</h2><ol><li>Relever version, licence et mode de gestion ; choisir le package officiel adapt\u00e9 au parc.</li><li>Pr\u00e9venir l&#x27;utilisateur, enregistrer les fichiers et planifier le red\u00e9marrage.</li><li>Lancer l&#x27;installation ou la mise \u00e0 jour via PROTECT et suivre les options de protection pr\u00e9vues par la politique.</li><li>Red\u00e9marrer si demand\u00e9, puis contr\u00f4ler la version et l&#x27;\u00e9tat de protection.</li></ol><h2>Validation</h2><ul><li>Nouvelle version active, base de d\u00e9tection \u00e0 jour et communication PROTECT maintenue.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Le seuil 7.3 du document est historique, pas une version cible actuelle.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Anti-virus/Proc%20eset.docx\">Anti-virus/Proc eset.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Proc eset.docx",
          "relativePath": "Anti-virus/Proc eset.docx",
          "sha256": "b90f09dbeda29d51952b765ecacfedf1f4705c2673efbe4d6805acbf5fdd05f1"
        }
      ],
      "sources": []
    },
    {
      "slug": "eset-check",
      "tech": "eset",
      "type": "procedure",
      "title": "ESET - V\u00e9rifier la protection d'un poste",
      "description": "Contr\u00f4ler le statut du produit local et le rapprocher de la console de gestion.",
      "content": "<h1>ESET - V\u00e9rifier la protection d&#x27;un poste</h1><p>Contr\u00f4ler le statut du produit local et le rapprocher de la console de gestion.</p><h2>Proc\u00e9dure</h2><ol><li>Ouvrir ESET depuis la zone de notification.</li><li>Contr\u00f4ler l&#x27;\u00e9tat de protection, la licence, les modules et les derni\u00e8res mises \u00e0 jour.</li><li>Noter toute alerte plut\u00f4t que de se fier uniquement \u00e0 la couleur de l&#x27;interface.</li><li>V\u00e9rifier dans PROTECT le dernier contact, le groupe et la politique effective.</li></ol><h2>Validation</h2><ul><li>Pas d&#x27;alerte non trait\u00e9e et statut local coh\u00e9rent avec la console.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Une interface verte n&#x27;est pas une preuve d&#x27;absence de compromission.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Anti-virus/Proc%20verif%20eset.docx\">Anti-virus/Proc verif eset.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Proc verif eset.docx",
          "relativePath": "Anti-virus/Proc verif eset.docx",
          "sha256": "5ff0c82236145ca2d0d9b365493f0ed0b8d5b561c1a14de9a0613b0c8d52e072"
        }
      ],
      "sources": []
    },
    {
      "slug": "eset-efde-deploy",
      "tech": "eset",
      "type": "procedure",
      "title": "ESET EFDE - D\u00e9ployer le chiffrement de disque complet",
      "description": "Pr\u00e9parer le poste, appliquer EFDE et enregistrer un parcours de r\u00e9cup\u00e9ration utilisable.",
      "content": "<h1>ESET EFDE - D\u00e9ployer le chiffrement de disque complet</h1><p>Pr\u00e9parer le poste, appliquer EFDE et enregistrer un parcours de r\u00e9cup\u00e9ration utilisable.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier licence, sauvegarde, compatibilit\u00e9 mat\u00e9rielle et absence d&#x27;un autre chiffrement actif.</li><li>Installer le package EFDE avec les droits administrateur et effectuer le red\u00e9marrage requis.</li><li>Appliquer la politique de chiffrement et suivre l&#x27;avancement dans PROTECT.</li><li>Configurer l&#x27;authentification pr\u00e9d\u00e9marrage puis tester un red\u00e9marrage accompagn\u00e9 de l&#x27;utilisateur.</li><li>V\u00e9rifier l&#x27;acc\u00e8s autoris\u00e9 aux informations de r\u00e9cup\u00e9ration et leur conservation prot\u00e9g\u00e9e.</li></ol><h2>Commandes associ\u00e9es</h2><h3>BitLocker - Lire l&#x27;\u00e9tat des volumes</h3><p><strong>Impact : Lecture seule.</strong> Ex\u00e9cuter dans une console autoris\u00e9e, souvent \u00e9lev\u00e9e ; ne pas d\u00e9duire un d\u00e9chiffrement d&#x27;une protection suspendue.</p><pre>manage-bde -status</pre><h2>Validation</h2><ul><li>Disques attendus chiffr\u00e9s et ouverture de session fonctionnelle.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas interrompre le chiffrement. Traiter BitLocker comme une migration approuv\u00e9e, pas comme une option \u00e0 d\u00e9sactiver automatiquement.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Anti-virus/Proc%C3%A9dure%20encryptage%20de%20disque%20complet.docx\">Anti-virus/Proc\u00e9dure encryptage de disque complet.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/ESET/Proc%C3%A9dure%20encryptage%20de%20disque%20complet.docx\">ESET/Proc\u00e9dure encryptage de disque complet.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "bitlocker-status"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Proc\u00e9dure encryptage de disque complet.docx",
          "relativePath": "Anti-virus/Proc\u00e9dure encryptage de disque complet.docx",
          "sha256": "3ca52c0420c8b090745655ff8f6e2ca90a9870e778a0620f0467c49d4827d017"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESET\\Proc\u00e9dure encryptage de disque complet.docx",
          "relativePath": "ESET/Proc\u00e9dure encryptage de disque complet.docx",
          "sha256": "3ca52c0420c8b090745655ff8f6e2ca90a9870e778a0620f0467c49d4827d017"
        }
      ],
      "sources": []
    },
    {
      "slug": "eset-ntlm-smb",
      "tech": "eset",
      "type": "procedure",
      "title": "ESET - Protection r\u00e9seau NTLM et SMB",
      "description": "Retrouver les param\u00e8tres de protection NTLM/SMB et tester leur effet sur un p\u00e9rim\u00e8tre cibl\u00e9.",
      "content": "<h1>ESET - Protection r\u00e9seau NTLM et SMB</h1><p>Retrouver les param\u00e8tres de protection NTLM/SMB et tester leur effet sur un p\u00e9rim\u00e8tre cibl\u00e9.</p><h2>Proc\u00e9dure</h2><ol><li>Relever le produit et la politique appliqu\u00e9e au poste.</li><li>Ouvrir les param\u00e8tres avanc\u00e9s de protection r\u00e9seau ; retrouver les options NTLM/SMB de la version install\u00e9e.</li><li>Comparer la configuration avec la politique attendue et les journaux de blocage.</li><li>Tester l&#x27;acc\u00e8s \u00e0 un partage autoris\u00e9 et une authentification normale avant d&#x27;\u00e9tendre la politique.</li></ol><h2>Validation</h2><ul><li>Partages l\u00e9gitimes accessibles et alertes comprises.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas d\u00e9sactiver la protection globalement pour contourner un \u00e9chec SMB ; limiter toute exception au cas approuv\u00e9.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Anti-virus/Proc%C3%A9dure%20protection%20NTLM%20et%20SMB.docx\">Anti-virus/Proc\u00e9dure protection NTLM et SMB.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Proc\u00e9dure protection NTLM et SMB.docx",
          "relativePath": "Anti-virus/Proc\u00e9dure protection NTLM et SMB.docx",
          "sha256": "d0772dcc93640c19dc86cd41b8e6ab22a7ddf9c4089e939027a6b0d388ad1150"
        }
      ],
      "sources": []
    },
    {
      "slug": "eset-efde-recovery",
      "tech": "eset",
      "type": "procedure",
      "title": "ESET EFDE - R\u00e9cup\u00e9rer ou d\u00e9chiffrer un poste",
      "description": "Utiliser le parcours de r\u00e9cup\u00e9ration EFDE ou retirer le chiffrement avant d\u00e9sinstallation.",
      "content": "<h1>ESET EFDE - R\u00e9cup\u00e9rer ou d\u00e9chiffrer un poste</h1><p>Utiliser le parcours de r\u00e9cup\u00e9ration EFDE ou retirer le chiffrement avant d\u00e9sinstallation.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier l&#x27;identit\u00e9 du poste et l&#x27;autorisation ; sauvegarder et obtenir les informations de r\u00e9cup\u00e9ration depuis PROTECT.</li><li>Pour un poste non d\u00e9marrable, cr\u00e9er le support de r\u00e9cup\u00e9ration correspondant et suivre l&#x27;assistant de d\u00e9chiffrement avec le fichier g\u00e9r\u00e9 par EFDE.</li><li>Pour un retrait normal, supprimer les politiques contradictoires puis affecter une politique EFDE d\u00e9sactivant le chiffrement.</li><li>Attendre Chiffrement inactif pour tous les disques avant de d\u00e9sinstaller EFDE via une t\u00e2che client.</li></ol><h2>Validation</h2><ul><li>Donn\u00e9es accessibles et Windows d\u00e9marre sans demande EFDE apr\u00e8s retrait.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas couper l&#x27;alimentation durant le d\u00e9chiffrement. Ne jamais d\u00e9sinstaller le produit avant la fin ; prot\u00e9ger le support et le secret de r\u00e9cup\u00e9ration.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Anti-virus/Proc%C3%A9dure%20solution%20d%C3%A9cryptage.docx\">Anti-virus/Proc\u00e9dure solution d\u00e9cryptage.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/ESET/Proc%C3%A9dure%20solution%20d%C3%A9cryptage.docx\">ESET/Proc\u00e9dure solution d\u00e9cryptage.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Proc\u00e9dure solution d\u00e9cryptage.docx",
          "relativePath": "Anti-virus/Proc\u00e9dure solution d\u00e9cryptage.docx",
          "sha256": "161416288c04118891e045101d08619f8288ce911dbeb5b0170641c10693aa41"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESET\\Proc\u00e9dure solution d\u00e9cryptage.docx",
          "relativePath": "ESET/Proc\u00e9dure solution d\u00e9cryptage.docx",
          "sha256": "161416288c04118891e045101d08619f8288ce911dbeb5b0170641c10693aa41"
        }
      ],
      "sources": []
    },
    {
      "slug": "iis-winacme",
      "tech": "iis",
      "type": "procedure",
      "title": "IIS - Installer un certificat ACME avec win-acme",
      "description": "Obtenir un certificat pour les noms IIS voulus et v\u00e9rifier son renouvellement.",
      "content": "<h1>IIS - Installer un certificat ACME avec win-acme</h1><p>Obtenir un certificat pour les noms IIS voulus et v\u00e9rifier son renouvellement.</p><h2>Proc\u00e9dure</h2><ol><li>Relever les bindings IIS, les FQDN, le DNS et le chemin de validation ; sauvegarder la configuration.</li><li>Installer win-acme depuis sa distribution officielle et lancer wacs.exe en administrateur.</li><li>Choisir le site et les noms, puis le challenge adapt\u00e9 ; pour HTTP-01, rendre le challenge accessible sur le port 80.</li><li>V\u00e9rifier l&#x27;installation du certificat dans la liaison HTTPS et la s\u00e9lection SNI.</li><li>Contr\u00f4ler la t\u00e2che de renouvellement, son compte et les journaux.</li></ol><h2>Commandes associ\u00e9es</h2><h3>win-acme - Ouvrir l&#x27;assistant ACME</h3><p><strong>Impact : Assistant de configuration / certificat.</strong> Console administrateur ; toute \u00e9mission ou modification de binding dans l&#x27;assistant doit \u00eatre valid\u00e9e.</p><pre>.\\wacs.exe</pre><h2>Validation</h2><ul><li>Certificat servi pour le bon nom, cha\u00eene valide et renouvellement supervis\u00e9.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Les dur\u00e9es 60/90 jours de la source ne doivent pas \u00eatre cod\u00e9es en dur ; suivre le client et les conditions de l&#x27;autorit\u00e9.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Certificats/Proc%C3%A9dure%20installation%20certificat%20Letsencrypt%20sur%20IIS%20via%20CMD.docx\">Certificats/Proc\u00e9dure installation certificat Letsencrypt sur IIS via CMD.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://www.win-acme.com/manual/getting-started\" target=\"_blank\" rel=\"noopener noreferrer\">win-acme - Documentation</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "run-wacs"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Certificats\\Proc\u00e9dure installation certificat Letsencrypt sur IIS via CMD.docx",
          "relativePath": "Certificats/Proc\u00e9dure installation certificat Letsencrypt sur IIS via CMD.docx",
          "sha256": "3c95c2ce76a8718a4dd8ac2a5c5d7f1991875d3f1ce8669819392c200870d7cc"
        }
      ],
      "sources": [
        {
          "title": "win-acme - Documentation",
          "url": "https://www.win-acme.com/manual/getting-started"
        }
      ]
    },
    {
      "slug": "iis-certify",
      "tech": "iis",
      "type": "procedure",
      "title": "IIS - G\u00e9rer un certificat avec Certify The Web",
      "description": "Cr\u00e9er un certificat g\u00e9r\u00e9 pour un site IIS et surveiller les \u00e9checs de renouvellement.",
      "content": "<h1>IIS - G\u00e9rer un certificat avec Certify The Web</h1><p>Cr\u00e9er un certificat g\u00e9r\u00e9 pour un site IIS et surveiller les \u00e9checs de renouvellement.</p><h2>Proc\u00e9dure</h2><ol><li>Installer le logiciel officiel ; v\u00e9rifier licence, site IIS, noms DNS et bindings.</li><li>Cr\u00e9er un contact ACME avec une adresse suivie, choisir l&#x27;autorit\u00e9 et accepter ses conditions.</li><li>Ajouter un certificat g\u00e9r\u00e9 pour le site et s\u00e9lectionner uniquement les noms n\u00e9cessaires.</li><li>Tester la validation avant Request Certificate ; activer renouvellement automatique et notification d&#x27;\u00e9chec.</li><li>Contr\u00f4ler le certificat servi dans IIS et les dates affich\u00e9es par le gestionnaire.</li></ol><h2>Validation</h2><ul><li>\u00c9mission r\u00e9ussie, binding correct et alertes de renouvellement test\u00e9es.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas supposer que la licence communautaire ou la cadence d&#x27;un ancien tutoriel est toujours identique.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Certificats/Proc%C3%A9dure%20installation%20certificat%20Letsencrypt%20sur%20IIS%20via%20logiciel.docx\">Certificats/Proc\u00e9dure installation certificat Letsencrypt sur IIS via logiciel.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://docs.certifytheweb.com/docs/\" target=\"_blank\" rel=\"noopener noreferrer\">Certify The Web - Documentation</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Certificats\\Proc\u00e9dure installation certificat Letsencrypt sur IIS via logiciel.docx",
          "relativePath": "Certificats/Proc\u00e9dure installation certificat Letsencrypt sur IIS via logiciel.docx",
          "sha256": "c2a0de04678414f5e6ee3b8c0022608be60c2531f8007038b27df06d9657d367"
        }
      ],
      "sources": [
        {
          "title": "Certify The Web - Documentation",
          "url": "https://docs.certifytheweb.com/docs/"
        }
      ]
    },
    {
      "slug": "cisco-backup-users",
      "tech": "cisco",
      "type": "procedure",
      "title": "Cisco IOS - Sauvegarder la configuration et g\u00e9rer un compte local",
      "description": "Conserver la configuration valid\u00e9e et encadrer les modifications de comptes administrateur.",
      "content": "<h1>Cisco IOS - Sauvegarder la configuration et g\u00e9rer un compte local</h1><p>Conserver la configuration valid\u00e9e et encadrer les modifications de comptes administrateur.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier l&#x27;\u00e9quipement et conserver un acc\u00e8s de secours avant toute modification de compte.</li><li>Depuis EXEC privil\u00e9gi\u00e9, sauvegarder running-config vers startup-config apr\u00e8s validation du changement.</li><li>Pour l&#x27;export TFTP, fournir le serveur et un nom de fichier explicite ; prot\u00e9ger le r\u00e9seau de transfert.</li><li>En configuration globale, cr\u00e9er ou retirer seulement le compte approuv\u00e9 et valider un nouvel acc\u00e8s avant de quitter.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Cisco IOS - Sauvegarder la configuration active</h3><p><strong>Impact : \u00c9criture de configuration persistante.</strong> EXEC privil\u00e9gi\u00e9. Sauvegarder uniquement une configuration valid\u00e9e ; cette commande ne cr\u00e9e pas une sauvegarde externe.</p><pre>copy running-config startup-config</pre><h3>Cisco IOS - Exporter la configuration vers TFTP</h3><p><strong>Impact : Export de configuration sensible.</strong> EXEC privil\u00e9gi\u00e9. TFTP est non chiffr\u00e9 ; utiliser seulement un r\u00e9seau et un stockage prot\u00e9g\u00e9s, ou un transfert s\u00e9curis\u00e9 support\u00e9.</p><pre>copy running-config tftp:</pre><h3>Cisco IOS - Cr\u00e9er un compte local privil\u00e9gi\u00e9</h3><p><strong>Impact : Modification des acc\u00e8s administrateur.</strong> privilege 15 donne des droits complets. Conserver un acc\u00e8s de secours et prot\u00e9ger historique/secret ; v\u00e9rifier le type de secret support\u00e9 sur la release.</p><pre>username &lt;UTILISATEUR&gt; privilege 15 secret &lt;SECRET&gt;</pre><h3>Cisco IOS - Retirer un compte local</h3><p><strong>Impact : Suppression d&#x27;acc\u00e8s.</strong> Configuration globale. V\u00e9rifier que ce n&#x27;est pas le seul compte d&#x27;administration ; conserver console et acc\u00e8s de secours.</p><pre>no username &lt;UTILISATEUR&gt;</pre><h2>Validation</h2><ul><li>Sauvegarde relisible et acc\u00e8s administrateur de secours conserv\u00e9.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>TFTP ne chiffre ni le transfert ni les secrets de configuration. privilege 15 donne des droits complets ; la ligne no username de la source doit \u00eatre adapt\u00e9e \u00e0 IOS.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Cisco/Commande%20CISCO.txt\">Cisco/Commande CISCO.txt</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "cisco-save",
        "cisco-tftp",
        "cisco-user-add",
        "cisco-user-remove"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Cisco\\Commande CISCO.txt",
          "relativePath": "Cisco/Commande CISCO.txt",
          "sha256": "450d339b4fc1432262db81c1c5a8187796be20be5c4babacdcb4741d3380cd65"
        }
      ],
      "sources": []
    },
    {
      "slug": "gophish-awareness",
      "tech": "cyber",
      "type": "procedure",
      "title": "Gophish - Pr\u00e9parer une campagne de sensibilisation autoris\u00e9e",
      "description": "Mesurer signalements et interactions sur une campagne interne valid\u00e9e, sans collecter de vrais mots de passe.",
      "content": "<h1>Gophish - Pr\u00e9parer une campagne de sensibilisation autoris\u00e9e</h1><p>Mesurer signalements et interactions sur une campagne interne valid\u00e9e, sans collecter de vrais mots de passe.</p><h2>Proc\u00e9dure</h2><ol><li>Faire valider p\u00e9rim\u00e8tre, dates, destinataires, domaine de simulation, communication et r\u00e9tention des r\u00e9sultats.</li><li>Installer l&#x27;outil officiel et limiter l&#x27;acc\u00e8s d&#x27;administration ; changer le secret initial.</li><li>Importer uniquement les utilisateurs autoris\u00e9s dans Users &amp; Groups ; pr\u00e9parer un mod\u00e8le et une page de sensibilisation contr\u00f4l\u00e9s.</li><li>Garder Capture Passwords d\u00e9sactiv\u00e9 ; limiter les donn\u00e9es collect\u00e9es aux besoins approuv\u00e9s.</li><li>Configurer le profil SMTP, envoyer un test au groupe pilote et planifier la campagne.</li><li>Analyser les r\u00e9sultats avec leurs limites, organiser le d\u00e9brief et retirer les donn\u00e9es selon la dur\u00e9e pr\u00e9vue.</li></ol><h2>Commandes associ\u00e9es</h2><h3>AD - Exporter un groupe pilote pour Gophish</h3><p><strong>Impact : Lecture AD / export de donn\u00e9es personnelles.</strong> Autorisation explicite du p\u00e9rim\u00e8tre de sensibilisation, r\u00e9pertoire prot\u00e9g\u00e9 et dur\u00e9e de conservation limit\u00e9e. Un fichier existant peut \u00eatre remplac\u00e9.</p><pre>Get-ADUser -Filter * -SearchBase &quot;&lt;OU_DN&gt;&quot; -Properties mail,givenName,sn,title | Select-Object @{n=&#x27;First Name&#x27;;e={$_.givenName}},@{n=&#x27;Last Name&#x27;;e={$_.sn}},@{n=&#x27;Email&#x27;;e={$_.mail}},@{n=&#x27;Position&#x27;;e={$_.title}} | Export-Csv -LiteralPath &quot;&lt;CSV&gt;&quot; -Delimiter &#x27;,&#x27; -NoTypeInformation -Encoding UTF8</pre><h2>Validation</h2><ul><li>Test pilote valid\u00e9, suivi et canal de signalement fonctionnels.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas utiliser ce parcours pour r\u00e9colter des identifiants ou viser des personnes hors du p\u00e9rim\u00e8tre autoris\u00e9.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Cyber/Proc%C3%A9dure%20phishing.docx\">Cyber/Proc\u00e9dure phishing.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://docs.getgophish.com/user-guide/\" target=\"_blank\" rel=\"noopener noreferrer\">Gophish - Documentation</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "gophish-ad-export"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Cyber\\Proc\u00e9dure phishing.docx",
          "relativePath": "Cyber/Proc\u00e9dure phishing.docx",
          "sha256": "5d3257353886dcd1225e5472e329135ea8639b7a736b91c1b9d34c60d306b8f0"
        }
      ],
      "sources": [
        {
          "title": "Gophish - Documentation",
          "url": "https://docs.getgophish.com/user-guide/"
        }
      ]
    },
    {
      "slug": "ad-onboarding",
      "tech": "ad",
      "type": "procedure",
      "title": "Active Directory - Cr\u00e9er un utilisateur et sa messagerie",
      "description": "Cr\u00e9er un compte avec les droits n\u00e9cessaires, puis sa bo\u00eete locale ou cloud.",
      "content": "<h1>Active Directory - Cr\u00e9er un utilisateur et sa messagerie</h1><p>Cr\u00e9er un compte avec les droits n\u00e9cessaires, puis sa bo\u00eete locale ou cloud.</p><h2>Proc\u00e9dure</h2><ol><li>Faire valider nom, UPN, OU, groupes et besoin de messagerie ; v\u00e9rifier que le compte n&#x27;existe pas.</li><li>Dans Utilisateurs et ordinateurs AD, cr\u00e9er le compte dans la bonne OU et renseigner l&#x27;adresse de messagerie.</li><li>V\u00e9rifier les groupes un par un au lieu de copier sans contr\u00f4le tous les droits d&#x27;un coll\u00e8gue.</li><li>Pour Exchange local, activer la bo\u00eete sur l&#x27;utilisateur existant ; pour Microsoft 365, v\u00e9rifier la synchronisation et la licence.</li><li>Transmettre le secret initial par un canal approuv\u00e9 et tester ouverture de session, envoi et r\u00e9ception.</li></ol><h2>Validation</h2><ul><li>Identit\u00e9 et droits corrects, compte synchronis\u00e9 si pr\u00e9vu et messagerie fonctionnelle.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas stocker les mots de passe dans Excel ni un fichier TXT partag\u00e9. La synchronisation ne suit pas un d\u00e9lai universel d&#x27;une heure.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/DC/Comment%20cr%C3%A9er%20un%20utilisateur.docx\">DC/Comment cr\u00e9er un utilisateur.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Domaine/Comment%20cr%C3%A9er%20un%20utilisateur.docx\">Domaine/Comment cr\u00e9er un utilisateur.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Domaine/Cr%C3%A9er%20des%20utilisateurs.docx\">Domaine/Cr\u00e9er des utilisateurs.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\DC\\Comment cr\u00e9er un utilisateur.docx",
          "relativePath": "DC/Comment cr\u00e9er un utilisateur.docx",
          "sha256": "a8e72ccfd58b8c5a59b39c372aee8387294a2327457ddc7f487a4f993e1f2876"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Comment cr\u00e9er un utilisateur.docx",
          "relativePath": "Domaine/Comment cr\u00e9er un utilisateur.docx",
          "sha256": "a8e72ccfd58b8c5a59b39c372aee8387294a2327457ddc7f487a4f993e1f2876"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Cr\u00e9er des utilisateurs.docx",
          "relativePath": "Domaine/Cr\u00e9er des utilisateurs.docx",
          "sha256": "2dee64e049d0a3547f7c69e557a1bb7f05c8dea204b9ea4481ec58de65818f56"
        }
      ],
      "sources": []
    },
    {
      "slug": "gpo-fonts",
      "tech": "gpo",
      "type": "procedure",
      "title": "GPO - D\u00e9ployer des polices par script de d\u00e9marrage",
      "description": "Distribuer les fichiers de police depuis un partage contr\u00f4l\u00e9 vers les postes pilotes.",
      "content": "<h1>GPO - D\u00e9ployer des polices par script de d\u00e9marrage</h1><p>Distribuer les fichiers de police depuis un partage contr\u00f4l\u00e9 vers les postes pilotes.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier droits d&#x27;utilisation des polices, formats et compatibilit\u00e9 des postes.</li><li>Placer les fichiers et le script sur un partage accessible en lecture aux comptes ordinateurs.</li><li>Cr\u00e9er une GPO de script de d\u00e9marrage ordinateur, lier une OU pilote et contr\u00f4ler le filtrage.</li><li>Tester le script, la copie et l&#x27;enregistrement des polices dans le contexte syst\u00e8me avant d&#x27;\u00e9tendre le d\u00e9ploiement.</li></ol><h2>Commandes associ\u00e9es</h2><h3>GPO - Copier des polices depuis un partage</h3><p><strong>Impact : \u00c9criture syst\u00e8me / remplacement de fichiers.</strong> Contexte administrateur ou syst\u00e8me. Force peut \u00e9craser des fichiers ; une copie seule ne garantit pas l&#x27;installation des polices.</p><pre>Copy-Item -Path &quot;&lt;PARTAGE_POLICES&gt;\\*.ttf&quot; -Destination &quot;C:\\Windows\\Fonts&quot; -Force</pre><h2>Validation</h2><ul><li>Polices visibles et utilisables dans l&#x27;application cible apr\u00e8s application.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Copier des .ttf ne garantit pas leur enregistrement sur toutes les versions. La commande de copie peut \u00e9craser des fichiers : tester et sauvegarder.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/DC/GPO%20pour%20police%20SALINI.docx\">DC/GPO pour police SALINI.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "copy-fonts"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\DC\\GPO pour police SALINI.docx",
          "relativePath": "DC/GPO pour police SALINI.docx",
          "sha256": "98c9dfe014676383d9b6ba002da91ae6d8f938c333db105feeb3c9025ee45c4e"
        }
      ],
      "sources": []
    },
    {
      "slug": "kubernetes-debian",
      "tech": "k8s",
      "type": "procedure",
      "title": "Kubernetes - Pr\u00e9parer un d\u00e9ploiement kubeadm sur Debian",
      "description": "Organiser runtime CRI, pr\u00e9requis syst\u00e8me et CNI sans recopier les erreurs du d\u00e9ploiement historique.",
      "content": "<h1>Kubernetes - Pr\u00e9parer un d\u00e9ploiement kubeadm sur Debian</h1><p>Organiser runtime CRI, pr\u00e9requis syst\u00e8me et CNI sans recopier les erreurs du d\u00e9ploiement historique.</p><h2>Proc\u00e9dure</h2><ol><li>Choisir des versions support\u00e9es et un runtime CRI coh\u00e9rent. La source annonce CRI-O mais installe Docker et cri-dockerd.</li><li>Configurer r\u00e9solution des noms, flux inter-n\u0153uds, modules overlay/br_netfilter et routage selon le design.</li><li>Traiter le swap selon la configuration kubelet et la documentation de la version choisie ; sauvegarder fstab avant modification.</li><li>Installer le runtime, kubelet, kubeadm et kubectl depuis des d\u00e9p\u00f4ts sign\u00e9s ; ne pas utiliser trusted=yes.</li><li>Initialiser le control plane avec le socket CRI et un CIDR Pods coh\u00e9rent avec le CNI retenu.</li><li>Installer un seul CNI valid\u00e9, distribuer un jeton temporaire de jointure aux workers, puis contr\u00f4ler n\u0153uds et pods.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Kubernetes - Charger overlay et br_netfilter</h3><p><strong>Impact : Modification noyau en cours d&#x27;ex\u00e9cution.</strong> V\u00e9rifier les pr\u00e9requis du runtime/CNI ; ces lignes ne rendent pas la configuration persistante.</p><pre>sudo modprobe overlay\nsudo modprobe br_netfilter</pre><h3>Linux - Lire l&#x27;utilisation m\u00e9moire et swap</h3><p><strong>Impact : Lecture seule.</strong> Une valeur ponctuelle ne suffit pas pour conclure \u00e0 une saturation m\u00e9moire.</p><pre>free -m</pre><h3>Kubernetes - Appliquer les fichiers sysctl</h3><p><strong>Impact : Modification des param\u00e8tres noyau.</strong> Relire tous les fichiers pris en compte, pas seulement k8s.conf. Peut affecter routage et r\u00e9seau du serveur.</p><pre>sudo sysctl --system</pre><h3>Kubernetes - Figer les paquets de gestion de version</h3><p><strong>Impact : Modification de la politique de mise \u00e0 jour.</strong> Pr\u00e9voir un processus de mise \u00e0 niveau et de correctifs ; ne pas laisser les versions fig\u00e9es sans suivi.</p><pre>sudo apt-mark hold kubelet kubeadm kubectl</pre><h3>Kubernetes - Initialiser un control plane kubeadm</h3><p><strong>Impact : Cr\u00e9ation de cluster / configuration syst\u00e8me.</strong> Uniquement sur un n\u0153ud neuf pr\u00e9par\u00e9. Ne pas ex\u00e9cuter sur un cluster existant ; adapter le socket si un autre runtime CRI est retenu.</p><pre>sudo kubeadm init --pod-network-cidr=&lt;CIDR_PODS&gt; --cri-socket unix:///var/run/cri-dockerd.sock</pre><h3>Kubernetes - Joindre un worker avec un jeton temporaire</h3><p><strong>Impact : Ajout d&#x27;un n\u0153ud / modification syst\u00e8me.</strong> Le jeton est un secret temporaire. V\u00e9rifier l&#x27;identit\u00e9 du cluster, le hash et le runtime avant ex\u00e9cution.</p><pre>sudo kubeadm join &lt;CONTROL_PLANE&gt;:6443 --token &lt;TOKEN&gt; --discovery-token-ca-cert-hash sha256:&lt;CA_HASH&gt; --cri-socket unix:///var/run/cri-dockerd.sock</pre><h3>Kubernetes - G\u00e9n\u00e9rer une commande de jointure</h3><p><strong>Impact : Cr\u00e9ation de secret d&#x27;acc\u00e8s au cluster.</strong> Ex\u00e9cuter sur le control plane autoris\u00e9 ; prot\u00e9ger la sortie et r\u00e9voquer le jeton s&#x27;il n&#x27;est plus utile.</p><pre>sudo kubeadm token create --print-join-command</pre><h3>Kubernetes - Lister les n\u0153uds</h3><p><strong>Impact : Lecture seule.</strong> V\u00e9rifier le contexte kubeconfig avant la collecte.</p><pre>kubectl get nodes</pre><h3>Kubernetes - Lister les pods de tous les namespaces</h3><p><strong>Impact : Lecture seule.</strong> N\u00e9cessite des droits de lecture sur le p\u00e9rim\u00e8tre ; v\u00e9rifier le contexte courant.</p><pre>kubectl get pods -A</pre><h2>Validation</h2><ul><li>N\u0153uds Ready, DNS du cluster et communication inter-pods valid\u00e9s.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas r\u00e9utiliser le token, le hash, l&#x27;IP ou le manifeste master non fig\u00e9 de la source. admin.conf donne un acc\u00e8s administrateur au cluster.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Docker/D%C3%A9ploiement%20kubernetes%20Debian11.docx\">Docker/D\u00e9ploiement kubernetes Debian11.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/\" target=\"_blank\" rel=\"noopener noreferrer\">Kubernetes - Installation kubeadm</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "k8s-modules",
        "k8s-free",
        "k8s-sysctl",
        "k8s-hold",
        "k8s-init",
        "k8s-join",
        "k8s-token",
        "k8s-nodes",
        "k8s-pods"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Docker\\D\u00e9ploiement kubernetes Debian11.docx",
          "relativePath": "Docker/D\u00e9ploiement kubernetes Debian11.docx",
          "sha256": "a4fb9b3744ccd5543c18815eccd6a67433f134ff3873e3d2129263874a61729b"
        }
      ],
      "sources": [
        {
          "title": "Kubernetes - Installation kubeadm",
          "url": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/"
        }
      ]
    },
    {
      "slug": "ntfs-powershell",
      "tech": "ad",
      "type": "procedure",
      "title": "Windows - Lire les droits NTFS avec PowerShell",
      "description": "Lire les ACL d'un chemin cible avec NTFSSecurity sans les modifier.",
      "content": "<h1>Windows - Lire les droits NTFS avec PowerShell</h1><p>Lire les ACL d&#x27;un chemin cible avec NTFSSecurity sans les modifier.</p><h2>Proc\u00e9dure</h2><ol><li>Identifier le chemin et les comptes \u00e0 contr\u00f4ler ; distinguer permissions NTFS, partage et droits effectifs.</li><li>Installer le module NTFSSecurity depuis une source approuv\u00e9e si n\u00e9cessaire.</li><li>Ex\u00e9cuter Get-NTFSAccess sur le chemin puis afficher la sortie en tableau.</li><li>Examiner h\u00e9ritage et ACE de refus ; tester avec un compte non administrateur repr\u00e9sentatif.</li></ol><h2>Commandes associ\u00e9es</h2><h3>PowerShell - Installer le module NTFSSecurity</h3><p><strong>Impact : Installation d&#x27;un module.</strong> V\u00e9rifier provenance, version et politique de d\u00e9p\u00f4t avant d&#x27;accepter l&#x27;installation.</p><pre>Install-Module -Name NTFSSecurity -Scope CurrentUser</pre><h3>NTFSSecurity - Lire les permissions d&#x27;un chemin</h3><p><strong>Impact : Lecture seule.</strong> N\u00e9cessite le module NTFSSecurity ; permissions NTFS et de partage sont distinctes.</p><pre>Get-NTFSAccess -Path &quot;&lt;CHEMIN&gt;&quot;</pre><h3>NTFSSecurity - Afficher les permissions en tableau</h3><p><strong>Impact : Lecture seule.</strong> Une vue tableau peut tronquer des champs ; conserver la sortie structur\u00e9e si n\u00e9cessaire.</p><pre>Get-NTFSAccess -Path &quot;&lt;CHEMIN&gt;&quot; | Format-Table -AutoSize</pre><h2>Validation</h2><ul><li>ACL conserv\u00e9e dans le diagnostic et acc\u00e8s effectif expliqu\u00e9.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Lire les ACL ne calcule pas \u00e0 lui seul tous les droits effectifs d&#x27;un utilisateur et de ses groupes.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Domaine/Connaitre%20les%20droits%20NTFS%20en%20PowerShell.docx\">Domaine/Connaitre les droits NTFS en PowerShell.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "ntfs-install",
        "ntfs-read",
        "ntfs-table"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Connaitre les droits NTFS en PowerShell.docx",
          "relativePath": "Domaine/Connaitre les droits NTFS en PowerShell.docx",
          "sha256": "09f0544354941bcc82bbaaabd9dfe90e145a8e86ed970961fdd7ce4ae066a3df"
        }
      ],
      "sources": []
    },
    {
      "slug": "ad-domain-controller",
      "tech": "ad",
      "type": "procedure",
      "title": "Active Directory - Ajouter un contr\u00f4leur de domaine",
      "description": "Promouvoir un serveur membre comme DC suppl\u00e9mentaire dans un domaine existant.",
      "content": "<h1>Active Directory - Ajouter un contr\u00f4leur de domaine</h1><p>Promouvoir un serveur membre comme DC suppl\u00e9mentaire dans un domaine existant.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier compatibilit\u00e9, sauvegardes AD, DNS, IP statique, synchronisation horaire et r\u00e9plication existante.</li><li>Installer le r\u00f4le AD DS avec le Gestionnaire de serveur.</li><li>Choisir Ajouter un contr\u00f4leur de domaine \u00e0 un domaine existant et renseigner les droits requis.</li><li>Configurer DNS, catalogue global, site et mot de passe DSRM prot\u00e9g\u00e9 ; choisir la source de r\u00e9plication.</li><li>Contr\u00f4ler les pr\u00e9requis, promouvoir, puis valider apr\u00e8s red\u00e9marrage.</li></ol><h2>Validation</h2><ul><li>DNS, SYSVOL/NETLOGON et r\u00e9plication AD fonctionnels.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Les r\u00e9f\u00e9rences Windows 2003/2008 du document ne sont pas des cibles support\u00e9es. Un RODC peut mettre en cache certains secrets selon sa politique.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Domaine/contr%C3%B4leur%20de%20domaine.docx\">Domaine/contr\u00f4leur de domaine.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\contr\u00f4leur de domaine.docx",
          "relativePath": "Domaine/contr\u00f4leur de domaine.docx",
          "sha256": "a9ee4c3dbc992e8ff1de35f2e88d632d0dcc00b39bcf5424ab37ea38989adaf5"
        }
      ],
      "sources": []
    },
    {
      "slug": "exchange-create-mailbox",
      "tech": "exchange",
      "type": "procedure",
      "title": "Exchange local - Cr\u00e9er et contr\u00f4ler une bo\u00eete utilisateur",
      "description": "Cr\u00e9er une bo\u00eete Exchange locale avec un UPN et une OU v\u00e9rifi\u00e9s.",
      "content": "<h1>Exchange local - Cr\u00e9er et contr\u00f4ler une bo\u00eete utilisateur</h1><p>Cr\u00e9er une bo\u00eete Exchange locale avec un UPN et une OU v\u00e9rifi\u00e9s.</p><h2>Proc\u00e9dure</h2><ol><li>Ouvrir Exchange Management Shell avec les droits requis et v\u00e9rifier l&#x27;absence d&#x27;une identit\u00e9 existante.</li><li>Pour un nouveau compte et sa bo\u00eete, utiliser New-Mailbox et saisir le mot de passe sous forme SecureString.</li><li>Si le compte AD existe d\u00e9j\u00e0, utiliser le parcours d&#x27;activation d&#x27;une bo\u00eete existante plut\u00f4t que de cr\u00e9er un doublon.</li><li>Lire Name, DisplayName, Alias, PrimarySmtpAddress et Database avec Get-Mailbox.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Exchange local - Cr\u00e9er une bo\u00eete et un compte</h3><p><strong>Impact : Cr\u00e9ation d&#x27;identit\u00e9 et de bo\u00eete.</strong> Exchange Management Shell local avec droits requis. Ne pas utiliser pour un compte AD existant et ne pas ignorer le p\u00e9rim\u00e8tre OU.</p><pre>New-Mailbox -Name &quot;&lt;NOM&gt;&quot; -UserPrincipalName &quot;&lt;UPN&gt;&quot; -OrganizationalUnit &quot;&lt;OU_DN&gt;&quot; -Password (Read-Host &#x27;Mot de passe initial&#x27; -AsSecureString)</pre><h3>Exchange local - Lire les propri\u00e9t\u00e9s d&#x27;une bo\u00eete</h3><p><strong>Impact : Lecture seule.</strong> V\u00e9rifier le serveur ou l&#x27;organisation de gestion.</p><pre>Get-Mailbox -Identity &quot;&lt;IDENTITE&gt;&quot; | Format-List Name,DisplayName,Alias,PrimarySmtpAddress,Database</pre><h2>Validation</h2><ul><li>Bo\u00eete dans la bonne base, adresse correcte et test d&#x27;envoi/r\u00e9ception r\u00e9ussi.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas conserver un mot de passe en clair dans une commande, un script ou l&#x27;historique.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Domaine/Cr%C3%A9ation%20utilisateur%20shell%20manager.docx\">Domaine/Cr\u00e9ation utilisateur shell manager.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "exchange-new-mailbox",
        "exchange-get-mailbox"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Cr\u00e9ation utilisateur shell manager.docx",
          "relativePath": "Domaine/Cr\u00e9ation utilisateur shell manager.docx",
          "sha256": "92d4e7b9852f094b83eadebcdd89784775dcb48f1ce5e73c7a60a4ab55622367"
        }
      ],
      "sources": []
    },
    {
      "slug": "ad-delegation",
      "tech": "ad",
      "type": "procedure",
      "title": "Active Directory - D\u00e9l\u00e9guer une t\u00e2che sur une OU",
      "description": "Donner des droits d'administration limit\u00e9s \u00e0 une OU et \u00e0 des actions pr\u00e9cises.",
      "content": "<h1>Active Directory - D\u00e9l\u00e9guer une t\u00e2che sur une OU</h1><p>Donner des droits d&#x27;administration limit\u00e9s \u00e0 une OU et \u00e0 des actions pr\u00e9cises.</p><h2>Proc\u00e9dure</h2><ol><li>D\u00e9finir le groupe, l&#x27;OU et les op\u00e9rations autoris\u00e9es ; conserver l&#x27;ACL de d\u00e9part.</li><li>Sur l&#x27;OU cible, ouvrir D\u00e9l\u00e9gation de contr\u00f4le et s\u00e9lectionner le groupe concern\u00e9.</li><li>Choisir seulement les t\u00e2ches ou permissions personnalis\u00e9es n\u00e9cessaires.</li><li>Tester avec un membre du groupe sur l&#x27;OU cible puis sur une OU hors p\u00e9rim\u00e8tre.</li></ol><h2>Validation</h2><ul><li>Action autoris\u00e9e dans la bonne OU et refus\u00e9e ailleurs.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas d\u00e9l\u00e9guer au niveau du domaine pour un besoin limit\u00e9 \u00e0 une OU.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Domaine/D%C3%A9l%C3%A9gation.docx\">Domaine/D\u00e9l\u00e9gation.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\D\u00e9l\u00e9gation.docx",
          "relativePath": "Domaine/D\u00e9l\u00e9gation.docx",
          "sha256": "5dbb6130195ce223ce1780abc7924c2dbc27f17a649c0ccde88da6cd4e7697d0"
        }
      ],
      "sources": []
    },
    {
      "slug": "gpo-password-warning",
      "tech": "gpo",
      "type": "procedure",
      "title": "GPO - Afficher un avertissement d'expiration du mot de passe",
      "description": "Configurer l'avertissement de connexion sans modifier la dur\u00e9e de vie du mot de passe.",
      "content": "<h1>GPO - Afficher un avertissement d&#x27;expiration du mot de passe</h1><p>Configurer l&#x27;avertissement de connexion sans modifier la dur\u00e9e de vie du mot de passe.</p><h2>Proc\u00e9dure</h2><ol><li>Cr\u00e9er une GPO d\u00e9di\u00e9e et cibler les ordinateurs concern\u00e9s.</li><li>Dans Configuration ordinateur &gt; Param\u00e8tres Windows &gt; Param\u00e8tres de s\u00e9curit\u00e9 &gt; Strat\u00e9gies locales &gt; Options de s\u00e9curit\u00e9, ouvrir l&#x27;option de connexion interactive d&#x27;avertissement avant expiration.</li><li>D\u00e9finir le nombre de jours conforme \u00e0 la politique ; 14 jours est l&#x27;exemple source.</li><li>V\u00e9rifier l&#x27;application et tester une ouverture de session d&#x27;un compte dont l&#x27;expiration approche.</li></ol><h2>Validation</h2><ul><li>Avertissement au moment attendu, sans changement involontaire de politique de mot de passe.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ce param\u00e8tre ne remplace pas la politique AD ou les politiques affin\u00e9es.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Domaine/Expiration%20MDP%20AD.docx\">Domaine/Expiration MDP AD.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Expiration MDP AD.docx",
          "relativePath": "Domaine/Expiration MDP AD.docx",
          "sha256": "65e78dfde089189e7aa346b83c72319465514a6efe11e2d2c62ebf9de62738e6"
        }
      ],
      "sources": []
    },
    {
      "slug": "gpo-openvpn-group",
      "tech": "gpo",
      "type": "procedure",
      "title": "GPO - G\u00e9rer le groupe OpenVPN Administrators",
      "description": "Permettre les op\u00e9rations OpenVPN pr\u00e9vues sans accorder une administration locale g\u00e9n\u00e9rale.",
      "content": "<h1>GPO - G\u00e9rer le groupe OpenVPN Administrators</h1><p>Permettre les op\u00e9rations OpenVPN pr\u00e9vues sans accorder une administration locale g\u00e9n\u00e9rale.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier que le groupe local OpenVPN Administrators existe et que la version OpenVPN utilise ce parcours.</li><li>Dans Pr\u00e9f\u00e9rences ordinateur &gt; Param\u00e8tres du Panneau de configuration &gt; Utilisateurs et groupes locaux, cr\u00e9er une action Mettre \u00e0 jour.</li><li>Cibler le groupe OpenVPN Administrators et ajouter uniquement les membres approuv\u00e9s ; contr\u00f4ler le ciblage au niveau de l&#x27;\u00e9l\u00e9ment.</li><li>Tester sur un poste pilote et v\u00e9rifier que l&#x27;utilisateur n&#x27;a pas re\u00e7u de droits Administrateurs suppl\u00e9mentaires.</li></ol><h2>Validation</h2><ul><li>OpenVPN utilisable avec les droits pr\u00e9vus et membres du groupe conformes.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>La capture source retire aussi l&#x27;utilisateur du groupe Administrateurs : action distincte \u00e0 ne pas reproduire sans validation et acc\u00e8s de secours.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Domaine/GPO%20OpenVPN%20Administrators%20le%2006042023.docx\">Domaine/GPO OpenVPN Administrators le 06042023.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\GPO OpenVPN Administrators le 06042023.docx",
          "relativePath": "Domaine/GPO OpenVPN Administrators le 06042023.docx",
          "sha256": "c21f1b845e8013b7322e36a20f9e64be35caa4e09eca74adc5a3a79679f077c8"
        }
      ],
      "sources": []
    },
    {
      "slug": "gpo-windows-update",
      "tech": "gpo",
      "type": "procedure",
      "title": "GPO - Configurer les mises \u00e0 jour Windows",
      "description": "D\u00e9finir le t\u00e9l\u00e9chargement et l'installation selon la politique du parc.",
      "content": "<h1>GPO - Configurer les mises \u00e0 jour Windows</h1><p>D\u00e9finir le t\u00e9l\u00e9chargement et l&#x27;installation selon la politique du parc.</p><h2>Proc\u00e9dure</h2><ol><li>Identifier si la gestion provient de GPO, WSUS ou MDM afin d&#x27;\u00e9viter des configurations concurrentes.</li><li>Cr\u00e9er une GPO pilote et ouvrir les mod\u00e8les d&#x27;administration Windows Update adapt\u00e9s \u00e0 la version.</li><li>Choisir la notification apr\u00e8s t\u00e9l\u00e9chargement ou l&#x27;installation planifi\u00e9e ; la source compare les modes 3 et 4.</li><li>Configurer horaires, red\u00e9marrage et notifications avec l&#x27;\u00e9quipe, puis v\u00e9rifier la politique effective.</li></ol><h2>Validation</h2><ul><li>Mises \u00e0 jour propos\u00e9es et install\u00e9es selon le planning approuv\u00e9.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas recopier l&#x27;horaire 09:00 des captures sur tous les postes ; les chemins ADMX varient selon la version.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Domaine/Procedure%20GPO%20Windows%20Update.docx\">Domaine/Procedure GPO Windows Update.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Procedure GPO Windows Update.docx",
          "relativePath": "Domaine/Procedure GPO Windows Update.docx",
          "sha256": "ab8186a77f8ea1041cbfd670b12afa5aa7fd123b14bc6df9871f86cd130f711b"
        }
      ],
      "sources": []
    },
    {
      "slug": "windows-wallpaper",
      "tech": "windows",
      "type": "procedure",
      "title": "Windows - Modifier le fond d'\u00e9cran utilisateur",
      "description": "Changer l'arri\u00e8re-plan de la session lorsque la politique du poste l'autorise.",
      "content": "<h1>Windows - Modifier le fond d&#x27;\u00e9cran utilisateur</h1><p>Changer l&#x27;arri\u00e8re-plan de la session lorsque la politique du poste l&#x27;autorise.</p><h2>Proc\u00e9dure</h2><ol><li>Ouvrir Personnaliser par un clic droit sur le bureau.</li><li>Choisir l&#x27;arri\u00e8re-plan et une image locale autoris\u00e9e.</li><li>Adapter le mode d&#x27;affichage et v\u00e9rifier le rendu sur les \u00e9crans.</li></ol><h2>Validation</h2><ul><li>Image affich\u00e9e correctement apr\u00e8s reconnexion.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Si une politique bloque le changement, demander sa modification au responsable plut\u00f4t que la contourner.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Domaine/Proc%C3%A9dure%20changement%20fond%20%C3%A9cran.odt\">Domaine/Proc\u00e9dure changement fond \u00e9cran.odt</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Proc\u00e9dure changement fond \u00e9cran.odt",
          "relativePath": "Domaine/Proc\u00e9dure changement fond \u00e9cran.odt",
          "sha256": "ba28fbca6a5c27a77c6308e73d5fb98cc06a8e6706bc3f71d7b375578d89932c"
        }
      ],
      "sources": []
    },
    {
      "slug": "windows-network-shortcut",
      "tech": "windows",
      "type": "procedure",
      "title": "Windows - Cr\u00e9er un raccourci vers un partage r\u00e9seau",
      "description": "Remplacer un ancien acc\u00e8s par un raccourci UNC vers le partage autoris\u00e9.",
      "content": "<h1>Windows - Cr\u00e9er un raccourci vers un partage r\u00e9seau</h1><p>Remplacer un ancien acc\u00e8s par un raccourci UNC vers le partage autoris\u00e9.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier le serveur, le partage et le chemin personnel ; connecter le VPN si l&#x27;acc\u00e8s l&#x27;exige.</li><li>Tester l&#x27;ouverture de \\\\&lt;SERVEUR&gt;\\&lt;PARTAGE&gt; dans l&#x27;Explorateur avec le compte normal de l&#x27;utilisateur.</li><li>Sur le bureau, Nouveau &gt; Raccourci, renseigner le chemin UNC puis choisir un nom explicite.</li><li>Pour un dossier personnel, utiliser le chemin et l&#x27;identit\u00e9 du bon utilisateur ; retirer l&#x27;ancien raccourci seulement apr\u00e8s validation.</li></ol><h2>Validation</h2><ul><li>Le raccourci ouvre le bon dossier avec les permissions attendues.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas enregistrer les mots de passe dans le raccourci ; ne pas reprendre les noms de serveurs des exemples clients.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Domaine/Proc%C3%A9dure%20cr%C3%A9ation%20raccourci%20r%C3%A9seau.docx\">Domaine/Proc\u00e9dure cr\u00e9ation raccourci r\u00e9seau.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Domaine/Proc%C3%A9dure%20de%20cr%C3%A9ation%20raccourci%20SMRD.docx\">Domaine/Proc\u00e9dure de cr\u00e9ation raccourci SMRD.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Proc\u00e9dure cr\u00e9ation raccourci r\u00e9seau.docx",
          "relativePath": "Domaine/Proc\u00e9dure cr\u00e9ation raccourci r\u00e9seau.docx",
          "sha256": "263cea189f8ca1be9c65cb55a5d93191f659dc5651a10fbcca577140c94fb713"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Proc\u00e9dure de cr\u00e9ation raccourci SMRD.docx",
          "relativePath": "Domaine/Proc\u00e9dure de cr\u00e9ation raccourci SMRD.docx",
          "sha256": "da28a3a060cc175f01ded314a0de2cef729177733070435e58896a48183eff64"
        }
      ],
      "sources": []
    },
    {
      "slug": "dns-domain-registration",
      "tech": "reseau",
      "type": "procedure",
      "title": "DNS - R\u00e9server et suivre un nom de domaine",
      "description": "Enregistrer un domaine au nom de l'organisation et organiser DNS et renouvellement.",
      "content": "<h1>DNS - R\u00e9server et suivre un nom de domaine</h1><p>Enregistrer un domaine au nom de l&#x27;organisation et organiser DNS et renouvellement.</p><h2>Proc\u00e9dure</h2><ol><li>Valider le titulaire, le nom, le registrar et les contacts autoris\u00e9s.</li><li>V\u00e9rifier la disponibilit\u00e9 puis enregistrer le domaine dans le compte de l&#x27;organisation.</li><li>Configurer les serveurs DNS et les enregistrements utiles au site et \u00e0 la messagerie.</li><li>Activer MFA, alertes de renouvellement et suivi du paiement selon la politique de l&#x27;organisation.</li></ol><h2>Validation</h2><ul><li>Titulaire correct, DNS r\u00e9solus et renouvellement suivi.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Les exemples de registrars de la source sont historiques. Ne pas enregistrer un domaine professionnel au nom personnel d&#x27;un intervenant.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Domaine/R%C3%A9servation%20nom%20de%20domaine.docx\">Domaine/R\u00e9servation nom de domaine.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\R\u00e9servation nom de domaine.docx",
          "relativePath": "Domaine/R\u00e9servation nom de domaine.docx",
          "sha256": "7b923080f18518c046709f9c404ff714eff139b9ee7429e64735543ee42012fb"
        }
      ],
      "sources": []
    },
    {
      "slug": "eset-run-script",
      "tech": "eset",
      "type": "procedure",
      "title": "ESET PROTECT - Ex\u00e9cuter un script par t\u00e2che client",
      "description": "Lancer un script approuv\u00e9 sur un poste pilote avec un d\u00e9clencheur cibl\u00e9.",
      "content": "<h1>ESET PROTECT - Ex\u00e9cuter un script par t\u00e2che client</h1><p>Lancer un script approuv\u00e9 sur un poste pilote avec un d\u00e9clencheur cibl\u00e9.</p><h2>Proc\u00e9dure</h2><ol><li>Relire le script, valider son impact et le placer dans un emplacement prot\u00e9g\u00e9 accessible par le contexte d&#x27;ex\u00e9cution.</li><li>Cr\u00e9er une t\u00e2che client Syst\u00e8me d&#x27;exploitation &gt; Ex\u00e9cuter une commande.</li><li>Renseigner commande et r\u00e9pertoire de travail sans secrets en clair.</li><li>Cr\u00e9er un d\u00e9clencheur, choisir uniquement les postes pilotes et d\u00e9finir une date d&#x27;expiration.</li><li>Consulter statut, code de retour et effet r\u00e9el avant tout \u00e9largissement.</li></ol><h2>Validation</h2><ul><li>T\u00e2che r\u00e9ussie et r\u00e9sultat pr\u00e9vu v\u00e9rifi\u00e9 sur la cible.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>L&#x27;exemple source utilise ExecutionPolicy Bypass : ne pas en faire une configuration g\u00e9n\u00e9rale. Pr\u00e9f\u00e9rer un script sign\u00e9 conforme \u00e0 la politique.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/ESET/Tache%20pour%20ex%C3%A9cuter%20un%20script%20sur%20ESET%20Protect.docx\">ESET/Tache pour ex\u00e9cuter un script sur ESET Protect.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESET\\Tache pour ex\u00e9cuter un script sur ESET Protect.docx",
          "relativePath": "ESET/Tache pour ex\u00e9cuter un script sur ESET Protect.docx",
          "sha256": "5ec3f0a0ac45cb87f0b0012661a762648a0d34a54f8ca631b58b9d88a802916d"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-iscsi",
      "tech": "esxi",
      "type": "procedure",
      "title": "VMware ESXi - Ajouter ou reconnecter un NAS iSCSI",
      "description": "Pr\u00e9senter un stockage iSCSI existant sans reformater ses LUN.",
      "content": "<h1>VMware ESXi - Ajouter ou reconnecter un NAS iSCSI</h1><p>Pr\u00e9senter un stockage iSCSI existant sans reformater ses LUN.</p><h2>Proc\u00e9dure</h2><ol><li>Relever cibles NAS, IQN, LUN, r\u00e9seau stockage, droits et m\u00e9thode CHAP.</li><li>Dans les adaptateurs de stockage de l&#x27;h\u00f4te, configurer l&#x27;adaptateur iSCSI et les interfaces VMkernel selon le design support\u00e9.</li><li>Ajouter les cibles de d\u00e9couverte, port 3260 par d\u00e9faut, et l&#x27;authentification pr\u00e9vue.</li><li>V\u00e9rifier les param\u00e8tres CHAP des cibles/LUN si la configuration l&#x27;exige, puis rescanner.</li><li>Retrouver le datastore existant et contr\u00f4ler chemins, visibilit\u00e9 et multipathing sur les h\u00f4tes.</li></ol><h2>Validation</h2><ul><li>LUN et datastore attendus pr\u00e9sents sans erreur de chemin et accessibles aux VM.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas cr\u00e9er de VMFS sur une LUN qui contient d\u00e9j\u00e0 des donn\u00e9es. Le port binding iSCSI d\u00e9pend du design : pas d&#x27;application aveugle des captures.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/ESX/Configuration%20de%20l%27iSCSI%20sur%20ESX.docx\">ESX/Configuration de l&#x27;iSCSI sur ESX.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Vcenter/Remonter%20un%20Nas%20sur%20un%20esx%20qui%20a%20changer%20de%20Vcenter.docx\">Vcenter/Remonter un Nas sur un esx qui a changer de Vcenter.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESX\\Configuration de l'iSCSI sur ESX.docx",
          "relativePath": "ESX/Configuration de l'iSCSI sur ESX.docx",
          "sha256": "2b4f30d2e37c8630a32d36b4b5589cbce28a1da674fd4e15363e37e88227a4b9"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Vcenter\\Remonter un Nas sur un esx qui a changer de Vcenter.docx",
          "relativePath": "Vcenter/Remonter un Nas sur un esx qui a changer de Vcenter.docx",
          "sha256": "a36a35142b5cb208f2726bf4fbad77d365e4e9fb84623755568f6cdf7c7d8bf9"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-snmp",
      "tech": "esxi",
      "type": "procedure",
      "title": "VMware ESXi - Configurer la supervision SNMP",
      "description": "Configurer l'agent SNMP et sa cible sans exposer inutilement le r\u00e9seau de gestion.",
      "content": "<h1>VMware ESXi - Configurer la supervision SNMP</h1><p>Configurer l&#x27;agent SNMP et sa cible sans exposer inutilement le r\u00e9seau de gestion.</p><h2>Proc\u00e9dure</h2><ol><li>Relever version ESXi, collecteur, mode SNMP et politique de s\u00e9curit\u00e9.</li><li>Lire la configuration existante ; configurer communaut\u00e9 et cible si le mode v2c est explicitement approuv\u00e9.</li><li>Activer l&#x27;agent et limiter les acc\u00e8s pare-feu aux collecteurs autoris\u00e9s.</li><li>Envoyer un test et v\u00e9rifier sa r\u00e9ception dans l&#x27;outil de supervision.</li></ol><h2>Commandes associ\u00e9es</h2><h3>ESXi - Lire la configuration SNMP</h3><p><strong>Impact : Lecture de configuration sensible.</strong> La sortie peut contenir la communaut\u00e9 ; prot\u00e9ger le diagnostic.</p><pre>esxcli system snmp get</pre><h3>ESXi - D\u00e9finir une communaut\u00e9 SNMP approuv\u00e9e</h3><p><strong>Impact : Modification de configuration / secret.</strong> La valeur peut remplacer les communaut\u00e9s existantes. Privil\u00e9gier le mode SNMP autoris\u00e9 le plus protecteur et limiter le pare-feu.</p><pre>esxcli system snmp set --communities &lt;COMMUNAUTE&gt;</pre><h3>ESXi - Configurer une destination de notification SNMP</h3><p><strong>Impact : Modification de configuration / notifications.</strong> V\u00e9rifier syntaxe et port attendus sur la release. La communaut\u00e9 est un secret ; ne pas recopier le port 161 de la source sans contr\u00f4le.</p><pre>esxcli system snmp set --targets=&lt;COLLECTEUR&gt;@&lt;PORT&gt;/&lt;COMMUNAUTE&gt;</pre><h3>ESXi - Activer l&#x27;agent SNMP</h3><p><strong>Impact : Activation de service r\u00e9seau.</strong> Limiter les sources autoris\u00e9es avant activation.</p><pre>esxcli system snmp set --enable true</pre><h3>ESXi - Envoyer un test SNMP</h3><p><strong>Impact : Envoi de notification / possible alerte.</strong> Pr\u00e9venir la supervision et v\u00e9rifier la r\u00e9ception du test.</p><pre>esxcli system snmp test</pre><h2>Validation</h2><ul><li>Collecte et alerte test visibles uniquement par le collecteur attendu.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>La communaut\u00e9 est un secret. Ne pas reprendre allowed-all true ni l&#x27;adresse/port du client : le port de polling et celui des traps sont distincts.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/ESX/Configuration%20du%20profil%20SNMP%20pour%20ESX8.docx\">ESX/Configuration du profil SNMP pour ESX8.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "esxi-snmp-get",
        "esxi-snmp-community",
        "esxi-snmp-target",
        "esxi-snmp-enable",
        "esxi-snmp-test"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESX\\Configuration du profil SNMP pour ESX8.docx",
          "relativePath": "ESX/Configuration du profil SNMP pour ESX8.docx",
          "sha256": "8dd8d7c652e1e00cefbeb0c3a4c20f24b2d5a04315ec779303a75d3c690ba1d3"
        }
      ],
      "sources": []
    },
    {
      "slug": "idrac-setup",
      "tech": "esxi",
      "type": "procedure",
      "title": "Dell iDRAC - Configurer l'acc\u00e8s de gestion",
      "description": "Configurer le r\u00e9seau de gestion hors bande du serveur et prot\u00e9ger son acc\u00e8s.",
      "content": "<h1>Dell iDRAC - Configurer l&#x27;acc\u00e8s de gestion</h1><p>Configurer le r\u00e9seau de gestion hors bande du serveur et prot\u00e9ger son acc\u00e8s.</p><h2>Proc\u00e9dure</h2><ol><li>Planifier l&#x27;acc\u00e8s console et relever VLAN de gestion, IP, masque, passerelle, DNS et nom attendus.</li><li>Dans Lifecycle Controller, ouvrir l&#x27;assistant iDRAC et configurer langue/clavier.</li><li>Renseigner IPv4 statique et nom DNS dans le r\u00e9seau hors bande.</li><li>V\u00e9rifier les comptes, certificats et flux de gestion ; activer IPMI sur LAN uniquement si un besoin valid\u00e9 l&#x27;exige.</li></ol><h2>Validation</h2><ul><li>iDRAC joignable depuis le r\u00e9seau autoris\u00e9 et supervision du serveur disponible.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas exposer iDRAC sur Internet ni recopier les DNS publics ou IP des exemples.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/ESX/Configuration%20IDRAC%20ESX.docx\">ESX/Configuration IDRAC ESX.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESX\\Configuration IDRAC ESX.docx",
          "relativePath": "ESX/Configuration IDRAC ESX.docx",
          "sha256": "d7d7777b3ecab809979cfd708aa76bb1144643838e008c8aaae6252adc4fa8ce"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-network-map",
      "tech": "esxi",
      "type": "memo",
      "title": "VMware ESXi - Cartographier VMkernel et r\u00e9seaux",
      "description": "Distinguer gestion, r\u00e9seau VM, stockage, vMotion et secours dans le design de l'h\u00f4te.",
      "content": "<h1>VMware ESXi - Cartographier VMkernel et r\u00e9seaux</h1><p>Distinguer gestion, r\u00e9seau VM, stockage, vMotion et secours dans le design de l&#x27;h\u00f4te.</p><h2>Points de contr\u00f4le</h2><ol><li>Lister vSwitch, port groups, VLAN, vmnic et interfaces VMkernel.</li><li>Associer chaque VMkernel \u00e0 son IP et aux services activ\u00e9s.</li><li>Comparer le c\u00e2blage et les politiques d&#x27;uplink avec le sch\u00e9ma r\u00e9seau et les exigences iSCSI/vMotion.</li><li>Documenter le r\u00e9seau de secours et l&#x27;acc\u00e8s hors bande avant une modification.</li></ol><h2>Validation</h2><ul><li>Chaque r\u00e9seau et chaque uplink a un r\u00f4le identifi\u00e9 et test\u00e9.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>La source r\u00e9utilise vmk2 pour plusieurs r\u00e9seaux : relever les IDs r\u00e9els. Une adresse link-local BMC n&#x27;est pas un r\u00e9seau de gestion utilisateur.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/ESX/Mise%20en%20r%C3%A9seau%20des%20ESXi.docx\">ESX/Mise en r\u00e9seau des ESXi.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESX\\Mise en r\u00e9seau des ESXi.docx",
          "relativePath": "ESX/Mise en r\u00e9seau des ESXi.docx",
          "sha256": "6e39a30c3c09b52ab7c261266df0905246c34f7091c3521f6e871c561653da99"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-ups-shutdown",
      "tech": "esxi",
      "type": "procedure",
      "title": "VMware ESXi - Pr\u00e9parer un arr\u00eat pilot\u00e9 par onduleur",
      "description": "Arr\u00eater proprement les VM puis l'h\u00f4te lors d'une coupure \u00e9lectrique.",
      "content": "<h1>VMware ESXi - Pr\u00e9parer un arr\u00eat pilot\u00e9 par onduleur</h1><p>Arr\u00eater proprement les VM puis l&#x27;h\u00f4te lors d&#x27;une coupure \u00e9lectrique.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier autonomie, pilote/agent Eaton, d\u00e9pendances applicatives et VM Tools.</li><li>D\u00e9finir ordre, d\u00e9lais d&#x27;arr\u00eat et de red\u00e9marrage ; garder AD et services indispensables disponibles le temps n\u00e9cessaire.</li><li>Configurer l&#x27;authentification SSH de l&#x27;automate avec un secret prot\u00e9g\u00e9 et une cl\u00e9 d&#x27;h\u00f4te v\u00e9rifi\u00e9e.</li><li>Relier l&#x27;\u00e9v\u00e9nement onduleur \u00e0 une t\u00e2che valid\u00e9e et journaliser d\u00e9but, r\u00e9sultat et fin.</li><li>Effectuer un test planifi\u00e9 avec console de secours, puis v\u00e9rifier le red\u00e9marrage.</li></ol><h2>Commandes associ\u00e9es</h2><h3>ESXi - Arr\u00eater les services puis \u00e9teindre l&#x27;h\u00f4te</h3><p><strong>Impact : Coupure de service / extinction h\u00f4te.</strong> Uniquement apr\u00e8s arr\u00eat confirm\u00e9 des VM et selon le plan de l&#x27;onduleur. Cette s\u00e9quence ne garantit pas l&#x27;arr\u00eat propre des invit\u00e9s ; console et fen\u00eatre valid\u00e9es indispensables.</p><pre>/sbin/shutdown.sh &amp;&amp; /sbin/poweroff</pre><h2>Validation</h2><ul><li>VM arr\u00eat\u00e9es proprement avant extinction de l&#x27;h\u00f4te et reprise valid\u00e9e.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>poweroff provoque une coupure. Ne pas tester en production sans fen\u00eatre. Le script source ne garantit pas \u00e0 lui seul l&#x27;arr\u00eat de toutes les VM ; ne pas r\u00e9utiliser un mot de passe par d\u00e9faut ou runas /savecred.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/ESX/Proc%C3%A9dure%20Arret%20ESXI.docx\">ESX/Proc\u00e9dure Arret ESXI.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "esxi-poweroff"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESX\\Proc\u00e9dure Arret ESXI.docx",
          "relativePath": "ESX/Proc\u00e9dure Arret ESXI.docx",
          "sha256": "3a89b377431a49cdc31221d4ff63bcc2d2c7bd49e8023a9fb3d668f8f1c45df9"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-certificate",
      "tech": "esxi",
      "type": "procedure",
      "title": "VMware ESXi - Renouveler le certificat de l'h\u00f4te",
      "description": "Pr\u00e9parer un renouvellement de certificat avec sauvegarde et acc\u00e8s de secours.",
      "content": "<h1>VMware ESXi - Renouveler le certificat de l&#x27;h\u00f4te</h1><p>Pr\u00e9parer un renouvellement de certificat avec sauvegarde et acc\u00e8s de secours.</p><h2>Proc\u00e9dure</h2><ol><li>Identifier si le certificat est g\u00e9r\u00e9 par VMCA, autonome ou une PKI personnalis\u00e9e.</li><li>Sauvegarder rui.crt et rui.key dans un emplacement prot\u00e9g\u00e9, relever empreinte et expiration.</li><li>Utiliser le parcours de renouvellement adapt\u00e9 \u00e0 la version et au mode de gestion ; generate-certificates concerne le parcours autonome pr\u00e9vu.</li><li>Planifier l&#x27;application du certificat et les \u00e9ventuels red\u00e9marrages de services avec le support VMware.</li></ol><h2>Commandes associ\u00e9es</h2><h3>ESXi autonome - G\u00e9n\u00e9rer les certificats de l&#x27;h\u00f4te</h3><p><strong>Impact : Modification d&#x27;identit\u00e9 TLS.</strong> Sauvegarder rui.crt/rui.key et v\u00e9rifier VMCA/PKI avant usage. Ne pas appliquer automatiquement sur un h\u00f4te g\u00e9r\u00e9 avec certificat personnalis\u00e9.</p><pre>/sbin/generate-certificates</pre><h2>Validation</h2><ul><li>Nouvelle empreinte/dates correctes et connexion vCenter ainsi que gestion h\u00f4te restaur\u00e9es.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas supprimer les cl\u00e9s sans sauvegarde. Ne pas lancer services.sh restart comme correction universelle sur un h\u00f4te en production.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/ESX/Renouveller%20certificat%20ESX.docx\">ESX/Renouveller certificat ESX.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "esxi-generate-cert"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESX\\Renouveller certificat ESX.docx",
          "relativePath": "ESX/Renouveller certificat ESX.docx",
          "sha256": "5cd6111ad30a6eda52f502ce7f5822a104145cdb678c0730f8306eb3a9b3f5bd"
        }
      ],
      "sources": []
    },
    {
      "slug": "pfsense-openvpn-user",
      "tech": "pfsense",
      "type": "procedure",
      "title": "pfSense - Cr\u00e9er un utilisateur et exporter son profil OpenVPN",
      "description": "Associer utilisateur et certificat au serveur OpenVPN pr\u00e9vu.",
      "content": "<h1>pfSense - Cr\u00e9er un utilisateur et exporter son profil OpenVPN</h1><p>Associer utilisateur et certificat au serveur OpenVPN pr\u00e9vu.</p><h2>Proc\u00e9dure</h2><ol><li>Dans System &gt; User Manager, cr\u00e9er le compte ou v\u00e9rifier le compte existant.</li><li>Renseigner les informations utilisateur et cr\u00e9er son certificat avec l&#x27;autorit\u00e9 adapt\u00e9e au serveur VPN.</li><li>V\u00e9rifier le serveur, les groupes, les droits et les r\u00e8gles d&#x27;acc\u00e8s.</li><li>Dans VPN &gt; OpenVPN &gt; Client Export, exporter le profil correspondant \u00e0 ce client et \u00e0 sa plateforme.</li><li>Transmettre l&#x27;archive par un canal prot\u00e9g\u00e9 et tester la connexion avec l&#x27;utilisateur.</li></ol><h2>Validation</h2><ul><li>Tunnel, DNS et seuls les acc\u00e8s autoris\u00e9s fonctionnent.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Le profil contient une cl\u00e9 priv\u00e9e. Ne pas partager un profil entre utilisateurs ni supposer que l&#x27;archive Windows convient \u00e0 Tunnelblick.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/FW/Cr%C3%A9ation%20Connexion%20VPN%20Utilisateur%20sur%20PfSense%20v2.docx\">FW/Cr\u00e9ation Connexion VPN Utilisateur sur PfSense v2.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/FW/Cr%C3%A9ation%20Connexion%20VPN%20Utilisateur%20sur%20PfSense.docx\">FW/Cr\u00e9ation Connexion VPN Utilisateur sur PfSense.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Pfsense/Cr%C3%A9ation%20Connexion%20VPN%20Utilisateur%20sur%20PfSense.docx\">Pfsense/Cr\u00e9ation Connexion VPN Utilisateur sur PfSense.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Cr\u00e9ation Connexion VPN Utilisateur sur PfSense v2.docx",
          "relativePath": "FW/Cr\u00e9ation Connexion VPN Utilisateur sur PfSense v2.docx",
          "sha256": "cf92ba7621d5ee6b893fe817512f5d3c71b5cb9db2402328c5a895fae04b9a9f"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Cr\u00e9ation Connexion VPN Utilisateur sur PfSense.docx",
          "relativePath": "FW/Cr\u00e9ation Connexion VPN Utilisateur sur PfSense.docx",
          "sha256": "4934b73ece7570296f68fa97fca266089d339b0557c5015b18d0852584651e80"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Cr\u00e9ation Connexion VPN Utilisateur sur PfSense.docx",
          "relativePath": "Pfsense/Cr\u00e9ation Connexion VPN Utilisateur sur PfSense.docx",
          "sha256": "4934b73ece7570296f68fa97fca266089d339b0557c5015b18d0852584651e80"
        }
      ],
      "sources": []
    },
    {
      "slug": "pfsense-crowdsec",
      "tech": "pfsense",
      "type": "procedure",
      "title": "pfSense - Pr\u00e9parer le d\u00e9ploiement CrowdSec",
      "description": "Installer le composant compatible et v\u00e9rifier acquisition, d\u00e9cisions et bouncer.",
      "content": "<h1>pfSense - Pr\u00e9parer le d\u00e9ploiement CrowdSec</h1><p>Installer le composant compatible et v\u00e9rifier acquisition, d\u00e9cisions et bouncer.</p><h2>Proc\u00e9dure</h2><ol><li>Sauvegarder pfSense et conserver un acc\u00e8s console ; v\u00e9rifier la compatibilit\u00e9 de la distribution et du package.</li><li>Suivre la documentation CrowdSec actuelle pour l&#x27;installation, plut\u00f4t que forcer les anciens paquets GitHub.</li><li>Configurer les journaux acquis, les sc\u00e9narios et le bouncer ; prot\u00e9ger son secret API.</li><li>Contr\u00f4ler la sant\u00e9 des composants et tester une d\u00e9cision de blocage sur une cible de laboratoire autoris\u00e9e.</li><li>V\u00e9rifier les exclusions d&#x27;administration et fermer SSH s&#x27;il n&#x27;est plus n\u00e9cessaire.</li></ol><h2>Validation</h2><ul><li>\u00c9v\u00e9nements acquis, d\u00e9cision comprise et blocage effectivement appliqu\u00e9.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas reprendre IGNORE_OSVERSION yes ou les pkg add -f de versions fig\u00e9es sans support. Un test peut bloquer l&#x27;administrateur.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/FW/D%C3%A9ploiement%20CrowdSec%20sur%20un%20pare-feu%20PfSense.docx\">FW/D\u00e9ploiement CrowdSec sur un pare-feu PfSense.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://docs.crowdsec.net/u/getting_started/installation/pfsense/\" target=\"_blank\" rel=\"noopener noreferrer\">CrowdSec - Installation pfSense</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\D\u00e9ploiement CrowdSec sur un pare-feu PfSense.docx",
          "relativePath": "FW/D\u00e9ploiement CrowdSec sur un pare-feu PfSense.docx",
          "sha256": "1a508a32a776a141cb89021d1d25ef6cbe210ebc194837edec2f9853e8315f20"
        }
      ],
      "sources": [
        {
          "title": "CrowdSec - Installation pfSense",
          "url": "https://docs.crowdsec.net/u/getting_started/installation/pfsense/"
        }
      ]
    },
    {
      "slug": "pfsense-wan-4g",
      "tech": "pfsense",
      "type": "procedure",
      "title": "pfSense - Ajouter un acc\u00e8s WAN de secours 4G",
      "description": "Pr\u00e9parer l'interface de secours et valider une bascule multi-WAN.",
      "content": "<h1>pfSense - Ajouter un acc\u00e8s WAN de secours 4G</h1><p>Pr\u00e9parer l&#x27;interface de secours et valider une bascule multi-WAN.</p><h2>Proc\u00e9dure</h2><ol><li>Relever le r\u00e9seau du routeur 4G, son mode, les conflits d&#x27;adressage et l&#x27;acc\u00e8s de secours.</li><li>Activer l&#x27;interface OPT choisie et configurer son adresse ainsi que sa passerelle.</li><li>V\u00e9rifier supervision de passerelle, NAT, DNS et r\u00e8gles ; ajouter l&#x27;interface au groupe de passerelles selon le design.</li><li>Tester une bascule puis le retour en conditions planifi\u00e9es.</li></ol><h2>Validation</h2><ul><li>Internet, DNS et services n\u00e9cessaires fonctionnent sur le WAN de secours.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>La source ne d\u00e9crit que l&#x27;adressage d&#x27;OPT1 : une IP et une passerelle seules ne garantissent pas le failover.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/FW/Failover%20backup%204G.docx\">FW/Failover backup 4G.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Pfsense/Failover%20backup%204G.docx\">Pfsense/Failover backup 4G.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Failover backup 4G.docx",
          "relativePath": "FW/Failover backup 4G.docx",
          "sha256": "807110808f11b73345ca1886da4975ec661ee95a2c41400029b05f479c5c2411"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Failover backup 4G.docx",
          "relativePath": "Pfsense/Failover backup 4G.docx",
          "sha256": "807110808f11b73345ca1886da4975ec661ee95a2c41400029b05f479c5c2411"
        }
      ],
      "sources": []
    },
    {
      "slug": "pfsense-ha",
      "tech": "pfsense",
      "type": "procedure",
      "title": "pfSense - Distinguer CARP, pfsync et synchronisation de configuration",
      "description": "Pr\u00e9parer une paire HA et tester adresse virtuelle, \u00e9tats et configuration.",
      "content": "<h1>pfSense - Distinguer CARP, pfsync et synchronisation de configuration</h1><p>Pr\u00e9parer une paire HA et tester adresse virtuelle, \u00e9tats et configuration.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier versions compatibles, interfaces, r\u00e9seaux et adresses propres aux deux n\u0153uds ainsi qu&#x27;aux VIP.</li><li>Pr\u00e9parer un lien de synchronisation prot\u00e9g\u00e9 et les flux n\u00e9cessaires.</li><li>Configurer CARP pour le r\u00f4le actif/backup et pfsync pour la synchronisation des \u00e9tats.</li><li>Configurer la synchronisation de configuration selon le sens primaire vers secondaire et le p\u00e9rim\u00e8tre pr\u00e9vu.</li><li>Utiliser les VIP dans les flux et NAT appropri\u00e9s ; tester la bascule et le retour sans perdre l&#x27;acc\u00e8s de gestion.</li></ol><h2>Validation</h2><ul><li>R\u00f4les CARP coh\u00e9rents, \u00e9tats synchronis\u00e9s et tests applicatifs r\u00e9ussis.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>CARP ne chiffre pas le contenu des annonces. Ne pas activer aveugl\u00e9ment une synchronisation de configuration bidirectionnelle comme sugg\u00e9r\u00e9 dans l&#x27;ancien texte.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/FW/Failover%20pfsense.docx\">FW/Failover pfsense.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Failover pfsense.docx",
          "relativePath": "FW/Failover pfsense.docx",
          "sha256": "9e75976b2fd470481b6f003574b930abc090cb190e0e1f3f5ad32ceb84dbcb7c"
        }
      ],
      "sources": []
    },
    {
      "slug": "pfsense-ipsec-multiple",
      "tech": "pfsense",
      "type": "procedure",
      "title": "pfSense - Ajouter plusieurs phases 2 sous une phase 1 IPsec",
      "description": "Ajouter un s\u00e9lecteur de trafic suppl\u00e9mentaire \u00e0 un VPN site \u00e0 site existant.",
      "content": "<h1>pfSense - Ajouter plusieurs phases 2 sous une phase 1 IPsec</h1><p>Ajouter un s\u00e9lecteur de trafic suppl\u00e9mentaire \u00e0 un VPN site \u00e0 site existant.</p><h2>Proc\u00e9dure</h2><ol><li>Sauvegarder la configuration et relever pair, phase 1, r\u00e9seaux et param\u00e8tres des deux extr\u00e9mit\u00e9s.</li><li>Dans VPN &gt; IPsec, ajouter une phase 2 sous la bonne phase 1 et renseigner les sous-r\u00e9seaux pr\u00e9vus.</li><li>Configurer l&#x27;extr\u00e9mit\u00e9 distante et v\u00e9rifier routage, r\u00e8gles IPsec et NAT.</li><li>Consulter le statut IPsec et les journaux pour identifier selectors/proposals ou trafic absent.</li><li>Tester un flux cibl\u00e9 sur chaque phase 2 et v\u00e9rifier les compteurs.</li></ol><h2>Validation</h2><ul><li>Les deux r\u00e9seaux passent dans les SA attendues et le chemin retour est valide.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Le r\u00e9ordonnancement et les red\u00e9marrages cit\u00e9s dans la source sont un retour d&#x27;incident, pas une correction universelle ; ils interrompent les tunnels.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/FW/IPSec%20FQR-PLEYEL.docx\">FW/IPSec FQR-PLEYEL.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/FW/Monter%20deux%20tunnels%20sur%20pfsense%20avec%20phase1%20commune.docx\">FW/Monter deux tunnels sur pfsense avec phase1 commune.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Pfsense/Monter%20deux%20tunnels%20sur%20pfsense%20avec%20phase1%20commune.docx\">Pfsense/Monter deux tunnels sur pfsense avec phase1 commune.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\IPSec FQR-PLEYEL.docx",
          "relativePath": "FW/IPSec FQR-PLEYEL.docx",
          "sha256": "f35288bafa64359edc4423312d41e0e1ca7c9cc30a0a6b6bbb726f999a9bf41c"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Monter deux tunnels sur pfsense avec phase1 commune.docx",
          "relativePath": "FW/Monter deux tunnels sur pfsense avec phase1 commune.docx",
          "sha256": "235121092a8f19957778373180ce2076e3c88f82efe7941756b67764af9be2ea"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Monter deux tunnels sur pfsense avec phase1 commune.docx",
          "relativePath": "Pfsense/Monter deux tunnels sur pfsense avec phase1 commune.docx",
          "sha256": "235121092a8f19957778373180ce2076e3c88f82efe7941756b67764af9be2ea"
        }
      ],
      "sources": []
    },
    {
      "slug": "pfsense-upgrade-repo",
      "tech": "pfsense",
      "type": "procedure",
      "title": "pfSense - D\u00e9panner une mise \u00e0 jour ou un d\u00e9p\u00f4t inaccessible",
      "description": "Diagnostiquer DNS, connectivit\u00e9 et paquets quand l'initialisation de mise \u00e0 jour reste bloqu\u00e9e.",
      "content": "<h1>pfSense - D\u00e9panner une mise \u00e0 jour ou un d\u00e9p\u00f4t inaccessible</h1><p>Diagnostiquer DNS, connectivit\u00e9 et paquets quand l&#x27;initialisation de mise \u00e0 jour reste bloqu\u00e9e.</p><h2>Proc\u00e9dure</h2><ol><li>Sauvegarder la configuration et relever version CE/Plus, branche, espace libre et message exact.</li><li>Tester DNS, route, horloge et acc\u00e8s HTTPS aux serveurs de paquets ; consulter le journal de mise \u00e0 jour.</li><li>Contr\u00f4ler la branche dans System &gt; Update et la version du paquet pfSense-upgrade.</li><li>Apr\u00e8s collecte, rafra\u00eechir les m\u00e9tadonn\u00e9es pkg si n\u00e9cessaire et suivre la r\u00e9paration Netgate adapt\u00e9e \u00e0 l&#x27;erreur.</li></ol><h2>Commandes associ\u00e9es</h2><h3>pfSense - Tester la r\u00e9solution d&#x27;un nom</h3><p><strong>Impact : Requ\u00eate DNS.</strong> Comparer le DNS utilis\u00e9 et les r\u00e9ponses avec le contexte du d\u00e9p\u00f4t.</p><pre>nslookup &lt;FQDN&gt;</pre><h3>pfSense - Lire la version du paquet de mise \u00e0 jour</h3><p><strong>Impact : Lecture seule.</strong> Compl\u00e9ment documentaire Netgate \u00e0 la proc\u00e9dure locale.</p><pre>pkg-static info -x pfSense-upgrade</pre><h3>pfSense - Actualiser les m\u00e9tadonn\u00e9es pkg</h3><p><strong>Impact : R\u00e9seau / modification des m\u00e9tadonn\u00e9es.</strong> Ce n&#x27;est pas pkg upgrade. V\u00e9rifier branche, DNS, certificats et sauvegarde avant la r\u00e9paration suivante.</p><pre>pkg-static update -f</pre><h2>Validation</h2><ul><li>Le d\u00e9p\u00f4t est accessible et la branche attendue propose la mise \u00e0 jour.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas lancer pkg upgrade sur tout le syst\u00e8me comme test. Les nettoyages et r\u00e9installations modifient le pare-feu et exigent un acc\u00e8s console.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/FW/Proc%C3%A9dure%20Please%20wait%20while%20the%20update%20system%20initializes%20pfsense.docx\">FW/Proc\u00e9dure Please wait while the update system initializes pfsense.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Pfsense/Proc%C3%A9dure%20Please%20wait%20while%20the%20update%20system%20initializes%20pfsense.docx\">Pfsense/Proc\u00e9dure Please wait while the update system initializes pfsense.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/FW/Proc%C3%A9dure%20repository%20pfsense.docx\">FW/Proc\u00e9dure repository pfsense.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Pfsense/Proc%C3%A9dure%20repository%20pfsense.docx\">Pfsense/Proc\u00e9dure repository pfsense.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://docs.netgate.com/pfsense/en/latest/troubleshooting/upgrades.html\" target=\"_blank\" rel=\"noopener noreferrer\">Netgate - D\u00e9pannage des mises \u00e0 jour</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "pfsense-dns",
        "pfsense-upgrade-info",
        "pfsense-pkg-update"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "relativePath": "FW/Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "sha256": "c62bba53a591a488e5e78c436bc42e7d59cc7c6354cf2c58b1162b8fe30e771d"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "relativePath": "Pfsense/Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "sha256": "c62bba53a591a488e5e78c436bc42e7d59cc7c6354cf2c58b1162b8fe30e771d"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Proc\u00e9dure repository pfsense.docx",
          "relativePath": "FW/Proc\u00e9dure repository pfsense.docx",
          "sha256": "06c93503d67ebd65333b4c2c0bd2e7fd6dc958963bd0fed762a50d5931402835"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Proc\u00e9dure repository pfsense.docx",
          "relativePath": "Pfsense/Proc\u00e9dure repository pfsense.docx",
          "sha256": "06c93503d67ebd65333b4c2c0bd2e7fd6dc958963bd0fed762a50d5931402835"
        }
      ],
      "sources": [
        {
          "title": "Netgate - D\u00e9pannage des mises \u00e0 jour",
          "url": "https://docs.netgate.com/pfsense/en/latest/troubleshooting/upgrades.html"
        }
      ]
    },
    {
      "slug": "pfsense-broken-pkg",
      "tech": "pfsense",
      "type": "procedure",
      "title": "pfSense CE - R\u00e9parer une base pkg endommag\u00e9e",
      "description": "Appliquer la r\u00e9paration de la base de paquets seulement apr\u00e8s confirmation de la corruption.",
      "content": "<h1>pfSense CE - R\u00e9parer une base pkg endommag\u00e9e</h1><p>Appliquer la r\u00e9paration de la base de paquets seulement apr\u00e8s confirmation de la corruption.</p><h2>Proc\u00e9dure</h2><ol><li>Sauvegarder config.xml, relever l&#x27;erreur et v\u00e9rifier qu&#x27;il s&#x27;agit du parcours CE concern\u00e9.</li><li>Contr\u00f4ler les r\u00e9pertoires /var/db/pkg et /root/var/db/pkg, puis actualiser les donn\u00e9es de d\u00e9p\u00f4t.</li><li>Sous fen\u00eatre de maintenance avec console, r\u00e9installer les paquets de base et noyau indiqu\u00e9s par Netgate pour la version.</li><li>Rafra\u00eechir les fichiers PHP et v\u00e9rifier les paquets additionnels.</li></ol><h2>Commandes associ\u00e9es</h2><h3>pfSense CE - Cr\u00e9er les r\u00e9pertoires de base pkg</h3><p><strong>Impact : \u00c9criture de r\u00e9pertoires syst\u00e8me.</strong> Seulement dans le parcours confirm\u00e9 d&#x27;une base pkg endommag\u00e9e.</p><pre>/bin/mkdir -p /var/db/pkg/ /root/var/db/pkg/</pre><h3>pfSense CE - R\u00e9installer les paquets de base et noyau</h3><p><strong>Impact : R\u00e9installation syst\u00e8me / risque d&#x27;indisponibilit\u00e9.</strong> Pas une commande de diagnostic et pas un parcours automatique pfSense Plus. Sauvegarde, version compatible, console et fen\u00eatre de maintenance obligatoires ; -y confirme les changements.</p><pre>/usr/local/sbin/pkg-static install -yf pkg pfSense pfSense-kernel-pfSense</pre><h3>pfSense - Rafra\u00eechir la configuration PHP apr\u00e8s r\u00e9paration</h3><p><strong>Impact : \u00c9criture de configuration syst\u00e8me.</strong> Utiliser seulement dans le parcours Netgate adapt\u00e9 \u00e0 la version et \u00e0 l&#x27;incident.</p><pre>/etc/rc.php_ini_setup</pre><h2>Validation</h2><ul><li>Gestionnaire de paquets utilisable et fonctions du pare-feu valid\u00e9es.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas appliquer automatiquement cette commande de noyau CE \u00e0 pfSense Plus. Une r\u00e9installation forc\u00e9e est un changement sensible, pas une collecte.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/FW/Proc%C3%A9dure%20Upgrading%20pkg%20failed%20pfsense.docx\">FW/Proc\u00e9dure Upgrading pkg failed pfsense.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Pfsense/Proc%C3%A9dure%20Upgrading%20pkg%20failed%20pfsense.docx\">Pfsense/Proc\u00e9dure Upgrading pkg failed pfsense.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://docs.netgate.com/pfsense/en/latest/troubleshooting/pkg-broken-database.html\" target=\"_blank\" rel=\"noopener noreferrer\">Netgate - Base pkg endommag\u00e9e</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "pfsense-pkg-directories",
        "pfsense-pkg-reinstall",
        "pfsense-php-refresh"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "relativePath": "FW/Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "sha256": "174559e3c36b80e8d0ebf5a37cb82e8be5aa4d30abe896b7a2a37582a85af274"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "relativePath": "Pfsense/Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "sha256": "174559e3c36b80e8d0ebf5a37cb82e8be5aa4d30abe896b7a2a37582a85af274"
        }
      ],
      "sources": [
        {
          "title": "Netgate - Base pkg endommag\u00e9e",
          "url": "https://docs.netgate.com/pfsense/en/latest/troubleshooting/pkg-broken-database.html"
        }
      ]
    },
    {
      "slug": "openvpn-ios",
      "tech": "pfsense",
      "type": "procedure",
      "title": "OpenVPN - Importer un profil sur iPhone",
      "description": "Installer le profil individuel fourni par l'administrateur dans OpenVPN Connect.",
      "content": "<h1>OpenVPN - Importer un profil sur iPhone</h1><p>Installer le profil individuel fourni par l&#x27;administrateur dans OpenVPN Connect.</p><h2>Proc\u00e9dure</h2><ol><li>R\u00e9cup\u00e9rer le profil par un canal prot\u00e9g\u00e9 et v\u00e9rifier sa provenance.</li><li>Ouvrir le fichier avec OpenVPN Connect, ajouter le profil et saisir les identifiants requis.</li><li>Autoriser l&#x27;ajout de la configuration VPN sur iOS.</li><li>Connecter le tunnel et tester les ressources autoris\u00e9es ; se d\u00e9connecter \u00e0 la fin.</li></ol><h2>Validation</h2><ul><li>Tunnel connect\u00e9, DNS et acc\u00e8s internes attendus disponibles.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas importer un profil inconnu ni partager celui d&#x27;un autre utilisateur.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/FW/Proc%C3%A9dure%20vpn%20ios.odt\">FW/Proc\u00e9dure vpn ios.odt</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Proc\u00e9dure vpn ios.odt",
          "relativePath": "FW/Proc\u00e9dure vpn ios.odt",
          "sha256": "edc9edca79489af2fba0ac613501a59866cb06ddb046370a16b8d8dfb37f1372"
        }
      ],
      "sources": []
    },
    {
      "slug": "printer-user-code",
      "tech": "print",
      "type": "procedure",
      "title": "Impression - Diagnostiquer un blocage par code utilisateur",
      "description": "V\u00e9rifier le r\u00e9glage d'identification utilisateur du pilote.",
      "content": "<h1>Impression - Diagnostiquer un blocage par code utilisateur</h1><p>V\u00e9rifier le r\u00e9glage d&#x27;identification utilisateur du pilote.</p><h2>Proc\u00e9dure</h2><ol><li>Relever imprimante, pilote, file et message de refus.</li><li>Ouvrir les pr\u00e9f\u00e9rences du pilote et retrouver D\u00e9finir les informations utilisateurs.</li><li>Comparer le r\u00e9glage avec la politique du copieur ; si les codes ne sont pas requis, retirer l&#x27;option sur le poste cibl\u00e9.</li><li>Si les codes sont obligatoires, renseigner le code autoris\u00e9 au lieu de d\u00e9sactiver le contr\u00f4le.</li></ol><h2>Validation</h2><ul><li>Page test imprim\u00e9e et comptabilisation conforme.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas contourner une politique de contr\u00f4le d&#x27;impression impos\u00e9e par l&#x27;organisation.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Imprimante/Socorec%20Impression%20bloqu%C3%A9%20par%20code.docx\">Imprimante/Socorec Impression bloqu\u00e9 par code.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Imprimante\\Socorec Impression bloqu\u00e9 par code.docx",
          "relativePath": "Imprimante/Socorec Impression bloqu\u00e9 par code.docx",
          "sha256": "ba44c3652cc3ed72dba2f435856d6995d648b685266da527fd0abdce547e48a3"
        }
      ],
      "sources": []
    },
    {
      "slug": "teamviewer-support",
      "tech": "logiciel",
      "type": "memo",
      "title": "TeamViewer - Identifier les limites d'une session de support",
      "description": "Distinguer client portable, installation, droits Windows et fonctions disponibles.",
      "content": "<h1>TeamViewer - Identifier les limites d&#x27;une session de support</h1><p>Distinguer client portable, installation, droits Windows et fonctions disponibles.</p><h2>Points de contr\u00f4le</h2><ol><li>Relever les versions des deux extr\u00e9mit\u00e9s, le mode QuickSupport/portable/install\u00e9 et le consentement de l&#x27;utilisateur.</li><li>Tester les actions n\u00e9cessaires : raccourcis, \u00e9l\u00e9vation UAC, informations syst\u00e8me et red\u00e9marrage.</li><li>Si une action est indisponible, v\u00e9rifier mode de connexion et autorisations avant d&#x27;installer un autre client.</li><li>Pr\u00e9venir avant toute interruption et garantir un moyen de reconnexion.</li></ol><h2>Validation</h2><ul><li>Session autoris\u00e9e et possibilit\u00e9 de reprendre apr\u00e8s un red\u00e9marrage planifi\u00e9.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Les essais TeamViewer 9/15 sont historiques : ne pas conclure que les droits ou fonctions sont identiques aujourd&#x27;hui. Ne pas bloquer clavier/souris sans accord.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Logiciel/Compte%20Rendu%20TeamViewer%2015.docx\">Logiciel/Compte Rendu TeamViewer 15.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Logiciel\\Compte Rendu TeamViewer 15.docx",
          "relativePath": "Logiciel/Compte Rendu TeamViewer 15.docx",
          "sha256": "ff6cc6f447029a74488f99e342489026d5f65199748091a70d9f6eb8a44a275f"
        }
      ],
      "sources": []
    },
    {
      "slug": "windows-version",
      "tech": "windows",
      "type": "memo",
      "title": "Windows - Relever l'\u00e9dition et le num\u00e9ro de build",
      "description": "Identifier pr\u00e9cis\u00e9ment l'OS avant de choisir un correctif ou une proc\u00e9dure.",
      "content": "<h1>Windows - Relever l&#x27;\u00e9dition et le num\u00e9ro de build</h1><p>Identifier pr\u00e9cis\u00e9ment l&#x27;OS avant de choisir un correctif ou une proc\u00e9dure.</p><h2>Points de contr\u00f4le</h2><ol><li>Ouvrir winver et relever version, \u00e9dition et build.</li><li>Rapprocher ces informations de Param\u00e8tres &gt; Syst\u00e8me &gt; Informations syst\u00e8me.</li><li>V\u00e9rifier la compatibilit\u00e9 de la proc\u00e9dure avec cette \u00e9dition et son cycle de support.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Windows - Afficher l&#x27;\u00e9dition et le build</h3><p><strong>Impact : Lecture seule / fen\u00eatre d&#x27;information.</strong> Relever build et \u00e9dition compl\u00e8tes avant de choisir une proc\u00e9dure.</p><pre>winver</pre><h2>Validation</h2><ul><li>Build et \u00e9dition pr\u00e9sents dans le diagnostic.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Le tableau de correspondance Windows 10 1903 de la source ne couvre pas toutes les versions.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Logiciel/Concordance%20Version%20W%2010.docx\">Logiciel/Concordance Version W 10.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "windows-winver"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Logiciel\\Concordance Version W 10.docx",
          "relativePath": "Logiciel/Concordance Version W 10.docx",
          "sha256": "2b59aa6c953028fc8f59e9060a0c45dc357fe2bc7abcfcfc5742017f0d3467c6"
        }
      ],
      "sources": []
    },
    {
      "slug": "ebp-support-migrate",
      "tech": "logiciel",
      "type": "procedure",
      "title": "EBP - Pr\u00e9parer une demande de support ou un changement de poste",
      "description": "Pr\u00e9parer les informations de licence et de poste n\u00e9cessaires \u00e0 une r\u00e9activation autoris\u00e9e.",
      "content": "<h1>EBP - Pr\u00e9parer une demande de support ou un changement de poste</h1><p>Pr\u00e9parer les informations de licence et de poste n\u00e9cessaires \u00e0 une r\u00e9activation autoris\u00e9e.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier les contrats de support du client et le canal revendeur autoris\u00e9.</li><li>Sauvegarder les donn\u00e9es EBP et relever produit, version et identifiant de licence dans le coffre approuv\u00e9.</li><li>Pour une migration, relever l&#x27;ancienne cl\u00e9 PC et celle g\u00e9n\u00e9r\u00e9e sur le nouveau poste.</li><li>Demander au support EBP le transfert d&#x27;activation, puis activer selon ses instructions.</li><li>Tester ouverture de la base et fonctions m\u00e9tier avant retrait de l&#x27;ancien poste.</li></ol><h2>Validation</h2><ul><li>Licence active et donn\u00e9es accessibles sur le nouveau poste.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Les num\u00e9ros de licence, codes du jour et coordonn\u00e9es des exemples ne sont pas import\u00e9s dans la biblioth\u00e8que.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Logiciel/EBP%20procedure%20appel.docx\">Logiciel/EBP procedure appel.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Logiciel\\EBP procedure appel.docx",
          "relativePath": "Logiciel/EBP procedure appel.docx",
          "sha256": "4eab4f8a65912fbb9c941cf9294572a0c6b2e89128dbcb32d599e61fc6f91e5e"
        }
      ],
      "sources": []
    },
    {
      "slug": "adobe-install-error",
      "tech": "logiciel",
      "type": "procedure",
      "title": "Adobe Reader - Diagnostiquer une erreur d'installation",
      "description": "V\u00e9rifier version existante, Windows Installer et pr\u00e9requis avant une r\u00e9installation.",
      "content": "<h1>Adobe Reader - Diagnostiquer une erreur d&#x27;installation</h1><p>V\u00e9rifier version existante, Windows Installer et pr\u00e9requis avant une r\u00e9installation.</p><h2>Proc\u00e9dure</h2><ol><li>Relever le message exact, les journaux et la version Reader/Acrobat d\u00e9j\u00e0 install\u00e9e.</li><li>V\u00e9rifier les mises \u00e0 jour de l&#x27;OS support\u00e9 et les composants Visual C++ requis par la version.</li><li>Utiliser le package officiel adapt\u00e9 ; pour une erreur 1722, suivre la documentation Adobe correspondante.</li><li>R\u00e9parer ou r\u00e9installer selon le diagnostic, puis ouvrir un PDF test.</li></ol><h2>Validation</h2><ul><li>Installation achev\u00e9e et ouverture de PDF sans erreur.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>La source concerne Windows 7 et un ancien runtime. Ne pas renommer manuellement des DLL syst\u00e8me comme correction g\u00e9n\u00e9rale.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Logiciel/Impossible%20d%20installer%20Adobe%20Reader%20%20.docx\">Logiciel/Impossible d installer Adobe Reader  .docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Logiciel\\Impossible d installer Adobe Reader  .docx",
          "relativePath": "Logiciel/Impossible d installer Adobe Reader  .docx",
          "sha256": "99a9193cbc96a37c758bcf2c3fe87ebaba73fd5937e9190157d16cdfd01c76fc"
        }
      ],
      "sources": []
    },
    {
      "slug": "chrome-bookmarks",
      "tech": "navigateur",
      "type": "procedure",
      "title": "Chrome - Exporter et importer les favoris",
      "description": "Transf\u00e9rer les favoris du bon profil sous forme de fichier HTML.",
      "content": "<h1>Chrome - Exporter et importer les favoris</h1><p>Transf\u00e9rer les favoris du bon profil sous forme de fichier HTML.</p><h2>Proc\u00e9dure</h2><ol><li>Ouvrir le profil Chrome concern\u00e9 puis le gestionnaire de favoris.</li><li>Dans le menu du gestionnaire, exporter les favoris vers un fichier HTML dat\u00e9.</li><li>Conserver une copie dans l&#x27;emplacement de sauvegarde de l&#x27;utilisateur.</li><li>Sur le profil cible, importer le fichier HTML et v\u00e9rifier dossiers et liens.</li></ol><h2>Validation</h2><ul><li>Dossiers attendus et liens utiles accessibles dans le bon profil.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Cet export ne sauvegarde ni les mots de passe ni tout le profil ; les favoris peuvent contenir des URL internes sensibles.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Logiciel/Proc%20favoris%20Google%20Chrome.docx\">Logiciel/Proc favoris Google Chrome.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Navigateur/Proc%20favoris%20Google%20Chrome.docx\">Navigateur/Proc favoris Google Chrome.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Logiciel\\Proc favoris Google Chrome.docx",
          "relativePath": "Logiciel/Proc favoris Google Chrome.docx",
          "sha256": "c5526efb1a070923c1da5929571a21a192072d3e436fde17e764b293932a222d"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Navigateur\\Proc favoris Google Chrome.docx",
          "relativePath": "Navigateur/Proc favoris Google Chrome.docx",
          "sha256": "c5526efb1a070923c1da5929571a21a192072d3e436fde17e764b293932a222d"
        }
      ],
      "sources": []
    },
    {
      "slug": "firefox-bookmarks",
      "tech": "navigateur",
      "type": "procedure",
      "title": "Firefox - Exporter et importer les marque-pages",
      "description": "Conserver les marque-pages dans un fichier HTML et les restaurer dans le bon profil.",
      "content": "<h1>Firefox - Exporter et importer les marque-pages</h1><p>Conserver les marque-pages dans un fichier HTML et les restaurer dans le bon profil.</p><h2>Proc\u00e9dure</h2><ol><li>Ouvrir la biblioth\u00e8que de marque-pages du profil concern\u00e9.</li><li>Choisir Importation et sauvegarde &gt; Exporter des marque-pages au format HTML.</li><li>Copier le fichier dat\u00e9 dans la sauvegarde utilisateur.</li><li>Sur le profil cible, importer le HTML et contr\u00f4ler dossiers, menu et barre personnelle.</li></ol><h2>Validation</h2><ul><li>Marque-pages attendus visibles et liens test\u00e9s.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>L&#x27;import HTML peut ajouter des doublons ; il ne remplace pas une sauvegarde compl\u00e8te du profil.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Logiciel/Proc%20favoris%20Mozilla%20Firefox.docx\">Logiciel/Proc favoris Mozilla Firefox.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Navigateur/Proc%20favoris%20Mozilla%20Firefox.docx\">Navigateur/Proc favoris Mozilla Firefox.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Logiciel\\Proc favoris Mozilla Firefox.docx",
          "relativePath": "Logiciel/Proc favoris Mozilla Firefox.docx",
          "sha256": "484ac9ce4a978c85da8e3763a3ea503334325b9882c18ad0a713e9b01c93ce03"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Navigateur\\Proc favoris Mozilla Firefox.docx",
          "relativePath": "Navigateur/Proc favoris Mozilla Firefox.docx",
          "sha256": "484ac9ce4a978c85da8e3763a3ea503334325b9882c18ad0a713e9b01c93ce03"
        }
      ],
      "sources": []
    },
    {
      "slug": "mac-keychain",
      "tech": "mac",
      "type": "procedure",
      "title": "macOS - Pr\u00e9parer une r\u00e9initialisation du trousseau",
      "description": "Traiter un trousseau inaccessible en expliquant la perte possible de secrets enregistr\u00e9s.",
      "content": "<h1>macOS - Pr\u00e9parer une r\u00e9initialisation du trousseau</h1><p>Traiter un trousseau inaccessible en expliquant la perte possible de secrets enregistr\u00e9s.</p><h2>Proc\u00e9dure</h2><ol><li>Relever la version macOS, le sympt\u00f4me et un \u00e9ventuel changement du mot de passe de session.</li><li>Sauvegarder et v\u00e9rifier si l&#x27;ancien mot de passe permet de d\u00e9verrouiller ou mettre \u00e0 jour le trousseau.</li><li>Si une r\u00e9initialisation est n\u00e9cessaire, ouvrir Trousseau d&#x27;acc\u00e8s et suivre le parcours disponible pour la version.</li><li>Cr\u00e9er un nouveau trousseau par d\u00e9faut, puis reconnecter les applications avec les identifiants autoris\u00e9s.</li></ol><h2>Validation</h2><ul><li>Session et applications utiles fonctionnelles, sans demandes de trousseau r\u00e9p\u00e9t\u00e9es.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Les menus SOS Trousseau des versions 10.3 \u00e0 10.6 sont historiques. R\u00e9initialiser ne r\u00e9cup\u00e8re pas les secrets de l&#x27;ancien trousseau.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/MAC/R%C3%A9initialisation%20Trousseau%20sous%20Mac.docx\">MAC/R\u00e9initialisation Trousseau sous Mac.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\MAC\\R\u00e9initialisation Trousseau sous Mac.docx",
          "relativePath": "MAC/R\u00e9initialisation Trousseau sous Mac.docx",
          "sha256": "1785c82f92b03df486f58814ad71b0e3ab345521a85b7e223521d59564d9a7a8"
        }
      ],
      "sources": []
    },
    {
      "slug": "outlook-iphone",
      "tech": "outlook",
      "type": "procedure",
      "title": "Outlook iPhone - Ajouter un compte de messagerie",
      "description": "Configurer un compte dans Outlook iOS avec le parcours d'authentification de l'organisation.",
      "content": "<h1>Outlook iPhone - Ajouter un compte de messagerie</h1><p>Configurer un compte dans Outlook iOS avec le parcours d&#x27;authentification de l&#x27;organisation.</p><h2>Proc\u00e9dure</h2><ol><li>Installer l&#x27;application officielle, ouvrir Param\u00e8tres et Ajouter un compte de courrier.</li><li>Saisir l&#x27;adresse professionnelle et suivre la connexion Microsoft 365 ou celle du serveur Exchange autoris\u00e9.</li><li>Seulement si la configuration Exchange locale l&#x27;exige, renseigner serveur, domaine et nom d&#x27;utilisateur fournis par l&#x27;administrateur.</li><li>Effectuer MFA si demand\u00e9, puis tester envoi, r\u00e9ception et calendrier.</li></ol><h2>Validation</h2><ul><li>Le bon compte se synchronise et les messages de test arrivent.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas recopier les serveurs des exemples ni ignorer une erreur de certificat.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Ajout%20de%20compte%20outlook%20via%20iphone.docx\">Mail/Ajout de compte outlook via iphone.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/proc%20outlook%20iphone.pdf\">Mail/proc outlook iphone.pdf</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Ajout de compte outlook via iphone.docx",
          "relativePath": "Mail/Ajout de compte outlook via iphone.docx",
          "sha256": "dea4d6e8b903dd2f21be2810c9f4103ba83665d707ef9a394e5d8e3aaf9a3db6"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\proc outlook iphone.pdf",
          "relativePath": "Mail/proc outlook iphone.pdf",
          "sha256": "a5644cb25921f06956ba7e538aae3bb054362959c2d56c1ce3da6ab58e750e94"
        }
      ],
      "sources": []
    },
    {
      "slug": "outlook-archive",
      "tech": "outlook",
      "type": "procedure",
      "title": "Outlook classique - Cr\u00e9er une archive PST",
      "description": "D\u00e9placer les anciens \u00e9l\u00e9ments dans une archive locale apr\u00e8s validation de la r\u00e9tention.",
      "content": "<h1>Outlook classique - Cr\u00e9er une archive PST</h1><p>D\u00e9placer les anciens \u00e9l\u00e9ments dans une archive locale apr\u00e8s validation de la r\u00e9tention.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier la politique de conservation et si une archive en ligne est pr\u00e9f\u00e9rable.</li><li>Dans Outlook classique, s&#x27;assurer que tous les messages n\u00e9cessaires sont disponibles et la synchronisation termin\u00e9e.</li><li>Ouvrir Fichier &gt; Outils &gt; Nettoyer les anciens \u00e9l\u00e9ments, choisir la racine et ses sous-dossiers.</li><li>Choisir la date limite et un emplacement local prot\u00e9g\u00e9 pour le PST ; attendre l&#x27;ach\u00e8vement.</li><li>Ouvrir le fichier de donn\u00e9es, v\u00e9rifier son contenu et organiser sa sauvegarde quand Outlook est ferm\u00e9.</li></ol><h2>Validation</h2><ul><li>PST relisible, p\u00e9riode et sous-dossiers attendus pr\u00e9sents.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Archiver d\u00e9place les messages ; exporter les copie. Le mot de passe PST ne remplace pas le chiffrement ni la sauvegarde du fichier.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Archivage%20de%20la%20boite%20mail.docx\">Mail/Archivage de la boite mail.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Proc%20Archive%20mails.docx\">Mail/Proc Archive mails.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Procedure%20creation%20archive%20mail.docx\">Mail/Procedure creation archive mail.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Archivage de la boite mail.docx",
          "relativePath": "Mail/Archivage de la boite mail.docx",
          "sha256": "f756f1a0b172e8e9851d452c5a6efaf1bd6c4555c4389202c5a380678beb064f"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Proc Archive mails.docx",
          "relativePath": "Mail/Proc Archive mails.docx",
          "sha256": "4ea02bab19c55a97cbb3a9c2a4cb5ddc427cd7a76a1c7671adea625b748948f5"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Procedure creation archive mail.docx",
          "relativePath": "Mail/Procedure creation archive mail.docx",
          "sha256": "65d0abb3d9fa23285948f5383aa2c1ff3325467bce5f658d8b928a27fdb6936c"
        }
      ],
      "sources": []
    },
    {
      "slug": "outlook-export",
      "tech": "outlook",
      "type": "procedure",
      "title": "Outlook classique - Exporter une bo\u00eete compl\u00e8te en PST",
      "description": "Copier mails, calendrier et contacts disponibles dans un fichier de sauvegarde contr\u00f4l\u00e9.",
      "content": "<h1>Outlook classique - Exporter une bo\u00eete compl\u00e8te en PST</h1><p>Copier mails, calendrier et contacts disponibles dans un fichier de sauvegarde contr\u00f4l\u00e9.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier p\u00e9rim\u00e8tre, place disponible et politique de conservation.</li><li>Pour un compte en cache, choisir Tout dans les param\u00e8tres de synchronisation et attendre la fin.</li><li>Ouvrir Fichier &gt; Ouvrir et exporter &gt; Importer/Exporter &gt; Exporter des donn\u00e9es vers un fichier &gt; PST.</li><li>S\u00e9lectionner la racine de la bo\u00eete et Inclure les sous-dossiers ; choisir le traitement des doublons et l&#x27;emplacement prot\u00e9g\u00e9.</li><li>Attendre la fin, ouvrir le PST et contr\u00f4ler des messages anciens, contacts et calendrier.</li></ol><h2>Validation</h2><ul><li>Fichier relisible et contenu attendu pr\u00e9sent avant migration ou suppression de la source.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas vider les messages pour faciliter l&#x27;export sans accord. Un OST n&#x27;est pas une sauvegarde et un export peut omettre des \u00e9l\u00e9ments non synchronis\u00e9s.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Export%20des%20boites%20mails%20utilisateurs.docx\">Mail/Export des boites mails utilisateurs.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Proc%C3%A9dure%20export%20mail%20Outlook.docx\">Mail/Proc\u00e9dure export mail Outlook.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Sauvegarder%20ses%20donn%C3%A9es%20sur%20Outlook.docx\">Mail/Sauvegarder ses donn\u00e9es sur Outlook.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Export des boites mails utilisateurs.docx",
          "relativePath": "Mail/Export des boites mails utilisateurs.docx",
          "sha256": "5ffe9307148525e0d0f49bfd70788607c10ee7c6b4f3b26d73a7c2f7a04dcb60"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Proc\u00e9dure export mail Outlook.docx",
          "relativePath": "Mail/Proc\u00e9dure export mail Outlook.docx",
          "sha256": "c3ec611cfbec334299a000e080db29501ad02bc688037cc484a4a63a36375517"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Sauvegarder ses donn\u00e9es sur Outlook.docx",
          "relativePath": "Mail/Sauvegarder ses donn\u00e9es sur Outlook.docx",
          "sha256": "73ecde3aaded2a25a5e755f0edd82e79daa38c347ce8015d4b5d6e7dad00bef7"
        }
      ],
      "sources": []
    },
    {
      "slug": "exchange-autodiscover",
      "tech": "exchange",
      "type": "procedure",
      "title": "Exchange / Outlook - Diagnostiquer Autodiscover et ses exclusions",
      "description": "Comprendre pourquoi Outlook choisit une mauvaise destination de d\u00e9couverte automatique.",
      "content": "<h1>Exchange / Outlook - Diagnostiquer Autodiscover et ses exclusions</h1><p>Comprendre pourquoi Outlook choisit une mauvaise destination de d\u00e9couverte automatique.</p><h2>Proc\u00e9dure</h2><ol><li>Relever compte, version Outlook, jonction domaine, serveur attendu et r\u00e9sultat du test de configuration automatique.</li><li>Contr\u00f4ler DNS, URL HTTPS, certificat, SCP selon le contexte et le chemin de d\u00e9couverte.</li><li>Lire les valeurs AutoDiscover dans HKCU et dans la branche Policies de la version Office concern\u00e9e.</li><li>Comparer les exclusions configur\u00e9es \u00e0 la strat\u00e9gie attendue ; sauvegarder avant toute modification cibl\u00e9e.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Outlook - Lire les exclusions Autodiscover</h3><p><strong>Impact : Lecture seule.</strong> Une branche absente n&#x27;est pas n\u00e9cessairement une erreur. Une politique de gestion peut imposer ces valeurs.</p><pre>Get-ItemProperty -LiteralPath &#x27;HKCU:\\Software\\Microsoft\\Office\\16.0\\Outlook\\AutoDiscover&#x27; -ErrorAction SilentlyContinue\nGet-ItemProperty -LiteralPath &#x27;HKCU:\\Software\\Policies\\Microsoft\\Office\\16.0\\Outlook\\AutoDiscover&#x27; -ErrorAction SilentlyContinue</pre><h2>Validation</h2><ul><li>D\u00e9couverte du serveur attendu avec certificat valide et profil fonctionnel.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>ExcludeSrvRecord est le nom \u00e0 v\u00e9rifier dans la source, pas ExcludeSrvLookup. Ne pas d\u00e9sactiver toutes les m\u00e9thodes de d\u00e9couverte.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/autodiscover%20exchange.docx\">Mail/autodiscover exchange.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "outlook-autodiscover-read"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\autodiscover exchange.docx",
          "relativePath": "Mail/autodiscover exchange.docx",
          "sha256": "a15d39dc1293cbeb23150f88bcb3b1e6af0143fa583eca3ab66728101978171b"
        }
      ],
      "sources": []
    },
    {
      "slug": "exchange-pst-export",
      "tech": "exchange",
      "type": "procedure",
      "title": "Exchange local - Exporter une bo\u00eete ou son archive en PST",
      "description": "Cr\u00e9er une demande d'export PST et suivre son ach\u00e8vement dans Exchange local.",
      "content": "<h1>Exchange local - Exporter une bo\u00eete ou son archive en PST</h1><p>Cr\u00e9er une demande d&#x27;export PST et suivre son ach\u00e8vement dans Exchange local.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier l&#x27;autorisation de l&#x27;export et le r\u00f4le Mailbox Import Export ; limiter les droits au groupe pr\u00e9vu.</li><li>Pr\u00e9parer un partage UNC prot\u00e9g\u00e9 avec les droits requis par Exchange et suffisamment d&#x27;espace.</li><li>Lancer New-MailboxExportRequest pour la bo\u00eete cibl\u00e9e ; utiliser IsArchive seulement pour l&#x27;archive.</li><li>Suivre les demandes et examiner les statistiques en cas d&#x27;\u00e9chec.</li><li>Contr\u00f4ler le PST obtenu avant de cl\u00f4turer et retirer les droits temporaires inutiles.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Exchange local - Demander un export PST</h3><p><strong>Impact : Export de messages / I/O stockage.</strong> Exchange local uniquement, r\u00f4le Mailbox Import Export et permissions du partage requis. Contenu sensible \u00e0 prot\u00e9ger.</p><pre>New-MailboxExportRequest -Mailbox &quot;&lt;BOITE&gt;&quot; -FilePath &quot;\\\\&lt;SERVEUR&gt;\\&lt;PARTAGE&gt;\\&lt;FICHIER&gt;.pst&quot;</pre><h3>Exchange local - Demander un export de l&#x27;archive</h3><p><strong>Impact : Export de messages / I/O stockage.</strong> V\u00e9rifier l&#x27;existence de l&#x27;archive, les droits, l&#x27;espace et l&#x27;autorisation d&#x27;export.</p><pre>New-MailboxExportRequest -Mailbox &quot;&lt;BOITE&gt;&quot; -IsArchive -FilePath &quot;\\\\&lt;SERVEUR&gt;\\&lt;PARTAGE&gt;\\&lt;FICHIER&gt;.pst&quot;</pre><h3>Exchange local - Lister les exports en cours</h3><p><strong>Impact : Lecture seule.</strong> Une liste vide ne prouve pas la r\u00e9ussite : v\u00e9rifier aussi les demandes Failed et Completed.</p><pre>Get-MailboxExportRequest -Status InProgress</pre><h3>Exchange local - Lire les statistiques d&#x27;un export</h3><p><strong>Impact : Lecture seule.</strong> Compl\u00e9ment de suivi au parcours d&#x27;export ; conserver le rapport en cas d&#x27;erreur.</p><pre>Get-MailboxExportRequest -Mailbox &quot;&lt;BOITE&gt;&quot; | Get-MailboxExportRequestStatistics</pre><h2>Validation</h2><ul><li>Demande Completed et PST relisible avec le p\u00e9rim\u00e8tre attendu.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Cmdlet Exchange local, pas Exchange Online. Le PST est une copie sensible ; ne pas exporter toutes les bo\u00eetes sans p\u00e9rim\u00e8tre valid\u00e9.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/export%20mailbox%20to%20pst%20en%20powershell.docx\">Mail/export mailbox to pst en powershell.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Proc%C3%A9dure%20Export%20pst%20via%20Powershell%20Exchange.docx\">Mail/Proc\u00e9dure Export pst via Powershell Exchange.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/new-mailboxexportrequest\" target=\"_blank\" rel=\"noopener noreferrer\">Microsoft - New-MailboxExportRequest</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "exchange-export-pst",
        "exchange-export-archive",
        "exchange-export-status",
        "exchange-export-statistics"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\export mailbox to pst en powershell.docx",
          "relativePath": "Mail/export mailbox to pst en powershell.docx",
          "sha256": "0ca88f40335dc413ca2b05575292bf314ff1b06e17d712635270c8bd3e2e7404"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Proc\u00e9dure Export pst via Powershell Exchange.docx",
          "relativePath": "Mail/Proc\u00e9dure Export pst via Powershell Exchange.docx",
          "sha256": "0c6bf072bbf06fd1d2ee13be268fa3f0440c6d5872d1948e5a13b88689464bc9"
        }
      ],
      "sources": [
        {
          "title": "Microsoft - New-MailboxExportRequest",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/new-mailboxexportrequest"
        }
      ]
    },
    {
      "slug": "exchange-shell",
      "tech": "exchange",
      "type": "procedure",
      "title": "Exchange local - Charger le contexte de gestion PowerShell",
      "description": "Retrouver les cmdlets de gestion dans le contexte Exchange appropri\u00e9.",
      "content": "<h1>Exchange local - Charger le contexte de gestion PowerShell</h1><p>Retrouver les cmdlets de gestion dans le contexte Exchange appropri\u00e9.</p><h2>Proc\u00e9dure</h2><ol><li>Privil\u00e9gier Exchange Management Shell correspondant au serveur install\u00e9.</li><li>Sur le serveur Exchange local, si le parcours de la version le pr\u00e9voit, charger le snap-in de gestion.</li><li>V\u00e9rifier la disponibilit\u00e9 d&#x27;une cmdlet et les droits avant toute modification.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Exchange local - Charger le snap-in de gestion</h3><p><strong>Impact : Modification du contexte PowerShell.</strong> Windows PowerShell et Exchange local selon version ; ne remplace pas une session Exchange Online.</p><pre>Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn</pre><h2>Validation</h2><ul><li>Cmdlets disponibles et cible de gestion identifi\u00e9e.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Le snap-in local n&#x27;est pas une connexion Exchange Online et ne convient pas automatiquement \u00e0 PowerShell 7.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Powershell%20avec%20module%20Exchange%20Management.docx\">Mail/Powershell avec module Exchange Management.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "exchange-snapin"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Powershell avec module Exchange Management.docx",
          "relativePath": "Mail/Powershell avec module Exchange Management.docx",
          "sha256": "6d9568a6fea53cfe7a41d6a856d54a728525d813be275d8584316b7ae31003b7"
        }
      ],
      "sources": []
    },
    {
      "slug": "gmail-authentication",
      "tech": "outlook",
      "type": "procedure",
      "title": "Gmail - Diagnostiquer l'authentification d'un client mail",
      "description": "Distinguer connexion OAuth, MFA et mot de passe d'application.",
      "content": "<h1>Gmail - Diagnostiquer l&#x27;authentification d&#x27;un client mail</h1><p>Distinguer connexion OAuth, MFA et mot de passe d&#x27;application.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier que la connexion fonctionne sur le portail Google officiel.</li><li>Privil\u00e9gier le parcours Google/OAuth du client mail.</li><li>Pour un client ne prenant pas en charge ce parcours, v\u00e9rifier si l&#x27;organisation autorise les mots de passe d&#x27;application et si le compte y est \u00e9ligible.</li><li>Si n\u00e9cessaire, g\u00e9n\u00e9rer un secret d&#x27;application d\u00e9di\u00e9, le saisir dans le client et le r\u00e9voquer lorsqu&#x27;il n&#x27;est plus utile.</li></ol><h2>Validation</h2><ul><li>Envoi et r\u00e9ception sans d\u00e9sactivation de MFA.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas d\u00e9sactiver la validation en deux \u00e9tapes. L&#x27;option peut \u00eatre absente selon la politique du compte.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Probl%C3%A8me%20compte%20Gmail.docx\">Mail/Probl\u00e8me compte Gmail.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Probl\u00e8me compte Gmail.docx",
          "relativePath": "Mail/Probl\u00e8me compte Gmail.docx",
          "sha256": "42b7be558dd1eaac06e1820215723c79baae991a6d62481fdbab5969104778d0"
        }
      ],
      "sources": []
    },
    {
      "slug": "exchange-disk-full",
      "tech": "exchange",
      "type": "procedure",
      "title": "Exchange local - Diagnostiquer un disque plein et les logs NotificationBroker",
      "description": "Identifier la consommation d'espace sans supprimer les journaux de transaction de la base.",
      "content": "<h1>Exchange local - Diagnostiquer un disque plein et les logs NotificationBroker</h1><p>Identifier la consommation d&#x27;espace sans supprimer les journaux de transaction de la base.</p><h2>Proc\u00e9dure</h2><ol><li>Relever volumes, espace libre et r\u00e9pertoires les plus volumineux.</li><li>Distinguer bases, journaux de transaction et journaux applicatifs ; inspecter Logging/NotificationBroker/Client si concern\u00e9.</li><li>V\u00e9rifier version et correctif correspondant au d\u00e9faut de r\u00e9tention cit\u00e9 dans la source.</li><li>Pr\u00e9parer une r\u00e9tention ou purge uniquement sur les logs applicatifs identifi\u00e9s, avec sauvegarde et validation.</li></ol><h2>Validation</h2><ul><li>Espace r\u00e9cup\u00e9r\u00e9, croissance contr\u00f4l\u00e9e et messagerie op\u00e9rationnelle.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas supprimer les fichiers .log des bases Exchange pour lib\u00e9rer de l&#x27;espace ; ils peuvent \u00eatre n\u00e9cessaires \u00e0 la restauration.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Probl%C3%A8me%20disque%20Exchange%20Plein.docx\">Mail/Probl\u00e8me disque Exchange Plein.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Probl\u00e8me disque Exchange Plein.docx",
          "relativePath": "Mail/Probl\u00e8me disque Exchange Plein.docx",
          "sha256": "989373055d2c3f77f3ca6416dce8628ec70cb91d90b54cf9f23061e389f9d26f"
        }
      ],
      "sources": []
    },
    {
      "slug": "outlook-android",
      "tech": "outlook",
      "type": "procedure",
      "title": "Outlook Android - Ajouter une bo\u00eete professionnelle",
      "description": "Configurer Outlook Android pour le compte et le serveur valid\u00e9s.",
      "content": "<h1>Outlook Android - Ajouter une bo\u00eete professionnelle</h1><p>Configurer Outlook Android pour le compte et le serveur valid\u00e9s.</p><h2>Proc\u00e9dure</h2><ol><li>Ouvrir Param\u00e8tres &gt; Ajouter un compte de courrier et saisir l&#x27;adresse professionnelle.</li><li>Suivre la connexion Microsoft 365 ou Exchange et les politiques de l&#x27;organisation.</li><li>Si le serveur local impose des param\u00e8tres avanc\u00e9s, renseigner serveur, domaine et identit\u00e9 fournis par l&#x27;administrateur.</li><li>V\u00e9rifier notifications, calendrier et test d&#x27;envoi/r\u00e9ception.</li></ol><h2>Validation</h2><ul><li>Messages synchronis\u00e9s sur le bon compte.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas ignorer un certificat invalide ni copier l&#x27;URL d&#x27;un client de l&#x27;ancien document.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/proc%20outlook%20android.docx\">Mail/proc outlook android.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Proc%C3%A9dure%20outlook%20android.docx\">Mail/Proc\u00e9dure outlook android.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/proc%20outlook%20android.pdf\">Mail/proc outlook android.pdf</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\proc outlook android.docx",
          "relativePath": "Mail/proc outlook android.docx",
          "sha256": "ca4c9f07585daa8b44a86408a4d47375209433d61d2c283656495cfd788744fe"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Proc\u00e9dure outlook android.docx",
          "relativePath": "Mail/Proc\u00e9dure outlook android.docx",
          "sha256": "ca4c9f07585daa8b44a86408a4d47375209433d61d2c283656495cfd788744fe"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\proc outlook android.pdf",
          "relativePath": "Mail/proc outlook android.pdf",
          "sha256": "9158db3643a70d95717a88a7f680eaf37c18ed846c789e70f3803696f823ade8"
        }
      ],
      "sources": []
    },
    {
      "slug": "outlook-public-contacts",
      "tech": "outlook",
      "type": "procedure",
      "title": "Outlook classique - Afficher une base de contacts publique",
      "description": "Ajouter le dossier de contacts public autoris\u00e9 au carnet d'adresses Outlook.",
      "content": "<h1>Outlook classique - Afficher une base de contacts publique</h1><p>Ajouter le dossier de contacts public autoris\u00e9 au carnet d&#x27;adresses Outlook.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier les permissions et ouvrir la liste des dossiers publics dans Outlook classique.</li><li>Retrouver le dossier de contacts et l&#x27;ajouter aux favoris des dossiers publics.</li><li>Dans ses propri\u00e9t\u00e9s, v\u00e9rifier l&#x27;option d&#x27;affichage comme carnet d&#x27;adresses Outlook.</li><li>Ouvrir Contacts et le carnet d&#x27;adresses pour contr\u00f4ler la pr\u00e9sence et rechercher un contact test.</li></ol><h2>Validation</h2><ul><li>Base visible et utilisable sans acc\u00e8s de modification non pr\u00e9vu.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Les droits du dossier public et les capacit\u00e9s du client doivent \u00eatre v\u00e9rifi\u00e9s ; le nouveau Outlook peut proposer un parcours diff\u00e9rent.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Proc%C3%A9dure%20client%20outlook%20pour%20Base%20de%20Contact.pdf\">Mail/Proc\u00e9dure client outlook pour Base de Contact.pdf</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Proc\u00e9dure client outlook pour Base de Contact.pdf",
          "relativePath": "Mail/Proc\u00e9dure client outlook pour Base de Contact.pdf",
          "sha256": "a7f8371a5d95224d91f2d18290749d2405f1b2874d8bfd659c08534fe094b209"
        }
      ],
      "sources": []
    },
    {
      "slug": "outlook-profile",
      "tech": "outlook",
      "type": "procedure",
      "title": "Outlook classique - Cr\u00e9er un nouveau profil mail",
      "description": "Tester un nouveau profil sans supprimer le profil ni les donn\u00e9es d'origine.",
      "content": "<h1>Outlook classique - Cr\u00e9er un nouveau profil mail</h1><p>Tester un nouveau profil sans supprimer le profil ni les donn\u00e9es d&#x27;origine.</p><h2>Proc\u00e9dure</h2><ol><li>Fermer Outlook et inventorier comptes, PST et besoins de sauvegarde.</li><li>Dans Panneau de configuration &gt; Courrier &gt; Afficher les profils, choisir Ajouter.</li><li>Nommer le profil et configurer le compte avec Autodiscover et l&#x27;authentification autoris\u00e9e.</li><li>Choisir le profil au lancement ou d\u00e9finir le profil par d\u00e9faut apr\u00e8s test.</li></ol><h2>Validation</h2><ul><li>Dossiers, envoi, r\u00e9ception et calendrier fonctionnent dans le nouveau profil.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Conserver l&#x27;ancien profil jusqu&#x27;\u00e0 validation. Ne pas supprimer un OST comme unique copie de donn\u00e9es non synchronis\u00e9es.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Proc%C3%A9dure%20modif%20profil%20Outlook.docx\">Mail/Proc\u00e9dure modif profil Outlook.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Proc\u00e9dure modif profil Outlook.docx",
          "relativePath": "Mail/Proc\u00e9dure modif profil Outlook.docx",
          "sha256": "4595ccda65f36affbb59fcfa52217da2a56fbf6447b266c9f56d50997b155431"
        }
      ],
      "sources": []
    },
    {
      "slug": "postfix-architecture",
      "tech": "postfix",
      "type": "memo",
      "title": "Postfix - Architecture d'une messagerie Linux et points de contr\u00f4le",
      "description": "Comprendre la cha\u00eene SMTP, stockage, IMAP, authentification et webmail du document.",
      "content": "<h1>Postfix - Architecture d&#x27;une messagerie Linux et points de contr\u00f4le</h1><p>Comprendre la cha\u00eene SMTP, stockage, IMAP, authentification et webmail du document.</p><h2>Points de contr\u00f4le</h2><ol><li>Cartographier Postfix, base des utilisateurs, IMAP, SASL et webmail ; relever versions et fichiers de configuration.</li><li>V\u00e9rifier domaine, DNS MX/A/PTR et s\u00e9paration r\u00e9ception SMTP / soumission authentifi\u00e9e.</li><li>Contr\u00f4ler TLS, certificat et authentification sur les parcours clients.</li><li>Tester envoi/r\u00e9ception et surtout le refus de relayer des messages externes pour un client non autoris\u00e9.</li><li>V\u00e9rifier sauvegardes, permissions des cl\u00e9s, suppression de l&#x27;installateur webmail et journaux.</li></ol><h2>Validation</h2><ul><li>Pas d&#x27;open relay, TLS valide et messages circulant dans les deux sens.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>La source est ancienne et plusieurs blocs de commande sont absents. Ne pas installer les versions obsol\u00e8tes, utiliser StartSSL ou supprimer les tables Roundcube comme correction g\u00e9n\u00e9rale.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Proc%C3%A9dure%20postfix%20sous%20linux.docx\">Mail/Proc\u00e9dure postfix sous linux.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://www.postfix.org/BASIC_CONFIGURATION_README.html\" target=\"_blank\" rel=\"noopener noreferrer\">Postfix - Configuration</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Proc\u00e9dure postfix sous linux.docx",
          "relativePath": "Mail/Proc\u00e9dure postfix sous linux.docx",
          "sha256": "ea62556d990e3cdb468fa1c3e9c0e76c066f44802b1d2733463018a25b550985"
        }
      ],
      "sources": [
        {
          "title": "Postfix - Configuration",
          "url": "https://www.postfix.org/BASIC_CONFIGURATION_README.html"
        }
      ]
    },
    {
      "slug": "outlook-cve-audit",
      "tech": "exchange",
      "type": "procedure",
      "title": "Exchange / Outlook - Pr\u00e9parer un audit CVE-2023-23397",
      "description": "Collecter les r\u00e9sultats du script Microsoft sans supprimer des messages pendant l'audit.",
      "content": "<h1>Exchange / Outlook - Pr\u00e9parer un audit CVE-2023-23397</h1><p>Collecter les r\u00e9sultats du script Microsoft sans supprimer des messages pendant l&#x27;audit.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier le correctif Outlook, le p\u00e9rim\u00e8tre des bo\u00eetes et la documentation Microsoft du script adapt\u00e9 \u00e0 l&#x27;environnement.</li><li>T\u00e9l\u00e9charger depuis le d\u00e9p\u00f4t Microsoft, inspecter le script et les droits n\u00e9cessaires ; pr\u00e9f\u00e9rer un compte d\u00e9di\u00e9 limit\u00e9.</li><li>Ex\u00e9cuter d&#x27;abord en mode audit sur une bo\u00eete pilote, puis analyser et prot\u00e9ger les CSV.</li><li>Faire qualifier les \u00e9l\u00e9ments suspects avant toute action ClearProperty ou ClearItem.</li><li>Retirer les droits et r\u00e9tablir les politiques temporaires \u00e0 la fin.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Exchange local - Auditer une bo\u00eete pour CVE-2023-23397</h3><p><strong>Impact : Audit de messagerie / lecture et exports locaux.</strong> Inspecter la version du script et ses pr\u00e9requis, droits et sorties avant usage. Ne pas ajouter CleanupAction pendant l&#x27;audit ; prot\u00e9ger les CSV.</p><pre>Get-Mailbox -Identity &quot;&lt;BOITE&gt;&quot; | .\\CVE-2023-23397.ps1 -Environment OnPrem</pre><h2>Validation</h2><ul><li>P\u00e9rim\u00e8tre audit\u00e9 trac\u00e9 et r\u00e9sultats analys\u00e9s ; Outlook corrig\u00e9.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Le script d&#x27;audit ne remplace pas le correctif Outlook. Remove-LocalUser ne supprime pas un compte AD/Exchange. Ne pas reprendre AzureAD ou des politiques de throttling illimit\u00e9es sans validation.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Proc%C3%A9dure%20PowerShell%20faille%20Outlook%20CVE.odt\">Mail/Proc\u00e9dure PowerShell faille Outlook CVE.odt</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://microsoft.github.io/CSS-Exchange/Security/CVE-2023-23397/FAQ/\" target=\"_blank\" rel=\"noopener noreferrer\">Microsoft CSS-Exchange - CVE-2023-23397</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "cve-outlook-audit"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Proc\u00e9dure PowerShell faille Outlook CVE.odt",
          "relativePath": "Mail/Proc\u00e9dure PowerShell faille Outlook CVE.odt",
          "sha256": "a6a937899f942b0a98bbb7235faaa5ffd027250bae48926966b5d9e7f9e49318"
        }
      ],
      "sources": [
        {
          "title": "Microsoft CSS-Exchange - CVE-2023-23397",
          "url": "https://microsoft.github.io/CSS-Exchange/Security/CVE-2023-23397/FAQ/"
        }
      ]
    },
    {
      "slug": "exchange-forward",
      "tech": "exchange",
      "type": "procedure",
      "title": "Exchange local - Configurer un transfert de messagerie",
      "description": "Transf\u00e9rer les messages vers un destinataire approuv\u00e9 en v\u00e9rifiant conservation et politique.",
      "content": "<h1>Exchange local - Configurer un transfert de messagerie</h1><p>Transf\u00e9rer les messages vers un destinataire approuv\u00e9 en v\u00e9rifiant conservation et politique.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier l&#x27;autorisation, la destination et si une copie doit rester dans la bo\u00eete source.</li><li>Dans EAC, Destinataires &gt; Bo\u00eetes aux lettres, ouvrir les fonctions de la bo\u00eete concern\u00e9e.</li><li>Dans les options de remise/flux, activer le transfert et choisir le destinataire valid\u00e9.</li><li>Contr\u00f4ler la r\u00e8gle et envoyer un message test ; v\u00e9rifier l&#x27;absence de boucle.</li></ol><h2>Validation</h2><ul><li>Destination correcte et comportement de conservation conforme.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Un transfert externe peut exposer des donn\u00e9es. Ne pas modifier sans validation de l&#x27;organisation.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Mail/Transfert%20mails%20sous%20Exchange%202016%20et%202019.docx\">Mail/Transfert mails sous Exchange 2016 et 2019.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Transfert mails sous Exchange 2016 et 2019.docx",
          "relativePath": "Mail/Transfert mails sous Exchange 2016 et 2019.docx",
          "sha256": "1a331e3becca39813e5a1af77e983170daa9a18f01230b01b9a6dc14cace9662"
        }
      ],
      "sources": []
    },
    {
      "slug": "qnap-deploy",
      "tech": "nas",
      "type": "procedure",
      "title": "QNAP TS-233 - Pr\u00e9parer un d\u00e9ploiement NAS",
      "description": "Organiser stockage, comptes et sauvegarde avant mise en service du NAS.",
      "content": "<h1>QNAP TS-233 - Pr\u00e9parer un d\u00e9ploiement NAS</h1><p>Organiser stockage, comptes et sauvegarde avant mise en service du NAS.</p><h2>Proc\u00e9dure</h2><ol><li>Identifier le NAS, ses disques, leur contenu existant et les besoins de stockage.</li><li>Suivre l&#x27;assistant de l&#x27;appareil pour r\u00e9seau, compte administrateur et version du syst\u00e8me.</li><li>Cr\u00e9er le stockage seulement apr\u00e8s validation de l&#x27;effacement des disques concern\u00e9s.</li><li>Configurer partages, droits minimaux, notifications et sauvegarde externe.</li><li>Tester l&#x27;acc\u00e8s avec un utilisateur normal et une restauration de fichier.</li></ol><h2>Validation</h2><ul><li>Stockage sain, droits valid\u00e9s et restauration r\u00e9ussie.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>La source est tr\u00e8s succincte : ne pas supposer un RAID ou une configuration pr\u00e9cise. RAID n&#x27;est pas une sauvegarde ; ne pas exposer l&#x27;administration sur Internet.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/NAS/D%C3%A9ploiement%20Qnap%20TS-233.docx\">NAS/D\u00e9ploiement Qnap TS-233.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\NAS\\D\u00e9ploiement Qnap TS-233.docx",
          "relativePath": "NAS/D\u00e9ploiement Qnap TS-233.docx",
          "sha256": "caf732df0ca8da568057a4271e6a04558bef85e4f736aeb7a778c38b7d153edc"
        }
      ],
      "sources": []
    },
    {
      "slug": "outlook-delegated-inbox",
      "tech": "outlook",
      "type": "procedure",
      "title": "Outlook classique - Ouvrir un dossier avec des droits de lecture",
      "description": "Consulter une bo\u00eete de r\u00e9ception d\u00e9l\u00e9gu\u00e9e sans demander de droits suppl\u00e9mentaires.",
      "content": "<h1>Outlook classique - Ouvrir un dossier avec des droits de lecture</h1><p>Consulter une bo\u00eete de r\u00e9ception d\u00e9l\u00e9gu\u00e9e sans demander de droits suppl\u00e9mentaires.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier que le propri\u00e9taire ou l&#x27;administrateur a accord\u00e9 les droits sur le dossier voulu.</li><li>Dans Fichier &gt; Ouvrir et exporter &gt; Dossier d&#x27;un autre utilisateur, choisir le nom dans le carnet d&#x27;adresses.</li><li>Choisir Bo\u00eete de r\u00e9ception ou le type de dossier autoris\u00e9, puis ouvrir.</li><li>V\u00e9rifier la lecture sans modification ni acc\u00e8s non pr\u00e9vu aux autres dossiers.</li></ol><h2>Validation</h2><ul><li>Lecture du bon dossier avec les droits attendus.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Droits sur un dossier, acc\u00e8s complet et envoyer en tant que sont des permissions diff\u00e9rentes.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office/Acc%C3%A8s%20Boite%20r%C3%A9ception%20avec%20droit%20relecture.docx\">Office/Acc\u00e8s Boite r\u00e9ception avec droit relecture.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Acc%C3%A8s%20Boite%20r%C3%A9ception%20avec%20droit%20relecture.docx\">Office 365/Acc\u00e8s Boite r\u00e9ception avec droit relecture.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Acc\u00e8s Boite r\u00e9ception avec droit relecture.docx",
          "relativePath": "Office/Acc\u00e8s Boite r\u00e9ception avec droit relecture.docx",
          "sha256": "679290521ffd17b2d69b1e9551c745a2c723c6bc25373e680601481667092515"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Acc\u00e8s Boite r\u00e9ception avec droit relecture.docx",
          "relativePath": "Office 365/Acc\u00e8s Boite r\u00e9ception avec droit relecture.docx",
          "sha256": "679290521ffd17b2d69b1e9551c745a2c723c6bc25373e680601481667092515"
        }
      ],
      "sources": []
    },
    {
      "slug": "m365-ad-connect",
      "tech": "m365",
      "type": "procedure",
      "title": "Microsoft 365 - Pr\u00e9parer la synchronisation d'un AD local",
      "description": "Pr\u00e9parer domaine v\u00e9rifi\u00e9, UPN et annuaire avant Entra Connect ou Cloud Sync.",
      "content": "<h1>Microsoft 365 - Pr\u00e9parer la synchronisation d&#x27;un AD local</h1><p>Pr\u00e9parer domaine v\u00e9rifi\u00e9, UPN et annuaire avant Entra Connect ou Cloud Sync.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier le domaine dans le tenant et le titulaire de la configuration hybride.</li><li>Ajouter le suffixe UPN utile dans Domaines et approbations AD, puis corriger les UPN des comptes cibl\u00e9s.</li><li>Contr\u00f4ler doublons et attributs incoh\u00e9rents avec le parcours IdFix adapt\u00e9.</li><li>Choisir le moteur de synchronisation et v\u00e9rifier ses pr\u00e9requis actuels, le p\u00e9rim\u00e8tre et l&#x27;ancre source.</li><li>Tester sur une OU pilote, v\u00e9rifier correspondances et licences avant extension.</li></ol><h2>Validation</h2><ul><li>Identit\u00e9s attendues synchronis\u00e9es sans doublons ni suppressions inattendues.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Les pr\u00e9requis Server 2008 / SQL 2012 de la source sont obsol\u00e8tes. Ne pas changer l&#x27;ancre d&#x27;un compte existant sans projet de migration.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office/AD%20local%20avec%20Office%20365.docx\">Office/AD local avec Office 365.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/AD%20local%20avec%20Office%20365.docx\">Office 365/AD local avec Office 365.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install\" target=\"_blank\" rel=\"noopener noreferrer\">Microsoft - Agent Entra Cloud Sync</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\AD local avec Office 365.docx",
          "relativePath": "Office/AD local avec Office 365.docx",
          "sha256": "d38c290ca1526885679ae46226558a09bab8552379cf3b46110f77d9e42bcacf"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\AD local avec Office 365.docx",
          "relativePath": "Office 365/AD local avec Office 365.docx",
          "sha256": "d38c290ca1526885679ae46226558a09bab8552379cf3b46110f77d9e42bcacf"
        }
      ],
      "sources": [
        {
          "title": "Microsoft - Agent Entra Cloud Sync",
          "url": "https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install"
        }
      ]
    },
    {
      "slug": "outlook-hosted-migration",
      "tech": "outlook",
      "type": "procedure",
      "title": "Outlook classique - Passer d'un compte Microsoft 365 \u00e0 Exchange h\u00e9berg\u00e9",
      "description": "Corriger le profil et la d\u00e9couverte du serveur sans d\u00e9sactiver la licence Office inutilement.",
      "content": "<h1>Outlook classique - Passer d&#x27;un compte Microsoft 365 \u00e0 Exchange h\u00e9berg\u00e9</h1><p>Corriger le profil et la d\u00e9couverte du serveur sans d\u00e9sactiver la licence Office inutilement.</p><h2>Proc\u00e9dure</h2><ol><li>Relever les comptes Office et mail, les licences et le serveur cible ; sauvegarder les donn\u00e9es locales.</li><li>Fermer les applications puis contr\u00f4ler les seules informations d&#x27;identification concern\u00e9es.</li><li>Cr\u00e9er un profil Outlook de test pour la bo\u00eete h\u00e9berg\u00e9e et v\u00e9rifier Autodiscover.</li><li>Si l&#x27;endpoint Microsoft 365 est choisi \u00e0 tort sur un client concern\u00e9, faire valider une modification cibl\u00e9e d&#x27;ExcludeExplicitO365Endpoint avec sauvegarde du registre.</li><li>Valider envoi/r\u00e9ception et licence Office avant de d\u00e9finir le nouveau profil par d\u00e9faut.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Outlook - Lire les exclusions Autodiscover</h3><p><strong>Impact : Lecture seule.</strong> Une branche absente n&#x27;est pas n\u00e9cessairement une erreur. Une politique de gestion peut imposer ces valeurs.</p><pre>Get-ItemProperty -LiteralPath &#x27;HKCU:\\Software\\Microsoft\\Office\\16.0\\Outlook\\AutoDiscover&#x27; -ErrorAction SilentlyContinue\nGet-ItemProperty -LiteralPath &#x27;HKCU:\\Software\\Policies\\Microsoft\\Office\\16.0\\Outlook\\AutoDiscover&#x27; -ErrorAction SilentlyContinue</pre><h2>Validation</h2><ul><li>Connexion au serveur attendu et Office toujours activ\u00e9.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas supprimer toutes les identit\u00e9s Office ni appliquer la cl\u00e9 \u00e0 un compte Microsoft 365 normal.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office/Aforia%20CLD%20ajout%20de%20compte%20manuel.docx\">Office/Aforia CLD ajout de compte manuel.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Aforia%20CLD%20ajout%20de%20compte%20manuel.docx\">Office 365/Aforia CLD ajout de compte manuel.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office/Proc%C3%A9dure%20changement%20de%20compte%20office%20365%20vers%20aforia%20cld.docx\">Office/Proc\u00e9dure changement de compte office 365 vers aforia cld.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Proc%C3%A9dure%20changement%20de%20compte%20office%20365%20vers%20aforia%20cld.docx\">Office 365/Proc\u00e9dure changement de compte office 365 vers aforia cld.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "outlook-autodiscover-read"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Aforia CLD ajout de compte manuel.docx",
          "relativePath": "Office/Aforia CLD ajout de compte manuel.docx",
          "sha256": "83f406c1537f88069935c35d25828b6d9260dead84287055df19ca8f91f76c05"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Aforia CLD ajout de compte manuel.docx",
          "relativePath": "Office 365/Aforia CLD ajout de compte manuel.docx",
          "sha256": "83f406c1537f88069935c35d25828b6d9260dead84287055df19ca8f91f76c05"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Proc\u00e9dure changement de compte office 365 vers aforia cld.docx",
          "relativePath": "Office/Proc\u00e9dure changement de compte office 365 vers aforia cld.docx",
          "sha256": "f561d0063908310b92bfeee8bff4cdc3ad6a93b30e2fad7bf6e794c13cdab45e"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Proc\u00e9dure changement de compte office 365 vers aforia cld.docx",
          "relativePath": "Office 365/Proc\u00e9dure changement de compte office 365 vers aforia cld.docx",
          "sha256": "f561d0063908310b92bfeee8bff4cdc3ad6a93b30e2fad7bf6e794c13cdab45e"
        }
      ],
      "sources": []
    },
    {
      "slug": "office-outlook-update",
      "tech": "m365",
      "type": "procedure",
      "title": "Office / Outlook - Appliquer et v\u00e9rifier les correctifs",
      "description": "Contr\u00f4ler l'installation du correctif Outlook, notamment apr\u00e8s une alerte CVE-2023-23397.",
      "content": "<h1>Office / Outlook - Appliquer et v\u00e9rifier les correctifs</h1><p>Contr\u00f4ler l&#x27;installation du correctif Outlook, notamment apr\u00e8s une alerte CVE-2023-23397.</p><h2>Proc\u00e9dure</h2><ol><li>Relever version, build et canal Office ainsi que le mode MSI ou Click-to-Run.</li><li>Utiliser le m\u00e9canisme de mise \u00e0 jour g\u00e9r\u00e9 par l&#x27;organisation ; planifier la fermeture des applications.</li><li>Installer le correctif adapt\u00e9, puis relancer Outlook et relever le nouveau build.</li><li>Comparer au bulletin de la vuln\u00e9rabilit\u00e9 pour le produit et le canal concern\u00e9s.</li></ol><h2>Validation</h2><ul><li>Build correctif confirm\u00e9 et Outlook fonctionnel.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Un correctif Exchange serveur ne corrige pas \u00e0 lui seul cette vuln\u00e9rabilit\u00e9 du client Outlook. Les captures de mars 2023 ne d\u00e9finissent pas le build cible actuel.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office/Aforia_procedure_maj_Office.pdf\">Office/Aforia_procedure_maj_Office.pdf</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Aforia_procedure_maj_Office.pdf\">Office 365/Aforia_procedure_maj_Office.pdf</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://microsoft.github.io/CSS-Exchange/Security/CVE-2023-23397/FAQ/\" target=\"_blank\" rel=\"noopener noreferrer\">Microsoft CSS-Exchange - CVE-2023-23397</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Aforia_procedure_maj_Office.pdf",
          "relativePath": "Office/Aforia_procedure_maj_Office.pdf",
          "sha256": "3a95af1e97a332c2ee0862c92ad9bb45db0907b9cc1f82e6a7510a105283ec7c"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Aforia_procedure_maj_Office.pdf",
          "relativePath": "Office 365/Aforia_procedure_maj_Office.pdf",
          "sha256": "3a95af1e97a332c2ee0862c92ad9bb45db0907b9cc1f82e6a7510a105283ec7c"
        }
      ],
      "sources": [
        {
          "title": "Microsoft CSS-Exchange - CVE-2023-23397",
          "url": "https://microsoft.github.io/CSS-Exchange/Security/CVE-2023-23397/FAQ/"
        }
      ]
    },
    {
      "slug": "onenote-odt",
      "tech": "m365",
      "type": "procedure",
      "title": "Office - Pr\u00e9parer une installation OneNote avec ODT",
      "description": "Installer le produit OneNote compatible avec la licence et l'installation Office existantes.",
      "content": "<h1>Office - Pr\u00e9parer une installation OneNote avec ODT</h1><p>Installer le produit OneNote compatible avec la licence et l&#x27;installation Office existantes.</p><h2>Proc\u00e9dure</h2><ol><li>Relever architecture Office, canal, produits et licences existants.</li><li>Obtenir Office Deployment Tool et pr\u00e9parer un XML de configuration adapt\u00e9 au produit autoris\u00e9.</li><li>Tester le XML sur une machine pilote puis ex\u00e9cuter setup.exe /configure dans le r\u00e9pertoire ODT.</li><li>V\u00e9rifier ouverture de OneNote, connexion, synchronisation et activation des applications Office.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Office Deployment Tool - Appliquer un XML valid\u00e9</h3><p><strong>Impact : Installation / modification des applications Office.</strong> Le XML peut installer ou retirer des produits. V\u00e9rifier architecture, canal, licence et actions avant ex\u00e9cution.</p><pre>.\\setup.exe /configure &quot;&lt;CONFIGURATION_XML&gt;&quot;</pre><h2>Validation</h2><ul><li>OneNote et Office fonctionnent sans changement de canal ou de licence non pr\u00e9vu.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas recopier la valeur FirstBootStatus de l&#x27;ancien tutoriel comme correctif universel ; Office 2019 et les XML associ\u00e9s doivent \u00eatre revalid\u00e9s.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office/Instalation%20OneNote%20avec%20Office%202019.docx\">Office/Instalation OneNote avec Office 2019.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office/Proc%C3%A9dure%20OneNoteFreeRetail.docx\">Office/Proc\u00e9dure OneNoteFreeRetail.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Instalation%20OneNote%20avec%20Office%202019.docx\">Office 365/Instalation OneNote avec Office 2019.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Proc%C3%A9dure%20OneNoteFreeRetail.docx\">Office 365/Proc\u00e9dure OneNoteFreeRetail.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "office-odt-configure"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Instalation OneNote avec Office 2019.docx",
          "relativePath": "Office/Instalation OneNote avec Office 2019.docx",
          "sha256": "e0e8144ecaee0b6235ae2d4aeb437ebe2a46f816ac0aab0f40b3dedd383d136a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Proc\u00e9dure OneNoteFreeRetail.docx",
          "relativePath": "Office/Proc\u00e9dure OneNoteFreeRetail.docx",
          "sha256": "e0e8144ecaee0b6235ae2d4aeb437ebe2a46f816ac0aab0f40b3dedd383d136a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Instalation OneNote avec Office 2019.docx",
          "relativePath": "Office 365/Instalation OneNote avec Office 2019.docx",
          "sha256": "e0e8144ecaee0b6235ae2d4aeb437ebe2a46f816ac0aab0f40b3dedd383d136a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Proc\u00e9dure OneNoteFreeRetail.docx",
          "relativePath": "Office 365/Proc\u00e9dure OneNoteFreeRetail.docx",
          "sha256": "e0e8144ecaee0b6235ae2d4aeb437ebe2a46f816ac0aab0f40b3dedd383d136a"
        }
      ],
      "sources": []
    },
    {
      "slug": "teams-outlook",
      "tech": "m365",
      "type": "procedure",
      "title": "Teams / Outlook - Diagnostiquer le compl\u00e9ment de r\u00e9union",
      "description": "Retrouver l'int\u00e9gration de r\u00e9union en contr\u00f4lant comptes, client et compl\u00e9ment.",
      "content": "<h1>Teams / Outlook - Diagnostiquer le compl\u00e9ment de r\u00e9union</h1><p>Retrouver l&#x27;int\u00e9gration de r\u00e9union en contr\u00f4lant comptes, client et compl\u00e9ment.</p><h2>Proc\u00e9dure</h2><ol><li>Relever les versions Teams/Outlook, les comptes connect\u00e9s et les licences.</li><li>V\u00e9rifier que le client Teams et Outlook sont compatibles avec le parcours de l&#x27;organisation.</li><li>Dans Outlook classique, examiner l&#x27;\u00e9tat du compl\u00e9ment de r\u00e9union et les \u00e9l\u00e9ments d\u00e9sactiv\u00e9s.</li><li>Fermer proprement les deux clients, relancer Teams puis Outlook et tester une nouvelle invitation.</li></ol><h2>Validation</h2><ul><li>Lien Teams cr\u00e9\u00e9 avec le bon organisateur et invitation re\u00e7ue.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Le red\u00e9marrage de l&#x27;ancien tutoriel n&#x27;est pas une preuve de compatibilit\u00e9 entre n&#x27;importe quels tenants ; ne pas r\u00e9installer en administrateur sans diagnostic.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office/Laison%20Teams-Outlook.docx\">Office/Laison Teams-Outlook.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Laison%20Teams-Outlook.docx\">Office 365/Laison Teams-Outlook.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Laison Teams-Outlook.docx",
          "relativePath": "Office/Laison Teams-Outlook.docx",
          "sha256": "961e5c5dd9f94eff4ad4961d1ca82a16c840077732dac037c08c1c3cbc06229d"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Laison Teams-Outlook.docx",
          "relativePath": "Office 365/Laison Teams-Outlook.docx",
          "sha256": "961e5c5dd9f94eff4ad4961d1ca82a16c840077732dac037c08c1c3cbc06229d"
        }
      ],
      "sources": []
    },
    {
      "slug": "m365-mfa-enrollment",
      "tech": "m365",
      "type": "procedure",
      "title": "Microsoft 365 - Inscrire un utilisateur \u00e0 MFA",
      "description": "Enregistrer une m\u00e9thode autoris\u00e9e et tester le parcours d'authentification.",
      "content": "<h1>Microsoft 365 - Inscrire un utilisateur \u00e0 MFA</h1><p>Enregistrer une m\u00e9thode autoris\u00e9e et tester le parcours d&#x27;authentification.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier la politique MFA, l&#x27;identit\u00e9 de l&#x27;utilisateur et un moyen de r\u00e9cup\u00e9ration approuv\u00e9.</li><li>Ouvrir le portail officiel depuis une adresse connue et suivre l&#x27;inscription aux informations de s\u00e9curit\u00e9.</li><li>Ajouter le compte professionnel/scolaire dans Microsoft Authenticator et scanner le QR fourni pour cette session.</li><li>Valider le test avec la m\u00e9thode demand\u00e9e ; si le scan \u00e9choue, utiliser le parcours alternatif propos\u00e9 par le portail.</li><li>Effectuer une nouvelle connexion et contr\u00f4ler les m\u00e9thodes enregistr\u00e9es.</li></ol><h2>Validation</h2><ul><li>Connexion de test valid\u00e9e et m\u00e9thode de secours conforme.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne jamais approuver une demande non initi\u00e9e. Le QR d&#x27;inscription est un secret et ne doit pas figurer dans un m\u00e9mo.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office/Proc%C3%A9dure%20Double%20Authentification%20TheatreChatillonClamart.pdf\">Office/Proc\u00e9dure Double Authentification TheatreChatillonClamart.pdf</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Proc%C3%A9dure%20Double%20Authentification%20TheatreChatillonClamart.pdf\">Office 365/Proc\u00e9dure Double Authentification TheatreChatillonClamart.pdf</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office/Proc%C3%A9dure%20Double%20Authentification.docx\">Office/Proc\u00e9dure Double Authentification.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Proc%C3%A9dure%20Double%20Authentification.docx\">Office 365/Proc\u00e9dure Double Authentification.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Proc%C3%A9dure%20Double%20Authentification.pdf\">Office 365/Proc\u00e9dure Double Authentification.pdf</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Proc\u00e9dure Double Authentification TheatreChatillonClamart.pdf",
          "relativePath": "Office/Proc\u00e9dure Double Authentification TheatreChatillonClamart.pdf",
          "sha256": "7adf281062de09ef7a703445ef137022039ad10a5a18aa85a335f7b41d7f6971"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Proc\u00e9dure Double Authentification TheatreChatillonClamart.pdf",
          "relativePath": "Office 365/Proc\u00e9dure Double Authentification TheatreChatillonClamart.pdf",
          "sha256": "7adf281062de09ef7a703445ef137022039ad10a5a18aa85a335f7b41d7f6971"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Proc\u00e9dure Double Authentification.docx",
          "relativePath": "Office/Proc\u00e9dure Double Authentification.docx",
          "sha256": "786b3c207d27c7eb07174ca606dd4a29852013ad43f02e515256668262610ec2"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Proc\u00e9dure Double Authentification.docx",
          "relativePath": "Office 365/Proc\u00e9dure Double Authentification.docx",
          "sha256": "786b3c207d27c7eb07174ca606dd4a29852013ad43f02e515256668262610ec2"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Proc\u00e9dure Double Authentification.pdf",
          "relativePath": "Office 365/Proc\u00e9dure Double Authentification.pdf",
          "sha256": "90fd2bba4e3a4fc833cb67aa65251db571a56ecd38326dd3b69fd3110f7ed237"
        }
      ],
      "sources": []
    },
    {
      "slug": "m365-sender-delisting",
      "tech": "m365",
      "type": "procedure",
      "title": "Microsoft 365 - Demander le retrait d'une IP d'envoi bloqu\u00e9e",
      "description": "Traiter la cause de blocage avant une demande de d\u00e9listage.",
      "content": "<h1>Microsoft 365 - Demander le retrait d&#x27;une IP d&#x27;envoi bloqu\u00e9e</h1><p>Traiter la cause de blocage avant une demande de d\u00e9listage.</p><h2>Proc\u00e9dure</h2><ol><li>Relever le NDR, l&#x27;IP publique d&#x27;envoi et la liste qui la bloque.</li><li>V\u00e9rifier relais ouvert, compromission, volume d&#x27;envoi et identit\u00e9 DNS du serveur ; corriger la cause.</li><li>Pour une IP bloqu\u00e9e par Microsoft, suivre sender.office.com avec une adresse surveill\u00e9e et l&#x27;IP concern\u00e9e.</li><li>Valider le lien re\u00e7u puis contr\u00f4ler un nouvel envoi et la r\u00e9apparition \u00e9ventuelle du blocage.</li></ol><h2>Validation</h2><ul><li>Envoi accept\u00e9 et cause du blocage document\u00e9e.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Le d\u00e9listage n&#x27;est pas une correction de s\u00e9curit\u00e9. Les listes et identifiants de l&#x27;ancien exemple ne sont pas r\u00e9utilis\u00e9s.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office/Proc%C3%A9dure%20O365%20blacklist.docx\">Office/Proc\u00e9dure O365 blacklist.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Proc%C3%A9dure%20O365%20blacklist.docx\">Office 365/Proc\u00e9dure O365 blacklist.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Proc\u00e9dure O365 blacklist.docx",
          "relativePath": "Office/Proc\u00e9dure O365 blacklist.docx",
          "sha256": "b72f91b6af85957a549173b98c269b21800eea7629b6f669d88865d3b8cc3292"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Proc\u00e9dure O365 blacklist.docx",
          "relativePath": "Office 365/Proc\u00e9dure O365 blacklist.docx",
          "sha256": "b72f91b6af85957a549173b98c269b21800eea7629b6f669d88865d3b8cc3292"
        }
      ],
      "sources": []
    },
    {
      "slug": "m365-change-upn",
      "tech": "m365",
      "type": "procedure",
      "title": "Microsoft 365 - Modifier un nom de connexion utilisateur",
      "description": "Changer le nom de connexion en identifiant l'autorit\u00e9 de gestion du compte.",
      "content": "<h1>Microsoft 365 - Modifier un nom de connexion utilisateur</h1><p>Changer le nom de connexion en identifiant l&#x27;autorit\u00e9 de gestion du compte.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier le compte cibl\u00e9, le domaine v\u00e9rifi\u00e9 et si l&#x27;identit\u00e9 est cloud ou synchronis\u00e9e.</li><li>Pour un compte cloud, ouvrir Utilisateurs actifs et G\u00e9rer le nom d&#x27;utilisateur et courrier.</li><li>Pour un compte synchronis\u00e9, effectuer la modification dans l&#x27;annuaire source selon le parcours hybride.</li><li>Contr\u00f4ler UPN, adresse SMTP principale et alias s\u00e9par\u00e9ment ; informer l&#x27;utilisateur du nouveau nom.</li></ol><h2>Validation</h2><ul><li>Connexion, messagerie et applications importantes fonctionnent avec l&#x27;identit\u00e9 attendue.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>UPN et adresse SMTP ne sont pas toujours identiques. Une modification cloud peut \u00eatre \u00e9cras\u00e9e par la synchronisation.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office/proc%C3%A9dure%20pour%20modifier%20le%20login%20utilisateur%20sur%20office%20365.docx\">Office/proc\u00e9dure pour modifier le login utilisateur sur office 365.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/proc%C3%A9dure%20pour%20modifier%20le%20login%20utilisateur%20sur%20office%20365.docx\">Office 365/proc\u00e9dure pour modifier le login utilisateur sur office 365.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\proc\u00e9dure pour modifier le login utilisateur sur office 365.docx",
          "relativePath": "Office/proc\u00e9dure pour modifier le login utilisateur sur office 365.docx",
          "sha256": "275d6a4593104146861ccc1eafa8b4e7d1a4865a0fb17327e8653aff1f69ae90"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\proc\u00e9dure pour modifier le login utilisateur sur office 365.docx",
          "relativePath": "Office 365/proc\u00e9dure pour modifier le login utilisateur sur office 365.docx",
          "sha256": "275d6a4593104146861ccc1eafa8b4e7d1a4865a0fb17327e8653aff1f69ae90"
        }
      ],
      "sources": []
    },
    {
      "slug": "entra-cloud-sync",
      "tech": "m365",
      "type": "procedure",
      "title": "Microsoft Entra - Installer et cibler Cloud Sync",
      "description": "Installer l'agent de provisionnement et synchroniser une OU pilote vers Entra ID.",
      "content": "<h1>Microsoft Entra - Installer et cibler Cloud Sync</h1><p>Installer l&#x27;agent de provisionnement et synchroniser une OU pilote vers Entra ID.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier les pr\u00e9requis actuels, la topologie et les droits du compte d&#x27;installation.</li><li>T\u00e9l\u00e9charger l&#x27;agent depuis le portail Entra, l&#x27;installer et v\u00e9rifier sa disponibilit\u00e9.</li><li>Cr\u00e9er la configuration AD vers Entra ID et v\u00e9rifier correspondances d&#x27;identit\u00e9 ainsi qu&#x27;ancre source.</li><li>D\u00e9finir l&#x27;\u00e9tendue sur les OU voulues en utilisant leur DistinguishedName exact.</li><li>Activer sur le pilote et examiner les journaux de provisionnement, erreurs et comptes cr\u00e9\u00e9s.</li></ol><h2>Commandes associ\u00e9es</h2><h3>AD - Lire le DN d&#x27;une OU pour Cloud Sync</h3><p><strong>Impact : Lecture seule.</strong> Plusieurs OU peuvent avoir le m\u00eame nom ; v\u00e9rifier le DN complet et le domaine.</p><pre>Get-ADOrganizationalUnit -Filter &#x27;Name -eq &quot;&lt;NOM_OU&gt;&quot;&#x27; | Select-Object DistinguishedName</pre><h2>Validation</h2><ul><li>Seuls les comptes et OU voulus sont synchronis\u00e9s sans doublons.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas activer une configuration de domaine entier avant contr\u00f4le de l&#x27;\u00e9tendue et de l&#x27;impact sur les identit\u00e9s existantes.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Installation%20Microsoft%20entra%20cloud.docx\">Office 365/Installation Microsoft entra cloud.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install\" target=\"_blank\" rel=\"noopener noreferrer\">Microsoft - Agent Entra Cloud Sync</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "ad-ou-dn"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Installation Microsoft entra cloud.docx",
          "relativePath": "Office 365/Installation Microsoft entra cloud.docx",
          "sha256": "8ae3a4fd9c6c052259d453b477f28524b813a563e7dc37ba23f8ac0692a94953"
        }
      ],
      "sources": [
        {
          "title": "Microsoft - Agent Entra Cloud Sync",
          "url": "https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install"
        }
      ]
    },
    {
      "slug": "entra-ad-reconciliation",
      "tech": "m365",
      "type": "memo",
      "title": "Entra / AD local - Contr\u00f4ler les correspondances avant un import CSV ou Graph",
      "description": "Pr\u00e9parer un inventaire de rapprochement, sans transformer un script de cr\u00e9ation en synchronisation bidirectionnelle.",
      "content": "<h1>Entra / AD local - Contr\u00f4ler les correspondances avant un import CSV ou Graph</h1><p>Pr\u00e9parer un inventaire de rapprochement, sans transformer un script de cr\u00e9ation en synchronisation bidirectionnelle.</p><h2>Points de contr\u00f4le</h2><ol><li>D\u00e9finir le sens du flux, l&#x27;autorit\u00e9 de gestion et les attributs concern\u00e9s.</li><li>Exporter un inventaire cloud avec Microsoft Graph en lecture et un inventaire AD du p\u00e9rim\u00e8tre autoris\u00e9.</li><li>Comparer UPN, identit\u00e9s, doublons, OU et ancre source dans un rapport prot\u00e9g\u00e9.</li><li>Faire approuver les correspondances et tester toute cr\u00e9ation/modification dans un environnement pilote.</li><li>Pr\u00e9f\u00e9rer le parcours Entra support\u00e9 pour le besoin r\u00e9el ; journaliser les actions et pr\u00e9voir le retour.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Microsoft Graph - Ouvrir une session de lecture utilisateurs</h3><p><strong>Impact : Authentification / consentement de lecture annuaire.</strong> SDK Microsoft Graph requis. Le consentement doit \u00eatre approuv\u00e9 ; v\u00e9rifier tenant et compte. Remplace l&#x27;exemple source incorrect de connexion par secret en clair.</p><pre>Connect-MgGraph -TenantId &quot;&lt;TENANT_ID&gt;&quot; -Scopes &#x27;User.Read.All&#x27; -ContextScope Process</pre><h3>Microsoft Graph - Lire l&#x27;inventaire des utilisateurs</h3><p><strong>Impact : Lecture d&#x27;annuaire / donn\u00e9es personnelles.</strong> Limiter le partage de la sortie et ne pas utiliser cette liste pour cr\u00e9er automatiquement des comptes AD.</p><pre>Get-MgUser -All -Property Id,DisplayName,UserPrincipalName,OnPremisesSyncEnabled | Select-Object Id,DisplayName,UserPrincipalName,OnPremisesSyncEnabled</pre><h2>Validation</h2><ul><li>Rapport de rapprochement valid\u00e9 avant toute \u00e9criture dans AD ou le tenant.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Les scripts source confondent rapprochement et synchronisation, utilisent AzureAD et modifient ImmutableID. Ne pas recalculer automatiquement l&#x27;ancre \u00e0 partir d&#x27;objectGUID pour un compte existant ni cr\u00e9er en masse des comptes activ\u00e9s.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Synchronisation%20office%20365%20vers%20AD%20Local%20avec%20CSV.docx\">Office 365/Synchronisation office 365 vers AD Local avec CSV.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Office%20365/Synchronisation%20office%20365%20vers%20AD%20Local%20avec%20Microsoft%20Graph.docx\">Office 365/Synchronisation office 365 vers AD Local avec Microsoft Graph.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.authentication/connect-mggraph\" target=\"_blank\" rel=\"noopener noreferrer\">Microsoft - Connect-MgGraph</a></li><li><a href=\"https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install\" target=\"_blank\" rel=\"noopener noreferrer\">Microsoft - Agent Entra Cloud Sync</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "graph-connect-read",
        "graph-users"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Synchronisation office 365 vers AD Local avec CSV.docx",
          "relativePath": "Office 365/Synchronisation office 365 vers AD Local avec CSV.docx",
          "sha256": "bc21c0b9da85dadce75f8a0b120aeeae9fb40f8562bc2106bb0a7dfc4c61f24a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Synchronisation office 365 vers AD Local avec Microsoft Graph.docx",
          "relativePath": "Office 365/Synchronisation office 365 vers AD Local avec Microsoft Graph.docx",
          "sha256": "c4623dbb30fc20020e4143ac3f114e4bf2c81a2d791bc2d483e3abeb37da8c26"
        }
      ],
      "sources": [
        {
          "title": "Microsoft - Connect-MgGraph",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.authentication/connect-mggraph"
        },
        {
          "title": "Microsoft - Agent Entra Cloud Sync",
          "url": "https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install"
        }
      ]
    },
    {
      "slug": "python-qr",
      "tech": "logiciel",
      "type": "procedure",
      "title": "Python - Pr\u00e9parer les modules de g\u00e9n\u00e9ration QR Code",
      "description": "Installer les biblioth\u00e8ques de la proc\u00e9dure dans un environnement isol\u00e9.",
      "content": "<h1>Python - Pr\u00e9parer les modules de g\u00e9n\u00e9ration QR Code</h1><p>Installer les biblioth\u00e8ques de la proc\u00e9dure dans un environnement isol\u00e9.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier l&#x27;origine et la version des paquets, puis cr\u00e9er un environnement Python d\u00e9di\u00e9.</li><li>Installer qrcode avec le support Pillow via le pip de cet environnement.</li><li>Installer wifi_qrcode_generator uniquement si ce besoin est valid\u00e9.</li><li>G\u00e9n\u00e9rer et tester un QR de d\u00e9monstration avant d&#x27;utiliser des donn\u00e9es r\u00e9elles.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Python - Installer qrcode avec Pillow</h3><p><strong>Impact : Installation de d\u00e9pendances.</strong> Utiliser un environnement isol\u00e9 et des versions approuv\u00e9es ; v\u00e9rifier l&#x27;origine du paquet.</p><pre>python -m pip install &quot;qrcode[pil]&quot;</pre><h3>Python - Installer wifi_qrcode_generator</h3><p><strong>Impact : Installation de d\u00e9pendances.</strong> V\u00e9rifier provenance et maintenance du paquet. Le QR g\u00e9n\u00e9r\u00e9 peut contenir le mot de passe du r\u00e9seau.</p><pre>python -m pip install wifi_qrcode_generator</pre><h2>Validation</h2><ul><li>QR lisible et valeur encod\u00e9e conforme.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Un QR Wi-Fi peut contenir un mot de passe : traiter l&#x27;image et le fichier source comme des secrets.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Qr%20Code/Installation%20du%20module%20pour%20g%C3%A9n%C3%A9rer%20le%20QR%20Code.docx\">Qr Code/Installation du module pour g\u00e9n\u00e9rer le QR Code.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "pip-qrcode",
        "pip-wifi-qr"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Qr Code\\Installation du module pour g\u00e9n\u00e9rer le QR Code.docx",
          "relativePath": "Qr Code/Installation du module pour g\u00e9n\u00e9rer le QR Code.docx",
          "sha256": "2cfd6e6302f05329dc618caddb7c9f0edea9117ef64cc21f98f476f1f27d1ea7"
        }
      ],
      "sources": []
    },
    {
      "slug": "ipv6-dns-failure",
      "tech": "reseau",
      "type": "procedure",
      "title": "R\u00e9seau - Distinguer une erreur DNS d'un chemin IPv6 bloqu\u00e9",
      "description": "Comparer les r\u00e9ponses A/AAAA et les chemins IPv4/IPv6 d'un nom inaccessible.",
      "content": "<h1>R\u00e9seau - Distinguer une erreur DNS d&#x27;un chemin IPv6 bloqu\u00e9</h1><p>Comparer les r\u00e9ponses A/AAAA et les chemins IPv4/IPv6 d&#x27;un nom inaccessible.</p><h2>Proc\u00e9dure</h2><ol><li>Relever le nom exact, le DNS interrog\u00e9 et les r\u00e9ponses A/AAAA.</li><li>Comparer depuis le client et le pare-feu ; rechercher une r\u00e9ponse IPv4 loopback inattendue, un filtrage ou une surcharge DNS.</li><li>Tester s\u00e9par\u00e9ment la connectivit\u00e9 IPv4 et IPv6 vers une destination autoris\u00e9e.</li><li>Corriger la cause DNS/routage/filtrage. Si le pare-feu doit pr\u00e9f\u00e9rer IPv4 pour ses propres connexions, appliquer l&#x27;option sur le contexte valid\u00e9.</li></ol><h2>Commandes associ\u00e9es</h2><h3>DNS - Interroger un nom depuis le client</h3><p><strong>Impact : Requ\u00eate DNS.</strong> Comparer A et AAAA ainsi que les r\u00e9ponses du DNS interne ; ne pas interpr\u00e9ter une seule ligne comme diagnostic final.</p><pre>nslookup &lt;FQDN&gt;</pre><h2>Validation</h2><ul><li>R\u00e9solution et acc\u00e8s coh\u00e9rents pour les familles utilis\u00e9es.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Prefer IPv4 over IPv6 sur pfSense ne change pas automatiquement le comportement des navigateurs de tous les clients. Un A vers 127.0.0.1 ne doit pas \u00eatre consid\u00e9r\u00e9 comme normal.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/R%C3%A9seau/probl%C3%A8me%20acc%C3%A8s%20LAN%20to%20google.com%20cause%20by%20IPV6.docx\">R\u00e9seau/probl\u00e8me acc\u00e8s LAN to google.com cause by IPV6.docx</a></li></ul><h2>R\u00e9f\u00e9rences techniques</h2><ul><li><a href=\"https://docs.netgate.com/pfsense/en/latest/troubleshooting/upgrades.html\" target=\"_blank\" rel=\"noopener noreferrer\">Netgate - D\u00e9pannage des mises \u00e0 jour</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "dns-nslookup"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\R\u00e9seau\\probl\u00e8me acc\u00e8s LAN to google.com cause by IPV6.docx",
          "relativePath": "R\u00e9seau/probl\u00e8me acc\u00e8s LAN to google.com cause by IPV6.docx",
          "sha256": "d765d726f4c087e87195041e4dc677dbc80e20d83432e76c8c4b204a58b512f6"
        }
      ],
      "sources": [
        {
          "title": "Netgate - D\u00e9pannage des mises \u00e0 jour",
          "url": "https://docs.netgate.com/pfsense/en/latest/troubleshooting/upgrades.html"
        }
      ]
    },
    {
      "slug": "iperf-client-server",
      "tech": "reseau",
      "type": "procedure",
      "title": "iPerf - Mesurer un d\u00e9bit entre client et serveur",
      "description": "Mesurer un chemin pr\u00e9cis avec deux extr\u00e9mit\u00e9s de test autoris\u00e9es.",
      "content": "<h1>iPerf - Mesurer un d\u00e9bit entre client et serveur</h1><p>Mesurer un chemin pr\u00e9cis avec deux extr\u00e9mit\u00e9s de test autoris\u00e9es.</p><h2>Proc\u00e9dure</h2><ol><li>Choisir les deux machines, l&#x27;interface, la version iPerf et un cr\u00e9neau limitant l&#x27;impact.</li><li>Autoriser seulement le port de test n\u00e9cessaire et lancer le mode serveur.</li><li>Lancer le client vers l&#x27;IP du serveur et relever d\u00e9bit, dur\u00e9e et sens du test.</li><li>Comparer avec un chemin de r\u00e9f\u00e9rence et arr\u00eater le serveur de test ensuite.</li></ol><h2>Commandes associ\u00e9es</h2><h3>iPerf 2 - D\u00e9marrer un serveur de test</h3><p><strong>Impact : Ouverture d&#x27;un service de test.</strong> Restreindre le port aux clients de test puis arr\u00eater le serveur ; ne pas utiliser un client iperf3 face \u00e0 ce serveur.</p><pre>iperf -s</pre><h3>iPerf 2 - Mesurer le d\u00e9bit vers un serveur</h3><p><strong>Impact : Trafic de charge / saturation possible.</strong> Accord des propri\u00e9taires du lien et cr\u00e9neau de test ; consigner version, sens et dur\u00e9e.</p><pre>iperf -c &lt;SERVEUR&gt;</pre><h2>Validation</h2><ul><li>Mesure reproductible avec versions, extr\u00e9mit\u00e9s et conditions consign\u00e9es.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>La source utilise iperf (v2), pas iperf3 ; ils ne sont pas interchangeables. Un test peut saturer le lien.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/R%C3%A9seau/Test%20de%20connexion%20iperf%20client-serveur.docx\">R\u00e9seau/Test de connexion iperf client-serveur.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "iperf-server",
        "iperf-client"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\R\u00e9seau\\Test de connexion iperf client-serveur.docx",
          "relativePath": "R\u00e9seau/Test de connexion iperf client-serveur.docx",
          "sha256": "3f2abb2ce3c834988cab0cf24df9830fe61f9eee2cdce8e1af5720b936ac189e"
        }
      ],
      "sources": []
    },
    {
      "slug": "backup-user-files",
      "tech": "backup",
      "type": "procedure",
      "title": "Sauvegarde - Copier les donn\u00e9es d'un profil utilisateur",
      "description": "Conserver les dossiers utiles dans une destination de sauvegarde prot\u00e9g\u00e9e avant migration.",
      "content": "<h1>Sauvegarde - Copier les donn\u00e9es d&#x27;un profil utilisateur</h1><p>Conserver les dossiers utiles dans une destination de sauvegarde prot\u00e9g\u00e9e avant migration.</p><h2>Proc\u00e9dure</h2><ol><li>Identifier le bon profil et les fichiers locaux, cloud et applicatifs \u00e0 conserver.</li><li>Ouvrir le profil utilisateur et la destination de sauvegarde autoris\u00e9e.</li><li>Copier Bureau, Documents, T\u00e9l\u00e9chargements et les autres dossiers utiles ; attendre la fin et relever les erreurs.</li><li>Contr\u00f4ler des fichiers de chaque dossier et les fichiers cloud non disponibles localement.</li><li>Tester une restauration sur un emplacement distinct.</li></ol><h2>Validation</h2><ul><li>Donn\u00e9es attendues pr\u00e9sentes et fichiers test relisibles.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Une simple copie ne couvre pas toutes les donn\u00e9es d&#x27;application, permissions ou fichiers cloud. Ne pas couper le poste avant la fin.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Sauvegarde/Proc%C3%A9dure%20copie%20de%20donnee.docx\">Sauvegarde/Proc\u00e9dure copie de donnee.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Sauvegarde\\Proc\u00e9dure copie de donnee.docx",
          "relativePath": "Sauvegarde/Proc\u00e9dure copie de donnee.docx",
          "sha256": "d570dbc25776a6b29549980ac5e4dd530e48605910766bc6aa8943b62b236ca4"
        }
      ],
      "sources": []
    },
    {
      "slug": "backup-check",
      "tech": "backup",
      "type": "procedure",
      "title": "Sauvegarde - Contr\u00f4ler un job serveur et sa restauration",
      "description": "Valider la fra\u00eecheur, le contenu et la restaurabilit\u00e9 d'une sauvegarde.",
      "content": "<h1>Sauvegarde - Contr\u00f4ler un job serveur et sa restauration</h1><p>Valider la fra\u00eecheur, le contenu et la restaurabilit\u00e9 d&#x27;une sauvegarde.</p><h2>Proc\u00e9dure</h2><ol><li>Se connecter au bon serveur par le canal autoris\u00e9 et identifier l&#x27;outil ainsi que le job.</li><li>Examiner date de fin, dernier r\u00e9sultat, avertissements et journal d&#x27;ex\u00e9cution.</li><li>V\u00e9rifier source, destination, place libre et r\u00e9tention.</li><li>Restaurer un \u00e9chantillon dans un emplacement isol\u00e9 et tracer le contr\u00f4le dans le suivi.</li></ol><h2>Validation</h2><ul><li>Sauvegarde dans le d\u00e9lai attendu et restauration r\u00e9ussie.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Un statut Success ne suffit pas \u00e0 garantir toutes les donn\u00e9es. R\u00e9cup\u00e9rer les acc\u00e8s depuis le coffre, pas depuis un tableau de mots de passe.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Sauvegarde/V%C3%A9rifier%20la%20sauvegarde.docx\">Sauvegarde/V\u00e9rifier la sauvegarde.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Sauvegarde\\V\u00e9rifier la sauvegarde.docx",
          "relativePath": "Sauvegarde/V\u00e9rifier la sauvegarde.docx",
          "sha256": "14c2102b9896b35d32429a325a7a2d3b4aa09364195ba9e80f2f552c295f24f5"
        }
      ],
      "sources": []
    },
    {
      "slug": "3cx-vm-migration",
      "tech": "3cx",
      "type": "procedure",
      "title": "3CX - Migrer l'instance vers une nouvelle VM",
      "description": "Restaurer 3CX sur une VM compatible et basculer l'adresse sans conflit.",
      "content": "<h1>3CX - Migrer l&#x27;instance vers une nouvelle VM</h1><p>Restaurer 3CX sur une VM compatible et basculer l&#x27;adresse sans conflit.</p><h2>Proc\u00e9dure</h2><ol><li>Exporter une sauvegarde 3CX test\u00e9e et noter FQDN, licence, trunks et compatibilit\u00e9 de restauration ; un snapshot n&#x27;est pas une sauvegarde externe.</li><li>Cr\u00e9er une nouvelle VM et installer la version/ISO support\u00e9e avec une adresse temporaire.</li><li>Restaurer la sauvegarde puis v\u00e9rifier licence, DNS et configuration r\u00e9seau.</li><li>Lors de la bascule, arr\u00eater l&#x27;ancienne instance avant de r\u00e9utiliser son IP ; conserver un retour arri\u00e8re.</li><li>Reprovisionner les clients n\u00e9cessaires et tester appels internes/externes, audio, pare-feu et sauvegarde automatique.</li></ol><h2>Validation</h2><ul><li>Service t\u00e9l\u00e9phonique complet et nouvelle sauvegarde exploitable.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas remettre Debian 10 ou les ressources de l&#x27;ancien exemple par d\u00e9faut. Ne jamais lancer les deux instances avec la m\u00eame IP.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/T%C3%A9l%C3%A9phonie/Update%20VM%203CX.docx\">T\u00e9l\u00e9phonie/Update VM 3CX.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\T\u00e9l\u00e9phonie\\Update VM 3CX.docx",
          "relativePath": "T\u00e9l\u00e9phonie/Update VM 3CX.docx",
          "sha256": "a5ebd9fb8af7dd3e3cc0c50f4aac58e4d876b08c6a68e31d5ede8dc86d8addad"
        }
      ],
      "sources": []
    },
    {
      "slug": "vcenter-root-policy",
      "tech": "vcenter",
      "type": "procedure",
      "title": "vCenter - G\u00e9rer le mot de passe root et son expiration",
      "description": "Distinguer compte root de l'appliance et comptes SSO pour une modification contr\u00f4l\u00e9e.",
      "content": "<h1>vCenter - G\u00e9rer le mot de passe root et son expiration</h1><p>Distinguer compte root de l&#x27;appliance et comptes SSO pour une modification contr\u00f4l\u00e9e.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier l&#x27;acc\u00e8s de secours et ouvrir l&#x27;interface de gestion de l&#x27;appliance sur le port 5480.</li><li>Dans Administration, consulter la politique root, son expiration et les notifications.</li><li>Si une rotation root est requise, utiliser le parcours autoris\u00e9 ; activer SSH/Bash seulement temporairement si n\u00e9cessaire.</li><li>Modifier et tester le mot de passe puis d\u00e9sactiver les acc\u00e8s temporaires.</li><li>G\u00e9rer les politiques SSO dans leur console distincte ; documenter toute exception d&#x27;expiration.</li></ol><h2>Commandes associ\u00e9es</h2><h3>VCSA - Changer le mot de passe root</h3><p><strong>Impact : Modification d&#x27;acc\u00e8s administrateur.</strong> Acc\u00e8s de secours requis ; tester le nouveau mot de passe et fermer SSH/Bash temporaire. N&#x27;affecte pas les comptes SSO.</p><pre>passwd root</pre><h2>Validation</h2><ul><li>Nouvel acc\u00e8s root valid\u00e9, notification d&#x27;expiration suivie et acc\u00e8s SSO inchang\u00e9.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas supprimer par d\u00e9faut l&#x27;expiration ni mettre une dur\u00e9e arbitraire de 90000 jours. Ne pas confondre root et administrator@vsphere.local.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Vcenter/Changement%20de%20mot%20de%20passe%20root%20et%20enlevement%20expiration%20vcenter.docx\">Vcenter/Changement de mot de passe root et enlevement expiration vcenter.docx</a></li><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Vcenter/Enlever%20espiration%20de%20mot%20de%20passe%20vc8.docx\">Vcenter/Enlever espiration de mot de passe vc8.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "vcenter-passwd"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Vcenter\\Changement de mot de passe root et enlevement expiration vcenter.docx",
          "relativePath": "Vcenter/Changement de mot de passe root et enlevement expiration vcenter.docx",
          "sha256": "ecbde5276fc174a19ad4b026c4912d3bb3c8eba5c9aa94f067ee816248781d67"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Vcenter\\Enlever espiration de mot de passe vc8.docx",
          "relativePath": "Vcenter/Enlever espiration de mot de passe vc8.docx",
          "sha256": "d419e7996d2b99aeddbff6d04d5b7ec261a5c6eb25fecf4ef31d5eb80ae109f8"
        }
      ],
      "sources": []
    },
    {
      "slug": "vcenter-move-esxi",
      "tech": "vcenter",
      "type": "procedure",
      "title": "vCenter - Transf\u00e9rer un h\u00f4te ESXi vers un autre inventaire",
      "description": "Changer le gestionnaire de l'h\u00f4te en conservant r\u00e9seau, stockage et possibilit\u00e9 de retour.",
      "content": "<h1>vCenter - Transf\u00e9rer un h\u00f4te ESXi vers un autre inventaire</h1><p>Changer le gestionnaire de l&#x27;h\u00f4te en conservant r\u00e9seau, stockage et possibilit\u00e9 de retour.</p><h2>Proc\u00e9dure</h2><ol><li>Inventorier VM, licences, clusters, vDS, stockage et droits ; sauvegarder les configurations.</li><li>V\u00e9rifier compatibilit\u00e9 du nouveau vCenter et un acc\u00e8s direct \u00e0 l&#x27;h\u00f4te.</li><li>Pr\u00e9parer la migration des d\u00e9pendances, puis d\u00e9connecter et retirer l&#x27;h\u00f4te de l&#x27;ancien inventaire au moment valid\u00e9.</li><li>Ajouter l&#x27;h\u00f4te au nouvel inventaire et contr\u00f4ler certificats, VM, datastores et r\u00e9seau.</li><li>Ajouter au cluster cible seulement apr\u00e8s v\u00e9rification des politiques.</li></ol><h2>Validation</h2><ul><li>Toutes les VM et ressources g\u00e9r\u00e9es et services applicatifs valid\u00e9s.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Les trois clics du document ne couvrent pas les d\u00e9pendances vDS/HA/DRS ; ne pas retirer l&#x27;h\u00f4te sans plan valid\u00e9.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Vcenter/Changement%20de%20vcenter%20pour%20un%20ESX.docx\">Vcenter/Changement de vcenter pour un ESX.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Vcenter\\Changement de vcenter pour un ESX.docx",
          "relativePath": "Vcenter/Changement de vcenter pour un ESX.docx",
          "sha256": "7c47f8227a170727888e770e21a66712a971ced6268583650e257e6e0a8026fa"
        }
      ],
      "sources": []
    },
    {
      "slug": "vcenter-clone",
      "tech": "vcenter",
      "type": "procedure",
      "title": "vCenter - Encadrer un clone de secours de l'appliance",
      "description": "Conserver une copie de secours sans d\u00e9marrer deux appliances de m\u00eame identit\u00e9.",
      "content": "<h1>vCenter - Encadrer un clone de secours de l&#x27;appliance</h1><p>Conserver une copie de secours sans d\u00e9marrer deux appliances de m\u00eame identit\u00e9.</p><h2>Proc\u00e9dure</h2><ol><li>Privil\u00e9gier une sauvegarde VAMI test\u00e9e ; v\u00e9rifier les limites du clonage selon la version.</li><li>Si le clonage est approuv\u00e9, choisir un h\u00f4te et un stockage distincts selon le plan de reprise.</li><li>Conserver le clone \u00e9teint et son r\u00e9seau isol\u00e9 tant que la production est active.</li><li>Documenter date de copie, coh\u00e9rence et proc\u00e9dure de restauration, puis tester en environnement isol\u00e9.</li></ol><h2>Validation</h2><ul><li>Copie identifi\u00e9e, isol\u00e9e et plan de restauration valid\u00e9.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne jamais d\u00e9marrer le clone sur le m\u00eame r\u00e9seau que l&#x27;original. Un clone ne remplace pas une sauvegarde coh\u00e9rente de vCenter.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Vcenter/Clonage%20du%20VCenter%20VC%208.docx\">Vcenter/Clonage du VCenter VC 8.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Vcenter\\Clonage du VCenter VC 8.docx",
          "relativePath": "Vcenter/Clonage du VCenter VC 8.docx",
          "sha256": "a8eb60f698174cce98f3c0e75f4427ce02447973c942c7e5e89f52e6fd6b24bc"
        }
      ],
      "sources": []
    },
    {
      "slug": "vcenter-deploy",
      "tech": "vcenter",
      "type": "procedure",
      "title": "vCenter - Pr\u00e9parer le d\u00e9ploiement VCSA",
      "description": "Renseigner les deux phases de d\u00e9ploiement avec des identit\u00e9s et DNS valid\u00e9s.",
      "content": "<h1>vCenter - Pr\u00e9parer le d\u00e9ploiement VCSA</h1><p>Renseigner les deux phases de d\u00e9ploiement avec des identit\u00e9s et DNS valid\u00e9s.</p><h2>Proc\u00e9dure</h2><ol><li>Pr\u00e9parer ISO support\u00e9e, h\u00f4te cible, ressources, datastore, IP, FQDN, DNS direct/inverse et synchronisation horaire.</li><li>Dans l&#x27;installateur, d\u00e9ployer l&#x27;appliance sur l&#x27;h\u00f4te choisi et configurer le r\u00e9seau de gestion.</li><li>Terminer la seconde phase : heure, SSO et services, selon le plan valid\u00e9.</li><li>Se connecter au vSphere Client et \u00e0 l&#x27;interface de gestion, puis configurer une sauvegarde.</li></ol><h2>Validation</h2><ul><li>Services sains, DNS coh\u00e9rents et sauvegarde VAMI exploitable.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Le mot de passe et les IP figurant dans le document ne sont pas import\u00e9s. La source est principalement en captures : suivre l&#x27;assistant de la version d\u00e9ploy\u00e9e.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Vcenter/Deploiement%20vc8.docx\">Vcenter/Deploiement vc8.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Vcenter\\Deploiement vc8.docx",
          "relativePath": "Vcenter/Deploiement vc8.docx",
          "sha256": "005a4f9fae99ab3b1457659266c6a06518986d8138349e0bb47218c45be027ad"
        }
      ],
      "sources": []
    },
    {
      "slug": "vcenter-upgrade-path",
      "tech": "vcenter",
      "type": "memo",
      "title": "vCenter - V\u00e9rifier un chemin de mise \u00e0 niveau historique",
      "description": "\u00c9viter de d\u00e9ployer un vCenter 6.7 provisoire sans matrice de compatibilit\u00e9 valid\u00e9e.",
      "content": "<h1>vCenter - V\u00e9rifier un chemin de mise \u00e0 niveau historique</h1><p>\u00c9viter de d\u00e9ployer un vCenter 6.7 provisoire sans matrice de compatibilit\u00e9 valid\u00e9e.</p><h2>Points de contr\u00f4le</h2><ol><li>Relever versions exactes vCenter, ESXi, plugins, sauvegarde et mat\u00e9riel.</li><li>Consulter la matrice de mise \u00e0 niveau et les pr\u00e9requis du produit cible.</li><li>D\u00e9finir chaque palier support\u00e9, les tests et le retour arri\u00e8re.</li><li>Tester la restauration et effectuer les changements dans une fen\u00eatre de maintenance.</li></ol><h2>Validation</h2><ul><li>Chaque transition et d\u00e9pendance du parcours est valid\u00e9e.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Le titre de la source ne prouve pas qu&#x27;une mise \u00e0 niveau directe 6.7 vers 8 est possible. Ne pas remettre une version ancienne en service sans besoin approuv\u00e9.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Vcenter/D%C3%A9ploiement%20Vcenter%206.7%20Provisoire%20pour%20upgrade%20en%208.docx\">Vcenter/D\u00e9ploiement Vcenter 6.7 Provisoire pour upgrade en 8.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Vcenter\\D\u00e9ploiement Vcenter 6.7 Provisoire pour upgrade en 8.docx",
          "relativePath": "Vcenter/D\u00e9ploiement Vcenter 6.7 Provisoire pour upgrade en 8.docx",
          "sha256": "7d7b4289d13822e72662bc867700d43198fbfa1e719fe0632bf45897750e0789"
        }
      ],
      "sources": []
    },
    {
      "slug": "zyxel-snmp",
      "tech": "wifi",
      "type": "procedure",
      "title": "Zyxel Wi-Fi - Pr\u00e9parer un profil de supervision SNMP",
      "description": "Superviser la disponibilit\u00e9 des bornes et valider les alertes UP/DOWN.",
      "content": "<h1>Zyxel Wi-Fi - Pr\u00e9parer un profil de supervision SNMP</h1><p>Superviser la disponibilit\u00e9 des bornes et valider les alertes UP/DOWN.</p><h2>Proc\u00e9dure</h2><ol><li>Relever mod\u00e8le, firmware, collecteur et mode SNMP autoris\u00e9.</li><li>Configurer le profil de supervision dans l&#x27;outil de gestion.</li><li>Configurer la borne avec les destinations et identifiants adapt\u00e9s ; limiter les acc\u00e8s au collecteur.</li><li>Tester la collecte et une alerte sur une borne pilote sans interrompre les utilisateurs.</li></ol><h2>Validation</h2><ul><li>Statut coh\u00e9rent et alerte de test re\u00e7ue.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas recopier les communaut\u00e9s ou captures client. Les destinations de traps et de polling sont \u00e0 distinguer.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Wifi/Configuration%20du%20profil%20SNMP%20pour%20les%20bornes%20zyxel.docx\">Wifi/Configuration du profil SNMP pour les bornes zyxel.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Wifi\\Configuration du profil SNMP pour les bornes zyxel.docx",
          "relativePath": "Wifi/Configuration du profil SNMP pour les bornes zyxel.docx",
          "sha256": "ec362135ffffa93f99ed34c5d946768410f29e741c94d801793b02d32a6f2b0a"
        }
      ],
      "sources": []
    },
    {
      "slug": "windows-rdp",
      "tech": "windows",
      "type": "procedure",
      "title": "Windows - Activer et tester un acc\u00e8s Bureau \u00e0 distance",
      "description": "Joindre une machine autoris\u00e9e par RDP via le chemin de gestion pr\u00e9vu.",
      "content": "<h1>Windows - Activer et tester un acc\u00e8s Bureau \u00e0 distance</h1><p>Joindre une machine autoris\u00e9e par RDP via le chemin de gestion pr\u00e9vu.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier que l&#x27;\u00e9dition cible permet l&#x27;h\u00e9bergement RDP et que l&#x27;utilisateur a les droits.</li><li>Activer Bureau \u00e0 distance sur la cible selon la politique ; conserver NLA et les restrictions d&#x27;acc\u00e8s.</li><li>Connecter le VPN ou la passerelle pr\u00e9vue, puis tester r\u00e9solution et port 3389 si ce chemin l&#x27;utilise.</li><li>Ouvrir le client RDP, saisir la destination et v\u00e9rifier identit\u00e9/certificat avant connexion.</li></ol><h2>Validation</h2><ul><li>Connexion au bon poste et acc\u00e8s uniquement depuis le chemin autoris\u00e9.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas exposer 3389 directement sur Internet ni d\u00e9sactiver l&#x27;antivirus pour tester.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Windows/Bureau%20%C3%A0%20distance.docx\">Windows/Bureau \u00e0 distance.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Windows\\Bureau \u00e0 distance.docx",
          "relativePath": "Windows/Bureau \u00e0 distance.docx",
          "sha256": "0c1572ad7c9977c242f0b79836bec324e80e5ee435021877b358e7704fc7ccc9"
        }
      ],
      "sources": []
    },
    {
      "slug": "windows-account-recovery",
      "tech": "windows",
      "type": "memo",
      "title": "Windows - Pr\u00e9parer une r\u00e9cup\u00e9ration de compte autoris\u00e9e",
      "description": "Choisir le parcours de r\u00e9cup\u00e9ration selon compte local, domaine ou compte Microsoft en prot\u00e9geant les donn\u00e9es.",
      "content": "<h1>Windows - Pr\u00e9parer une r\u00e9cup\u00e9ration de compte autoris\u00e9e</h1><p>Choisir le parcours de r\u00e9cup\u00e9ration selon compte local, domaine ou compte Microsoft en prot\u00e9geant les donn\u00e9es.</p><h2>Points de contr\u00f4le</h2><ol><li>V\u00e9rifier l&#x27;autorisation et identifier le type de compte ainsi que les moyens de r\u00e9cup\u00e9ration disponibles.</li><li>Pour un compte de domaine, utiliser le parcours administrateur AD ; pour un compte Microsoft, son portail de r\u00e9cup\u00e9ration.</li><li>Pour un compte local, utiliser un administrateur autoris\u00e9 ou le moyen de r\u00e9initialisation configur\u00e9.</li><li>Avant une action hors ligne, inventorier sauvegardes, BitLocker, EFS et secrets prot\u00e9g\u00e9s ; faire approuver une r\u00e9installation si n\u00e9cessaire.</li></ol><h2>Validation</h2><ul><li>Acc\u00e8s r\u00e9tabli par un parcours autoris\u00e9 et donn\u00e9es contr\u00f4l\u00e9es.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>La m\u00e9thode de substitution d&#x27;utilman du document n&#x27;est pas import\u00e9e comme commande de maintenance. Un reset peut rendre des donn\u00e9es EFS ou secrets inaccessibles et ne d\u00e9verrouille pas BitLocker.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Windows/Hacker%20un%20mot%20de%20passe%20Windows%2010%20sans%20logiciel.docx\">Windows/Hacker un mot de passe Windows 10 sans logiciel.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Windows\\Hacker un mot de passe Windows 10 sans logiciel.docx",
          "relativePath": "Windows/Hacker un mot de passe Windows 10 sans logiciel.docx",
          "sha256": "e61b6dc6551c49762475c69565f89925450ac65cba8c4f72aef18c347a18132d"
        }
      ],
      "sources": []
    },
    {
      "slug": "windows-oem-key",
      "tech": "windows",
      "type": "procedure",
      "title": "Windows - Lire une cl\u00e9 OEM embarqu\u00e9e",
      "description": "Contr\u00f4ler si le firmware expose une cl\u00e9 OEM sans la copier dans la biblioth\u00e8que.",
      "content": "<h1>Windows - Lire une cl\u00e9 OEM embarqu\u00e9e</h1><p>Contr\u00f4ler si le firmware expose une cl\u00e9 OEM sans la copier dans la biblioth\u00e8que.</p><h2>Proc\u00e9dure</h2><ol><li>Identifier le besoin et l&#x27;autorisation de consulter la licence de la machine.</li><li>Interroger SoftwareLicensingService depuis PowerShell avec CIM ; la capture d&#x27;origine utilise WMIC.</li><li>Comparer avec l&#x27;\u00e9tat d&#x27;activation du syst\u00e8me et le type de licence.</li><li>Si une cl\u00e9 est retourn\u00e9e, la conserver seulement dans le coffre autoris\u00e9.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Windows - Lire la cl\u00e9 OEM depuis le firmware</h3><p><strong>Impact : Lecture d&#x27;une information de licence sensible.</strong> Ne pas publier la sortie ni l&#x27;enregistrer dans un m\u00e9mo. Une valeur vide est possible pour d&#x27;autres modes d&#x27;activation.</p><pre>(Get-CimInstance -ClassName SoftwareLicensingService).OA3xOriginalProductKey</pre><h2>Validation</h2><ul><li>Type de licence document\u00e9 sans fuite de la cl\u00e9.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Une valeur vide est possible, notamment avec une licence num\u00e9rique ou volume. Ce n&#x27;est pas automatiquement une erreur.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Windows/R%C3%A9cup%C3%A9ration%20de%20la%20cl%C3%A9%20de%20Licence%20Windows.docx\">Windows/R\u00e9cup\u00e9ration de la cl\u00e9 de Licence Windows.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "windows-oem-key"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Windows\\R\u00e9cup\u00e9ration de la cl\u00e9 de Licence Windows.docx",
          "relativePath": "Windows/R\u00e9cup\u00e9ration de la cl\u00e9 de Licence Windows.docx",
          "sha256": "ef5d8a0acbabb6943f852a8901f466499b974cb653f29a91638bc6d9105fb1e5"
        }
      ],
      "sources": []
    },
    {
      "slug": "windows-sandbox",
      "tech": "windows",
      "type": "procedure",
      "title": "Windows - Activer et utiliser le bac \u00e0 sable",
      "description": "Installer Windows Sandbox sur une \u00e9dition compatible et tester sans exposer les donn\u00e9es de travail.",
      "content": "<h1>Windows - Activer et utiliser le bac \u00e0 sable</h1><p>Installer Windows Sandbox sur une \u00e9dition compatible et tester sans exposer les donn\u00e9es de travail.</p><h2>Proc\u00e9dure</h2><ol><li>V\u00e9rifier \u00e9dition, virtualisation mat\u00e9rielle et politique du poste.</li><li>Dans Fonctionnalit\u00e9s Windows, activer Bac \u00e0 sable Windows.</li><li>Enregistrer les fichiers et red\u00e9marrer si demand\u00e9.</li><li>Ouvrir Sandbox et utiliser uniquement les fichiers de test pr\u00e9vus ; fermer la session pour supprimer son contenu.</li></ol><h2>Validation</h2><ul><li>Bac \u00e0 sable d\u00e9marrable et nouvel environnement propre apr\u00e8s fermeture.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Ne pas y fournir des secrets ou dossiers sensibles. L&#x27;isolation ne garantit pas l&#x27;innocuit\u00e9 d&#x27;un fichier et le r\u00e9seau peut rester accessible.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Windows/Sandbox%20win%2010.docx\">Windows/Sandbox win 10.docx</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Windows\\Sandbox win 10.docx",
          "relativePath": "Windows/Sandbox win 10.docx",
          "sha256": "faa6c57cba031ed5dd58e20bb498a185d1ad178fb7889d4bbb91794dfb5d0da5"
        }
      ],
      "sources": []
    },
    {
      "slug": "windows-msi-uninstall",
      "tech": "windows",
      "type": "procedure",
      "title": "Windows - Inventorier un produit MSI avant d\u00e9sinstallation",
      "description": "Identifier pr\u00e9cis\u00e9ment un produit et pr\u00e9parer son retrait autoris\u00e9.",
      "content": "<h1>Windows - Inventorier un produit MSI avant d\u00e9sinstallation</h1><p>Identifier pr\u00e9cis\u00e9ment un produit et pr\u00e9parer son retrait autoris\u00e9.</p><h2>Proc\u00e9dure</h2><ol><li>Confirmer l&#x27;application cible, sa gestion centrale et le plan de r\u00e9installation.</li><li>Privil\u00e9gier les applications install\u00e9es ou l&#x27;inventaire du parc pour retrouver le produit.</li><li>Si WMIC/Win32_Product est exceptionnellement utilis\u00e9 sur un syst\u00e8me qui le fournit, comprendre son impact avant l&#x27;inventaire.</li><li>Pour un antivirus, utiliser le parcours approuv\u00e9 par la console et pr\u00e9voir une protection de remplacement.</li></ol><h2>Validation</h2><ul><li>Seul le produit autoris\u00e9 est retir\u00e9 et le poste conserve sa protection attendue.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>La source supprime ESET : aucune d\u00e9sinstallation d&#x27;antivirus n&#x27;est lanc\u00e9e ou pr\u00e9configur\u00e9e. Win32_Product peut d\u00e9clencher des r\u00e9parations MSI et WMIC est un composant historique.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Windows/Sup%20app%20cmd.txt\">Windows/Sup app cmd.txt</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Windows\\Sup app cmd.txt",
          "relativePath": "Windows/Sup app cmd.txt",
          "sha256": "93bf9c08134e0a6b797f443984e4f4bea97c0cfcb0e5c3daa7121c402e55c103"
        }
      ],
      "sources": []
    },
    {
      "slug": "windows-edition-upgrade",
      "tech": "windows",
      "type": "procedure",
      "title": "Windows - Pr\u00e9parer le passage de Home \u00e0 Pro",
      "description": "Changer d'\u00e9dition avec une licence valide et une sauvegarde pr\u00e9alable.",
      "content": "<h1>Windows - Pr\u00e9parer le passage de Home \u00e0 Pro</h1><p>Changer d&#x27;\u00e9dition avec une licence valide et une sauvegarde pr\u00e9alable.</p><h2>Proc\u00e9dure</h2><ol><li>Relever \u00e9dition, build, activation et \u00e9ligibilit\u00e9 du poste.</li><li>Sauvegarder les donn\u00e9es et confirmer la licence Pro correspondant au poste.</li><li>Dans les param\u00e8tres d&#x27;activation, utiliser le parcours de changement d&#x27;\u00e9dition ou de cl\u00e9 autoris\u00e9.</li><li>Attendre la fin, red\u00e9marrer si demand\u00e9 puis v\u00e9rifier \u00e9dition et activation.</li></ol><h2>Commandes associ\u00e9es</h2><h3>Windows - Afficher l&#x27;\u00e9dition et le build</h3><p><strong>Impact : Lecture seule / fen\u00eatre d&#x27;information.</strong> Relever build et \u00e9dition compl\u00e8tes avant de choisir une proc\u00e9dure.</p><pre>winver</pre><h2>Validation</h2><ul><li>\u00c9dition Pro et activation valide, applications et fichiers conserv\u00e9s.</li></ul><h2>Pr\u00e9cautions</h2><ul><li>Le tutoriel Windows 10 1511 et son affirmation d&#x27;essai de 30 jours ne sont pas repris. Une cl\u00e9 g\u00e9n\u00e9rique de changement d&#x27;\u00e9dition ne fournit pas une licence.</li></ul><h2>Documents d'origine</h2><ul><li><a href=\"file:///D:/Wave/Technique/Proc%C3%A9dure/Windows/Windows%2010%20Home%20vers%20Windows%2010%20Pro.doc\">Windows/Windows 10 Home vers Windows 10 Pro.doc</a></li></ul><p>Adaptation de documents locaux le 2026-10-10. Les adresses et secrets propres aux clients ne sont pas repris. Confirmer version, droits et sauvegarde avant ex\u00e9cution ; aucune commande n'a \u00e9t\u00e9 ex\u00e9cut\u00e9e sur l'infrastructure.</p>",
      "commandSlugs": [
        "windows-winver"
      ],
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Windows\\Windows 10 Home vers Windows 10 Pro.doc",
          "relativePath": "Windows/Windows 10 Home vers Windows 10 Pro.doc",
          "sha256": "ba048b1fdb37eea24d892cb567954ec8019f23992ee845433f27723a5415cc3e"
        }
      ],
      "sources": []
    }
  ],
  "commands": [
    {
      "slug": "win-events-system",
      "tech": "windows",
      "title": "Windows - Journaux syst\u00e8me r\u00e9cents",
      "content": "Get-WinEvent -LogName System -MaxEvents 50",
      "description": "Lire les cinquante derniers \u00e9v\u00e9nements du journal Syst\u00e8me.",
      "example": "Get-WinEvent -LogName System -MaxEvents 50",
      "impact": "Lecture seule",
      "warning": "Les journaux peuvent contenir des identifiants et donn\u00e9es internes ; limiter leur partage.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\0 - A classer\\D\u00e9bogage syst\u00e9matique par les logs.docx",
          "relativePath": "0 - A classer/D\u00e9bogage syst\u00e9matique par les logs.docx",
          "sha256": "ef6f29719a07072e8c94a2386926ad13af9785ef3ccaf68e4f170d60b2ebbe58"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-list-files",
      "tech": "esxi",
      "title": "ESXi - Lister les fichiers du r\u00e9pertoire VM",
      "content": "ls -l",
      "description": "V\u00e9rifier les descripteurs VMDK et fichiers de la VM dans le r\u00e9pertoire pr\u00e9alablement s\u00e9lectionn\u00e9.",
      "example": "ls -l",
      "impact": "Lecture seule",
      "warning": "V\u00e9rifier le datastore et le r\u00e9pertoire avant toute commande suivante.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\0 - A classer\\Modification du type de disque VM Ware.docx",
          "relativePath": "0 - A classer/Modification du type de disque VM Ware.docx",
          "sha256": "d86eec60ddf7d29fa7bdfcc5adaba755e8858aa250da6d418f8f1f0193da0123"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-thin-clone",
      "tech": "esxi",
      "title": "ESXi - Cloner un VMDK au format thin",
      "content": "vmkfstools -i \"<SOURCE_VMDK>\" \"<DESTINATION_VMDK>\" -d thin",
      "description": "Cr\u00e9er un nouveau disque thin \u00e0 partir du descripteur VMDK source. Adaptation de la commande source sans imposer un contr\u00f4leur lsilogic.",
      "example": "vmkfstools -i \"disque.vmdk\" \"disque-thin.vmdk\" -d thin",
      "impact": "Cr\u00e9ation de disque / I/O stockage",
      "warning": "VM \u00e9teinte, snapshots trait\u00e9s, sauvegarde v\u00e9rifi\u00e9e et destination distincte avec assez d'espace. Ne pas utiliser le fichier -flat.vmdk comme descripteur.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\0 - A classer\\Modification du type de disque VM Ware.docx",
          "relativePath": "0 - A classer/Modification du type de disque VM Ware.docx",
          "sha256": "d86eec60ddf7d29fa7bdfcc5adaba755e8858aa250da6d418f8f1f0193da0123"
        }
      ],
      "sources": []
    },
    {
      "slug": "apt-update",
      "tech": "linux",
      "title": "Debian - Actualiser les index APT",
      "content": "sudo apt-get update",
      "description": "T\u00e9l\u00e9charger les index des d\u00e9p\u00f4ts configur\u00e9s sans mettre \u00e0 niveau les paquets.",
      "example": "sudo apt-get update",
      "impact": "R\u00e9seau / modification des index locaux",
      "warning": "V\u00e9rifier la distribution et les d\u00e9p\u00f4ts autoris\u00e9s.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\3CX\\VMTOOLS Debian 10 pour 3CX.docx",
          "relativePath": "3CX/VMTOOLS Debian 10 pour 3CX.docx",
          "sha256": "bbec2a4e898e282808d37064f9f33d40a23b60c8ca52b9d614d184ff4a1269d2"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\T\u00e9l\u00e9phonie\\VMTOOLS Debian 10 pour 3CX.docx",
          "relativePath": "T\u00e9l\u00e9phonie/VMTOOLS Debian 10 pour 3CX.docx",
          "sha256": "bbec2a4e898e282808d37064f9f33d40a23b60c8ca52b9d614d184ff4a1269d2"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Linux\\Proc\u00e9dure pour VM Tools sur Debian.docx",
          "relativePath": "Linux/Proc\u00e9dure pour VM Tools sur Debian.docx",
          "sha256": "34efb9077f34e8ba118bb5bca776d904f3b45192aacbf41279846055c2f6619c"
        }
      ],
      "sources": []
    },
    {
      "slug": "install-vmtools",
      "tech": "linux",
      "title": "Debian - Installer open-vm-tools",
      "content": "sudo apt-get install open-vm-tools",
      "description": "Installer les outils d'int\u00e9gration invit\u00e9 VMware.",
      "example": "sudo apt-get install open-vm-tools",
      "impact": "Installation logicielle",
      "warning": "Lire les changements propos\u00e9s par APT et v\u00e9rifier la compatibilit\u00e9 du produit h\u00e9berg\u00e9.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\3CX\\VMTOOLS Debian 10 pour 3CX.docx",
          "relativePath": "3CX/VMTOOLS Debian 10 pour 3CX.docx",
          "sha256": "bbec2a4e898e282808d37064f9f33d40a23b60c8ca52b9d614d184ff4a1269d2"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\T\u00e9l\u00e9phonie\\VMTOOLS Debian 10 pour 3CX.docx",
          "relativePath": "T\u00e9l\u00e9phonie/VMTOOLS Debian 10 pour 3CX.docx",
          "sha256": "bbec2a4e898e282808d37064f9f33d40a23b60c8ca52b9d614d184ff4a1269d2"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Linux\\Proc\u00e9dure pour VM Tools sur Debian.docx",
          "relativePath": "Linux/Proc\u00e9dure pour VM Tools sur Debian.docx",
          "sha256": "34efb9077f34e8ba118bb5bca776d904f3b45192aacbf41279846055c2f6619c"
        }
      ],
      "sources": []
    },
    {
      "slug": "version-vmtools",
      "tech": "linux",
      "title": "VMware Tools - Lire la version invit\u00e9e",
      "content": "/usr/bin/vmware-toolbox-cmd -v",
      "description": "Afficher la version des outils VMware install\u00e9s dans l'invit\u00e9.",
      "example": "/usr/bin/vmware-toolbox-cmd -v",
      "impact": "Lecture seule",
      "warning": "Chemin \u00e0 v\u00e9rifier selon la distribution.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\3CX\\VMTOOLS Debian 10 pour 3CX.docx",
          "relativePath": "3CX/VMTOOLS Debian 10 pour 3CX.docx",
          "sha256": "bbec2a4e898e282808d37064f9f33d40a23b60c8ca52b9d614d184ff4a1269d2"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\T\u00e9l\u00e9phonie\\VMTOOLS Debian 10 pour 3CX.docx",
          "relativePath": "T\u00e9l\u00e9phonie/VMTOOLS Debian 10 pour 3CX.docx",
          "sha256": "bbec2a4e898e282808d37064f9f33d40a23b60c8ca52b9d614d184ff4a1269d2"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Linux\\Proc\u00e9dure pour VM Tools sur Debian.docx",
          "relativePath": "Linux/Proc\u00e9dure pour VM Tools sur Debian.docx",
          "sha256": "34efb9077f34e8ba118bb5bca776d904f3b45192aacbf41279846055c2f6619c"
        }
      ],
      "sources": []
    },
    {
      "slug": "status-vmtools",
      "tech": "linux",
      "title": "Debian - Contr\u00f4ler le service open-vm-tools",
      "content": "systemctl status open-vm-tools --no-pager",
      "description": "Contr\u00f4ler le service sans modifier son \u00e9tat ; compl\u00e9ment \u00e0 la v\u00e9rification de version source.",
      "example": "systemctl status open-vm-tools --no-pager",
      "impact": "Lecture seule",
      "warning": "Le nom du service peut varier selon l'installation.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\3CX\\VMTOOLS Debian 10 pour 3CX.docx",
          "relativePath": "3CX/VMTOOLS Debian 10 pour 3CX.docx",
          "sha256": "bbec2a4e898e282808d37064f9f33d40a23b60c8ca52b9d614d184ff4a1269d2"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\T\u00e9l\u00e9phonie\\VMTOOLS Debian 10 pour 3CX.docx",
          "relativePath": "T\u00e9l\u00e9phonie/VMTOOLS Debian 10 pour 3CX.docx",
          "sha256": "bbec2a4e898e282808d37064f9f33d40a23b60c8ca52b9d614d184ff4a1269d2"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Linux\\Proc\u00e9dure pour VM Tools sur Debian.docx",
          "relativePath": "Linux/Proc\u00e9dure pour VM Tools sur Debian.docx",
          "sha256": "34efb9077f34e8ba118bb5bca776d904f3b45192aacbf41279846055c2f6619c"
        }
      ],
      "sources": []
    },
    {
      "slug": "bitlocker-status",
      "tech": "windows",
      "title": "BitLocker - Lire l'\u00e9tat des volumes",
      "content": "manage-bde -status",
      "description": "Lire \u00e9tat de chiffrement, progression et protection des volumes.",
      "example": "manage-bde -status",
      "impact": "Lecture seule",
      "warning": "Ex\u00e9cuter dans une console autoris\u00e9e, souvent \u00e9lev\u00e9e ; ne pas d\u00e9duire un d\u00e9chiffrement d'une protection suspendue.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "relativePath": "Anti-virus/Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "sha256": "4310a7ff5922b1b9b8f2e0397d1df40eba7f6ea90864a9dfd2c72ea2ebc61b0a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESET\\Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "relativePath": "ESET/Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "sha256": "4310a7ff5922b1b9b8f2e0397d1df40eba7f6ea90864a9dfd2c72ea2ebc61b0a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Proc\u00e9dure encryptage de disque complet.docx",
          "relativePath": "Anti-virus/Proc\u00e9dure encryptage de disque complet.docx",
          "sha256": "3ca52c0420c8b090745655ff8f6e2ca90a9870e778a0620f0467c49d4827d017"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESET\\Proc\u00e9dure encryptage de disque complet.docx",
          "relativePath": "ESET/Proc\u00e9dure encryptage de disque complet.docx",
          "sha256": "3ca52c0420c8b090745655ff8f6e2ca90a9870e778a0620f0467c49d4827d017"
        }
      ],
      "sources": [
        {
          "title": "ESET - BitLocker et chiffrement ESET",
          "url": "https://support.eset.com/en/kb7191-using-bitlocker-and-eset-endpoint-encryption-full-disk-encryption-at-the-same-time"
        }
      ]
    },
    {
      "slug": "bitlocker-events",
      "tech": "windows",
      "title": "BitLocker - Lire les \u00e9v\u00e9nements du pilote",
      "content": "Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-BitLocker-Driver'}",
      "description": "Lire les \u00e9v\u00e9nements syst\u00e8me du fournisseur BitLocker.",
      "example": "Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-BitLocker-Driver'}",
      "impact": "Lecture seule",
      "warning": "La source ne garantit pas la pr\u00e9sence d'\u00e9v\u00e9nements sur chaque poste.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "relativePath": "Anti-virus/Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "sha256": "4310a7ff5922b1b9b8f2e0397d1df40eba7f6ea90864a9dfd2c72ea2ebc61b0a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESET\\Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "relativePath": "ESET/Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "sha256": "4310a7ff5922b1b9b8f2e0397d1df40eba7f6ea90864a9dfd2c72ea2ebc61b0a"
        }
      ],
      "sources": [
        {
          "title": "ESET - BitLocker et chiffrement ESET",
          "url": "https://support.eset.com/en/kb7191-using-bitlocker-and-eset-endpoint-encryption-full-disk-encryption-at-the-same-time"
        }
      ]
    },
    {
      "slug": "bitlocker-decrypt",
      "tech": "windows",
      "title": "BitLocker - D\u00e9chiffrer un volume approuv\u00e9",
      "content": "manage-bde -off <VOLUME>",
      "description": "D\u00e9marrer le d\u00e9chiffrement du seul volume valid\u00e9 dans un projet de migration.",
      "example": "manage-bde -off C:",
      "impact": "Retrait de protection / d\u00e9chiffrement",
      "warning": "Ce n'est pas un diagnostic. Sauvegarde, cl\u00e9s de r\u00e9cup\u00e9ration, alimentation et autorisation indispensables ; attendre la fin et rechiffrer selon le plan.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Anti-virus\\Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "relativePath": "Anti-virus/Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "sha256": "4310a7ff5922b1b9b8f2e0397d1df40eba7f6ea90864a9dfd2c72ea2ebc61b0a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESET\\Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "relativePath": "ESET/Eset full Encryption - Echec \u00e0 cause de BitLocker.docx",
          "sha256": "4310a7ff5922b1b9b8f2e0397d1df40eba7f6ea90864a9dfd2c72ea2ebc61b0a"
        }
      ],
      "sources": [
        {
          "title": "ESET - BitLocker et chiffrement ESET",
          "url": "https://support.eset.com/en/kb7191-using-bitlocker-and-eset-endpoint-encryption-full-disk-encryption-at-the-same-time"
        }
      ]
    },
    {
      "slug": "run-wacs",
      "tech": "iis",
      "title": "win-acme - Ouvrir l'assistant ACME",
      "content": ".\\wacs.exe",
      "description": "Lancer l'assistant depuis le dossier de la distribution win-acme valid\u00e9e.",
      "example": ".\\wacs.exe",
      "impact": "Assistant de configuration / certificat",
      "warning": "Console administrateur ; toute \u00e9mission ou modification de binding dans l'assistant doit \u00eatre valid\u00e9e.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Certificats\\Proc\u00e9dure installation certificat Letsencrypt sur IIS via CMD.docx",
          "relativePath": "Certificats/Proc\u00e9dure installation certificat Letsencrypt sur IIS via CMD.docx",
          "sha256": "3c95c2ce76a8718a4dd8ac2a5c5d7f1991875d3f1ce8669819392c200870d7cc"
        }
      ],
      "sources": [
        {
          "title": "win-acme - Documentation",
          "url": "https://www.win-acme.com/manual/getting-started"
        }
      ]
    },
    {
      "slug": "cisco-save",
      "tech": "cisco",
      "title": "Cisco IOS - Sauvegarder la configuration active",
      "content": "copy running-config startup-config",
      "description": "Enregistrer la configuration active pour le prochain d\u00e9marrage.",
      "example": "copy running-config startup-config",
      "impact": "\u00c9criture de configuration persistante",
      "warning": "EXEC privil\u00e9gi\u00e9. Sauvegarder uniquement une configuration valid\u00e9e ; cette commande ne cr\u00e9e pas une sauvegarde externe.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Cisco\\Commande CISCO.txt",
          "relativePath": "Cisco/Commande CISCO.txt",
          "sha256": "450d339b4fc1432262db81c1c5a8187796be20be5c4babacdcb4741d3380cd65"
        }
      ],
      "sources": []
    },
    {
      "slug": "cisco-tftp",
      "tech": "cisco",
      "title": "Cisco IOS - Exporter la configuration vers TFTP",
      "content": "copy running-config tftp:",
      "description": "D\u00e9marrer l'export interactif puis fournir le serveur TFTP et le nom destination.",
      "example": "copy running-config tftp:\nServeur de test : 192.0.2.10\nFichier : switch-backup.cfg",
      "impact": "Export de configuration sensible",
      "warning": "EXEC privil\u00e9gi\u00e9. TFTP est non chiffr\u00e9 ; utiliser seulement un r\u00e9seau et un stockage prot\u00e9g\u00e9s, ou un transfert s\u00e9curis\u00e9 support\u00e9.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Cisco\\Commande CISCO.txt",
          "relativePath": "Cisco/Commande CISCO.txt",
          "sha256": "450d339b4fc1432262db81c1c5a8187796be20be5c4babacdcb4741d3380cd65"
        }
      ],
      "sources": []
    },
    {
      "slug": "cisco-user-add",
      "tech": "cisco",
      "title": "Cisco IOS - Cr\u00e9er un compte local privil\u00e9gi\u00e9",
      "content": "username <UTILISATEUR> privilege 15 secret <SECRET>",
      "description": "Ajouter le compte local approuv\u00e9 en configuration globale.",
      "example": "username admin-maintenance privilege 15 secret <SECRET>",
      "impact": "Modification des acc\u00e8s administrateur",
      "warning": "privilege 15 donne des droits complets. Conserver un acc\u00e8s de secours et prot\u00e9ger historique/secret ; v\u00e9rifier le type de secret support\u00e9 sur la release.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Cisco\\Commande CISCO.txt",
          "relativePath": "Cisco/Commande CISCO.txt",
          "sha256": "450d339b4fc1432262db81c1c5a8187796be20be5c4babacdcb4741d3380cd65"
        }
      ],
      "sources": []
    },
    {
      "slug": "cisco-user-remove",
      "tech": "cisco",
      "title": "Cisco IOS - Retirer un compte local",
      "content": "no username <UTILISATEUR>",
      "description": "Retirer uniquement le compte valid\u00e9 ; adaptation de la ligne source avec le suffixe active supprim\u00e9.",
      "example": "no username ancien-compte",
      "impact": "Suppression d'acc\u00e8s",
      "warning": "Configuration globale. V\u00e9rifier que ce n'est pas le seul compte d'administration ; conserver console et acc\u00e8s de secours.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Cisco\\Commande CISCO.txt",
          "relativePath": "Cisco/Commande CISCO.txt",
          "sha256": "450d339b4fc1432262db81c1c5a8187796be20be5c4babacdcb4741d3380cd65"
        }
      ],
      "sources": []
    },
    {
      "slug": "gophish-ad-export",
      "tech": "ad",
      "title": "AD - Exporter un groupe pilote pour Gophish",
      "content": "Get-ADUser -Filter * -SearchBase \"<OU_DN>\" -Properties mail,givenName,sn,title | Select-Object @{n='First Name';e={$_.givenName}},@{n='Last Name';e={$_.sn}},@{n='Email';e={$_.mail}},@{n='Position';e={$_.title}} | Export-Csv -LiteralPath \"<CSV>\" -Delimiter ',' -NoTypeInformation -Encoding UTF8",
      "description": "Exporter les colonnes attendues par Gophish pour la seule OU autoris\u00e9e.",
      "example": "Remplacer <OU_DN> par OU=Pilote,DC=example,DC=test et <CSV> par C:\\Audit\\gophish-pilote.csv.",
      "impact": "Lecture AD / export de donn\u00e9es personnelles",
      "warning": "Autorisation explicite du p\u00e9rim\u00e8tre de sensibilisation, r\u00e9pertoire prot\u00e9g\u00e9 et dur\u00e9e de conservation limit\u00e9e. Un fichier existant peut \u00eatre remplac\u00e9.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Cyber\\Proc\u00e9dure phishing.docx",
          "relativePath": "Cyber/Proc\u00e9dure phishing.docx",
          "sha256": "5d3257353886dcd1225e5472e329135ea8639b7a736b91c1b9d34c60d306b8f0"
        }
      ],
      "sources": [
        {
          "title": "Gophish - Documentation",
          "url": "https://docs.getgophish.com/user-guide/"
        }
      ]
    },
    {
      "slug": "copy-fonts",
      "tech": "gpo",
      "title": "GPO - Copier des polices depuis un partage",
      "content": "Copy-Item -Path \"<PARTAGE_POLICES>\\*.ttf\" -Destination \"C:\\Windows\\Fonts\" -Force",
      "description": "Copier les TTF autoris\u00e9s dans le dossier des polices ; la validation de leur enregistrement reste n\u00e9cessaire.",
      "example": "Copy-Item -Path \"\\\\files.example.test\\polices\\*.ttf\" -Destination \"C:\\Windows\\Fonts\" -Force",
      "impact": "\u00c9criture syst\u00e8me / remplacement de fichiers",
      "warning": "Contexte administrateur ou syst\u00e8me. Force peut \u00e9craser des fichiers ; une copie seule ne garantit pas l'installation des polices.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\DC\\GPO pour police SALINI.docx",
          "relativePath": "DC/GPO pour police SALINI.docx",
          "sha256": "98c9dfe014676383d9b6ba002da91ae6d8f938c333db105feeb3c9025ee45c4e"
        }
      ],
      "sources": []
    },
    {
      "slug": "k8s-modules",
      "tech": "k8s",
      "title": "Kubernetes - Charger overlay et br_netfilter",
      "content": "sudo modprobe overlay\nsudo modprobe br_netfilter",
      "description": "Charger les modules noyau du design d\u00e9crit par la proc\u00e9dure.",
      "example": "sudo modprobe overlay\nsudo modprobe br_netfilter",
      "impact": "Modification noyau en cours d'ex\u00e9cution",
      "warning": "V\u00e9rifier les pr\u00e9requis du runtime/CNI ; ces lignes ne rendent pas la configuration persistante.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Docker\\D\u00e9ploiement kubernetes Debian11.docx",
          "relativePath": "Docker/D\u00e9ploiement kubernetes Debian11.docx",
          "sha256": "a4fb9b3744ccd5543c18815eccd6a67433f134ff3873e3d2129263874a61729b"
        }
      ],
      "sources": [
        {
          "title": "Kubernetes - Installation kubeadm",
          "url": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/"
        }
      ]
    },
    {
      "slug": "k8s-free",
      "tech": "linux",
      "title": "Linux - Lire l'utilisation m\u00e9moire et swap",
      "content": "free -m",
      "description": "Afficher l'utilisation m\u00e9moire et la quantit\u00e9 de swap en Mio.",
      "example": "free -m",
      "impact": "Lecture seule",
      "warning": "Une valeur ponctuelle ne suffit pas pour conclure \u00e0 une saturation m\u00e9moire.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Docker\\D\u00e9ploiement kubernetes Debian11.docx",
          "relativePath": "Docker/D\u00e9ploiement kubernetes Debian11.docx",
          "sha256": "a4fb9b3744ccd5543c18815eccd6a67433f134ff3873e3d2129263874a61729b"
        }
      ],
      "sources": [
        {
          "title": "Kubernetes - Installation kubeadm",
          "url": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/"
        }
      ]
    },
    {
      "slug": "k8s-sysctl",
      "tech": "k8s",
      "title": "Kubernetes - Appliquer les fichiers sysctl",
      "content": "sudo sysctl --system",
      "description": "Recharger les fichiers de configuration sysctl ; correction du tiret typographique de la source.",
      "example": "sudo sysctl --system",
      "impact": "Modification des param\u00e8tres noyau",
      "warning": "Relire tous les fichiers pris en compte, pas seulement k8s.conf. Peut affecter routage et r\u00e9seau du serveur.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Docker\\D\u00e9ploiement kubernetes Debian11.docx",
          "relativePath": "Docker/D\u00e9ploiement kubernetes Debian11.docx",
          "sha256": "a4fb9b3744ccd5543c18815eccd6a67433f134ff3873e3d2129263874a61729b"
        }
      ],
      "sources": [
        {
          "title": "Kubernetes - Installation kubeadm",
          "url": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/"
        }
      ]
    },
    {
      "slug": "k8s-hold",
      "tech": "k8s",
      "title": "Kubernetes - Figer les paquets de gestion de version",
      "content": "sudo apt-mark hold kubelet kubeadm kubectl",
      "description": "Emp\u00eacher une mise \u00e0 niveau APT non planifi\u00e9e des trois paquets.",
      "example": "sudo apt-mark hold kubelet kubeadm kubectl",
      "impact": "Modification de la politique de mise \u00e0 jour",
      "warning": "Pr\u00e9voir un processus de mise \u00e0 niveau et de correctifs ; ne pas laisser les versions fig\u00e9es sans suivi.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Docker\\D\u00e9ploiement kubernetes Debian11.docx",
          "relativePath": "Docker/D\u00e9ploiement kubernetes Debian11.docx",
          "sha256": "a4fb9b3744ccd5543c18815eccd6a67433f134ff3873e3d2129263874a61729b"
        }
      ],
      "sources": [
        {
          "title": "Kubernetes - Installation kubeadm",
          "url": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/"
        }
      ]
    },
    {
      "slug": "k8s-init",
      "tech": "k8s",
      "title": "Kubernetes - Initialiser un control plane kubeadm",
      "content": "sudo kubeadm init --pod-network-cidr=<CIDR_PODS> --cri-socket unix:///var/run/cri-dockerd.sock",
      "description": "Initialiser un nouveau control plane avec cri-dockerd et le CIDR compatible avec le CNI choisi.",
      "example": "sudo kubeadm init --pod-network-cidr=10.244.0.0/16 --cri-socket unix:///var/run/cri-dockerd.sock",
      "impact": "Cr\u00e9ation de cluster / configuration syst\u00e8me",
      "warning": "Uniquement sur un n\u0153ud neuf pr\u00e9par\u00e9. Ne pas ex\u00e9cuter sur un cluster existant ; adapter le socket si un autre runtime CRI est retenu.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Docker\\D\u00e9ploiement kubernetes Debian11.docx",
          "relativePath": "Docker/D\u00e9ploiement kubernetes Debian11.docx",
          "sha256": "a4fb9b3744ccd5543c18815eccd6a67433f134ff3873e3d2129263874a61729b"
        }
      ],
      "sources": [
        {
          "title": "Kubernetes - Installation kubeadm",
          "url": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/"
        }
      ]
    },
    {
      "slug": "k8s-join",
      "tech": "k8s",
      "title": "Kubernetes - Joindre un worker avec un jeton temporaire",
      "content": "sudo kubeadm join <CONTROL_PLANE>:6443 --token <TOKEN> --discovery-token-ca-cert-hash sha256:<CA_HASH> --cri-socket unix:///var/run/cri-dockerd.sock",
      "description": "Ajouter un worker au seul cluster autoris\u00e9 en v\u00e9rifiant le hash de l'autorit\u00e9.",
      "example": "Utiliser la commande de jointure g\u00e9n\u00e9r\u00e9e par le control plane approuv\u00e9 ; ne pas r\u00e9utiliser un jeton d'exemple.",
      "impact": "Ajout d'un n\u0153ud / modification syst\u00e8me",
      "warning": "Le jeton est un secret temporaire. V\u00e9rifier l'identit\u00e9 du cluster, le hash et le runtime avant ex\u00e9cution.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Docker\\D\u00e9ploiement kubernetes Debian11.docx",
          "relativePath": "Docker/D\u00e9ploiement kubernetes Debian11.docx",
          "sha256": "a4fb9b3744ccd5543c18815eccd6a67433f134ff3873e3d2129263874a61729b"
        }
      ],
      "sources": [
        {
          "title": "Kubernetes - Installation kubeadm",
          "url": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/"
        }
      ]
    },
    {
      "slug": "k8s-token",
      "tech": "k8s",
      "title": "Kubernetes - G\u00e9n\u00e9rer une commande de jointure",
      "content": "sudo kubeadm token create --print-join-command",
      "description": "Cr\u00e9er un nouveau jeton et afficher la commande de jointure.",
      "example": "sudo kubeadm token create --print-join-command",
      "impact": "Cr\u00e9ation de secret d'acc\u00e8s au cluster",
      "warning": "Ex\u00e9cuter sur le control plane autoris\u00e9 ; prot\u00e9ger la sortie et r\u00e9voquer le jeton s'il n'est plus utile.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Docker\\D\u00e9ploiement kubernetes Debian11.docx",
          "relativePath": "Docker/D\u00e9ploiement kubernetes Debian11.docx",
          "sha256": "a4fb9b3744ccd5543c18815eccd6a67433f134ff3873e3d2129263874a61729b"
        }
      ],
      "sources": [
        {
          "title": "Kubernetes - Installation kubeadm",
          "url": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/"
        }
      ]
    },
    {
      "slug": "k8s-nodes",
      "tech": "k8s",
      "title": "Kubernetes - Lister les n\u0153uds",
      "content": "kubectl get nodes",
      "description": "Lire l'\u00e9tat des n\u0153uds ; nodes est une ressource de cluster, donc -A n'est pas n\u00e9cessaire.",
      "example": "kubectl get nodes",
      "impact": "Lecture seule",
      "warning": "V\u00e9rifier le contexte kubeconfig avant la collecte.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Docker\\D\u00e9ploiement kubernetes Debian11.docx",
          "relativePath": "Docker/D\u00e9ploiement kubernetes Debian11.docx",
          "sha256": "a4fb9b3744ccd5543c18815eccd6a67433f134ff3873e3d2129263874a61729b"
        }
      ],
      "sources": [
        {
          "title": "Kubernetes - Installation kubeadm",
          "url": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/"
        }
      ]
    },
    {
      "slug": "k8s-pods",
      "tech": "k8s",
      "title": "Kubernetes - Lister les pods de tous les namespaces",
      "content": "kubectl get pods -A",
      "description": "Contr\u00f4ler l'\u00e9tat des pods apr\u00e8s d\u00e9ploiement.",
      "example": "kubectl get pods -A",
      "impact": "Lecture seule",
      "warning": "N\u00e9cessite des droits de lecture sur le p\u00e9rim\u00e8tre ; v\u00e9rifier le contexte courant.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Docker\\D\u00e9ploiement kubernetes Debian11.docx",
          "relativePath": "Docker/D\u00e9ploiement kubernetes Debian11.docx",
          "sha256": "a4fb9b3744ccd5543c18815eccd6a67433f134ff3873e3d2129263874a61729b"
        }
      ],
      "sources": [
        {
          "title": "Kubernetes - Installation kubeadm",
          "url": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/"
        }
      ]
    },
    {
      "slug": "ntfs-install",
      "tech": "ad",
      "title": "PowerShell - Installer le module NTFSSecurity",
      "content": "Install-Module -Name NTFSSecurity -Scope CurrentUser",
      "description": "Installer le module utilis\u00e9 par la proc\u00e9dure de lecture d'ACL.",
      "example": "Install-Module -Name NTFSSecurity -Scope CurrentUser",
      "impact": "Installation d'un module",
      "warning": "V\u00e9rifier provenance, version et politique de d\u00e9p\u00f4t avant d'accepter l'installation.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Connaitre les droits NTFS en PowerShell.docx",
          "relativePath": "Domaine/Connaitre les droits NTFS en PowerShell.docx",
          "sha256": "09f0544354941bcc82bbaaabd9dfe90e145a8e86ed970961fdd7ce4ae066a3df"
        }
      ],
      "sources": []
    },
    {
      "slug": "ntfs-read",
      "tech": "ad",
      "title": "NTFSSecurity - Lire les permissions d'un chemin",
      "content": "Get-NTFSAccess -Path \"<CHEMIN>\"",
      "description": "Lire les ACE NTFS explicites et h\u00e9rit\u00e9es du chemin cibl\u00e9.",
      "example": "Get-NTFSAccess -Path \"C:\\Partage\\Ressources\"",
      "impact": "Lecture seule",
      "warning": "N\u00e9cessite le module NTFSSecurity ; permissions NTFS et de partage sont distinctes.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Connaitre les droits NTFS en PowerShell.docx",
          "relativePath": "Domaine/Connaitre les droits NTFS en PowerShell.docx",
          "sha256": "09f0544354941bcc82bbaaabd9dfe90e145a8e86ed970961fdd7ce4ae066a3df"
        }
      ],
      "sources": []
    },
    {
      "slug": "ntfs-table",
      "tech": "ad",
      "title": "NTFSSecurity - Afficher les permissions en tableau",
      "content": "Get-NTFSAccess -Path \"<CHEMIN>\" | Format-Table -AutoSize",
      "description": "Pr\u00e9senter les ACL du chemin dans un tableau lisible.",
      "example": "Get-NTFSAccess -Path \"C:\\Partage\\Ressources\" | Format-Table -AutoSize",
      "impact": "Lecture seule",
      "warning": "Une vue tableau peut tronquer des champs ; conserver la sortie structur\u00e9e si n\u00e9cessaire.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Connaitre les droits NTFS en PowerShell.docx",
          "relativePath": "Domaine/Connaitre les droits NTFS en PowerShell.docx",
          "sha256": "09f0544354941bcc82bbaaabd9dfe90e145a8e86ed970961fdd7ce4ae066a3df"
        }
      ],
      "sources": []
    },
    {
      "slug": "exchange-new-mailbox",
      "tech": "exchange",
      "title": "Exchange local - Cr\u00e9er une bo\u00eete et un compte",
      "content": "New-Mailbox -Name \"<NOM>\" -UserPrincipalName \"<UPN>\" -OrganizationalUnit \"<OU_DN>\" -Password (Read-Host 'Mot de passe initial' -AsSecureString)",
      "description": "Cr\u00e9er la bo\u00eete du nouvel utilisateur sans mot de passe en clair dans la commande.",
      "example": "New-Mailbox -Name \"Compte pilote\" -UserPrincipalName \"pilote@example.test\" -OrganizationalUnit \"OU=Pilote,DC=example,DC=test\" -Password (Read-Host 'Mot de passe initial' -AsSecureString)",
      "impact": "Cr\u00e9ation d'identit\u00e9 et de bo\u00eete",
      "warning": "Exchange Management Shell local avec droits requis. Ne pas utiliser pour un compte AD existant et ne pas ignorer le p\u00e9rim\u00e8tre OU.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Cr\u00e9ation utilisateur shell manager.docx",
          "relativePath": "Domaine/Cr\u00e9ation utilisateur shell manager.docx",
          "sha256": "92d4e7b9852f094b83eadebcdd89784775dcb48f1ce5e73c7a60a4ab55622367"
        }
      ],
      "sources": []
    },
    {
      "slug": "exchange-get-mailbox",
      "tech": "exchange",
      "title": "Exchange local - Lire les propri\u00e9t\u00e9s d'une bo\u00eete",
      "content": "Get-Mailbox -Identity \"<IDENTITE>\" | Format-List Name,DisplayName,Alias,PrimarySmtpAddress,Database",
      "description": "V\u00e9rifier identit\u00e9, adresse principale et base de la bo\u00eete cibl\u00e9e.",
      "example": "Get-Mailbox -Identity \"pilote@example.test\" | Format-List Name,DisplayName,Alias,PrimarySmtpAddress,Database",
      "impact": "Lecture seule",
      "warning": "V\u00e9rifier le serveur ou l'organisation de gestion.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Domaine\\Cr\u00e9ation utilisateur shell manager.docx",
          "relativePath": "Domaine/Cr\u00e9ation utilisateur shell manager.docx",
          "sha256": "92d4e7b9852f094b83eadebcdd89784775dcb48f1ce5e73c7a60a4ab55622367"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-snmp-get",
      "tech": "esxi",
      "title": "ESXi - Lire la configuration SNMP",
      "content": "esxcli system snmp get",
      "description": "Lire les param\u00e8tres existants avant modification.",
      "example": "esxcli system snmp get",
      "impact": "Lecture de configuration sensible",
      "warning": "La sortie peut contenir la communaut\u00e9 ; prot\u00e9ger le diagnostic.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESX\\Configuration du profil SNMP pour ESX8.docx",
          "relativePath": "ESX/Configuration du profil SNMP pour ESX8.docx",
          "sha256": "8dd8d7c652e1e00cefbeb0c3a4c20f24b2d5a04315ec779303a75d3c690ba1d3"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-snmp-community",
      "tech": "esxi",
      "title": "ESXi - D\u00e9finir une communaut\u00e9 SNMP approuv\u00e9e",
      "content": "esxcli system snmp set --communities <COMMUNAUTE>",
      "description": "Configurer le secret communaut\u00e9 pour un parcours SNMP v2c explicitement autoris\u00e9.",
      "example": "esxcli system snmp set --communities <COMMUNAUTE>",
      "impact": "Modification de configuration / secret",
      "warning": "La valeur peut remplacer les communaut\u00e9s existantes. Privil\u00e9gier le mode SNMP autoris\u00e9 le plus protecteur et limiter le pare-feu.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESX\\Configuration du profil SNMP pour ESX8.docx",
          "relativePath": "ESX/Configuration du profil SNMP pour ESX8.docx",
          "sha256": "8dd8d7c652e1e00cefbeb0c3a4c20f24b2d5a04315ec779303a75d3c690ba1d3"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-snmp-target",
      "tech": "esxi",
      "title": "ESXi - Configurer une destination de notification SNMP",
      "content": "esxcli system snmp set --targets=<COLLECTEUR>@<PORT>/<COMMUNAUTE>",
      "description": "D\u00e9finir la destination et le port de notification SNMP selon la configuration du collecteur.",
      "example": "esxcli system snmp set --targets=192.0.2.10@162/<COMMUNAUTE>",
      "impact": "Modification de configuration / notifications",
      "warning": "V\u00e9rifier syntaxe et port attendus sur la release. La communaut\u00e9 est un secret ; ne pas recopier le port 161 de la source sans contr\u00f4le.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESX\\Configuration du profil SNMP pour ESX8.docx",
          "relativePath": "ESX/Configuration du profil SNMP pour ESX8.docx",
          "sha256": "8dd8d7c652e1e00cefbeb0c3a4c20f24b2d5a04315ec779303a75d3c690ba1d3"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-snmp-enable",
      "tech": "esxi",
      "title": "ESXi - Activer l'agent SNMP",
      "content": "esxcli system snmp set --enable true",
      "description": "Activer l'agent apr\u00e8s v\u00e9rification de sa configuration et des restrictions d'acc\u00e8s.",
      "example": "esxcli system snmp set --enable true",
      "impact": "Activation de service r\u00e9seau",
      "warning": "Limiter les sources autoris\u00e9es avant activation.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESX\\Configuration du profil SNMP pour ESX8.docx",
          "relativePath": "ESX/Configuration du profil SNMP pour ESX8.docx",
          "sha256": "8dd8d7c652e1e00cefbeb0c3a4c20f24b2d5a04315ec779303a75d3c690ba1d3"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-snmp-test",
      "tech": "esxi",
      "title": "ESXi - Envoyer un test SNMP",
      "content": "esxcli system snmp test",
      "description": "Tester le parcours de notification de l'agent vers sa cible.",
      "example": "esxcli system snmp test",
      "impact": "Envoi de notification / possible alerte",
      "warning": "Pr\u00e9venir la supervision et v\u00e9rifier la r\u00e9ception du test.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESX\\Configuration du profil SNMP pour ESX8.docx",
          "relativePath": "ESX/Configuration du profil SNMP pour ESX8.docx",
          "sha256": "8dd8d7c652e1e00cefbeb0c3a4c20f24b2d5a04315ec779303a75d3c690ba1d3"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-poweroff",
      "tech": "esxi",
      "title": "ESXi - Arr\u00eater les services puis \u00e9teindre l'h\u00f4te",
      "content": "/sbin/shutdown.sh && /sbin/poweroff",
      "description": "S\u00e9quence d'arr\u00eat de l'ancien script d'onduleur, \u00e0 revalider sur la version install\u00e9e.",
      "example": "/sbin/shutdown.sh && /sbin/poweroff",
      "impact": "Coupure de service / extinction h\u00f4te",
      "warning": "Uniquement apr\u00e8s arr\u00eat confirm\u00e9 des VM et selon le plan de l'onduleur. Cette s\u00e9quence ne garantit pas l'arr\u00eat propre des invit\u00e9s ; console et fen\u00eatre valid\u00e9es indispensables.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESX\\Proc\u00e9dure Arret ESXI.docx",
          "relativePath": "ESX/Proc\u00e9dure Arret ESXI.docx",
          "sha256": "3a89b377431a49cdc31221d4ff63bcc2d2c7bd49e8023a9fb3d668f8f1c45df9"
        }
      ],
      "sources": []
    },
    {
      "slug": "esxi-generate-cert",
      "tech": "esxi",
      "title": "ESXi autonome - G\u00e9n\u00e9rer les certificats de l'h\u00f4te",
      "content": "/sbin/generate-certificates",
      "description": "G\u00e9n\u00e9rer un certificat dans le parcours autonome support\u00e9 pour la version de l'h\u00f4te.",
      "example": "/sbin/generate-certificates",
      "impact": "Modification d'identit\u00e9 TLS",
      "warning": "Sauvegarder rui.crt/rui.key et v\u00e9rifier VMCA/PKI avant usage. Ne pas appliquer automatiquement sur un h\u00f4te g\u00e9r\u00e9 avec certificat personnalis\u00e9.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\ESX\\Renouveller certificat ESX.docx",
          "relativePath": "ESX/Renouveller certificat ESX.docx",
          "sha256": "5cd6111ad30a6eda52f502ce7f5822a104145cdb678c0730f8306eb3a9b3f5bd"
        }
      ],
      "sources": []
    },
    {
      "slug": "pfsense-dns",
      "tech": "pfsense",
      "title": "pfSense - Tester la r\u00e9solution d'un nom",
      "content": "nslookup <FQDN>",
      "description": "Tester la r\u00e9solution depuis le pare-feu avant de r\u00e9parer les paquets.",
      "example": "nslookup pfsense.org",
      "impact": "Requ\u00eate DNS",
      "warning": "Comparer le DNS utilis\u00e9 et les r\u00e9ponses avec le contexte du d\u00e9p\u00f4t.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "relativePath": "FW/Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "sha256": "c62bba53a591a488e5e78c436bc42e7d59cc7c6354cf2c58b1162b8fe30e771d"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "relativePath": "Pfsense/Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "sha256": "c62bba53a591a488e5e78c436bc42e7d59cc7c6354cf2c58b1162b8fe30e771d"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Proc\u00e9dure repository pfsense.docx",
          "relativePath": "FW/Proc\u00e9dure repository pfsense.docx",
          "sha256": "06c93503d67ebd65333b4c2c0bd2e7fd6dc958963bd0fed762a50d5931402835"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Proc\u00e9dure repository pfsense.docx",
          "relativePath": "Pfsense/Proc\u00e9dure repository pfsense.docx",
          "sha256": "06c93503d67ebd65333b4c2c0bd2e7fd6dc958963bd0fed762a50d5931402835"
        }
      ],
      "sources": [
        {
          "title": "Netgate - D\u00e9pannage des mises \u00e0 jour",
          "url": "https://docs.netgate.com/pfsense/en/latest/troubleshooting/upgrades.html"
        }
      ]
    },
    {
      "slug": "pfsense-upgrade-info",
      "tech": "pfsense",
      "title": "pfSense - Lire la version du paquet de mise \u00e0 jour",
      "content": "pkg-static info -x pfSense-upgrade",
      "description": "V\u00e9rifier la version locale du paquet sans lancer la mise \u00e0 niveau du syst\u00e8me.",
      "example": "pkg-static info -x pfSense-upgrade",
      "impact": "Lecture seule",
      "warning": "Compl\u00e9ment documentaire Netgate \u00e0 la proc\u00e9dure locale.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "relativePath": "FW/Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "sha256": "c62bba53a591a488e5e78c436bc42e7d59cc7c6354cf2c58b1162b8fe30e771d"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "relativePath": "Pfsense/Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "sha256": "c62bba53a591a488e5e78c436bc42e7d59cc7c6354cf2c58b1162b8fe30e771d"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Proc\u00e9dure repository pfsense.docx",
          "relativePath": "FW/Proc\u00e9dure repository pfsense.docx",
          "sha256": "06c93503d67ebd65333b4c2c0bd2e7fd6dc958963bd0fed762a50d5931402835"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Proc\u00e9dure repository pfsense.docx",
          "relativePath": "Pfsense/Proc\u00e9dure repository pfsense.docx",
          "sha256": "06c93503d67ebd65333b4c2c0bd2e7fd6dc958963bd0fed762a50d5931402835"
        }
      ],
      "sources": [
        {
          "title": "Netgate - D\u00e9pannage des mises \u00e0 jour",
          "url": "https://docs.netgate.com/pfsense/en/latest/troubleshooting/upgrades.html"
        }
      ]
    },
    {
      "slug": "pfsense-pkg-update",
      "tech": "pfsense",
      "title": "pfSense - Actualiser les m\u00e9tadonn\u00e9es pkg",
      "content": "pkg-static update -f",
      "description": "Forcer le t\u00e9l\u00e9chargement des m\u00e9tadonn\u00e9es du d\u00e9p\u00f4t pour relever les erreurs.",
      "example": "pkg-static update -f",
      "impact": "R\u00e9seau / modification des m\u00e9tadonn\u00e9es",
      "warning": "Ce n'est pas pkg upgrade. V\u00e9rifier branche, DNS, certificats et sauvegarde avant la r\u00e9paration suivante.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "relativePath": "FW/Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "sha256": "c62bba53a591a488e5e78c436bc42e7d59cc7c6354cf2c58b1162b8fe30e771d"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "relativePath": "Pfsense/Proc\u00e9dure Please wait while the update system initializes pfsense.docx",
          "sha256": "c62bba53a591a488e5e78c436bc42e7d59cc7c6354cf2c58b1162b8fe30e771d"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Proc\u00e9dure repository pfsense.docx",
          "relativePath": "FW/Proc\u00e9dure repository pfsense.docx",
          "sha256": "06c93503d67ebd65333b4c2c0bd2e7fd6dc958963bd0fed762a50d5931402835"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Proc\u00e9dure repository pfsense.docx",
          "relativePath": "Pfsense/Proc\u00e9dure repository pfsense.docx",
          "sha256": "06c93503d67ebd65333b4c2c0bd2e7fd6dc958963bd0fed762a50d5931402835"
        }
      ],
      "sources": [
        {
          "title": "Netgate - D\u00e9pannage des mises \u00e0 jour",
          "url": "https://docs.netgate.com/pfsense/en/latest/troubleshooting/upgrades.html"
        }
      ]
    },
    {
      "slug": "pfsense-pkg-directories",
      "tech": "pfsense",
      "title": "pfSense CE - Cr\u00e9er les r\u00e9pertoires de base pkg",
      "content": "/bin/mkdir -p /var/db/pkg/ /root/var/db/pkg/",
      "description": "Assurer la pr\u00e9sence des r\u00e9pertoires pr\u00e9vus par la r\u00e9paration Netgate.",
      "example": "/bin/mkdir -p /var/db/pkg/ /root/var/db/pkg/",
      "impact": "\u00c9criture de r\u00e9pertoires syst\u00e8me",
      "warning": "Seulement dans le parcours confirm\u00e9 d'une base pkg endommag\u00e9e.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "relativePath": "FW/Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "sha256": "174559e3c36b80e8d0ebf5a37cb82e8be5aa4d30abe896b7a2a37582a85af274"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "relativePath": "Pfsense/Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "sha256": "174559e3c36b80e8d0ebf5a37cb82e8be5aa4d30abe896b7a2a37582a85af274"
        }
      ],
      "sources": [
        {
          "title": "Netgate - Base pkg endommag\u00e9e",
          "url": "https://docs.netgate.com/pfsense/en/latest/troubleshooting/pkg-broken-database.html"
        }
      ]
    },
    {
      "slug": "pfsense-pkg-reinstall",
      "tech": "pfsense",
      "title": "pfSense CE - R\u00e9installer les paquets de base et noyau",
      "content": "/usr/local/sbin/pkg-static install -yf pkg pfSense pfSense-kernel-pfSense",
      "description": "R\u00e9installation forc\u00e9e du syst\u00e8me de base dans le parcours CE document\u00e9.",
      "example": "/usr/local/sbin/pkg-static install -yf pkg pfSense pfSense-kernel-pfSense",
      "impact": "R\u00e9installation syst\u00e8me / risque d'indisponibilit\u00e9",
      "warning": "Pas une commande de diagnostic et pas un parcours automatique pfSense Plus. Sauvegarde, version compatible, console et fen\u00eatre de maintenance obligatoires ; -y confirme les changements.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "relativePath": "FW/Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "sha256": "174559e3c36b80e8d0ebf5a37cb82e8be5aa4d30abe896b7a2a37582a85af274"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "relativePath": "Pfsense/Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "sha256": "174559e3c36b80e8d0ebf5a37cb82e8be5aa4d30abe896b7a2a37582a85af274"
        }
      ],
      "sources": [
        {
          "title": "Netgate - Base pkg endommag\u00e9e",
          "url": "https://docs.netgate.com/pfsense/en/latest/troubleshooting/pkg-broken-database.html"
        }
      ]
    },
    {
      "slug": "pfsense-php-refresh",
      "tech": "pfsense",
      "title": "pfSense - Rafra\u00eechir la configuration PHP apr\u00e8s r\u00e9paration",
      "content": "/etc/rc.php_ini_setup",
      "description": "R\u00e9g\u00e9n\u00e9rer les fichiers PHP attendus apr\u00e8s la r\u00e9paration syst\u00e8me.",
      "example": "/etc/rc.php_ini_setup",
      "impact": "\u00c9criture de configuration syst\u00e8me",
      "warning": "Utiliser seulement dans le parcours Netgate adapt\u00e9 \u00e0 la version et \u00e0 l'incident.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\FW\\Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "relativePath": "FW/Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "sha256": "174559e3c36b80e8d0ebf5a37cb82e8be5aa4d30abe896b7a2a37582a85af274"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Pfsense\\Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "relativePath": "Pfsense/Proc\u00e9dure Upgrading pkg failed pfsense.docx",
          "sha256": "174559e3c36b80e8d0ebf5a37cb82e8be5aa4d30abe896b7a2a37582a85af274"
        }
      ],
      "sources": [
        {
          "title": "Netgate - Base pkg endommag\u00e9e",
          "url": "https://docs.netgate.com/pfsense/en/latest/troubleshooting/pkg-broken-database.html"
        }
      ]
    },
    {
      "slug": "outlook-autodiscover-read",
      "tech": "outlook",
      "title": "Outlook - Lire les exclusions Autodiscover",
      "content": "Get-ItemProperty -LiteralPath 'HKCU:\\Software\\Microsoft\\Office\\16.0\\Outlook\\AutoDiscover' -ErrorAction SilentlyContinue\nGet-ItemProperty -LiteralPath 'HKCU:\\Software\\Policies\\Microsoft\\Office\\16.0\\Outlook\\AutoDiscover' -ErrorAction SilentlyContinue",
      "description": "Lire les deux branches sans modifier le registre ; adaptation PowerShell des v\u00e9rifications de la source.",
      "example": "Remplacer 16.0 si la version Office concern\u00e9e utilise un autre chemin ; ex\u00e9cuter dans la session de l'utilisateur affect\u00e9.",
      "impact": "Lecture seule",
      "warning": "Une branche absente n'est pas n\u00e9cessairement une erreur. Une politique de gestion peut imposer ces valeurs.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\autodiscover exchange.docx",
          "relativePath": "Mail/autodiscover exchange.docx",
          "sha256": "a15d39dc1293cbeb23150f88bcb3b1e6af0143fa583eca3ab66728101978171b"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Aforia CLD ajout de compte manuel.docx",
          "relativePath": "Office/Aforia CLD ajout de compte manuel.docx",
          "sha256": "83f406c1537f88069935c35d25828b6d9260dead84287055df19ca8f91f76c05"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Aforia CLD ajout de compte manuel.docx",
          "relativePath": "Office 365/Aforia CLD ajout de compte manuel.docx",
          "sha256": "83f406c1537f88069935c35d25828b6d9260dead84287055df19ca8f91f76c05"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Proc\u00e9dure changement de compte office 365 vers aforia cld.docx",
          "relativePath": "Office/Proc\u00e9dure changement de compte office 365 vers aforia cld.docx",
          "sha256": "f561d0063908310b92bfeee8bff4cdc3ad6a93b30e2fad7bf6e794c13cdab45e"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Proc\u00e9dure changement de compte office 365 vers aforia cld.docx",
          "relativePath": "Office 365/Proc\u00e9dure changement de compte office 365 vers aforia cld.docx",
          "sha256": "f561d0063908310b92bfeee8bff4cdc3ad6a93b30e2fad7bf6e794c13cdab45e"
        }
      ],
      "sources": []
    },
    {
      "slug": "exchange-export-pst",
      "tech": "exchange",
      "title": "Exchange local - Demander un export PST",
      "content": "New-MailboxExportRequest -Mailbox \"<BOITE>\" -FilePath \"\\\\<SERVEUR>\\<PARTAGE>\\<FICHIER>.pst\"",
      "description": "Cr\u00e9er une demande d'export de la bo\u00eete principale vers le partage UNC approuv\u00e9.",
      "example": "New-MailboxExportRequest -Mailbox \"pilote\" -FilePath \"\\\\files.example.test\\exports\\pilote.pst\"",
      "impact": "Export de messages / I/O stockage",
      "warning": "Exchange local uniquement, r\u00f4le Mailbox Import Export et permissions du partage requis. Contenu sensible \u00e0 prot\u00e9ger.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\export mailbox to pst en powershell.docx",
          "relativePath": "Mail/export mailbox to pst en powershell.docx",
          "sha256": "0ca88f40335dc413ca2b05575292bf314ff1b06e17d712635270c8bd3e2e7404"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Proc\u00e9dure Export pst via Powershell Exchange.docx",
          "relativePath": "Mail/Proc\u00e9dure Export pst via Powershell Exchange.docx",
          "sha256": "0c6bf072bbf06fd1d2ee13be268fa3f0440c6d5872d1948e5a13b88689464bc9"
        }
      ],
      "sources": [
        {
          "title": "Microsoft - New-MailboxExportRequest",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/new-mailboxexportrequest"
        }
      ]
    },
    {
      "slug": "exchange-export-archive",
      "tech": "exchange",
      "title": "Exchange local - Demander un export de l'archive",
      "content": "New-MailboxExportRequest -Mailbox \"<BOITE>\" -IsArchive -FilePath \"\\\\<SERVEUR>\\<PARTAGE>\\<FICHIER>.pst\"",
      "description": "Exporter l'archive activ\u00e9e de la bo\u00eete et non sa bo\u00eete principale.",
      "example": "New-MailboxExportRequest -Mailbox \"pilote\" -IsArchive -FilePath \"\\\\files.example.test\\exports\\pilote-archive.pst\"",
      "impact": "Export de messages / I/O stockage",
      "warning": "V\u00e9rifier l'existence de l'archive, les droits, l'espace et l'autorisation d'export.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\export mailbox to pst en powershell.docx",
          "relativePath": "Mail/export mailbox to pst en powershell.docx",
          "sha256": "0ca88f40335dc413ca2b05575292bf314ff1b06e17d712635270c8bd3e2e7404"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Proc\u00e9dure Export pst via Powershell Exchange.docx",
          "relativePath": "Mail/Proc\u00e9dure Export pst via Powershell Exchange.docx",
          "sha256": "0c6bf072bbf06fd1d2ee13be268fa3f0440c6d5872d1948e5a13b88689464bc9"
        }
      ],
      "sources": [
        {
          "title": "Microsoft - New-MailboxExportRequest",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/new-mailboxexportrequest"
        }
      ]
    },
    {
      "slug": "exchange-export-status",
      "tech": "exchange",
      "title": "Exchange local - Lister les exports en cours",
      "content": "Get-MailboxExportRequest -Status InProgress",
      "description": "Lire les demandes d'export encore en cours.",
      "example": "Get-MailboxExportRequest -Status InProgress",
      "impact": "Lecture seule",
      "warning": "Une liste vide ne prouve pas la r\u00e9ussite : v\u00e9rifier aussi les demandes Failed et Completed.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\export mailbox to pst en powershell.docx",
          "relativePath": "Mail/export mailbox to pst en powershell.docx",
          "sha256": "0ca88f40335dc413ca2b05575292bf314ff1b06e17d712635270c8bd3e2e7404"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Proc\u00e9dure Export pst via Powershell Exchange.docx",
          "relativePath": "Mail/Proc\u00e9dure Export pst via Powershell Exchange.docx",
          "sha256": "0c6bf072bbf06fd1d2ee13be268fa3f0440c6d5872d1948e5a13b88689464bc9"
        }
      ],
      "sources": [
        {
          "title": "Microsoft - New-MailboxExportRequest",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/new-mailboxexportrequest"
        }
      ]
    },
    {
      "slug": "exchange-export-statistics",
      "tech": "exchange",
      "title": "Exchange local - Lire les statistiques d'un export",
      "content": "Get-MailboxExportRequest -Mailbox \"<BOITE>\" | Get-MailboxExportRequestStatistics",
      "description": "Lire le statut et la progression des demandes de la bo\u00eete cibl\u00e9e.",
      "example": "Get-MailboxExportRequest -Mailbox \"pilote\" | Get-MailboxExportRequestStatistics",
      "impact": "Lecture seule",
      "warning": "Compl\u00e9ment de suivi au parcours d'export ; conserver le rapport en cas d'erreur.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\export mailbox to pst en powershell.docx",
          "relativePath": "Mail/export mailbox to pst en powershell.docx",
          "sha256": "0ca88f40335dc413ca2b05575292bf314ff1b06e17d712635270c8bd3e2e7404"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Proc\u00e9dure Export pst via Powershell Exchange.docx",
          "relativePath": "Mail/Proc\u00e9dure Export pst via Powershell Exchange.docx",
          "sha256": "0c6bf072bbf06fd1d2ee13be268fa3f0440c6d5872d1948e5a13b88689464bc9"
        }
      ],
      "sources": [
        {
          "title": "Microsoft - New-MailboxExportRequest",
          "url": "https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/new-mailboxexportrequest"
        }
      ]
    },
    {
      "slug": "exchange-snapin",
      "tech": "exchange",
      "title": "Exchange local - Charger le snap-in de gestion",
      "content": "Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn",
      "description": "Charger le composant local fourni par l'installation Exchange concern\u00e9e.",
      "example": "Add-PSSnapin Microsoft.Exchange.Management.PowerShell.SnapIn",
      "impact": "Modification du contexte PowerShell",
      "warning": "Windows PowerShell et Exchange local selon version ; ne remplace pas une session Exchange Online.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Powershell avec module Exchange Management.docx",
          "relativePath": "Mail/Powershell avec module Exchange Management.docx",
          "sha256": "6d9568a6fea53cfe7a41d6a856d54a728525d813be275d8584316b7ae31003b7"
        }
      ],
      "sources": []
    },
    {
      "slug": "cve-outlook-audit",
      "tech": "exchange",
      "title": "Exchange local - Auditer une bo\u00eete pour CVE-2023-23397",
      "content": "Get-Mailbox -Identity \"<BOITE>\" | .\\CVE-2023-23397.ps1 -Environment OnPrem",
      "description": "Ex\u00e9cuter le script Microsoft en audit sur une bo\u00eete pilote plut\u00f4t que tout le parc.",
      "example": "Get-Mailbox -Identity \"pilote@example.test\" | .\\CVE-2023-23397.ps1 -Environment OnPrem",
      "impact": "Audit de messagerie / lecture et exports locaux",
      "warning": "Inspecter la version du script et ses pr\u00e9requis, droits et sorties avant usage. Ne pas ajouter CleanupAction pendant l'audit ; prot\u00e9ger les CSV.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Mail\\Proc\u00e9dure PowerShell faille Outlook CVE.odt",
          "relativePath": "Mail/Proc\u00e9dure PowerShell faille Outlook CVE.odt",
          "sha256": "a6a937899f942b0a98bbb7235faaa5ffd027250bae48926966b5d9e7f9e49318"
        }
      ],
      "sources": [
        {
          "title": "Microsoft CSS-Exchange - CVE-2023-23397",
          "url": "https://microsoft.github.io/CSS-Exchange/Security/CVE-2023-23397/FAQ/"
        }
      ]
    },
    {
      "slug": "office-odt-configure",
      "tech": "m365",
      "title": "Office Deployment Tool - Appliquer un XML valid\u00e9",
      "content": ".\\setup.exe /configure \"<CONFIGURATION_XML>\"",
      "description": "Configurer les produits Office d\u00e9crits par le XML test\u00e9 dans le r\u00e9pertoire ODT.",
      "example": ".\\setup.exe /configure \"configuration-pilote.xml\"",
      "impact": "Installation / modification des applications Office",
      "warning": "Le XML peut installer ou retirer des produits. V\u00e9rifier architecture, canal, licence et actions avant ex\u00e9cution.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Instalation OneNote avec Office 2019.docx",
          "relativePath": "Office/Instalation OneNote avec Office 2019.docx",
          "sha256": "e0e8144ecaee0b6235ae2d4aeb437ebe2a46f816ac0aab0f40b3dedd383d136a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office\\Proc\u00e9dure OneNoteFreeRetail.docx",
          "relativePath": "Office/Proc\u00e9dure OneNoteFreeRetail.docx",
          "sha256": "e0e8144ecaee0b6235ae2d4aeb437ebe2a46f816ac0aab0f40b3dedd383d136a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Instalation OneNote avec Office 2019.docx",
          "relativePath": "Office 365/Instalation OneNote avec Office 2019.docx",
          "sha256": "e0e8144ecaee0b6235ae2d4aeb437ebe2a46f816ac0aab0f40b3dedd383d136a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Proc\u00e9dure OneNoteFreeRetail.docx",
          "relativePath": "Office 365/Proc\u00e9dure OneNoteFreeRetail.docx",
          "sha256": "e0e8144ecaee0b6235ae2d4aeb437ebe2a46f816ac0aab0f40b3dedd383d136a"
        }
      ],
      "sources": []
    },
    {
      "slug": "ad-ou-dn",
      "tech": "ad",
      "title": "AD - Lire le DN d'une OU pour Cloud Sync",
      "content": "Get-ADOrganizationalUnit -Filter 'Name -eq \"<NOM_OU>\"' | Select-Object DistinguishedName",
      "description": "Retrouver le nom distinctif exact d'une OU \u00e0 cibler dans la configuration de synchronisation.",
      "example": "Get-ADOrganizationalUnit -Filter 'Name -eq \"Users_M365\"' | Select-Object DistinguishedName",
      "impact": "Lecture seule",
      "warning": "Plusieurs OU peuvent avoir le m\u00eame nom ; v\u00e9rifier le DN complet et le domaine.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Installation Microsoft entra cloud.docx",
          "relativePath": "Office 365/Installation Microsoft entra cloud.docx",
          "sha256": "8ae3a4fd9c6c052259d453b477f28524b813a563e7dc37ba23f8ac0692a94953"
        }
      ],
      "sources": [
        {
          "title": "Microsoft - Agent Entra Cloud Sync",
          "url": "https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install"
        }
      ]
    },
    {
      "slug": "graph-connect-read",
      "tech": "m365",
      "title": "Microsoft Graph - Ouvrir une session de lecture utilisateurs",
      "content": "Connect-MgGraph -TenantId \"<TENANT_ID>\" -Scopes 'User.Read.All' -ContextScope Process",
      "description": "Authentifier une session d\u00e9l\u00e9gu\u00e9e de lecture pour l'inventaire du tenant.",
      "example": "Connect-MgGraph -TenantId \"00000000-0000-0000-0000-000000000000\" -Scopes 'User.Read.All' -ContextScope Process",
      "impact": "Authentification / consentement de lecture annuaire",
      "warning": "SDK Microsoft Graph requis. Le consentement doit \u00eatre approuv\u00e9 ; v\u00e9rifier tenant et compte. Remplace l'exemple source incorrect de connexion par secret en clair.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Synchronisation office 365 vers AD Local avec CSV.docx",
          "relativePath": "Office 365/Synchronisation office 365 vers AD Local avec CSV.docx",
          "sha256": "bc21c0b9da85dadce75f8a0b120aeeae9fb40f8562bc2106bb0a7dfc4c61f24a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Synchronisation office 365 vers AD Local avec Microsoft Graph.docx",
          "relativePath": "Office 365/Synchronisation office 365 vers AD Local avec Microsoft Graph.docx",
          "sha256": "c4623dbb30fc20020e4143ac3f114e4bf2c81a2d791bc2d483e3abeb37da8c26"
        }
      ],
      "sources": [
        {
          "title": "Microsoft - Connect-MgGraph",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.authentication/connect-mggraph"
        },
        {
          "title": "Microsoft - Agent Entra Cloud Sync",
          "url": "https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install"
        }
      ]
    },
    {
      "slug": "graph-users",
      "tech": "m365",
      "title": "Microsoft Graph - Lire l'inventaire des utilisateurs",
      "content": "Get-MgUser -All -Property Id,DisplayName,UserPrincipalName,OnPremisesSyncEnabled | Select-Object Id,DisplayName,UserPrincipalName,OnPremisesSyncEnabled",
      "description": "Lire l'identit\u00e9 et le statut de synchronisation des utilisateurs apr\u00e8s connexion Graph autoris\u00e9e.",
      "example": "Get-MgUser -All -Property Id,DisplayName,UserPrincipalName,OnPremisesSyncEnabled | Select-Object Id,DisplayName,UserPrincipalName,OnPremisesSyncEnabled",
      "impact": "Lecture d'annuaire / donn\u00e9es personnelles",
      "warning": "Limiter le partage de la sortie et ne pas utiliser cette liste pour cr\u00e9er automatiquement des comptes AD.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Synchronisation office 365 vers AD Local avec CSV.docx",
          "relativePath": "Office 365/Synchronisation office 365 vers AD Local avec CSV.docx",
          "sha256": "bc21c0b9da85dadce75f8a0b120aeeae9fb40f8562bc2106bb0a7dfc4c61f24a"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Office 365\\Synchronisation office 365 vers AD Local avec Microsoft Graph.docx",
          "relativePath": "Office 365/Synchronisation office 365 vers AD Local avec Microsoft Graph.docx",
          "sha256": "c4623dbb30fc20020e4143ac3f114e4bf2c81a2d791bc2d483e3abeb37da8c26"
        }
      ],
      "sources": [
        {
          "title": "Microsoft - Connect-MgGraph",
          "url": "https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.authentication/connect-mggraph"
        },
        {
          "title": "Microsoft - Agent Entra Cloud Sync",
          "url": "https://learn.microsoft.com/en-us/entra/identity/hybrid/cloud-sync/how-to-install"
        }
      ]
    },
    {
      "slug": "pip-qrcode",
      "tech": "logiciel",
      "title": "Python - Installer qrcode avec Pillow",
      "content": "python -m pip install \"qrcode[pil]\"",
      "description": "Installer les biblioth\u00e8ques de g\u00e9n\u00e9ration QR via le pip de l'environnement Python actif.",
      "example": "python -m pip install \"qrcode[pil]\"",
      "impact": "Installation de d\u00e9pendances",
      "warning": "Utiliser un environnement isol\u00e9 et des versions approuv\u00e9es ; v\u00e9rifier l'origine du paquet.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Qr Code\\Installation du module pour g\u00e9n\u00e9rer le QR Code.docx",
          "relativePath": "Qr Code/Installation du module pour g\u00e9n\u00e9rer le QR Code.docx",
          "sha256": "2cfd6e6302f05329dc618caddb7c9f0edea9117ef64cc21f98f476f1f27d1ea7"
        }
      ],
      "sources": []
    },
    {
      "slug": "pip-wifi-qr",
      "tech": "logiciel",
      "title": "Python - Installer wifi_qrcode_generator",
      "content": "python -m pip install wifi_qrcode_generator",
      "description": "Installer la biblioth\u00e8que mentionn\u00e9e pour cr\u00e9er un QR de configuration Wi-Fi.",
      "example": "python -m pip install wifi_qrcode_generator",
      "impact": "Installation de d\u00e9pendances",
      "warning": "V\u00e9rifier provenance et maintenance du paquet. Le QR g\u00e9n\u00e9r\u00e9 peut contenir le mot de passe du r\u00e9seau.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Qr Code\\Installation du module pour g\u00e9n\u00e9rer le QR Code.docx",
          "relativePath": "Qr Code/Installation du module pour g\u00e9n\u00e9rer le QR Code.docx",
          "sha256": "2cfd6e6302f05329dc618caddb7c9f0edea9117ef64cc21f98f476f1f27d1ea7"
        }
      ],
      "sources": []
    },
    {
      "slug": "dns-nslookup",
      "tech": "reseau",
      "title": "DNS - Interroger un nom depuis le client",
      "content": "nslookup <FQDN>",
      "description": "Lire la r\u00e9ponse DNS et le serveur utilis\u00e9 pour le nom concern\u00e9.",
      "example": "nslookup example.test",
      "impact": "Requ\u00eate DNS",
      "warning": "Comparer A et AAAA ainsi que les r\u00e9ponses du DNS interne ; ne pas interpr\u00e9ter une seule ligne comme diagnostic final.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\R\u00e9seau\\probl\u00e8me acc\u00e8s LAN to google.com cause by IPV6.docx",
          "relativePath": "R\u00e9seau/probl\u00e8me acc\u00e8s LAN to google.com cause by IPV6.docx",
          "sha256": "d765d726f4c087e87195041e4dc677dbc80e20d83432e76c8c4b204a58b512f6"
        }
      ],
      "sources": [
        {
          "title": "Netgate - D\u00e9pannage des mises \u00e0 jour",
          "url": "https://docs.netgate.com/pfsense/en/latest/troubleshooting/upgrades.html"
        }
      ]
    },
    {
      "slug": "iperf-server",
      "tech": "reseau",
      "title": "iPerf 2 - D\u00e9marrer un serveur de test",
      "content": "iperf -s",
      "description": "D\u00e9marrer le serveur iPerf v2 sur l'extr\u00e9mit\u00e9 autoris\u00e9e.",
      "example": "iperf -s",
      "impact": "Ouverture d'un service de test",
      "warning": "Restreindre le port aux clients de test puis arr\u00eater le serveur ; ne pas utiliser un client iperf3 face \u00e0 ce serveur.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\R\u00e9seau\\Test de connexion iperf client-serveur.docx",
          "relativePath": "R\u00e9seau/Test de connexion iperf client-serveur.docx",
          "sha256": "3f2abb2ce3c834988cab0cf24df9830fe61f9eee2cdce8e1af5720b936ac189e"
        }
      ],
      "sources": []
    },
    {
      "slug": "iperf-client",
      "tech": "reseau",
      "title": "iPerf 2 - Mesurer le d\u00e9bit vers un serveur",
      "content": "iperf -c <SERVEUR>",
      "description": "Lancer la mesure TCP iPerf v2 vers le serveur de test.",
      "example": "iperf -c 192.0.2.10",
      "impact": "Trafic de charge / saturation possible",
      "warning": "Accord des propri\u00e9taires du lien et cr\u00e9neau de test ; consigner version, sens et dur\u00e9e.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\R\u00e9seau\\Test de connexion iperf client-serveur.docx",
          "relativePath": "R\u00e9seau/Test de connexion iperf client-serveur.docx",
          "sha256": "3f2abb2ce3c834988cab0cf24df9830fe61f9eee2cdce8e1af5720b936ac189e"
        }
      ],
      "sources": []
    },
    {
      "slug": "vcenter-passwd",
      "tech": "vcenter",
      "title": "VCSA - Changer le mot de passe root",
      "content": "passwd root",
      "description": "Changer le mot de passe root depuis le shell autoris\u00e9 de l'appliance ; saisie interactive.",
      "example": "passwd root",
      "impact": "Modification d'acc\u00e8s administrateur",
      "warning": "Acc\u00e8s de secours requis ; tester le nouveau mot de passe et fermer SSH/Bash temporaire. N'affecte pas les comptes SSO.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Vcenter\\Changement de mot de passe root et enlevement expiration vcenter.docx",
          "relativePath": "Vcenter/Changement de mot de passe root et enlevement expiration vcenter.docx",
          "sha256": "ecbde5276fc174a19ad4b026c4912d3bb3c8eba5c9aa94f067ee816248781d67"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Vcenter\\Enlever espiration de mot de passe vc8.docx",
          "relativePath": "Vcenter/Enlever espiration de mot de passe vc8.docx",
          "sha256": "d419e7996d2b99aeddbff6d04d5b7ec261a5c6eb25fecf4ef31d5eb80ae109f8"
        }
      ],
      "sources": []
    },
    {
      "slug": "windows-oem-key",
      "tech": "windows",
      "title": "Windows - Lire la cl\u00e9 OEM depuis le firmware",
      "content": "(Get-CimInstance -ClassName SoftwareLicensingService).OA3xOriginalProductKey",
      "description": "Lire la cl\u00e9 OEM expos\u00e9e, si pr\u00e9sente. Adaptation CIM de wmic path SoftwareLicensingService get OA3xOriginalProductKey.",
      "example": "(Get-CimInstance -ClassName SoftwareLicensingService).OA3xOriginalProductKey",
      "impact": "Lecture d'une information de licence sensible",
      "warning": "Ne pas publier la sortie ni l'enregistrer dans un m\u00e9mo. Une valeur vide est possible pour d'autres modes d'activation.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Windows\\R\u00e9cup\u00e9ration de la cl\u00e9 de Licence Windows.docx",
          "relativePath": "Windows/R\u00e9cup\u00e9ration de la cl\u00e9 de Licence Windows.docx",
          "sha256": "ef5d8a0acbabb6943f852a8901f466499b974cb653f29a91638bc6d9105fb1e5"
        }
      ],
      "sources": []
    },
    {
      "slug": "windows-winver",
      "tech": "windows",
      "title": "Windows - Afficher l'\u00e9dition et le build",
      "content": "winver",
      "description": "Ouvrir la fen\u00eatre d'informations de version.",
      "example": "winver",
      "impact": "Lecture seule / fen\u00eatre d'information",
      "warning": "Relever build et \u00e9dition compl\u00e8tes avant de choisir une proc\u00e9dure.",
      "sourceDocuments": [
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Logiciel\\Concordance Version W 10.docx",
          "relativePath": "Logiciel/Concordance Version W 10.docx",
          "sha256": "2b59aa6c953028fc8f59e9060a0c45dc357fe2bc7abcfcfc5742017f0d3467c6"
        },
        {
          "path": "D:\\Wave\\Technique\\Proc\u00e9dure\\Windows\\Windows 10 Home vers Windows 10 Pro.doc",
          "relativePath": "Windows/Windows 10 Home vers Windows 10 Pro.doc",
          "sha256": "ba048b1fdb37eea24d892cb567954ec8019f23992ee845433f27723a5415cc3e"
        }
      ],
      "sources": []
    }
  ]
};
