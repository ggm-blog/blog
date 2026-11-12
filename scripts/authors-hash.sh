#!/usr/bin/env bash
# Fingerprint registry contents and directory filenames (including hidden files).
set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL=C
{ cat authors.yml; ls -1A assets/authors/ | sort; } | sha256sum | { read -r digest rest; printf '%s\n' "$digest"; }
