"""Headless UI only: every remote uninstall command is intercepted, never executed."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui,ROOT
from shared_workspace_test import API
from site_fixture import open_security

def run():
    with account_ui() as (page, context, origin, errors):
        pairing=page.evaluate("()=>WolfGuardCloud.agentRequest('agents/pair',{})")
        response=page.request.post(context.backend+'/api/agent/enroll',data={'code':pairing['code'],'name':'Poste à retirer','platform':'win32','capabilities':['remote-terminal-v1']})
        assert response.status==200
        agent=response.json()
        response=page.request.post(context.backend+'/api/agent/poll',headers={'Authorization':'Agent '+agent['token']},data={'capabilities':['remote-terminal-v1','auto-update-v1']})
        assert response.status==200
        open_security(page)
        expect(page.locator('#agentsManage')).to_be_visible()
        page.locator('#agentsUninstall').click()
        expect(page.locator('#removalTitle')).to_have_text('Désinstaller un agent')
        expect(page.locator('#removalStart')).to_be_enabled(timeout=15000)
        expect(page.locator('.removal-downloads a')).to_have_count(3)
        expect(page.locator('#wgAgentPair,[data-record-revoke]')).to_have_count(0)
        for width in [1440,640,390,320]:
            page.set_viewport_size({'width':width,'height':900})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            assert page.locator('.agent-removal-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
        page.set_viewport_size({'width':1440,'height':900})
        with page.expect_download() as download:page.locator('.removal-downloads a').first.click()
        assert download.value.suggested_filename=='WolfGuard-Agent-Uninstall.cmd'
        page.locator('#removalStart').click()
        expect(page.locator('#appDialogMessage')).to_contain_text('Poste à retirer')
        page.locator('.app-dialog-cancel').click()
        expect(page.locator('#removalStart')).to_be_enabled()
        calls=[]
        def remote(route):
            path=route.request.url.split('/api/')[1].split('?')[0]
            calls.append(path)
            if path=='remote/start':route.fulfill(json={'id':'fake-uninstall-session'})
            elif path=='remote/session':route.fulfill(json={'status':'active','commands':[{'seq':1,'status':'completed','stdout':'WOLFGUARD_UNINSTALL_READY\n'}] if 'remote/terminal/command' in calls else []})
            else:route.fulfill(json={})
        page.route(API+'/api/remote/**',remote)
        page.locator('#removalStart').click();page.locator('.app-dialog-submit').click()
        expect(page.locator('#removalStatus')).to_contain_text('Désinstallation lancée')
        expect(page.locator('#removalStart')).to_be_disabled()
        assert calls.count('remote/terminal/command')==1
        assert 'remote/stop' in calls
        page.screenshot(path=str(ROOT/'.cache/agent-removal-desktop.png'),animations='disabled')
        page.locator('#closeRemovalBtn').click()
        page.locator('[data-fleet-agent]').first.click()
        page.locator('[data-record-tab=details]').click()
        expect(page.locator('[data-record-revoke]')).to_be_visible()
        page.locator('[data-record-uninstall]').click()
        expect(page.locator('#agentDetailsPanel')).to_be_hidden()
        expect(page.locator('#removalAgent')).to_have_value(agent['id'])
        page.locator('#closeRemovalBtn').click()
        expect(page.locator('#agentDetailsPanel')).to_be_visible()
        assert not errors,errors
        print('PASS: uninstall button, local downloads, confirmation, remote launch, record shortcut and mobile layouts')

if __name__=='__main__':run()
