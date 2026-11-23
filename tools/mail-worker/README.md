# jergusino-mail (Cloudflare Worker)

Mail backend for jergusino.com. Replaces the Google Apps Script endpoints (order form + newsletter / Tally wishlist double opt-in) and the "Newsletter signups" Google Sheet.

Runs at **https://api.jergusino.com** (also `jergusino-mail.jergus-golian.workers.dev`).

| What | Where |
|---|---|
| Code | `src/index.js` (one file, no dependencies) |
| Data | D1 database `newsletter-signups`: tables `subscribers` (confirmed + legacy rows) and `pending` (waiting for the confirm click) |
| Mail | Cloudflare Email Service binding `EMAIL`, sent from `noreply@jergusino.com` |
| Owner inbox | `mail@jergusino.com` (Email Routing forwards it) |

## Endpoints

| Request | Does |
|---|---|
| `POST /subscribe` | Fields: `email`, `list` (`newsletter`, `font-tool`, `palette-pack`, `tally-wishlist`), `consent=on`, optional `consent_text` (the exact wording the form showed), `source`, `website` (honeypot, leave empty). Saves a pending signup and mails a confirm link. Answers `{ "ok": true }` or `{ "ok": false, "error": "…" }` |
| `GET /confirm?t=…` | Page with a **Potvrdiť** button. A plain GET never confirms, so mail scanners that open links can't sign people up |
| `POST /confirm` | Moves the signup into `subscribers` with `confirmed_at`. Links are single-use and expire after 48 hours |
| `GET/POST /unsubscribe?e=…&l=…&s=…` | Signed unsubscribe link (HMAC with `TOKEN_SECRET`). GET shows a button, POST deletes the address from that list. `unsubscribeUrl()` in `src/index.js` builds the link |
| `POST /order` | Same fields as the old Apps Script: mails one summary to `mail@jergusino.com`, reply goes to the customer. Nothing is stored |
| cron, hourly | Deletes pending signups older than 48 hours (promised on `/sukromie/`) |

Form snippet for a signup form on any page:

```html
<form id="nl"><input name="email" type="email" required>
  <input name="website" tabindex="-1" autocomplete="off" hidden>
  <label><input name="consent" type="checkbox" required> Súhlasím …</label>
  <button>Prihlásiť</button></form>
<script>
document.getElementById('nl').addEventListener('submit', async e => {
  e.preventDefault();
  const d = new URLSearchParams(new FormData(e.target)); d.set('list', 'newsletter'); d.set('source', location.host + location.pathname);
  const j = await (await fetch('https://api.jergusino.com/subscribe', { method: 'POST', body: d })).json();
  // j.ok -> "Pozri si e-mail a potvrď prihlásenie."
});
</script>
```

Add a new list: one entry in `LISTS` at the top of `src/index.js`, then deploy.

## Setup (once)

1. **Email Sending** needs the Workers Paid plan. Dashboard → Compute & AI → Email Service → Email Sending → Onboard Domain → `jergusino.com` → Add records. (Or `npx wrangler email sending enable jergusino.com`.) It adds its own SPF/DKIM records next to the Brevo ones.
2. `npm install`
3. `npx wrangler secret put TOKEN_SECRET` (any long random string; changing it breaks old unsubscribe links).
4. `npx wrangler d1 migrations apply newsletter-signups --remote` (already done for 0000 and 0001).
5. `npm run deploy`

## Develop

```bash
printf 'TOKEN_SECRET=local\n' > .dev.vars
npx wrangler d1 migrations apply newsletter-signups --local
npx wrangler dev --var API:http://localhost:8787     # mails are written to .wrangler/tmp/email, not sent
npm test                                              # in a second terminal
```

## Look at the list

Dashboard → Storage & Databases → D1 → `newsletter-signups` → Console:

```sql
SELECT email, list, confirmed_at FROM subscribers WHERE confirmed_at IS NOT NULL ORDER BY list, confirmed_at;
```

Rows with an empty `confirmed_at` are older signups from before double opt-in. They were never confirmed; don't mail them until they sign up again.
