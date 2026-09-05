---
'@archdraw/core': minor
'archdraw': minor
---

Draw the traffic, not just the wiring. `-o out.html` writes one self-contained page — no CDN, no build step, nothing to serve it from — carrying the same drawing with dots travelling along every edge in the direction it points, plus pan and zoom. One dash period per 1.2s means the same speed on a short edge and a long one, and `prefers-reduced-motion` turns it off.

A node or group may now say `external: true`, meaning it is outside the system being drawn; everything inside such a group inherits it unless it says otherwise. The page then colours traffic by the boundary it crosses — arriving from outside, staying inside, leaving — and draws a legend. A diagram that never says it is all inside, in one colour and no legend, which is where every existing file starts.

The still SVG and PNG are untouched: the animation is opt-in inside the renderer, so `renderToSvg` output is byte-identical to before.
