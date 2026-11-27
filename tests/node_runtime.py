"""Node.js executable used by the browser tests to start the API fixture."""
import os,shutil
from pathlib import Path

def node_executable():
    # The agent's private runtime wins when it exists, otherwise Node from PATH.
    local=os.environ.get('LOCALAPPDATA')
    if local:
        private=Path(local)/'WolfGuardWeb/runtime/node.exe'
        if private.exists():return private
    found=shutil.which('node')
    if not found:raise RuntimeError('Node.js est introuvable : installe Node.js 22.13 ou plus récent.')
    return Path(found)
