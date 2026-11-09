#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

expected=$(cat _freeze/authors.hash 2>/dev/null || true)
actual=$(bash scripts/authors-hash.sh)
if [[ "$actual" != "$expected" ]]; then
  echo "authors.yml or author photos changed; run scripts/refresh-contributors.sh and commit _freeze/" >&2
  exit 1
fi

echo "→ Installing Quarto ${QUARTO_VERSION}"
QUARTO_URL="https://github.com/quarto-dev/quarto-cli/releases/download/v${QUARTO_VERSION}/quarto-${QUARTO_VERSION}-linux-amd64.tar.gz"
mkdir -p "${HOME}/quarto"
wget -qO- "$QUARTO_URL" | tar -xz -C "${HOME}/quarto" --strip-components=1
export PATH="${HOME}/quarto/bin:$PATH"

echo "→ Quarto version: $(quarto --version)"

echo "→ Rendering site"
quarto render

echo "→ Building search index"
npx -y pagefind --site _site