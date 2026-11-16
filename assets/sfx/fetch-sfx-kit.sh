#!/usr/bin/env bash
# Downloads SFX Kit (wyzowl/sfx-kit): 320 original sound effects for video, CC0 1.0 (public domain,
# free for any use incl. monetized YouTube, no attribution required). ~119 MB, so it is not committed.
set -euo pipefail
DEST="$(cd "$(dirname "$0")" && pwd)/sfx-kit"
if [ -f "$DEST/sounds.json" ]; then echo "SFX Kit already present at $DEST"; exit 0; fi
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/wyzowl/sfx-kit "$DEST"
rm -rf "$DEST/.git"
echo "SFX Kit ready: $(find "$DEST/sounds" -name '*.wav' | wc -l) sounds"
