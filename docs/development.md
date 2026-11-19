# Development

## Run locally

Open `index.html` in a browser. That's it. For a WAV to test with, generate the synthetic sample:

```bash
node tests/make-sample-wav.js sample.wav     # 5 min, 3 channels, 1000 Hz, breathing on channel 3
```

`*.wav` files are git-ignored. **Never commit real recordings.**

## Test

```bash
node tests/core.test.js
```

The test extracts the `<script id="core">` block from `index.html`, builds a synthetic multi-channel WAV in memory (known number of biphasic breaths with drift, noise and a few spikes), runs `parseWav → readChannelDown → analyse → mergeEdits → phaseStats` and checks the count and rate. Run it after any change to the core. No dependencies besides Node ≥ 18.

UI changes: test manually in a browser, at a narrow width (≈ 500 px) and on a high-DPI screen or with browser zoom. Things that broke before: canvases cropping on high-DPI, table overflowing narrow panels, click-vs-drag on the detail plot.

## Deploy to GitHub Pages

The site is served from the `gh-pages` branch, which contains only `index.html` and `.nojekyll`:

```bash
scripts/deploy-pages.sh            # publishes the current index.html from main
```

The script builds the branch in a temporary worktree and pushes it. In the repository settings, GitHub Pages must be set to *Deploy from a branch → gh-pages / (root)* (once). The site is https://jonasprobst.github.io/rel-breathanalyser/.

## Conventions

- Keep the core block DOM-free and testable in Node.
- Times are stored in **seconds** (floats), never sample indices, so edits survive parameter changes.
- Bump `VERSION` in `index.html` when results could change. Bump the combined-store `fmt` when result columns change.
- When changing results columns, update `RES_HEAD`, `resultLines()`, the README's "Results columns" and "Exported files", and `fmt`.
- Keep the README for researchers (no code), and these docs for developers.
- Record notable decisions or removals in `decisions.md`.

## Backlog / ideas

Not requested yet; ask before building.

- **Phase import** from the researchers' Excel/CSV protocol sheets (clock times; recording start time may be in the file name, e.g. `260831_094634` = 2026-08-31 09:46:34).
- **Invert signal** checkbox for sensors where breaths are dips.
- Presets for faster breathing (foals, exercise, small animals).
- Undo for manual edits.
- Inter-rater comparison: load two session files and report agreement.
- Optional amplitude per breath (relative depth) in the breaths CSV.
