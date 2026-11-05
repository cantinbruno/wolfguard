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
        preview=target/'preview';payload=target/'payload'
        subprocess.run([str(exe),'--preview-dir',str(preview)],check=True,timeout=30)
        titles={'connected':'Prêt','connected-after-scan':'Prêt','scanning':'Scan en cours','scanning-unknown':'Scan en cours','completed':'Scan terminé','cancelled':'Scan arrêté','failed':'Échec du scan','remote-preparing':'Ouverture du bureau','remote':'Prise en main active','stopped':'Arrêté'}
        for state in ['pairing','connected','scanning','scanning-unknown','offline','stopped','error','connecting','completed','failed','cancelled','remote-preparing','remote','connected-after-scan']:
            data=(preview/(state+'.png')).read_bytes()
            assert data[:8]==b'\x89PNG\r\n\x1a\n' and len(data)>4000
            width,height=struct.unpack('>II',data[16:24])
            assert 360<=width<=480 and 280<=height<=560
            info=json.loads((preview/(state+'.json')).read_text(encoding='utf8'))
            if state=='pairing':
                assert info['buttons']==['Associer ce poste']
            else:
                assert height<=400
                assert info['buttons']==(['Arrêter la prise en main'] if state in ['remote','remote-preparing'] else ['Démarrer'] if state in ['stopped','error'] else ['Arrêter'])
                assert info['actionEnabled']
                if state in titles:assert info['title']==titles[state]
                if state in ['scanning','scanning-unknown']:
                    assert 'Scan actif en cours' in info['detail']
                    assert info['progressVisible']
                    assert info['indeterminate']==(state=='scanning-unknown')
                if state=='scanning':
                    assert info['progress']==37
                    assert info['progressLabel']=='37 / 100 · 37 %'
                if state=='remote-preparing':assert info['progressVisible'] and info['indeterminate']
                if state=='remote':assert 'souris et le clavier' in info['detail'] and not info['progressVisible']
                if state=='connected-after-scan':assert 'Scan terminé' in info['lastActivity']
                if state=='failed':assert 'échoué' in info['detail']
        subprocess.run([str(exe),'--verify-extraction',str(payload)],check=True,timeout=30)
        assert not (target/'outside-test.txt').exists()
        with ZipFile(ROOT/'app/downloads/WolfGuard-Agent-Windows.zip') as archive:
            for name in archive.namelist():
                if name=='WolfGuard-Agent.exe':assert archive.read(name)==exe.read_bytes()
                else:assert (payload/name).read_bytes()==archive.read(name),name
        assert (payload/'agent/agent.mjs').is_file()
        assert (payload/'server/lib/wolfguard/scan-spec.mjs').is_file()
        node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
        subprocess.run(['powershell.exe','-STA','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',str(ROOT/'tests/agent_lifetime_test.ps1'),'-Executable',str(exe),'-Node',str(node),'-WorkingDirectory',str(target)],check=True,timeout=30)
        subprocess.run([str(node),'--test',str(ROOT/'tests/remote-windows-native.mjs')],check=True,timeout=30)
        subprocess.run([str(node),'--check',str(payload/'agent/agent.mjs')],check=True,timeout=10)
        result=subprocess.run([str(node),str(payload/'agent/agent.mjs'),'--gui'],input='{"type":"shutdown"}\n',env={**os.environ,'LOCALAPPDATA':str(target/'isolated-profile')},capture_output=True,text=True,encoding='utf8',check=True,timeout=10,creationflags=subprocess.CREATE_NO_WINDOW)
        events=[json.loads(line) for line in result.stdout.splitlines()]
        assert events and events[0]['state']=='pairing'
        assert all(event['type']=='state' for event in events)
    assert startup_value()==startup
    assert (credential.stat().st_mtime_ns if credential.exists() else None)==prior
    assert (installed.read_bytes() if installed.exists() else None)==prior_install
    print('PASS: fourteen native states, actual activity, scan progress, remote stop button, last result, safe extraction; no installation, pairing or startup change')

if __name__=='__main__':run()
