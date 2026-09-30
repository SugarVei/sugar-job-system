import { test } from 'node:test';
import assert from 'node:assert/strict';
import {validPlayerFrame} from './networkTypes.ts';
import {findWalkPath} from './walkPath.ts';
import {isWalkableGround,WALK_GRID_LIMIT} from './walkableGround.ts';
test('network frames reject unbounded or malformed positions and props',()=>{
 const frame={id:'session',userId:'user',name:'邻居',x:0,y:.2,z:0,yaw:0,wave:false,mode:null,seq:1};
 assert.ok(validPlayerFrame(frame));for(const patch of [{x:Infinity},{z:230},{y:99},{name:'x'.repeat(25)},{vehicle:[0,90,0,0]},{props:[[NaN,0,0]]},{props:'bad'},{vehicle:'bad'},{mode:'unknown'},{wave:'bad'}])assert.equal(validPlayerFrame({...frame,...patch}),false);
});
test('A* reaches both pier heads and never routes through sea',()=>{
 for(const side of [-1,1]){const path=findWalkPath({x:2,z:side*75},{x:0,z:side*93},(x,z)=>!isWalkableGround(x,z),WALK_GRID_LIMIT);assert.ok(path.length);assert.deepEqual({x:path[path.length-1].x,z:path[path.length-1].z},{x:0,z:side*93});assert.ok(path.every(p=>isWalkableGround(p.x,p.z)));}
});
test('A* detours around walls, forbids diagonal corner cutting, and caches collisions',()=>{
 const queries=new Map<string,number>();const blocked=(x:number,z:number)=>{const k=`${x},${z}`;queries.set(k,(queries.get(k)||0)+1);return x===1&&z<3&&z>-3;};
 const path=findWalkPath({x:0,z:0},{x:3,z:0},blocked,10);assert.ok(path.some(p=>Math.abs(p.z)>=3));assert.ok([...queries.entries()].filter(([k])=>k!=='3,0').every(([,n])=>n===1));
 assert.deepEqual(findWalkPath({x:0,z:0},{x:1,z:1},(x,z)=>(x===1&&z===0)||(x===0&&z===1)||(x<0||z<0),1),[]);
});
