// Generates a synthetic plethysmography recording as a 16-bit PCM WAV.
// Usage as a script:  node tests/make-sample-wav.js out.wav [--shallow]
//   --shallow: about 1 in 4 breaths is shallow, so unclear (orange) marks appear; used for the README images
// Used by core.test.js as a module: makeSampleWav(opts) -> { buffer, breaths }
'use strict';

function rng(seed) { // deterministic PRNG (mulberry32)
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function makeSampleWav({ fs = 1000, seconds = 300, channels = 3, signalChannel = 2, seed = 1, shallow = 0 } = {}) {
  const r = rng(seed), n = fs * seconds;
  const sig = new Float64Array(n);
  // Irregular breathing: rate drifts between ~10 and ~22 per minute, each breath biphasic (notch on the way down).
  const breaths = [];
  let t = 2 + r() * 2;
  while (t < seconds - 3) {
    const bpm = 16 + 6 * Math.sin(2 * Math.PI * t / 180) + (r() - 0.5) * 4;
    const dur = 60 / bpm, amp = 400 * (shallow && r() < shallow ? 0.3 + 0.25 * r() : 0.7 + 0.6 * r());
    breaths.push(t + dur * 0.4); // peak of the breath
    const i0 = Math.floor(t * fs), i1 = Math.min(n, Math.floor((t + dur) * fs));
    for (let i = i0; i < i1; i++) {
      const ph = (i / fs - t) / dur; // 0..1 within the breath
      let v = ph < 0.4 ? Math.sin(Math.PI / 2 * ph / 0.4) : Math.cos(Math.PI / 2 * (ph - 0.4) / 0.6);
      v = v * v;
      v -= 0.12 * Math.exp(-Math.pow((ph - 0.62) / 0.05, 2)); // biphasic notch
      sig[i] += amp * v;
    }
    t += dur;
  }
  for (let i = 0; i < n; i++) {
    const s = i / fs;
    sig[i] += 1500 + 300 * Math.sin(2 * Math.PI * s / 97) + 150 * Math.sin(2 * Math.PI * s / 23) // baseline drift
      + (r() - 0.5) * 40 + 15 * Math.sin(2 * Math.PI * 7.3 * s);                                  // noise
  }
  for (let k = 0; k < 4; k++) { // a few short movement-like spikes
    const c = Math.floor((30 + r() * (seconds - 60)) * fs);
    for (let i = c; i < c + fs * 0.4 && i < n; i++) sig[i] -= 900 * Math.sin(Math.PI * (i - c) / (fs * 0.4));
  }
  const bytes = 2, block = bytes * channels, dataLen = n * block;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(fs, 24); buf.writeUInt32LE(fs * block, 28); buf.writeUInt16LE(block, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < channels; c++) {
    const v = c === signalChannel ? Math.round(sig[i]) : 0;
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, v)), 44 + i * block + c * bytes);
  }
  return { buffer: buf, breaths };
}

module.exports = { makeSampleWav };

if (require.main === module) {
  const out = process.argv[2] || 'sample.wav';
  const { buffer, breaths } = makeSampleWav({ shallow: process.argv.includes('--shallow') ? 0.25 : 0 });
  require('fs').writeFileSync(out, buffer);
  console.log(`Wrote ${out}: 5 min, 3 channels, 1000 Hz, breathing on channel 3, ${breaths.length} breaths.`);
}
