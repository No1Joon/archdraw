---
'@archdraw/core': patch
---

Land every arrowhead on the node its edge names. With `wrap: true` an edge could be routed to a point on no node: the arrowhead stopped in open space, so the picture claimed a connection and showed nowhere it went — worse to read than a long detour, because nothing on the page says where the edge ended up. The fold itself was ELK's, and two things were wrong with it. ELK's pass that reroutes a wrapped edge was stranding the endpoint, so it is off now — the same graphs wrap to within ten pixels of the same box without it. That pass never covered an edge running against `direction` anyway, so the layout now also checks each endpoint against the box it belongs to and draws its own orthogonal route for any that missed, label included. A diagram that wraps and one that does not both land every endpoint; a route ELK got right is left as it was. Found by handing the same prompt to an agent CLI on 0.7.6.
