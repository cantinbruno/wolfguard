"""Real file transfers through the headless UI, real API and disposable agent."""
from pathlib import Path
from tempfile import TemporaryDirectory
import json,os,subprocess,zipfile
from playwright.sync_api import expect
from account_ui_fixture import account_ui,ROOT

def run():
    with TemporaryDirectory(prefix='browser-file-transfer-',dir=ROOT/'.cache') as directory:
        base=Path(directory).resolve();assert base.is_relative_to((ROOT/'.cache').resolve())
        remote=base/'remote';remote.mkdir();source=base/'source';source.mkdir();(source/'arrive.txt').write_text('Envoi privé éè',encoding='utf-8')
        tree=source/'Mon dossier';(tree/'sous-dossier').mkdir(parents=True);(tree/'sous-dossier'/'été.txt').write_text('Dossier transféré',encoding='utf-8')
        with account_ui() as (page,context,origin,errors):
            code=page.evaluate("async()=>(await WolfGuardCloud.agentRequest('agents/pair',{})).code")
            node=Path(os.environ['LOCALAPPDATA'])/'WolfGuardWeb/runtime/node.exe'
            agent=subprocess.Popen([str(node),str(ROOT/'tests/files-agent-runner.mjs')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
            agent.stdin.write(json.dumps({'backend':context.backend,'code':code,'root':str(remote)}));agent.stdin.close();assert agent.stdout.readline().strip()=='ready'
            try:
                page.locator('.workspace-section-button[data-section=remote]').click();page.wait_for_function('()=>!sectionTransition.active');expect(page.locator('#wgRemoteAgent')).to_contain_text('synthétique',timeout=15000)
                page.locator('#wgRemoteModeFiles').click();expect(page.locator('#wgRemoteConnect')).to_be_enabled(timeout=15000);page.locator('#wgRemoteConnect').click();expect(page.locator('#wgFilesPath')).to_have_text(str(remote),timeout=15000)
                expect(page.locator('#wgFilesUpload')).to_be_enabled();page.locator('#wgFilesUpload').set_input_files(source/'arrive.txt');page.locator('#wgFilesUploadSend').click();expect(page.locator('#wgFilesStatus')).to_contain_text('envoyé',timeout=20000);assert (remote/'arrive.txt').read_text(encoding='utf-8')=='Envoi privé éè'
                page.locator('.remote-files>label input').set_input_files(tree);expect(page.locator('#wgFilesStatus')).to_contain_text('envoyé',timeout=20000);expect(page.locator('.remote-file-row')).to_have_count(2);assert (remote/'Mon dossier'/'sous-dossier'/'été.txt').read_text(encoding='utf-8')=='Dossier transféré'
                row=page.locator('.remote-file-row').filter(has_text='arrive.txt')
                with page.expect_download() as download:row.locator('[data-file-download]').click()
                assert Path(download.value.path()).read_text(encoding='utf-8')=='Envoi privé éè'
                row=page.locator('.remote-file-row').filter(has_text='Mon dossier')
                with page.expect_download() as download:row.locator('[data-file-download]').click()
                with zipfile.ZipFile(download.value.path()) as archive:assert archive.testzip() is None;assert archive.read('Mon dossier/sous-dossier/été.txt').decode()=='Dossier transféré'
                for width in [1440,390,320]:
                    page.set_viewport_size({'width':width,'height':1000 if width>640 else 844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.screenshot(path=str(ROOT/'.cache/current-files-mobile.png'),animations='disabled')
                page.locator('#wgRemoteDisconnect').click();expect(page.locator('#wgRemoteSession')).to_be_hidden();assert not errors,errors
            finally:agent.terminate();agent.wait(timeout=10)
    print('PASS: real headless file/folder upload, file download, valid directory ZIP, unicode, mobile layout and disconnect')

if __name__=='__main__':run()
