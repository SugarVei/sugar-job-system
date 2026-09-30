type Point={x:number;z:number};
type Node=Point&{cost:number;score:number};
/** Bounded A* with a binary heap and one collision query per visited cell. */
export function findWalkPath(start:Point,end:Point,blocked:(x:number,z:number)=>boolean,limit:number):Point[]{
  const width=limit*2+1,key=(x:number,z:number)=>(x+limit)*width+z+limit;
  if(Math.abs(end.x)>limit||Math.abs(end.z)>limit||blocked(end.x,end.z))return [];
  const heap:Node[]=[],cost=new Map<number,number>(),parents=new Map<number,Point>(),closed=new Set<number>(),obstacles=new Map<number,boolean>();
  const push=(node:Node)=>{heap.push(node);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].score<=node.score)break;heap[i]=heap[p];i=p;}heap[i]=node;};
  const pop=()=>{const first=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(last.score<=heap[child].score)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;};
  const isBlocked=(x:number,z:number)=>{const id=key(x,z);if(!obstacles.has(id))obstacles.set(id,blocked(x,z));return obstacles.get(id)!;};
  const startKey=key(start.x,start.z);cost.set(startKey,0);push({...start,cost:0,score:0});
  for(let n=0;n<12000&&heap.length;n++){
    const current=pop(),id=key(current.x,current.z);if(closed.has(id))continue;closed.add(id);
    if(current.x===end.x&&current.z===end.z){const path:Point[]=[];let point:Point=current;while(key(point.x,point.z)!==startKey){path.push(point);const parent=parents.get(key(point.x,point.z));if(!parent)return [];point=parent;}return path.reverse();}
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
      if(!dx&&!dz)continue;const x=current.x+dx,z=current.z+dz,next=key(x,z);
      if(Math.abs(x)>limit||Math.abs(z)>limit||closed.has(next)||isBlocked(x,z)||(dx&&dz&&(isBlocked(x,current.z)||isBlocked(current.x,z))))continue;
      const distance=current.cost+Math.hypot(dx,dz);if(distance>=(cost.get(next)??Infinity))continue;
      cost.set(next,distance);parents.set(next,current);push({x,z,cost:distance,score:distance+Math.hypot(end.x-x,end.z-z)});
    }
  }
  return [];
}
