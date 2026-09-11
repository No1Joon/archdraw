---
'@archdraw/core': patch
'archdraw': patch
---

An edge from a later row of a `wrap: true` fold back to an earlier one is drawn between its own two boxes. It kept ELK's route from the unfolded picture, which ran the length of the diagram before the fold, so folded it circled the whole picture: `api -> interconnect` in `multicloud.yaml` came out 6.2x its direct line.

It now leaves the source's right side, rises into the gap above its row, crosses to just left of the target and goes in from the side. When the two rows are not neighbours, the climb between their gaps runs along the far left. These edges take their own lanes at the top of each gap, above the edges the fold wraps, and their label sits over the longest level run.
