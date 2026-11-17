'use strict';
/* ===== Settings + first-run setup ===== */
const Settings = (() => {
  const S = () => Store.S;
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const AMT = [[0.25, 'ربع صفحة'], [0.5, 'نصف صفحة'], [1, 'صفحة'], [2, 'صفحتان'], [3, '٣ صفحات'], [5, '٥ صفحات']];
  const DIRS = [['fwd', 'من الفاتحة إلى الناس'], ['juzback', 'من جزء عمَّ نزولًا (٣٠ ثم ٢٩…)'], ['surahback', 'من الناس صعودًا سورةً سورة']];
  const BIG = [[5, 'ربع جزء'], [10, 'حزب'], [20, 'جزء'], [40, 'جزآن'], [60, '٣ أجزاء']];
  const changed = () => { S().week = null; Store.save(); Plan.rebuild(); };

  const methodCards = act => Object.entries(Plan.METHODS).map(([id, m]) => `<button class="mcard ${S().method === id ? 'on' : ''}" data-a="${act}" data-v="${id}"><div class="row"><b class="grow">${m.name}</b><span class="tag">${m.tag}</span></div><p>${m.desc}</p></button>`).join('');
  const planFields = () => {
    const c = S().cfg;
    return `<p class="lbl">مقدار الحفظ اليومي</p>${W.chips('setAmt', AMT, c.newAmt)}
      <p class="lbl">اتجاه الحفظ</p><div class="col gap">${DIRS.map(([v, l]) => `<button class="chip wide ${c.dir === v ? 'on' : ''}" data-a="setDir" data-v="${v}">${l}</button>`).join('')}</div>
      <p class="lbl">أيام الحفظ الجديد (بقية الأيام للمراجعة والتثبيت)</p><div class="chips">${DAYS.map((d, i) => `<button class="chip ${c.memDays[i] ? 'on' : ''}" data-a="setDay" data-v="${i}">${d}</button>`).join('')}</div>`;
  };
  const remFields = () => S().reminders.map((r, i) => `<div class="row rem"><label class="sw"><input type="checkbox" data-c="remOn" data-i="${i}" ${r.on ? 'checked' : ''}><i></i></label><span class="grow">${esc(r.label)}</span><input type="time" data-c="remTime" data-i="${i}" value="${String(r.h).padStart(2, '0')}:${String(r.m).padStart(2, '0')}"></div>`).join('');
  const syncRem = () => {
    Store.save();
    if (!(Native && Native.setReminders)) return;
    const on = S().reminders.filter(r => r.on).map(r => ({ h: r.h, m: r.m, title: r.label, text: 'حان وقت وردك من القرآن — لا تؤجّله' }));
    Native.setReminders(JSON.stringify(on));
  };
  Chg.remOn = el => { S().reminders[+el.dataset.i].on = el.checked ? 1 : 0; syncRem(); if (el.checked && !Native) UI.toast('التنبيهات تعمل داخل تطبيق أندرويد'); };
  Chg.remTime = el => { const [h, m] = el.value.split(':').map(Number); if (isNaN(h)) return; Object.assign(S().reminders[+el.dataset.i], { h, m }); syncRem(); };

  /* ---------- settings screen ---------- */
  const trackRow = (k, amtKey, opts) => {
    const c = S().cfg;
    return `<div class="trow"><div class="row"><label class="sw"><input type="checkbox" data-c="setTrack" data-k="${k}" ${c.tracks[k] ? 'checked' : ''}><i></i></label><b class="grow">${Plan.trackTitle(k)}</b></div>
      ${amtKey && c.tracks[k] ? `<div class="chips">${opts.map(([v, l]) => `<button class="chip ${c[amtKey] === v ? 'on' : ''}" data-a="setNum" data-k="${amtKey}" data-v="${v}">${l}</button>`).join('')}</div>` : ''}</div>`;
  };
  const screen = root => {
    const c = S().cfg, u = S().ui;
    root.innerHTML = `<div class="pad col gap">
      <section class="card"><h3>طريقة الحفظ</h3><div class="col gap">${methodCards('setMethod')}</div></section>
      <section class="card"><h3>الحفظ الجديد</h3>${planFields()}</section>
      <section class="card"><h3>الأوراد ومقاديرها</h3>
        ${trackRow('tilawa', 'tilawaAmt', BIG)}${trackRow('listen', 'listenAmt', BIG.slice(0, 3))}${trackRow('weekly')}${trackRow('pre')}${trackRow('new')}${trackRow('nightly')}
        ${trackRow('near', 'nearPages', [[5, '٥ صفحات'], [10, '١٠'], [20, '٢٠ (جزء)'], [40, '٤٠']])}${trackRow('far', 'farAmt', BIG)}${trackRow('srs')}${trackRow('manzil')}</section>
      <section class="card"><h3>محفوظك</h3><p class="mut">${num(Math.round(Plan.memPages() * 10) / 10)} صفحة محفوظة. حدّد الأجزاء والسور التي تحفظها لتدخل في المراجعة وتخرج من الحفظ الجديد.</p><button class="btn grow" data-a="openMem">${ic('edit')} تعديل المحفوظ</button></section>
      <section class="card"><h3>${ic('bell')} التنبيهات اليومية</h3>${remFields()}</section>
      <section class="card"><h3>المظهر</h3>${W.chips('setTheme', [['auto', 'تلقائي'], ['light', 'فاتح'], ['dark', 'داكن']], u.theme)}
        <label class="fld">اسمك (للتحية)<input type="text" data-c="setName" value="${esc(S().name)}" placeholder="اختياري"></label></section>
      <section class="card"><h3>النسخ الاحتياطي</h3><p class="mut">تحفظ النسخة خطتك وتقدّمك وملاحظاتك (دون التسجيلات والملفات).</p>
        <div class="row gap"><button class="btn grow" data-a="bkExport">${ic('download')} تصدير نسخة</button><button class="btn grow" data-a="bkImport">استيراد نسخة</button></div>
        <button class="btn danger grow mt8" data-a="resetAll">مسح كل البيانات والبدء من جديد</button></section>
      <section class="card about"><h3>عن التطبيق</h3><p>«حصون الحفظ» رفيقك في حفظ القرآن الكريم ومراجعته. يعمل دون إنترنت، وبياناتك كلها على جهازك فقط.</p>
        <p class="mut sm">نص المصحف: الرسم العثماني برواية حفص عن «موسوعة القرآن الكريم» QuranEnc.com (عبر quran-json، رخصة CC BY 4.0) دون أي تعديل. فهرس الصفحات والأجزاء: quran-meta (مصحف المدينة، ٦٠٤ صفحات). خط المصحف: خط حفص العثماني (KFGQPC HAFS Uthmanic Script) من مجمع الملك فهد لطباعة المصحف الشريف، دون تعديل. خط الواجهة: Tajawal (رخصة OFL). عرض PDF: ‏PDF.js. التلاوات الصوتية: EveryAyah.com.</p>
        <p class="mut sm">مقادير الأوراد اجتهادية قابلة للتعديل؛ فخذ من الخطة ما يناسب طاقتك ووقتك، واستشر شيخك.</p></section>
    </div><div class="sp"></div>`;
  };
  Act.openSettings = () => { UI.closeSheet(); UI.push('الإعدادات والخطة', screen); };
  Act.setMethod = el => {
    const id = el.dataset.v; if (id === S().method) return;
    UI.confirm(`الانتقال إلى «${Plan.METHODS[id].name}»؟ يبقى محفوظك وتقدّمك كما هو وتتغيّر أوراد اليوم.`, 'انتقل', () => { Plan.applyMethod(id); Plan.rebuild(); UI.refresh(); });
  };
  Act.setAmt = el => { S().cfg.newAmt = +el.dataset.v; changed(); obOrRefresh(); };
  Act.setDir = el => { S().cfg.dir = el.dataset.v; changed(); obOrRefresh(); };
  Act.setDay = el => { const i = +el.dataset.v; S().cfg.memDays[i] = S().cfg.memDays[i] ? 0 : 1; changed(); obOrRefresh(); };
  Act.setNum = el => { S().cfg[el.dataset.k] = +el.dataset.v; changed(); UI.refresh(); };
  Chg.setTrack = el => {
    const T = S().cfg.tracks; T[el.dataset.k] = el.checked ? 1 : 0;
    if (el.dataset.k === 'srs' && el.checked && !S().srs.length) Plan.seedSrs();
    S().method = Object.keys(Plan.METHODS).find(id => { const m = Plan.METHODS[id].tracks; return m && Object.keys(T).every(k => !!T[k] === !!m[k]); }) || 'custom';
    changed(); UI.refresh();
  };
  Act.setTheme = el => { S().ui.theme = el.dataset.v; Store.save(); UI.theme(); UI.refresh(); };
  Chg.setName = el => { S().name = el.value.trim(); Store.save(); };

  /* ---------- memorised editor ---------- */
  let memTab = 'j';
  const memBody = () => memTab === 'j'
    ? `<div class="jmap pick">${Array.from({ length: 30 }, (_, i) => { const f = Plan.rangeMemFrac(Q.juzRange(i + 1)); return `<button data-a="memJuz" data-v="${i + 1}" class="${f >= 0.999 ? 'full' : ''}" style="--f:${Math.round(f * 100)}%"><b>${num(i + 1)}</b></button>`; }).join('')}</div>`
    : `<div class="slist pick">${Q.SU.map((s, i) => { const f = Plan.rangeMemFrac(Q.surahRange(i)); return `<button data-a="memSurah" data-v="${i}" class="${f >= 0.999 ? 'on' : f > 0 ? 'part' : ''}"><span class="sn">${num(i + 1)}</span><b>${s.name}</b><small>${f >= 0.999 ? 'محفوظة' : f > 0 ? 'محفوظ ' + num(Math.round(f * 100)) + '٪' : num(s.count) + ' آية'}</small></button>`; }).join('')}</div>`;
  const memHtml = () => `<p class="mut">اضغط لتعليم الجزء أو السورة محفوظًا، واضغط ثانيةً للإلغاء. لتعليم آيات بعينها اضغط الآية في المصحف.</p>
    <div class="seg">${[['j', 'بالأجزاء'], ['s', 'بالسور']].map(([k, l]) => `<button class="${memTab === k ? 'on' : ''}" data-a="memTab" data-v="${k}">${l}</button>`).join('')}</div>
    <p class="c"><b>${num(Math.round(Plan.memPages() * 10) / 10)}</b> صفحة محفوظة (≈ ${num(Math.round(Plan.memPages() / 2) / 10)} جزء)</p><div id="membody">${memBody()}</div>`;
  const memRefresh = () => { const v = $('#view'), y = v.scrollTop, h = $('#memhost'); if (h) { h.innerHTML = memHtml(); v.scrollTop = y; } };
  const memToggle = r => { Plan.setMem(r, Plan.rangeMemFrac(r) < 0.999); if (S().setup) Plan.rebuild(); memRefresh(); };
  Act.memJuz = el => memToggle(Q.juzRange(+el.dataset.v));
  Act.memSurah = el => memToggle(Q.surahRange(+el.dataset.v));
  Act.memTab = el => { memTab = el.dataset.v; memRefresh(); };
  Act.openMem = () => UI.push('محفوظي', root => { root.innerHTML = `<div class="pad" id="memhost">${memHtml()}</div><div class="sp"></div>`; });

  /* ---------- backup ---------- */
  Act.bkExport = () => { Store.flush(); exportBlob(new Blob([JSON.stringify(S())], { type: 'application/json' }), `husoon-backup-${DT.today()}.json`); };
  Act.bkImport = () => { const i = $('#backup-in'); i.value = ''; i.click(); };
  $('#backup-in').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    let o; try { o = JSON.parse(await f.text()); } catch (err) { o = null; }
    if (!o || o.v !== 1 || !Array.isArray(o.mem) || o.mem.length !== Q.N) { UI.toast('هذا الملف ليس نسخة احتياطية صالحة'); return; }
    UI.confirm('استبدال بياناتك الحالية بالنسخة المستوردة؟', 'استبدل', async () => {
      const keep = async list => { const out = []; for (const x of list || []) if (await Blobs.get(x.id).catch(() => null)) out.push(x); return out; };
      o.recs = await keep(o.recs); o.files = await keep(o.files);
      Store.replace(o); UI.theme(); syncRem(); Plan.rebuild(); UI.go('today'); UI.toast('تم الاستيراد');
    }, true);
  });
  Act.resetAll = () => UI.confirm('سيُمسح كل شيء: الخطة والتقدّم والملاحظات. هل أنت متأكد؟', 'امسح الكل', () => {
    S().recs.concat(S().files).forEach(x => Blobs.del(x.id));
    Store.reset(); syncRem(); UI.theme(); start();
  }, true);

  /* ---------- first-run wizard ---------- */
  let step = 0;
  const obOrRefresh = () => { if (S().setup) UI.refresh(); else ob(); };
  const ob = () => {
    const v = $('#view'), y = v.scrollTop; document.body.classList.add('ob'); v.className = 'onb';
    const needPlan = !!Plan.METHODS[S().method].tracks?.new || S().method === 'custom';
    const steps = [
      () => `<div class="ob-hero"><div class="logo">${ic('book')}</div><p class="basm">${esc(Q.A[0])}</p><h1>حصون الحفظ</h1>
        <p>رفيقك اليومي لحفظ القرآن الكريم ومراجعته: خطة واضحة، وأوراد تُحصّن حفظك، وأدوات تعينك على الإتقان والمواظبة.</p></div>
        <label class="fld">بمَ نناديك؟<input type="text" data-c="setName" placeholder="اسمك (اختياري)" value="${esc(S().name)}"></label>`,
      () => `<h2>ماذا تحفظ الآن؟</h2><div id="memhost">${memHtml()}</div><p class="mut sm">إن لم تحفظ شيئًا بعد فتابع مباشرة.</p>`,
      () => `<h2>اختر طريقتك</h2><p class="mut">يمكنك تغييرها في أي وقت من الإعدادات.</p><div class="col gap">${methodCards('obMethod')}</div>`,
      () => needPlan ? `<h2>خطة الحفظ الجديد</h2>${planFields()}` : `<h2>ورد التثبيت</h2><p>ستراجع القرآن كاملًا كل أسبوع على تحزيب «فمي بشوق»، مع ورد استماع يومي. يمكنك إضافة أوراد أخرى من الإعدادات.</p>`,
      () => `<h2>ذكّرني بوردي</h2><p class="mut">المواظبة سرّ الحفظ؛ اختر أوقاتًا ثابتة لا تتغيّر.</p><div class="card">${remFields()}</div>
        <div class="card quote"><p class="q-hadith">«أحبّ الأعمال إلى الله أدومها وإن قلّ»</p><small>متفق عليه</small></div>`,
    ];
    v.innerHTML = `<div class="ob-dots">${steps.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div><div class="ob-body">${steps[step]()}</div>
      <div class="ob-nav">${step ? `<button class="btn" data-a="obPrev">السابق</button>` : ''}<button class="btn pri grow" data-a="obNext">${step === steps.length - 1 ? 'ابدأ على بركة الله' : 'التالي'}</button></div>`;
    v.scrollTop = y;
  };
  Act.obMethod = el => { Plan.applyMethod(el.dataset.v); ob(); };
  Act.obPrev = () => { step--; ob(); $('#view').scrollTop = 0; };
  Act.obNext = () => {
    if (step < 4) { step++; ob(); $('#view').scrollTop = 0; return; }
    const st = S(); st.setup = true;
    if (st.cfg.tracks.srs && !st.srs.length) Plan.seedSrs();
    st.week = null; delete st.days[DT.today()];
    Store.flush(); syncRem(); document.body.classList.remove('ob'); UI.go('today');
  };
  const start = () => {
    if (S().setup) { document.body.classList.remove('ob'); UI.go('today'); }
    else { step = 0; Plan.applyMethod(S().method); $('#tabs').innerHTML = ''; ob(); }
  };
  return { start, syncRem };
})();
