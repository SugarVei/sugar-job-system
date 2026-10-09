import * as T from 'three';
import { ROOM_STYLES, FURNITURE_TINTS, type Room, type Furniture } from './data';
import { box, mergeStatic } from './room-design/room.js';
import { mats } from './room-design/materials.js';
import { createFurniture } from './room-design/furniture.js';
import { box as townBox, cylinder as townCylinder, plant as townPlant, mergeStatic as mergeTown } from './geometry';

const surfaces = new Map<string, T.MeshStandardMaterial>();
function surface(base: T.MeshStandardMaterial, color: string) {
  const key = base.uuid + color;
  if (!surfaces.has(key)) { const mat = base.clone(); mat.color.set(color); surfaces.set(key, mat); }
  return surfaces.get(key)!;
}
export function createRoomShell(room: Room) {
  const g = new T.Group();
  const style = ROOM_STYLES.find(s => s.id === room.style) || ROOM_STYLES[0];
  const wall = surface(mats.wall, style.wall), floor = surface(mats.floor, room.floor);
  box(g,6.8,.32,6.2,0,.04,0,mats.plinth,.04);
  box(g,6.55,.06,5.96,0,.215,0,mats.walnut);
  for (let row=0;row<20;row++) for(let col=0;col<4;col++) {
    box(g,1.62,.025,.292,-2.44+col*1.63,.257,-2.78+row*.294,floor);
  }
  // Open cutaway walls and a real window aperture retain directional shadows.
  box(g,.16,2.4,6.12,-3.32,1.46,0,wall);
  for(const x of [-2.42,2.42]) box(g,1.80,2.4,.16,x,1.46,-3.02,wall);
  box(g,3.10,.56,.16,0,.54,-3.02,wall);
  box(g,3.10,.25,.16,0,2.535,-3.02,wall);
  for(const x of [-1.55,0,1.55]) box(g,.055,1.65,.12,x,1.635,-3.02,mats.metal);
  for(const y of [.81,1.91,2.45]) box(g,3.14,.055,.12,0,y,-3.02,mats.metal);
  box(g,3.32,.06,.30,0,.79,-2.94,mats.walnut);
  box(g,6.50,.09,.07,0,.30,-2.90,mats.walnut);
  box(g,.07,.09,5.93,-3.20,.30,0,mats.walnut);
  box(g,.13,.22,6.1,3.32,.37,0,wall);
  for(const x of [-2.53,2.50]) {
    box(g,.57,.80,.04,x,1.66,-2.92,mats.walnut,.008);
    box(g,.50,.72,.015,x,1.66,-2.89,mats.cream);
    box(g,.30,.40,.015,x,1.65,-2.875,x<0?mats.rust:mats.quilt,.06);
  }
  mergeStatic(g);
  return g;
}
export function createStyledFurniture(f: Furniture) {
  const g = createFurniture(f.kind, f.tint || 'default', { lights: false }) as T.Group;
  g.scale.setScalar(.7);
  g.position.set(f.x,.27,f.z);g.rotation.y=f.rotation;g.userData.furnitureId=f.id;
  return g;
}

export function createTownShell(room: Room) {
  const g=new T.Group(),style=ROOM_STYLES.find(s=>s.id===room.style)||ROOM_STYLES[0];
  townBox(g,6.8,.32,6.2,0,.04,0,'#404943');
  townBox(g,6.55,.04,5.94,0,.235,0,room.floor);
  townBox(g,.16,2.4,6.12,-3.32,1.46,0,style.wall);
  for(const x of [-2.42,2.42])townBox(g,1.80,2.4,.16,x,1.46,-3.02,style.wall);
  townBox(g,3.10,.56,.16,0,.54,-3.02,style.wall);townBox(g,3.10,.25,.16,0,2.535,-3.02,style.wall);
  for(const x of [-1.55,0,1.55])townBox(g,.055,1.65,.12,x,1.635,-3.02,'#394346');
  for(const y of [.81,1.91,2.45])townBox(g,3.14,.055,.12,0,y,-3.02,'#394346');
  townBox(g,.13,.22,6.1,3.32,.37,0,style.wall);mergeTown(g);return g;
}
// Distant rooms retain the same silhouettes while sharing one vertex material.
export function createTownFurniture(f: Furniture) {
  const g=new T.Group(),cream=FURNITURE_TINTS.find(t=>t.id===f.tint)?.color||'#e9ddc7',wood='#a27d55';
  if(f.kind==='plant'||f.kind==='small-plant')townPlant(g,0,0,f.kind==='plant'?.7:.45,.27);
  else if(f.kind==='rug')townBox(g,2.66,.025,1.96,0,.285,0,f.tint&&f.tint!=='default'?cream:'#cec4af');
  else if(f.kind==='bed'||f.kind==='single-bed'){
    const w=f.kind==='bed'?2.03:1.12;townBox(g,w,.28,2.56,0,.55,0,wood);townBox(g,w,.15,2.5,0,.76,0,f.tint&&f.tint!=='default'?cream:'#738294');townBox(g,w,.72,.12,0,.70,-1.27,wood);townBox(g,w-.1,.12,.48,0,.89,-.86,cream);
  }else if(['sofa','loveseat','armchair','chair','stool'].includes(f.kind)){
    const w=f.kind==='sofa'?2.22:f.kind==='loveseat'?1.52:.62;townBox(g,w,.20,.7,0,.64,0,cream);if(f.kind!=='stool')townBox(g,w,.50,.14,0,.92,-.28,cream);for(const x of [-w/2+.1,w/2-.1])townBox(g,.08,.32,.08,x,.4,0,wood);
  }else if(f.kind==='desk'||f.kind==='dining'){
    const w=f.kind==='desk'?2.98:1.18;townBox(g,w,.10,.79,0,1.04,0,wood);for(const x of [-w/2+.2,w/2-.2])townBox(g,.1,.76,.65,x,.65,0,wood);if(f.kind==='desk'){townBox(g,.86,.55,.06,0,1.45,-.18,'#354a4c');townBox(g,.74,.43,.01,0,1.45,-.14,'#71938f');}
  }else if(f.kind==='lamp'){
    townCylinder(g,.16,.05,0,.30,0,wood);townCylinder(g,.025,1.2,0,.90,0,wood);townCylinder(g,.24,.35,0,1.57,0,'#ffe3ac',.18);
  }else if(['shelf','cabinet','console','nightstand'].includes(f.kind)){
    const h=f.kind==='shelf'?2.05:f.kind==='cabinet'?1.86:.48,w=f.kind==='console'?1.78:f.kind==='cabinet'?1.24:f.kind==='shelf'?.88:.48;
    townBox(g,w,h,.40,0,.27+h/2,0,wood);if(f.kind==='shelf')for(let i=0;i<4;i++)townBox(g,w-.1,.14,.03,0,.50+i*.43,.215,cream);
  }else if(f.kind==='rack'){townCylinder(g,.025,1.4,0,.97,0,wood);townBox(g,.42,.045,.045,0,1.55,0,wood);}
  else{townCylinder(g,.50,.07,0,.66,0,wood);townCylinder(g,.15,.36,0,.45,0,wood);}
  mergeTown(g);g.position.set(f.x,0,f.z);g.rotation.y=f.rotation;g.userData.furnitureId=f.id;return g;
}
