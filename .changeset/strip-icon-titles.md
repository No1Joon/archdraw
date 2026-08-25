---
'@archdraw/icons-aws': patch
'@archdraw/icons-gcp': patch
'@archdraw/icons-brands': patch
---

Strip the vendor `<title>` from every icon. It surfaced the packager's internal path (`Icon-Architecture/48/Arch_Amazon-Virtual-Private-Cloud_48`) as a tooltip and competed with the diagram's own accessible name. Rendering is unchanged; the three packs lose 141 KB.
