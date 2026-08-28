# @archdraw/icons-aws

## 0.2.1

### Patch Changes

- ace7fb0: Add an `elasticache` alias for `amazon-elasticache`.
- ace7fb0: Give every package a README. npm renders the README that ships inside the package, so each one showed `ERROR: No README data found!` on its registry page.
- 6caf1b8: Strip the vendor `<title>` from every icon. It surfaced the packager's internal path (`Icon-Architecture/48/Arch_Amazon-Virtual-Private-Cloud_48`) as a tooltip and competed with the diagram's own accessible name. Rendering is unchanged; the three packs lose 141 KB.

## 0.2.0

### Minor Changes

- e3147df: Include the AWS general resource icons (client, mobile client, user, firewall, internet…). They live under `Res_48_Light`, which the previous file pattern skipped, so a diagram had no mark for the people and devices at its edges.

## 0.1.0

### Minor Changes

- First release. YAML or prompt in, SVG or PNG out, with AWS and GCP icon packs.
