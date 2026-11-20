#!/bin/sh
# Run in the account that installed WolfGuard. Never request sudo remotely.
set -eu
fail() { printf '%s\n' "$*" >&2; exit 1; }
uid=$(id -u)
[ "$uid" -ne 0 ] || fail 'Ouvre la session utilisateur qui a installé WolfGuard.'
case "$(uname -s)" in
  Linux)
    platform=linux
    target=${WOLFGUARD_AGENT_HOME:-${XDG_CONFIG_HOME:-$HOME/.config}/WolfGuardAgent}
    persistence=$HOME/.config/systemd/user/wolfguard-agent.service
    protection=/etc/systemd/system/wolfguard-protection-$uid.service
    protected_dir=/var/lib/wolfguard-agent/$uid ;;
  Darwin)
    platform=darwin
    target=${WOLFGUARD_AGENT_HOME:-$HOME/Library/Application Support/WolfGuardAgent}
    persistence=$HOME/Library/LaunchAgents/fr.wavetools.wolfguard.agent.plist
    protection=/Library/LaunchDaemons/fr.wavetools.wolfguard.protection.$uid.plist
    protected_dir=/Library/Application\ Support/WolfGuardAgent/$uid ;;
  *) fail 'Système non pris en charge.' ;;
esac
case "$target" in /*/WolfGuardAgent) ;; *) fail 'Dossier personnalisé : désinstallation locale nécessaire.' ;; esac
[ ! -e "$protection" ] && [ ! -L "$protection" ] && [ ! -d "$protected_dir" ] || fail 'Retire d’abord le composant de protection système localement avec les droits administrateur. Aucune suppression effectuée.'
validate_path() {
  ancestor=$1
  while [ "$ancestor" != / ]; do
    [ ! -L "$ancestor" ] || fail 'Désinstallation refusée sur un lien symbolique.'
    ancestor=$(dirname "$ancestor")
  done
}
validate_path "$target"
validate_path "$persistence"
if [ -e "$target" ]; then
  [ -d "$target" ] || fail 'Dossier de l’agent invalide.'
  links=$(find "$target" -type l -print)
  [ -z "$links" ] || fail 'Un dossier de l’agent contient un lien symbolique.'
  foreign=$(find "$target" ! -user "$(id -un)" -print)
  [ -z "$foreign" ] || fail 'Le dossier de l’agent doit appartenir à cet utilisateur.'
fi
if [ -e "$persistence" ]; then
  [ -f "$persistence" ] && grep -F "$target/background-app/" "$persistence" >/dev/null || fail 'Service WolfGuard non reconnu. Aucune suppression effectuée.'
fi
case "${1:-}" in
  --check) exit 0 ;;
  --delay) sleep 5; sh "$0" --check ;;
  '') ;;
  *) fail 'Option de désinstallation inconnue.' ;;
esac
if [ "$platform" = linux ]; then
  if command -v systemctl >/dev/null 2>&1 && systemctl --user show-environment >/dev/null 2>&1; then
    if [ -e "$persistence" ]; then systemctl --user disable --now wolfguard-agent.service; fi
  fi
  if [ -f "$target/background.pid" ]; then
    pid=$(cat "$target/background.pid")
    case "$pid" in ''|*[!0-9]*) fail 'Identifiant du processus invalide.' ;; esac
    if [ "$pid" -gt 1 ] && [ -r "/proc/$pid/cmdline" ]; then
      worker=$(tr '\000' '\n' < "/proc/$pid/cmdline" | grep -F "$target/background-app/" | grep '/agent/agent.mjs$' || true)
      [ -z "$worker" ] || kill "$pid"
    fi
  fi
else
  /bin/launchctl bootout "gui/$uid/fr.wavetools.wolfguard.agent" 2>/dev/null || true
fi
[ ! -e "$persistence" ] || rm -f -- "$persistence"
if [ "$platform" = linux ] && command -v systemctl >/dev/null 2>&1; then systemctl --user daemon-reload 2>/dev/null || true; fi
# Every target has been checked above; never delete the shared parent directory.
[ ! -d "$target" ] || rm -rf -- "$target"
printf '%s\n' 'WolfGuard Agent désinstallé. Révoque aussi son accès depuis la fiche du poste.'
