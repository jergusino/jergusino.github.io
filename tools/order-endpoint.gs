/**
 * Order form backend for jergusino.com/objednavka/.
 * Receives the form POST, checks it, and mails ONE short summary to the account owner.
 *
 * Setup (once):
 *  1. script.google.com > New project > paste this file.
 *  2. Deploy > New deployment > type "Web app" > Execute as: Me > Who has access: Anyone > Deploy.
 *  3. Authorize when asked, copy the web-app URL (ends in /exec).
 *  4. Paste it into _config.yml as `order_endpoint:` and push.
 *  After changing this file: Deploy > Manage deployments > edit > New version (the URL stays the same).
 *
 * Optional: set a Script property ORDER_FROM (e.g. no-reply@jergusino.com) if that alias is
 * verified in Gmail "Send mail as". Otherwise mail is sent from the account itself.
 */
var MAX = { poster: 120, size: 10, qty: 3, name: 120, email: 160, phone: 40, street: 160, zip: 20, city: 80, country: 60, note: 600 };

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.website) return out_({ ok: true });                       // honeypot: pretend success
    var d = {};
    Object.keys(MAX).forEach(function (k) { d[k] = clean_(p[k], MAX[k]); });
    var need = ['poster', 'size', 'qty', 'name', 'email', 'street', 'zip', 'city', 'country'];
    for (var i = 0; i < need.length; i++) if (!d[need[i]]) return out_({ ok: false, error: 'missing ' + need[i] });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return out_({ ok: false, error: 'bad email' });
    if (!/^\d{1,2}$/.test(d.qty) || +d.qty < 1) return out_({ ok: false, error: 'bad qty' });
    if (p.consent !== 'on') return out_({ ok: false, error: 'no consent' });

    var to = Session.getEffectiveUser().getEmail();
    var body = [
      'Plagát: ' + d.poster,
      'Formát: ' + d.size + ', počet: ' + d.qty,
      '',
      d.name,
      d.email + (d.phone ? ' · ' + d.phone : ''),
      d.street + ', ' + d.zip + ' ' + d.city + ', ' + d.country
    ];
    if (d.note) body.push('', 'Poznámka: ' + d.note);
    body.push('', 'Odpoveď na tento mail ide zákazníkovi.');

    var opts = { replyTo: d.email, name: 'Objednávky jergusino.com' };
    var from = PropertiesService.getScriptProperties().getProperty('ORDER_FROM');
    if (from) opts.from = from;
    GmailApp.sendEmail(to, 'Objednávka: ' + d.poster + ' ×' + d.qty + ' (' + d.size + ') · ' + d.name, body.join('\n'), opts);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: 'server' });
  }
}

function doGet() { return out_({ ok: true, info: 'order endpoint' }); }

// strip control chars and header-breaking newlines, trim, cap length
function clean_(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B-\u001F]/g, ' ').trim().slice(0, max); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
