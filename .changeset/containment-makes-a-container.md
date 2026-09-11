---
'@archdraw/core': minor
'archdraw': minor
---

Let containment decide what a container is. `kind` used to make a group of any entry carrying it, so an agent reaching for it as "what kind of service this is" — `kind: AWS S3` on an ordinary node — turned that node into an empty group, and a whole diagram written that way drew as empty boxes with spilling labels. A container is now an entry that holds something: one with `children`, one listed under `groups`, or one another entry points `parent` at. `kind` still names what a container is and still puts an icon in its header beside `type`; it no longer decides the question.

The flat form is untouched — `parent` already promoted its target, so a container declared as a bare `kind` entry with its children pointing at it reads exactly as before. All fourteen bundled examples render byte-identically, including the three written the flat way.

The one file this reads differently is one carrying `kind` on an entry that holds nothing and is not under `groups`: it was an empty group and is now the node it looks like. That is the shape the previous release could only make less broken, by keeping its box around its own label. For a group that really holds nothing, list it under `groups`.
