// End-to-end check against a running `npx wrangler dev --var API:http://localhost:8787` (local D1, simulated mail).
// Run: npm test   (BASE and LOG can be overridden by env vars)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE || 'http://localhost:8787';
const MAILDIR = process.env.MAILDIR || '.wrangler/tmp/email';   // where wrangler dev writes simulated mails

function newestMailText() {
  const files = [];
  const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.includes('email-text') && files.push(p); } };
  walk(MAILDIR);
  files.sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs);
  return readFileSync(files.at(-1), 'utf8');
}
const form = o => ({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://jergusino.com' }, body: new URLSearchParams(o) });
const post = async (path, o) => (await fetch(BASE + path, form(o))).json();

test('rejects bad input', async () => {
  assert.deepEqual(await post('/subscribe', { email: 'nope', consent: 'on' }), { ok: false, error: 'bad email' });
  assert.deepEqual(await post('/subscribe', { email: 'a@b.sk', consent: 'on', list: 'x' }), { ok: false, error: 'bad list' });
  assert.deepEqual(await post('/subscribe', { email: 'a@b.sk' }), { ok: false, error: 'no consent' });
  assert.deepEqual(await post('/order', { poster: 'X' }), { ok: false, error: 'missing size' });
});

test('honeypot pretends success', async () => {
  assert.deepEqual(await post('/subscribe', { email: 'bot@b.sk', consent: 'on', website: 'x' }), { ok: true });
});

test('CORS only for own origins', async () => {
  const r = await fetch(BASE + '/subscribe', { method: 'OPTIONS', headers: { Origin: 'https://jergusino.com' } });
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://jergusino.com');
  const r2 = await fetch(BASE + '/subscribe', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
  assert.equal(r2.headers.get('access-control-allow-origin'), null);
});

test('double opt-in: subscribe -> confirm page -> confirm', async () => {
  const email = `test+${Date.now()}@jergusino.com`;
  assert.deepEqual(await post('/subscribe', { email, consent: 'on', list: 'font-tool', source: 'test' }), { ok: true });
  await new Promise(r => setTimeout(r, 800));
  const mail = newestMailText();
  assert.match(mail, /font tool/);
  const links = [...mail.matchAll(/\/confirm\?t=([A-Za-z0-9_-]+)/g)].map(m => m[1]);
  assert.ok(links.length, 'confirm link in simulated mail');
  const t = links.at(-1);

  const page = await fetch(`${BASE}/confirm?t=${t}`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Potvrdiť/);                 // GET only shows a button, does not confirm

  const done = await fetch(BASE + '/confirm', form({ t }));
  assert.equal(done.status, 200);
  assert.match(await done.text(), /Si na zozname/);

  await new Promise(r => setTimeout(r, 500));
  const freebie = newestMailText();                                // confirming also mails the freebie
  assert.match(freebie, /jergusino\.com\/font-tool\/tool\//);
  assert.match(freebie, /Odhlásiť sa: .*\/unsubscribe\?e=/);

  const again = await fetch(BASE + '/confirm', form({ t }));
  assert.equal(again.status, 410);                               // token is single-use
  assert.deepEqual(await post('/subscribe', { email, consent: 'on', list: 'font-tool' }), { ok: true });   // already confirmed: no-op
});

test('bad tokens', async () => {
  assert.equal((await fetch(BASE + '/confirm?t=short')).status, 410);
  assert.equal((await fetch(BASE + '/unsubscribe?e=a@b.sk&l=newsletter&s=forged')).status, 400);
});

test('order mail', async () => {
  const r = await post('/order', { poster: 'Mars', size: 'A3', qty: '2', name: 'Test', email: 'test@jergusino.com', street: 'Ulica 1', zip: '81101', city: 'Bratislava', country: 'Slovensko', consent: 'on' });
  assert.deepEqual(r, { ok: true });
});
