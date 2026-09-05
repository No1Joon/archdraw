# @archdraw/core

## 0.8.0

### Minor Changes

- e0a77f4: Draw the traffic, not just the wiring. `-o out.html` writes one self-contained page — no CDN, no build step, nothing to serve it from — carrying the same drawing with dots travelling along every edge in the direction it points, plus pan and zoom. One dash period per 1.2s means the same speed on a short edge and a long one, and `prefers-reduced-motion` turns it off.
  
  A node or group may now say `external: true`, meaning it is outside the system being drawn; everything inside such a group inherits it unless it says otherwise. The page then colours traffic by the boundary it crosses — arriving from outside, staying inside, leaving — and draws a legend. A diagram that never says it is all inside, in one colour and no legend, which is where every existing file starts.
  
  The still SVG and PNG are untouched: the animation is opt-in inside the renderer, so `renderToSvg` output is byte-identical to before.

## 0.7.4

### Patch Changes

- c297a14: Land every arrowhead on the node its edge names. With `wrap: true` an edge could be routed to a point on no node: the arrowhead stopped in open space, so the picture claimed a connection and showed nowhere it went — worse to read than a long detour, because nothing on the page says where the edge ended up. The fold itself was ELK's, and two things were wrong with it. ELK's pass that reroutes a wrapped edge was stranding the endpoint, so it is off now — the same graphs wrap to within ten pixels of the same box without it. That pass never covered an edge running against `direction` anyway, so the layout now also checks each endpoint against the box it belongs to and draws its own orthogonal route for any that missed, label included. A diagram that wraps and one that does not both land every endpoint; a route ELK got right is left as it was. Found by handing the same prompt to an agent CLI on 0.7.6.

## 0.7.3

### Patch Changes

- 03fb1b8: Fill a group the flat way and keep its children. A container declared under `groups` with nothing in it yet — the flat form points children at it with `parent` rather than nesting them — was read as an ordinary leaf, so the layout never walked into it. Two ways that ended: an edge across two such groups threw ELK's own `JsonImportException: Referenced shape does not exist`, and an edge inside one rendered happily while every child silently vanished from the picture, which is the worse of the two. An entry under `groups` is a group whatever it holds, and so is any node another node names as its `parent`. Found by an agent that wrote the flat form on its own and abandoned it when the render failed.

## 0.7.2

### Patch Changes

- 5ebffdf: Stop hiding the self-hosted mark behind the managed service. `archdraw types airflow -p aws,brands` answered with AWS Managed Workflows alone and never `apacheairflow`, because the ranking read word starts and the brands pack runs its words together — `apacheairflow` starts with `apache`. A word end now counts too, `airflow` and `flink` gain aliases, and the near-miss hint reads a one-character slip as a typo first so `ecss` still means `ecs` rather than `purgecss`.
- d01279b: Stop `wrap: true` throwing out of ELK. On a diagram whose groups an edge passes through, the `SINGLE_EDGE` wrapping strategy threw `java.util.NoSuchElementException` — a raw GWT exception with nothing to act on, and `--check` passed because it never lays out. `MULTI_EDGE` handles the same graph, and folds better besides: the bundled `startup` example was not folded at all before and now halves its longest side.

## 0.7.1

### Patch Changes

- 19c4100: Suggest the slug that spells the guess out. The near-miss hint ranked by edit distance alone, so `airflow` was answered with `akiflow` — a different product — while the managed Airflow icon sat unmentioned, `glue` drew `gnu, lua, flux` past `aws-glue`, and `kinesis` got no suggestion at all because `amazon-kinesis` is seven edits away. A guess that names a whole word of a slug now wins, then one that starts a word, and edit distance still catches a plain typo.

## 0.7.0

### Minor Changes

- 475ccaf: Say which of the two causes made an edge travel. `Detour` gains `backward`, set when the edge runs against the diagram's `direction`. Two of the three detours in the bundled examples are that kind, and the previous note told the author to revisit the grouping — which does not shorten an edge that runs backwards.

## 0.6.0

### Minor Changes

- 2e0a159: Name the edges that pay for a group boundary. An edge whose ends sit in different groups is declared on their lowest common ancestor, so it is routed around every container in between — one edge in the bundled `growth` example travels 2760px to cover 1100px, and that single route is what sets the diagram's height. Nothing in ELK's option space fixes it, so `archdraw` now measures each routed edge against its direct distance and names any that ran more than twice as far. The note goes to stderr, never changes the exit code, and stays quiet on a diagram that lays out straight.
  
  `@archdraw/core` exports `detours(ir, root)` and takes a `onLayout` callback in `RenderOptions`, so a caller can measure the graph without laying it out twice.

## 0.5.2

### Patch Changes

- bda5ea5: Draw a `style: dashed` edge as round dots (`1 5`) rather than a `5 4` dash. Container boundaries are dashed `6 4` in the same grey, and an edge leaving a container routes around it — so the two read as one thing, and a telemetry edge looked like a second border.

## 0.5.1

### Patch Changes

- 016ead2: Give every package `keywords`. npm search ranks on keywords and description, and with the field absent none of the packages appeared for "architecture diagram", "cloud architecture diagram", "aws diagram" or "diagram yaml".

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
