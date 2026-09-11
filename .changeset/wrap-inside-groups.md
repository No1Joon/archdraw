---
'@archdraw/core': patch
'archdraw': patch
---

Fold a long chain that lives inside a group. `wrap: true` set the wrapping strategy on the root graph only, and ELK's strategy cuts the layering of the graph it is set on without descending into a compound node — so the moment a chain was grouped, the flag did nothing and the diagram came out as the one flat strip wrapping exists to prevent. The same fourteen-node chain: 1244 × 227 inside a group against 820 × 459 at the top level, with the file validating and the render succeeding either way.

The failure was silent, which is what made it worth a release of its own: nothing in the output said the fold had been asked for and skipped, and the agent guidance tells generators to reach for `wrap: true` and to group their nodes in the same breath.

A group now carries the same wrapping options as the root when the diagram asks to wrap, so the fold happens at whatever level the chain is on. All fifteen bundled examples render byte-identically — `batch-etl.yaml`, the one that wraps, folds at the top level where it always did.
