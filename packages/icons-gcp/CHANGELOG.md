# @archdraw/icons-gcp

## 0.2.1

### Patch Changes

- 3989da2: Make English the default README and keep the Korean one alongside as `README.ko.md`. npm renders the README that ships inside the package, so every registry page was Korean-only.

## 0.2.0

### Minor Changes

- a4a41f8: Widen the short-name table from 18 entries to 85, so a GCP diagram can say `gke`, `kms`, `iap`, `bq` or `cdn` instead of spelling out the canonical slug. Software names (`redis`, `postgres`, `kubernetes`) are deliberately left out: they belong to the brands pack, and aliasing them to a managed service would draw the wrong icon for a self-hosted one.

### Patch Changes

- ace7fb0: Give every package a README. npm renders the README that ships inside the package, so each one showed `ERROR: No README data found!` on its registry page.
- 6caf1b8: Strip the vendor `<title>` from every icon. It surfaced the packager's internal path (`Icon-Architecture/48/Arch_Amazon-Virtual-Private-Cloud_48`) as a tooltip and competed with the diagram's own accessible name. Rendering is unchanged; the three packs lose 141 KB.

## 0.1.0

### Minor Changes

- First release. YAML or prompt in, SVG or PNG out, with AWS and GCP icon packs.
