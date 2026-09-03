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

# A freshly published scoped package can take minutes to appear, and the CLI is only as
# installable as its slowest dependency — so retry the install itself, not a metadata read.
install() {
  for attempt in $(seq 1 "${SMOKE_ATTEMPTS:-40}"); do
    if npm install --prefix "$DIR" --no-audit --no-fund --loglevel=error \
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

# Self-contained: a fixture from the repo would drift against the version being tested.
cat >"$DIR/a.yaml" <<'YAML'
provider: aws,brands
title: smoke
nodes:
  - { id: lb, type: alb, label: "웹 로드밸런서" }
  - { id: api, type: ecs, label: "API 서버" }
  - { id: cache, type: redis, label: Redis }
edges:
  - { from: lb, to: api }
  - { from: api, to: cache }
YAML

"$CLI" "$DIR/a.yaml" -p aws,brands --check
"$CLI" "$DIR/a.yaml" -p aws,brands -o "$DIR/a.png"
"$CLI" "$DIR/a.yaml" -p gcp --check 2>/dev/null && { echo "a gcp-only pack should not resolve aws types" >&2; exit 1; }

# resvg draws nothing for a font it cannot resolve, so a blank PNG is the failure to catch.
# Two labels of equal length in the same script hold the layout fixed; only glyphs can differ.
blank_check() {
  sed 's/웹 로드밸런서/가가가가가가/' "$DIR/a.yaml" >"$DIR/b.yaml"
  sed 's/웹 로드밸런서/나나나나나나/' "$DIR/a.yaml" >"$DIR/c.yaml"
  "$CLI" "$DIR/b.yaml" -p aws,brands -o "$DIR/b.png"
  "$CLI" "$DIR/c.yaml" -p aws,brands -o "$DIR/c.png"
  if cmp -s "$DIR/b.png" "$DIR/c.png"; then
    echo "Hangul labels rendered blank — the bundled font did not load" >&2
    return 1
  fi
}
blank_check

echo "smoke ok: archdraw@$VERSION installs from the registry and renders"
