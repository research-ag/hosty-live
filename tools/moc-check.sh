#!/bin/bash
# Typecheck the backend canister, emit its Candid, and check stable-memory compatibility
# against a reference checkout (default: the sibling main checkout of this repo).
# Usage: tools/moc-check.sh [reference-repo-root] [out-dir]
set -euo pipefail
cd "$(dirname "$0")/.."
REF=${1:-/Users/andy/Development/hosty-live-fe}
OUT=${2:-/tmp/hosty-moc-check}
mkdir -p "$OUT/oldsrc/backend" "$OUT/oldsrc/shared"
SRC=$(mops sources)
moc $SRC --check canisters/src/backend/main.mo && echo CHECK_OK
moc $SRC --idl -o "$OUT/backend.did" canisters/src/backend/main.mo
moc $SRC --stable-types -o "$OUT/new.most" canisters/src/backend/main.mo
cp "$REF"/canisters/src/backend/*.mo "$OUT/oldsrc/backend/"
cp "$REF"/canisters/src/shared/*.mo "$OUT/oldsrc/shared/"
python3 - "$OUT/oldsrc/backend/main.mo" <<'PY'
import re, sys
p = sys.argv[1]; s = open(p).read()
# an active `( with migration = ... )` prefix describes the pre-migration layout; the
# deployed canister has already migrated, so compare against the actor's own types
s = re.sub(r"\n\(\n  with migration = .*?\n\)\npersistent actor class", "\npersistent actor class", s, count=1, flags=re.S)
open(p, "w").write(s)
PY
moc $SRC --stable-types -o "$OUT/old.most" "$OUT/oldsrc/backend/main.mo"
moc --stable-compatible "$OUT/old.most" "$OUT/new.most" && echo COMPAT_OK
echo "candid: $OUT/backend.did"
