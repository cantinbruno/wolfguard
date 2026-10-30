#!/bin/sh
agent_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec sh "$agent_root/Start-Agent.sh" "$@"
