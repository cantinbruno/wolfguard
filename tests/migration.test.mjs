import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash, createCipheriv, pbkdf2Sync, randomBytes} from 'node:crypto';
import {convert, encrypt} from '../scripts/migrate-desktop.mjs';
import {open,checkPassword} from '../browser/crypto.js';

test('desktop vault converts locally to a compatible encrypted web backup', async () => {
  const pin = '1234', salt = randomBytes(16), iv = randomBytes(12);
  const oldKey = pbkdf2Sync(pin, salt, 250000, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', oldKey, iv);
  const clear = {username:'fixture@example.invalid',password:'synthetic-secret',url:'https://example.invalid',notes:'test',custom:[]};
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(clear)), cipher.final(), cipher.getAuthTag()]);
  const sections = [{
    folders:[{id:'a',name:'Racine',section:'vault',parentId:null},{id:'b',name:'Sous-dossier',section:'vault',parentId:'a'}],
    items:[{id:'fixture',type:'vault',title:'Fixture',folderId:'b',updatedAt:'2026-01-01T00:00:00.000Z',vaultBlobEnc:{iv:[...iv],data:[...ciphertext]}}],
    settings:[{key:'accessCodeHash',value:createHash('sha256').update('ITW_ACCESS|'+pin).digest('hex')},{key:'vaultCrypto',value:{salt:[...salt]}}]
  }];
  assert.throws(() => convert(sections, '9999'), /incorrect/);
  const result = convert(sections, pin);
  assert.equal(result.vaultSecrets.get('fixture').password, clear.password);
  assert.equal(result.payload.folders[1].name, 'Sous-dossier');
  assert.equal(result.payload.folders[1].parentId, 'a');
  const password = 'AbCdEfGh';
  const envelope = encrypt(result.payload, password, result.vaultSecrets);
  assert.equal(JSON.stringify(envelope).includes(clear.password), false);
  const opened = await open(envelope, password);
  assert.equal(opened.payload.items[0].id,'fixture');
  const blob=opened.payload.items[0].vaultBlobEnc;
  const secret=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(blob.iv)},opened.key,new Uint8Array(blob.data))));
  assert.deepEqual(secret,clear);
  await assert.rejects(open(envelope, 'wrong-password'), /incorrect/);
});

test('memo conversion keeps rich text, attachments and command blocks without loss', () => {
  const result = convert([{folders:[],settings:[],items:[{id:'note',type:'memo',title:'Note',content:'<p>Bonjour &amp; merci</p>',attachments:[{id:'file'}],updatedAt:'2026-01-01'}]}], '');
  assert.equal(result.payload.items[0].content, '<p>Bonjour &amp; merci</p>');
  assert.deepEqual(result.payload.items[0].attachments,[{id:'file'}]);
  assert.throws(() => encrypt(result.payload, '1234'), /8 lettres/);
});

test('new access codes require exactly eight case-sensitive ASCII letters', () => {
  for (const value of ['AbCdEfGh','abcdefgh','ABCDEFGH']) assert.doesNotThrow(()=>checkPassword(value));
  for (const value of ['abcdefg','abcdefghi','abcd1234','abcd efG','ébcdefgh','abcdefgh\n',null]) assert.throws(()=>checkPassword(value),/8 lettres/);
});
