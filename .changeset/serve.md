---
'@archdraw/core': minor
'archdraw': minor
---

Watch a diagram while editing it. `archdraw serve diagram.yaml --watch` serves the animated page on a local port and redraws it every time the file is saved:

```
archdraw serve diagram.yaml --watch            # http://127.0.0.1:4173
archdraw serve diagram.yaml --watch --port 0   # any free port
```

The page reloads on a redraw and puts back where it was looking — the zoom, the pan, the scene that was pressed — so an edit reads as the picture changing rather than starting over. A save that does not parse or validate keeps the last good drawing on screen and shows the error above it; the next good save clears it. Iterating on a diagram used to mean re-running the render and re-opening the file, and a separate server to do it for you was the thing every user wrote for themselves.

It watches the directory rather than the file, so an editor that saves by renaming a new file over the old one does not end the watch. Without `--watch` it serves the file once, and a broken file is an error instead of a page waiting for a fix. A `-` for stdin is refused: there is nothing to watch.

The core gains one HTML option, `live`, which is what `serve` renders with. A page rendered without it is unchanged.
