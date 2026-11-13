# Signature reconnue par Windows

Le binaire actuel n'est pas encore signe avec un certificat Authenticode reconnu.
Une signature de paquet ou un certificat autosigne ne remplace pas cette identite.

Il faut un certificat **Code Signing** delivre par une autorite reconnue par Windows,
avec acces a sa cle privee (eventuellement sur un token materiel), ou un service de
signature publique comme [Microsoft Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart).
La validation de l'identite de l'editeur doit etre faite par le titulaire du compte.
Le script ci-dessous utilise un certificat disponible dans le magasin Windows ;
un service distant demande sa propre integration.

Une fois le certificat reconnu installe dans le magasin personnel Windows :

```powershell
Get-ChildItem Cert:\CurrentUser\My,Cert:\LocalMachine\My -CodeSigningCert |
  Select-Object Subject,Thumbprint,NotAfter,HasPrivateKey

powershell -NoProfile -File scripts/sign-agent-windows.ps1 -CertificateThumbprint EMPREINTE_DU_CERTIFICAT
```

Le script verifie la chaine de confiance, signe une copie avec SHA-256 et un
horodatage, puis exige le statut Authenticode `Valid` et le signataire attendu.
Ensuite seulement, il remplace le binaire, actualise son manifeste de compilation
et reconstruit les archives, empreintes et fichiers `docs/`. Il n'importe aucun
certificat racine et n'exporte aucune cle privee. Sans certificat, il s'arrete
avant toute compilation ou modification de fichier.

Verification sans modification :

```powershell
powershell -NoProfile -File scripts/sign-agent-windows.ps1 -Check
```

Apres signature et controles reussis, publier uniquement les fichiers generes
attendus avec un commit, puis `git push origin main`. Le script ne publie pas
automatiquement les autres travaux presents dans le depot.

La signature identifie l'editeur et permet de detecter une alteration du binaire.
Elle ne certifie pas l'absence de faille et ne garantit pas la disparition de tous
les avertissements SmartScreen.

Reference : [Authenticode, Microsoft](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/authenticode).
