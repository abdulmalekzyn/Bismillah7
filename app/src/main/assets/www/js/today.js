'use strict';
/* ===== Today: the daily wird of the chosen method ===== */
const QUOTES = [
  { g: [53, 17] }, { g: [14, 9] }, { g: [28, 49] }, { g: [37, 29] }, { g: [6, 204] }, { g: [53, 40] },
  { t: 'خيركم من تعلّم القرآن وعلّمه', s: 'رواه البخاري' },
  { t: 'اقرؤوا القرآن؛ فإنه يأتي يوم القيامة شفيعًا لأصحابه', s: 'رواه مسلم' },
  { t: 'الماهر بالقرآن مع السفرة الكرام البررة، والذي يقرأ القرآن ويتتعتع فيه وهو عليه شاقٌّ له أجران', s: 'متفق عليه' },
  { t: 'تعاهدوا القرآن، فوالذي نفسي بيده لهو أشدّ تفصّيًا من الإبل في عُقُلها', s: 'متفق عليه' },
  { t: 'أحبّ الأعمال إلى الله أدومها وإن قلّ', s: 'متفق عليه' },
  { t: 'يقال لصاحب القرآن: اقرأ وارتقِ ورتّل كما كنت ترتّل في الدنيا، فإن منزلتك عند آخر آية تقرؤها', s: 'رواه أبو داود والترمذي' },
  { t: 'إنما مثل صاحب القرآن كمثل صاحب الإبل المعقّلة؛ إن عاهد عليها أمسكها، وإن أطلقها ذهبت', s: 'متفق عليه' },
];

const Badges = (() => {
  const LIST = [
    ['d1', 'أول الغيث', 'أنجزت أول ورد لك', () => Plan.activeDays() >= 1],
    ['s3', 'ثلاثة أيام متتالية', 'مواظبة ٣ أيام', () => Plan.streak() >= 3],
    ['s7', 'أسبوع من المواظبة', 'مواظبة ٧ أيام', () => Plan.streak() >= 7],
    ['s30', 'شهر من المواظبة', 'مواظبة ٣٠ يومًا', () => Plan.streak() >= 30],
    ['s100', 'مئة يوم', 'مواظبة ١٠٠ يوم', () => Plan.streak() >= 100],
    ['p1', 'الصفحة الأولى', 'حفظت صفحة كاملة', () => Plan.memPages() >= 1],
    ['j1', 'جزء كامل', 'حفظت جزءًا من القرآن', () => Plan.memPages() >= 20],
    ['j5', 'خمسة أجزاء', 'حفظت ٥ أجزاء', () => Plan.memPages() >= 100],
    ['j10', 'ثلث القرآن', 'حفظت ١٠ أجزاء', () => Plan.memPages() >= 200],
    ['j15', 'نصف القرآن', 'حفظت ١٥ جزءًا', () => Plan.memPages() >= 302],
    ['j20', 'عشرون جزءًا', 'حفظت ٢٠ جزءًا', () => Plan.memPages() >= 400],
    ['j30', 'الختمة', 'أتممت حفظ القرآن كاملًا', () => Plan.memCount() >= Q.N],
    ['r1', 'أول تسميع مسجّل', 'سجّلت تلاوتك', () => Store.S.recs.length >= 1],
    ['n1', 'أول فائدة', 'دوّنت ملاحظة', () => Store.S.notes.length >= 1],
    ['c1000', 'ألف تكرار', 'كرّرت ١٠٠٠ مرة بالعدّاد', () => Store.S.stats.reps >= 1000],
    ['t20', 'ممتحِن نفسه', '٢٠ إجابة صحيحة في الاختبار', () => Store.S.stats.testOk >= 20],
  ];
  const check = () => {
    const b = Store.S.badges; let got = null;
    for (const [id, name, , fn] of LIST) if (!b[id] && fn()) { b[id] = Date.now(); got = name; }
    if (got) { Store.save(); setTimeout(() => UI.toast('وسام جديد: ' + got), 900); }
  };
  return { LIST, check };
})();

const Today = (() => {
  const quote = () => {
    const q = QUOTES[DT.num(DT.today()) % QUOTES.length];
    if (q.g) { const g = Q.gid(q.g[0], q.g[1]); return `<p class="q-ayah">﴿${W.ayah(g)}﴾</p><small>${F.ayahRef(g)}</small>`; }
    return `<p class="q-hadith">«${q.t}»</p><small>${q.s}</small>`;
  };
  const toolBtns = (t, i) => {
    const b = [];
    if (['listen', 'nightly', 'weekly', 'pre'].includes(t.t)) b.push(`<button class="btn sm" data-a="taskListen" data-i="${i}">${ic('headphones')} استمع</button>`);
    if (t.t === 'new') b.push(`<button class="btn sm" data-a="taskTakrar" data-i="${i}">${ic('repeat')} تكرار وربط</button>`, `<button class="btn sm" data-a="taskRecite" data-i="${i}">${ic('mic')} سمِّع</button>`);
    if (['near', 'far', 'srs', 'manzil'].includes(t.t)) b.push(`<button class="btn sm" data-a="taskRecite" data-i="${i}">${ic('eyeoff')} سمِّع غيبًا</button>`, `<button class="btn sm" data-a="taskTest" data-i="${i}">${ic('target')} اختبرني</button>`);
    return b.join('');
  };
  const card = (t, i) => {
    const tr = Plan.TRACKS[t.t];
    return `<article class="task ${t.done ? 'done' : ''}">
      <button class="tick" data-a="taskDone" data-i="${i}" aria-label="تم">${t.done ? ic('check') : ''}</button>
      <div class="task-b">
        <div class="task-h"><span class="tic">${ic(tr.icon)}</span><b>${Plan.trackTitle(t.t)}</b>${t.late > 0 ? `<span class="tag red">متأخرة ${num(t.late)} ي</span>` : ''}<button class="ib sm" data-a="taskTip" data-i="${i}">${ic('help')}</button></div>
        <div class="task-r">${F.ranges(t.r)}</div>
        <div class="task-m">${t.note ? esc(t.note) + ' · ' : ''}${F.pages(t.r)} · ${F.amount(t.w)}</div>
        ${t.done ? '' : `<div class="task-a"><button class="btn sm pri" data-a="taskOpen" data-i="${i}">${ic('book')} افتح</button>${toolBtns(t, i)}</div>`}
      </div></article>`;
  };
  const render = root => {
    const S = Store.S, date = DT.today(), tasks = Plan.day(date).tasks;
    const done = tasks.filter(t => t.done).length, st = Plan.streak();
    let html = `<header class="hero">
      <div class="hero-top"><div><h1>السلام عليكم${S.name ? ' يا ' + esc(S.name) : ''}</h1><p>${F.date(date)}${F.hijri(date) ? ' · ' + F.hijri(date) : ''}</p></div>
      <button class="ib light" data-a="openSettings" aria-label="الإعدادات">${ic('gear')}</button></div>
      <div class="hero-main">${W.ring(tasks.length ? done / tasks.length : 0, 92, `${num(done)}/${num(tasks.length)}`, 'ورد اليوم')}
        <div class="hero-stats"><div><span class="flame">${ic('flame')}</span><b>${num(st)}</b><small>يوم مواظبة</small></div>
        <div><b>${num(Math.round(Plan.memPages() * 10) / 10)}</b><small>صفحة محفوظة</small></div></div></div>
    </header>
    <section class="card quote">${quote()}</section>
    <button class="method-chip" data-a="methodInfo">${ic('layers')}<span>خطتك: <b>${Plan.METHODS[S.method].name}</b></span>${ic('next')}</button>`;
    if (!tasks.length) html += W.empty('star', 'لا أوراد اليوم', 'فعّل بعض الأوراد من الإعدادات، أو حدّد ما تحفظه لتظهر لك المراجعة.');
    const idx = tasks.map((t, i) => i);
    if (S.method === 'husoon') {
      idx.sort((a, b) => Plan.TRACKS[tasks[a].t].fort - Plan.TRACKS[tasks[b].t].fort);
      let last = -1;
      const FN = ['', 'التلاوة والاستماع', 'التحضير', 'الحفظ الجديد', 'مراجعة القريب', 'مراجعة البعيد'];
      for (const i of idx) {
        const f = Plan.TRACKS[tasks[i].t].fort;
        if (f !== last && f) html += `<h2 class="fort"><span>${Plan.FORTS[f]}</span> ${FN[f]}</h2>`;
        last = f; html += card(tasks[i], i);
      }
    } else for (const i of idx) html += card(tasks[i], i);
    if (tasks.length && done === tasks.length) html += `<section class="card cele">${ic('award')}<b>أتممت ورد اليوم، بارك الله فيك</b><p>«أحبّ الأعمال إلى الله أدومها وإن قلّ» — غدًا موعدنا إن شاء الله.</p></section>`;
    const fin = Plan.finishDate();
    if (fin) html += `<p class="foot-note">${ic('flag')} بهذا المعدل تختم الحفظ بإذن الله في ${F.date(fin, { month: 'long', year: 'numeric' })}</p>`;
    root.innerHTML = html + '<div class="sp"></div>';
  };
  const T = el => Plan.day().tasks[+el.dataset.i];
  const title = t => Plan.trackTitle(t.t);
  const after = () => {
    UI.refresh(); Badges.check();
    const ts = Plan.day().tasks;
    if (ts.every(t => t.done)) UI.vibrate([60, 60, 120]);
  };
  Act.taskDone = el => {
    const t = T(el), i = el.dataset.i;
    if (t.done) { Plan.undo(t); UI.refresh(); UI.toast('أُلغي الإنجاز'); return; }
    if (t.t === 'srs') {
      UI.sheet(`<h3>كيف كان حفظك لهذا المقطع؟</h3><p class="mut">${F.ranges(t.r)}</p>
        <div class="col gap"><button class="btn pri" data-a="srsGrade" data-i="${i}" data-g="good">متقن — باعِد الموعد القادم</button>
        <button class="btn" data-a="srsGrade" data-i="${i}" data-g="ok">متوسط — كرّر بعد المدة نفسها</button>
        <button class="btn danger" data-a="srsGrade" data-i="${i}" data-g="bad">ضعيف — أعده غدًا</button></div>`);
    } else if (t.t === 'new') {
      UI.sheet(`<h3>هل أتممت حفظ المقطع؟</h3><p class="mut">${F.ranges(t.r)} — يُستحسن ألا تعلّمه محفوظًا حتى تسمّعه غيبًا دون خطأ.</p>
        <div class="row gap"><button class="btn pri grow" data-a="newDone" data-i="${i}">نعم، حفظته</button><button class="btn grow" data-a="sheetClose">ليس بعد</button></div>`);
    } else { Plan.complete(t); UI.vibrate(30); after(); }
  };
  Act.srsGrade = el => { UI.closeSheet(); Plan.complete(T(el), el.dataset.g); after(); };
  Act.newDone = el => { UI.closeSheet(); Plan.complete(T(el)); UI.vibrate([40, 40, 80]); after(); };
  Act.taskOpen = el => { const t = T(el); Mushaf.open({ ranges: t.r, title: title(t), ti: +el.dataset.i }); };
  Act.taskRecite = el => { const t = T(el); Mushaf.open({ ranges: t.r, title: title(t), ti: +el.dataset.i, hide: true }); UI.toast('النص مخفي: سمِّع غيبًا واضغط الآية للتحقق'); };
  Act.taskListen = el => { const t = T(el); Mushaf.open({ ranges: t.r, title: title(t), ti: +el.dataset.i }); Player.play(t.r); };
  Act.taskTakrar = el => Tools.takrar(T(el).r);
  Act.taskTest = el => Tools.test(T(el).r);
  Act.taskTip = el => { const t = T(el); UI.sheet(`<h3>${title(t)}</h3><p>${Plan.TRACKS[t.t].tip}</p><button class="btn grow" data-a="sheetClose">فهمت</button>`); };
  Act.methodInfo = () => {
    const m = Plan.METHODS[Store.S.method], T = Store.S.cfg.tracks;
    const rows = Object.keys(Plan.TRACKS).filter(k => T[k]).map(k => `<li><b>${Plan.trackTitle(k)}</b><span>${Plan.TRACKS[k].tip}</span></li>`).join('');
    UI.sheet(`<h3>${m.name}</h3><p>${m.desc}</p><ul class="tips">${rows}</ul><div class="row gap"><button class="btn pri grow" data-a="openSettings">تعديل الخطة</button><button class="btn grow" data-a="sheetClose">إغلاق</button></div>`);
  };
  UI.screens.today = render;
  return { render };
})();
