#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# macOS ships shasum; Netlify uses sha256sum.
if ! command -v sha256sum >/dev/null; then
  sha256sum() { shasum -a 256 "$@"; }
  export -f sha256sum
fi
rm -rf _freeze/contributors/
quarto render contributors.qmd
bash scripts/authors-hash.sh > _freeze/authors.hash
