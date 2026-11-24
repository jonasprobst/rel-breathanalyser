# Development

## Run locally

Open `index.html` in a browser. That's it. For a WAV to test with, generate the synthetic sample:

```bash
node tests/make-sample-wav.js sample.wav             # 5 min, 3 channels, 1000 Hz, breathing on channel 3
node tests/make-sample-wav.js example.wav --shallow  # same with some shallow breaths (orange marks); used for the README images
```

README images (`docs/screenshot.png`, `docs/detail.png`): load `example.wav`, phases Baseline 0:00–1:30 / Stimulus –3:20 / Rest –5:00, Subject ID "Horse 1", one breath added and one removed around 0:15–0:45. Screenshot at 1280 px width, device scale 2.

`*.wav` files are git-ignored. **Never commit real recordings.**

## Test

```bash
node tests/core.test.js
```

The test extracts the `<script id="core">` block from `index.html`, builds a synthetic multi-channel WAV in memory (known number of biphasic breaths with drift, noise and a few spikes), runs `parseWav → readChannelDown → analyse → mergeEdits → phaseStats` and checks the count and rate. Run it after any change to the core. No dependencies besides Node ≥ 18.

UI changes: test manually in a browser, at a narrow width (≈ 500 px) and on a high-DPI screen or with browser zoom. Things that broke before: canvases cropping on high-DPI, table overflowing narrow panels, click-vs-drag on the detail plot.

## Deploy to GitHub Pages

The site is served from the `gh-pages` branch (`index.html`, `.nojekyll`, `v/<version>/`):

```bash
scripts/deploy-pages.sh            # publishes the current index.html from main
```

The script builds the branch in a temporary worktree and pushes it. It replaces the root `index.html` and adds/updates `v/<VERSION>/index.html` and the list at `v/index.html`; earlier `v/…` folders are kept. Deploying again with the same `VERSION` overwrites that version's copy (fine for fixes that don't change results; otherwise bump `VERSION`). In the repository settings, GitHub Pages must be set to *Deploy from a branch → gh-pages / (root)* (once). The site is https://jonasprobst.github.io/rel-breathanalyser/.

## Release a version

1. Bump `const VERSION` in `index.html` (semver: patch = fixes, minor = features, major = results change in a way that breaks comparison with earlier results), update README and `decisions.md`, merge to `main`.
2. On an up-to-date, clean `main`:

```bash
scripts/release.sh
```

It runs the test, creates and pushes the tag `v<VERSION>`, and runs `deploy-pages.sh`. The pushed tag starts `.github/workflows/release.yml`, which checks that the tag matches `VERSION`, runs the test and creates the GitHub Release with `breathanalyser-v<VERSION>.html` attached and generated notes.

Versions before 1.2.0 were not tagged. To add 1.1.0 afterwards: `git tag -a v1.1.0 d937bd5 -m "Breathanalyser v1.1.0" && git push origin v1.1.0` (creates the Release; there is no site copy for it).

## Conventions

- Keep the core block DOM-free and testable in Node.
- Times are stored in **seconds** (floats), never sample indices, so edits survive parameter changes.
- Bump `VERSION` in `index.html` when results could change, and release it (see above).
- When changing results columns, update `RES_HEAD`, `resultLines()` and the README's *Results* and *Exported files* tables.
- Keep the README for researchers: short, by importance, tables over prose. Technical details go here in `docs/`.
- Record notable decisions or removals in `decisions.md`.

## Backlog / ideas

Not requested yet; ask before building.

- **Phase import** from the researchers' Excel/CSV protocol sheets (clock times; recording start time may be in the file name, e.g. `260831_094634` = 2026-08-31 09:46:34).
- **Invert signal** checkbox for sensors where breaths are dips.
- Presets for faster breathing (foals, exercise, small animals).
- Undo for manual edits.
- Inter-rater comparison: load two session files and report agreement.
- Optional amplitude per breath (relative depth) in the breaths CSV.
