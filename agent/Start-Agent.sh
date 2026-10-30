#!/bin/sh
set -eu
umask 077
agent_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
system=$(uname -s)
case "$system" in
  Linux) agent_config="${XDG_CONFIG_HOME:-$HOME/.config}/WolfGuardAgent"; node_system=linux ;;
  Darwin) agent_config="$HOME/Library/Application Support/WolfGuardAgent"; node_system=darwin ;;
  *) printf '%s\n' 'Ce lanceur prend en charge Linux et macOS.' >&2; exit 1 ;;
esac
case "$agent_config" in /*) ;; *) printf '%s\n' 'Le dossier de configuration doit être absolu.' >&2; exit 1 ;; esac
if command -v node >/dev/null 2>&1 && node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
  exec node "$agent_root/agent/agent.mjs" "$@"
fi
case "$(uname -m)" in
  x86_64|amd64) architecture=x64 ;;
  arm64|aarch64) architecture=arm64 ;;
  *) printf '%s\n' 'Installe Node.js 22 ou supérieur pour cette architecture, puis relance l’agent.' >&2; exit 1 ;;
esac
version=v22.23.4
case "$node_system-$architecture" in
  linux-x64) checksum=b8492284c76a54baf58d61668dd0e41ee0fc98adabf9503d30f05d08f55b4406 ;;
  linux-arm64) checksum=f7a1e486dbc8b286847815b477d4fb5e9fb963ed4489c3e1588853d685f589f9 ;;
  darwin-x64) checksum=efcc2b0db6f94bf53eddb038fe2b370277a042bd29e4f19b8f8e23598795b819 ;;
  darwin-arm64) checksum=c9e1dbc748b33ed2d14f42445191ecaf14c56259c7a9a26d0042c49ec2b66428 ;;
esac
runtime="$agent_config/runtime"
engine="node-$version-$node_system-$architecture"
if [ ! -x "$runtime/$engine/bin/node" ]; then
  printf '%s\n' 'Préparation du moteur depuis nodejs.org…'
  mkdir -p "$runtime"
  temporary=$(mktemp -d "$runtime/.download.XXXXXXXX")
  trap 'rm -f "$temporary/runtime.tar.gz"; rmdir "$temporary" 2>/dev/null || true' EXIT HUP INT TERM
  curl --fail --location --proto '=https' --tlsv1.2 --connect-timeout 15 --max-time 300 "https://nodejs.org/dist/$version/$engine.tar.gz" -o "$temporary/runtime.tar.gz"
  if command -v sha256sum >/dev/null 2>&1; then actual=$(sha256sum "$temporary/runtime.tar.gz" | cut -d ' ' -f 1)
  else actual=$(shasum -a 256 "$temporary/runtime.tar.gz" | cut -d ' ' -f 1); fi
  if [ "$actual" != "$checksum" ]; then printf '%s\n' 'Empreinte du moteur invalide. Installation arrêtée.' >&2; exit 1; fi
  tar -xzf "$temporary/runtime.tar.gz" -C "$runtime"
  rm -f "$temporary/runtime.tar.gz"
  rmdir "$temporary"
  trap - EXIT HUP INT TERM
fi
exec "$runtime/$engine/bin/node" "$agent_root/agent/agent.mjs" "$@"
