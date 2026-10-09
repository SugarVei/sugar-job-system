import { FURNITURE, FURNITURE_TINTS, MAX_FURNITURE, type Furniture } from './data';

export function footprint(f: Furniture) {
  const spec = FURNITURE.find(s => s.kind === f.kind)!;
  const c = Math.abs(Math.cos(f.rotation)), s = Math.abs(Math.sin(f.rotation));
  return { w: spec.size[0] * c + spec.size[1] * s, d: spec.size[0] * s + spec.size[1] * c };
}
export function clampFurniture(f: Furniture): Furniture {
  const { w, d } = footprint(f);
  return { ...f, x: Math.max(-3.12 + w / 2, Math.min(3.12 - w / 2, f.x)), z: Math.max(-2.84 + d / 2, Math.min(2.84 - d / 2, f.z)) };
}
export function placementError(f: Furniture, items: Furniture[]) {
  const clamped = clampFurniture(f);
  if (Math.abs(clamped.x - f.x) > .001 || Math.abs(clamped.z - f.z) > .001) return '请把家具放在房间内。';
  const a = footprint(f);
  for (const other of items) {
    if (other.id === f.id || (other.kind === 'rug') !== (f.kind === 'rug')) continue;
    const b = footprint(other);
    if (Math.abs(f.x - other.x) < (a.w + b.w) / 2 + .02 && Math.abs(f.z - other.z) < (a.d + b.d) / 2 + .02) return '这里已有家具，请换个位置。';
  }
  return null;
}
export function findSpace(f: Furniture, items: Furniture[]) {
  const candidates: Furniture[] = [];
  for (let z = -2.75; z <= 2.75; z += .25) for (let x = -3; x <= 3; x += .25) candidates.push({ ...f, x, z });
  candidates.sort((a,b) => a.x ** 2 + (a.z - .6) ** 2 - b.x ** 2 - (b.z - .6) ** 2);
  return candidates.find(item => !placementError(item, items)) || null;
}
export function furnitureBlocks(items: Furniture[], x: number, z: number) {
  return items.some(f => {
    if (f.kind === 'rug') return false;
    const { w, d } = footprint(f);
    return Math.abs(x - f.x) < w / 2 + .12 && Math.abs(z - f.z) < d / 2 + .12;
  });
}
export function decodeFurniture(raw: unknown, version: unknown): Furniture[] {
  const result: Furniture[] = [], ids = new Set<string>();
  if (Array.isArray(raw)) for (const value of raw) {
    if (!value || typeof value !== 'object' || !FURNITURE.some(s => s.kind === value.kind) || typeof value.id !== 'string' || !value.id || value.id.length > 64 || ids.has(value.id) || ![value.x,value.z,value.rotation].every(Number.isFinite)) continue;
    const rotation = ((value.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    result.push(clampFurniture({ id: value.id, kind: value.kind, x: value.x, z: value.z, rotation, tint: FURNITURE_TINTS.some(t => t.id === value.tint) ? value.tint : 'default' }));
    ids.add(value.id);
    if (result.length >= MAX_FURNITURE) break;
  }
  // Preserve the work desk that was built into older rooms, now as removable furniture.
  if (version !== 2 && !result.some(f => f.kind === 'desk')) {
    for (const item of [{id:'legacy-work-desk',kind:'desk' as const,x:.3,z:-1.25,rotation:0},{id:'legacy-work-chair',kind:'chair' as const,x:.2,z:.02,rotation:0}]) {
      if (result.length < MAX_FURNITURE && !ids.has(item.id)) result.push(item);
    }
  }
  return result;
}

export function starterFurniture(): Furniture[] {
  return [
    {id:'welcome-desk',kind:'desk',x:-.55,z:-2.2,rotation:0},
    {id:'welcome-chair',kind:'chair',x:-.55,z:-1.2,rotation:0},
    {id:'welcome-bed',kind:'single-bed',x:2.3,z:.7,rotation:0},
    {id:'welcome-sofa',kind:'loveseat',x:-2.1,z:.05,rotation:Math.PI/2},
    {id:'welcome-rug',kind:'rug',x:-.85,z:1.05,rotation:0},
    {id:'welcome-coffee',kind:'coffee',x:-.65,z:1.45,rotation:0},
    {id:'welcome-plant',kind:'plant',x:2.6,z:-2.15,rotation:0},
    {id:'welcome-lamp',kind:'lamp',x:-2.7,z:2.35,rotation:0},
  ];
}
