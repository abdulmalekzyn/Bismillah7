'use strict';
/* ===== Quran index helpers (text is used verbatim from data/quran.js) ===== */
const Q = (() => {
  const D = (typeof window !== 'undefined' ? window : globalThis).QDATA;
  const N = D.ayahs.length, A = D.ayahs, SU = D.surahs, NP = D.pages.length;
  const surahOf = new Uint8Array(N), pageOf = new Uint16Array(N), juzOf = new Uint8Array(N);
  SU.forEach((s, i) => { for (let g = s.start; g < s.start + s.count; g++) surahOf[g] = i; });
  const fill = (starts, arr, base) => starts.forEach((st, i) => {
    const en = i + 1 < starts.length ? starts[i + 1] : N;
    for (let g = st; g < en; g++) arr[g] = i + base;
  });
  fill(D.pages, pageOf, 1); fill(D.juz, juzOf, 1);
  // cum[g] = position of ayah g measured in mushaf pages (page p spans [p-1, p))
  const cum = new Float64Array(N + 1);
  for (let p = 0; p < NP; p++) {
    const st = D.pages[p], en = p + 1 < NP ? D.pages[p + 1] : N;
    let tot = 0, run = 0;
    for (let g = st; g < en; g++) tot += A[g].length;
    for (let g = st; g < en; g++) { cum[g] = p + run / tot; run += A[g].length; }
  }
  cum[N] = NP;
  const W = g => cum[g + 1] - cum[g];
  const weight = ranges => ranges.reduce((t, [a, b]) => t + cum[b + 1] - cum[a], 0);
  const pageRange = p => [D.pages[p - 1], (p < NP ? D.pages[p] : N) - 1];
  const juzRange = j => [D.juz[j - 1], (j < 30 ? D.juz[j] : N) - 1];
  const surahRange = s => [SU[s].start, SU[s].start + SU[s].count - 1];
  const ref = g => ({ s: surahOf[g], a: g - SU[surahOf[g]].start + 1 });
  const gid = (s, a) => SU[s].start + a - 1;
  const toRanges = gids => {
    const out = [];
    for (const g of gids) {
      const last = out[out.length - 1];
      if (last && last[1] + 1 === g) last[1] = g; else out.push([g, g]);
    }
    return out;
  };
  const expand = ranges => { const o = []; for (const [a, b] of ranges) for (let g = a; g <= b; g++) o.push(g); return o; };
  // end ayah of a linear stretch starting at `from` that covers `amt` pages
  const linearEnd = (from, amt) => {
    const target = cum[from] + amt - 1e-6;
    let g = from;
    while (g < N - 1 && cum[g + 1] < target) g++;
    return g;
  };
  return { D, N, NP, A, SU, surahOf, pageOf, juzOf, cum, W, weight, pageRange, juzRange, surahRange, ref, gid, toRanges, expand, linearEnd };
})();

/* ===== formatting ===== */
const num = x => Number(x).toLocaleString('ar-EG', { maximumFractionDigits: 1, useGrouping: false });
const bare = s => String(s).replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const F = {
  range([a, b]) {
    const ra = Q.ref(a), rb = Q.ref(b), na = Q.SU[ra.s].name, nb = Q.SU[rb.s].name;
    const whole = ra.a === 1 && rb.a === Q.SU[rb.s].count;
    if (whole) return ra.s === rb.s ? 'سورة ' + na : `من سورة ${na} إلى سورة ${nb}`;
    if (ra.s === rb.s) return ra.a === rb.a ? `${na}: الآية ${num(ra.a)}` : `${na}: ${num(ra.a)}–${num(rb.a)}`;
    return `${na} ${num(ra.a)} ← ${nb} ${num(rb.a)}`;
  },
  ranges(rs) {
    if (!rs || !rs.length) return '—';
    if (rs.length <= 3) return rs.map(F.range).join('، ');
    return `${F.range(rs[0])} … ${F.range(rs[rs.length - 1])}`;
  },
  pages(rs) {
    if (!rs || !rs.length) return '';
    let lo = 9999, hi = 0;
    for (const [a, b] of rs) { lo = Math.min(lo, Q.pageOf[a]); hi = Math.max(hi, Q.pageOf[b]); }
    return lo === hi ? `ص ${num(lo)}` : `ص ${num(lo)}–${num(hi)}`;
  },
  amount(w) {
    if (w >= 19.5) { const j = w / 20; return `≈ ${num(Math.round(j * 10) / 10)} جزء`; }
    if (w < 0.38) return 'ربع صفحة تقريبًا';
    if (w < 0.7) return 'نصف صفحة تقريبًا';
    return `≈ ${num(Math.round(w * 2) / 2)} صفحة`;
  },
  ayahRef(g) { const r = Q.ref(g); return `${Q.SU[r.s].name} ${num(r.a)}`; },
  dur(sec) { sec = Math.round(sec); return `${num(Math.floor(sec / 60))}:${String(sec % 60).padStart(2, '0').replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])}`; },
  size(b) { return b > 1048576 ? num(Math.round(b / 104857.6) / 10) + ' م.ب' : num(Math.max(1, Math.round(b / 1024))) + ' ك.ب'; },
  date(ds, opt) { return new Date(ds + 'T12:00:00').toLocaleDateString('ar-EG', opt || { weekday: 'long', day: 'numeric', month: 'long' }); },
  ts(t) { return new Date(t).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); },
  hijri(ds) {
    try { return new Date(ds + 'T12:00:00').toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  },
};

/* ===== dates ===== */
const DT = {
  str(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  today() { return DT.str(new Date()); },
  add(ds, n) { const d = new Date(ds + 'T12:00:00'); d.setDate(d.getDate() + n); return DT.str(d); },
  dow(ds) { return new Date(ds + 'T12:00:00').getDay(); },
  num(ds) { return Math.round(Date.UTC(+ds.slice(0, 4), +ds.slice(5, 7) - 1, +ds.slice(8, 10)) / 864e5); },
  weekStart(ds) { return DT.add(ds, -((DT.dow(ds) + 1) % 7)); }, // Saturday
};

/* ===== persistent state ===== */
const Store = (() => {
  const KEY = 'husoon.v1';
  const defaults = () => ({
    v: 1, setup: false, name: '', method: 'husoon',
    cfg: {
      newAmt: 1, dir: 'fwd', memDays: [1, 1, 1, 1, 0, 0, 1], // Sun..Sat
      nearPages: 20, farAmt: 20, tilawaAmt: 40, listenAmt: 10, repeat: 20, linkRepeat: 20,
      tracks: { tilawa: 1, listen: 1, weekly: 1, nightly: 1, pre: 1, new: 1, near: 1, far: 1, srs: 0, manzil: 0 },
      reciter: 'Husary_64kbps', playRepeat: 1, playGap: 0,
    },
    mem: new Array(Q.N).fill(0),
    ptr: { far: 0, tilawa: 0, listen: 0, manzil: 0 },
    days: {}, week: null, srs: [],
    notes: [], marks: {}, recs: [], files: [],
    cats: { notes: ['عامة', 'تدبّر', 'تفسير', 'متشابهات', 'أخطاء التلاوة', 'تجويد'], marks: ['مواضع الخطأ', 'المتشابهات', 'علامات القراءة'] },
    khatma: null, khatmaDone: 0,
    stats: { reps: 0, testOk: 0, testAll: 0, focusMin: 0 },
    badges: {},
    reminders: [
      { h: 5, m: 30, on: 0, label: 'ورد الحفظ الجديد' },
      { h: 17, m: 0, on: 0, label: 'ورد المراجعة' },
      { h: 21, m: 30, on: 0, label: 'التحضير الليلي' },
    ],
    ui: { theme: 'auto', font: 26, page: 1, hide: 'all', edition: 'text', tafsir: 'ar-tafsir-al-mukhtasar' },
  });
  let S = defaults(), timer = null;
  const merge = (base, saved) => {
    for (const k in saved) {
      if (saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && k !== 'days' && k !== 'marks' && k !== 'badges') merge(base[k], saved[k]);
      else base[k] = saved[k];
    }
    return base;
  };
  const load = raw => {
    S = defaults();
    try {
      const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (o && o.v === 1) merge(S, o);
      if (!Array.isArray(S.mem) || S.mem.length !== Q.N) S.mem = new Array(Q.N).fill(0);
      for (const g in S.marks) { // older versions stored 'e' / 'm'
        if (S.marks[g] === 'e') S.marks[g] = 'مواضع الخطأ'; else if (S.marks[g] === 'm') S.marks[g] = 'المتشابهات';
        if (!S.cats.marks.includes(S.marks[g])) S.cats.marks.push(S.marks[g]);
      }
    } catch (e) { /* keep defaults */ }
    return S;
  };
  const flush = () => { timer = null; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.error(e); } };
  return {
    get S() { return S; },
    init() { let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) {} return load(raw); },
    save() { if (!timer) timer = setTimeout(flush, 250); },
    flush,
    replace(obj) { load(obj); flush(); },
    reset() { S = defaults(); flush(); },
    defaults,
  };
})();
