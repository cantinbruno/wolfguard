"""Add-only enrollment and confirmed revocation from the machine record."""
import re
from urllib.parse import urlsplit
from playwright.sync_api import expect
from account_ui_fixture import account_ui, ROOT
from shared_workspace_test import API
from site_fixture import open_security


def run():
    with account_ui() as (page, context, origin, errors):
        def enroll(code, name):
            response=page.request.post(context.backend+'/api/agent/enroll',data={'code':code,'name':name,'platform':'win32'})
            assert response.status==200
            return response.json()
        pairing=page.evaluate("()=>WolfGuardCloud.agentRequest('agents/pair',{})")
        existing=enroll(pairing['code'],'Poste existant')
        open_security(page)
        expect(page.locator('[data-fleet-agent]')).to_have_count(1)
        page.locator('#agentsManage').click()
        expect(page.locator('#agentsTitle')).to_have_text('Ajouter un poste')
        expect(page.locator('.enrollment-ticket-note')).to_contain_text('Valable 1 heure')
        expect(page.locator('#wgAgentManage,#wgAgentSelect,[data-agent-revoke],[data-record-revoke],#wgAgentUninstall,[data-agent-tab]')).to_have_count(0)
        page.locator('[data-agent-platform=win32]').click()
        with page.expect_download() as download:
            page.locator('#wgAgentPair').click()
        assert download.value.suggested_filename=='Installer-WolfGuard.cmd'
        expect(page.locator('#wgAgentEnrollmentTitle')).to_have_text('En attente du poste')
        page.locator('.enrollment-advanced > summary').click()
        expect(page.locator('#wgAgentConnectPair')).to_have_attribute('href',re.compile(r'^wolfguard-agent://pair\?code=[a-f0-9]{32}$'))
        code=page.locator('#wgAgentConnectPair').get_attribute('href').split('code=')[1]
        enrolled=enroll(code,'Nouveau poste')
        page.locator('#wgAgentRefresh').click()
        expect(page.locator('#wgAgentEnrollmentTitle')).to_have_text('Nouveau poste est associé',timeout=15000)
        page.locator('#wgAgentViewPosts').click()
        expect(page.locator('#modalRoot .agents-modal')).to_have_count(0)
        expect(page.locator('#agentDetailsPanel')).to_be_visible()
        expect(page.locator('#agentDetailsTitle')).to_have_text('Nouveau poste')
        expect(page.locator('[data-record-revoke]')).not_to_be_visible()
        page.locator('[data-record-tab=details]').click()
        revoke=page.locator('[data-record-revoke]')
        expect(revoke).to_be_visible()
        revoke.click()
        expect(page.locator('#appDialogMessage')).to_contain_text('Nouveau poste')
        page.locator('.app-dialog-cancel').click()
        expect(page.locator('[data-fleet-agent="'+enrolled['id']+'"]').first).to_have_count(1)
        page.route(API+'/api/agents/revoke',lambda route:route.fulfill(status=503,json={'error':'Révocation indisponible'}))
        revoke.click();page.locator('.app-dialog-submit').click()
        expect(page.locator('.agent-record-removal [role=alert]')).to_contain_text('Révocation indisponible')
        expect(revoke).to_be_enabled()
        page.unroute(API+'/api/agents/revoke')
        page.locator('#agentDetailsBody').screenshot(path=str(ROOT/'.cache/post-record-revocation.png'),animations='disabled')
        revoke.click();page.locator('.app-dialog-submit').click()
        expect(page.locator('#agentDetailsPanel')).to_be_hidden()
        expect(page.locator('[data-fleet-agent="'+enrolled['id']+'"]').first).to_have_count(0)
        expect(page.locator('[data-fleet-agent="'+existing['id']+'"]').first).to_have_count(1)
        response=page.request.post(context.backend+'/api/agent/poll',headers={'Authorization':'Agent '+enrolled['token']},data={})
        assert response.status==401

        page.locator('#agentsManage').click()
        for width in [1440,900,640,390,320]:
            page.set_viewport_size({'width':width,'height':900 if width>640 else 844})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            assert page.locator('.agent-enrollment-modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1'),width
            if width in [1440,390]:page.screenshot(path=str(ROOT/f'.cache/add-post-{width}.png'),animations='disabled')
        page.set_viewport_size({'width':1440,'height':900})
        page.locator('[data-agent-platform=linux]').click()
        page.locator('#wgAgentShare').click()
        expect(page.locator('#wgAgentShareLink')).to_be_visible()
        url=page.locator('#wgAgentShareURL').input_value()
        assert urlsplit(url).path=='/agent-download.html' and 'platform=linux' in urlsplit(url).fragment
        assert page.evaluate("url=>{const expires=Number(new URLSearchParams(new URL(url).hash.slice(1)).get('expires'));return expires-Date.now()>59*60*1000&&expires-Date.now()<=60*60*1000}",url)
        page.evaluate('copyText=async value=>{window.__copiedEnrollment=value;return true}')
        page.locator('#wgAgentShareCopy').click()
        expect(page.locator('#wgAgentSetupStatus')).to_contain_text('copié')
        assert page.evaluate('window.__copiedEnrollment')==url
        page.evaluate('window.__enrollmentNow=Date.now;Date.now=()=>window.__enrollmentNow()+3601000')
        try:
            expect(page.locator('#wgAgentShareLink')).to_be_hidden(timeout=10000)
            expect(page.locator('#wgAgentEnrollmentTitle')).to_contain_text('expiré')
        finally:page.evaluate('Date.now=window.__enrollmentNow;delete window.__enrollmentNow')
        page.keyboard.press('Escape')
        expect(page.locator('#agentsManage')).to_be_focused()
        assert not errors,errors
    print('PASS: add-only dialog, installer, share link, association, machine record, confirmed revocation, retry, token invalidation and 320px layout')


if __name__=='__main__':run()
