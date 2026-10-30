"""Build the public agent from an explicit source allowlist, without credentials."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib,io,json,os,struct,subprocess,sys

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
    'agent/posix.mjs':'agent/posix.mjs',
    'agent/collect.ps1':'agent/collect.ps1',
    'agent/security.ps1':'agent/security.ps1',
    'agent/security-rules.mjs':'agent/security-rules.mjs',
    'agent/protect.ps1':'agent/protect.ps1',
    'server/lib/wolfguard/scan-spec.mjs':'server/lib/wolfguard/scan-spec.mjs',
}

EXE=ROOT/'app/downloads/WolfGuard-Agent-Windows.exe'
MANIFEST=ROOT/'agent/windows-build.json'
POSIX_FILES={key:value for key,value in FILES.items() if key in ['agent/agent.mjs','agent/network.mjs','agent/posix.mjs','agent/security-rules.mjs','server/lib/wolfguard/scan-spec.mjs']}
POSIX_FILES.update({'Start-Agent.sh':'agent/Start-Agent.sh','Start-Agent.command':'agent/Start-Agent.command','LIRE-MOI.txt':'agent/LIRE-MOI-POSIX.txt'})

def source_archive(files=FILES):
    buffer=io.BytesIO()
    with ZipFile(buffer,'w',compression=ZIP_DEFLATED,compresslevel=9) as archive:
        for target,source in sorted(files.items()):
            path=ROOT/source
            if path.is_symlink():raise ValueError('Agent source must not be a symlink')
            data=path.read_text(encoding='utf-8').replace('\r\n','\n')
            encoding='utf-8-sig' if target.endswith('.ps1') else 'utf-8'
            if target.endswith(('.cmd','.ps1','.txt')):data=data.replace('\n','\r\n')
            info=ZipInfo(target,date_time=(2026,1,1,0,0,0));info.compress_type=ZIP_DEFLATED;info.create_system=3;info.external_attr=(0o755 if target.endswith(('.sh','.command')) else 0o644)<<16
            archive.writestr(info,data.encode(encoding))
    return buffer.getvalue()

def executable(payload,check=False):
    digest=hashlib.sha256(payload)
    for name in ['agent/AgentWindow.cs','agent/windows.manifest','app/images/logo-loup.svg','scripts/package-agent.py']:
        digest.update(name.encode());digest.update((ROOT/name).read_text(encoding='utf8').replace('\r\n','\n').encode())
    source_hash=digest.hexdigest()
    recorded=json.loads(MANIFEST.read_text(encoding='utf8')) if MANIFEST.exists() else {}
    current=EXE.read_bytes() if EXE.exists() else b''
    valid=recorded.get('sourceSha256')==source_hash and recorded.get('exeSha256')==hashlib.sha256(current).hexdigest() and current.startswith(b'MZ')
    if not valid:
        if check:raise ValueError('Executable agent non conforme aux sources autorisees')
        framework=Path(os.environ.get('WINDIR','C:/Windows'))/'Microsoft.NET/Framework64/v4.0.30319'
        compiler=framework/'csc.exe'
        if not compiler.is_file():raise ValueError('Recompiler l agent graphique sur Windows avec le compilateur .NET Framework.')
        cache=ROOT/'.cache/agent-build';cache.mkdir(parents=True,exist_ok=True)
        archive=cache/'payload.zip';archive.write_bytes(payload)
        generated=cache/'BuildInfo.cs'
        generated.write_text('namespace WolfGuard { internal static class BuildInfo { internal const string PayloadHash = "'+hashlib.sha256(payload).hexdigest()+'"; } }',encoding='utf8')
        output=cache/'WolfGuard-Agent.exe'
        references=[framework/'System.dll',framework/'System.Core.dll',framework/'Microsoft.CSharp.dll',framework/'System.Xml.dll',framework/'System.Web.Extensions.dll',framework/'System.IO.Compression.dll',framework/'System.IO.Compression.FileSystem.dll',framework/'WindowsBase.dll',framework/'WPF/PresentationCore.dll',framework/'WPF/PresentationFramework.dll',framework/'WPF/System.Xaml.dll']
        # System.Xaml lives beside WindowsBase on some Windows installations.
        references=[next((candidate for candidate in [p,framework/p.name,framework/'WPF'/p.name] if candidate.exists()),p) for p in references]
        command=[str(compiler),'/nologo','/target:winexe','/platform:x64','/optimize+','/debug-','/out:'+str(output),'/win32manifest:'+str(ROOT/'agent/windows.manifest'),'/resource:'+str(archive)+',WolfGuard.Payload.zip','/resource:'+str(ROOT/'app/images/logo-loup.svg')+',WolfGuard.Logo.svg']+['/reference:'+str(p) for p in references]+[str(ROOT/'agent/AgentWindow.cs'),str(generated)]
        subprocess.run(command,check=True,cwd=ROOT)
        png=cache/'logo.png';subprocess.run([str(output),'--render-logo',str(png)],check=True,cwd=ROOT,timeout=30)
        image=png.read_bytes();icon=cache/'logo.ico'
        icon.write_bytes(struct.pack('<HHH',0,1,1)+struct.pack('<BBBBHHII',0,0,0,0,1,32,len(image),22)+image)
        subprocess.run(command[:-2]+['/win32icon:'+str(icon)]+command[-2:],check=True,cwd=ROOT)
        current=output.read_bytes();EXE.parent.mkdir(parents=True,exist_ok=True);EXE.write_bytes(current)
        MANIFEST.write_text(json.dumps({'format':'wolfguard-agent-build','version':2,'sourceSha256':source_hash,'exeSha256':hashlib.sha256(current).hexdigest(),'payloadSha256':hashlib.sha256(payload).hexdigest()},indent=2)+'\n',encoding='utf8')
    if check:
        published=ROOT/'docs/downloads/WolfGuard-Agent-Windows.exe'
        if published.exists() and published.read_bytes()!=current:raise ValueError('Executable publie different de la compilation verifiee')
    return current

def package():
    payload=source_archive()
    binary=executable(payload,'--check' in sys.argv)
    buffer=io.BytesIO()
    with ZipFile(io.BytesIO(payload)) as source,ZipFile(buffer,'w',compression=ZIP_DEFLATED,compresslevel=9) as archive:
        for info in source.infolist():archive.writestr(info,source.read(info))
        info=ZipInfo('WolfGuard-Agent.exe',date_time=(2026,1,1,0,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o644<<16
        archive.writestr(info,binary)
    data=buffer.getvalue()
    packages={'WolfGuard-Agent-Windows.zip':data,'WolfGuard-Agent-Linux.zip':source_archive(POSIX_FILES),'WolfGuard-Agent-macOS.zip':source_archive(POSIX_FILES)}
    if '--check' in sys.argv:
        for name in ['app','docs']:
            for filename,payload in packages.items():
                archive=ROOT/name/'downloads'/filename
                if not archive.exists() or archive.read_bytes()!=payload:raise ValueError('Archive agent differente des seules sources autorisees : '+name+'/'+filename)
        return
    for filename,payload in packages.items():
        output=ROOT/'app/downloads'/filename
        output.parent.mkdir(parents=True,exist_ok=True)
        if not output.exists() or output.read_bytes()!=payload:output.write_bytes(payload)
    print('Agent Windows, Linux et macOS prepare depuis les seuls fichiers source autorises.')

if __name__=='__main__':package()
