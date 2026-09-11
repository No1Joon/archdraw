---
'@archdraw/core': minor
'archdraw': minor
---

Name every element in the output. Each rendered node and group now carries `data-node-id`, each edge `data-edge-id`, and either one `data-status` when it has a status — so a script can patch a status, wire a click or compare two renders without guessing from coordinates, which are exactly what changes between renders.

An edge may now take an `id` of its own. Without one it is named for its two ends — `api->redis` — rather than its place in the list, so adding or moving another edge no longer renames it; only a second edge between the same pair takes a suffix, `api->redis#2`. Two edges written with the same id is an error.

The attributes are the only change to the SVG. All sixteen bundled examples rasterise to byte-identical PNGs.
