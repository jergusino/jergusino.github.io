/**
 * jergusino-mail: mail backend for jergusino.com on Cloudflare Workers.
 * Replaces the Google Apps Script endpoints (order mail + newsletter / wishlist double opt-in).
 *
 *   POST /subscribe          email, list, consent=on, consent_text?, source?, website (honeypot) -> stores a pending
 *                            signup and mails a confirm link (valid 48 h)
 *   GET  /confirm?t=…        page with a "Potvrdiť" button (mail scanners only GET, so they can't confirm)
 *   POST /confirm            t=… -> moves the signup into `subscribers`
 *   GET  /unsubscribe?…      page with an "Odhlásiť" button; POST does it (also RFC 8058 one-click)
 *   POST /order              order form of /objednavka/ -> one summary mail to the owner
 *   GET  /                   health check
 *   cron (hourly)            deletes pending signups older than 48 h (promise on /sukromie/)
 *
 * Bindings: DB (D1 newsletter-signups), EMAIL (send_email). Vars: SITE, API, FROM, OWNER.
 * Secret: TOKEN_SECRET (signs unsubscribe links).
 */

// Lists people can join. `consent` is the wording stored when the form sends no consent_text.
export const LISTS = {
  newsletter: {
    name: 'Newsletter Jergušino',
    consent: 'Súhlasil s posielaním súborov a noviniek e-mailom',
    what: 'newsletter: súbory zadarmo a krátky e-mail raz týždenne',
  },
  'font-tool': {
    name: 'Font tool',
    consent: 'Súhlasil s posielaním súborov a noviniek e-mailom',
    what: 'font tool a newsletter: súbory zadarmo a krátky e-mail raz týždenne',
  },
  'palette-pack': {
    name: 'Palette pack',
    consent: 'Súhlasil s posielaním súborov a noviniek e-mailom',
    what: 'palette pack a newsletter: súbory zadarmo a krátky e-mail raz týždenne',
  },
  'tally-wishlist': {
    name: 'Tally',
    consent: 'Súhlasil s jedným e-mailom, keď bude Tally dostupné',
    what: 'jeden e-mail, keď bude Tally dostupné',
  },
};

const PENDING_HOURS = 48;
const RESEND_MINUTES = 10;           // same address + list: no second confirm mail within this window
const ORDER_MAX = { poster: 120, size: 10, qty: 3, name: 120, email: 160, phone: 40, street: 160, zip: 20, city: 80, country: 60, note: 600 };
const ORDER_NEED = ['poster', 'size', 'qty', 'name', 'email', 'street', 'zip', 'city', 'country'];
const ORIGINS = ['https://jergusino.com', 'https://www.jergusino.com', 'https://tally.jergusino.com', 'https://jergusino.github.io', 'http://localhost:4000', 'http://127.0.0.1:4000'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const cors = corsHeaders(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const route = req.method + ' ' + url.pathname.replace(/\/+$/, '');
      switch (route) {
        case 'GET ':
          return json({ ok: true, info: 'jergusino mail endpoint' }, 200, cors);
        case 'POST /subscribe':
          return json(await subscribe(await params(req), env), 200, cors);
        case 'GET /confirm':
          return confirmPage(url.searchParams.get('t'), env);
        case 'POST /confirm':
          return confirm((await params(req)).t, env);
        case 'GET /unsubscribe':
          return unsubscribePage(url.searchParams, env);
        case 'POST /unsubscribe': {
          const p = { ...Object.fromEntries(url.searchParams), ...(await params(req)) };
          return unsubscribe(p, env);
        }
        case 'POST /order':
          return json(await order(await params(req), env), 200, cors);
        default:
          return json({ ok: false, error: 'not found' }, 404, cors);
      }
    } catch (err) {
      console.error(err && err.stack || err);
      return json({ ok: false, error: 'server' }, 500, cors);
    }
  },

  async scheduled(event, env) {
    const r = await env.DB.prepare('DELETE FROM pending WHERE signed_up_at < ?').bind(stamp(-PENDING_HOURS * 3600e3)).run();
    console.log('expired pending removed:', r.meta.changes);
  },
};

// ── newsletter / wishlist ───────────────────────────────────────────────────────────────

async function subscribe(p, env) {
  if (p.website) return { ok: true };                                  // honeypot: pretend success
  const email = clean(p.email, 160).toLowerCase();
  const list = clean(p.list || 'newsletter', 40);
  const cfg = LISTS[list];
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'bad email' };
  if (!cfg) return { ok: false, error: 'bad list' };
  if (p.consent !== 'on' && p.consent !== 'true') return { ok: false, error: 'no consent' };
  const source = clean(p.source, 120) || 'jergusino.com';
  const consent = clean(p.consent_text, 300) || cfg.consent;          // the wording the form showed, if sent

  const db = env.DB;
  const done = await db.prepare('SELECT 1 FROM subscribers WHERE email = ? AND list = ? AND confirmed_at IS NOT NULL').bind(email, list).first();
  if (done) return { ok: true };                                       // already on the list; say nothing more

  const recent = await db.prepare('SELECT 1 FROM pending WHERE email = ? AND list = ? AND signed_up_at > ?')
    .bind(email, list, stamp(-RESEND_MINUTES * 60e3)).first();
  if (recent) return { ok: true };                                     // a confirm mail just went out

  const token = randomToken();
  await db.batch([
    db.prepare('DELETE FROM pending WHERE email = ? AND list = ?').bind(email, list),
    db.prepare('INSERT INTO pending (email, token, source, consent, signed_up_at, list) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(email, await sha256(token), source, consent, stamp(), list),
  ]);

  const link = `${env.API}/confirm?t=${token}`;
  try {
    await env.EMAIL.send({
      to: email,
      from: { email: env.FROM, name: 'Jergušino' },
      replyTo: env.OWNER,
      subject: list === 'tally-wishlist' ? 'Potvrď e-mail pre Tally' : 'Potvrď prihlásenie',
      text: [
        'Ahoj,',
        '',
        `niekto (dúfam, že ty) prihlásil túto adresu na: ${cfg.what}.`,
        'Potvrď to kliknutím na odkaz:',
        '',
        link,
        '',
        `Odkaz platí ${PENDING_HOURS} hodín. Ak si sa neprihlásil ty, tento e-mail ignoruj a adresu zmažem.`,
        '',
        'Jergušino',
        `${env.SITE}/sukromie/`,
      ].join('\n'),
      html: mailHtml(cfg, link),
    });
  } catch (err) {
    console.error('send failed', err && err.code, err && err.message);
    await db.prepare('DELETE FROM pending WHERE email = ? AND list = ?').bind(email, list).run();
    return { ok: false, error: 'mail' };
  }
  return { ok: true };
}

async function findPending(token, env) {
  if (!token || !/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  return env.DB.prepare('SELECT * FROM pending WHERE token = ? AND signed_up_at > ?')
    .bind(await sha256(token), stamp(-PENDING_HOURS * 3600e3)).first();
}

async function confirmPage(token, env) {
  const row = await findPending(token, env);
  if (!row) return expired(env);
  const cfg = LISTS[row.list] || LISTS.newsletter;
  return page(env, 'Potvrď prihlásenie', `
    <p class="label">${esc(cfg.name)}</p>
    <h1>Ešte jeden klik.</h1>
    <p>Potvrď, že <b>${esc(row.email)}</b> chce dostávať: ${esc(cfg.what)}.</p>
    <form method="post" action="${env.API}/confirm"><input type="hidden" name="t" value="${esc(token)}"><button>Potvrdiť</button></form>`);
}

async function confirm(token, env) {
  const row = await findPending(token, env);
  if (!row) return expired(env);
  const db = env.DB;
  const now = stamp();
  await db.batch([
    // a legacy unconfirmed row for the same address + list gets confirmed instead of duplicated
    db.prepare(`INSERT INTO subscribers (email, list, source, consent, signed_up_at, confirmed_at) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (email, list) DO UPDATE SET source = excluded.source, consent = excluded.consent,
                signed_up_at = excluded.signed_up_at, confirmed_at = excluded.confirmed_at`)
      .bind(row.email, row.list, row.source, row.consent, row.signed_up_at, now),
    db.prepare('DELETE FROM pending WHERE id = ?').bind(row.id),
  ]);
  const cfg = LISTS[row.list] || LISTS.newsletter;
  return page(env, 'Potvrdené', `
    <p class="label">${esc(cfg.name)}</p>
    <h1>Hotovo. Si na zozname.</h1>
    <p>${row.list === 'tally-wishlist' ? 'Napíšem ti, keď bude Tally dostupné.' : 'Ďakujem. Prvý e-mail príde čoskoro.'}</p>
    <p><a href="${env.SITE}/">← späť na jergusino.com</a></p>`);
}

/** Signed unsubscribe link for an address + list (use it in mails you send to the list). */
export async function unsubscribeUrl(env, email, list) {
  return `${env.API}/unsubscribe?e=${encodeURIComponent(email)}&l=${encodeURIComponent(list)}&s=${await sign(env, email + '\n' + list)}`;
}

async function checkUnsub(p, env) {
  const email = clean(p.e, 160).toLowerCase(), list = clean(p.l, 40);
  if (!email || !list || !p.s) return null;
  return timingSafeEqual(String(p.s), await sign(env, email + '\n' + list)) ? { email, list } : null;
}

async function unsubscribePage(q, env) {
  const ok = await checkUnsub(Object.fromEntries(q), env);
  if (!ok) return page(env, 'Neplatný odkaz', `<h1>Odkaz nefunguje.</h1><p>Napíš mi na <a href="mailto:${env.OWNER}">${env.OWNER}</a> a odhlásim ťa ručne.</p>`, 400);
  const cfg = LISTS[ok.list];
  return page(env, 'Odhlásiť sa', `
    <p class="label">${esc(cfg ? cfg.name : ok.list)}</p>
    <h1>Odhlásiť sa?</h1>
    <p>Adresu <b>${esc(ok.email)}</b> zo zoznamu zmažem.</p>
    <form method="post"><button>Odhlásiť</button></form>`);
}

async function unsubscribe(p, env) {
  const ok = await checkUnsub(p, env);
  if (!ok) return page(env, 'Neplatný odkaz', '<h1>Odkaz nefunguje.</h1>', 400);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM subscribers WHERE email = ? AND list = ?').bind(ok.email, ok.list),
    env.DB.prepare('DELETE FROM pending WHERE email = ? AND list = ?').bind(ok.email, ok.list),
  ]);
  return page(env, 'Odhlásené', '<h1>Odhlásené.</h1><p>Adresu som zmazal. Už ti nič nepošlem.</p>');
}

// ── order form ──────────────────────────────────────────────────────────────────────────

async function order(p, env) {
  if (p.website) return { ok: true };                                  // honeypot
  const d = {};
  for (const k in ORDER_MAX) d[k] = clean(p[k], ORDER_MAX[k]);
  for (const k of ORDER_NEED) if (!d[k]) return { ok: false, error: 'missing ' + k };
  if (!EMAIL_RE.test(d.email)) return { ok: false, error: 'bad email' };
  if (!/^\d{1,2}$/.test(d.qty) || +d.qty < 1) return { ok: false, error: 'bad qty' };
  if (p.consent !== 'on') return { ok: false, error: 'no consent' };

  const body = [
    'Plagát: ' + d.poster,
    'Formát: ' + d.size + ', počet: ' + d.qty,
    '',
    d.name,
    d.email + (d.phone ? ' · ' + d.phone : ''),
    d.street + ', ' + d.zip + ' ' + d.city + ', ' + d.country,
  ];
  if (d.note) body.push('', 'Poznámka: ' + d.note);
  body.push('', 'Odpoveď na tento mail ide zákazníkovi.');

  try {
    await env.EMAIL.send({
      to: env.OWNER,
      from: { email: env.FROM, name: 'Objednávky jergusino.com' },
      replyTo: d.email,
      subject: `Objednávka: ${d.poster} ×${d.qty} (${d.size}) · ${d.name}`,
      text: body.join('\n'),
    });
  } catch (err) {
    console.error('order send failed', err && err.code, err && err.message);
    return { ok: false, error: 'mail' };
  }
  return { ok: true };
}

// ── helpers ─────────────────────────────────────────────────────────────────────────────

async function params(req) {
  const type = req.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    const j = await req.json().catch(() => ({}));
    return j && typeof j === 'object' ? j : {};
  }
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text));
}

// strip control chars (incl. newlines that could break headers), trim, cap length
export function clean(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);
}

/** "YYYY-MM-DD HH:MM:SS" in Europe/Bratislava, the format already stored in D1. offsetMs shifts it. */
export function stamp(offsetMs = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(Date.now() + offsetMs));
  const g = t => parts.find(x => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}:${g('second')}`;
}

function randomToken() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return b64url(b);
}
function b64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sha256(s) {
  return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}
async function sign(env, s) {
  if (!env.TOKEN_SECRET) throw new Error('TOKEN_SECRET not set');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.TOKEN_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(s)));
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function corsHeaders(req) {
  const o = req.headers.get('origin');
  const h = { Vary: 'Origin' };
  if (o && ORIGINS.includes(o)) {
    h['Access-Control-Allow-Origin'] = o;
    h['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return h;
}
function json(o, status, headers) {
  return new Response(JSON.stringify(o), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function expired(env) {
  return page(env, 'Odkaz vypršal', `
    <h1>Odkaz už neplatí.</h1>
    <p>Buď si už potvrdil, alebo prešlo viac ako ${PENDING_HOURS} hodín. Prihlás sa znova na <a href="${env.SITE}/">jergusino.com</a>.</p>`, 410);
}

// Small standalone page in the brand colours (ink / paper / yellow). System fonts only: nothing third-party.
function page(env, title, inner, status = 200) {
  return new Response(`<!doctype html><html lang="sk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)} · Jergušino</title>
<style>
:root{--ink:#0E0E0E;--paper:#F4F1EA;--yellow:#FFD60A;--ash:#8A877F}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--ink);color:var(--paper);
font:17px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px 16px}
main{max-width:480px;width:100%}h1{font-size:clamp(30px,8vw,44px);line-height:1.05;margin:.2em 0 .5em;font-weight:800;letter-spacing:-.02em}
.label{font:12px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--ash);margin:0}
a{color:var(--paper)}b{color:var(--yellow);font-weight:600;word-break:break-all}
button{margin-top:12px;font:600 16px system-ui,sans-serif;background:var(--yellow);color:var(--ink);border:0;border-radius:999px;padding:14px 28px;cursor:pointer}
button:focus-visible{outline:3px solid var(--paper);outline-offset:3px}
</style></head><body><main>${inner}</main></body></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

function mailHtml(cfg, link) {
  return `<!doctype html><html lang="sk"><body style="margin:0;background:#F4F1EA;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#0E0E0E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0E0E0E;border-radius:22px">
<tr><td style="padding:32px 28px;color:#F4F1EA">
<p style="margin:0 0 8px;font:12px monospace;letter-spacing:1px;text-transform:uppercase;color:#8A877F">${esc(cfg.name)}</p>
<h1 style="margin:0 0 16px;font-size:30px;line-height:1.1">Potvrď prihlásenie.</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.5">Niekto (dúfam, že ty) prihlásil túto adresu na: ${esc(cfg.what)}.</p>
<a href="${link}" style="display:inline-block;background:#FFD60A;color:#0E0E0E;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px">Potvrdiť e-mail</a>
<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#8A877F">Odkaz platí ${PENDING_HOURS} hodín. Ak si sa neprihlásil ty, ignoruj tento e-mail a adresu zmažem.</p>
</td></tr></table></td></tr></table></body></html>`;
}
