# @archdraw/core

## 0.2.0

### Minor Changes

- 13ee39f: Export the input contract as JSON Schema (`toJsonSchema`, `archdraw schema`), derived from the zod definitions so it cannot drift from what is enforced.
- 9086e92: Allow a leaf node to omit `type`. It renders as a labelled box instead of an icon, so third-party and self-hosted components can appear in a diagram.

## 0.1.0

### Minor Changes

- First release. YAML or prompt in, SVG or PNG out, with AWS and GCP icon packs.
