# Design decisions

Chronological record of the reasoning behind the app, so future changes don't undo things by accident.

## Why not machine learning (yet)

The question at the start was whether a visual/ML classifier would beat an algorithm. Decision: start with a robust classical detector plus fast human validation, because:
- there was no labelled data (15 horses × 15–30 min, ~a few thousand breaths in total);
- "visual" ML (treating the plot as an image) only adds pixel resolution loss; a 1-D model on the signal would be the right ML approach;
- the corrections made in this app *are* labels. If ML is ever wanted, export the breaths CSV (`source = auto/manual`) from validated recordings and train on that.

## Single HTML file, no build

Researchers need to open it without installing anything, also offline. No framework, no CDN.

## Data never leaves the browser

Recordings are research data. The file is read with `File.arrayBuffer()` and processed locally; there are no network requests.

## Adaptive size threshold instead of fixed amplitude

Belt impedance amplitude varies between animals, belt positions and over time. A threshold relative to the local typical breath size (10–90 percentile range over 30 s) handles that without per-recording tuning.

## Two rates per phase

`Breaths /min` (count / time) is what people expect. `Median /min` (60 / median interval) is robust to a single missed or extra breath. If they differ a lot, the phase is irregular or contains errors: check it.

## Blind review

Added for a pain study (thermal stimulation, phases = baseline / stimuli / rest), so that whoever validates breaths can't be influenced by knowing which stretch is a stimulus. Kept as a general feature.

## Removed: phase types and stimulus windows (2026-11-19)

There was a phase type (baseline/stimulus/rest) and automatic extra rows for 60 s before stimulus onset and after the reaction. **Removed on purpose** to keep the tool general for other studies: researchers are responsible for deriving study-specific measures. Phases are just `name + start + end`. Don't reintroduce study-specific logic without asking.

## Removed: movement detection (2026-11-19)

A slope-based movement detector (flag where `|dz/dt|` > 8 × median, dilated by 1 s) flagged 0 % on a recording of a horse that moved a lot. Removed with its column, setting and graph markings. Don't add it back unless it is validated against video or an accelerometer.

## Skip start default 0 s

It was 30 s (the belt settles in the first ~20 s of the reference recording). Changed to 0 so no data is silently excluded. Researchers can exclude the start with their phase boundaries or the setting.

## Settings written into every results row

So results from different recordings can be compared and reviewers can see how they were produced. The combined export warns if settings differ between recordings.

## Subject ID instead of Horse ID

Generalised for other species. The internal variable is still `horseId`.

## Manual breath snapping

First: snap to the highest point within ±0.75 s (felt like an offset to the right). Then: exact click position. Final: snap to the **nearest** local maximum within ±0.25 s, otherwise exact; Alt/Option forces exact.

## Raw signal view (2026-11-19)

Researchers wanted to inspect the original data behind a doubtful breath. The detail plot has a Filtered/Raw **switch** (not an overlay: raw has an offset and drift, so one shared scale would squash the breaths, and two scales in one plot mislead). "Raw" means the **original samples at the file's sampling rate**, not the 20 Hz average, so nothing is hidden. Only the detail plot switches; the overview stays filtered so navigation looks the same. It is a view only and not saved with the session: results never depend on it. `VERSION` went to 1.1.0 as a feature release; results are identical to 1.0.0.

## Name

Started as "Breath counter", renamed to **Breathanalyser**. Storage keys still use the `breathcounter:` prefix for compatibility.
