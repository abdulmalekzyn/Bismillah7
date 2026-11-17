// Self-test of the scheduler: runs the plan logic in Node with a simulated clock.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const www = path.join(__dirname, '../app/src/main/assets/www/');
global.window = global;
const ls = {};
global.localStorage = { getItem: k => ls[k] || null, setItem: (k, v) => { ls[k] = v; } };
let NOW = new Date('2026-01-03T08:00:00').getTime();
const RealDate = Date;
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } };
let src = '';
for (const f of ['data/quran.js', 'js/core.js', 'js/plan.js']) src += fs.readFileSync(www + f, 'utf8') + '\n';
vm.runInThisContext(src + ';Object.assign(globalThis,{Q,Plan,Store,DT});');
const nextDay = () => { NOW += 864e5; };
const types = () => Plan.day().tasks.map(t => t.t);

// data integrity
assert.equal(Q.N, 6236); assert.equal(Q.NP, 604); assert.equal(Q.SU.length, 114);
assert(Math.abs(Q.weight([[0, Q.N - 1]]) - 604) < 1e-6);

// Five Fortresses with two juz already memorised
Store.init(); Plan.setMem(Q.juzRange(30), true); Plan.setMem(Q.juzRange(29), true);
Plan.applyMethod('husoon'); Store.S.setup = true;
assert.deepEqual(types(), ['tilawa', 'listen', 'weekly', 'pre', 'new', 'far', 'nightly']);
for (let d = 0; d < 14; d++) {
  for (const t of Plan.day().tasks) { assert(t.r.length && t.w > 0); Plan.complete(t, 'good'); }
  nextDay();
}
assert.equal(Math.round(Plan.memPages()), 43 + 10); // 5 memorisation days a week, one page each
assert.equal(Plan.streak(), 14);
assert(types().includes('near') && types().includes('far'));

// undo restores everything
const before = JSON.stringify([Store.S.mem, Store.S.ptr]);
for (const t of Plan.day().tasks) Plan.complete(t, 'good');
for (const t of Plan.day().tasks) Plan.undo(t);
assert.equal(JSON.stringify([Store.S.mem, Store.S.ptr]), before);

// a full forward khatma: one page a day, every page exactly once
Store.reset(); Plan.applyMethod('takrar'); Store.S.cfg.memDays = [1, 1, 1, 1, 1, 1, 1];
let days = 0;
while (Plan.memCount() < Q.N) {
  const t = Plan.day().tasks.find(x => x.t === 'new');
  assert(t && Math.abs(t.w - 1) < 1e-6); Plan.complete(t); nextDay(); days++;
}
assert.equal(days, 604);

// other orders and methods produce valid days
for (const dir of ['juzback', 'surahback']) for (const m of ['sabaq', 'srs']) {
  Store.reset(); Store.S.cfg.dir = dir; Store.S.cfg.newAmt = 0.5; Plan.applyMethod(m);
  for (let d = 0; d < 20; d++) { for (const t of Plan.day().tasks) Plan.complete(t, d % 3 ? 'good' : 'bad'); nextDay(); }
  assert(Plan.memPages() > 5, dir + m);
}
Store.reset(); Plan.setMem([0, Q.N - 1], true); Plan.applyMethod('tathbeet');
const seen = new Set();
for (let d = 0; d < 7; d++) { const t = Plan.day().tasks.find(x => x.t === 'manzil'); for (let g = t.r[0][0]; g <= t.r[0][1]; g++) seen.add(g); Plan.complete(t); nextDay(); }
assert.equal(seen.size, Q.N); // the weekly cycle covers the whole Quran
console.log('scheduler self-test passed');
