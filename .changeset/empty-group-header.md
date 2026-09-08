---
'@archdraw/core': patch
'archdraw': patch
---

Keep an empty group's box around its own header. A group holding nothing collapsed to 20px while its label stayed at the 30px header offset, so the text landed under the box and the border ran through it. `elk.nodeSize.minimum` carried a width for the label but passed `0` for the height, and a compound node with no children has nothing to push it open; it now carries the header height too. Groups that hold something are unchanged — the minimum never binds there, and every bundled example renders byte-identically.

This shows up most through `kind`, which makes a container of any entry that carries it: an agent writing `kind` as a service name — "AWS S3", "AWS Lambda" — turns ordinary nodes into empty groups, and the whole diagram spills its labels. The packaged `AGENTS.md` now says what `kind` means, and that `-o out.html` writes an animated page rather than SVG.
