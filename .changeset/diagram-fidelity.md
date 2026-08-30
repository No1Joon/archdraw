---
'@archdraw/core': minor
---

Reject a containment cycle instead of dropping the nodes in it. A node whose parent chain led back to itself sat outside the tree the layout walks, so it silently vanished from the picture — two mutually-parented nodes took a third down with them. `normalize()` now throws with the offending path.

Add `wrap`, which folds a long chain into rows. Without it a 200-node chain lays out as a single strip 54,352 px wide; with it the same diagram is 4,616 × 3,798.

Add `darkTheme` beside `defaultTheme`, so a diagram is not a white slab on a dark page.
