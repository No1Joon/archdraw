---
'@archdraw/core': patch
'archdraw': patch
---

A line no longer runs through the text it passes. An icon's label hangs under the icon, outside the box the layout routes to, so a line leaving the icon from below — every outgoing edge of a `direction: DOWN` diagram — ran through the name. Such a line now starts at the label's foot, and one arriving from below ends there.

A group's title moves right, past any line that crosses its header, as far as the header's own status mark and rollup count allow. A title with no clear place stays where it was.

Every bundled example renders byte-for-byte as before; the change shows in icon-shaped `DOWN` diagrams and in headers a line enters through.
