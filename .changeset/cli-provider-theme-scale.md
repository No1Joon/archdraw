---
'archdraw': minor
---

Honour the diagram's own `provider`. `-p` had a hardcoded default, so the documented field never selected a pack: `provider: gcp` still resolved against AWS and answered `Unknown type 'gke'. Did you mean: eks?`. The flag still wins when given.

Add `--theme light|dark`, exposing the palette core already made replaceable.

Validate `--scale`. `-s 0` used to surface resvg's own "Target size is zero" from deep inside the rasteriser, and there was no upper bound.
