---
'@archdraw/core': minor
'archdraw': minor
---

Draw the same system in more than one state. A diagram may now declare `scenarios`, and the animated HTML page grows one button per state:

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
