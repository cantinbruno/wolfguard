"""Parse and collect through the same UTF-8/BOM files shipped to Windows."""
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import os,runpy,subprocess,tempfile,json

ROOT=Path(__file__).resolve().parents[1]

def run():
    if os.name!='nt':
        print('SKIP: Windows PowerShell packaging validation requires Windows')
        return
    package=runpy.run_path(str(ROOT/'scripts/package-agent.py'))
    payload=package['source_archive']();package['validate_windows_scripts'](payload)
    bad=BytesIO()
    with ZipFile(bad,'w',compression=ZIP_DEFLATED) as archive:
        archive.writestr('agent/broken.ps1',"$x='droits de l\u2019agent'".encode('utf-8-sig'))
    try:package['validate_windows_scripts'](bad.getvalue())
    except ValueError as error:assert 'broken.ps1' in str(error)
    else:raise AssertionError('Packaged smart quote syntax regression was accepted')
    with tempfile.TemporaryDirectory(prefix='packaged-powershell-',dir=ROOT/'.cache') as directory:
        with ZipFile(BytesIO(payload)) as archive:
            for entry in archive.infolist():
                if entry.filename.endswith('.ps1'):
                    target=Path(directory)/entry.filename;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(archive.read(entry))
        result=subprocess.run(['powershell.exe','-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',str(Path(directory)/'agent/endpoint.ps1'),'-Operation','collect'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,creationflags=subprocess.CREATE_NO_WINDOW,timeout=35)
        assert result.returncode==0,result.stderr.decode('utf-8',errors='replace')[:1500]
        report=json.loads(result.stdout.decode('utf-8-sig'));assert report['provider']=='WolfGuard Antivirus / ClamAV';assert report['systemMonitor']['scope']=='system';assert isinstance(report['events'],list)
    print('PASS: shipped UTF-8/BOM PowerShell parses, broken smart quotes fail the build, real Windows collection returns valid JSON')

if __name__=='__main__':run()
