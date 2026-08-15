import { readFileSync } from 'node:fs'
import { layout, normalize, parse } from '@archdraw/core'
const ir=normalize(parse(readFileSync(process.argv[2],'utf8')));const root=await layout(ir)
const byId=new Map(ir.nodes.map(n=>[n.id,n]))
function walk(n,ox,oy){const x=ox+(n.x??0),y=oy+(n.y??0)
 for(const c of n.children??[]){const m=byId.get(c.id)
  if(m&&!m.isGroup&&c.id===process.argv[3])console.log(`${Math.round(x+(c.x??0))} ${Math.round(y+(c.y??0))} ${c.width} ${c.height}`)
  walk(c,x,y)}}
walk(root,0,0)
