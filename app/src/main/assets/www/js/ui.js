'use strict';
/* ===== tiny UI toolkit: icons, navigation, sheets, toasts, native bridge ===== */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const Native = window.Android || null;

const ICONS = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  book: 'M12 6c-2-1.6-4.6-2-8-2v14c3.4 0 6 .4 8 2 2-1.6 4.6-2 8-2V4c-3.4 0-6 .4-8 2zM12 6v14',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  note: 'M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6',
  chart: 'M5 20V11M12 20V4M19 20v-6M2 20h20',
  headphones: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeoff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.5 2 12 2 12s4 7 10 7a9.5 9.5 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  refresh: 'M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4',
  layers: 'M12 3l9 5-9 5-9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  play: 'M7 4l13 8-13 8z', pause: 'M7 4v16M17 4v16', stop: 'M6 6h12v12H6z',
  plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6L6 18',
  next: 'M15 5l-7 7 7 7', prev: 'M9 5l7 7-7 7', back: 'M9 5l7 7-7 7',
  gear: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  flame: 'M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17v.5',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11.5v1',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  timer: 'M12 7a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM12 10v4M9 3h6',
  award: 'M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM8.5 14L7 21l5-3 5 3-1.5-7',
  link: 'M9 15l6-6M10 6l1-1a4.2 4.2 0 0 1 6 6l-1 1M14 18l-1 1a4.2 4.2 0 0 1-6-6l1-1',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
};
const ic = (n, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n] || ''}"/></svg>`;

const Act = {}; // click actions: data-a="name"
const Chg = {}; // change/input actions: data-c="name"

const UI = (() => {
  const TABS = [
    { id: 'today', label: 'اليوم', icon: 'home' },
    { id: 'mushaf', label: 'المصحف', icon: 'book' },
    { id: 'tools', label: 'الأدوات', icon: 'grid' },
    { id: 'journal', label: 'دفتري', icon: 'note' },
    { id: 'progress', label: 'التقدّم', icon: 'chart' },
  ];
  const screens = {}; // tab id -> render(root)
  let tab = 'today', stack = [], sheetClose = null;

  const view = () => $('#view');
  const render = () => {
    const top = stack[stack.length - 1];
    document.body.classList.toggle('sub', !!top);
    const v = view(); v.className = ''; v.scrollTop = 0;
    if (top) {
      v.innerHTML = `<header class="bar"><button class="ib" data-a="back" aria-label="رجوع">${ic('back')}</button><h1>${esc(top.title)}</h1><span class="bar-x" id="bar-x"></span></header><div id="sub"></div>`;
      top.render($('#sub'));
    } else screens[tab](v);
    $('#tabs').innerHTML = TABS.map(t => `<button data-a="tab" data-id="${t.id}" class="${t.id === tab ? 'on' : ''}">${ic(t.icon)}<span>${t.label}</span></button>`).join('');
  };
  const refresh = () => { // re-render keeping scroll
    const v = view(), y = v.scrollTop; render(); view().scrollTop = y;
  };
  const go = id => { stack.forEach(s => s.leave && s.leave()); stack = []; tab = id; render(); };
  const push = (title, renderFn, leave) => { stack.push({ title, render: renderFn, leave }); render(); };
  const pop = () => { const s = stack.pop(); if (s && s.leave) s.leave(); render(); };

  const sheet = (html, onClose) => {
    $('#sheet').innerHTML = `<div class="grab"></div>${html}`;
    $('#sheet-wrap').hidden = false; sheetClose = onClose || null;
    requestAnimationFrame(() => $('#sheet-wrap').classList.add('open'));
  };
  const closeSheet = () => {
    const w = $('#sheet-wrap'); if (w.hidden) return false;
    w.classList.remove('open'); w.hidden = true; $('#sheet').innerHTML = '';
    const f = sheetClose; sheetClose = null; if (f) f();
    return true;
  };
  let toastT;
  const toast = msg => {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
  };
  const confirm = (msg, yes, cb, danger) => {
    sheet(`<h3>${esc(msg)}</h3><div class="row gap"><button class="btn ${danger ? 'danger' : 'pri'} grow" data-a="confirmYes">${esc(yes)}</button><button class="btn grow" data-a="sheetClose">إلغاء</button></div>`);
    Act.confirmYes = () => { closeSheet(); cb(); };
  };
  const vibrate = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const theme = () => {
    const t = Store.S.ui.theme;
    const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.setProperty('--qsize', Store.S.ui.font + 'px');
  };
  const back = () => { // returns true when handled
    if (closeSheet()) return true;
    if (stack.length) { pop(); return true; }
    if (tab !== 'today') { go('today'); return true; }
    return false;
  };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]'); if (!el) return;
    const f = Act[el.dataset.a]; if (f) f(el, e);
  });
  const onChg = e => { const el = e.target.closest('[data-c]'); if (el && Chg[el.dataset.c]) Chg[el.dataset.c](el, e); };
  document.addEventListener('change', onChg);
  document.addEventListener('input', e => { const el = e.target.closest('[data-i]'); if (el && Chg[el.dataset.i]) Chg[el.dataset.i](el, e); });
  Act.tab = el => go(el.dataset.id);
  Act.back = () => back();
  Act.sheetClose = () => closeSheet();
  window.onAndroidBack = () => back();

  return { screens, render, refresh, go, push, pop, sheet, closeSheet, toast, confirm, vibrate, theme, back, get tab() { return tab; }, get depth() { return stack.length; } };
})();

/* shared small widgets */
const W = {
  ring(frac, size, label, sub) {
    const r = size / 2 - 7, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0));
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle class="ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}"/><circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg><div class="ring-in"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div></div>`;
  },
  chips(name, opts, cur) {
    return `<div class="chips">${opts.map(([v, l]) => `<button class="chip ${String(v) === String(cur) ? 'on' : ''}" data-a="${name}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
  },
  surahSelect(id, cur, attrs) {
    return `<select id="${id}" ${attrs || ''}>${Q.SU.map((s, i) => `<option value="${i}" ${i === cur ? 'selected' : ''}>${num(i + 1)}. ${s.name}</option>`).join('')}</select>`;
  },
  empty(icon, title, text) { return `<div class="empty">${ic(icon)}<b>${title}</b><p>${text}</p></div>`; },
  // verbatim ayah text for display, optionally with the ayah-number marker
  ayah(g, withNum) { return esc(Q.A[g]) + (withNum ? ` <span class="anum">${num(Q.ref(g).a)}</span>` : ''); },
};
