---
'archdraw': patch
---

Ship `AGENTS.md` in the package. The agent rules — look the type up rather than guess it, no `type` for a component with no icon, `redis` is not `amazon-elasticache` — lived only in `docs/agents.md`, which is not in the tarball, so an agent that had installed archdraw could not read them without fetching the repo.
