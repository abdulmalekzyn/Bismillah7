'use strict';
/* ===== Mushaf reader with memorisation helpers ===== */
const Mushaf = (() => {
  const R = { page: 1, hide: 0, ctx: null, rv: new Set() }; // hide: 0 off, 1 all, 2 keep first word
  const AD = '٠١٢٣٤٥٦٧٨٩';
  const adig = n => String(n).replace(/\d/g, d => AD[d]);
  const inCtx = g => !!R.ctx && R.ctx.ranges.some(([a, b]) => g >= a && g <= b);

  const pageHtml = p => {
    const [a, b] = Q.pageRange(p), S = Store.S, noted = new Set(S.notes.filter(n => n.g != null).map(n => n.g));
    let h = '';
    for (let g = a; g <= b; g++) {
      const r = Q.ref(g);
      if (r.a === 1) {
        h += `<div class="sura-h"><span>سورة ${Q.SU[r.s].name}</span></div>`;
        if (r.s !== 0 && r.s !== 8) h += `<div class="basm">${esc(Q.A[0])}</div>`;
      }
      const t = Q.A[g], sp = t.indexOf(' ');
      const fw = sp < 0 ? t : t.slice(0, sp), rest = sp < 0 ? '' : t.slice(sp);
      const hl = inCtx(g), hd = R.hide && (!R.ctx || hl) && !R.rv.has(g);
      const cls = ['ay', S.mem[g] ? 'mem' : '', hl ? 'hl' : '', hd ? 'hd' : '', R.hide === 2 ? 'h2' : '', S.marks[g] ? 'mk-' + S.marks[g] : '', noted.has(g) ? 'nt' : '', Player.cur() === g ? 'playing' : ''].join(' ');
      h += `<span class="${cls}" data-g="${g}" data-a="ayTap"><span class="fw">${esc(fw)}</span><span class="rs">${esc(rest)}</span> <span class="aend" data-a="ayNum" data-g="${g}">${adig(r.a)}</span></span> `;
    }
    return h;
  };
  const head = () => {
    const [a] = Q.pageRange(R.page), r = Q.ref(a);
    return `<button class="ib" data-a="mJump" aria-label="فهرس">${ic('list')}</button>
      <button class="mtitle" data-a="mJump"><b>${Q.SU[r.s].name}</b><small>الجزء ${num(Q.juzOf[a])} · صفحة ${num(R.page)}</small></button>
      <button class="ib" data-a="mFont" aria-label="حجم الخط">${ic('text')}</button>`;
  };
  const tools = () => {
    const hideLbl = ['إخفاء', 'مخفي', 'أول كلمة'][R.hide];
    return `<button class="mt" data-a="mPrev">${ic('prev')}<span>السابقة</span></button>
      <button class="mt ${R.hide ? 'on' : ''}" data-a="mHide">${ic(R.hide ? 'eyeoff' : 'eye')}<span>${hideLbl}</span></button>
      <button class="mt ${Rec.active() ? 'rec' : ''}" data-a="mRec">${ic(Rec.active() ? 'stop' : 'mic')}<span>${Rec.active() ? 'إيقاف' : 'سجّل'}</span></button>
      <button class="mt ${Player.on ? 'on' : ''}" data-a="mPlay">${ic(Player.on ? 'stop' : 'headphones')}<span>${Player.on ? 'إيقاف' : 'استمع'}</span></button>
      <button class="mt" data-a="mCount">${ic('repeat')}<span>عدّاد</span></button>
      <button class="mt" data-a="mNext">${ic('next')}<span>التالية</span></button>`;
  };
  const ctxBar = () => {
    if (!R.ctx) return '';
    const t = R.ctx.ti != null ? Plan.day().tasks[R.ctx.ti] : null;
    return `<div class="ctx"><div class="grow"><b>${esc(R.ctx.title)}</b><small>${F.ranges(R.ctx.ranges)}</small></div>
      ${t && !t.done ? `<button class="btn sm pri" data-a="mDone">${ic('check')} تم</button>` : (t ? `<span class="tag">${ic('check')} منجز</span>` : '')}
      <button class="ib sm" data-a="mCtxClose">${ic('x')}</button></div>`;
  };
  const render = root => {
    root.className = 'mushaf';
    root.innerHTML = `<header class="mbar">${head()}</header>${ctxBar()}
      <div class="page-wrap" id="mwrap"><div class="page" id="mpage">${pageHtml(R.page)}</div><div class="pnum">${num(R.page)}</div></div>
      <div class="mtools" id="mtools">${tools()}</div>`;
    Store.S.ui.page = R.page; Store.save();
    swipe($('#mwrap'));
  };
  const update = () => { if (UI.tab === 'mushaf' && !UI.depth) { const y = $('#mwrap') ? $('#mwrap').scrollTop : 0; UI.render(); if ($('#mwrap')) $('#mwrap').scrollTop = y; } };
  const goPage = p => { R.page = Math.max(1, Math.min(Q.NP, p)); if (UI.tab === 'mushaf' && !UI.depth) UI.render(); };
  const swipe = el => {
    let x0 = null, y0 = 0;
    el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchend', e => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) goPage(R.page + (dx > 0 ? 1 : -1)); // like turning a real mushaf
    }, { passive: true });
  };
  const open = o => {
    o = o || {};
    R.ctx = o.ranges ? { ranges: o.ranges, title: o.title || 'مقطع', ti: o.ti } : null;
    R.hide = o.hide ? 1 : 0; R.rv = new Set();
    if (o.ranges) R.page = Q.pageOf[o.ranges[0][0]]; else if (o.page) R.page = o.page;
    UI.go('mushaf');
  };
  const scope = () => (R.ctx ? R.ctx.ranges : [Q.pageRange(R.page)]);

  Act.mPrev = () => goPage(R.page - 1);
  Act.mNext = () => goPage(R.page + 1);
  Act.mHide = () => { R.hide = (R.hide + 1) % 3; R.rv = new Set(); update(); };
  Act.mRec = () => Rec.toggle({ label: R.ctx ? `${R.ctx.title} — ${F.ranges(R.ctx.ranges)}` : `صفحة ${num(R.page)} — ${F.range(Q.pageRange(R.page))}`, g: scope()[0][0] });
  Act.mPlay = () => { if (Player.on) Player.stop(); else Player.play(scope()); };
  Act.mCount = () => Tools.counter({ ranges: scope() });
  Act.mCtxClose = () => { R.ctx = null; update(); };
  Act.mDone = () => { const el = document.createElement('i'); el.dataset.i = R.ctx.ti; UI.go('today'); Act.taskDone(el); };
  Act.mFont = () => {
    UI.sheet(`<h3>حجم خط المصحف</h3>${W.chips('mFontSet', [[20, 'صغير'], [23, 'متوسط'], [26, 'كبير'], [30, 'أكبر'], [34, 'الأكبر']], Store.S.ui.font)}
      <p class="qprev">${W.ayah(1)}</p><button class="btn grow" data-a="sheetClose">تم</button>`);
  };
  Act.mFontSet = el => { Store.S.ui.font = +el.dataset.v; Store.save(); UI.theme(); Act.mFont(); };
  Act.ayTap = (el, e) => {
    if (e.target.closest('.aend')) return;
    const g = +el.dataset.g;
    if (R.hide && (!R.ctx || inCtx(g))) { if (R.rv.has(g)) R.rv.delete(g); else R.rv.add(g); el.classList.toggle('hd'); return; }
    aySheet(g);
  };
  Act.ayNum = el => aySheet(+el.dataset.g);
  const aySheet = g => {
    const S = Store.S, notes = S.notes.filter(n => n.g === g), mk = S.marks[g];
    UI.sheet(`<small class="mut">${F.ayahRef(g)} · صفحة ${num(Q.pageOf[g])}</small><p class="qprev">${W.ayah(g)}</p>
      <div class="agrid">
        <button data-a="ayPlay" data-g="${g}">${ic('headphones')}<span>استمع</span></button>
        <button data-a="ayCount" data-g="${g}">${ic('repeat')}<span>كرّرها</span></button>
        <button data-a="ayNote" data-g="${g}">${ic('edit')}<span>ملاحظة</span></button>
        <button data-a="ayMark" data-g="${g}" data-k="e" class="${mk === 'e' ? 'on' : ''}">${ic('flag')}<span>موضع خطأ</span></button>
        <button data-a="ayMark" data-g="${g}" data-k="m" class="${mk === 'm' ? 'on' : ''}">${ic('link')}<span>متشابه</span></button>
        <button data-a="ayMem" data-g="${g}" class="${S.mem[g] ? 'on' : ''}">${ic('check')}<span>${S.mem[g] ? 'محفوظة' : 'علّمها محفوظة'}</span></button>
      </div>
      ${notes.map(n => `<div class="mini-note" data-a="noteEdit" data-id="${n.id}"><b>${esc(n.title || 'ملاحظة')}</b><p>${esc(n.text)}</p></div>`).join('')}`);
  };
  Act.ayPlay = el => { UI.closeSheet(); Player.play([[+el.dataset.g, +el.dataset.g]], { each: 3 }); };
  Act.ayCount = el => { UI.closeSheet(); Tools.counter({ ranges: [[+el.dataset.g, +el.dataset.g]] }); };
  Act.ayNote = el => { UI.closeSheet(); Journal.editNote(null, +el.dataset.g); };
  Act.ayMark = el => {
    const g = +el.dataset.g, k = el.dataset.k, m = Store.S.marks;
    if (m[g] === k) delete m[g]; else m[g] = k;
    Store.save(); UI.closeSheet(); update();
  };
  Act.ayMem = el => { const g = +el.dataset.g; Plan.setMem([g, g], !Store.S.mem[g]); Plan.rebuild(); UI.closeSheet(); update(); };

  /* jump: surah / juz / page */
  let jtab = 's';
  const jumpBody = flt => {
    if (jtab === 'j') return `<div class="jgrid">${Array.from({ length: 30 }, (_, i) => `<button data-a="mGoJuz" data-v="${i + 1}">${num(i + 1)}</button>`).join('')}</div>`;
    if (jtab === 'p') return `<div class="row gap"><input type="number" id="jp" min="1" max="604" placeholder="رقم الصفحة (١–٦٠٤)" inputmode="numeric"><button class="btn pri" data-a="mGoPage">اذهب</button></div>`;
    return `<input type="search" placeholder="ابحث عن سورة" data-i="mJumpFlt" value="${esc(flt || '')}"><div class="slist" id="jlist">${surahList(flt)}</div>`;
  };
  const strip = s => s.replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا');
  const surahList = flt => Q.SU.map((s, i) => (!flt || strip(s.name).includes(strip(flt))) ? `<button data-a="mGoSurah" data-v="${i}"><span class="sn">${num(i + 1)}</span><b>${s.name}</b><small>${s.makki ? 'مكية' : 'مدنية'} · ${num(s.count)} آية · ص ${num(Q.pageOf[s.start])}</small></button>` : '').join('');
  Act.mJump = () => UI.sheet(`<div class="seg">${[['s', 'السور'], ['j', 'الأجزاء'], ['p', 'الصفحة']].map(([k, l]) => `<button class="${jtab === k ? 'on' : ''}" data-a="mJumpTab" data-v="${k}">${l}</button>`).join('')}</div><div class="jump">${jumpBody()}</div>`);
  Act.mJumpTab = el => { jtab = el.dataset.v; Act.mJump(); };
  Chg.mJumpFlt = el => { $('#jlist').innerHTML = surahList(el.value); };
  Act.mGoSurah = el => { UI.closeSheet(); goPage(Q.pageOf[Q.SU[+el.dataset.v].start]); };
  Act.mGoJuz = el => { UI.closeSheet(); goPage(Q.pageOf[Q.D.juz[+el.dataset.v - 1]]); };
  Act.mGoPage = () => { const p = +$('#jp').value; if (p >= 1 && p <= 604) { UI.closeSheet(); goPage(p); } };

  document.addEventListener('recchange', () => { if ($('#mtools')) $('#mtools').innerHTML = tools(); });
  document.addEventListener('playerayah', e => {
    const g = e.detail;
    if ($('#mtools')) $('#mtools').innerHTML = tools();
    if (UI.tab !== 'mushaf' || UI.depth) return;
    if (g >= 0 && Q.pageOf[g] !== R.page) return goPage(Q.pageOf[g]);
    $$('.ay.playing').forEach(x => x.classList.remove('playing'));
    const el = g >= 0 && $(`.ay[data-g="${g}"]`); if (el) { el.classList.add('playing'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  });
  UI.screens.mushaf = root => { if (!R.inited) { R.inited = true; if (!R.ctx) R.page = Store.S.ui.page || 1; } render(root); };
  return { open, goPage, R };
})();
