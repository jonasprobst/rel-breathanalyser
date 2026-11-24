#!/usr/bin/env bash
# Makes a release of the current main: tags it v<VERSION> (from index.html), pushes the tag
# (GitHub Actions then creates the GitHub Release with the HTML file attached) and publishes
# the site, including the versioned copy under v/<VERSION>/.
# Usage: scripts/release.sh
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"
version="$(grep -oE "const VERSION='[^']+'" index.html | cut -d"'" -f2)"
tag="v$version"

[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || { echo "Run this on main." >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Working tree is not clean." >&2; exit 1; }
git fetch origin main --tags
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "Local main differs from origin/main. Pull or push first." >&2; exit 1; }
if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  echo "Tag $tag already exists. Bump VERSION in index.html for a new release." >&2; exit 1
fi

node tests/core.test.js
git tag -a "$tag" -m "Breathanalyser $tag"
git push origin "$tag"
scripts/deploy-pages.sh
echo "Released $tag. The GitHub Release appears under Releases once the workflow has finished."
