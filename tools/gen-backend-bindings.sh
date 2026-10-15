#!/bin/bash
# Regenerate src/api/backend bindings from a Candid file produced by tools/moc-check.sh.
# Usage: tools/gen-backend-bindings.sh [path/to/backend.did]
set -euo pipefail
cd "$(dirname "$0")/.."
DID=${1:-/tmp/hosty-moc-check/backend.did}
didc bind "$DID" -t js > src/api/backend/backend.did.js
didc bind "$DID" -t ts > src/api/backend/backend.did.d.ts
echo "bindings written from $DID"
