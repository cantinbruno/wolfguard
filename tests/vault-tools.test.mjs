import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app/js/views/vault-tools.js', import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const tools = vm.runInNewContext(source + '\nWolfGuardVaultTools;', {crypto: globalThis.crypto, TextEncoder, URL, BigInt, DataView, ArrayBuffer, Uint8Array, Math, Number, String, Set, Object, Array, Error, Date, RegExp, JSON, fetch: undefined, globalThis: {fetch: undefined}});

// RFC 6238 appendix B secrets, encoded in Base32.
const B32 = {
  SHA1: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
  SHA256: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA',
  SHA512: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNA'
};

test('TOTP codes match the RFC 6238 test vectors for SHA-1, SHA-256 and SHA-512', async () => {
  const vectors = [[59, {SHA1: '94287082', SHA256: '46119246', SHA512: '90693936'}], [1111111109, {SHA1: '07081804', SHA256: '68084774', SHA512: '25091201'}], [20000000000, {SHA1: '65353130', SHA256: '77737706', SHA512: '47863826'}]];
  for (const [seconds, expected] of vectors) {
    for (const algorithm of ['SHA1', 'SHA256', 'SHA512']) {
      const config = tools.parseTotp('otpauth://totp/Test?secret=' + B32[algorithm] + '&digits=8&algorithm=' + algorithm);
      assert.ok(config, algorithm);
      assert.equal((await tools.totpCode(config, seconds * 1000)).code, expected[algorithm], algorithm + ' at ' + seconds);
    }
  }
  const config = tools.parseTotp(B32.SHA1), result = await tools.totpCode(config, 59000);
  assert.equal(result.code, '287082');
  assert.equal(result.remaining, 1);
  assert.equal(result.period, 30);
});

test('TOTP input is validated: Base32 secrets, otpauth links, digits and period', () => {
  assert.equal(tools.parseTotp(''), null);
  assert.equal(tools.parseTotp('not base32 !!'), null);
  assert.equal(tools.parseTotp('ABCD'), null, 'secret too short');
  assert.equal(tools.parseTotp('otpauth://hotp/X?secret=' + B32.SHA1), null);
  assert.equal(tools.parseTotp('otpauth://totp/X?secret=' + B32.SHA1 + '&digits=9'), null);
  assert.equal(tools.parseTotp('otpauth://totp/X?secret=' + B32.SHA1 + '&period=0'), null);
  assert.equal(tools.parseTotp('otpauth://totp/X?secret=' + B32.SHA1 + '&algorithm=MD5'), null);
  const spaced = tools.parseTotp('gezd gnbv gy3t qojq gezd gnbv gy3t qojq');
  assert.equal(spaced.digits, 6);
  const link = tools.parseTotp('otpauth://totp/Service:alice%40example.test?secret=' + B32.SHA1 + '&issuer=Service');
  assert.equal(link.issuer, 'Service');
  assert.equal(link.label, 'Service:alice@example.test');
});

test('strength estimate separates weak, common and strong passwords', () => {
  const score = value => tools.passwordStrength(value).score;
  assert.equal(tools.passwordStrength('').empty, true);
  assert.equal(score('password'), 0);
  assert.equal(score('Azerty123'), 0);
  assert.equal(score('12345678'), 0);
  assert.equal(score('aaaaaaaaaaaa'), 0);
  assert.ok(score('Soleil2024') <= 2);
  assert.ok(score('k7#Vq2!mR9zL') >= 3);
  assert.equal(score('xK9$mQ2#vL8@pR4&nT6!wB'), 4);
  assert.ok(tools.passwordStrength('abcdefghijkl').bits < tools.passwordStrength('aXbYcZdWeVfU').bits, 'sequences count for less than mixed characters');
});

test('breach check sends only five hash characters and reads the count from the matching suffix', async () => {
  assert.equal(await tools.sha1Hex('password'), '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
  const urls = [];
  const fetcher = async (url, options) => {
    urls.push({url, options});
    return new Response('0018A45C4D1DEF81644B54AB7F969B88D65:3\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:9545824\r\n00000000000000000000000000000000000:0');
  };
  assert.equal(await tools.pwnedCount('password', {fetcher}), 9545824);
  assert.equal(urls[0].url, 'https://api.pwnedpasswords.com/range/5BAA6');
  assert.equal(urls[0].options.credentials, 'omit');
  assert.equal(urls[0].options.referrerPolicy, 'no-referrer');
  assert.ok(!JSON.stringify(urls[0].options).includes('password'), 'the clear password never leaves the browser');
  assert.ok(!urls[0].url.includes('E4C9B93F3F0682250B6CF8331B7EE68FD8'), 'only the prefix is sent');
  assert.equal(await tools.pwnedCount('another one', {fetcher}), 0);
  await assert.rejects(tools.pwnedCount('x', {fetcher: async () => new Response('', {status: 503})}), /indisponible/);
});

test('CSV parser handles quotes, embedded newlines, BOM, semicolons and limits', () => {
  const rows = tools.parseCSV('﻿name,login_username,notes\r\n"Site, A",alice,"line 1\nline ""2"""\nB,bob,\n');
  assert.deepEqual(plain(rows), [['name', 'login_username', 'notes'], ['Site, A', 'alice', 'line 1\nline "2"'], ['B', 'bob', '']]);
  assert.deepEqual(plain(tools.parseCSV('a;b\n1;2')), [['a', 'b'], ['1', '2']]);
  assert.throws(() => tools.parseCSV('x'.repeat(5 * 1024 * 1024 + 1)), /volumineux/);
});

test('credentials from Bitwarden, KeePass, browser and 1Password exports are mapped', () => {
  const bitwarden = tools.mapCredentialRows(tools.parseCSV('folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\nWork,,login,Mail,Remember,,0,https://mail.example.test,alice,s3cret,' + B32.SHA1 + '\n,,note,Memo,text,,0,,,,\n'));
  assert.equal(bitwarden.entries.length, 1);
  assert.equal(bitwarden.skipped, 1);
  assert.deepEqual(plain(bitwarden.entries[0]), {username: 'alice', password: 's3cret', url: 'https://mail.example.test', notes: 'Remember', totp: B32.SHA1, folder: 'Work', title: 'Mail'});
  const keepass = tools.mapCredentialRows(tools.parseCSV('"Account","Login Name","Password","Web Site","Comments"\n"NAS","admin","pw1","nas.local","c"'));
  assert.equal(keepass.entries[0].title, 'NAS');
  assert.equal(keepass.entries[0].username, 'admin');
  const chrome = tools.mapCredentialRows(tools.parseCSV('name,url,username,password,note\n,https://www.shop.example.test/login,bob,pw2,'));
  assert.equal(chrome.entries[0].title, 'shop.example.test', 'title falls back to the host name');
  const firefox = tools.mapCredentialRows(tools.parseCSV('url,username,password\nhttps://a.example.test,u,p'));
  assert.equal(firefox.entries[0].title, 'a.example.test');
  const onePassword = tools.mapCredentialRows(tools.parseCSV('Title,Url,Username,Password,OTPAuth,Notes,Type\nBank,https://bank.example.test,carol,pw3,otpauth://totp/Bank?secret=' + B32.SHA1 + ',n,Login'));
  assert.equal(onePassword.entries[0].totp.startsWith('otpauth://totp/Bank'), true);
  assert.equal(tools.mapCredentialRows(tools.parseCSV('foo,bar\n1,2')).entries.length, 0);
  assert.equal(tools.mapCredentialRows([]).entries.length, 0);
  assert.equal(tools.entryKey({title: ' Mail ', username: 'ALICE', url: ''}), tools.entryKey({title: 'mail', username: 'alice', url: ''}));
});
