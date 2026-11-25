#!/usr/bin/env bash
# Installs a published `archdraw` from the registry and renders with it.
#
# Usage: scripts/smoke-published.sh <version>
#
# CI passes every check against the workspace, so a release can still be broken for everyone:
# a dependency whose packument the registry has not served yet makes `npx archdraw` fail to
# install while the build stays green. This runs after publishing, against the registry.
set -euo pipefail

VERSION="${1:?usage: smoke-published.sh <version>}"
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

# A freshly published scoped package can take over ten minutes to appear, and the CLI is only
# as installable as its slowest dependency — so retry the install itself, not a metadata read.
install() {
  for attempt in $(seq 1 "${SMOKE_ATTEMPTS:-120}"); do
    if npm install --prefix "$DIR" --prefer-online --no-audit --no-fund --loglevel=error \
      "archdraw@$VERSION" >"$DIR/install.log" 2>&1; then
      echo "installed archdraw@$VERSION (attempt $attempt)"
      return 0
    fi
    sleep "${SMOKE_INTERVAL:-15}"
  done
  echo "archdraw@$VERSION never became installable:" >&2
  tail -20 "$DIR/install.log" >&2
  return 1
}

install

CLI="$DIR/node_modules/.bin/archdraw"
[ -x "$CLI" ] || { echo "no executable at $CLI" >&2; exit 1; }

got="$("$CLI" --version)"
[ "$got" = "$VERSION" ] || { echo "--version said '$got', expected '$VERSION'" >&2; exit 1; }

# Exercise the installed release through the same contract checked across supported Node versions.
node "$(dirname "$0")/smoke-runtime.mjs" "$CLI"
if printf '%s\n' 'nodes: [{id: lb, type: alb}]' | "$CLI" - -p gcp --check 2>/dev/null; then
  echo 'a gcp-only pack should not resolve aws types' >&2
  exit 1
fi
echo "smoke ok: archdraw@$VERSION installs from the registry and renders"
