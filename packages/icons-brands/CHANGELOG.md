# @archdraw/icons-brands

## 0.1.3

### Patch Changes

- 016ead2: Give every package `keywords`. npm search ranks on keywords and description, and with the field absent none of the packages appeared for "architecture diagram", "cloud architecture diagram", "aws diagram" or "diagram yaml".

## 0.1.2

### Patch Changes

- 3989da2: Make English the default README and keep the Korean one alongside as `README.ko.md`. npm renders the README that ships inside the package, so every registry page was Korean-only.

## 0.1.1

### Patch Changes

- ace7fb0: Give every package a README. npm renders the README that ships inside the package, so each one showed `ERROR: No README data found!` on its registry page.
- 6caf1b8: Strip the vendor `<title>` from every icon. It surfaced the packager's internal path (`Icon-Architecture/48/Arch_Amazon-Virtual-Private-Cloud_48`) as a tooltip and competed with the diagram's own accessible name. Rendering is unchanged; the three packs lose 141 KB.

## 0.1.0

### Minor Changes

- af340b1: Add `@archdraw/icons-brands` — 3,453 brand and OSS marks from Simple Icons (CC0), coloured with each brand's official hex. The CLI now takes several packs at once (`-p aws,brands`), so a diagram can show both a managed service and the software it runs.
