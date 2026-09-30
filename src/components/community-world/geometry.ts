import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export const materialCache = new Map<string, T.MeshStandardMaterial>();
export function material(color: string) {
  let m = materialCache.get(color);
  if (!m) { m = new T.MeshStandardMaterial({ color, roughness: .88 }); materialCache.set(color, m); }
  return m;
}
export function box(g: T.Group, w: number, h: number, d: number, x: number, y: number, z: number, color: string) {
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material(color));
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
}
export function cylinder(g: T.Group, r: number, h: number, x: number, y: number, z: number, color: string, top = r) {
  const m = new T.Mesh(new T.CylinderGeometry(top, r, h, 8), material(color)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
export function leaf(g: T.Group, x: number, y: number, z: number, scale: number, color: string) {
  const m = new T.Mesh(new T.IcosahedronGeometry(scale, 0), material(color)); m.position.set(x,y,z); m.scale.set(.7,1,.65); m.castShadow = true; g.add(m); return m;
}
export function plant(g: T.Group, x: number, z: number, scale = 1, base = .18) {
  cylinder(g,.23*scale,.46*scale,x,base+.23*scale,z,'#c6b7a0',.32*scale);
  cylinder(g,.23*scale,.04,x,base+.47*scale,z,'#665541');
  cylinder(g,.035*scale,.85*scale,x,base+.75*scale,z,'#70846a');
  for (let i=0;i<5;i++) { const a=i*2.4; const l=leaf(g,x+Math.sin(a)*.2*scale,base+(.75+i*.105)*scale,z+Math.cos(a)*.2*scale,.32*scale,['#719a71','#a1b785','#87a67c'][i%3]); l.rotation.z=Math.sin(a)*.5; }
}
export function mergeStatic(g: T.Group) {
  g.updateMatrixWorld(true);
  const inverse = g.matrixWorld.clone().invert();
  const groups = new Map<T.Material, T.BufferGeometry[]>();
  g.traverse(o => { if (o instanceof T.Mesh && !Array.isArray(o.material)) {
    const geometry = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
    const list = groups.get(o.material) || []; list.push(geometry); groups.set(o.material,list); o.geometry.dispose();
  }});
  g.clear();
  groups.forEach((geometries, mat) => { const geom=mergeGeometries(geometries,false); geometries.forEach(geo=>geo.dispose()); if(geom) { const m=new T.Mesh(geom,mat); m.castShadow=true;m.receiveShadow=true;g.add(m); }});
}
