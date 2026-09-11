---
'@archdraw/core': minor
'archdraw': minor
---

Draw what is built and what is only planned. A node, a group or an edge may now carry `status`, and the picture says so in every target rather than in a label:

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
