#!/usr/bin/env bash
# Imports draft #4 (Tim Hunter's gist) into posts/2026-12-parser-grammar/ with the text UNCHANGED.
# Prepends the front matter already in that folder's index.qmd (minus draft: true) and copies the images.
set -euo pipefail
GIST=f7efd9a0b144cedb6b17fec9231c9bc5
DEST="posts/2026-12-parser-grammar"
TMP="$(mktemp -d)"
git clone --quiet "https://gist.github.com/$GIST.git" "$TMP/gist"
MD="$(ls "$TMP"/gist/*.md | head -n1)"
# keep existing front matter (between the first two --- lines), drop the draft flag
awk 'BEGIN{n=0} /^---$/{n++; print; if(n==2) exit; next} n==1 && !/^draft:/{print}' "$DEST/index.qmd" > "$TMP/fm.txt"
{ cat "$TMP/fm.txt"; echo; cat "$MD"; } > "$DEST/index.qmd"
cp "$TMP"/gist/*.png "$DEST"/ 2>/dev/null || true
echo "Imported $(basename "$MD") + images into $DEST."
echo "Next: check whether the gist text starts with its own title/author lines or a '# heading'; if so, decide whether to keep it (text must not be altered)."
echo "Also check image references in index.qmd resolve (same filenames as in the gist)."
