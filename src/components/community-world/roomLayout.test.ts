import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeFurniture, footprint, placementError, findSpace, starterFurniture, furnitureBlocks } from './roomLayout.ts';
import { FURNITURE, MAX_FURNITURE, type Furniture } from './data.ts';

test('legacy built-in workspace migrates once and intentionally empty new rooms remain empty',()=>{
  const old=decodeFurniture([{id:'old-plant',kind:'plant',x:2.4,z:-1.8,rotation:0}],undefined);
  assert.deepEqual(old.map(f=>f.kind),['plant','desk','chair']);
  assert.equal(decodeFurniture(old,2).length,3);
  assert.deepEqual(decodeFurniture([],2),[]);
});
test('new furniture, tints and 40 item layouts survive decoding without losing state',()=>{
  const raw=Array.from({length:MAX_FURNITURE},(_,i)=>({id:`f-${i}`,kind:FURNITURE[i%FURNITURE.length].kind,x:0,z:0,rotation:Math.PI/2,tint:'sage'}));
  const decoded=decodeFurniture(raw,2);
  assert.equal(decoded.length,MAX_FURNITURE);assert.deepEqual(decoded,raw);
  assert.equal(decodeFurniture([...raw,{...raw[0],id:'extra'}],2).length,MAX_FURNITURE);
});
test('malformed kinds, duplicate ids and nonfinite coordinates are rejected',()=>{
  const good={id:'good',kind:'bed',x:0,z:0,rotation:0,tint:'clay'};
  assert.deepEqual(decodeFurniture([good,good,{...good,id:'bad',kind:'toString'},{...good,id:'bad2',x:Infinity},null],2),[good]);
});
test('rotated bed footprint stays within walls; rugs can sit beneath furniture',()=>{
  const bed: Furniture={id:'bed',kind:'bed',x:0,z:0,rotation:Math.PI/2};
  assert.ok(Math.abs(footprint(bed).w-2.75)<.0001);
  assert.ok(placementError({...bed,x:2},[]));
  assert.equal(placementError(bed,[{id:'rug',kind:'rug',x:0,z:0,rotation:0}]),null);
  assert.ok(placementError(bed,[{id:'sofa',kind:'sofa',x:0,z:0,rotation:0}]));
});
test('starter room can be rearranged and added furniture finds a real free position',()=>{
  const starter=starterFurniture();
  for(const item of starter) assert.equal(placementError(item,starter),null,item.id);
  const added=findSpace({id:'new',kind:'armchair',x:0,z:0,rotation:0},starter);
  assert.ok(added);assert.equal(placementError(added,starter),null);
});
test('walking obstacles follow moved furniture and disappear after deletion; rugs stay walkable',()=>{
  const desk: Furniture={id:'desk',kind:'desk',x:0,z:-1.25,rotation:0};
  assert.equal(furnitureBlocks([desk],0,-1.25),true);
  assert.equal(furnitureBlocks([{...desk,z:1.8}],0,-1.25),false);
  assert.equal(furnitureBlocks([],0,-1.25),false);
  assert.equal(furnitureBlocks([{...desk,kind:'rug'}],0,-1.25),false);
});
