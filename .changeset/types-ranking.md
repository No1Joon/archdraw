---
'archdraw': patch
---

Rank `archdraw types` results by how the query lands, and drop matches where it is buried mid-word. `types alb` answered with `virtualbox`, `actualbudget`, `socialblade` and `thurgauerkantonalbank` alongside the alias that resolves it. A query that starts a word is kept, so `types postgres` still finds `amazon-aurora-postgresql-instance`.
