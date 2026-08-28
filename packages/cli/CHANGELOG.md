# archdraw

## 0.5.0

### Minor Changes

- b4e5d0e: Bundle Noto Sans KR and rasterise PNGs with it alone. resvg drew text with whatever the machine happened to have installed, so a diagram with Korean labels came out with the labels missing on any host without the family — silently, since a font it cannot resolve makes resvg draw nothing rather than fail. The same input now yields the same PNG anywhere.

### Patch Changes

- ace7fb0: Give every package a README. npm renders the README that ships inside the package, so each one showed `ERROR: No README data found!` on its registry page.
- Updated dependencies [cdf4a60]
- Updated dependencies [ace7fb0]
- Updated dependencies [a4a41f8]
- Updated dependencies [ace7fb0]
- Updated dependencies [6caf1b8]
  - @archdraw/core@0.4.0
  - @archdraw/icons-aws@0.2.1
  - @archdraw/icons-gcp@0.2.0
  - @archdraw/icons-brands@0.1.1

## 0.4.0

### Minor Changes

- af340b1: Add `@archdraw/icons-brands` — 3,453 brand and OSS marks from Simple Icons (CC0), coloured with each brand's official hex. The CLI now takes several packs at once (`-p aws,brands`), so a diagram can show both a managed service and the software it runs.

### Patch Changes

- c2fb6a2: `--version` now reports the package version instead of a hardcoded `0.0.0`.
- Updated dependencies [e3147df]
- Updated dependencies [af340b1]
- Updated dependencies [25a0896]
- Updated dependencies [2534735]
- Updated dependencies [efa32d7]
- Updated dependencies [44956b7]
  - @archdraw/icons-aws@0.2.0
  - @archdraw/icons-brands@0.1.0
  - @archdraw/core@0.3.0

## 0.3.0

### Minor Changes

- 13ee39f: Export the input contract as JSON Schema (`toJsonSchema`, `archdraw schema`), derived from the zod definitions so it cannot drift from what is enforced.

### Patch Changes

- Updated dependencies [13ee39f]
- Updated dependencies [9086e92]
  - @archdraw/core@0.2.0

## 0.2.0

### Minor Changes

- a0bcf47: Add `archdraw types` for icon vocabulary search, `-` for stdin input, and `--check` to validate without rendering. The `prompt` subcommand and `@archdraw/ai` are gone.

## 0.1.0

### Minor Changes

- First release. YAML or prompt in, SVG or PNG out, with AWS and GCP icon packs.

### Patch Changes

- Updated dependencies
  - @archdraw/icons-aws@0.1.0
  - @archdraw/icons-gcp@0.1.0
  - @archdraw/core@0.1.0
  - @archdraw/ai@0.1.0
