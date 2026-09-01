---
'@archdraw/core': minor
'archdraw': minor
---

Name the edges that pay for a group boundary. An edge whose ends sit in different groups is declared on their lowest common ancestor, so it is routed around every container in between — one edge in the bundled `growth` example travels 2760px to cover 1100px, and that single route is what sets the diagram's height. Nothing in ELK's option space fixes it, so `archdraw` now measures each routed edge against its direct distance and names any that ran more than twice as far. The note goes to stderr, never changes the exit code, and stays quiet on a diagram that lays out straight.

`@archdraw/core` exports `detours(ir, root)` and takes a `onLayout` callback in `RenderOptions`, so a caller can measure the graph without laying it out twice.
