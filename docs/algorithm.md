# Breath detection algorithm

Implemented in `analyse()` in the `<script id="core">` block of `index.html`.

## Context

Developed for **impedance belt plethysmography** around the chest of a standing horse. One belt, one channel (channel 12 of a 12-channel, 4410 Hz WAV recorder; the other channels were empty). The signal rises and falls with each breath. Problems with naive peak counting:

- **Biphasic breathing**: horses breathe in and out in two steps, so a single breath often has a notch or a second small peak. Counting every local maximum gave ~58/min instead of ~16/min.
- **Irregular rhythm** and **baseline drift**, so fixed thresholds and dominant-frequency methods don't work.
- **Movement**, with occasional large spikes.

## Pipeline

1. **Downsample** the selected channel to 20 Hz by block averaging (`readChannelDown`). This also acts as a crude anti-alias filter.
2. **Skip start** (`P.skip`, default 0 s): samples before it are replaced by the first kept value before filtering (avoids a filter transient), then set to 0.
3. **Band-pass**, zero-phase: 2nd-order high-pass at `P.hp` (0.05 Hz), then 2nd-order low-pass at `P.lp` (1.0 Hz), each applied forward and backward (`filtfilt`) with 20 s of odd-reflection padding. Result: `z`. Passband ≈ 3–60 breaths/min.
4. **Typical breath size** `amp[i]`: the 90th minus 10th percentile of `z` in a window of `P.ampWin` (30 s) centred on each second, held constant within that second.
5. **Candidate peaks**: all local maxima of `z` after the skip.
6. **Minimum distance** (`P.minGap`, 1.2 s): candidates sorted by height; a candidate is dropped if a higher kept one lies within `minGap`. Same rule as SciPy's `find_peaks(distance=…)`, applied **before** the size test (as in the original Python prototype).
7. **Prominence**: for each remaining peak, walk left and right (at most `ampWin` seconds each way, stopping at a higher sample) to the lowest point. Prominence = peak − the higher of the two minima. Ratio `r = prominence / amp`.
8. **Classify**:
   - `r ≥ P.thr` (0.35) → breath (`D.auto`)
   - `P.thr − P.unc ≤ r < P.thr` → candidate, not counted (`D.cand`, drawn as ▽)
   - auto breaths with `r < P.thr + P.unc` are "unclear" (orange)
9. **Manual edits** (`mergeEdits`): auto breaths within 0.3 s of a removed time are dropped; added times are appended.

Manual add (UI): the click snaps to the **nearest** local maximum within ±0.25 s (`SNAP`), otherwise it stays at the click position; Alt/Option always places it exactly. An earlier version snapped to the *highest* point within ±0.75 s, which on a rising slope always jumped to the right. That was confusing.

## Per-phase statistics (`phaseStats`)

Breaths are assigned to a phase by their peak time, in `[a, b)`.

| Value | Formula |
|---|---|
| `bpm` | n / (duration in min) |
| `bpmMed` | 60 / median(intervals); needs ≥ 3 intervals |
| `maxIv` | max interval between consecutive breaths inside the phase |
| `sdIv` | sample SD of those intervals; needs ≥ 3 intervals |
| `unc` | auto breaths with r < thr + unc, plus ▽ candidates in the phase |
| `edits` | added + removed times in the phase |

Only intervals between two breaths that are **both** inside the phase are used.

## Reference result

Recording `260831_094634_000.wav` (horse, standing, 27:50 min; not in the repository): **452 breaths**, 16.2/min overall, 58 unclear, with default settings. A Python prototype (SciPy `butter(2,[.05,1])` + `find_peaks`) gave 453. Rates in quiet stretches were 10–18/min, in line with resting reference values for adult horses (about 8–16, up to 24/min).

## Known limitations / ideas

- No movement detection. A slope-based detector (`|dz/dt| > k · median`) was tried and removed because it hardly flagged anything on real data (see `decisions.md`). Proper movement detection needs a second sensor (accelerometer/video).
- `minGap` and `lp` cap the rate at ~50–60/min. Fine for resting adults, not for exercise or foals.
- The typical-size window adapts to the signal. During long stretches of very shallow breathing, the threshold drops with it, so small disturbances may be counted.
- Polarity: the detector counts **maxima**. If a sensor produces breaths as dips, the signal would need inverting (not implemented; would be a simple checkbox).
