---
'@archdraw/core': patch
'archdraw': patch
---

`wrap: true` folds along the chain instead of ELK's layer index. ELK cut the layering into rows wherever its aspect target fell, so the main chain could stop reading in order — the reader was sent back up the page, and in one agent run the pipeline's last node landed top-left. ELK cannot be told where to cut from elkjs, and a row inside the hierarchy cannot run in a different direction from its parent, so the fold is now archdraw's own.

The diagram is laid out unwrapped, then cut between top-level boxes into rows whose count brings the picture closest to 1.6:1, and each row picks up where the last one ended. A group is never split between rows. An edge between rows runs out past the end of its row, along the gap below it and back in at the start of the next, each in its own lane. A band of a row that only an edge crosses shrinks to what that edge needs. A `DOWN` diagram folds into columns the same way.

A wrapped diagram also breaks cycles by `GREEDY_MODEL_ORDER`, so when a group both feeds and is fed by the chain, the edge ELK turns around is the one written against the file's order rather than a link of the chain.

Over the sixteen bundled examples forced to `wrap: true`, reading-order inversions on the longest chain drop from 18 to 5, and each of those 5 is present in the same diagram unwrapped. Diagrams without `wrap` lay out byte-identically.
