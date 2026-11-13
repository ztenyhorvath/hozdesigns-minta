/**
 * Csáklit Kávéház – Mikulás-foglalás visszaigazolása
 * A foglalási e-mailben lévő link ide mutat. A kávéház a befizetés ellenőrzése után megnyitja,
 * a „Visszaigazolás küldése” gombbal e-mailt küld a vendégnek a saját Gmail-címéről,
 * és a foglalást beírja a Foglalások lapra (a Helyek lap ebből számolja a szabad helyeket).
 * Webalkalmazás: végrehajtás a megnyitó felhasználóként, hozzáférés: Google-fiókkal bárki,
 * de csak az ALLOWED címekkel lehet visszaigazolni.
 * @OnlyCurrentDoc
 */
var ALLOWED = ['csaklit21@gmail.com', 'csaklitfoglalas@gmail.com', 'zteny.horvath@gmail.com', 'hozdesigns@gmail.com'];
var REPLY_TO = 'csaklit21@gmail.com';
var SLOTS = {
  s1: 'December 5. (szombat) 14:00–16:00',
  s2: 'December 5. (szombat) 16:00–18:00',
  s3: 'December 6. (vasárnap) 14:00–16:00',
  s4: 'December 6. (vasárnap) 16:00–18:00'
};

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function ft_(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ft'; }
function age_(a) { a = String(a); return a === '0' ? '1 év alatti' : (a === '13' ? '12 évnél idősebb' : a + ' éves'); }
function user_() { return String(Session.getActiveUser().getEmail() || '').toLowerCase(); }
function allowed_() { return ALLOWED.indexOf(user_()) >= 0; }

function decode_(d) {
  d = String(d || '').replace(/[^A-Za-z0-9_-]/g, '');
  while (d.length % 4) d += '=';
  var b = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(d)).getDataAsString('UTF-8'));
  if (!b || !b.id || !SLOTS[b.s] || !b.e || !b.k || !b.k.length) throw new Error('Hibás foglalási link.');
  b.n = b.k.length;
  return b;
}

function sheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }

function findRow_(id) {
  var sh = sheet_('Foglalások'), last = sh.getLastRow();
  if (last < 2) return null;
  var v = sh.getRange(2, 1, last - 1, 2).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === String(id)) return { row: i + 2, when: v[i][1] };
  return null;
}

function free_(slot) {
  var v = sheet_('Helyek').getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (v[i][0] === slot) return Number(v[i][5]);
  return null;
}

function kidsText_(b) {
  return b.k.map(function (k) { return k[0] + ' (' + age_(k[1]) + ')'; }).join(', ');
}

function doGet(e) {
  var p = (e && e.parameter) || {}, body;
  if (!allowed_()) {
    body = '<h1>Nincs jogosultság</h1><p>A visszaigazoláshoz a Csáklit Google-fiókjával kell belépni. Most ezzel vagy belépve: <b>' + esc_(user_() || 'ismeretlen') + '</b>.</p>';
  } else if (!p.d) {
    body = '<h1>Mikulás-foglalások</h1><p>A foglalási e-mailekben lévő linkkel lehet visszaigazolni egy foglalást.</p><p><a href="' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '" target="_blank">A foglalások táblázata</a></p>';
  } else {
    var b;
    try { b = decode_(p.d); } catch (err) { b = null; }
    if (!b) {
      body = '<h1>Hibás link</h1><p>Ezt a foglalási linket nem tudom beolvasni. Nézd meg, hogy a teljes link megnyílt-e.</p>';
    } else {
      var done = findRow_(b.id), fr = free_(b.s);
      var warn = (!done && fr !== null && b.n > fr) ? '<p class="warn">Figyelem: ebben a turnusban a táblázat szerint már csak ' + fr + ' szabad hely van, ez a foglalás ' + b.n + ' gyermekes.</p>' : '';
      body = '<h1>Mikulás-foglalás visszaigazolása</h1>' +
        '<dl>' +
        '<dt>Turnus</dt><dd>' + esc_(SLOTS[b.s]) + '</dd>' +
        '<dt>Gyermek' + (b.n > 1 ? 'ek' : '') + '</dt><dd>' + esc_(kidsText_(b)) + '</dd>' +
        '<dt>Szülő</dt><dd>' + esc_(b.p) + ' · ' + esc_(b.e) + ' · ' + esc_(b.t) + '</dd>' +
        '<dt>Összeg</dt><dd>' + ft_(Number(b.a) || 5990 * b.n) + '</dd>' +
        '<dt>Azonosító</dt><dd>' + esc_(b.id) + '</dd>' +
        '</dl>' + warn +
        (done
          ? '<p class="ok">Ezt a foglalást már visszaigazoltad (' + esc_(Utilities.formatDate(new Date(done.when), 'Europe/Budapest', 'yyyy.MM.dd. HH:mm')) + '), a vendég megkapta az e-mailt.</p>'
          : '<p>Csak akkor küldd el, ha a befizetés megérkezett a Teyába. A gombra a vendég visszaigazoló e-mailt kap, a foglalás pedig bekerül a táblázatba, és fogy a szabad hely.</p>' +
            '<button id="go" onclick="go()">Visszaigazolás küldése</button><p id="res" role="status"></p>' +
            '<script>function go(){var b=document.getElementById("go"),r=document.getElementById("res");b.disabled=true;b.textContent="Küldés…";' +
            'google.script.run.withSuccessHandler(function(x){b.remove();r.className="ok";r.textContent=x.status==="already"?"Ezt a foglalást már korábban visszaigazoltad.":"Elküldve: a vendég ("+x.to+") megkapta a visszaigazolást."+(x.warn?" "+x.warn:"");})' +
            '.withFailureHandler(function(e){b.disabled=false;b.textContent="Visszaigazolás küldése";r.className="warn";r.textContent="Nem sikerült: "+e.message;})' +
            '.confirm(' + JSON.stringify(String(p.d)) + ');}</script>');
    }
  }
  var html = '<!doctype html><html lang="hu"><head><meta charset="utf-8"><style>' +
    'body{margin:0;background:#F6F1E7;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#2B2620}' +
    'main{max-width:560px;margin:32px auto;padding:28px;background:#fff;border-radius:18px;border:1.5px solid #E7DFCF}' +
    'h1{margin:0 0 16px;font-size:24px;line-height:1.25;color:#1F3B2D}dl{margin:0 0 16px;display:grid;grid-template-columns:110px 1fr;gap:8px 12px}' +
    'dt{color:#7A6F60;font-size:14px}dd{margin:0;font-weight:600}' +
    'button{width:100%;min-height:52px;border:0;border-radius:999px;background:#1F3B2D;color:#fff;font:700 16px system-ui,sans-serif;cursor:pointer}' +
    'button:disabled{opacity:.6}.ok{padding:12px 14px;border-radius:12px;background:#E5EFE7;color:#1F3B2D;font-weight:600}' +
    '.warn{padding:12px 14px;border-radius:12px;background:#FBF0D9;color:#5E4310}a{color:#1F3B2D}' +
    '@media(max-width:600px){main{margin:0;border-radius:0;border:0;min-height:100vh;padding:22px 18px}dl{grid-template-columns:1fr;gap:2px}dd{margin-bottom:10px}}' +
    '</style></head><body><main>' + body + '</main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Mikulás-foglalás – Csáklit').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function confirm(d) {
  if (!allowed_()) throw new Error('A visszaigazoláshoz a Csáklit Google-fiókjával kell belépni.');
  var b = decode_(d);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (findRow_(b.id)) return { status: 'already' };
    var fr = free_(b.s);
    var slot = SLOTS[b.s], total = ft_(Number(b.a) || 5990 * b.n);
    var kidsLi = b.k.map(function (k) { return '<li>' + esc_(k[0]) + ' (' + age_(k[1]) + ')</li>'; }).join('');
    var htmlBody =
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#2B2620;max-width:560px">' +
      '<p>Kedves ' + esc_(b.p) + '!</p>' +
      '<p>Megkaptuk a befizetést, a helyetek a Csáklit Kávéház Mikulás-programjára lefoglalva. Várunk titeket!</p>' +
      '<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:8px 0 14px">' +
      '<tr><td style="color:#7A6F60">Turnus</td><td><b>' + esc_(slot) + '</b></td></tr>' +
      '<tr><td style="color:#7A6F60;vertical-align:top">Gyermek' + (b.n > 1 ? 'ek' : '') + '</td><td><ul style="margin:0;padding-left:18px">' + kidsLi + '</ul></td></tr>' +
      '<tr><td style="color:#7A6F60">Fizetve</td><td>' + total + '</td></tr>' +
      '<tr><td style="color:#7A6F60">Helyszín</td><td>Csáklit Kávéház, 1161 Budapest, Nonn János u. 3.</td></tr>' +
      '<tr><td style="color:#7A6F60">Azonosító</td><td>' + esc_(b.id) + '</td></tr>' +
      '</table>' +
      '<p style="margin-bottom:4px"><b>Jó tudni</b></p>' +
      '<ul style="margin-top:0;padding-left:18px">' +
      '<li>A gyermekekkel egy vagy két kísérő szülő jöhet, számukra a részvétel ingyenes. Ha ketten jöttök, kérjük, hogy a Mikulás közvetlen közelében egyszerre csak az egyik szülő tartózkodjon. Ülőhely korlátozott számban van, ezért a második kísérő szülőnek nem tudjuk garantálni.</li>' +
      '<li>A foglalás nem mondható le, de legkésőbb az előző nap 18:00-ig átruházható valaki másra, vagy a befizetett összeg decemberben bármikor lefogyasztható a kávéházban.</li>' +
      '</ul>' +
      '<p>Ha kérdésed van, válaszolj erre a levélre, vagy hívj minket: +36 1 617 3197.</p>' +
      '<p>Üdvözlettel:<br>Csáklit Kávéház</p></div>';
    var text =
      'Kedves ' + b.p + '!\n\nMegkaptuk a befizetést, a helyetek a Csáklit Kávéház Mikulás-programjára lefoglalva. Várunk titeket!\n\n' +
      'Turnus: ' + slot + '\nGyermek' + (b.n > 1 ? 'ek' : '') + ': ' + kidsText_(b) + '\nFizetve: ' + total +
      '\nHelyszín: Csáklit Kávéház, 1161 Budapest, Nonn János u. 3.\nAzonosító: ' + b.id + '\n\n' +
      'Jó tudni:\n- A gyermekekkel egy vagy két kísérő szülő jöhet, számukra a részvétel ingyenes. Ha ketten jöttök, kérjük, hogy a Mikulás közvetlen közelében egyszerre csak az egyik szülő tartózkodjon. Ülőhely korlátozott számban van, ezért a második kísérő szülőnek nem tudjuk garantálni.\n' +
      '- A foglalás nem mondható le, de legkésőbb az előző nap 18:00-ig átruházható valaki másra, vagy a befizetett összeg decemberben bármikor lefogyasztható a kávéházban.\n\n' +
      'Ha kérdésed van, válaszolj erre a levélre, vagy hívj minket: +36 1 617 3197.\n\nÜdvözlettel:\nCsáklit Kávéház';
    MailApp.sendEmail({
      to: b.e,
      replyTo: REPLY_TO,
      name: 'Csáklit Kávéház',
      subject: 'Visszaigazolás: Mikulás-program – ' + slot,
      body: text,
      htmlBody: htmlBody
    });
    sheet_('Foglalások').appendRow([b.id, new Date(), b.s, b.n, slot, kidsText_(b), b.p, b.e, "'" + b.t, Number(b.a) || 5990 * b.n, user_()]);
    var warn = (fr !== null && b.n > fr) ? 'Figyelem: ezzel a turnus túllépte a létszámot.' : '';
    return { status: 'sent', to: b.e, warn: warn };
  } finally {
    lock.releaseLock();
  }
}
