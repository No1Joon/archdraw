---
'@archdraw/core': patch
'archdraw': patch
---

A group longer than a row of a `wrap: true` fold is folded inside too. The fold cuts only between top-level boxes, so a long chain grouped next to anything else took a row to itself and ran on unfolded — ten stages in a group between a user and a CRM came out as one strip the width of all ten.

A row's length is what the whole picture would take folded to 1.6:1. A group longer than that is laid out on its own and folded to fit it, then placed as one box whose border each crossing edge meets at a fixed point; the part of such an edge drawn inside is joined back to the part drawn outside, so it is still one line. A group inside such a group is handled the same way, innermost first. A `DOWN` diagram folds such a group into columns.

A group no longer than a row, and every diagram that has none, lays out exactly as before: across the bundled examples forced to `wrap: true`, every size and reading order is unchanged.
