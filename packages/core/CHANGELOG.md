# @archdraw/core

## 0.5.0

### Minor Changes

- 8984953: Reject a containment cycle instead of dropping the nodes in it. A node whose parent chain led back to itself sat outside the tree the layout walks, so it silently vanished from the picture — two mutually-parented nodes took a third down with them. `normalize()` now throws with the offending path.
  
  Add `wrap`, which folds a long chain into rows. Without it a 200-node chain lays out as a single strip 54,352 px wide; with it the same diagram is 4,616 × 3,798.
  
  Add `darkTheme` beside `defaultTheme`, so a diagram is not a white slab on a dark page.

## 0.4.1

### Patch Changes

- 3989da2: Make English the default README and keep the Korean one alongside as `README.ko.md`. npm renders the README that ships inside the package, so every registry page was Korean-only.

## 0.4.0

### Minor Changes

- cdf4a60: Draw a diagram's `title` above the graph. It only ever reached the SVG's accessible name, so an exported PNG carried no heading at all. The band is added to the canvas rather than to ELK's box, and a title wider than the graph widens the canvas.

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
