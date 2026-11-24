# Breathanalyser

Count breaths in respiratory plethysmography recordings, check every breath by eye, split the recording into phases and export breaths per minute for each phase.

**Open the app:** https://jonasprobst.github.io/rel-breathanalyser/

It runs entirely in your web browser. Recordings are **not uploaded** anywhere; nothing leaves your computer.

![Overview, detail plot and results](docs/screenshot.png)

---

## Quick start (5 minutes)

1. **Open the app** and choose your `.wav` recording in the *Recording* section at the top (or drag it onto the page).
2. **Check the channel.** Multi-channel files show a channel selector next to the file name. The app remembers the last channel you used.
3. **Validate the breaths** in the detail plot (middle):
   - Scroll through the recording (mouse wheel, ← → keys or ◀ ▶) and look closely at the **orange** marks: these are the doubtful ones. The *Unclear* column in the results table shows how many each phase has.
   - **Click a mark** to remove a wrong breath (click again to restore it).
   - **Click a hollow ▽** to count a breath the detector was unsure about.
   - **Click anywhere else** to add a missed breath. It snaps to a peak within ±0.25 s; hold **Alt/Option** to place it exactly.
4. **Mark your phases** by dragging across the overview (top) or the detail plot. Start and end snap to round times that fit the zoom level (whole seconds in a 60 s window, 5 s steps over a few minutes, up to 30 s steps over a long recording); hold **Alt/Option** while dragging for exact times. Rename them and fine-tune start/end times in the table at the bottom (type `m:ss` or seconds).
5. **Export:** *Export results CSV* (one row per phase) and, if needed, *Export breaths CSV* (one row per breath).
6. **Save the session** (*Session → Save*, at the bottom of *Phases and results*) to keep your edits and phases as a `.json` file. *Load* restores them later or on another computer.

To start over on a file, click **Session → Clear** and confirm with *Delete everything*. This removes all phases, added and removed breaths, the Subject ID and the detection settings saved for that file in this browser. It can't be undone, except by loading a session file you saved before.

## The screen

| Area | What it shows | What you can do |
|---|---|---|
| **Recording** | File name, number of channels, sampling rate, duration | Choose or drop a file · pick the channel |
| **Overview** | The whole recording (filtered), phases as coloured bands, black box = what the detail plot shows | Drag = new phase · click = jump there · wheel = zoom · Shift + wheel = pan · zoom buttons (magnifiers) and *Fit* |
| **Breath rate** | Grey dots = 60 / interval between two breaths; black line = breaths counted in a rolling 60 s; dashed = phase average | Click = jump there |
| **Detail** | The signal with every detected breath (filtered, or raw: see below), and, small in the top-right corner, the breath rate of the visible window (e.g. *16.0 breaths/min*) | Click to edit breaths, drag to create a phase · wheel = scroll · Ctrl/⌘ + wheel = zoom · ← → keys or ◀ ▶ · zoom buttons (magnifiers) and *Window* length · `R` = filtered/raw |
| **Phases and results** | One row per phase plus the whole recording | Click a phase to show it in the detail plot · rename, edit times · bin icon = delete · export · *Session*: save, load, clear |
| **Settings** (bottom) | Raw signal, blind review and detection settings | Click *Settings* to open |

The app's version is shown at the bottom of the page.

### Breath marks

| Mark | Meaning |
|---|---|
| ▼ blue | Breath detected automatically |
| ▼ orange | Breath detected, but close to the size threshold (please check) |
| ▽ orange outline | Possible breath just below the threshold, **not counted** unless you click it |
| ▼ green | Breath you added |
| ✕ grey | Breath you removed (click to restore) |

The colours are chosen to stay distinguishable for colour-blind viewers.

### Height scale of the detail plot

The vertical scale stays steady while you scroll (wheel, ← → keys, ◀ ▶), so the trace doesn't jump. It only grows when something would otherwise be cut off, e.g. a large spike scrolling into view; the signal is never cut. It re-fits to exactly what is visible when you zoom, when you jump somewhere (clicking the overview or rate graph, or a phase in the table) and when you switch between filtered and raw. A large spike makes the breaths around it look smaller; zoom in or jump on to see them full size again.

### Filtered or raw signal

The detail plot normally shows the **filtered** signal: slow drift and fast noise are removed, and this is the signal the breaths are detected on. Tick **Raw signal** under *Settings → Display* (or press the `R` key) to see the **raw** signal instead: the original samples of the selected channel, exactly as stored in the file, at the full sampling rate and without any filtering or averaging. Use it when you doubt a breath and want to see what the recording really looked like, e.g. to tell a movement spike or a drifting belt from a breath.

- The breath marks stay at the same times in both views, and you can add and remove breaths in either.
- Detection, the snapping of added breaths, results and exports always use the filtered signal. Switching the view never changes a result.
- Each view has its own vertical scale. In the raw view the scale also re-fits when the signal's offset drifts far while scrolling. Zoomed far out, the raw view draws the lowest and highest value per pixel, so short spikes stay visible.

## Results columns

| Column | Meaning |
|---|---|
| **Breaths /min** | Number of breaths in the phase ÷ phase duration in minutes |
| **Median /min** | 60 ÷ median interval between consecutive breaths. Robust against a single missed or extra breath. Needs at least 4 breaths |
| **Breaths** | Number of breaths in the phase (a breath belongs to the phase its peak falls in) |
| **Longest gap (s)** | Longest interval between two breaths, e.g. breath-holding or a pause |
| **Interval SD (s)** | Standard deviation of the intervals between breaths: breathing regularity |
| **Unclear** | Breaths near the size threshold in this phase, worth checking by eye |
| **Edits** | Breaths you added or removed in this phase |

Short phases give unstable rates: 30 s at 12 breaths/min is only 6 breaths, so one error changes the rate by 2/min. Always report the breath count together with the rate.

## Blind review

Turn on **Blind review** under *Settings* (bottom of the page) to hide all phases and results while validating breaths. The person checking breaths then can't be influenced by knowing which stretch belongs to which condition. Turn it off to see the results. Phases can't be created while blind review is on, and the breath rate of the detail window is hidden too.

## Several recordings

Set the **Subject ID** (defaults to the file name) and export each recording's results CSV. Every row contains the subject ID, file, channel, settings and version, so the files can simply be stacked in Excel, R or Python.

## Exported files

**`<file>_results.csv`**: one row for the whole recording and one per phase:
`subject_id, file, channel, phase, start_s, end_s, duration_s, breaths, bpm_count, bpm_median_interval, longest_interval_s, interval_sd_s, unclear, manual_edits`, followed by the detection settings (`set_…`) and `tool_version`, so every result documents how it was produced.

**`<file>_breaths.csv`**: one row per breath: `subject_id, time_s, source (auto/manual), unclear (0/1), phase`.

**Opening the CSVs:** plain comma-separated UTF-8 text with a header row, decimal point `.`, text in quotes. Empty numeric cells (e.g. *Median /min* for a phase with too few breaths) are read as missing values.

```r
res <- read.csv("sample_results.csv", fileEncoding = "UTF-8")
br  <- read.csv("sample_breaths.csv",  fileEncoding = "UTF-8", na.strings = c("", "NA"))
all <- do.call(rbind, lapply(list.files(pattern = "_results\\.csv$"), read.csv, fileEncoding = "UTF-8"))  # stack all recordings
```

`fileEncoding = "UTF-8"` keeps accented letters in phase names correct on older R versions on Windows. In the breaths file, `phase` is empty for breaths outside any phase; `na.strings` turns that into `NA`. `readr::read_csv()` works too, with no options needed.

**`<file>_session.json`**: phases, your manual edits, settings and channel. Load it again with *Load session*.

## Detection settings

Under *Settings → Detection* at the bottom (shown once a recording is loaded). The defaults were tuned on a resting, standing horse (about 8–30 breaths/min). Your manual edits are kept when you change settings.

| Setting | Default | What it does |
|---|---|---|
| Min breath size | 35 % | A peak counts as a breath only if its rise is at least this share of the typical breath height around it (last/next 15 s) |
| Min time between breaths | 1.2 s | Two peaks closer than this are one breath (the higher one wins). Limits the maximum rate to about 50/min |
| Unclear band | ± 10 % | Peaks within this distance of the size threshold are marked orange / ▽ for review |
| High-pass | 0.05 Hz | Removes slow drift of the belt signal. Slowest countable rate ≈ 3/min |
| Low-pass | 1.0 Hz | Removes fast noise. Highest countable rate ≈ 60/min |
| Typical-size window | 30 s | Window used to judge what a "typical" breath looks like |
| Skip start | 0 s | Ignore the beginning of the recording, e.g. while the belt settles |

**For faster breathing** (foals, after exercise, other species): raise *Low-pass* (e.g. 2–3 Hz) and lower *Min time between breaths* (e.g. 0.4–0.6 s). Always check a few minutes by eye after changing settings, and use the same settings for all recordings of a study.

## Supported files

- `.wav` (RIFF/WAVE), PCM 8/16/24/32-bit or 32/64-bit float, any number of channels, any sampling rate.
- The selected channel is averaged down to 20 samples per second before analysis, which is plenty for breathing.
- Large files work (tested with 12 channels × 28 min at 4410 Hz, 177 MB).

## Use it offline

1. Open the app and click **download for offline use** at the bottom of the page. This saves one file, e.g. `breathanalyser-v1.2.0.html`.
2. Copy it to the lab computer (USB stick, network drive, e-mail) and double-click it. It opens in the browser and works exactly the same without internet.

The file name contains the version, so you can keep several versions side by side. To get an earlier version, open it from the list of earlier versions (see below) and download it from there in the same way.

## Versions

The version (e.g. `v1.2.0`) is shown at the bottom of the app and written into every results row (`tool_version`).

- **Earlier versions online:** https://jonasprobst.github.io/rel-breathanalyser/v/ lists every published version; each one stays available at its own address, e.g. `…/rel-breathanalyser/v/1.2.0/`.
- **Download a version:** use *download for offline use* at the bottom of that version's page. [Releases](https://github.com/jonasprobst/rel-breathanalyser/releases) also keeps the HTML file of each version and lists what changed.

If a new version changes your results, you can reopen the version you used before and compare. Sessions saved with one version can be loaded in another.

## Limitations

- Counts breaths from **one** belt signal. It doesn't measure tidal volume, chest/abdomen synchrony or inspiration/expiration timing.
- There is **no automatic movement detection**. Movement, sniffing, chewing and similar disturbances must be judged by eye.
- Detection is a support tool. The validated result is what you check and correct.
- Saved edits live in your browser's storage. Use *Save session* and the CSV exports as your permanent record.

## Questions, bugs, ideas

Open an issue in this repository. Developer documentation is in [`docs/`](docs/).

## License

[MIT](LICENSE) © 2026 Jonas Probst
