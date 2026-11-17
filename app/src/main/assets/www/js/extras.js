'use strict';
/* ===== search, tafsir, mushaf editions, downloads, khatma, user categories, pinch zoom ===== */

/* ---------- user-defined groups for notes and bookmarks ---------- */
const Cats = (() => {
  const S = () => Store.S;
  const TITLE = { notes: 'تقسيمات الملاحظات', marks: 'تقسيمات العلامات المرجعية' };
  const rename = (kind, from, to) => {
    const list = S().cats[kind], i = list.indexOf(from);
    if (i < 0 || !to || to === from) return;
    if (list.includes(to)) list.splice(i, 1); else list[i] = to; // renaming onto an existing name merges
    if (kind === 'notes') S().notes.forEach(n => { if (n.cat === from) n.cat = to; });
    else for (const g in S().marks) if (S().marks[g] === from) S().marks[g] = to;
  };
  const done = () => { Store.save(); document.dispatchEvent(new Event('catschange')); };
  const manage = kind => {
    const list = S().cats[kind];
    UI.sheet(`<h3>${TITLE[kind]}</h3><p class="mut sm">سمِّ التقسيمات كما تحب. تغيير الاسم ينتقل إلى كل ما بداخلها.</p>
      ${list.map((c, i) => `<div class="row"><input type="text" value="${esc(c)}" data-c="catRename" data-k="${kind}" data-i="${i}"><button class="ib sm" data-a="catDel" data-k="${kind}" data-i="${i}">${ic('trash')}</button></div>`).join('')}
      <div class="row"><input type="text" id="cat-new" placeholder="اسم تقسيمة جديدة"><button class="btn pri" data-a="catAdd" data-k="${kind}">${ic('plus')} أضف</button></div>
      <button class="btn grow" data-a="sheetClose">تم</button>`, () => UI.refresh());
  };
  Act.catsManage = el => manage(el.dataset.k);
  Chg.catRename = el => { const k = el.dataset.k; rename(k, S().cats[k][+el.dataset.i], el.value.trim()); done(); manage(k); };
  Act.catAdd = el => {
    const k = el.dataset.k, v = $('#cat-new').value.trim();
    if (!v) return;
    if (!S().cats[k].includes(v)) S().cats[k].push(v);
    done(); manage(k);
  };
  Act.catDel = el => {
    const k = el.dataset.k, name = S().cats[k][+el.dataset.i];
    const used = k === 'notes' ? S().notes.filter(n => n.cat === name).length : Object.values(S().marks).filter(v => v === name).length;
    const go = () => {
      S().cats[k].splice(+el.dataset.i, 1);
      if (k === 'marks') { for (const g in S().marks) if (S().marks[g] === name) delete S().marks[g]; }
      else { const fb = S().cats.notes[0] || 'عامة'; if (!S().cats.notes.length) S().cats.notes.push(fb); S().notes.forEach(n => { if (n.cat === name) n.cat = fb; }); }
      done(); manage(k);
    };
    if (!used) return go();
    UI.confirm(k === 'marks' ? `حذف «${name}» مع علاماتها (${num(used)})؟` : `حذف «${name}»؟ ستنتقل ملاحظاتها (${num(used)}) إلى أول تقسيمة.`, 'حذف', go, true);
  };
  // choose a bookmark group for an ayah
  const pickMark = g => {
    const cur = S().marks[g];
    UI.sheet(`<h3>${ic('bookmark')} علامة مرجعية</h3><small class="mut">${F.ayahRef(g)}</small>
      <div class="col gap">${S().cats.marks.map(c => `<button class="chip wide ${c === cur ? 'on' : ''}" data-a="markSet" data-g="${g}" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="row"><input type="text" id="mk-new" placeholder="تقسيمة جديدة باسمك"><button class="btn pri" data-a="markNew" data-g="${g}">أضف</button></div>
      ${cur ? `<button class="btn danger grow" data-a="markSet" data-g="${g}" data-v="">إزالة العلامة</button>` : ''}`);
  };
  const setMark = (g, v) => { if (v) S().marks[g] = v; else delete S().marks[g]; Store.save(); UI.closeSheet(); UI.refresh(); UI.toast(v ? 'أُضيفت العلامة إلى «' + v + '»' : 'أُزيلت العلامة'); };
  Act.markSet = el => setMark(+el.dataset.g, el.dataset.v);
  Act.markNew = el => { const v = $('#mk-new').value.trim(); if (!v) return; if (!S().cats.marks.includes(v)) S().cats.marks.push(v); setMark(+el.dataset.g, v); };
  return { manage, pickMark };
})();

/* ---------- pinch zoom for a scrollable box ---------- */
const Zoom = {
  attach(box, target, onChange) {
    let scale = 1, d0 = 0, s0 = 1;
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const set = (s, cx, cy) => {
      s = Math.max(1, Math.min(5, s));
      const r = box.getBoundingClientRect();
      cx = cx == null ? r.width / 2 : cx - r.left; cy = cy == null ? r.height / 2 : cy - r.top;
      const sx = Math.abs(box.scrollLeft), fx = (sx + cx) / scale, fy = (box.scrollTop + cy) / scale;
      target.style.width = s * 100 + '%'; scale = s;
      const nx = fx * s - cx, rtl = getComputedStyle(box).direction === 'rtl';
      box.scrollLeft = rtl ? -nx : nx; box.scrollTop = fy * s - cy;
    };
    box.addEventListener('touchstart', e => { if (e.touches.length === 2) { d0 = dist(e.touches); s0 = scale; } }, { passive: true });
    box.addEventListener('touchmove', e => {
      if (e.touches.length !== 2 || !d0) return;
      e.preventDefault();
      set(s0 * dist(e.touches) / d0, (e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
    }, { passive: false });
    box.addEventListener('touchend', e => { if (d0 && e.touches.length < 2) { d0 = 0; if (onChange) onChange(scale); } }, { passive: true });
    let lastTap = 0;
    box.addEventListener('click', e => { // double tap toggles zoom
      const n = Date.now();
      if (n - lastTap < 320) { set(scale > 1.2 ? 1 : 2.2, e.clientX, e.clientY); if (onChange) onChange(scale); lastTap = 0; } else lastTap = n;
    });
    return { get scale() { return scale; }, step(f) { set(scale * f); if (onChange) onChange(scale); } };
  },
};

/* ---------- generic download jobs (run inside the page) ---------- */
const DL = (() => {
  const jobs = {};
  const emit = id => document.dispatchEvent(new CustomEvent('dlchange', { detail: id }));
  const run = async (id, label, items, worker) => {
    if (jobs[id] && jobs[id].on) return;
    const j = jobs[id] = { label, total: items.length, done: 0, fail: 0, on: true, stop: false };
    let i = 0; emit(id);
    const next = async () => {
      while (i < items.length && !j.stop) {
        const it = items[i++];
        try { await worker(it); } catch (e) { j.fail++; }
        j.done++; emit(id);
      }
    };
    await Promise.all([next(), next(), next(), next()]);
    j.on = false; emit(id);
    if (!j.stop) UI.toast(j.fail ? `انتهى «${label}» مع تعذّر ${num(j.fail)} عنصر — أعد المحاولة لإكمالها` : `اكتمل تحميل «${label}»`);
  };
  const stop = id => { if (jobs[id]) jobs[id].stop = true; };
  // native jobs (audio) report through window.onDl
  window.onDl = (id, done, total, fail, fin) => {
    const j = jobs[id] || (jobs[id] = { label: id });
    Object.assign(j, { done, total, fail, on: !fin });
    emit(id);
    if (fin && !j.stop) UI.toast(fail ? `انتهى التحميل مع تعذّر ${num(fail)} ملف — أعد المحاولة لإكمالها` : 'اكتمل تحميل التلاوة');
  };
  const bar = id => {
    const j = jobs[id];
    if (!j || !j.on) return '';
    return `<div class="dlp"><div class="prog"><i style="width:${j.total ? j.done / j.total * 100 : 0}%"></i></div><div class="row"><small class="grow mut">${num(j.done)} / ${num(j.total)}${j.fail ? ' · تعذّر ' + num(j.fail) : ''}</small><button class="btn sm danger" data-a="dlStop" data-id="${esc(id)}">إيقاف</button></div></div>`;
  };
  Act.dlStop = el => { const id = el.dataset.id; stop(id); if (id.startsWith('au:') && Native && Native.dlCancel) Native.dlCancel(id); };
  return { run, stop, bar, jobs, get: id => jobs[id] };
})();

/* ---------- printed mushaf editions (page images) ---------- */
const Editions = (() => {
  const BASE = 'https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/';
  const LIST = [
    { id: 'text', name: 'النص التفاعلي (خط حفص العثماني)', note: 'يدعم الإخفاء والتظليل والضغط على الآيات — يعمل دون إنترنت' },
    { id: 'kfgqpc/hafs-wasat', ext: 'jpg', name: 'مصحف المدينة النبوية — مجمع الملك فهد (حفص)', mb: 180 },
    { id: 'ayat/hafs', ext: 'png', name: 'مصحف المدينة — نسخة «آيات» (حفص)', mb: 60 },
    { id: 'ayat/tajweed', ext: 'png', name: 'مصحف التجويد الملوَّن (حفص)', mb: 75 },
    { id: 'kfgqpc/warsh', ext: 'jpg', name: 'مصحف المدينة برواية ورش — مجمع الملك فهد', mb: 220, other: true },
    { id: 'ayat/warsh', ext: 'png', name: 'مصحف ورش — نسخة «آيات»', mb: 70, other: true },
  ];
  const get = id => LIST.find(e => e.id === id) || LIST[0];
  const key = (id, p) => `pg/${id}/${String(p).padStart(3, '0')}`;
  const remote = (e, p) => `${BASE}${e.id}/${p}.${e.ext}`;
  const fetchPage = async (e, p) => {
    const r = await fetch(remote(e, p)); if (!r.ok) throw new Error('http ' + r.status);
    const b = await r.blob(); await Blobs.put(key(e.id, p), b); return b;
  };
  const urls = new Map(); // small cache of object URLs
  const url = async (id, p) => {
    const k = key(id, p);
    if (urls.has(k)) return urls.get(k);
    const b = (await Blobs.get(k).catch(() => null)) || await fetchPage(get(id), p);
    const u = URL.createObjectURL(b); urls.set(k, u);
    if (urls.size > 8) { const first = urls.keys().next().value; URL.revokeObjectURL(urls.get(first)); urls.delete(first); }
    return u;
  };
  const count = id => Blobs.keys(`pg/${id}/`).then(k => k.length).catch(() => 0);
  const download = async id => {
    const e = get(id), have = new Set(await Blobs.keys(`pg/${id}/`).catch(() => []));
    const items = []; for (let p = 1; p <= 604; p++) if (!have.has(key(id, p))) items.push(p);
    if (!items.length) { UI.toast('هذه الطبعة محمّلة كاملة'); return; }
    DL.run('pg:' + id, e.name, items, p => fetchPage(e, p));
  };
  const remove = id => Blobs.delPrefix(`pg/${id}/`);
  return { LIST, get, url, count, download, remove };
})();

/* ---------- tafsir ---------- */
const Tafsir = (() => {
  const BASE = 'https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/';
  const LIST = [
    ['ar-tafsir-al-mukhtasar', 'المختصر في التفسير'], ['ar-tafsir-muyassar', 'التفسير الميسَّر'], ['ar-tafseer-al-saddi', 'تفسير السعدي'],
    ['ar-tafsir-ibn-kathir', 'تفسير ابن كثير'], ['ar-tafsir-al-tabari', 'تفسير الطبري'], ['ar-tafsir-al-baghawi', 'تفسير البغوي'],
    ['ar-tafseer-al-qurtubi', 'تفسير القرطبي'], ['ar-tafsir-al-jalalayn', 'تفسير الجلالين'], ['ar-tafseer-tahrir-al-tanwir', 'التحرير والتنوير (ابن عاشور)'],
    ['ar-tafsir-al-wasit', 'التفسير الوسيط (طنطاوي)'], ['adwa-al-bayan', 'أضواء البيان (الشنقيطي)'], ['fath-al-qadir-al-shawkani', 'فتح القدير (الشوكاني)'],
    ['tafsir-ibn-al-jawzi', 'زاد المسير (ابن الجوزي)'], ['tafsir-ibn-uthaymeen', 'تفسير ابن عثيمين'],
    ['asseraj-fi-bayan-gharib-alquran', 'السراج في بيان غريب القرآن'], ['al-i-rab-al-muyassar', 'الإعراب الميسَّر'],
  ];
  const name = slug => (LIST.find(t => t[0] === slug) || ['', slug])[1];
  const key = (slug, s) => `tf/${slug}/${String(s + 1).padStart(3, '0')}`;
  const clean = t => String(t || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  const fetchSurah = async (slug, s) => {
    const r = await fetch(`${BASE}${slug}/${s + 1}.json`); if (!r.ok) throw new Error('http ' + r.status);
    const raw = await r.json(), arr = raw.ayahs || raw, out = new Array(Q.SU[s].count).fill('');
    for (const x of arr) if (x && x.ayah >= 1 && x.ayah <= out.length) out[x.ayah - 1] = clean(x.text);
    await Blobs.put(key(slug, s), out); return out;
  };
  const surah = async (slug, s) => (await Blobs.get(key(slug, s)).catch(() => null)) || fetchSurah(slug, s);
  const count = slug => Blobs.keys(`tf/${slug}/`).then(k => k.length).catch(() => 0);
  const download = async (slug, only) => {
    const have = new Set(await Blobs.keys(`tf/${slug}/`).catch(() => []));
    const items = []; for (let s = 0; s < 114; s++) if ((only == null || only === s) && !have.has(key(slug, s))) items.push(s);
    if (!items.length) { UI.toast('محمّل من قبل'); return; }
    DL.run('tf:' + slug, name(slug), items, s => fetchSurah(slug, s));
  };
  const remove = slug => Blobs.delPrefix(`tf/${slug}/`);

  const V = { g: 0 };
  const body = async root => {
    const slug = Store.S.ui.tafsir, r = Q.ref(V.g), box = $('#tf-body', root); if (!box) return;
    box.innerHTML = '<p class="mut c">جارٍ التحميل…</p>';
    try {
      const arr = await surah(slug, r.s);
      if (Q.ref(V.g).a !== r.a || Store.S.ui.tafsir !== slug) return;
      let a = r.a - 1; while (a > 0 && !arr[a]) a--; // grouped ayahs are explained with an earlier one
      const txt = arr[a];
      box.innerHTML = txt ? `${a !== r.a - 1 ? `<p class="tag">تفسير هذه الآية مذكور مع الآية ${num(a + 1)}</p>` : ''}${txt.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('')}` : '<p class="mut c">لا يوجد تفسير لهذه الآية في هذا الكتاب.</p>';
    } catch (e) { box.innerHTML = `<div class="empty">${ic('download')}<b>تعذّر جلب التفسير</b><p>تحقّق من اتصال الإنترنت، أو حمّل هذا التفسير من «التحميلات» ليعمل دون إنترنت.</p></div>`; }
  };
  const open = g => {
    V.g = g == null ? Q.pageRange(Mushaf.R.page)[0] : g;
    UI.push('التفسير', root => {
      root.innerHTML = `<div class="pad"><small class="mut">${F.ayahRef(V.g)} · صفحة ${num(Q.pageOf[V.g])}</small><p class="qprev">${W.ayah(V.g)}</p>
        <select data-c="tfPick">${LIST.map(([v, l]) => `<option value="${v}" ${v === Store.S.ui.tafsir ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <div class="tfbody" id="tf-body"></div>
        <div class="row gap mt8"><button class="btn grow" data-a="tfStep" data-v="-1">${ic('prev')} السابقة</button><button class="btn" data-a="tfNote">${ic('edit')}</button><button class="btn" data-a="tfGo">${ic('book')}</button><button class="btn grow" data-a="tfStep" data-v="1">التالية ${ic('next')}</button></div>
        <button class="btn grow mt8" data-a="tfSave">${ic('download')} حمّل تفسير هذه السورة ليعمل دون إنترنت</button></div><div class="sp"></div>`;
      body(root);
    });
  };
  Chg.tfPick = el => { Store.S.ui.tafsir = el.value; Store.save(); body(document); };
  Act.tfStep = el => { V.g = Math.max(0, Math.min(Q.N - 1, V.g + +el.dataset.v)); UI.render(); };
  Act.tfNote = () => Journal.editNote(null, V.g);
  Act.tfGo = () => Mushaf.open({ ranges: [[V.g, V.g]], title: 'آية التفسير' });
  Act.tfSave = () => download(Store.S.ui.tafsir, Q.ref(V.g).s);
  Act.toolTafsir = () => open(null);
  return { LIST, name, open, count, download, remove };
})();

/* ---------- search (typed without tashkeel) ---------- */
const Search = (() => {
  let idx = null, loading = null, q = '';
  const load = () => loading || (loading = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'data/search.js';
    s.onload = () => { idx = window.QSEARCH.split('\n'); window.QSEARCH = null; res(); }; s.onerror = rej;
    document.head.appendChild(s);
  }));
  const find = query => {
    const n = bare(query); if (n.length < 2) return [];
    let out = []; for (let g = 0; g < idx.length; g++) if (idx[g].includes(n)) out.push(g);
    if (!out.length && n.includes(' ')) { const ws = n.split(' '); for (let g = 0; g < idx.length; g++) if (ws.every(w => idx[g].includes(w))) out.push(g); }
    return out;
  };
  const results = () => {
    const box = $('#sr-list'); if (!box) return;
    if (!idx) { box.innerHTML = '<p class="mut c">جارٍ تجهيز الفهرس…</p>'; load().then(results); return; }
    if (bare(q).length < 2) { box.innerHTML = '<p class="mut c">اكتب كلمة أو جزءًا من آية، ولا يلزم التشكيل ولا الهمزات.</p>'; return; }
    const r = find(q);
    box.innerHTML = `<p class="mut">${r.length ? `عدد الآيات: ${num(r.length)}${r.length > 150 ? ' — تُعرض أول ١٥٠' : ''}` : 'لا نتائج. جرّب كلمة أقصر أو رسمًا آخر.'}</p>` +
      r.slice(0, 150).map(g => `<article class="card mk" data-a="srOpen" data-g="${g}"><div class="row"><b class="grow">${F.ayahRef(g)}</b><small class="mut">ص ${num(Q.pageOf[g])} · الجزء ${num(Q.juzOf[g])}</small></div><p class="qline">${W.ayah(g)}</p></article>`).join('');
  };
  const open = () => UI.push('البحث في المصحف', root => {
    root.innerHTML = `<div class="pad"><input type="search" id="sr-q" placeholder="ابحث في القرآن…" data-i="srInput" value="${esc(q)}"><div id="sr-list" class="mt8"></div></div><div class="sp"></div>`;
    results(); if (!q) setTimeout(() => { const i = $('#sr-q'); if (i) i.focus(); }, 100);
  });
  let t;
  Chg.srInput = el => { q = el.value; clearTimeout(t); t = setTimeout(results, 220); };
  Act.srOpen = el => Mushaf.open({ ranges: [[+el.dataset.g, +el.dataset.g]], title: 'نتيجة البحث' });
  Act.toolSearch = open;
  return { open };
})();

/* ---------- recitation tilawa khatma ---------- */
const Khatma = (() => {
  const S = () => Store.S;
  const info = () => {
    const k = S().khatma; if (!k) return null;
    const today = DT.today(), elapsed = DT.num(today) - DT.num(k.start), left = 605 - k.page;
    const daysLeft = Math.max(1, k.days - elapsed), readToday = (k.log && k.log[today]) || 0;
    const quota = Math.max(1, Math.ceil((left + readToday) / daysLeft));
    return { k, left, daysLeft, readToday, quota, late: elapsed >= k.days, remainToday: Math.max(0, quota - readToday) };
  };
  const card = () => {
    const i = info(); if (!i) return '';
    return `<button class="method-chip" data-a="toolKhatma">${ic('book')}<span>ختمة التلاوة: <b>ص ${num(Math.min(i.k.page, 604))}</b> · ${i.remainToday ? `بقي من ورد اليوم ${num(i.remainToday)} ص` : 'أتممت ورد اليوم'}</span>${ic('next')}</button>`;
  };
  const advance = toPage => { // toPage = last page read
    const k = S().khatma; if (!k || toPage < k.page) return;
    const today = DT.today(); k.log = k.log || {};
    k.log[today] = (k.log[today] || 0) + (toPage - k.page + 1); k.page = toPage + 1;
    if (k.page > 604) {
      S().khatmaDone = (S().khatmaDone || 0) + 1; S().khatma = null; Store.save();
      UI.sheet(`<div class="cele" style="margin:0">${ic('award')}<b>ختمت القرآن تلاوةً، تقبّل الله منك</b><p>هذه ختمتك رقم ${num(S().khatmaDone)}. جدّد العهد وابدأ ختمة جديدة.</p></div><button class="btn pri grow" data-a="toolKhatma">ختمة جديدة</button>`);
      UI.vibrate([80, 60, 200]);
    } else { Store.save(); UI.toast(`سُجّلت قراءتك حتى صفحة ${num(toPage)}`); }
  };
  const screen = root => {
    const i = info();
    if (!i) {
      root.innerHTML = `<div class="pad"><div class="card quote" style="margin:0 0 12px"><p class="q-hadith">«اقرؤوا القرآن؛ فإنه يأتي يوم القيامة شفيعًا لأصحابه»</p><small>رواه مسلم</small></div>
        <h3>ابدأ ختمة تلاوة</h3><p class="mut">اختر المدة، ويقسّم التطبيق الورد اليومي ويعدّله تلقائيًا إن تقدّمت أو تأخّرت.</p>
        <p class="lbl">مدة الختمة</p>${W.chips('khDays', [[3, '٣ أيام'], [7, 'أسبوع'], [10, '١٠ أيام'], [15, '١٥ يومًا'], [30, 'شهر'], [60, 'شهران']], K.days)}
        <p class="mut c mt8">الورد اليومي ≈ ${num(Math.ceil(604 / K.days))} صفحة (${F.amount(604 / K.days)})</p>
        <label class="fld">البدء من صفحة<input type="number" id="kh-from" value="1" min="1" max="604" inputmode="numeric"></label>
        <button class="btn pri grow mt8" data-a="khStart">ابدأ الختمة</button>
        ${S().khatmaDone ? `<p class="c mut mt8">ختماتك السابقة: ${num(S().khatmaDone)}</p>` : ''}</div>`;
      return;
    }
    const k = i.k, p = Math.min(k.page, 604), r = Q.pageRange(p), end = Math.min(604, k.page + i.remainToday - 1);
    root.innerHTML = `<div class="pad col gap">
      <section class="card row gap">${W.ring((k.page - 1) / 604, 118, num(Math.round((k.page - 1) / 604 * 100)) + '٪', 'من الختمة')}
        <div class="grow col"><b class="big">${num(k.page - 1)} <small>/ ٦٠٤ صفحة</small></b><span class="mut">موضعك: ${F.ayahRef(r[0])} · الجزء ${num(Q.juzOf[r[0]])}</span>
        <span class="mut">${i.late ? 'انتهت المدة المحددة — أكمل على مهلك' : `بقي ${num(i.daysLeft)} يوم`}</span></div></section>
      <section class="card"><h3>ورد اليوم</h3>
        <p>${i.remainToday ? `من صفحة ${num(p)} إلى صفحة ${num(end)} — ${num(i.remainToday)} صفحة` : 'أتممت ورد اليوم، بارك الله فيك. يمكنك الاستزادة.'}</p>
        <p class="mut sm">قرأت اليوم ${num(i.readToday)} صفحة من ${num(i.quota)}.</p>
        <div class="prog mt8"><i style="width:${Math.min(100, i.readToday / i.quota * 100)}%"></i></div>
        <button class="btn pri grow" data-a="khRead">${ic('book')} تابع القراءة من صفحة ${num(p)}</button>
        <p class="mut sm c mt8">في المصحف اضغط «وصلت هنا» عند الصفحة التي انتهيت إليها.</p></section>
      <section class="card"><h3>تسجيل يدوي</h3><div class="row gap"><input type="number" id="kh-to" min="${p}" max="604" placeholder="قرأت حتى صفحة…" inputmode="numeric"><button class="btn pri" data-a="khSet">سجّل</button></div></section>
      <button class="btn danger" data-a="khCancel">إلغاء هذه الختمة</button>
      ${S().khatmaDone ? `<p class="c mut">ختماتك المكتملة: ${num(S().khatmaDone)}</p>` : ''}</div><div class="sp"></div>`;
  };
  const K = { days: 30 };
  Act.toolKhatma = () => { UI.closeSheet(); UI.push('ختمة التلاوة', screen); };
  Act.khDays = el => { K.days = +el.dataset.v; UI.refresh(); };
  Act.khStart = () => { const p = Math.max(1, Math.min(604, +$('#kh-from').value || 1)); S().khatma = { start: DT.today(), days: K.days, page: p, log: {} }; Store.save(); UI.refresh(); };
  Act.khRead = () => Mushaf.open({ page: Math.min(S().khatma.page, 604), khatma: true });
  Act.khSet = () => { const v = +$('#kh-to').value; if (v >= S().khatma.page && v <= 604) { advance(v); if (S().khatma) UI.refresh(); else UI.pop(); } else UI.toast('أدخل رقم صفحة بعد موضعك الحالي'); };
  Act.khCancel = () => UI.confirm('إلغاء الختمة الحالية؟', 'إلغاء الختمة', () => { S().khatma = null; Store.save(); UI.refresh(); }, true);
  return { card, info, advance };
})();

/* ---------- downloads screen ---------- */
const Downloads = (() => {
  const A = { kind: 'surah', n: 0 };
  const audioInfo = rec => { try { return Native && Native.dirInfo ? JSON.parse(Native.dirInfo('audio/' + rec)) : null; } catch (e) { return null; } };
  const audioHtml = () => {
    const rec = Store.S.cfg.reciter;
    if (!(Native && Native.dlStart)) return '<p class="mut">تحميل التلاوات متاح داخل تطبيق أندرويد.</p>';
    const inf = audioInfo(rec) || { n: 0, bytes: 0 };
    const opts = A.kind === 'surah' ? Q.SU.map((s, i) => `<option value="${i}" ${i === A.n ? 'selected' : ''}>${num(i + 1)}. ${s.name}</option>`).join('')
      : A.kind === 'juz' ? Array.from({ length: 30 }, (_, i) => `<option value="${i}" ${i === A.n ? 'selected' : ''}>الجزء ${num(i + 1)}</option>`).join('') : '';
    return `<label class="fld" style="margin-top:0">القارئ<select data-c="dlReciter">${RECITERS.map(([v, l]) => `<option value="${v}" ${v === rec ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <p class="lbl">ماذا تحمّل؟</p>${W.chips('dlKind', [['surah', 'سورة'], ['juz', 'جزء'], ['all', 'القرآن كاملًا']], A.kind)}
      ${opts ? `<select class="mt8" data-c="dlNum">${opts}</select>` : '<p class="mut sm mt8">القرآن كاملًا ٦٢٣٦ ملفًا وقد يتجاوز حجمه ١ غيغابايت؛ يُفضَّل اتصال Wi‑Fi وإبقاء التطبيق مفتوحًا.</p>'}
      <button class="btn pri grow mt8" data-a="dlAudio">${ic('download')} حمّل التلاوة</button><div id="dl-au">${DL.bar('au:' + rec)}</div>
      <p class="mut sm mt8">المحمَّل لهذا القارئ: ${num(inf.n)} آية (${F.size(inf.bytes)}). ما حُمّل يُشغَّل تلقائيًا دون إنترنت.</p>
      ${inf.n ? `<button class="btn sm danger" data-a="dlAudioDel">${ic('trash')} حذف تلاوات هذا القارئ</button>` : ''}`;
  };
  const row = (kind, id, title, sub, n, total) => `<div class="trow"><div class="row"><div class="grow"><b>${title}</b><small class="mut" style="display:block">${sub}${n ? ` · المحمَّل ${num(n)}/${num(total)}` : ''}</small></div>
    ${n >= total ? `<span class="tag">${ic('check')} كامل</span>` : `<button class="btn sm" data-a="dlGet" data-k="${kind}" data-id="${id}">${ic('download')}</button>`}
    ${n ? `<button class="ib sm" data-a="dlDel" data-k="${kind}" data-id="${id}">${ic('trash')}</button>` : ''}</div><div id="dl-${kind}-${id.replace(/\W/g, '_')}">${DL.bar(kind + ':' + id)}</div></div>`;
  const screen = async root => {
    root.innerHTML = `<div class="pad col gap"><section class="card"><h3>${ic('headphones')} التلاوات الصوتية</h3><div id="dl-audio">${audioHtml()}</div></section>
      <section class="card"><h3>${ic('text')} التفاسير</h3><p class="mut sm">يُحمَّل التفسير كاملًا (١١٤ سورة). الكتب المطوّلة كالطبري والقرطبي كبيرة الحجم.</p><div id="dl-tf"><p class="mut">…</p></div></section>
      <section class="card"><h3>${ic('image')} طبعات المصحف</h3><p class="mut sm">٦٠٤ صفحات مصوّرة لكل طبعة. اختر طبعة العرض من زر «العرض» في المصحف.</p><div id="dl-pg"><p class="mut">…</p></div></section>
      <p class="mut sm c">المصادر: التلاوات من EveryAyah.com، والتفاسير من مستودع tafsir_api (بيانات quran.com وQUL)، وصور الصفحات من QuranHub.</p></div><div class="sp"></div>`;
    const tf = await Promise.all(Tafsir.LIST.map(async ([s, n]) => row('tf', s, n, 'تفسير', await Tafsir.count(s), 114)));
    const pg = await Promise.all(Editions.LIST.filter(e => e.ext).map(async e => row('pg', e.id, e.name, `≈ ${num(e.mb)} م.ب${e.other ? ' · ترقيم الصفحات قد يخالف خطة الحفظ' : ''}`, await Editions.count(e.id), 604)));
    if ($('#dl-tf', root)) { $('#dl-tf', root).innerHTML = tf.join(''); $('#dl-pg', root).innerHTML = pg.join(''); }
  };
  Act.toolDownloads = () => { UI.closeSheet(); UI.push('التحميلات', screen); };
  Act.dlGet = el => { if (el.dataset.k === 'tf') Tafsir.download(el.dataset.id); else Editions.download(el.dataset.id); };
  Act.dlDel = el => UI.confirm('حذف هذا المحتوى المحمَّل من الجهاز؟', 'حذف', async () => { DL.stop(el.dataset.k + ':' + el.dataset.id); await (el.dataset.k === 'tf' ? Tafsir.remove(el.dataset.id) : Editions.remove(el.dataset.id)); UI.refresh(); }, true);
  Chg.dlReciter = el => { Store.S.cfg.reciter = el.value; Store.save(); Player.restart(); $('#dl-audio').innerHTML = audioHtml(); };
  Act.dlKind = el => { A.kind = el.dataset.v; A.n = 0; $('#dl-audio').innerHTML = audioHtml(); };
  Chg.dlNum = el => { A.n = +el.value; };
  Act.dlAudio = () => {
    const rec = Store.S.cfg.reciter, r = A.kind === 'surah' ? Q.surahRange(A.n) : A.kind === 'juz' ? Q.juzRange(A.n + 1) : [0, Q.N - 1];
    const items = []; for (let g = r[0]; g <= r[1]; g++) items.push({ u: Player.remote(rec, g), p: Player.local(rec, g) });
    const go = () => { const id = 'au:' + rec; DL.jobs[id] = { label: Player.recName(), total: items.length, done: 0, fail: 0, on: true }; Native.dlStart(id, JSON.stringify(items)); $('#dl-audio').innerHTML = audioHtml(); };
    if (A.kind === 'all') UI.confirm('تحميل القرآن كاملًا بصوت هذا القارئ؟ الحجم كبير ويستغرق وقتًا.', 'ابدأ التحميل', go); else go();
  };
  Act.dlAudioDel = () => UI.confirm('حذف كل التلاوات المحمَّلة لهذا القارئ؟', 'حذف', () => { Native.deleteDir('audio/' + Store.S.cfg.reciter); $('#dl-audio').innerHTML = audioHtml(); }, true);
  document.addEventListener('dlchange', e => {
    const id = e.detail, j = DL.get(id), [kind, rest] = [id.slice(0, 2), id.slice(3)];
    if (kind === 'au') { const el = $('#dl-au'); if (el) { if (j.on) el.innerHTML = DL.bar(id); else $('#dl-audio').innerHTML = audioHtml(); } return; }
    const el = $(`#dl-${kind}-${rest.replace(/\W/g, '_')}`);
    if (el) { if (j.on) el.innerHTML = DL.bar(id); else if (UI.depth) UI.refresh(); }
  });
  // reciter quick picker (from the mushaf and the player bar)
  const reciterSheet = ranges => {
    const c = Store.S.cfg;
    UI.sheet(`<h3>${ic('headphones')} الاستماع</h3>
      <label class="fld" style="margin-top:0">القارئ<select data-c="rpReciter">${RECITERS.map(([v, l]) => `<option value="${v}" ${v === c.reciter ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <p class="lbl">تكرار كل آية</p>${W.chips('rpEach', [[1, 'مرة'], [2, '٢'], [3, '٣'], [5, '٥'], [10, '١٠']], c.playRepeat)}
      ${ranges ? `<button class="btn pri grow" data-a="rpPlay">${ic('play')} شغّل — ${F.ranges(ranges)}</button>` : `<button class="btn pri grow" data-a="sheetClose">تم</button>`}
      <button class="btn grow" data-a="toolDownloads">${ic('download')} تحميل تلاوات للاستماع دون إنترنت</button>`);
    Act.rpPlay = () => { UI.closeSheet(); Player.play(ranges); };
    Act.rpEach = el => { c.playRepeat = +el.dataset.v; Store.save(); reciterSheet(ranges); };
  };
  Chg.rpReciter = el => { Store.S.cfg.reciter = el.value; Store.save(); Player.restart(); };
  Act.reciterPick = () => reciterSheet(null);
  return { reciterSheet };
})();
