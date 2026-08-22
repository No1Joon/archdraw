---
'archdraw': minor
---

Bundle Noto Sans KR and rasterise PNGs with it alone. resvg drew text with whatever the machine happened to have installed, so a diagram with Korean labels came out with the labels missing on any host without the family — silently, since a font it cannot resolve makes resvg draw nothing rather than fail. The same input now yields the same PNG anywhere.
