---
'@archdraw/core': patch
---

Stop `wrap: true` throwing out of ELK. On a diagram whose groups an edge passes through, the `SINGLE_EDGE` wrapping strategy threw `java.util.NoSuchElementException` — a raw GWT exception with nothing to act on, and `--check` passed because it never lays out. `MULTI_EDGE` handles the same graph, and folds better besides: the bundled `startup` example was not folded at all before and now halves its longest side.
