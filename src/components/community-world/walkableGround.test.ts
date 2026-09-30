import test from 'node:test';
import assert from 'node:assert/strict';
import {isWalkableGround,WALK_GRID_LIMIT} from './walkableGround.ts';

test('both pier entrances connect continuously to the island and T heads',()=>{
  for(const side of [-1,1]){
    for(let z=76;z<=93.9;z+=.05)assert.ok(isWalkableGround(0,z*side),`blocked at ${z*side}`);
    for(let x=-3.65;x<=3.65;x+=.1)assert.ok(isWalkableGround(x,93*side));
  }
  assert.ok(WALK_GRID_LIMIT>=94);
});
test('walkers remain inside pier edges and cannot walk across surrounding sea',()=>{
  for(const side of [-1,1]){
    assert.equal(isWalkableGround(1.3,86*side),false);
    assert.equal(isWalkableGround(3.8,93*side),false);
    assert.equal(isWalkableGround(0,94.1*side),false);
    assert.equal(isWalkableGround(2,80*side),false);
  }
  assert.equal(isWalkableGround(79,0),false);
  assert.equal(isWalkableGround(NaN,0),false);
});
