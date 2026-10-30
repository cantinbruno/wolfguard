"""The private entry must not paint raw HTML while its CSS is still loading."""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from threading import Thread
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


async def check(url):
    key = json.loads((ROOT / '.local-archive/site-access.json').read_text())['key']
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(reduced_motion='reduce')
        await context.route('**/api/entry', lambda route: route.fulfill(status=204))
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        # Hold either every stylesheet or just the final access-screen styles.
        # Reuse the browser context to cover first load and reload.
        for width, stylesheet in [(1280, '**/*.css*'), (390, '**/browser/access.css*')]:
            release = asyncio.Event()
            requested = asyncio.Event()

            async def hold_css(route):
                requested.set()
                await release.wait()
                await route.continue_()

            await page.set_viewport_size({'width': width, 'height': 850})
            await page.route(stylesheet, hold_css)
            if width == 1280:
                await page.goto(url + '?access=' + key, wait_until='commit')
            else:
                await page.reload(wait_until='commit')
            await asyncio.wait_for(requested.wait(), timeout=15)
            await page.wait_for_function("() => !!document.getElementById('app')")
            try:
                await expect(page.locator('#entry-styles-pending')).to_have_count(1)
                await expect(page.locator('body')).to_have_css('visibility', 'hidden')
                await expect(page.locator('html')).to_have_css('background-color', 'rgb(7, 11, 18)')
                await expect(page.locator('#app')).not_to_be_visible()
                await expect(page.locator('#lock')).not_to_be_visible()
                assert await page.evaluate("() => [...document.querySelectorAll('link[rel=stylesheet]')].some(link => !link.sheet)")
            finally:
                release.set()
            await expect(page.locator('#entry-styles-pending')).to_have_count(0, timeout=15000)
            await expect(page.locator('#keypad button').first).to_be_enabled(timeout=15000)
            await expect(page.locator('#lock')).to_be_visible()
            await expect(page.locator('body')).to_have_css('visibility', 'visible')
            assert await page.evaluate("() => [...document.querySelectorAll('link[rel=stylesheet]')].every(link => !!link.sheet)")
            assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            await page.unroute(stylesheet, hold_css)
        assert not errors, errors
        await browser.close()
    print('PASS: no unstyled page while all CSS or the final stylesheet is delayed; styled keypad appears on desktop and mobile reload without JavaScript errors.')


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT / 'docs')))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        asyncio.run(check(f'http://127.0.0.1:{server.server_port}/'))
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    run()
