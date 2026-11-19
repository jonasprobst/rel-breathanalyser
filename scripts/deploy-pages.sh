#!/usr/bin/env bash
# Publishes index.html to the gh-pages branch (which contains only index.html and .nojekyll).
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

find "$tmp" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp index.html "$tmp/index.html"
touch "$tmp/.nojekyll"

git -C "$tmp" add -A
if git -C "$tmp" diff --cached --quiet; then
  echo "gh-pages is already up to date."
  exit 0
fi
git -C "$tmp" commit -m "Deploy index.html from main@${src_commit}"
git -C "$tmp" push origin gh-pages
echo "Published. Site: https://jonasprobst.github.io/rel-breathanalyser/"
