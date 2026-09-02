---
'@archdraw/core': patch
---

Suggest the slug that spells the guess out. The near-miss hint ranked by edit distance alone, so `airflow` was answered with `akiflow` — a different product — while the managed Airflow icon sat unmentioned, `glue` drew `gnu, lua, flux` past `aws-glue`, and `kinesis` got no suggestion at all because `amazon-kinesis` is seven edits away. A guess that names a whole word of a slug now wins, then one that starts a word, and edit distance still catches a plain typo.
