'use strict';
/* ===== memorisation methods + daily scheduler ===== */
const Plan = (() => {
  const TRACKS = {
    tilawa: { title: 'ورد التلاوة', fort: 1, icon: 'book', tip: 'قراءة متواصلة من المصحف نظرًا، تربطك بالقرآن كله وتمهّد للحفظ والمراجعة.' },
    listen: { title: 'ورد الاستماع', fort: 1, icon: 'headphones', tip: 'استمع لقارئ متقن بتركيز؛ السماع يصحّح النطق ويثبّت المحفوظ.' },
    weekly: { title: 'التحضير الأسبوعي', fort: 2, icon: 'calendar', tip: 'اقرأ ما ستحفظه في الأسبوع القادم مرة كل يوم، فيألفه لسانك قبل حفظه.' },
    nightly: { title: 'التحضير الليلي', fort: 2, icon: 'moon', tip: 'قبل النوم: اقرأ أو استمع لمقدار حفظ الغد مكررًا نحو ربع ساعة.' },
    pre: { title: 'التحضير القبلي', fort: 2, icon: 'eye', tip: 'قبل الحفظ مباشرة: اقرأ مقدار اليوم نظرًا بتركيز شديد نحو ربع ساعة.' },
    new: { title: 'الحفظ الجديد', fort: 3, icon: 'star', tip: 'احفظ مقدار اليوم بالتكرار حتى تسمّعه غيبًا دون خطأ، ثم سجّل تسميعك وطابقه.' },
    near: { title: 'مراجعة القريب', fort: 4, icon: 'refresh', tip: 'راجع غيبًا آخر ما حفظته؛ فالمحفوظ الحديث سريع التفلّت حتى يثبت.' },
    far: { title: 'مراجعة البعيد', fort: 5, icon: 'layers', tip: 'ورد ثابت يدور على محفوظك القديم كله حتى تختمه مراجعةً ثم تعيد.' },
    srs: { title: 'مراجعة مجدولة', fort: 0, icon: 'clock', tip: 'مراجعة على فترات متباعدة: تتباعد كلما أتقنت، وتقترب إن ضعف الحفظ.' },
    manzil: { title: 'ورد الختمة الأسبوعية', fort: 0, icon: 'layers', tip: 'تحزيب «فمي بشوق»: ختمة مراجعة كل سبعة أيام.' },
  };
  const FORTS = ['', 'الحصن الأول', 'الحصن الثاني', 'الحصن الثالث', 'الحصن الرابع', 'الحصن الخامس'];
  const MANZIL_NAMES = ['الفاتحة ← النساء', 'المائدة ← التوبة', 'يونس ← النحل', 'الإسراء ← الفرقان', 'الشعراء ← يس', 'الصافات ← الحجرات', 'ق ← الناس'];
  const METHODS = {
    husoon: {
      name: 'الحصون الخمسة', tag: 'الأشمل',
      desc: 'خمسة حصون يومية تحيط بالحفظ من كل جهة: تلاوة واستماع، ثم تحضير (أسبوعي وليلي وقبلي)، ثم حفظ جديد، ثم مراجعة القريب، ثم مراجعة البعيد.',
      tracks: { tilawa: 1, listen: 1, weekly: 1, nightly: 1, pre: 1, new: 1, near: 1, far: 1 },
      cfg: { nearPages: 20, farAmt: 20, tilawaAmt: 40, listenAmt: 10, memDays: [1, 1, 1, 1, 0, 0, 1] },
    },
    sabaq: {
      name: 'السبق والسبقي والمنزل', tag: 'ثلاثية مركّزة',
      desc: 'طريقة حلقات التحفيظ المشهورة: درس جديد (السبق)، ثم مراجعة الدروس الأخيرة (السبقي)، ثم ورد من المحفوظ القديم (المنزل).',
      tracks: { new: 1, near: 1, far: 1 },
      labels: { new: 'السبق (الدرس الجديد)', near: 'السبقي (الدروس الأخيرة)', far: 'المنزل (المحفوظ القديم)' },
      cfg: { nearPages: 10, farAmt: 20, memDays: [1, 1, 1, 1, 1, 0, 1] },
    },
    takrar: {
      name: 'التكرار والربط', tag: 'للإتقان',
      desc: 'تكرّر كل آية عددًا محددًا (عشرين مرة مثلًا)، ثم تربط كل أربع آيات معًا، ثم تربط المقطع كله من أوله، مع مراجعة القريب والبعيد.',
      tracks: { pre: 1, new: 1, near: 1, far: 1 },
      cfg: { nearPages: 20, farAmt: 20, memDays: [1, 1, 1, 1, 1, 0, 1] },
    },
    srs: {
      name: 'التكرار المتباعد', tag: 'للمشغول',
      desc: 'كل مقطع تحفظه يعود للمراجعة بعد يوم ثم ٣ أيام ثم أسبوع ثم أسبوعين ثم شهر… وتتباعد المدة ما دام حفظك متقنًا.',
      tracks: { new: 1, srs: 1 },
      cfg: { memDays: [1, 1, 1, 1, 1, 0, 1] },
    },
    tathbeet: {
      name: 'تثبيت الخاتم (فمي بشوق)', tag: 'لمن أتمّ الحفظ',
      desc: 'ختمة مراجعة كل أسبوع على تحزيب السلف: الفاتحة، المائدة، يونس، بني إسرائيل، الشعراء، الصافات، ق — لتثبيت ما حفظت.',
      tracks: { manzil: 1, listen: 1 },
      cfg: { listenAmt: 10 },
    },
    custom: {
      name: 'خطة مخصصة', tag: 'حرّة',
      desc: 'اختر بنفسك الأوراد التي تريدها ومقدار كل ورد من الإعدادات.',
      tracks: null, cfg: {},
    },
  };
  const SRS_STEPS = [1, 3, 7, 14, 30, 60, 120, 180];
  const S = () => Store.S;

  /* ---- memorisation order ---- */
  let orderCache = {};
  const order = dir => {
    if (orderCache[dir]) return orderCache[dir];
    const o = [];
    const push = ([a, b]) => { for (let g = a; g <= b; g++) o.push(g); };
    if (dir === 'juzback') for (let j = 30; j >= 1; j--) push(Q.juzRange(j));
    else if (dir === 'surahback') for (let s = 113; s >= 0; s--) push(Q.surahRange(s));
    else push([0, Q.N - 1]);
    return (orderCache[dir] = o);
  };
  const queue = () => { const m = S().mem; return order(S().cfg.dir).filter(g => !m[g]); };
  const chunkEnd = (arr, start, amt) => {
    let w = 0, i = start;
    const part = amt < 1; // partial-page portions never straddle two pages
    while (i < arr.length) {
      const x = Q.W(arr[i]);
      if (i > start && part && Q.pageOf[arr[i]] !== Q.pageOf[arr[i - 1]] && w >= amt * 0.5) break;
      if (i > start && w + x > amt + 1e-6 && (w + x - amt) > (amt - w)) break;
      w += x; i++;
      if (w >= amt - 1e-6) break;
    }
    if (part && i > start && i < arr.length) { // absorb a tiny remainder of the page
      let j = i, rest = 0;
      while (j < arr.length && Q.pageOf[arr[j]] === Q.pageOf[arr[i - 1]] && arr[j] === arr[j - 1] + 1) rest += Q.W(arr[j++]);
      if (rest < amt * 0.5) i = j;
    }
    return i;
  };
  const srsKey = x => x.rs[0][0] + '-' + x.rs[x.rs.length - 1][1];

  const applyMethod = id => {
    const st = S(), m = METHODS[id];
    st.method = id;
    if (m.tracks) { for (const k in st.cfg.tracks) st.cfg.tracks[k] = m.tracks[k] ? 1 : 0; }
    Object.assign(st.cfg, JSON.parse(JSON.stringify(m.cfg)));
    if (st.cfg.tracks.srs && !st.srs.length) seedSrs();
    st.week = null;
    Store.save();
  };
  const trackTitle = t => (METHODS[S().method].labels || {})[t] || TRACKS[t].title;

  /* ---- memorised sets ---- */
  const memCount = () => { let c = 0; const m = S().mem; for (let g = 0; g < Q.N; g++) if (m[g]) c++; return c; };
  const memPages = () => { let w = 0; const m = S().mem; for (let g = 0; g < Q.N; g++) if (m[g]) w += Q.W(g); return w; };
  const nearSet = () => {
    const m = S().mem, lim = S().cfg.nearPages, recent = [];
    for (let g = 0; g < Q.N; g++) if (m[g] > 1) recent.push(g);
    recent.sort((a, b) => m[b] - m[a] || b - a);
    const out = []; let w = 0;
    for (const g of recent) { if (w >= lim - 1e-6) break; out.push(g); w += Q.W(g); }
    return out.sort((a, b) => a - b);
  };
  const farList = near => {
    const m = S().mem, ns = new Set(near), out = [];
    for (let g = 0; g < Q.N; g++) if (m[g] && !ns.has(g)) out.push(g);
    return out;
  };
  const seedSrs = () => {
    const st = S(), today = DT.num(DT.today());
    const all = []; for (let g = 0; g < Q.N; g++) if (st.mem[g]) all.push(g);
    let i = 0, k = 0;
    while (i < all.length) {
      const e = chunkEnd(all, i, 5);
      st.srs.push({ rs: Q.toRanges(all.slice(i, e)), stage: 3, due: today + 1 + (k % 14) });
      i = e; k++;
    }
  };

  /* ---- build the tasks of a day ---- */
  const build = date => {
    const st = S(), c = st.cfg, T = c.tracks, tasks = [];
    const isMem = !!c.memDays[DT.dow(date)] && T.new;
    const q = queue();
    const e0 = isMem ? chunkEnd(q, 0, c.newAmt) : 0;
    const P0 = Q.toRanges(q.slice(0, e0));
    const e1 = chunkEnd(q, e0, c.newAmt);
    const P1 = Q.toRanges(q.slice(e0, e1));
    const add = (t, r, extra) => { if (r && r.length) tasks.push(Object.assign({ t, r, w: Q.weight(r), done: 0 }, extra)); };

    if (T.tilawa) add('tilawa', [[st.ptr.tilawa, Q.linearEnd(st.ptr.tilawa, c.tilawaAmt)]]);
    if (T.listen) add('listen', [[st.ptr.listen, Q.linearEnd(st.ptr.listen, c.listenAmt)]]);
    if (T.manzil) {
      const i = st.ptr.manzil % 7, a = Q.D.manzil[i], b = (i < 6 ? Q.D.manzil[i + 1] : Q.N) - 1;
      add('manzil', [[a, b]], { note: `اليوم ${num(i + 1)} من ٧: ${MANZIL_NAMES[i]}` });
    }
    if (T.weekly && T.new) {
      const ws = DT.weekStart(date);
      if (!st.week || st.week.start !== ws) {
        let left = 0, perWeek = 0;
        for (let d = 0; d < 7; d++) {
          const ds = DT.add(ws, d);
          if (c.memDays[DT.dow(ds)]) { perWeek++; if (ds >= date) left++; }
        }
        let i = 0;
        for (let k = 0; k < left; k++) i = chunkEnd(q, i, c.newAmt);
        let j = i;
        for (let k = 0; k < perWeek; k++) j = chunkEnd(q, j, c.newAmt);
        st.week = { start: ws, r: Q.toRanges(q.slice(i, j)) };
      }
      add('weekly', st.week.r);
    }
    if (T.pre && isMem) add('pre', P0);
    if (isMem) add('new', P0);
    const near = T.near || T.far ? nearSet() : [];
    if (T.near) add('near', Q.toRanges(near));
    if (T.far) {
      const fl = farList(T.near ? near : []);
      if (fl.length) {
        let i = fl.findIndex(g => g >= st.ptr.far); if (i < 0) i = 0;
        const e = chunkEnd(fl, i, c.farAmt);
        add('far', Q.toRanges(fl.slice(i, e)), { next: e >= fl.length ? 0 : fl[e] });
      }
    }
    if (T.srs) {
      const dn = DT.num(date);
      st.srs.filter(x => x.due <= dn).sort((a, b) => a.due - b.due).slice(0, 12)
        .forEach(x => add('srs', x.rs, { key: srsKey(x), late: dn - x.due }));
    }
    if (T.nightly && T.new) add('nightly', P1);
    return tasks;
  };

  const day = (date = DT.today()) => {
    const st = S();
    if (!st.days[date] || !st.days[date].tasks) {
      st.days[date] = { tasks: build(date) };
      prune(date); Store.save();
    }
    return st.days[date];
  };
  // rebuild today's unfinished tasks after a settings change
  const rebuild = () => {
    const st = S(), date = DT.today(), old = st.days[date];
    const done = old && old.tasks ? old.tasks.filter(t => t.done) : [];
    const fresh = build(date).filter(t => t.t === 'srs' ? !done.some(d => d.t === 'srs' && d.key === t.key) : !done.some(d => d.t === t.t));
    st.days[date] = { tasks: done.concat(fresh) };
    Store.save();
  };
  const prune = date => {
    const st = S(), lim = DT.add(date, -120);
    for (const d in st.days) if (d < lim && st.days[d].tasks) {
      const t = st.days[d].tasks; st.days[d] = { sum: [t.filter(x => x.done).length, t.length] };
    }
  };
  const daySum = d => { const x = S().days[d]; if (!x) return [0, 0]; return x.sum || [x.tasks.filter(t => t.done).length, x.tasks.length]; };

  /* ---- completing / undoing ---- */
  const complete = (task, grade) => {
    const st = S(), date = DT.today(), dn = DT.num(date);
    if (task.done) return;
    task.done = Date.now();
    if (task.t === 'new') {
      for (const g of Q.expand(task.r)) st.mem[g] = dn;
      if (st.cfg.tracks.srs) st.srs.push({ rs: task.r, stage: 0, due: dn + SRS_STEPS[0] });
    } else if (task.t === 'tilawa' || task.t === 'listen') {
      task.prev = st.ptr[task.t];
      const e = task.r[0][1] + 1; st.ptr[task.t] = e >= Q.N ? 0 : e;
    } else if (task.t === 'far') { task.prev = st.ptr.far; st.ptr.far = task.next || 0; }
    else if (task.t === 'manzil') { task.prev = st.ptr.manzil; st.ptr.manzil = (st.ptr.manzil + 1) % 7; }
    else if (task.t === 'srs') {
      const it = st.srs.find(x => srsKey(x) === task.key);
      if (it) {
        task.prev = { stage: it.stage, due: it.due }; task.grade = grade;
        if (grade === 'good') it.stage = Math.min(it.stage + 1, SRS_STEPS.length - 1);
        else if (grade === 'bad') it.stage = 0;
        it.due = dn + SRS_STEPS[it.stage];
      }
    }
    Store.save();
  };
  const undo = task => {
    const st = S();
    if (!task.done) return;
    task.done = 0;
    if (task.t === 'new') {
      for (const g of Q.expand(task.r)) st.mem[g] = 0;
      const k = task.r[0][0] + '-' + task.r[task.r.length - 1][1];
      st.srs = st.srs.filter(x => !(srsKey(x) === k && x.stage === 0));
    } else if (task.t === 'srs') {
      const it = st.srs.find(x => srsKey(x) === task.key);
      if (it && task.prev) Object.assign(it, task.prev);
    } else if (task.prev != null && st.ptr[task.t] != null) st.ptr[task.t] = task.prev;
    delete task.prev;
    Store.save();
  };

  /* ---- stats ---- */
  const streak = () => {
    let d = DT.today(), n = 0;
    if (!daySum(d)[0]) d = DT.add(d, -1);
    while (daySum(d)[0]) { n++; d = DT.add(d, -1); }
    return n;
  };
  const activeDays = () => Object.keys(S().days).filter(d => daySum(d)[0]).length;
  const finishDate = () => {
    const c = S().cfg, perWeek = c.memDays.reduce((a, b) => a + b, 0) * c.newAmt;
    if (!perWeek || !c.tracks.new) return null;
    const left = Q.NP - memPages();
    if (left < 0.05) return null;
    return DT.add(DT.today(), Math.ceil(left / perWeek * 7));
  };
  const setMem = (range, on) => {
    const m = S().mem;
    for (let g = range[0]; g <= range[1]; g++) m[g] = on ? (m[g] || 1) : 0;
    S().week = null; Store.save();
  };
  const rangeMemFrac = ([a, b]) => { let c = 0; const m = S().mem; for (let g = a; g <= b; g++) if (m[g]) c++; return c / (b - a + 1); };

  return { TRACKS, FORTS, METHODS, SRS_STEPS, MANZIL_NAMES, order, queue, applyMethod, trackTitle, memCount, memPages, nearSet, build, day, rebuild, daySum, complete, undo, streak, activeDays, finishDate, setMem, rangeMemFrac, seedSrs };
})();
