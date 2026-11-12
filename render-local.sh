#!/usr/bin/env bash
# Run this after editing posts or contributors.qmd to render R code locally,
# freeze the output, and push to the current branch.
#
# Usage:
#   ./render-local.sh "Your commit message"
#   ./render-local.sh            # uses default message
set -euo pipefail

MSG="${1:-Update frozen render output}"

echo "→ Rendering site"
quarto render

echo "→ Staging changes"
git add _freeze/

if git diff --cached --quiet; then
  echo "→ Nothing to commit"
else
  git commit -m "$MSG"
  echo "→ Pushing to $(git rev-parse --abbrev-ref HEAD)"
  git push -u origin HEAD
fi
