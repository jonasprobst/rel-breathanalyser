# Architecture

Breathanalyser is a **single self-contained HTML file** (`index.html`): markup, CSS and JavaScript inline, no build step, no dependencies, no network calls (except the user-clicked offline download link, which re-fetches the page itself). This is deliberate: researchers can open it from GitHub Pages, from a claude.ai artifact, or from a downloaded copy on an offline lab computer, and it behaves the same everywhere.

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
  screenshot.png, detail.png  README images (how to regenerate: development.md)
tests/
  core.test.js             Node test of the processing core on a synthetic recording
  make-sample-wav.js       generates the synthetic test recording
scripts/
  deploy-pages.sh          publishes index.html to the gh-pages branch (latest + v/<version>/)
  release.sh               tags v<VERSION>, pushes the tag, runs deploy-pages.sh
.github/workflows/
  release.yml              on a v* tag: checks VERSION, runs the test, creates the GitHub Release
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
| `blind` | Blind review on/off (hides phases and results everywhere). Set with the checkbox in Settings |
| `showRaw`, `rawC` | Detail plot shows raw instead of filtered signal (checkbox in Settings or key R; not persisted); cache of the last raw window read |
| `ys` | Detail plot vertical scale (see below); `null` = re-fit on the next draw |
| `actP` | Phase currently shown/highlighted in the table |
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

Page layout, top to bottom:
- Header: title, purpose line, Help.
- *Recording* card: file info, channel, file button; drop zone until a file is loaded.
- `#app` (hidden until a file is loaded): Overview + rate graph, Detail, Phases and results (with the *Session* row: Save / Load / Clear).
- *Settings* (`<details id="settings">`): Display (`#rawChk`), Review (`#blind`), Detection (`#detSet`, shown only once a file is loaded, because loading resets the parameters).
- Footer: version, help, offline download, earlier versions.

Detail plot:
- **Vertical scale** `ys = {raw, dlo, dhi, lo, hi}`. `ys = null` → re-fit to the visible min/max on the next draw: on zoom (`setSpan`), jumps (`setView(v, true)`, overview/rate click, phase row), raw switch, `run()`, channel change, file load. Otherwise each draw only *grows* `dlo/dhi`, so nothing is cut off. Raw view also re-fits when the range exceeds 4× the visible range (offset drift).
- **Top strip** `TOP = 16` px is reserved for the window rate label; marks are clamped below it.
- **Raw view** (`showRaw`): draws `readChannelRange(W, chan, …)` (one bin per pixel) instead of `D.z`, cached in `rawC`. Display only: detection, snapping, stats and exports use `D.z`.
- **Colours** (Okabe–Ito): auto `#0072b2`, unclear `#e69f00`, added `#009e73`, removed grey. CSS tokens `--brk`, `--unc`, `--add` for the legend.
- **Window select**: fixed options 10/30/60/120/300 s; other lengths are shown via the hidden `#spanCustom` option.

Phases:
- Drags in overview and detail snap both edges with `snapT(t, visibleSeconds, e)`: 1 s (≤ 70 s visible), 5 s (≤ 400 s), 10 s (≤ 1200 s), else 30 s. Alt/Option = exact.
- Clicking or focusing a table row calls `showPhase` (moves the detail plot, highlights via `actP`). The bin icon deletes without jumping.

Mouse interaction on the detail plot: `mousedown` → `mousemove` → `mouseup`. A movement of more than 5 px is a drag (creates a phase if ≥ 1 s and blind review is off). Otherwise it's a click and goes to `detailClick`.

### Persistence

| What | Where |
|---|---|
| Session (phases, edits, params, channel, subject ID) | `localStorage['breathcounter:<filename>:<size>']`, autosaved on every change. Also exportable as JSON |
| Last channel | `localStorage['breathcounter:channel']` |
| Blind review | `localStorage['breathcounter:blind']` |

The `breathcounter:` key prefix is the app's former name. It is kept so existing users don't lose saved work. All storage access is wrapped in `try/catch`: storage may be missing (sandboxed iframes, private mode).

- *Session → Clear* removes `localStorage[key()]` and resets `P`, `phases`, `E`, `horseId` (channel and blind review are kept). Inline confirmation, no `confirm()`: sandboxed frames block modals.
- A former `breathcounter:combined` key (removed in 1.2.0) may still exist in some browsers; nothing reads it.

### Export

`offer(name, text, mime)` tries, in order:
1. `claude.use('downloads')`: only exists when the page runs as a claude.ai artifact with the `downloads` capability declared.
2. A normal `<a download>` (GitHub Pages, local file).
3. Copies the text to the clipboard, only if creating the download throws (fallback for sandboxed frames). There is no on-page text box any more.

### Offline download

The footer link *download for offline use* (`#dlSelf`) is an `<a download="breathanalyser-v<VERSION>.html">` pointing at the page's own URL. It is shown only on `http(s)` and when not inside a frame: a downloaded copy (`file:`) is already offline, and sandboxed frames (claude.ai artifact) may block downloads. The browser re-fetches the page from the site when clicked; that is the only request the app can cause, and it is user-initiated and carries no data. It downloads the served file, not the live DOM, so no session state ends up in the copy. On `v/<VERSION>/` pages it downloads that version.

### CSV format

Written for R's `read.csv()` with default options on any platform, incl. Windows R < 4.2 (see `decisions.md`):
- `q()` quotes text and passes it through `ascii()` (`TRANSLIT` table, then accent stripping; other non-ASCII → `_`). Quotes are doubled.
- Missing numbers and phases → `NA` (`n2()`).
- No BOM, CRLF line endings (`EOL`).
- Session JSON is not affected and keeps full Unicode.

### Version

`const VERSION` is written into every results row (`tool_version`) and the session file, and shown in the footer. Bump it on any change that can alter results (detection, statistics, columns), and for feature releases. Each released version gets a git tag `v<VERSION>`, a GitHub Release with the HTML attached, and a permanent copy on the site at `v/<VERSION>/` (see `development.md`).

## Hosting

- **GitHub Pages:** the `gh-pages` branch contains `index.html` (latest), `.nojekyll` and `v/` (one folder per published version plus a generated list). Publish with `scripts/deploy-pages.sh` or `scripts/release.sh` (see `development.md`).
- **claude.ai artifact:** the same file has also been published as an artifact; it declares the `downloads` capability.
