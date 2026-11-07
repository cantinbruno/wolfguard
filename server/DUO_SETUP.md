# Notifications d’authentification avec Duo Mobile

Le push du navigateur est retiré de l’interface WolfGuard. En production,
`MFA_BROWSER_PUSH_ENABLED=0` désactive également ses anciens points d’accès.
Les codes Authenticator et de récupération existants restent valables.

## Configuration par le propriétaire

1. Créer un compte administrateur sur https://signup.duo.com/.
   Duo Free prend en charge jusqu’à 10 utilisateurs ; voir
   https://duo.com/editions-and-pricing et https://duo.com/docs/duoweb.
2. Ajouter une application **Web SDK**, avec **Universal Prompt** activé.
3. Ajouter cette adresse de retour, également affichée dans WolfGuard :
   `https://wolfguard-web-cantin.cantin-bruno.chatgpt.site/api/duo/callback`.
4. Ajouter les utilisateurs avec les mêmes adresses e-mail que dans WolfGuard.
   Activer leur téléphone dans **Duo Mobile** à travers l’inscription Duo.
   Le QR code TOTP WolfGuard ne remplace pas cette activation Duo.
5. Exiger la MFA dans les règles de l’application Duo. Désactiver les règles
   de contournement pour les utilisateurs inconnus ou non inscrits.
6. Dans **WolfGuard → Paramètres → Sécurité → Configurer Duo Mobile**, saisir
   l’API hostname, le Client ID et le Client secret de l’application Web SDK.
   Confirmer avec le code personnel et un code Authenticator ou de récupération.
   Ces identifiants se saisissent dans WolfGuard, jamais dans une conversation.
7. Cliquer sur **Vérifier et enregistrer Duo**. Un contrôle serveur vérifie
   les identifiants avant de remplacer la configuration. Tester ensuite une
   connexion et l’approbation sur le téléphone.

La première ouverture du portail peut proposer l’activation de Duo Mobile.
Le service et le téléphone doivent être configurés pour recevoir effectivement
les notifications. Installer l’application seule ne suffit pas.

## Connexions et sécurité

Après vérification du code personnel, WolfGuard propose d’ouvrir Duo dans une
fenêtre séparée. Le serveur confirme le résultat signé avant de délivrer la
session. Fermer la fenêtre, une simple redirection ou un contournement Duo ne
valident pas la connexion. Le code Authenticator reste une solution de secours
explicite, y compris si le service Duo est indisponible.

Les secrets Duo sont chiffrés côté serveur et ne sont jamais renvoyés par l’API.
Les demandes expirent après cinq minutes, sont liées au compte, à sa version,
au secret de secours et à la configuration, et ne sont consommables qu’une fois.
La validation suit l’API officielle : https://duo.com/docs/oauthapi.

Le test `python tests/duo_mobile_test.py` utilise un service Duo simulé avec
des JWT réellement signés. La réception sur un téléphone réel nécessite le
compte Duo, ses identifiants et l’activation de Duo Mobile par son utilisateur.
