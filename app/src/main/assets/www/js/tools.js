'use strict';
/* ===== Helper tools for the hafiz ===== */
const Tools = (() => {
  const S = () => Store.S;
  const todayNew = () => { const t = Plan.day().tasks.find(x => x.t === 'new'); return t ? t.r : null; };
  const textBox = (gids, hidden) => `<div class="qbox ${hidden ? 'hid' : ''}" data-a="qboxToggle">${gids.map(g => W.ayah(g, true)).join(' ')}</div>`;
  Act.qboxToggle = el => el.classList.toggle('hid');
  const screenOn = on => { if (Native && Native.keepScreenOn) Native.keepScreenOn(on); };

  /* ---------- tools home ---------- */
  const LIST = [
    ['toolTakrar', 'repeat', 'جلسة التكرار والربط', 'تكرار كل آية ثم ربط الآيات خطوة بخطوة'],
    ['toolCounter', 'target', 'عدّاد التكرار', 'عدّ مرات تكرارك لأي مقطع'],
    ['toolTest', 'help', 'اختبر حفظك', 'أكمل من حيث تقف الآية'],
    ['toolListen', 'headphones', 'الاستماع والترديد', 'قارئ متقن مع تكرار الآية والمقطع'],
    ['toolRecite', 'mic', 'سمِّع وسجّل', 'أخفِ النص وسجّل تسميعك ثم طابقه'],
    ['toolMarks', 'bookmark', 'العلامات المرجعية', 'علاماتك مقسّمة كما تحب'],
    ['toolKhatma', 'book', 'ختمة التلاوة', 'تابع ختمتك وورد قراءتك اليومي'],
    ['toolSearch', 'search', 'البحث في المصحف', 'ابحث عن كلمة ولو بلا تشكيل'],
    ['toolTafsir', 'text', 'التفاسير', 'الطبري وابن كثير والبغوي والمختصر…'],
    ['toolDownloads', 'download', 'التحميلات', 'تلاوات وتفاسير وطبعات دون إنترنت'],
    ['toolTimer', 'timer', 'مؤقّت التركيز', 'جلسة حفظ بلا مشتّتات'],
    ['toolGuide', 'book', 'دليل الطرق', 'شرح الحصون الخمسة وبقية الطرق'],
  ];
  UI.screens.tools = root => {
    root.innerHTML = `<header class="top"><h1>أدوات الحافظ</h1><p>كل ما يعينك أثناء الحفظ والمراجعة</p></header>
      <div class="tgrid">${LIST.map(([a, i, t, d]) => `<button class="tcard" data-a="${a}"><span class="tic">${ic(i)}</span><b>${t}</b><small>${d}</small></button>`).join('')}</div><div class="sp"></div>`;
  };

  /* ---------- repetition counter ---------- */
  const C = { ranges: null, target: 20, n: 0, rounds: 0 };
  const cntBody = () => `${W.ring(C.n / C.target, 210, num(C.n), `من ${num(C.target)}`)}`;
  const counter = o => {
    if (o && o.ranges) { C.ranges = o.ranges; C.n = 0; C.rounds = 0; }
    C.target = S().cfg.repeat;
    UI.push('عدّاد التكرار', root => {
      const gids = C.ranges ? Q.expand(C.ranges).slice(0, 40) : [];
      root.innerHTML = `<div class="pad">
        ${C.ranges ? `<p class="mut c">${F.ranges(C.ranges)}</p>${textBox(gids)}` : '<p class="mut c">عدّاد حر — افتحه من المصحف ليظهر نص المقطع هنا.</p>'}
        <p class="lbl">الهدف</p>${W.chips('cntTarget', [[3, '٣'], [5, '٥'], [7, '٧'], [10, '١٠'], [20, '٢٠'], [40, '٤٠'], [100, '١٠٠']], C.target)}
        <button class="bigtap" id="cnt" data-a="cntTap">${cntBody()}</button>
        <p class="c mut sm">تُتجاهل الضغطة المكرّرة خطأً خلال أقل من ثانية.</p><p class="c mut" id="cnt-r">الجولات المكتملة: ${num(C.rounds)} · مجموع تكرارك: ${num(S().stats.reps)}</p>
        <div class="row gap"><button class="btn grow" data-a="cntReset">${ic('refresh')} تصفير</button></div></div>`;
      screenOn(true);
    }, () => screenOn(false));
  };
  let lastTap = 0;
  const dbl = () => { const n = Date.now(); if (n - lastTap < 700) return true; lastTap = n; return false; }; // ignore accidental double taps
  Act.cntTap = () => {
    if (dbl()) return;
    C.n++; S().stats.reps++; Store.save(); UI.vibrate(15);
    if (C.n >= C.target) { C.rounds++; UI.vibrate([80, 60, 160]); UI.toast('أتممت العدد المطلوب، أحسنت'); $('#cnt').innerHTML = cntBody(); C.n = 0; Badges.check(); }
    else $('#cnt').innerHTML = cntBody();
    $('#cnt-r').textContent = `الجولات المكتملة: ${num(C.rounds)} · مجموع تكرارك: ${num(S().stats.reps)}`;
  };
  Act.cntTarget = el => { S().cfg.repeat = C.target = +el.dataset.v; C.n = 0; Store.save(); UI.refresh(); };
  Act.cntReset = () => { C.n = 0; C.rounds = 0; UI.refresh(); };
  Act.toolCounter = () => { C.ranges = null; C.n = 0; C.rounds = 0; counter(); };

  /* ---------- guided repeat & link session ---------- */
  const K = { steps: [], i: 0, n: 0, ranges: null };
  const buildSteps = (gids, n, m) => {
    const st = [];
    for (let i = 0; i < gids.length; i += 4) {
      const grp = gids.slice(i, i + 4);
      grp.forEach(g => st.push({ g: [g], n, k: 'آية' }));
      if (grp.length > 1) st.push({ g: grp, n: m, k: 'ربط المجموعة' });
      if (i > 0) st.push({ g: gids.slice(0, i + grp.length), n: m, k: 'ربط من أول المقطع' });
    }
    if (gids.length > 1) st.push({ g: gids, n: 3, k: 'تسميع المقطع كاملًا غيبًا', hid: true });
    return st;
  };
  const takBody = () => {
    const s = K.steps[K.i];
    if (!s) return `<div class="pad c"><div class="cele">${ic('award')}<b>أتممت الجلسة، بارك الله فيك</b><p>سمِّع المقطع الآن غيبًا وسجّله، ثم علّمه محفوظًا من صفحة «اليوم».</p></div>
      <div class="col gap"><button class="btn pri" data-a="takRecite">${ic('mic')} سمِّع وسجّل الآن</button><button class="btn" data-a="back">إنهاء</button></div></div>`;
    const label = s.g.length === 1 ? F.ayahRef(s.g[0]) : `${F.ayahRef(s.g[0])} ← ${F.ayahRef(s.g[s.g.length - 1])}`;
    return `<div class="pad">
      <div class="prog"><i style="width:${K.i / K.steps.length * 100}%"></i></div>
      <p class="c"><span class="tag">${s.k}</span> <span class="mut">الخطوة ${num(K.i + 1)} من ${num(K.steps.length)} · ${label}</span></p>
      ${textBox(s.g, s.hid || K.n >= Math.ceil(s.n * 0.7))}
      <p class="c mut sm">${s.hid || K.n >= Math.ceil(s.n * 0.7) ? 'النص مخفي لتقرأ من حفظك — اضغطه للتحقق' : 'اقرأ نظرًا بتركيز، وسيُخفى النص في المرات الأخيرة'}</p>
      <button class="bigtap" data-a="takTap">${W.ring(K.n / s.n, 190, num(K.n), `من ${num(s.n)}`)}</button>
      <div class="row gap"><button class="btn grow" data-a="takPrev">${ic('prev')} السابقة</button><button class="btn grow" data-a="takSkip">تخطَّ ${ic('next')}</button></div></div>`;
  };
  const takStart = () => {
    const c = S().cfg;
    K.steps = buildSteps(Q.expand(K.ranges), c.repeat, c.linkRepeat); K.i = 0; K.n = 0;
    UI.push('جلسة التكرار والربط', root => { root.innerHTML = takBody(); screenOn(true); }, () => screenOn(false));
  };
  const takrar = ranges => {
    K.ranges = ranges || todayNew();
    const c = S().cfg, opts = [[3, '٣'], [5, '٥'], [10, '١٠'], [20, '٢٠'], [40, '٤٠']];
    UI.sheet(`<h3>جلسة التكرار والربط</h3>
      ${K.ranges ? `<p class="mut">${F.ranges(K.ranges)} · ${F.amount(Q.weight(K.ranges))}</p>` : rangePick('tk')}
      <p class="lbl">تكرار كل آية</p>${W.chips('takN', opts, c.repeat)}
      <p class="lbl">تكرار الربط</p>${W.chips('takM', opts, c.linkRepeat)}
      <p class="mut sm">تكرّر كل آية، ثم تربط كل أربع آيات، ثم تربط من أول المقطع حتى تتمّه.</p>
      <button class="btn pri grow" data-a="takGo">ابدأ الجلسة</button>`);
  };
  Act.takN = el => { S().cfg.repeat = +el.dataset.v; Store.save(); takrar(K.ranges); };
  Act.takM = el => { S().cfg.linkRepeat = +el.dataset.v; Store.save(); takrar(K.ranges); };
  Act.takGo = () => { if (!K.ranges) K.ranges = readRange('tk'); if (!K.ranges) return; UI.closeSheet(); takStart(); };
  Act.takTap = () => {
    if (dbl()) return;
    const s = K.steps[K.i]; K.n++; S().stats.reps++; Store.save(); UI.vibrate(15);
    if (K.n >= s.n) { K.i++; K.n = 0; UI.vibrate([80, 60, 160]); Badges.check(); }
    UI.refresh();
  };
  Act.takSkip = () => { K.i = Math.min(K.i + 1, K.steps.length); K.n = 0; UI.refresh(); };
  Act.takPrev = () => { K.i = Math.max(K.i - 1, 0); K.n = 0; UI.refresh(); };
  Act.takRecite = () => { const r = K.ranges; Mushaf.open({ ranges: r, title: 'تسميع', hide: true }); Rec.start({ label: 'تسميع — ' + F.ranges(r), g: r[0][0] }); };
  Act.toolTakrar = () => takrar(null);

  /* ---------- range picker (surah + from/to ayah) ---------- */
  const rangePick = id => {
    const s = Q.surahOf[Q.pageRange(Mushaf.R.page)[0]];
    return `<div class="rpick"><label>السورة ${W.surahSelect(id + '-s', s, `data-c="rpSurah" data-id="${id}"`)}</label>
      <label>من الآية <input type="number" id="${id}-a" value="1" min="1" inputmode="numeric"></label>
      <label>إلى الآية <input type="number" id="${id}-b" value="${Q.SU[s].count}" min="1" inputmode="numeric"></label></div>`;
  };
  Chg.rpSurah = el => { $('#' + el.dataset.id + '-a').value = 1; $('#' + el.dataset.id + '-b').value = Q.SU[+el.value].count; };
  const readRange = id => {
    const s = +$('#' + id + '-s').value, n = Q.SU[s].count;
    const a = Math.max(1, Math.min(n, +$('#' + id + '-a').value || 1)), b = Math.max(a, Math.min(n, +$('#' + id + '-b').value || n));
    return [[Q.gid(s, a), Q.gid(s, b)]];
  };

  /* ---------- self test ---------- */
  const T = { pool: [], g: -1, shown: 0, ok: 0, all: 0, label: '' };
  const pick = () => { T.g = T.pool.length ? T.pool[Math.floor(Math.random() * T.pool.length)] : -1; T.shown = 0; };
  const mkPool = ranges => {
    const m = S().mem, out = [];
    const add = g => { if (m[g] && g + 1 < Q.N && m[g + 1] && Q.surahOf[g] === Q.surahOf[g + 1]) out.push(g); };
    if (ranges) for (const g of Q.expand(ranges)) add(g); else for (let g = 0; g < Q.N; g++) add(g);
    return out;
  };
  const test = ranges => {
    T.pool = mkPool(ranges); T.label = ranges ? F.ranges(ranges) : 'كل المحفوظ'; T.ok = 0; T.all = 0; pick();
    UI.push('اختبر حفظك', root => {
      if (T.g < 0) { root.innerHTML = W.empty('help', 'لا يوجد محفوظ للاختبار', 'علّم ما تحفظه من الإعدادات أو أنجز ورد الحفظ الجديد أولًا.'); return; }
      const nexts = [];
      for (let k = 1; k <= T.shown; k++) { const g = T.g + k; if (g < Q.N && Q.surahOf[g] === Q.surahOf[T.g]) nexts.push(g); }
      root.innerHTML = `<div class="pad">
        <p class="c mut">${esc(T.label)} · النتيجة: ${num(T.ok)} من ${num(T.all)}</p>
        <p class="lbl">اتلُ غيبًا ما بعد قوله تعالى:</p>
        <div class="qbox">${W.ayah(T.g)}</div>
        ${T.shown ? `<p class="lbl">الجواب (${F.ayahRef(T.g + 1)} · ص ${num(Q.pageOf[T.g + 1])}):</p><div class="qbox ans">${nexts.map(g => W.ayah(g, true)).join(' ')}</div>
          <div class="row gap"><button class="btn pri grow" data-a="testGrade" data-v="1">${ic('check')} أصبت</button><button class="btn danger grow" data-a="testGrade" data-v="0">${ic('x')} أخطأت</button></div>
          <button class="btn grow mt8" data-a="testMore">أظهر آية أخرى</button>`
          : `<button class="btn pri grow" data-a="testMore">${ic('eye')} أظهر الجواب</button><button class="btn grow mt8" data-a="testSkip">سؤال آخر</button>`}
        <p class="mut sm c mt8">عند الخطأ تُضاف الآية إلى «مواضع الخطأ» لتراجعها.</p></div>`;
    });
  };
  Act.testMore = () => { T.shown++; UI.refresh(); };
  Act.testSkip = () => { pick(); UI.refresh(); };
  Act.testGrade = el => {
    const ok = el.dataset.v === '1'; T.all++; S().stats.testAll++;
    if (ok) { T.ok++; S().stats.testOk++; } else { S().marks[T.g + 1] = S().marks[T.g + 1] || S().cats.marks[0] || 'مواضع الخطأ'; }
    Store.save(); Badges.check(); pick(); UI.refresh();
  };
  Act.toolTest = () => {
    const near = Plan.nearSet();
    UI.sheet(`<h3>اختبر حفظك</h3><div class="col gap">
      <button class="btn pri" data-a="testScope" data-v="all">كل المحفوظ</button>
      ${near.length ? '<button class="btn" data-a="testScope" data-v="near">المحفوظ القريب</button>' : ''}
      <p class="lbl">أو اختر سورة</p>${rangePick('ts')}<button class="btn" data-a="testScope" data-v="pick">اختبرني في هذا المقطع</button></div>`);
  };
  Act.testScope = el => {
    const v = el.dataset.v, r = v === 'near' ? Q.toRanges(Plan.nearSet()) : v === 'pick' ? readRange('ts') : null;
    UI.closeSheet(); test(r);
  };

  /* ---------- listening ---------- */
  const L = { loop: 1 };
  const listen = () => UI.push('الاستماع والترديد', root => {
    const c = S().cfg, tasks = Plan.day().tasks.filter(t => !t.done);
    root.innerHTML = `<div class="pad">
      <label class="fld">القارئ<select data-c="lsReciter">${RECITERS.map(([v, l]) => `<option value="${v}" ${v === c.reciter ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <p class="lbl">تكرار كل آية</p>${W.chips('lsEach', [[1, 'مرة'], [2, '٢'], [3, '٣'], [5, '٥'], [10, '١٠']], c.playRepeat)}
      <p class="lbl">تكرار المقطع كله</p>${W.chips('lsLoop', [[1, 'مرة'], [2, '٢'], [3, '٣'], [5, '٥'], [10, '١٠']], L.loop)}
      <p class="lbl">مهلة الترديد بعد كل آية</p>${W.chips('lsGap', [[0, 'بلا مهلة'], [1, 'بقدر الآية'], [2, 'ضعف الآية']], c.playGap)}
      <p class="lbl">المقطع</p>${rangePick('ls')}
      <button class="btn pri grow" data-a="lsPlay">${ic('play')} شغّل المقطع</button>
      ${tasks.length ? `<p class="lbl">أو من ورد اليوم</p><div class="col gap">${tasks.map(t => `<button class="btn" data-a="lsTask" data-i="${Plan.day().tasks.indexOf(t)}">${ic('headphones')} ${Plan.trackTitle(t.t)} — ${F.ranges(t.r)}</button>`).join('')}</div>` : ''}
      <p class="mut sm c mt8">الاستماع يحتاج اتصالًا بالإنترنت (التلاوات من موقع EveryAyah).</p></div><div class="sp"></div>`;
  });
  Chg.lsReciter = el => { S().cfg.reciter = el.value; Store.save(); };
  Act.lsEach = el => { S().cfg.playRepeat = +el.dataset.v; Store.save(); UI.refresh(); };
  Act.lsLoop = el => { L.loop = +el.dataset.v; UI.refresh(); };
  Act.lsGap = el => { S().cfg.playGap = +el.dataset.v; Store.save(); UI.refresh(); };
  Act.lsPlay = () => Player.play(readRange('ls'), { loop: L.loop });
  Act.lsTask = el => Player.play(Plan.day().tasks[+el.dataset.i].r, { loop: L.loop });
  Act.toolListen = listen;

  Act.toolRecite = () => {
    UI.sheet(`<h3>سمِّع وسجّل</h3><p class="mut">يُفتح المصحف والنص مخفي ويبدأ التسجيل؛ اتلُ من حفظك ثم أوقف التسجيل واستمع له والنص ظاهر لتكتشف أخطاءك.</p>
      ${rangePick('rc')}<button class="btn pri grow" data-a="reciteGo">${ic('mic')} ابدأ التسميع</button>`);
  };
  Act.reciteGo = () => { const r = readRange('rc'); UI.closeSheet(); Mushaf.open({ ranges: r, title: 'تسميع', hide: true }); Rec.start({ label: 'تسميع — ' + F.ranges(r), g: r[0][0] }); };

  /* ---------- bookmarks in user-defined groups ---------- */
  let mkCat = '';
  Act.toolMarks = () => UI.push('العلامات المرجعية', root => {
    const all = Object.keys(S().marks).map(Number).sort((a, b) => a - b), cats = S().cats.marks;
    if (mkCat && !cats.includes(mkCat)) mkCat = '';
    const ks = all.filter(g => !mkCat || S().marks[g] === mkCat);
    root.innerHTML = `<div class="pad">${W.chips('mkCat', [['', `الكل (${num(all.length)})`]].concat(cats.map(c => [c, `${c} (${num(all.filter(g => S().marks[g] === c).length)})`])), mkCat)}
      <button class="btn sm mt8" data-a="catsManage" data-k="marks">${ic('folder')} إدارة التقسيمات</button>
      <div class="mt8">${ks.length ? ks.map(g => `<div class="card mk"><div class="row"><span class="tag ${S().marks[g] === cats[0] ? 'red' : ''}">${esc(S().marks[g])}</span><b class="grow">${F.ayahRef(g)}</b>
        <button class="ib sm" data-a="mkOpen" data-g="${g}">${ic('book')}</button><button class="ib sm" data-a="mkDel" data-g="${g}">${ic('trash')}</button></div><p class="qline">${W.ayah(g)}</p></div>`).join('')
        + `<button class="btn pri grow" data-a="mkTest">${ic('target')} اختبرني في هذه المواضع</button>`
      : W.empty('bookmark', 'لا علامات هنا', 'اضغط أي آية في المصحف ثم «علامة مرجعية» واختر التقسيمة أو أنشئ تقسيمة باسمك.')}</div></div><div class="sp"></div>`;
  });
  Act.mkCat = el => { mkCat = el.dataset.v; UI.refresh(); };
  Act.mkOpen = el => Mushaf.open({ ranges: [[+el.dataset.g, +el.dataset.g]], title: S().marks[+el.dataset.g] || 'علامة' });
  Act.mkDel = el => { delete S().marks[+el.dataset.g]; Store.save(); UI.refresh(); };
  Act.mkTest = () => { // ask about the ayah before each marked one
    const gs = Object.keys(S().marks).map(Number).filter(g => !mkCat || S().marks[g] === mkCat).map(g => g - 1).filter(g => g >= 0).sort((a, b) => a - b);
    test(Q.toRanges(gs));
    if (T.g < 0) { UI.pop(); UI.toast('علّم هذه الآيات محفوظةً أولًا لتُختبر فيها'); }
  };

  /* ---------- focus timer ---------- */
  const M = { min: 15, left: 15 * 60, t: null };
  const tmBody = () => W.ring(1 - M.left / (M.min * 60), 210, F.dur(M.left), M.t ? 'ركّز…' : 'جاهز');
  const tmStop = () => { clearInterval(M.t); M.t = null; screenOn(false); };
  Act.toolTimer = () => UI.push('مؤقّت التركيز', root => {
    root.innerHTML = `<div class="pad"><p class="mut c">أغلق المشتّتات، وأقبل على وردك بقلب حاضر.</p>
      ${W.chips('tmSet', [[10, '١٠ د'], [15, '١٥ د'], [20, '٢٠ د'], [30, '٣٠ د'], [45, '٤٥ د']], M.min)}
      <div class="bigtap still" id="tm">${tmBody()}</div>
      <div class="row gap"><button class="btn pri grow" data-a="tmGo">${ic(M.t ? 'pause' : 'play')} ${M.t ? 'إيقاف مؤقت' : 'ابدأ'}</button><button class="btn grow" data-a="tmReset">${ic('refresh')} إعادة</button></div>
      <p class="c mut mt8">مجموع دقائق تركيزك: ${num(S().stats.focusMin)}</p></div>`;
  }, tmStop);
  Act.tmSet = el => { tmStop(); M.min = +el.dataset.v; M.left = M.min * 60; UI.refresh(); };
  Act.tmReset = () => { tmStop(); M.left = M.min * 60; UI.refresh(); };
  Act.tmGo = () => {
    if (M.t) { tmStop(); UI.refresh(); return; }
    if (M.left <= 0) M.left = M.min * 60;
    screenOn(true);
    let last = Date.now();
    M.t = setInterval(() => {
      const now = Date.now(); M.left -= (now - last) / 1000; last = now;
      if (M.left <= 0) { M.left = 0; tmStop(); S().stats.focusMin += M.min; Store.save(); beep(); UI.vibrate([300, 150, 300]); UI.toast('انتهت الجلسة، تقبّل الله منك'); if ($('#tm')) UI.refresh(); return; }
      if ($('#tm')) $('#tm').innerHTML = tmBody();
    }, 1000);
    UI.refresh();
  };

  /* ---------- methods guide ---------- */
  Act.toolGuide = () => UI.push('دليل طرق الحفظ', root => {
    root.innerHTML = `<div class="pad">${Object.entries(Plan.METHODS).map(([id, m]) => `<div class="card"><div class="row"><b class="grow">${m.name}</b><span class="tag">${m.tag}</span></div><p>${m.desc}</p>
      ${m.tracks ? `<ul class="tips">${Object.keys(m.tracks).map(k => `<li><b>${(m.labels || {})[k] || Plan.TRACKS[k].title}</b><span>${Plan.TRACKS[k].tip}</span></li>`).join('')}</ul>` : ''}
      ${id === Store.S.method ? '<span class="tag">خطتك الحالية</span>' : ''}</div>`).join('')}
      <div class="card"><b>وصايا عامة</b><ul class="tips"><li><span>احفظ من مصحف واحد لا تغيّره؛ فصورة الصفحة تعين على الحفظ.</span></li><li><span>صحّح قراءتك على شيخ متقن أو بالاستماع قبل أن تحفظ.</span></li><li><span>القليل الدائم خير من الكثير المنقطع؛ فلا تترك وردك ولو قلّ.</span></li><li><span>لا تتجاوز مقطعًا حتى تتقنه، واربط آخره بأول ما بعده.</span></li><li><span>اقرأ بمحفوظك في صلاتك؛ فهو من أقوى المثبّتات.</span></li></ul></div></div><div class="sp"></div>`;
  });

  return { counter, takrar, test, listen };
})();
