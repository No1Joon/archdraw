# archdraw

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
