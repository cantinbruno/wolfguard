"""Verify extraction and the JSON worker without installing or pairing it."""
from pathlib import Path
from zipfile import ZipFile
import json,os,struct,subprocess,tempfile

ROOT=Path(__file__).resolve().parents[1]

def run():
    if os.name!='nt':
        print('SKIP: native executable extraction requires Windows')
        return
    exe=ROOT/'app/downloads/WolfGuard-Agent-Windows.exe'
    cache=ROOT/'.cache';cache.mkdir(exist_ok=True)
    credential=Path(os.environ['LOCALAPPDATA'])/'WolfGuardAgent/credential.dpapi'
    prior=credential.stat().st_mtime_ns if credential.exists() else None
    installed=Path(os.environ['LOCALAPPDATA'])/'WolfGuardAgent/WolfGuard-Agent.exe'
    prior_install=installed.read_bytes() if installed.exists() else None
    import winreg
    def startup_value():
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER,r'Software\Microsoft\Windows\CurrentVersion\Run') as key:return winreg.QueryValueEx(key,'WolfGuardAgent')
        except FileNotFoundError:return None
    startup=startup_value()
    with tempfile.TemporaryDirectory(prefix='agent-window-test-',dir=cache) as temporary:
        target=Path(temporary).resolve()
        assert target.is_relative_to(cache.resolve())
        payload=target/'payload'
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
        result=subprocess.run([str(node),str(payload/'agent/agent.mjs'),'--gui'],input='{"type":"shutdown"}\n',env={**os.environ,'WOLFGUARD_AGENT_HOME':str(target/'isolated-profile')},capture_output=True,text=True,encoding='utf8',check=True,timeout=10,creationflags=subprocess.CREATE_NO_WINDOW)
        events=[json.loads(line) for line in result.stdout.splitlines()]
        assert events and events[0]['state']=='pairing'
        assert all(event['type']=='state' for event in events)
    assert startup_value()==startup
    assert (credential.stat().st_mtime_ns if credential.exists() else None)==prior
    assert (installed.read_bytes() if installed.exists() else None)==prior_install
    print('PASS: safe extraction, headless JSON worker shutdown; no installation, pairing or startup change')

if __name__=='__main__':run()
