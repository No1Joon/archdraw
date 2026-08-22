# @archdraw/core

## 0.3.1

### Patch Changes

- ace7fb0: Give every package a README. npm renders the README that ships inside the package, so each one showed `ERROR: No README data found!` on its registry page.

## 0.3.0

### Minor Changes

- 25a0896: Add `shape: card` — the mark on the left with the name beside it, the way Google Cloud draws a service. `icon` (name under the mark, the AWS convention) stays the default, and a node may override the diagram's choice.
- 2534735: Add `domain` — the address a node answers on, drawn above the mark so it reads apart from the service name instead of being crammed into the label.
- efa32d7: A container may now carry `type` to show its service icon beside the group label, so a VPC or an instance can be labelled with the vendor mark the way reference architectures draw it.
- 44956b7: A node label may hold several lines (`\n`), so a name can carry its identifier or URL underneath the way reference architectures draw it.

## 0.2.0

### Minor Changes

- 13ee39f: Export the input contract as JSON Schema (`toJsonSchema`, `archdraw schema`), derived from the zod definitions so it cannot drift from what is enforced.
- 9086e92: Allow a leaf node to omit `type`. It renders as a labelled box instead of an icon, so third-party and self-hosted components can appear in a diagram.

## 0.1.0

### Minor Changes

- First release. YAML or prompt in, SVG or PNG out, with AWS and GCP icon packs.
