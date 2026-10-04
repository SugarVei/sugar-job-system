import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mergeSpatialStatic } from './spatialBatch.ts';

function mergeForTest(group: T.Group) {
  const material = (group.children[0] as T.Mesh).material;
  const geometries = group.children.map(child => {
    child.updateMatrix();
    return (child as T.Mesh).geometry.clone().applyMatrix4(child.matrix);
  });
  group.clear();
  group.add(new T.Mesh(mergeGeometries(geometries), material));
}

function box(parent: T.Group, x: number, z: number, width = 2, depth = 2) {
  const mesh = new T.Mesh(new T.BoxGeometry(width, 3, depth), new T.MeshBasicMaterial());
  mesh.position.set(x, 1.5, z);
  parent.add(mesh);
  return mesh;
}

function meshes(root: T.Object3D) {
  const result: T.Mesh[] = [];
  root.traverse(object => { if (object instanceof T.Mesh) result.push(object); });
  return result;
}

test('nearby objects merge without pulling distant districts into the same culling bound', () => {
  const root = new T.Group();
  box(root, 4, 4); box(root, 9, 4); box(root, 70, 4);
  mergeSpatialStatic(root, mergeForTest);
  const result = meshes(root);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(mesh => mesh.geometry.boundingBox!.getSize(new T.Vector3()).x).sort((a, b) => a - b), [2, 7]);
  assert.ok(result.every(mesh => mesh.frustumCulled && mesh.geometry.boundingSphere));
});

test('batching preserves world bounds under translated, rotated and scaled parents', () => {
  const root = new T.Group();
  root.position.set(14, 8, -23);
  root.rotation.set(.1, .7, .05);
  root.scale.set(2, 1.5, .8);
  const first = box(root, 5, 7);
  first.rotation.y = .5;
  first.scale.set(1.2, .8, 2);
  box(root, 10, 12);
  root.updateMatrixWorld(true);
  const before = new T.Box3().setFromObject(root, true);
  mergeSpatialStatic(root, mergeForTest);
  root.updateMatrixWorld(true);
  const after = new T.Box3().setFromObject(root, true);
  assert.ok(before.min.distanceTo(after.min) < .00001);
  assert.ok(before.max.distanceTo(after.max) < .00001);
});

test('long surfaces batch without clipping while shoreline, pickable objects and subgroups stay intact', () => {
  const root = new T.Group();
  const ground = box(root, 0, 0, 145, 145);
  const road = box(root, 0, 0, 2, 145);
  const shore = box(root, 1, 1);
  (shore.material as T.Material).transparent = true;
  const pickable = box(root, 2, 2);
  pickable.userData.landmark = 'board';
  const nested = new T.Group();
  root.add(nested); box(nested, 1, 1);
  box(root, 4, 4);
  const boundsBefore = new T.Box3().setFromObject(root, true);
  const triangles = (scene: T.Object3D) => meshes(scene).reduce((sum, mesh) => sum
    + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3, 0);
  const trianglesBefore = triangles(root);
  mergeSpatialStatic(root, mergeForTest);
  for (const object of [shore, pickable, nested]) assert.equal(object.parent, root);
  assert.equal(ground.parent, null);
  assert.equal(road.parent, null);
  const spanning = root.children.find(group => group.name.startsWith('static-cell:spanning:'))!;
  assert.equal(meshes(spanning).length, 1);
  assert.deepEqual(new T.Box3().setFromObject(spanning, true).getSize(new T.Vector3()).toArray(), [145, 3, 145]);
  assert.equal(triangles(root), trianglesBefore);
  const boundsAfter = new T.Box3().setFromObject(root, true);
  assert.ok(boundsBefore.min.equals(boundsAfter.min));
  assert.ok(boundsBefore.max.equals(boundsAfter.max));
});

test('shadow, layer and ordering flags survive a merger which resets Mesh defaults', () => {
  const root = new T.Group();
  root.renderOrder = 8;
  const first = box(root, 2, 2);
  first.castShadow = true;
  first.receiveShadow = true;
  first.renderOrder = 3;
  first.layers.set(2);
  const second = box(root, 4, 2);
  second.castShadow = false;
  second.receiveShadow = true;
  mergeSpatialStatic(root, mergeForTest);
  const result = meshes(root);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(mesh => [mesh.castShadow, mesh.receiveShadow, mesh.renderOrder, mesh.layers.mask]), [
    [true, true, 3, 4], [false, true, 0, 1],
  ]);
  assert.ok(root.children.every(group => group.renderOrder === 8));
});

test('invalid grid size fails before moving any scene children', () => {
  const root = new T.Group();
  const mesh = box(root, 2, 2);
  for (const value of [0, -1, NaN, Infinity]) assert.throws(() => mergeSpatialStatic(root, mergeForTest, value), RangeError);
  assert.equal(mesh.parent, root);
});
