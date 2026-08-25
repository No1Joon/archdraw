---
'@archdraw/icons-gcp': minor
---

Widen the short-name table from 18 entries to 85, so a GCP diagram can say `gke`, `kms`, `iap`, `bq` or `cdn` instead of spelling out the canonical slug. Software names (`redis`, `postgres`, `kubernetes`) are deliberately left out: they belong to the brands pack, and aliasing them to a managed service would draw the wrong icon for a self-hosted one.
