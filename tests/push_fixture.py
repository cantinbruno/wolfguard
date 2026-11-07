"""Fake push transport only; retain real browser keys, service worker and signatures."""
import json
from urllib.request import urlopen
from playwright.sync_api import expect

def configure_push(context,origin):
    context.grant_permissions(['notifications'],origin=origin)
    context.add_init_script(r"""(()=>{const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');const subscription=async()=>{const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);const json={endpoint:'https://fcm.googleapis.com/fcm/send/browser-test',expirationTime:null,keys:{p256dh:b64(new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey))),auth:b64(crypto.getRandomValues(new Uint8Array(16)))}};return {toJSON:()=>json}};PushManager.prototype.getSubscription=async()=>null;PushManager.prototype.subscribe=subscription;})();""")

def approve_latest(page,origin,backend):
    expect(page.locator('.web-push-dialog')).to_be_visible(timeout=15000)
    assert page.locator('.app-dialog-input').count()==0
    device=page.evaluate('async()=>(await WolfGuardPhone.read()).id')
    with urlopen(backend+'/__test/push-messages') as response:messages=json.load(response)
    message=[value for value in messages if value.get('type')=='login' and value.get('deviceId')==device][-1]
    approval=page.context.new_page();approval.goto(origin+'/approve.html#request='+message['id']+'&device='+device)
    expect(approval.locator('#phoneApprove')).to_be_visible(timeout=15000);approval.locator('#phoneApprove').click();expect(approval.locator('#phoneStatus')).to_contain_text('Connexion approuvée')
    approval.close();page.bring_to_front();expect(page.locator('#app')).to_be_visible(timeout=20000)
