"""Build the public agent from an explicit source allowlist, without credentials."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import io,sys

ROOT=Path(__file__).resolve().parents[1]
FILES={
    'Start-Agent.ps1':'agent/Start-Agent.ps1',
    'Demarrer-agent.cmd':'agent/Demarrer-agent.cmd',
    'Associer-agent.cmd':'agent/Associer-agent.cmd',
    'Activer-demarrage-auto.cmd':'agent/Activer-demarrage-auto.cmd',
    'Desactiver-demarrage-auto.cmd':'agent/Desactiver-demarrage-auto.cmd',
    'Startup.ps1':'agent/Startup.ps1',
    'LIRE-MOI.txt':'agent/LIRE-MOI.txt',
    'agent/agent.mjs':'agent/agent.mjs',
    'agent/network.mjs':'agent/network.mjs',
    'agent/collect.ps1':'agent/collect.ps1',
    'agent/protect.ps1':'agent/protect.ps1',
    'server/lib/wolfguard/scan-spec.mjs':'server/lib/wolfguard/scan-spec.mjs',
}

def package():
    buffer=io.BytesIO()
    with ZipFile(buffer,'w',compression=ZIP_DEFLATED,compresslevel=9) as archive:
        for target,source in sorted(FILES.items()):
            path=ROOT/source
            if path.is_symlink():raise ValueError('Agent source must not be a symlink')
            data=path.read_text(encoding='utf-8').replace('\r\n','\n')
            encoding='utf-8-sig' if target.endswith('.ps1') else 'utf-8'
            if target.endswith(('.cmd','.ps1','.txt')):data=data.replace('\n','\r\n')
            info=ZipInfo(target,date_time=(2026,1,1,0,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o644<<16
            archive.writestr(info,data.encode(encoding))
    data=buffer.getvalue()
    if '--check' in sys.argv:
        for name in ['app','docs']:
            archive=ROOT/name/'downloads/WolfGuard-Agent-Windows.zip'
            if archive.exists() and archive.read_bytes()!=data:raise ValueError('Archive agent differente des seules sources autorisees : '+name)
        return
    output=ROOT/'app/downloads/WolfGuard-Agent-Windows.zip'
    output.parent.mkdir(parents=True,exist_ok=True)
    if not output.exists() or output.read_bytes()!=data:output.write_bytes(data)
    print('Agent Windows prepare depuis les seuls fichiers source autorises.')

if __name__=='__main__':package()
