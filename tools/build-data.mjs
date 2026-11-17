// Generates the offline Quran data + copies fonts and pdf.js into the app assets.
// Text: quran-json (Uthmani text from QuranEnc.com, CC-BY-4.0) — copied verbatim, never modified.
// Page / juz / hizb boundaries: quran-meta (Hafs, Madani mushaf, 604 pages).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as hafs from 'quran-meta/hafs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const www = path.join(here, '../app/src/main/assets/www');
const quran = require('quran-json/dist/quran.json');

const ayahs = [];
const surahs = [];
for (const s of quran) {
  if (s.verses.length !== s.total_verses) throw new Error('verse count mismatch in surah ' + s.id);
  surahs.push({ name: s.name, start: ayahs.length, count: s.verses.length, makki: s.type === 'meccan' });
  s.verses.forEach((v, i) => {
    if (v.id !== i + 1 || !v.text) throw new Error(`bad verse ${s.id}:${i + 1}`);
    ayahs.push(v.text);
  });
}
if (ayahs.length !== 6236 || surahs.length !== 114) throw new Error('unexpected totals');
// cross-check surah starts with quran-meta
surahs.forEach((s, i) => {
  const [first, count] = hafs.SurahList[i + 1];
  if (first - 1 !== s.start || count !== s.count) throw new Error('surah boundary mismatch ' + (i + 1));
});
const list = (l, n) => {
  const out = l.slice(1, -1).map(x => x - 1);
  if (out.length !== n || out[0] !== 0) throw new Error('bad list');
  return out;
};
const data = {
  surahs,
  ayahs,
  pages: list(hafs.PageList, 604),
  juz: list(hafs.JuzList, 30),
  rub: list(hafs.HizbQuarterList, 240),
  manzil: list(hafs.ManzilList, 7),
  sajda: hafs.SajdaList.map(x => x - 1),
};
fs.writeFileSync(path.join(www, 'data/quran.js'), 'window.QDATA=' + JSON.stringify(data) + ';\n');

// Search index: imla'i (simple) text from quran-json@2.0.0 (Al Quran Cloud "quran-simple"), reduced to bare letters.
// It is only used to find ayahs when the user types without tashkeel; it is never displayed.
const bare = s => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
const BASM = bare('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
const idx = [];
for (let s = 1; s <= 114; s++) {
  const su = require(`quran-json-simple/surahs/${s}.json`);
  if (su.verses.length !== surahs[s - 1].count) throw new Error('search index: verse count mismatch in surah ' + s);
  su.verses.forEach((v, i) => {
    let t = bare(v.text);
    if (i === 0 && s !== 1 && s !== 9) { if (!t.startsWith(BASM + ' ')) throw new Error('search index: no basmala prefix in ' + s); t = t.slice(BASM.length + 1); }
    if (!t) throw new Error('search index: empty ayah');
    idx.push(t);
  });
}
if (idx.length !== 6236) throw new Error('search index size');
fs.writeFileSync(path.join(www, 'data/search.js'), 'window.QSEARCH=' + JSON.stringify(idx.join('\n')) + ';\n');

const nm = p => path.join(here, 'node_modules', p);
const cp = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
// The mushaf font (KFGQPC HAFS Uthmanic Script v18) is committed in assets/fonts: the QuranEnc text uses its encoding.
for (const w of [400, 500, 700]) cp(nm(`@fontsource/tajawal/files/tajawal-arabic-${w}-normal.woff2`), path.join(www, `fonts/tajawal-${w}.woff2`));
cp(nm('pdfjs-dist/legacy/build/pdf.min.mjs'), path.join(www, 'pdfjs/pdf.min.mjs'));
cp(nm('pdfjs-dist/legacy/build/pdf.worker.min.mjs'), path.join(www, 'pdfjs/pdf.worker.min.mjs'));
cp(nm('pdfjs-dist/LICENSE'), path.join(www, 'pdfjs/LICENSE'));
fs.cpSync(nm('pdfjs-dist/standard_fonts'), path.join(www, 'pdfjs/standard_fonts'), { recursive: true });
console.log('ok', ayahs.length, 'ayahs');
