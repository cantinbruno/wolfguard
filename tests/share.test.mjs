import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {setup} from './endpoint-fixture.mjs';

const plain = value => JSON.parse(JSON.stringify(value));
const crypto$ = vm.runInNewContext(readFileSync(new URL('../app/js/share-crypto.js', import.meta.url), 'utf8') + '\nWolfGuardShare;', {crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob, Uint8Array, JSON, String, Error, RegExp});
const DAY = 86400000;

test('the link encryption round-trips, binds the key to the content and rejects tampering', async () => {
  const payload = {title: 'Serveur', fields: {username: 'admin', password: 'S3cret!é'}};
  const sealed = await crypto$.seal(payload);
  assert.match(sealed.key, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(!sealed.cipher.includes('S3cret'));
  assert.deepEqual(plain(await crypto$.open(sealed.cipher, sealed.key)), payload);
  const other = await crypto$.seal(payload);
  await assert.rejects(crypto$.open(sealed.cipher, other.key), 'another key cannot read it');
  const bytes = Buffer.from(sealed.cipher.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  bytes[bytes.length - 1] ^= 1;
  await assert.rejects(crypto$.open(bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), sealed.key), 'a modified ciphertext is refused');
  const id = 'a'.repeat(32);
  assert.deepEqual(plain(crypto$.parseHash('#' + id + '.' + sealed.key)), {id, key: sealed.key});
  assert.equal(crypto$.parseHash('#' + id + '.short'), null);
  assert.equal(crypto$.parseHash('#nothex.' + sealed.key), null);
  assert.equal(crypto$.link('https://site.test', id, sealed.key), 'https://site.test/share.html#' + id + '.' + sealed.key);
});

test('one-time links: created by a signed-in user, opened once without any account, then gone', async () => {
  const s = await setup();
  try {
    await s.initialize();
    const owner = await s.login('cantin.bruno@gmx.fr', '09876543'), db = s.env.DB.db;
    const sealed = await crypto$.seal({title: 'NAS', fields: {password: 'SHARED-SECRET-VALUE'}});
    const created = await s.api('share/create', {cipher: sealed.cipher, duration: DAY}, owner.token);
    assert.equal(created.status, 200, await created.clone().text());
    const {id, expiresAt} = await created.json();
    assert.match(id, /^[a-f0-9]{32}$/);
    assert.equal(expiresAt, s.clock() + DAY);
    const stored = JSON.stringify(db.prepare('SELECT * FROM shared_secrets').all());
    assert.ok(!stored.includes(id) && !stored.includes('SHARED-SECRET-VALUE') && !stored.includes(sealed.key), 'the server keeps the ciphertext and a hash of the id only');
    // Anyone with the link can read it, without a session.
    const opened = await s.api('share/open', {id});
    assert.equal(opened.status, 200);
    const {cipher} = await opened.json();
    assert.equal(plain(await crypto$.open(cipher, sealed.key)).fields.password, 'SHARED-SECRET-VALUE');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM shared_secrets').get().n, 0, 'the row is deleted when it is opened');
    const again = await s.api('share/open', {id});
    assert.equal(again.status, 404);
    assert.equal((await again.json()).error, 'Ce lien est expiré ou a déjà été utilisé.');
    // The journal records the events, never the content.
    const events = (await (await s.api('logs', undefined, owner.token)).json()).events.map(event => event.kind);
    assert.ok(events.includes('share-created') && events.includes('share-opened'));
    assert.ok(!JSON.stringify(db.prepare('SELECT * FROM app_logs').all()).includes('SHARED-SECRET-VALUE'));
  } finally { s.env.DB.db.close(); }
});

test('links expire, can be revoked by their creator only, and are limited per user', async () => {
  const s = await setup();
  try {
    await s.initialize();
    const owner = await s.login('cantin.bruno@gmx.fr', '09876543');
    const {cipher} = await crypto$.seal({fields: {password: 'x'}});
    const make = async (duration = 3600000) => (await (await s.api('share/create', {cipher, duration}, owner.token)).json());
    const short = await make();
    s.advance(3600001);
    assert.equal((await s.api('share/open', {id: short.id})).status, 404, 'an expired link is refused');
    const revocable = await make(), second = await make();
    assert.equal((await (await s.api('share/revoke', {id: revocable.id}, owner.token)).json()).revoked, true);
    assert.equal((await s.api('share/open', {id: revocable.id})).status, 404);
    assert.equal((await (await s.api('share/revoke', {id: revocable.id}, owner.token)).json()).revoked, false);
    // A member without access to vault secrets cannot create links nor revoke someone else's.
    await s.createMember('share-member@example.test', '12345678', owner.token);
    const member = await s.login('share-member@example.test', '12345678');
    assert.equal((await s.api('share/create', {cipher, duration: DAY}, member.token)).status, 403);
    assert.equal((await s.api('share/revoke', {id: second.id}, member.token)).status, 403);
    assert.equal((await s.api('share/create', {cipher, duration: DAY})).status, 401, 'creation needs a session');
    // Invalid input and the cap of 20 active links.
    for (const bad of [{cipher: 'short', duration: DAY}, {cipher, duration: 5}, {cipher: 'not valid!'.repeat(10), duration: DAY}, {duration: DAY}])assert.equal((await s.api('share/create', bad, owner.token)).status, 400);
    assert.equal((await s.api('share/open', {id: 'zz'})).status, 404);
    assert.equal((await s.api('share/open', {})).status, 404);
    for (let i = 0; i < 19; i++)assert.equal((await s.api('share/create', {cipher, duration: DAY}, owner.token)).status, 200);
    const over = await s.api('share/create', {cipher, duration: DAY}, owner.token);
    assert.equal(over.status, 429);
    assert.match((await over.json()).error, /20 liens/);
  } finally { s.env.DB.db.close(); }
});
