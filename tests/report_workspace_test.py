"""Headless report acceptance with disposable accounts, data and agents."""
from playwright.sync_api import expect
from account_ui_fixture import account_ui
from site_fixture import open_security


def run():
    with account_ui() as (page, context, origin, errors):
        page.locator('#settingsBtn').click()
        page.locator('#settings-tab-account').click()
        expect(page.locator('#settings-account')).to_contain_text('cantin.bruno@gmx.fr')
        page.locator('#accountStorageBtn').click()
        expect(page.locator('#settingsStorageUsage')).to_contain_text('Répartition de tous les comptes', timeout=15000)
        page.locator('#settings-tab-interface').click()
        page.locator('#interface-theme').select_option('contrast')
        page.locator('#interface-density').select_option('compact')
        page.locator('#interface-text').select_option('120')
        page.locator('#interface-motion').select_option('reduced')
        expect(page.locator('html')).to_have_attribute('data-ui-theme', 'contrast')
        page.locator('#settings-tab-security').click()
        page.locator('#changeCodeBtn').click()
        expect(page.locator('#personalCodeForm')).to_be_visible()
        page.locator('#newAccessCode').fill('12345678')
        page.locator('#webCancelPassword').click()
        expect(page.locator('#personalCodeForm')).to_have_count(0)
        page.locator('#settings-tab-groups').click()
        expect(page.locator('#wgGroupsList')).to_contain_text('GG_Acces_Donnees_des_espaces_lecture')
        page.locator('#wgGroupCategory').select_option('admin')
        expect(page.locator('[data-access-group]')).to_have_count(1)
        for width in [1440, 850, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 950})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.locator('.settings-close').click()
        page.evaluate("openById('team-note')")
        expect(page.locator('.reader-rich-content')).to_have_css('font-size', '18px')
        open_security(page)
        expect(page.locator('#agentsGroupCreate')).to_be_enabled()
        expect(page.locator('#agentsMetrics')).to_have_count(0)
        page.locator('#agentsGroupCreate').click()
        page.locator('.app-dialog-input').fill('Rapport atelier')
        page.locator('.app-dialog-submit').click()
        section = page.locator('[data-agent-group]').filter(has_text='Rapport atelier')
        expect(section).to_be_visible()
        section.locator('[data-group-toggle]').click(button='right')
        page.locator('[data-section-action=color]').click()
        page.locator('[data-section-color="#77d6b0"]').click()
        page.locator('.app-dialog button[value=save]').click()
        expect(section).to_have_attribute('style', '--section-color:#77d6b0')
        page.locator('#agentsRefresh').click()
        expect(section).to_have_attribute('style', '--section-color:#77d6b0')
        page.locator('#agentsReports').click()
        expect(page.locator('#agentsReportsPanel')).to_be_visible()
        expect(page.locator('.scan-history-intro')).to_contain_text('30 jours')
        page.locator('#agentsReportsClose').click()
        page.reload()
        expect(page.locator('#app')).to_be_visible(timeout=20000)
        expect(page.locator('html')).to_have_attribute('data-ui-theme', 'contrast')
        open_security(page)
        expect(section).to_have_attribute('style', '--section-color:#77d6b0')
        section.locator('[data-group-toggle]').click(button='right')
        page.locator('[data-section-action=rename]').click()
        page.locator('.app-dialog-input').fill('Rapport renommé')
        page.locator('.app-dialog-submit').click()
        expect(page.locator('[data-agent-group]').filter(has_text='Rapport renommé')).to_be_visible()
        assert not errors, errors
    print('PASS: account, storage, customization, code cancellation, group filters, section colors, persistence and central reports')


if __name__ == '__main__':
    run()
