import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { solid } from './materials.js';

const geometryCache = new Map();
export const lampLights = [];
function geometry(w, h, d, radius) {
  const key = [w, h, d, radius].join('/');
  if (!geometryCache.has(key)) geometryCache.set(key, radius ? new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)) : new T.BoxGeometry(w, h, d));
  return geometryCache.get(key);
}
export function box(parent, w, h, d, x, y, z, material, radius = 0) {
  const mesh = new T.Mesh(geometry(w, h, d, radius), typeof material === 'string' ? solid(material) : material);
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function cylinder(parent, top, bottom, height, x, y, z, material, segments = 24) {
  const mesh = new T.Mesh(new T.CylinderGeometry(top, bottom, height, segments), typeof material === 'string' ? solid(material) : material);
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function sphere(parent, radius, x, y, z, material, scale = [1, 1, 1]) {
  const mesh = new T.Mesh(new T.SphereGeometry(radius, 16, 12), typeof material === 'string' ? solid(material) : material);
  mesh.position.set(x, y, z); mesh.scale.set(...scale); mesh.castShadow = true; parent.add(mesh); return mesh;
}
export function rod(parent, a, b, radius, material) {
  const start = new T.Vector3(...a), end = new T.Vector3(...b), direction = end.clone().sub(start);
  const mesh = cylinder(parent, radius, radius, direction.length(), 0, 0, 0, material, 8);
  mesh.position.copy(start.add(end).multiplyScalar(.5)); mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize()); return mesh;
}
export function plant(parent, x, z, scale = 1, base = .2) {
  const g = new T.Group(); g.position.set(x, base, z); g.scale.setScalar(scale); parent.add(g);
  cylinder(g, .28, .21, .46, 0, .23, 0, '#a29277');
  cylinder(g, .265, .265, .025, 0, .468, 0, '#4b4032');
  const green = ['#496246', '#617448', '#384f37', '#6f7b48'].map(c => solid(c, .83));
  for (let i = 0; i < 12; i++) {
    const angle = i * 2.399, height = .8 + (i % 4) * .24;
    const ex = Math.cos(angle) * (.25 + i % 3 * .08), ez = Math.sin(angle) * (.25 + i % 3 * .08);
    rod(g, [0, .45, 0], [ex, height, ez], .012, green[2]);
    const shape = new T.Shape(); shape.moveTo(0, 0); shape.bezierCurveTo(-.2, .12, -.24, .47, 0, .66); shape.bezierCurveTo(.24, .47, .2, .12, 0, 0);
    const geo = new T.ShapeGeometry(shape, 8);
    const position = geo.attributes.position;
    for (let j = 0; j < position.count; j++) position.setZ(j, Math.sin(position.getY(j) * 4.8) * .065);
    geo.computeVertexNormals();
    const mat = green[i % 4]; mat.side = T.DoubleSide;
    const leaf = new T.Mesh(geo, mat); leaf.position.set(ex, height - .12, ez); leaf.rotation.set(-.7 - i % 3 * .12, angle, Math.cos(angle) * .3); leaf.castShadow = true; g.add(leaf);
  }
  return g;
}
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  const meshes = [];
  root.traverse(mesh => {
    if (!(mesh instanceof T.Mesh) || mesh.isInstancedMesh || Array.isArray(mesh.material) || mesh.material.transparent) return;
    const key = `${mesh.material.uuid}/${mesh.castShadow}/${mesh.receiveShadow}/${Boolean(mesh.geometry.index)}/${Object.keys(mesh.geometry.attributes).sort().join(',')}`;
    if (!groups.has(key)) groups.set(key, { material: mesh.material, cast: mesh.castShadow, receive: mesh.receiveShadow, geometries: [] });
    const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    groups.get(key).geometries.push(geo); meshes.push(mesh);
  });
  for (const group of groups.values()) {
    const geometry = mergeGeometries(group.geometries);
    group.geometries.forEach(geo => geo.dispose());
    if (!geometry) throw new Error('Static scene geometry could not be merged');
    const mesh = new T.Mesh(geometry, group.material); mesh.castShadow = group.cast; mesh.receiveShadow = group.receive; root.add(mesh);
  }
  meshes.forEach(mesh => mesh.removeFromParent());
}
