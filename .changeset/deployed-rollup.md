---
'@archdraw/core': minor
'archdraw': minor
---

Tell written from running, and count what a group holds.

`status` gains a fifth state, `deployed`, after `done`: `done` is written, `deployed` is running where it is meant to run. It is one ladder rather than a second field, so every element still carries one mark — a play mark in its own colour — and the legend names it like the others. A `deployed` edge draws as a plain line and animates, as `done` does. Something running an old version while the next is being written is `in_progress`.

`rollup: true` at the top level writes a count in every group header — `2/3 done` — of what the group holds at any depth, with `deployed` counted as finished and anything without a status left out. It sits beside the group's own mark rather than replacing it: a created VM still says nothing about what runs inside it, and now the header says that too. Off by default.

A group header also now reserves room for its own status mark, which could sit over a long label in a narrow group.

Every bundled example without a status renders byte-identically; `build-status.yaml` now uses both.
