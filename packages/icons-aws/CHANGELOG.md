# @archdraw/icons-aws

## 0.2.4

### Patch Changes

- 091ebd0: Alias the ECS icons whose slug spells the service out — `ecs-task`, `ecs-service`, `ecs-container`. None of `amazon-elastic-container-service-task`, `-service` or `-container-1` contains the substring `ecs`, so `archdraw types ecs` never showed them and a diagram drew the ECS service mark on every task inside an ECS group.

## 0.2.3

### Patch Changes

- 016ead2: Give every package `keywords`. npm search ranks on keywords and description, and with the field absent none of the packages appeared for "architecture diagram", "cloud architecture diagram", "aws diagram" or "diagram yaml".

## 0.2.2

### Patch Changes

- 3989da2: Make English the default README and keep the Korean one alongside as `README.ko.md`. npm renders the README that ships inside the package, so every registry page was Korean-only.

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
