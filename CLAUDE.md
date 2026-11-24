# Breathanalyser

Single-file browser app (`index.html`) to count and validate breaths in plethysmography WAV recordings, split them into phases and export breaths per minute. Users are veterinary/biomedical researchers, not programmers.

Read before changing anything:
- `docs/architecture.md`: structure of `index.html`, state, rendering, storage, export
- `docs/algorithm.md`: detection pipeline and statistics
- `docs/decisions.md`: why things are as they are, and what was removed on purpose (phase types, stimulus windows, movement detection: don't reintroduce without asking)
- `docs/development.md`: test, deploy, conventions, backlog

Rules:
- Keep it one self-contained HTML file: no build step, no dependencies, no network requests (only exception: the user-clicked "download for offline use" link re-fetches the page itself). Recordings must never leave the browser.
- Keep the `<script id="core">` block DOM-free; run `node tests/core.test.js` after changing it.
- Bump `VERSION` when results can change or for a feature release; release with `scripts/release.sh` from main (tags `v<VERSION>`, creates the GitHub Release, publishes the site incl. `v/<VERSION>/`).
- Update `README.md` (for researchers) whenever behaviour or exports change.
- Never commit `.wav` recordings.
- Publish to GitHub Pages with `scripts/deploy-pages.sh` (or `scripts/release.sh` for a new version).
