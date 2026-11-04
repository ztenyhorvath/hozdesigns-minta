(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var HU_M = ['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];
  var DN = ['H','K','Sze','Cs','P','Szo','V'];
  var key = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var fmt = function (d) { return d.getFullYear() + '. ' + HU_M[d.getMonth()] + ' ' + d.getDate() + '.'; };

  /* ---------- lightbox ---------- */
  var pj = $('#pics'), box = $('[data-lbox]');
  if (pj && box) {
    var P = JSON.parse(pj.textContent), cur = 0;
    var show = function (i) { cur = (i + P.length) % P.length; $('img', box).src = P[cur][0]; $('img', box).alt = P[cur][1]; $('p', box).textContent = P[cur][1] + ' · ' + (cur + 1) + ' / ' + P.length; };
    var open = function (i) { show(i); box.hidden = false; $('.x', box).focus(); };
    var close = function () { box.hidden = true; };
    $$('[data-lb]').forEach(function (b) { b.addEventListener('click', function () { open(+b.getAttribute('data-lb')); }); });
    $('.x', box).onclick = close; $('.l', box).onclick = function () { show(cur - 1); }; $('.r', box).onclick = function () { show(cur + 1); };
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) { if (box.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  }

  /* ---------- foglaltsági naptár (iCal) ---------- */
  var cal = $('[data-cal]');
  if (!cal) return;
  var busy = {}, today = new Date(); today.setHours(0, 0, 0, 0);
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var maxView = new Date(today.getFullYear(), today.getMonth() + 12, 1);
  var din = null, dout = null;
  var fIn = $('[data-in]'), fOut = $('[data-out]');

  function parseIcs(t) {
    t.replace(/\r?\n[ \t]/g, '').split('BEGIN:VEVENT').slice(1).forEach(function (ev) {
      var s = /DTSTART[^:]*:(\d{8})/.exec(ev), e = /DTEND[^:]*:(\d{8})/.exec(ev);
      if (!s) return;
      var a = new Date(+s[1].slice(0, 4), +s[1].slice(4, 6) - 1, +s[1].slice(6, 8));
      var b = e ? new Date(+e[1].slice(0, 4), +e[1].slice(4, 6) - 1, +e[1].slice(6, 8)) : new Date(a.getTime() + 864e5);
      for (var d = new Date(a); d < b; d.setDate(d.getDate() + 1)) busy[key(d)] = 1;   // a távozás napja szabad
    });
  }
  function free(a, b) { for (var d = new Date(a); d < b; d.setDate(d.getDate() + 1)) if (busy[key(d)]) return false; return true; }

  function render() {
    var y = view.getFullYear(), m = view.getMonth();
    var first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    var h = '<div class="calh"><button type="button" data-p aria-label="Előző hónap"' + (view <= new Date(today.getFullYear(), today.getMonth(), 1) ? ' disabled' : '') + '>‹</button><b>' + y + '. ' + HU_M[m] + '</b><button type="button" data-n aria-label="Következő hónap"' + (view >= maxView ? ' disabled' : '') + '>›</button></div><div class="grid">';
    DN.forEach(function (d) { h += '<span class="dn">' + d + '</span>'; });
    for (var i = 0; i < first; i++) h += '<span></span>';
    for (var d = 1; d <= days; d++) {
      var dt = new Date(y, m, d), k = key(dt), past = dt < today, b = !!busy[k];
      var cls = [], dis = past || (b && !(din && !dout && dt > din && free(din, dt)));
      if (past) cls.push('past');
      if ((din && +dt === +din) || (dout && +dt === +dout)) cls.push('sel');
      else if (din && dout && dt > din && dt < dout) cls.push('rng');
      h += '<button type="button" data-d="' + k + '" class="' + cls.join(' ') + '"' + (dis ? ' disabled' : '') + ' aria-label="' + fmt(dt) + (b ? ', foglalt' : '') + '">' + d + '</button>';
    }
    cal.innerHTML = h + '</div>';
    $('[data-p]', cal).onclick = function () { view.setMonth(view.getMonth() - 1); render(); };
    $('[data-n]', cal).onclick = function () { view.setMonth(view.getMonth() + 1); render(); };
    $$('[data-d]', cal).forEach(function (bt) { bt.onclick = function () { pick(bt.getAttribute('data-d')); }; });
  }
  function pick(k) {
    var p = k.split('-'), dt = new Date(+p[0], +p[1] - 1, +p[2]);
    if (!din || dout || dt <= din || !free(din, dt)) { din = busy[k] ? null : dt; dout = null; }
    else dout = dt;
    fIn.value = din ? fmt(din) : ''; fOut.value = dout ? fmt(dout) : '';
    render();
  }
  fetch(cal.getAttribute('data-ics')).then(function (r) { return r.ok ? r.text() : ''; }).then(parseIcs).catch(function () {}).then(render);

  /* ---------- foglalási kérés (Web3Forms) ---------- */
  var f = $('[data-form]');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('.msg', f), bt = $('button[type=submit]', f);
    if (!din || !dout) { msg.className = 'msg err'; msg.textContent = 'Válaszd ki az érkezés és a távozás napját a naptárban.'; return; }
    if (!f.checkValidity()) { f.reportValidity(); return; }
    bt.disabled = true; msg.className = 'msg'; msg.textContent = 'Küldés…';
    fetch(f.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(f) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.success) throw 0; msg.className = 'msg ok'; msg.textContent = 'Köszönjük, megkaptuk a foglalási kérésedet. Hamarosan visszaigazoljuk e-mailben.'; f.reset(); din = dout = null; render(); })
      .catch(function () { msg.className = 'msg err'; msg.textContent = 'Nem sikerült elküldeni. Próbáld újra, vagy írj nekünk e-mailt.'; })
      .then(function () { bt.disabled = false; });
  });
})();
