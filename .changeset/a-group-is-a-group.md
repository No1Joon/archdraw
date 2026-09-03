---
'@archdraw/core': patch
---

Fill a group the flat way and keep its children. A container declared under `groups` with nothing in it yet — the flat form points children at it with `parent` rather than nesting them — was read as an ordinary leaf, so the layout never walked into it. Two ways that ended: an edge across two such groups threw ELK's own `JsonImportException: Referenced shape does not exist`, and an edge inside one rendered happily while every child silently vanished from the picture, which is the worse of the two. An entry under `groups` is a group whatever it holds, and so is any node another node names as its `parent`. Found by an agent that wrote the flat form on its own and abandoned it when the render failed.
