'use strict';
/* ===== My notebook: notes, voice recordings, library files ===== */
const Journal = (() => {
  const S = () => Store.S;
  let tab = 'notes', flt = '', cat = '';
  const NC = () => S().cats.notes;
  const FCATS = ['تفسير', 'تجويد', 'متشابهات', 'علوم القرآن', 'أخرى'];

  /* ---------- notes ---------- */
  const notesHtml = () => {
    const q = flt.trim();
    const list = S().notes.filter(n => (!cat || n.cat === cat) && (!q || (n.title + ' ' + n.text).includes(q)));
    return `<input type="search" placeholder="ابحث في ملاحظاتك" data-i="noteFlt" value="${esc(flt)}">
      ${W.chips('noteCat', [['', 'الكل']].concat(NC().map(c => [c, c])), cat)}
      <button class="btn sm" data-a="catsManage" data-k="notes">${ic('folder')} إدارة التقسيمات</button>
      <div id="nlist">${list.length ? list.map(n => `<article class="card note" data-a="noteEdit" data-id="${n.id}">
        <div class="row"><b class="grow">${esc(n.title || n.text.slice(0, 40))}</b><span class="tag">${esc(n.cat)}</span></div>
        <p>${esc(n.text)}</p><small class="mut">${n.g != null ? ic('link') + ' ' + F.ayahRef(n.g) + ' · ' : ''}${F.ts(n.ts)}</small></article>`).join('')
      : W.empty('note', 'لا ملاحظات بعد', 'دوّن فوائد التفسير، والمتشابهات، وأخطاءك في التلاوة؛ أو اضغط آية في المصحف واكتب ملاحظة عليها.')}</div>`;
  };
  const editNote = (id, g) => {
    const n = id ? S().notes.find(x => x.id === id) : { id: '', title: '', text: '', cat: cat || NC()[0] || 'عامة', g };
    if (!n) return;
    UI.sheet(`<h3>${id ? 'تعديل الملاحظة' : 'ملاحظة جديدة'}</h3>
      ${n.g != null ? `<p class="qline">${W.ayah(n.g)}</p><small class="mut">${F.ayahRef(n.g)}</small>` : ''}
      <input type="text" id="n-title" placeholder="العنوان (اختياري)" value="${esc(n.title)}">
      <textarea id="n-text" rows="6" placeholder="اكتب ملاحظتك…">${esc(n.text)}</textarea>
      <select id="n-cat">${NC().concat(NC().includes(n.cat) ? [] : [n.cat]).map(c => `<option ${c === n.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <input type="text" id="n-newcat" placeholder="أو اكتب اسم تقسيمة جديدة">
      <div class="row gap"><button class="btn pri grow" data-a="noteSave" data-id="${n.id}" data-g="${n.g != null ? n.g : ''}">حفظ</button>
      ${n.g != null ? `<button class="btn" data-a="noteGo" data-g="${n.g}">${ic('book')}</button>` : ''}
      ${id ? `<button class="btn danger" data-a="noteDel" data-id="${n.id}">${ic('trash')}</button>` : ''}</div>`);
  };
  Act.noteNew = () => editNote(null);
  Act.noteEdit = el => editNote(el.dataset.id);
  Act.noteGo = el => { UI.closeSheet(); Mushaf.open({ ranges: [[+el.dataset.g, +el.dataset.g]], title: 'آية الملاحظة' }); };
  Act.noteSave = el => {
    const text = $('#n-text').value.trim(), title = $('#n-title').value.trim();
    if (!text && !title) { UI.toast('اكتب شيئًا أولًا'); return; }
    const nc = $('#n-newcat').value.trim();
    if (nc && !NC().includes(nc)) NC().push(nc);
    const id = el.dataset.id, o = { title, text, cat: nc || $('#n-cat').value, ts: Date.now() };
    if (id) Object.assign(S().notes.find(x => x.id === id), o);
    else S().notes.unshift(Object.assign({ id: newId(), g: el.dataset.g === '' ? null : +el.dataset.g }, o));
    Store.save(); Badges.check(); UI.closeSheet(); UI.refresh(); UI.toast('حُفظت الملاحظة');
  };
  Act.noteDel = el => UI.confirm('حذف هذه الملاحظة؟', 'حذف', () => { S().notes = S().notes.filter(x => x.id !== el.dataset.id); Store.save(); UI.refresh(); }, true);
  Chg.noteFlt = el => { flt = el.value; const y = $('#nlist'); const tmp = document.createElement('div'); tmp.innerHTML = notesHtml(); y.innerHTML = $('#nlist', tmp).innerHTML; };
  Act.noteCat = el => { cat = el.dataset.v; UI.refresh(); };
  document.addEventListener('catschange', () => { if (cat && !NC().includes(cat)) cat = ''; });

  /* ---------- recordings ---------- */
  const recsHtml = () => {
    const list = S().recs;
    return `<button class="btn pri grow" data-a="recFree">${ic('mic')} ${Rec.active() ? 'إيقاف التسجيل' : 'تسجيل جديد'}</button>
      ${list.length ? list.map(r => `<article class="card recitem" id="rec-${r.id}">
        <div class="row"><button class="ib pri" data-a="recPlay" data-id="${r.id}">${ic('play')}</button>
        <div class="grow"><b>${esc(r.label)}</b><small class="mut">${F.ts(r.ts)} · ${F.dur(r.dur)} · ${F.size(r.size || 0)}</small></div>
        <button class="ib sm" data-a="recMenu" data-id="${r.id}">${ic('edit')}</button></div><div class="recau"></div></article>`).join('')
      : W.empty('mic', 'لا تسجيلات بعد', 'سجّل تسميعك من المصحف (زر «سجّل») ثم استمع له والنص أمامك لتكتشف مواضع الخطأ.')}`;
  };
  Act.recFree = () => { Rec.toggle({ label: 'تسجيل حر' }); };
  Act.recPlay = async el => {
    const box = $('#rec-' + el.dataset.id + ' .recau');
    if (box.firstChild) { box.innerHTML = ''; return; }
    const blob = await Blobs.get(el.dataset.id).catch(() => null);
    if (!blob) { UI.toast('ملف التسجيل غير موجود'); return; }
    Player.stop();
    $$('.recau').forEach(x => { x.innerHTML = ''; });
    const au = document.createElement('audio'); au.controls = true; au.src = URL.createObjectURL(blob); box.appendChild(au); au.play().catch(() => {});
  };
  Act.recMenu = el => {
    const r = S().recs.find(x => x.id === el.dataset.id);
    UI.sheet(`<h3>التسجيل</h3><input type="text" id="r-label" value="${esc(r.label)}">
      <div class="col gap"><button class="btn pri" data-a="recRename" data-id="${r.id}">حفظ الاسم</button>
      ${r.g != null ? `<button class="btn" data-a="recOpen" data-id="${r.id}">${ic('book')} افتح موضعه في المصحف</button>` : ''}
      <button class="btn" data-a="recExport" data-id="${r.id}">${ic('download')} تصدير الملف</button>
      <button class="btn danger" data-a="recDel" data-id="${r.id}">${ic('trash')} حذف</button></div>`);
  };
  Act.recRename = el => { S().recs.find(x => x.id === el.dataset.id).label = $('#r-label').value.trim() || 'تسجيل'; Store.save(); UI.closeSheet(); UI.refresh(); };
  Act.recOpen = el => { const r = S().recs.find(x => x.id === el.dataset.id); UI.closeSheet(); Mushaf.open({ page: Q.pageOf[r.g] }); };
  Act.recExport = async el => { const b = await Blobs.get(el.dataset.id); if (b) exportBlob(b, 'tasmee-' + el.dataset.id + (b.type.includes('mp4') ? '.m4a' : '.webm')); UI.closeSheet(); };
  Act.recDel = el => UI.confirm('حذف هذا التسجيل نهائيًا؟', 'حذف', () => { const id = el.dataset.id; S().recs = S().recs.filter(x => x.id !== id); Blobs.del(id); Store.save(); UI.refresh(); }, true);
  document.addEventListener('recchange', () => { if (UI.tab === 'journal' && tab === 'recs' && !UI.depth) UI.refresh(); });

  /* ---------- library ---------- */
  const kind = f => {
    const n = f.name.toLowerCase(), t = f.type || '';
    if (t === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
    if (t.startsWith('image/')) return 'img';
    if (t.startsWith('audio/')) return 'audio';
    if (t.startsWith('video/')) return 'video';
    if (t.startsWith('text/') || /\.(txt|md|json|csv|srt)$/.test(n)) return 'text';
    return 'other';
  };
  const KL = { pdf: 'PDF', img: 'صورة', audio: 'صوت', video: 'مرئي', text: 'نص', other: 'ملف' };
  const filesHtml = () => {
    const list = S().files;
    return `<button class="btn pri grow" data-a="fileAdd">${ic('plus')} إضافة ملفات (تفسير، تجويد، متون…)</button>
      ${list.length ? list.map(f => `<article class="card fileitem"><div class="row" data-a="fileOpen" data-id="${f.id}">
        <span class="ftype k-${f.kind}">${KL[f.kind]}</span><div class="grow"><b>${esc(f.title || f.name)}</b><small class="mut">${esc(f.cat)} · ${F.size(f.size)}${f.last ? ' · وصلت ص ' + num(f.last) : ''}</small></div>
        <button class="ib sm" data-a="fileMenu" data-id="${f.id}">${ic('edit')}</button></div></article>`).join('')
      : W.empty('file', 'مكتبتك فارغة', 'أضف كتب التفسير والتجويد والمتشابهات (PDF، صور، نصوص، صوتيات) لتقرأها داخل التطبيق دون إنترنت.')}`;
  };
  Act.fileAdd = () => { const i = $('#file-in'); i.value = ''; i.click(); };
  $('#file-in').addEventListener('change', async e => {
    const fs = Array.from(e.target.files || []); let ok = 0;
    for (const f of fs) {
      const id = newId();
      try {
        await Blobs.put(id, f);
        S().files.unshift({ id, name: f.name, title: f.name.replace(/\.[^.]+$/, ''), type: f.type, size: f.size, kind: kind(f), cat: 'تفسير', ts: Date.now() });
        ok++;
      } catch (err) { UI.toast('تعذّر حفظ «' + f.name + '» — قد تكون المساحة غير كافية'); }
    }
    if (ok) { Store.save(); UI.toast(`أُضيف ${num(ok)} ملف`); if (UI.tab === 'journal') UI.refresh(); }
  });
  Act.fileMenu = (el, e) => {
    e.stopPropagation();
    const f = S().files.find(x => x.id === el.dataset.id);
    UI.sheet(`<h3>الملف</h3><input type="text" id="f-title" value="${esc(f.title || f.name)}">
      <select id="f-cat">${FCATS.map(c => `<option ${c === f.cat ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <div class="col gap"><button class="btn pri" data-a="fileSave" data-id="${f.id}">حفظ</button>
      <button class="btn" data-a="fileExport" data-id="${f.id}">${ic('download')} تصدير نسخة</button>
      <button class="btn danger" data-a="fileDel" data-id="${f.id}">${ic('trash')} حذف من المكتبة</button></div>`);
  };
  Act.fileSave = el => { const f = S().files.find(x => x.id === el.dataset.id); f.title = $('#f-title').value.trim() || f.name; f.cat = $('#f-cat').value; Store.save(); UI.closeSheet(); UI.refresh(); };
  Act.fileExport = async el => { const f = S().files.find(x => x.id === el.dataset.id), b = await Blobs.get(f.id); if (b) exportBlob(b, f.name); UI.closeSheet(); };
  Act.fileDel = el => UI.confirm('حذف هذا الملف من المكتبة؟', 'حذف', () => { const id = el.dataset.id; S().files = S().files.filter(x => x.id !== id); Blobs.del(id); Store.save(); UI.refresh(); }, true);

  let pdfLib = null, viewerCleanup = null;
  Act.fileOpen = async (el, e) => {
    if (e.target.closest('[data-a="fileMenu"]')) return;
    const f = S().files.find(x => x.id === el.dataset.id);
    const blob = await Blobs.get(f.id).catch(() => null);
    if (!blob) { UI.toast('الملف غير موجود'); return; }
    UI.push(f.title || f.name, root => {
      if (viewerCleanup) viewerCleanup();
      const url = URL.createObjectURL(blob); let obs = null, doc = null;
      viewerCleanup = () => { URL.revokeObjectURL(url); if (obs) obs.disconnect(); if (doc) doc.destroy(); viewerCleanup = null; };
      root.className = 'viewer';
      if (f.kind === 'img') { root.className = 'viewer pdfv'; root.innerHTML = `<div id="imgz"><img src="${url}" alt=""></div>`; Zoom.attach(root, $('#imgz', root)); }
      else if (f.kind === 'audio') root.innerHTML = `<div class="pad"><audio controls src="${url}"></audio></div>`;
      else if (f.kind === 'video') root.innerHTML = `<video controls src="${url}"></video>`;
      else if (f.kind === 'text') { root.innerHTML = '<pre class="txt" dir="auto"></pre>'; blob.text().then(t => { const p = $('.txt', root); if (p) p.textContent = t; }); }
      else if (f.kind === 'pdf') {
        root.className = 'viewer pdfv';
        root.innerHTML = '<p class="c mut pad" id="pdf-msg">جارٍ فتح الملف…</p><div id="pdf"></div>';
        (async () => {
          try {
            if (!pdfLib) { pdfLib = await import('../pdfjs/pdf.min.mjs'); pdfLib.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.min.mjs'; }
            doc = await pdfLib.getDocument({ data: await blob.arrayBuffer(), standardFontDataUrl: 'pdfjs/standard_fonts/' }).promise;
            const host = $('#pdf', root); if (!host) return;
            $('#pdf-msg', root).hidden = true;
            const first = await doc.getPage(1), vp0 = first.getViewport({ scale: 1 });
            const draw = async holder => {
              if (holder.dataset.done) return; holder.dataset.done = 1;
              const page = await doc.getPage(+holder.dataset.p), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
              const px = Math.min(host.clientWidth * dpr, 3600); // sharper when zoomed in
              const vp = page.getViewport({ scale: px / page.getViewport({ scale: 1 }).width });
              const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
              await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
              const old = $('canvas', holder); if (old) holder.removeChild(old);
              holder.style.aspectRatio = `${vp.width} / ${vp.height}`; holder.appendChild(cv);
            };
            obs = new IntersectionObserver(es => es.forEach(en => {
              if (!en.isIntersecting) return;
              draw(en.target);
              const p = +en.target.dataset.p; if (f.last !== p) { f.last = p; Store.save(); }
            }), { root, rootMargin: '600px 0px' });
            for (let p = 1; p <= doc.numPages; p++) {
              const h = document.createElement('div'); h.className = 'pdfp'; h.dataset.p = p; h.style.aspectRatio = `${vp0.width} / ${vp0.height}`;
              h.innerHTML = `<span>${num(p)}</span>`; host.appendChild(h); obs.observe(h);
            }
            const z = Zoom.attach(root, host, () => { // re-render at the new size
              $$('.pdfp', host).forEach(h => { h.dataset.done = ''; obs.unobserve(h); obs.observe(h); });
            });
            const x = $('#bar-x');
            if (x) { x.innerHTML = `<button class="ib sm" data-a="pdfZoom" data-v="0.7">${ic('zout')}</button><button class="ib sm" data-a="pdfZoom" data-v="1.4">${ic('zin')}</button> ${num(doc.numPages)} ص`; Act.pdfZoom = el => z.step(+el.dataset.v); }
            if (f.last > 1) { const t = host.children[f.last - 1]; if (t) t.scrollIntoView(); }
          } catch (err) { console.error(err); const m = $('#pdf-msg', root); if (m) { m.hidden = false; m.textContent = 'تعذّر فتح هذا الملف'; } }
        })();
      } else root.innerHTML = `<div class="pad">${W.empty('file', 'لا يمكن عرض هذا النوع داخل التطبيق', 'يمكنك تصدير نسخة منه وفتحها بتطبيق آخر.')}<button class="btn pri grow" data-a="fileExport" data-id="${f.id}">${ic('download')} تصدير</button></div>`;
    }, () => { if (viewerCleanup) viewerCleanup(); });
  };

  UI.screens.journal = root => {
    const body = tab === 'notes' ? notesHtml() : tab === 'recs' ? recsHtml() : filesHtml();
    root.innerHTML = `<header class="top"><h1>دفتري</h1><p>ملاحظاتك وتسجيلاتك ومكتبتك</p></header>
      <div class="seg pad-x">${[['notes', `الملاحظات (${num(S().notes.length)})`], ['recs', `التسجيلات (${num(S().recs.length)})`], ['files', `المكتبة (${num(S().files.length)})`]].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="jTab" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="pad col gap">${body}</div><div class="sp"></div>
      ${tab === 'notes' ? `<button class="fab" data-a="noteNew" aria-label="ملاحظة جديدة">${ic('plus')}</button>` : ''}`;
  };
  Act.jTab = el => { tab = el.dataset.v; UI.render(); };
  return { editNote };
})();
