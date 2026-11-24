#!/usr/bin/env bash
# Publishes index.html to the gh-pages branch: the latest version at the root, and a copy of
# every published version under v/<version>/ (with a list at v/), so earlier versions stay reachable.
# Usage: scripts/deploy-pages.sh
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"
[ -f index.html ] || { echo "index.html not found" >&2; exit 1; }

src_commit="$(git rev-parse --short HEAD)"
tmp="$(mktemp -d)"
trap 'git worktree remove --force "$tmp" >/dev/null 2>&1 || true; rm -rf "$tmp"' EXIT

if git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git fetch --depth 1 origin gh-pages
  git worktree add -B gh-pages "$tmp" origin/gh-pages
else
  git worktree add --detach "$tmp"
  git -C "$tmp" checkout --orphan gh-pages
  git -C "$tmp" rm -rf --quiet . || true
fi

version="$(grep -oE "const VERSION='[^']+'" index.html | cut -d"'" -f2)"
[ -n "$version" ] || { echo "VERSION not found in index.html" >&2; exit 1; }

# keep v/ (earlier versions), replace everything else
find "$tmp" -mindepth 1 -maxdepth 1 ! -name .git ! -name v -exec rm -rf {} +
cp index.html "$tmp/index.html"
touch "$tmp/.nojekyll"
mkdir -p "$tmp/v/$version"
cp index.html "$tmp/v/$version/index.html"

# list of versions, newest first
{
  echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
  echo '<title>Breathanalyser versions</title><style>body{font:15px/1.6 system-ui,sans-serif;margin:40px auto;max-width:520px;padding:0 16px}</style></head><body>'
  echo '<h1>Breathanalyser versions</h1><p><a href="../">Latest version</a> · <a href="https://github.com/jonasprobst/rel-breathanalyser/releases">Downloads and release notes</a></p><ul>'
  for d in $(ls -1 "$tmp/v" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -t. -k1,1nr -k2,2nr -k3,3nr); do
    echo "<li><a href=\"$d/\">v$d</a></li>"
  done
  echo '</ul></body></html>'
} > "$tmp/v/index.html"

git -C "$tmp" add -A
if git -C "$tmp" diff --cached --quiet; then
  echo "gh-pages is already up to date."
  exit 0
fi
if [ -n "${DEPLOY_COMMIT_TRAILERS:-}" ]; then   # optional extra lines, e.g. co-author trailers
  git -C "$tmp" commit -m "Deploy v${version} from main@${src_commit}" -m "$DEPLOY_COMMIT_TRAILERS"
else
  git -C "$tmp" commit -m "Deploy v${version} from main@${src_commit}"
fi
git -C "$tmp" push origin gh-pages
echo "Published v${version}. Site: https://jonasprobst.github.io/rel-breathanalyser/ (this version also at v/${version}/)"
