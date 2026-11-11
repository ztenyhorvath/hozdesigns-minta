/* Csáklit Kávéház – közös szkript (menü, nyitvatartás, heti menü, galéria, vélemények, űrlapok) */
(function () {
  'use strict';
  var CK = window.CK = window.CK || {};

  /* ---- Űrlapok: Web3Forms. Az értesítés a kulcshoz rendelt e-mail-címre megy (a Web3Forms felületén állítható). ---- */
  CK.FORM_ENDPOINT = 'https://api.web3forms.com/submit';
  CK.FORM_KEY = 'e7adef8b-f72d-42f9-9362-ceba9306ab2d';

  /* ---------- header + mobile menu ---------- */
  var hdr = document.querySelector('.hdr');
  if (hdr) addEventListener('scroll', function () { hdr.classList.toggle('scrolled', scrollY > 8); }, { passive: true });
  var mnav = document.getElementById('mnav'), burger = document.querySelector('.burger');
  function setMenu(open) {
    if (!mnav) return;
    mnav.classList.toggle('open', open);
    mnav.setAttribute('aria-hidden', open ? 'false' : 'true');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) { var f = mnav.querySelector('.mclose'); if (f) f.focus(); } else if (burger) burger.focus();
  }
  if (burger) burger.addEventListener('click', function () { setMenu(true); });
  if (mnav) {
    mnav.querySelector('.mclose').addEventListener('click', function () { setMenu(false); });
    mnav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && mnav.classList.contains('open')) setMenu(false); });
  }

  /* ---------- Budapest time & opening hours ---------- */
  CK.now = function () {
    var o = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Budapest', weekday: 'short', hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; });
    return { d: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday], m: +o.hour * 60 + +o.minute, date: o.year + '-' + o.month + '-' + o.day };
  };
  CK.hours = function (d) { return (d === 0 || d === 6) ? [510, 1080] : [450, 1080]; }; // H–P 7:30–18:00, Szo–V 8:30–18:00
  CK.fmt = function (m) { return Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2); };
  var t = CK.now();
  (function () {
    var h = CK.hours(t.d), txt, open = false;
    if (t.m >= h[0] && t.m < h[1]) { open = true; txt = 'Most nyitva, ' + CK.fmt(h[1]) + '-ig'; }
    else if (t.m < h[0]) txt = 'Ma ' + CK.fmt(h[0]) + '-tól nyitunk';
    else txt = 'Holnap ' + CK.fmt(CK.hours((t.d + 1) % 7)[0]) + '-tól nyitunk';
    document.querySelectorAll('[data-open-status]').forEach(function (el) {
      el.classList.toggle('is-open', open);
      el.innerHTML = '<i></i><span>' + txt + '</span>';
    });
    document.querySelectorAll('.hours tr[data-d="' + t.d + '"]').forEach(function (r) { r.classList.add('now'); });
  })();

  /* ---------- weekly menu ----------
     Forrás: Google Táblázat („Csáklit – heti menü”), CSV-ként közzétéve.
     A hetet a szerver írja a heti-menu.csv első sorába (vasárnap déltől vált, de csak ha már új a tartalom). Ha nincs ilyen sor: hétköznap az aktuális hét, vasárnap déltől a következő.
     Ha a táblázat nem érhető el, telefonszámot mutatunk. */
  CK.MENU_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQL3je2RIsNW3gb6v9vIl8VsXMKP0bsqyEwXtcx7w-E-eKrHtt1fdb_rsBhFObgLA/pub?gid=1255692588&single=true&output=csv';   // ide jön a Google Táblázat közzétett CSV-linkje (…/pub?output=csv)
  CK.WEEK = null;   // nincs beépített hét: amíg a táblázat betölt, csak a dátumok látszanak
  var HO = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
  var HR = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];
  var NAPOK = ['hetfo', 'kedd', 'szerda', 'csutortok', 'pentek'];
  var NAPNEV = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
  function norm(x) { return String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, ''); }
  function parseCSV(txt) {
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < txt.length; i++) {
      var c = txt[i];
      if (q) { if (c === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.map(function (r) { return r.map(function (x) { return x.trim(); }); });
  }
  function parseDate(v) {
    var m = String(v).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (m) return new Date(Date.UTC(+m[1], m[2] - 1, +m[3]));
    m = String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);   // amerikai formátum: hó/nap/év
    if (m) return new Date(Date.UTC(+m[3], m[1] - 1, +m[2]));
    return null;
  }
  function weekStart() {
    var d = new Date(t.date + 'T00:00:00Z'), wd = d.getUTCDay();
    // H–Szo és vasárnap délig: az aktuális hét; vasárnap 12:00-tól: a következő hét
    d.setUTCDate(d.getUTCDate() + (wd === 0 ? (t.m >= 720 ? 1 : -6) : 1 - wd));
    return d;
  }
  function weekLabel(from) {
    var end = new Date(from.getTime() + 4 * 864e5);
    return from.getUTCMonth() === end.getUTCMonth()
      ? HO[from.getUTCMonth()] + ' ' + from.getUTCDate() + '–' + end.getUTCDate() + '.'
      : HO[from.getUTCMonth()] + ' ' + from.getUTCDate() + '. – ' + HO[end.getUTCMonth()] + ' ' + end.getUTCDate() + '.';
  }
  function weekFromCSV(txt) {
    var rows = parseCSV(txt), from = weekStart(), dated = false, price = '', days = [];
    rows.forEach(function (r) {
      var k = norm(r[0]);
      if (k.indexOf('het') === 0 && k.indexOf('kezd') > 0) { var fd = parseDate(r[1]); if (fd && !dated) { from = fd; dated = true; } return; }   // a szerver írja be, melyik hétre szól
      if (k.indexOf('ar') >= 0 && k.indexOf('menu') >= 0 && r[1]) price = r[1];
      else {
        var di = NAPOK.indexOf(k);
        if (di >= 0) {
          var items = [];
          if (r[1]) items.push(['Leves', r[1]]);
          if (r[2]) items.push(['Főétel', r[2]]);
          if (r[3]) items.push([items.length ? 'Megjegyzés' : NAPNEV[di], r[3]]);
          if (items.length) days[di] = items;
        }
      }
    });
    if (!days.length) return null;
    var out = [];
    for (var i = 0; i < 5; i++) {
      if (!days[i]) continue;
      var d = new Date(from.getTime() + i * 864e5);
      out.push([NAPNEV[i], HR[d.getUTCMonth()] + ' ' + d.getUTCDate() + '.', days[i], i]);
    }
    return { from: from.toISOString().slice(0, 10), label: weekLabel(from), price: price, days: out };
  }
  function renderWeek(W) {
    var start = new Date(W.from + 'T00:00:00Z'), today = new Date(t.date + 'T00:00:00Z');
    var off = Math.round((today - start) / 864e5);
    var idx = -1;
    W.days.forEach(function (d, i) { if ((d[3] != null ? d[3] : i) === off) idx = i; });
    CK.todayIdx = idx;
    document.querySelectorAll('[data-week]').forEach(function (wk) {
      wk.innerHTML = '';
      W.days.forEach(function (d, i) {
        var a = document.createElement('article');
        a.className = 'day lift' + (i === idx ? ' today' : '');
        a.innerHTML = (i === idx ? '<span class="now">Ma</span>' : '') + '<h3>' + esc(d[0]) + ' <small>' + esc(d[1]) + '</small></h3><ul>' +
          d[2].map(function (x) { return '<li><b>' + esc(x[0]) + '</b>' + esc(x[1]) + '</li>'; }).join('') + '</ul>';
        wk.appendChild(a);
      });
    });
    document.querySelectorAll('[data-week-label]').forEach(function (el) { el.textContent = W.label.charAt(0).toUpperCase() + W.label.slice(1); });
    if (W.price) document.querySelectorAll('[data-week-price]').forEach(function (el) { el.textContent = W.price; });
    document.querySelectorAll('[data-today]').forEach(function (box) {
      var show = idx >= 0 ? idx : 0, d = W.days[show];
      if (!d) return;
      var special = !d[2].some(function (x) { return x[0] === 'Leves' || x[0] === 'Főétel'; });
      box.querySelector('small').textContent = idx >= 0 ? 'Heti menü, ' + d[0].toLowerCase() + ' (' + d[1] + ')' : 'Heti menü, ' + W.label;
      box.querySelector('h3').textContent = idx >= 0 ? (special ? 'Ma nincs menü' : 'Ma délben') : (d[0] === 'Hétfő' ? 'Hétfőn délben' : d[0] + ' délben');
      if (idx >= 0 && special && /brunch/i.test(d[2].map(function (x) { return x[1]; }).join(' '))) box.querySelector('h3').textContent = 'Ma brunch-nap van';
      box.querySelector('ul').innerHTML = d[2].map(function (x) { return '<li>' + esc(x[1]) + '</li>'; }).join('');
    });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function weekState(msg, isErr) {   // betöltés vagy hiba: dátumok és ételek nélkül
    var W = { from: '1970-01-05', label: 'heti menü', price: '', days: [] };   // dátum nélkül, amíg nem tudjuk, melyik hét
    for (var i = 0; i < 5; i++) W.days.push([NAPNEV[i], '', [['', msg]], i]);
    renderWeek(W);
    document.querySelectorAll('[data-week] .day').forEach(function (a) { a.classList.add('wait'); });
    if (isErr) document.querySelectorAll('[data-week]').forEach(function (wk) {
      wk.innerHTML = '<p class="week-err">A heti menü most nem tölthető be. Kérdezd telefonon: <a href="tel:+3616173197">+36 1 617 3197</a></p>';
    });
    document.querySelectorAll('[data-today]').forEach(function (box) {
      box.querySelector('small').textContent = 'Heti menü';
      box.querySelector('h3').textContent = 'Ma délben';
      box.querySelector('ul').innerHTML = isErr ? '<li>Kérdezd telefonon: <a href="tel:+3616173197">+36 1 617 3197</a></li>' : '<li class="wait">' + esc(msg) + '</li>';
    });
  }
  if (document.querySelector('[data-week]') || document.querySelector('[data-today]')) {
    weekState('Betöltés…', false);
    if (!CK.MENU_CSV) weekState('', true);
    else {
      // Elsődleges forrás: a szerver pillanatképe (heti-menu.csv, 5 percenként frissül, péntek 15:00 és vasárnap 12:00 között szünetel).
      // Ha nincs ilyen fájl (pl. a hozdesigns-os mintán), közvetlenül a Google Táblázatból olvasunk.
      var tick = 't=' + Math.floor(Date.now() / 3e5);
      var icon = document.querySelector('link[rel=icon]'), base = icon ? icon.getAttribute('href').replace('favicon.svg', '') : '';
      var csv = function (u) { return fetch(u + (u.indexOf('?') > 0 ? '&' : '?') + tick, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (x) { if (!/hetfo|hétfő/i.test(x)) throw 0; return x; }); };
      csv(base + 'heti-menu.csv').catch(function () { return csv(CK.MENU_CSV); })
      .then(function (txt) { var W = weekFromCSV(txt); if (!W) throw 0; CK.WEEK = W; renderWeek(W); })
      .catch(function () { weekState('', true); });
    }
  }

  /* ---------- térkép: csak kattintásra töltődik be (Google-sütik) ---------- */
  document.querySelectorAll('[data-map]').forEach(function (box) {
    box.querySelector('button').addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.title = 'Csáklit Kávéház a térképen'; f.src = box.getAttribute('data-map'); f.referrerPolicy = 'no-referrer-when-downgrade';
      box.replaceWith(f);
    });
  });

  /* ---------- adatkezelési megjegyzés az űrlapok alatt ---------- */
  var root = (document.querySelector('link[rel=icon]') || {}).getAttribute ? document.querySelector('link[rel=icon]').getAttribute('href').replace('favicon.svg', '') : '';
  document.querySelectorAll('form .submit').forEach(function (b) {
    var p = document.createElement('p'); p.className = 'fnote';
    p.innerHTML = 'A küldéssel elfogadod az <a href="' + root + 'adatkezeles/">adatkezelési tájékoztatót</a>. Az adataidat csak a kérésed teljesítéséhez használjuk.';
    b.insertAdjacentElement('afterend', p);
  });

  /* ---------- lightbox (galéria, nyomtatott étlap) ---------- */
  var lb = document.getElementById('lb');
  if (lb) {
    var group = [], gi = 0, img = lb.querySelector('img'), cap = lb.querySelector('.lb-cap'), num = lb.querySelector('.lb-n');
    var show = function () { img.src = group[gi].src; img.alt = group[gi].cap || ''; cap.textContent = group[gi].cap || ''; num.textContent = (gi + 1) + ' / ' + group.length; };
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lb]'); if (!b) return;
      e.preventDefault();
      var g = b.getAttribute('data-lb');
      var items = [].filter.call(document.querySelectorAll('[data-lb="' + g + '"]'), function (x) { return x.offsetParent !== null || x === b; });
      group = items.map(function (x) { return { src: x.getAttribute('data-src') || x.getAttribute('href'), cap: x.getAttribute('data-cap') || '' }; });
      gi = items.indexOf(b); show(); lb.showModal();
    });
    lb.querySelector('.lb-prev').onclick = function () { gi = (gi + group.length - 1) % group.length; show(); };
    lb.querySelector('.lb-next').onclick = function () { gi = (gi + 1) % group.length; show(); };
    lb.querySelector('.lb-x').onclick = function () { lb.close(); };
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { gi = (gi + 1) % group.length; show(); }
      if (e.key === 'ArrowLeft') { gi = (gi + group.length - 1) % group.length; show(); }
    });
  }

  /* ---------- reviews carousel ---------- */
  var rv = document.getElementById('rv');
  if (rv) {
    var R = [
      ['„Könnyen lehet, hogy törzshely lesz belőle!”', 'Funzine', '2026'],
      ['„…a reggeli igazán különleges élmény.”', 'Funzine', '2025, a város szélén megbújó, otthonos reggelizőhely'],
      ['„Best eggs benedict of my life.”', 'Tripadvisor', 'vendégértékelés, 5/5'],
      ['9,4 pont a tízből, 425 vendég értékelése alapján.', 'Turul Gasztronómia', 'aranyérem 2022 és 2026 között minden évben']
    ];
    var dots = document.getElementById('dots'), ri = 0, cnt = document.getElementById('rvCount');
    R.forEach(function (r, i) {
      var d = document.createElement('div'); d.className = 'slide'; d.setAttribute('role', 'group'); d.setAttribute('aria-label', (i + 1) + ' / ' + R.length);
      d.innerHTML = '<blockquote>' + r[0] + '</blockquote><cite><b>' + r[1] + '</b>, ' + r[2] + '</cite>'; rv.appendChild(d);
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', (i + 1) + '. idézet'); b.onclick = function () { go(i); }; dots.appendChild(b);
    });
    var go = function (i) { ri = (i + R.length) % R.length; rv.scrollTo({ left: ri * rv.clientWidth }); };
    var mark = function () { ri = Math.round(rv.scrollLeft / rv.clientWidth); if (cnt) cnt.textContent = 'Rólunk írták ' + (ri + 1) + '/' + R.length; [].forEach.call(dots.children, function (b, i) { b.setAttribute('aria-current', i === ri); }); };
    rv.addEventListener('scroll', function () { clearTimeout(rv._t); rv._t = setTimeout(mark, 60); }, { passive: true });
    document.getElementById('rvPrev').onclick = function () { go(ri - 1); };
    document.getElementById('rvNext').onclick = function () { go(ri + 1); };
    rv.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(ri + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(ri - 1); } });
    var dx = null, sl = 0;
    rv.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; dx = e.clientX; sl = rv.scrollLeft; rv.classList.add('drag'); });
    addEventListener('pointermove', function (e) { if (dx !== null) rv.scrollLeft = sl - (e.clientX - dx); });
    addEventListener('pointerup', function (e) { if (dx === null) return; var mv = e.clientX - dx; dx = null; rv.classList.remove('drag'); go(Math.abs(mv) > 60 ? ri + (mv < 0 ? 1 : -1) : Math.round(rv.scrollLeft / rv.clientWidth)); });
    addEventListener('resize', function () { rv.scrollLeft = ri * rv.clientWidth; });
    mark();
  }

  /* ---------- forms ---------- */
  CK.esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  CK.isoDate = function (offsetDays) { var d = new Date(t.date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + (offsetDays || 0)); return d.toISOString().slice(0, 10); };
  document.querySelectorAll('input[type=date][data-min-days]').forEach(function (el) { el.min = CK.isoDate(+el.getAttribute('data-min-days')); });

  // Validates required fields; returns the first invalid element or null.
  CK.validate = function (form) {
    var bad = null;
    form.querySelectorAll('.field').forEach(function (f) { f.classList.remove('err'); var m = f.querySelector('.ferr'); if (m) m.remove(); });
    form.querySelectorAll('[required]').forEach(function (el) {
      if (el.closest('[hidden]')) return;
      var v = (el.value || '').trim(), msg = '';
      if (!v) msg = el.getAttribute('data-msg') || 'Ezt a mezőt töltsd ki.';
      else if (el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) msg = 'Ez nem tűnik e-mail-címnek.';
      else if (el.type === 'tel' && v.replace(/\D/g, '').length < 9) msg = 'Adj meg egy elérhető telefonszámot.';
      else if (el.type === 'number' && el.min && +v < +el.min) msg = 'Legalább ' + el.min + ' darabot lehet rendelni.';
      else if (el.type === 'date' && el.min && v < el.min) msg = 'A legkorábbi választható nap: ' + el.min.replace(/-/g, '. ') + '.';
      if (msg) {
        var f = el.closest('.field'); if (f) { f.classList.add('err'); var p = document.createElement('span'); p.className = 'ferr'; p.textContent = msg; f.appendChild(p); }
        if (!bad) bad = el;
      }
    });
    if (bad) bad.focus();
    return bad;
  };
  // Sends (or in preview mode, simulates) a form and swaps it for a confirmation panel.
  CK.submit = function (form, data, done) {
    var finish = function (ok) {
      var box = document.createElement('div'); box.className = 'done'; box.setAttribute('role', 'status'); box.tabIndex = -1;
      box.innerHTML = '<h3>' + done.title + '</h3><p>' + done.text + '</p>' +
        (ok ? '' : '<p>Valami hiba történt a küldésnél. Hívj minket: <a href="tel:+3616173197" style="color:#fff">+36 1 617 3197</a>.</p>') +
        (CK.FORM_ENDPOINT ? '' : '<p class="demo">Bemutató: az űrlap ebben a tervben még nem küld e-mailt. Élesítés után a kávéház azonnal értesítést kap.</p>');
      form.replaceWith(box); box.focus(); box.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    if (!CK.FORM_ENDPOINT) { finish(true); return; }
    var LBL = { alkalom: 'Alkalom', mit: 'Mit kér', felnott: 'Felnőttek', gyerek: 'Gyerekek', napszak: 'Napszak', extra: 'Extra', nev: 'Név', telefon: 'Telefon', email: 'E-mail', nap: 'Nap', idopont: 'Időpont', letszam: 'Létszám', keres: 'Kérés', megjegyzes: 'Megjegyzés', tetelek: 'Tételek', datum: 'Dátum', atvetel: 'Átvétel napja', elkepzeles: 'Elképzelés' };
    var p = { access_key: CK.FORM_KEY, from_name: 'Csáklit Kávéház weboldal', subject: CK.subject(data) };
    if (data.email) p.replyto = data.email;
    Object.keys(data).forEach(function (k) {
      if (k === '_form') return;
      var v = data[k]; if (Array.isArray(v)) v = v.join(', '); if (v === '' || v == null) return;
      p[LBL[k] || (k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' '))] = v;
    });
    p['Űrlap'] = data._form || '';
    fetch(CK.FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(p) })
      .then(function (r) { return r.json().then(function (j) { finish(r.ok && j.success !== false); }); }).catch(function () { finish(false); });
  };
  CK.subject = function (d) {
    var n = (d.nev || '').trim();
    if (d._form === 'Asztalfoglalás') return 'Új asztalfoglalás – ' + d.letszam + ' fő, ' + d.nap + ' ' + d.idopont + (n ? ' – ' + n : '');
    return 'Új üzenet: ' + (d._form || 'weboldal') + (n ? ' – ' + n : '');
  };
  CK.collect = function (form) {
    var o = {};
    new FormData(form).forEach(function (v, k) { o[k] = o[k] ? [].concat(o[k], v) : v; });
    return o;
  };
  // Simple forms: <form data-form="Űrlap neve" data-done-title data-done-text>
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (CK.validate(form)) return;
      var d = CK.collect(form); d._form = form.getAttribute('data-form');
      var name = (d.nev || '').trim().split(' ').slice(-1)[0];
      CK.submit(form, d, {
        title: (form.getAttribute('data-done-title') || 'Köszönjük!').replace('{nev}', CK.esc(name || '')),
        text: form.getAttribute('data-done-text') || 'Megkaptuk az üzenetedet, hamarosan jelentkezünk.'
      });
    });
  });
})();
