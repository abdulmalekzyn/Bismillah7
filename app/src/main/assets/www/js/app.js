'use strict';
/* ===== bootstrap ===== */
(() => {
  Store.init();
  UI.theme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', UI.theme);
  Settings.start();
  // a new day may begin while the app stays open
  let lastDay = DT.today();
  const tick = () => {
    if (DT.today() !== lastDay && Store.S.setup) { lastDay = DT.today(); if (UI.tab === 'today' && !UI.depth) UI.render(); }
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) Store.flush(); else tick(); });
  setInterval(tick, 60000);
  window.addEventListener('pagehide', () => Store.flush());
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
