'use strict';
/* ===== blob storage (IndexedDB), voice recorder, recitation player ===== */
const Blobs = (() => {
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('husoon', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('blobs');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = (mode, fn) => db().then(d => new Promise((res, rej) => {
    const t = d.transaction('blobs', mode), rq = fn(t.objectStore('blobs'));
    t.oncomplete = () => res(rq.result); t.onerror = t.onabort = () => rej(t.error);
  }));
  return {
    put: (id, blob) => tx('readwrite', s => s.put(blob, id)),
    get: id => tx('readonly', s => s.get(id)),
    del: id => tx('readwrite', s => s.delete(id)),
    keys: prefix => tx('readonly', s => s.getAllKeys(IDBKeyRange.bound(prefix, prefix + '\uffff'))),
    delPrefix: prefix => tx('readwrite', s => s.delete(IDBKeyRange.bound(prefix, prefix + '\uffff'))),
  };
})();

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* save a blob outside the app (Android: system "save as" dialog; browser: download) */
const exportBlob = (blob, name) => {
  if (Native && Native.saveFile) {
    const fr = new FileReader();
    fr.onload = () => Native.saveFile(name, blob.type || 'application/octet-stream', String(fr.result).split(',')[1] || '');
    fr.readAsDataURL(blob);
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
};

const Rec = (() => {
  let mr = null, stream = null, chunks = [], t0 = 0, meta = null, tick = null;
  const active = () => !!mr;
  const dock = () => {
    const el = $('#rec-dock'); if (el) el.remove();
    if (!mr) return;
    const d = document.createElement('div'); d.id = 'rec-dock'; d.className = 'dockbar rec';
    d.innerHTML = `<span class="pulse"></span><div class="grow"><b>جارٍ التسجيل</b><small id="rec-t">٠:٠٠</small> <small>· ${esc(meta.label)}</small></div><button class="btn sm danger" data-a="recStop">${ic('stop')} إيقاف وحفظ</button>`;
    $('#dock').appendChild(d);
  };
  const start = async m => {
    if (mr) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) { UI.toast('التسجيل غير مدعوم على هذا الجهاز'); return; }
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } }); }
    catch (e) { UI.toast('لم يُسمح باستخدام الميكروفون'); return; }
    Player.stop();
    meta = m || { label: 'تسجيل حر' }; chunks = [];
    try { mr = new MediaRecorder(stream, { audioBitsPerSecond: 64000 }); } catch (e) { mr = new MediaRecorder(stream); }
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = finish;
    mr.start(); t0 = Date.now(); // one chunk at stop: fewer wake-ups while reciting
    dock();
    tick = setInterval(() => { const el = $('#rec-t'); if (el) el.textContent = F.dur((Date.now() - t0) / 1000); }, 500);
    if (Native && Native.keepScreenOn) Native.keepScreenOn(true);
    document.dispatchEvent(new Event('recchange'));
  };
  const finish = async () => {
    const blob = new Blob(chunks, { type: (mr && mr.mimeType) || 'audio/webm' });
    const dur = (Date.now() - t0) / 1000;
    stream.getTracks().forEach(t => t.stop());
    clearInterval(tick); mr = null; stream = null; dock();
    if (Native && Native.keepScreenOn) Native.keepScreenOn(false);
    if (dur >= 1 && blob.size) {
      const id = newId();
      try {
        await Blobs.put(id, blob);
        Store.S.recs.unshift(Object.assign({ id, ts: Date.now(), dur, size: blob.size }, meta));
        Store.save(); Badges.check();
        UI.toast('حُفظ التسجيل في «دفتري»');
      } catch (e) { UI.toast('تعذّر حفظ التسجيل'); }
    }
    document.dispatchEvent(new Event('recchange'));
  };
  const stop = () => { if (mr && mr.state !== 'inactive') mr.stop(); };
  Act.recStop = stop;
  return { start, stop, active, toggle: m => (mr ? stop() : start(m)) };
})();

/* Online recitation (per-ayah audio from EveryAyah.com) with repetition tools */
const RECITERS = [
  ['Husary_64kbps', 'محمود خليل الحصري'],
  ['Husary_Muallim_128kbps', 'الحصري (المصحف المعلّم)'],
  ['Minshawy_Murattal_128kbps', 'محمد صديق المنشاوي'],
  ['Abdul_Basit_Murattal_64kbps', 'عبد الباسط عبد الصمد'],
  ['Alafasy_64kbps', 'مشاري العفاسي'],
  ['Hudhaify_64kbps', 'علي الحذيفي'],
  ['Ayman_Sowaid_64kbps', 'أيمن سويد'],
  ['Minshawy_Mujawwad_192kbps', 'المنشاوي (مجوّد)'],
  ['Abdul_Basit_Mujawwad_128kbps', 'عبد الباسط (مجوّد)'],
  ['Abdurrahmaan_As-Sudais_192kbps', 'عبد الرحمن السديس'],
  ['Saood_ash-Shuraym_128kbps', 'سعود الشريم'],
  ['MaherAlMuaiqly128kbps', 'ماهر المعيقلي'],
  ['Abu_Bakr_Ash-Shaatree_128kbps', 'أبو بكر الشاطري'],
  ['Muhammad_Ayyoub_128kbps', 'محمد أيوب'],
  ['Nasser_Alqatami_128kbps', 'ناصر القطامي'],
  ['Yasser_Ad-Dussary_128kbps', 'ياسر الدوسري'],
  ['Ghamadi_40kbps', 'سعد الغامدي'],
  ['Abdullah_Basfar_192kbps', 'عبد الله بصفر'],
  ['Muhammad_Jibreel_128kbps', 'محمد جبريل'],
  ['Hani_Rifai_192kbps', 'هاني الرفاعي'],
  ['Ali_Jaber_64kbps', 'علي جابر'],
  ['Fares_Abbad_64kbps', 'فارس عباد'],
  ['Salah_Al_Budair_128kbps', 'صلاح البدير'],
  ['Abdullaah_3awwaad_Al-Juhaynee_128kbps', 'عبد الله عواد الجهني'],
  ['Khalefa_Al_Tunaiji_64kbps', 'خليفة الطنيجي'],
  ['Ibrahim_Akhdar_32kbps', 'إبراهيم الأخضر'],
];
const Player = (() => {
  const au = new Audio(); au.preload = 'auto';
  let list = [], i = 0, rep = 0, loops = 0, opts = null, on = false, gapT = null, fails = 0;
  const file = g => { const r = Q.ref(g); return `${String(r.s + 1).padStart(3, '0')}${String(r.a).padStart(3, '0')}.mp3`; };
  const remote = (rec, g) => `https://everyayah.com/data/${rec}/${file(g)}`;
  const local = (rec, g) => `audio/${rec}/${file(g)}`;
  const url = g => { // downloaded copy first, then streaming
    const rec = Store.S.cfg.reciter, p = local(rec, g);
    try { if (Native && Native.fileExists && Native.fileExists(p)) return '/dl/' + p; } catch (e) {}
    return remote(rec, g);
  };
  const recName = () => (RECITERS.find(r => r[0] === Store.S.cfg.reciter) || ['', ''])[1];
  const cur = () => (on ? list[i] : -1);
  const emit = () => document.dispatchEvent(new CustomEvent('playerayah', { detail: cur() }));
  const dock = () => {
    let d = $('#play-dock');
    if (!on) { if (d) d.remove(); return; }
    if (!d) { d = document.createElement('div'); d.id = 'play-dock'; d.className = 'dockbar'; $('#dock').appendChild(d); }
    d.innerHTML = `<button class="ib" data-a="playToggle">${ic(au.paused && !gapT ? 'play' : 'pause')}</button><div class="grow" data-a="reciterPick"><b>${F.ayahRef(list[i])}</b><small>${esc(recName())} · ${num(i + 1)}/${num(list.length)}${opts.each > 1 ? ` · تكرار ${num(rep + 1)}/${num(opts.each)}` : ''}${opts.loop > 1 ? ` · دورة ${num(loops + 1)}/${num(opts.loop)}` : ''}</small></div><button class="ib" data-a="playPrev">${ic('prev')}</button><button class="ib" data-a="playNext">${ic('next')}</button><button class="ib" data-a="playStop">${ic('x')}</button>`;
  };
  const load = () => { au.src = url(list[i]); au.play().catch(() => {}); dock(); emit(); };
  const advance = () => {
    rep++;
    if (rep < opts.each) return load();
    rep = 0; i++;
    if (i >= list.length) { loops++; i = 0; if (loops >= opts.loop) return stop(true); }
    load();
  };
  au.addEventListener('ended', () => {
    fails = 0;
    if (opts.gap) { const ms = (au.duration || 3) * 1000 * opts.gap; gapT = setTimeout(() => { gapT = null; advance(); }, ms); dock(); }
    else advance();
  });
  au.addEventListener('error', () => {
    if (!on) return;
    if (++fails >= 2) { stop(); UI.toast('تعذّر تشغيل التلاوة — تحقّق من اتصال الإنترنت'); } else advance();
  });
  au.addEventListener('play', dock); au.addEventListener('pause', dock);
  const play = (ranges, o) => {
    if (Rec.active()) { UI.toast('أوقف التسجيل أولًا'); return; }
    const c = Store.S.cfg;
    opts = Object.assign({ each: c.playRepeat || 1, loop: 1, gap: c.playGap || 0 }, o);
    list = Q.expand(ranges); if (!list.length) return;
    i = 0; rep = 0; loops = 0; fails = 0; on = true; clearTimeout(gapT); gapT = null;
    load();
  };
  const stop = finished => {
    on = false; clearTimeout(gapT); gapT = null; au.pause(); au.removeAttribute('src'); dock(); emit();
    if (finished === true) UI.toast('انتهى الاستماع');
  };
  Act.playToggle = () => { if (gapT) { clearTimeout(gapT); gapT = null; advance(); } else if (au.paused) au.play().catch(() => {}); else au.pause(); };
  Act.playStop = () => stop();
  Act.playNext = () => { clearTimeout(gapT); gapT = null; rep = 0; i = Math.min(i + 1, list.length - 1); load(); };
  Act.playPrev = () => { clearTimeout(gapT); gapT = null; rep = 0; i = Math.max(i - 1, 0); load(); };
  const restart = () => { if (on) { rep = 0; load(); } };
  return { play, stop, cur, remote, local, recName, restart, get on() { return on; } };
})();

const beep = () => {
  try {
    const C = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach(t => {
      const o = C.createOscillator(), g = C.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(C.destination);
      g.gain.setValueAtTime(0.25, C.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, C.currentTime + t + 0.3);
      o.start(C.currentTime + t); o.stop(C.currentTime + t + 0.3);
    });
  } catch (e) {}
};
