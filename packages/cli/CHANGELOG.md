# archdraw

## 0.8.0

### Minor Changes

- e0a77f4: Draw the traffic, not just the wiring. `-o out.html` writes one self-contained page — no CDN, no build step, nothing to serve it from — carrying the same drawing with dots travelling along every edge in the direction it points, plus pan and zoom. One dash period per 1.2s means the same speed on a short edge and a long one, and `prefers-reduced-motion` turns it off.
  
  A node or group may now say `external: true`, meaning it is outside the system being drawn; everything inside such a group inherits it unless it says otherwise. The page then colours traffic by the boundary it crosses — arriving from outside, staying inside, leaving — and draws a legend. A diagram that never says it is all inside, in one colour and no legend, which is where every existing file starts.
  
  The still SVG and PNG are untouched: the animation is opt-in inside the renderer, so `renderToSvg` output is byte-identical to before.

### Patch Changes

- 35f05a6: Say that wrapping can cost the reading order, not just a detour. `wrap: true` folds on the layout's layer index rather than on the chain, so the main chain need not stay contiguous: of six diagrams measured under it, four send a reader backwards up the page, two bundled examples among them. The guidance offered wrapping for a long diagram and named only the detour it charges, so an agent had no reason to check the picture still reads.
- Updated dependencies [e0a77f4]
  - @archdraw/core@0.8.0

## 0.7.8

### Patch Changes

- Updated dependencies [c297a14]
  - @archdraw/core@0.7.4

## 0.7.7

### Patch Changes

- Updated dependencies [03fb1b8]
  - @archdraw/core@0.7.3

## 0.7.6

### Patch Changes

- 62934ac: Look up the whole diagram in one run. `archdraw types` now takes several queries — `archdraw types s3 lambda kinesis clickhouse` — and prints each answer under a `# query` heading, because a run that drew a nine-service pipeline spent eight sequential calls of two to fifteen seconds each looking types up one at a time. A batch shortlists every query so no single one fills the answer, and a query that matches nothing is named on stderr while the rest still print, with the run failing as it always did. The cross-pack note added last release no longer volunteers a coincidence: `types rds` was answering that `brands` also holds `awwwards`, since 'rds' does end that word. A word ending is enough to answer a query about it and never enough to raise unasked.

## 0.7.5

### Patch Changes

- 520eb19: Say the three things a test run showed a model could not see. `archdraw types flink` on the default aws pack answered with the managed service alone and never mentioned that `brands` holds `apacheflink`, so the self-hosted mark stayed hidden whenever the loaded pack had any answer at all; the search now names what the other packs hold, and a no-match names the pack that does answer instead of listing all three. A diagram that only renders because `-p` covered for its own short `provider` now says so after a render — two runs wrote a file that renders on the author's machine and nowhere else, copying the example in AGENTS.md, which was itself written that way and is fixed here along with the bundled examples. A label written `"a\\nb"` draws the escape as text and widens the node, which is the opposite of what a request for a narrow picture asked for, so those labels are named too. The detour note no longer blames a group boundary on a diagram that has no groups: a wrapped chain pays for the fold, and the note now says so rather than sending an agent to regroup nothing.

## 0.7.4

### Patch Changes

- af8f509: Say that a workload takes no icon from the platform it runs on. Two test runs drew three GKE icons for three services on a GKE cluster, and three ECS icons for three tasks in an ECS group — the existing rule only covers a component with no icon at all, so an icon that exists read as a reason to use it.

## 0.7.3

### Patch Changes

- 5ebffdf: Stop hiding the self-hosted mark behind the managed service. `archdraw types airflow -p aws,brands` answered with AWS Managed Workflows alone and never `apacheairflow`, because the ranking read word starts and the brands pack runs its words together — `apacheairflow` starts with `apache`. A word end now counts too, `airflow` and `flink` gain aliases, and the near-miss hint reads a one-character slip as a typo first so `ecss` still means `ecs` rather than `purgecss`.
- Updated dependencies [5ebffdf]
- Updated dependencies [d01279b]
  - @archdraw/core@0.7.2
  - @archdraw/icons-brands@0.1.4

## 0.7.2

### Patch Changes

- Updated dependencies [19c4100]
  - @archdraw/core@0.7.1

## 0.7.1

### Patch Changes

- 475ccaf: Say which of the two causes made an edge travel. `Detour` gains `backward`, set when the edge runs against the diagram's `direction`. Two of the three detours in the bundled examples are that kind, and the previous note told the author to revisit the grouping — which does not shorten an edge that runs backwards.
- Updated dependencies [475ccaf]
- Updated dependencies [091ebd0]
  - @archdraw/core@0.7.0
  - @archdraw/icons-aws@0.2.4

## 0.7.0

### Minor Changes

- 2e0a159: Name the edges that pay for a group boundary. An edge whose ends sit in different groups is declared on their lowest common ancestor, so it is routed around every container in between — one edge in the bundled `growth` example travels 2760px to cover 1100px, and that single route is what sets the diagram's height. Nothing in ELK's option space fixes it, so `archdraw` now measures each routed edge against its direct distance and names any that ran more than twice as far. The note goes to stderr, never changes the exit code, and stays quiet on a diagram that lays out straight.
  
  `@archdraw/core` exports `detours(ir, root)` and takes a `onLayout` callback in `RenderOptions`, so a caller can measure the graph without laying it out twice.

### Patch Changes

- Updated dependencies [2e0a159]
  - @archdraw/core@0.6.0

## 0.6.2

### Patch Changes

- 9f19acf: Ship `AGENTS.md` in the package. The agent rules — look the type up rather than guess it, no `type` for a component with no icon, `redis` is not `amazon-elasticache` — lived only in `docs/agents.md`, which is not in the tarball, so an agent that had installed archdraw could not read them without fetching the repo.
- 75b2680: Rank `archdraw types` results by how the query lands, and drop matches where it is buried mid-word. `types alb` answered with `virtualbox`, `actualbudget`, `socialblade` and `thurgauerkantonalbank` alongside the alias that resolves it. A query that starts a word is kept, so `types postgres` still finds `amazon-aurora-postgresql-instance`.
- Updated dependencies [bda5ea5]
  - @archdraw/core@0.5.2

## 0.6.1

### Patch Changes

- 016ead2: Give every package `keywords`. npm search ranks on keywords and description, and with the field absent none of the packages appeared for "architecture diagram", "cloud architecture diagram", "aws diagram" or "diagram yaml".
- Updated dependencies [016ead2]
  - @archdraw/core@0.5.1
  - @archdraw/icons-aws@0.2.3
  - @archdraw/icons-gcp@0.2.2
  - @archdraw/icons-brands@0.1.3

## 0.6.0

### Minor Changes

- 8984953: Honour the diagram's own `provider`. `-p` had a hardcoded default, so the documented field never selected a pack: `provider: gcp` still resolved against AWS and answered `Unknown type 'gke'. Did you mean: eks?`. The flag still wins when given.
  
  Add `--theme light|dark`, exposing the palette core already made replaceable.
  
  Validate `--scale`. `-s 0` used to surface resvg's own "Target size is zero" from deep inside the rasteriser, and there was no upper bound.

### Patch Changes

- Updated dependencies [8984953]
  - @archdraw/core@0.5.0

## 0.5.1

### Patch Changes

- 3989da2: Make English the default README and keep the Korean one alongside as `README.ko.md`. npm renders the README that ships inside the package, so every registry page was Korean-only.
- Updated dependencies [3989da2]
  - @archdraw/core@0.4.1
  - @archdraw/icons-aws@0.2.2
  - @archdraw/icons-gcp@0.2.1
  - @archdraw/icons-brands@0.1.2

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
