// Tests the processing core of index.html on a synthetic recording.
// Run: node tests/core.test.js
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const { makeSampleWav } = require('./make-sample-wav');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
assert(m, 'core script block not found in index.html');
const core = new Function(m[1] + '\nreturn {parseWav, readChannelDown, analyse, mergeEdits, phaseStats};')();

const DEF = { skip: 0, hp: 0.05, lp: 1.0, thr: 0.35, minGap: 1.2, ampWin: 30, unc: 0.10 };
let failed = 0;
function test(name, fn) { try { fn(); console.log('ok   ', name); } catch (e) { failed++; console.log('FAIL ', name, '\n     ', e.message); } }

const { buffer, breaths } = makeSampleWav();
const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length);

test('parseWav reads the header', () => {
  const w = core.parseWav(ab);
  assert.strictEqual(w.fmt.ch, 3); assert.strictEqual(w.fmt.fs, 1000); assert.strictEqual(w.fmt.bits, 16);
  assert.strictEqual(w.fmt.frames, 300000);
});

test('parseWav rejects non-WAV data', () => {
  assert.throws(() => core.parseWav(new ArrayBuffer(64)));
});

const w = core.parseWav(ab);
const { y, f } = core.readChannelDown(w, 2, 20);

test('readChannelDown resamples to 20 Hz', () => {
  assert.strictEqual(f, 20); assert.strictEqual(y.length, 6000);
  const empty = core.readChannelDown(w, 0, 20).y;
  assert(empty.every(v => v === 0), 'empty channel should be all zeros');
});

const D = core.analyse(y, f, DEF);
const E = { added: [], removed: [] };
const B = core.mergeEdits(D, E);

test('detects the right number of breaths (±3 %)', () => {
  const err = Math.abs(B.length - breaths.length) / breaths.length;
  assert(err <= 0.03, `detected ${B.length}, true ${breaths.length} (${(100 * err).toFixed(1)} % off)`);
});

test('detected breaths match true breath times', () => {
  let hit = 0;
  for (const t of breaths) if (B.some(b => Math.abs(b.t - t) < 0.8)) hit++;
  assert(hit / breaths.length >= 0.95, `only ${hit}/${breaths.length} true breaths matched`);
});

test('phaseStats gives a plausible rate', () => {
  const s = core.phaseStats(D, B, E, DEF, 0, D.dur);
  const trueRate = breaths.length / (D.dur / 60);
  assert(Math.abs(s.bpm - trueRate) < 0.6, `bpm ${s.bpm.toFixed(2)} vs true ${trueRate.toFixed(2)}`);
  assert(isFinite(s.bpmMed) && isFinite(s.maxIv) && isFinite(s.sdIv));
});

test('manual edits are applied and counted', () => {
  const t0 = B[10].t, E2 = { added: [B[20].t + 1.5], removed: [t0] };
  const B2 = core.mergeEdits(D, E2);
  assert.strictEqual(B2.length, B.length);
  assert(!B2.some(b => Math.abs(b.t - t0) < 0.01));
  assert.strictEqual(core.phaseStats(D, B2, E2, DEF, 0, D.dur).edits, 2);
});

test('skip start excludes the beginning', () => {
  const D2 = core.analyse(y, f, { ...DEF, skip: 60 });
  assert(D2.auto.every(p => p.t >= 60));
});

if (failed) { console.log(`\n${failed} test(s) failed`); process.exit(1); }
console.log('\nall tests passed');
