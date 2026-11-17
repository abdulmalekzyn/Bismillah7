'use strict';
/* ===== Progress, consistency and motivation ===== */
(() => {
  const S = () => Store.S;
  const heat = () => {
    const today = DT.today(), start = DT.add(DT.weekStart(today), -7 * 13);
    let cols = '';
    for (let w = 0; w < 14; w++) {
      let col = '';
      for (let d = 0; d < 7; d++) {
        const ds = DT.add(start, w * 7 + d), [a, b] = Plan.daySum(ds);
        const lv = ds > today ? 'f' : !a ? 0 : a >= b ? 4 : a / b > 0.6 ? 3 : a / b > 0.3 ? 2 : 1;
        col += `<i class="h${lv}" title="${ds}"></i>`;
      }
      cols += `<div>${col}</div>`;
    }
    return `<div class="heat">${cols}</div><div class="heat-l"><span>أقل</span><i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i><span>أتمّ</span></div>`;
  };
  const week = () => {
    const today = DT.today(), names = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    let h = '';
    for (let k = 6; k >= 0; k--) {
      const ds = DT.add(today, -k), [a, b] = Plan.daySum(ds);
      h += `<div class="wbar"><div class="wtrack"><i style="height:${b ? Math.max(4, a / b * 100) : 0}%"></i></div><small>${names[DT.dow(ds)]}</small><small class="mut">${num(a)}/${num(b)}</small></div>`;
    }
    return `<div class="week">${h}</div>`;
  };
  UI.screens.progress = root => {
    const pages = Plan.memPages(), fin = Plan.finishDate(), st = S().stats;
    const acc = st.testAll ? Math.round(st.testOk / st.testAll * 100) : null;
    root.innerHTML = `<header class="top"><h1>تقدّمك</h1><p>«أحبّ الأعمال إلى الله أدومها وإن قلّ»</p></header>
    <div class="pad col gap">
      <section class="card row gap">${W.ring(pages / Q.NP, 118, num(Math.round(pages / Q.NP * 1000) / 10) + '٪', 'من القرآن')}
        <div class="grow col"><b class="big">${num(Math.round(pages * 10) / 10)} <small>صفحة</small></b><span class="mut">≈ ${num(Math.round(pages / 20 * 10) / 10)} جزء من ٣٠</span>
        <span class="mut">${num(Plan.memCount())} آية من ${num(Q.N)}</span>${fin ? `<span class="tag">${ic('flag')} الختم المتوقع: ${F.date(fin, { month: 'long', year: 'numeric' })}</span>` : ''}</div></section>
      <div class="stat4">
        <div class="card"><span class="flame">${ic('flame')}</span><b>${num(Plan.streak())}</b><small>أيام متتالية</small></div>
        <div class="card">${ic('calendar')}<b>${num(Plan.activeDays())}</b><small>أيام الإنجاز</small></div>
        <div class="card">${ic('repeat')}<b>${num(st.reps)}</b><small>تكرار بالعدّاد</small></div>
        <div class="card">${ic('target')}<b>${acc == null ? '—' : num(acc) + '٪'}</b><small>دقة الاختبار</small></div>
      </div>
      <section class="card"><h3>هذا الأسبوع</h3>${week()}</section>
      <section class="card"><h3>المواظبة — آخر ١٤ أسبوعًا</h3>${heat()}</section>
      <section class="card"><h3>خريطة الأجزاء</h3><div class="jmap">${Array.from({ length: 30 }, (_, i) => { const f = Plan.rangeMemFrac(Q.juzRange(i + 1)); return `<button data-a="pgJuz" data-v="${i + 1}" class="${f >= 0.999 ? 'full' : ''}" style="--f:${Math.round(f * 100)}%"><b>${num(i + 1)}</b></button>`; }).join('')}</div>
        <p class="mut sm">اضغط الجزء لفتحه في المصحف. التظليل بقدر المحفوظ منه.</p></section>
      <section class="card"><h3>الأوسمة</h3><div class="badges">${Badges.LIST.map(([id, n, d]) => `<div class="${S().badges[id] ? 'got' : ''}">${ic('award')}<b>${n}</b><small>${d}</small></div>`).join('')}</div></section>
    </div><div class="sp"></div>`;
  };
  Act.pgJuz = el => Mushaf.open({ page: Q.pageOf[Q.D.juz[+el.dataset.v - 1]] });
})();
