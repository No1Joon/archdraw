# archdraw

## 0.9.0

### Minor Changes

- 0e8ce2b: Let containment decide what a container is. `kind` used to make a group of any entry carrying it, so an agent reaching for it as "what kind of service this is" — `kind: AWS S3` on an ordinary node — turned that node into an empty group, and a whole diagram written that way drew as empty boxes with spilling labels. A container is now an entry that holds something: one with `children`, one listed under `groups`, or one another entry points `parent` at. `kind` still names what a container is and still puts an icon in its header beside `type`; it no longer decides the question.
  
  The flat form is untouched — `parent` already promoted its target, so a container declared as a bare `kind` entry with its children pointing at it reads exactly as before. All fourteen bundled examples render byte-identically, including the three written the flat way.
  
  The one file this reads differently is one carrying `kind` on an entry that holds nothing and is not under `groups`: it was an empty group and is now the node it looks like. That is the shape the previous release could only make less broken, by keeping its box around its own label. For a group that really holds nothing, list it under `groups`.
- 9cd3b60: Draw the same system in more than one state. A diagram may now declare `scenarios`, and the animated HTML page grows one button per state:
  
  ```yaml
  scenarios:
    - { id: normal, label: steady state }
    - { id: cache-down, label: Redis is down }
  
  nodes:
    - { id: redis, type: redis, label: Redis, down: [cache-down] }
  edges:
    - { from: api, to: redis, label: get, when: [normal] }
    - { from: api, to: rds, label: fallback, when: [cache-down] }
  ```
  
  An element says when it is alive rather than a scenario listing what it changes — `when` on a node or an edge, `down` on a node that has failed in that state. That keeps one line to one element, so the flat form a generator already emits carries scenarios without growing a second list to keep in agreement. Saying nothing means alive in every scenario, which is where every existing file starts.
  
  The graph is laid out once with every element present and a scenario only changes what is drawn, so pressing a button never moves the picture. An element absent from the selected scene fades; one marked `down` is drained of colour instead, so failed reads differently from merely not there.
  
  A `when` or `down` naming a scenario that was never declared is an error carrying the declared names, rather than a line quietly missing from every scene — `--check` catches it before anything is drawn.
  
  SVG and PNG are untouched: they show every element whatever the diagram says about states, and carry none of the markup. All fourteen bundled examples render byte-identically. `examples/cache-failover.yaml` is the fifteenth, and is the one to open with `-o out.html`.
- 7268c4b: Draw what is built and what is only planned. A node, a group or an edge may now carry `status`, and the picture says so in every target rather than in a label:
  
  ```yaml
  nodes:
    - { id: redis, type: redis, label: Redis, status: done }
    - { id: api, type: ecs, label: Go API, status: in_progress }
  edges:
    - { from: api, to: redis, label: cache, status: planned }
  ```
  
  `planned | in_progress | blocked | done`. A node takes a mark in its corner, a group one in its header, an edge one beside its label, and each state has its own shape as well as its own colour — a ring, a half disc, a bar, a tick — so a diagram printed in grey still reads. A legend naming the states in words is drawn under the graph, carrying only the states the diagram actually uses. SVG, PNG and HTML all get it: the reason to draw a status is usually to put it in a report.
  
  The workaround it replaces was writing `[done]` into a label, which changes the size of the card and the placement of everything around it, and tells the renderer nothing.
  
  A node and the edge into it are separate answers, which is the case this came from: a cache that is running and an application that does not talk to it yet is `done` on the node and `planned` on the edge. A group's status is its own and never reaches its children, so a created VM cannot mark the services inside it deployed.
  
  Motion is a claim about traffic, so a `planned` or `blocked` edge no longer animates in the HTML target — until now every edge did, including a dashed one that did not exist. `animation: none | flow` overrides that per edge either way.
  
  Nothing changes for a diagram that says nothing about status: all fifteen bundled examples render byte-identically, and a `done` edge draws exactly as an ordinary one does. `examples/build-status.yaml` is the sixteenth.

### Patch Changes

- 6c31650: Fold a long chain that lives inside a group. `wrap: true` set the wrapping strategy on the root graph only, and ELK's strategy cuts the layering of the graph it is set on without descending into a compound node — so the moment a chain was grouped, the flag did nothing and the diagram came out as the one flat strip wrapping exists to prevent. The same fourteen-node chain: 1244 × 227 inside a group against 820 × 459 at the top level, with the file validating and the render succeeding either way.
  
  The failure was silent, which is what made it worth a release of its own: nothing in the output said the fold had been asked for and skipped, and the agent guidance tells generators to reach for `wrap: true` and to group their nodes in the same breath.
  
  A group now carries the same wrapping options as the root when the diagram asks to wrap, so the fold happens at whatever level the chain is on. All fifteen bundled examples render byte-identically — `batch-etl.yaml`, the one that wraps, folds at the top level where it always did.
- Updated dependencies [0e8ce2b]
- Updated dependencies [9cd3b60]
- Updated dependencies [7268c4b]
- Updated dependencies [6c31650]
  - @archdraw/core@0.9.0

## 0.8.1

### Patch Changes

- 1109300: Keep an empty group's box around its own header. A group holding nothing collapsed to 20px while its label stayed at the 30px header offset, so the text landed under the box and the border ran through it. `elk.nodeSize.minimum` carried a width for the label but passed `0` for the height, and a compound node with no children has nothing to push it open; it now carries the header height too. Groups that hold something are unchanged — the minimum never binds there, and every bundled example renders byte-identically.
  
  This shows up most through `kind`, which makes a container of any entry that carries it: an agent writing `kind` as a service name — "AWS S3", "AWS Lambda" — turns ordinary nodes into empty groups, and the whole diagram spills its labels. The packaged `AGENTS.md` now says what `kind` means, and that `-o out.html` writes an animated page rather than SVG.
- Updated dependencies [1109300]
  - @archdraw/core@0.8.1

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
