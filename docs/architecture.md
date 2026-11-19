# Architecture

Breathanalyser is a **single self-contained HTML file** (`index.html`): markup, CSS and JavaScript inline, no build step, no dependencies, no network calls. This is deliberate: researchers can open it from GitHub Pages, from a claude.ai artifact, or from a downloaded copy on an offline lab computer, and it behaves the same everywhere.

## File layout

```
index.html                 the whole app
README.md                  user guide for researchers
LICENSE                    MIT
CLAUDE.md                  entry point for Claude Code
docs/
  architecture.md          this file
  algorithm.md             signal processing and breath detection
  decisions.md             why things are the way they are (and what was removed)
  development.md           run, test, deploy, backlog
  screenshot.png           used by the README
tests/
  core.test.js             Node test of the processing core on a synthetic recording
  make-sample-wav.js       generates the synthetic test recording
scripts/
  deploy-pages.sh          publishes index.html to the gh-pages branch
```

## Inside `index.html`

The file has two `<script>` blocks.

### 1. `<script id="core">`: pure processing, no DOM

Everything here is a plain function and can run in Node (the test extracts this block by its id and `eval`s it). **Keep it DOM-free.**

| Function | Purpose |
|---|---|
| `parseWav(buf)` | Parses RIFF/WAVE headers (incl. WAVE_FORMAT_EXTENSIBLE, odd chunk padding, broken/oversized data-chunk sizes). Returns `{fmt, data, dv}` |
| `sampleReader(fmt, dv)` | Returns a reader for 8/16/24/32-bit PCM or 32/64-bit float |
| `readChannelDown(w, ch, f)` | Reads one channel and block-averages it to `f` Hz (20 Hz in the UI) |
| `readChannelRange(w, ch, t0, t1, nb)` | Reads one channel at the original rate for a time span, for the raw view. Returns `{t, lo, hi}`: every sample (`lo === hi`) if there are ≤ `2·nb`, else min/max of `nb` bins |
| `biquad`, `lfilter`, `filtfilt` | 2nd-order RBJ high/low-pass, zero-phase forward–backward filtering with odd-reflection padding (like SciPy's `filtfilt`) |
| `analyse(y, f, P)` | Full detection pipeline (see `algorithm.md`). Returns `D = {f, n, s0, z, amp, auto, cand, dur}` |
| `mergeEdits(D, E)` | Combines automatic breaths with manual edits → final breath list `B` |
| `phaseStats(D, B, E, P, a, b)` | Statistics for a time span `[a, b)`: count, rates, longest gap, interval SD, unclear, edits |

### 2. Second `<script>`: UI

Global state (plain variables, no framework):

| Variable | Meaning |
|---|---|
| `P` | Detection parameters (defaults in `DEF`) |
| `W` | Parsed WAV (kept so the channel can be switched without re-reading the file) |
| `Y` | Selected channel at 20 Hz |
| `D` | Result of `analyse` |
| `E = {added:[t…], removed:[t…]}` | Manual edits, stored as **times in seconds** so they survive re-analysis with different settings |
| `B` | Final breaths (`mergeEdits(D,E)`) |
| `phases = [{name, a, b}]` | Phases in seconds, kept sorted by start |
| `view`, `span` | Detail plot window (start, length in s) |
| `ov0`, `ov1` | Overview/rate graph zoom range |
| `blind` | Blind review on/off (hides phases and results everywhere) |
| `showRaw`, `rawC` | Detail plot shows raw instead of filtered signal (not persisted); cache of the last raw window read |
| `horseId` | Subject ID (variable name is historical; the UI and exports say "subject") |

Flow:

```
file → parseWav → readChannelDown → Y
Y + P → analyse → D            (run(): on load, channel change, settings change)
D + E → mergeEdits → B          (refresh(): after every edit or phase change)
→ drawAll() (overview, rate, detail canvases) + renderTable() + save()
```

`run()` re-analyses; `refresh()` only re-merges edits and redraws. Use the cheaper one when settings haven't changed.

### Rendering

Three `<canvas>` elements drawn with the 2D API. `setup(c)` sizes each canvas for the device pixel ratio. Its CSS height comes from the original `height` attribute, stored in `data-h`. **Don't read `c.height` back as the CSS height**: that was a bug that made graphs grow and crop on high-DPI screens. A `ResizeObserver` on `#app` redraws when the container changes width (e.g. side panels).

Shared x-axis margins: `L = 56`, `R = 10` px. Every mouse→time conversion uses the same margins.

Raw view (`showRaw`): `drawDetail()` draws `readChannelRange(W, chan, …)` for the visible window instead of `D.z`, with one bin per plot pixel, and puts the marks on that trace. It is display only: detection, click snapping, statistics and exports keep using `D.z`. The result is cached in `rawC` (keyed by file, channel, window and width) because the detail plot redraws on every mouse move while dragging.

Mouse interaction on the detail plot: `mousedown` → `mousemove` → `mouseup`. A movement of more than 5 px is a drag (creates a phase if ≥ 1 s and blind review is off). Otherwise it's a click and goes to `detailClick`.

### Persistence

| What | Where |
|---|---|
| Session (phases, edits, params, channel, subject ID) | `localStorage['breathcounter:<filename>:<size>']`, autosaved on every change. Also exportable as JSON |
| Last channel | `localStorage['breathcounter:channel']` |
| Blind review | `localStorage['breathcounter:blind']` |
| Combined results | `localStorage['breathcounter:combined']` = `{<filename>: {fmt, subject, settings, lines[]}}` |

The `breathcounter:` key prefix is the app's former name. It is kept so existing users don't lose saved work. All storage access is wrapped in `try/catch`: storage may be missing (sandboxed iframes, private mode).

`fmt` in the combined store is a format version. Entries with another `fmt` are ignored, because their CSV columns would not line up. **Bump it whenever the results columns change.**

### Export

`offer(name, text, mime)` tries, in order:
1. `claude.use('downloads')`: only exists when the page runs as a claude.ai artifact with the `downloads` capability declared.
2. A normal `<a download>` (GitHub Pages, local file).
3. Shows the text in a textarea and copies it to the clipboard (fallback for sandboxed frames).

### Version

`const VERSION` is written into every results row (`tool_version`). Bump it on any change that can alter results (detection, statistics, columns).

## Hosting

- **GitHub Pages:** the `gh-pages` branch contains only `index.html` and `.nojekyll`. Publish with `scripts/deploy-pages.sh` (see `development.md`).
- **claude.ai artifact:** the same file has also been published as an artifact; it declares the `downloads` capability.
