---
'archdraw': patch
---

Look up the whole diagram in one run. `archdraw types` now takes several queries — `archdraw types s3 lambda kinesis clickhouse` — and prints each answer under a `# query` heading, because a run that drew a nine-service pipeline spent eight sequential calls of two to fifteen seconds each looking types up one at a time. A batch shortlists every query so no single one fills the answer, and a query that matches nothing is named on stderr while the rest still print, with the run failing as it always did. The cross-pack note added last release no longer volunteers a coincidence: `types rds` was answering that `brands` also holds `awwwards`, since 'rds' does end that word. A word ending is enough to answer a query about it and never enough to raise unasked.
