"""Verify the actual Windows executable without installing or pairing it."""
from pathlib import Path
from zipfile import ZipFile
import json,os,struct,subprocess,tempfile

ROOT=Path(__file__).resolve().parents[1]

def run():
    if os.name!='nt':
        print('SKIP: native WPF rendering requires Windows')
        return
    exe=ROOT/'app/downloads/WolfGuard-Agent-Windows.exe'
    cache=ROOT/'.cache';cache.mkdir(exist_ok=True)
    credential=Path(os.environ['LOCALAPPDATA'])/'WolfGuardAgent/credential.dpapi'
    prior=credential.stat().st_mtime_ns if credential.exists() else None
    import winreg
    def startup_value():
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER,r'Software\Microsoft\Windows\CurrentVersion\Run') as key:return winreg.QueryValueEx(key,'WolfGuardAgent')
        except FileNotFoundError:return None
    startup=startup_value()
    with tempfile.TemporaryDirectory(prefix='agent-window-test-',dir=cache) as temporary:
        target=Path(temporary).resolve()
        assert target.is_relative_to(cache.resolve())
        preview=target/'preview';payload=target/'payload'
        subprocess.run([str(exe),'--preview-dir',str(preview)],check=True,timeout=30)
        for state in ['pairing','connected','scanning','offline']:
            data=(preview/(state+'.png')).read_bytes()
            assert data[:8]==b'\x89PNG\r\n\x1a\n' and len(data)>8000
            width,height=struct.unpack('>II',data[16:24])
            assert width==620 and height>=700
        subprocess.run([str(exe),'--verify-extraction',str(payload)],check=True,timeout=30)
        assert not (target/'outside-test.txt').exists()
        with ZipFile(ROOT/'app/downloads/WolfGuard-Agent-Windows.zip') as archive:
            for name in archive.namelist():
                if name=='WolfGuard-Agent.exe':assert archive.read(name)==exe.read_bytes()
                else:assert (payload/name).read_bytes()==archive.read(name),name
        assert (payload/'agent/agent.mjs').is_file()
        assert (payload/'server/lib/wolfguard/scan-spec.mjs').is_file()
        node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
        subprocess.run([str(node),'--check',str(payload/'agent/agent.mjs')],check=True,timeout=10)
        result=subprocess.run([str(node),str(payload/'agent/agent.mjs'),'--gui'],input='{"type":"shutdown"}\n',env={**os.environ,'LOCALAPPDATA':str(target/'isolated-profile')},capture_output=True,text=True,encoding='utf8',check=True,timeout=10,creationflags=subprocess.CREATE_NO_WINDOW)
        events=[json.loads(line) for line in result.stdout.splitlines()]
        assert events and events[0]['state']=='pairing'
        assert all(event['type']=='state' for event in events)
    assert startup_value()==startup
    assert (credential.stat().st_mtime_ns if credential.exists() else None)==prior
    print('PASS: executable Windows reel, logo vectoriel et quatre etats rendus, extraction conforme et chemins malveillants refuses; aucune installation, association ou modification du demarrage automatique')

if __name__=='__main__':run()
