import * as T from 'three';
import { box, cylinder, sphere, rod, plant, lampLights, mergeStatic } from './room.js';
import { mats, solid } from './materials.js';
import { BY_KIND, TINTS } from './furniture-catalog.js';

function legs(g, w, d, h, material = mats.walnut) {
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) box(g, .07, h, .07, x, h / 2, z, material, .018);
}
function lamp(g, x, z, base, tall, lights) {
  const height = tall ? 1.72 : .47;
  cylinder(g, tall ? .23 : .13, tall ? .23 : .13, .04, x, base + .02, z, mats.brass);
  cylinder(g, .018, .018, height, x, base + height / 2, z, mats.brass, 12);
  if (tall) {
    sphere(g, .3, x, base + height, z, mats.lamp, [1, 1.6, 1]);
    for (let i = 0; i < 9; i++) { const radius = Math.sin((i + 1) / 10 * Math.PI) * .293; cylinder(g, radius, radius, .007, x, base + height - .38 + i * .094, z, '#c9b68c'); }
  } else cylinder(g, .20, .29, .28, x, base + height, z, mats.lamp);
  if (lights) {
    const light = new T.PointLight('#ffbf71', tall ? 5 : 3.5, 5, 2);
    light.userData.baseIntensity = light.intensity; light.position.set(x, base + height - .10, z); g.add(light); lampLights.push(light);
  }
}
function sofa(g, width, upholstery) {
  legs(g, width - .4, .70, .18);
  box(g, width, .30, 1.12, 0, .33, 0, upholstery, .10);
  box(g, width, .79, .25, 0, .73, -.42, upholstery, .09);
  for (const x of [-(width - .26) / 2, (width - .26) / 2]) box(g, .26, .60, 1.12, x, .54, 0, upholstery, .095);
  const count = width > 2.5 ? 3 : 2, seat = (width - .58) / count;
  for (let i = 0; i < count; i++) { const x = (i - (count - 1) / 2) * seat; box(g, seat - .035, .22, .85, x, .6, .04, upholstery, .08); box(g, seat - .025, .63, .19, x, .88, -.26, upholstery, .065).rotation.x = -.12; }
  for (const x of [-width / 2 + .57, width / 2 - .57]) { const pillow = box(g, .48, .45, .16, x, .89, .035, mats.rust, .075); pillow.rotation.set(-.2, 0, x < 0 ? .13 : -.13); }
}
function bed(g, width, quilt) {
  legs(g, width - .30, 3.3, .25);
  box(g, width, .22, 3.65, 0, .36, 0, mats.walnut, .04);
  box(g, width - .10, .31, 3.55, 0, .61, 0, mats.cream, .09);
  box(g, width, .98, .13, 0, .72, -1.86, mats.walnut, .03);
  box(g, width - .17, .69, .09, 0, .83, -1.77, mats.cream, .04);
  box(g, width - .04, .06, 2.53, 0, .79, .46, quilt, .05);
  const geo = new T.PlaneGeometry(width - .04, 2.53, 30, 32), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getY(i); pos.setZ(i, .016 * Math.sin(x * 14 + z * 3) + .016 * Math.cos(z * 8 + x * 2)); }
  geo.computeVertexNormals(); const duvet = new T.Mesh(geo, quilt); duvet.rotation.x = -Math.PI / 2; duvet.position.set(0, .833, .46); duvet.castShadow = duvet.receiveShadow = true; g.add(duvet);
  for (const x of [-(width - .04) / 2, (width - .04) / 2]) box(g, .05, .30, 2.53, x, .68, .46, quilt, .025);
  box(g, width - .04, .30, .06, 0, .68, 1.72, quilt, .028);
  const count = width > 2 ? 2 : 1;
  for (let i = 0; i < count; i++) box(g, width / count - .16, .20, .67, (i - (count - 1) / 2) * width / count, .86, -1.23, mats.cream, .085).rotation.x = -.13;
  box(g, .56, .30, .14, 0, .98, -1.07, mats.rust, .055).rotation.x = -.2;
}
function screen(g, x, y, z, width = 1.15, height = .72) {
  box(g, width, height, .06, x, y, z, mats.metal, .025);
  box(g, width - .08, height - .08, .008, x, y, z + .034, solid('#567777', .3));
  box(g, (width - .08) * .7, .014, .003, x, y + height * .07, z + .04, '#aec6b6');
  box(g, (width - .08) * .43, .01, .003, x - width * .14, y - height * .05, z + .041, '#aec6b6');
}
const tintCache = new Map();
function tinted(base, color) {
  const key = base.uuid + color;
  if (!tintCache.has(key)) { const mat = base.clone(); mat.color.set(color); tintCache.set(key, mat); }
  return tintCache.get(key);
}
export function createFurniture(kind, tint = 'default', { lights = true } = {}) {
  if (!BY_KIND[kind]) throw new Error(`Unknown furniture: ${kind}`);
  const g = new T.Group(); g.name = kind; g.userData.ownedMaterials = [];
  let upholstery = mats.cream, quilt = mats.quilt, rug = mats.rug;
  if (TINTS[tint]) {
    upholstery = tinted(mats.cream, TINTS[tint]);
    quilt = tinted(mats.quilt, TINTS[tint]); rug = tinted(mats.rug, TINTS[tint]);
  }
  if (kind === 'sofa' || kind === 'loveseat') sofa(g, kind === 'sofa' ? 3.18 : 2.18, upholstery);
  if (kind === 'armchair') {
    legs(g, .67, .64, .22); box(g, .89, .25, .9, 0, .36, 0, upholstery, .085);
    box(g, .91, .79, .21, 0, .75, -.34, upholstery, .07).rotation.x = -.10;
    for (const x of [-.4, .4]) box(g, .14, .51, .91, x, .52, 0, upholstery, .06);
    box(g, .65, .18, .69, 0, .57, .055, upholstery, .065);
  }
  if (kind === 'chair') {
    box(g, .77, .14, .7, 0, .6, 0, upholstery, .07); box(g, .79, .67, .13, 0, .96, .30, upholstery, .06).rotation.x = -.09;
    cylinder(g, .03, .03, .45, 0, .32, 0, mats.metal, 12);
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; rod(g, [0, .12, 0], [Math.cos(a) * .43, .07, Math.sin(a) * .43], .021, mats.metal); sphere(g, .056, Math.cos(a) * .43, .055, Math.sin(a) * .43, mats.metal); }
    for (const x of [-.41, .41]) { rod(g, [x, .55, .16], [x, .87, .12], .02, mats.metal); box(g, .055, .04, .4, x, .87, 0, mats.walnut, .015); }
  }
  if (kind === 'stool') { cylinder(g, .30, .30, .17, 0, .52, 0, upholstery); legs(g, .35, .35, .44); }
  if (kind === 'desk') {
    box(g, 4.24, .12, 1.12, 0, 1.05, 0, mats.walnut, .025);
    for (const x of [-1.84, 1.84]) { box(g, .55, .97, .91, x, .485, 0, mats.walnut, .018); for (let i = 0; i < 3; i++) { box(g, .5, .26, .025, x, .22 + i * .28, .47, mats.walnut, .01); box(g, .18, .014, .025, x, .25 + i * .28, .491, mats.brass); } }
    screen(g, 0, 1.68, -.2); box(g, .07, .23, .08, 0, 1.21, -.2, mats.metal); box(g, .40, .02, .25, 0, 1.12, -.2, mats.metal, .01);
    box(g, .64, .033, .22, 0, 1.126, .28, '#d9d6c8', .016);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) box(g, .044, .004, .043, -.26 + i * .064, 1.145, .215 + j * .066, '#ede9dc', .004);
    sphere(g, .06, .55, 1.12, .28, mats.cream, [1, .4, 1.4]); cylinder(g, .067, .064, .18, .93, 1.20, .15, '#e4d6be');
    lamp(g, -1.37, -.21, 1.12, false, lights); plant(g, 1.49, -.18, .27, 1.12);
  }
  if (kind === 'coffee') {
    cylinder(g, .76, .76, .09, 0, .56, 0, mats.walnut, 48);
    for (const a of [0, 2.1, 4.2]) rod(g, [Math.cos(a) * .42, .53, Math.sin(a) * .42], [Math.cos(a) * .54, .06, Math.sin(a) * .54], .05, mats.walnut);
    box(g, .34, .04, .25, -.17, .625, .09, '#d9c8ac'); box(g, .32, .03, .24, -.15, .66, .09, '#899584'); cylinder(g, .065, .06, .10, -.19, .73, .1, '#e5ddc8');
    cylinder(g, .10, .11, .22, .24, .715, -.16, '#c4b38f');
  }
  if (kind === 'side') { cylinder(g, .32, .32, .09, 0, .54, 0, mats.walnut, 40); cylinder(g, .25, .28, .49, 0, .245, 0, mats.walnut, 24); plant(g, 0, 0, .25, .59); }
  if (kind === 'dining') { box(g, 1.68, .09, 1.22, 0, .93, 0, mats.walnut, .03); legs(g, 1.40, .96, .9); cylinder(g, .17, .12, .08, 0, 1.015, 0, '#ded3b9'); }
  if (kind === 'bed' || kind === 'single-bed') bed(g, kind === 'bed' ? 2.9 : 1.60, quilt);
  if (kind === 'shelf') {
    for (const x of [-.59, .59]) box(g, .065, 2.94, .63, x, 1.47, 0, mats.walnut);
    box(g, 1.25, 2.94, .06, 0, 1.47, -.28, mats.walnut);
    for (let row = 0; row < 5; row++) {
      const y = .05 + row * .70; box(g, 1.25, .055, .62, 0, y, 0, mats.walnut);
      if (row < 4) for (let i = 0; i < 6; i++) { const h = .34 + (i % 3) * .06; box(g, .11, h, .34, -.46 + i * .17, y + h / 2 + .028, .08, ['#d3c4a7', '#889583', '#b49371', '#dbd4bc', '#6d7e83', '#a88262'][i], .005); }
    }
    plant(g, 0, -.05, .37, 2.89);
  }
  if (kind === 'cabinet') {
    box(g, 1.78, 2.65, .67, 0, 1.325, 0, mats.walnut, .025);
    for (const x of [-.44, .44]) { box(g, .85, 2.48, .035, x, 1.34, .35, mats.walnut, .015); box(g, .023, .3, .04, x < 0 ? -.10 : .10, 1.31, .386, mats.brass, .006); }
  }
  if (kind === 'nightstand') {
    box(g, .69, .68, .69, 0, .34, 0, mats.walnut, .026);
    for (const y of [.22, .49]) { box(g, .61, .23, .02, 0, y, .356, mats.walnut, .007); box(g, .16, .014, .03, 0, y + .03, .377, mats.brass); }
    lamp(g, 0, -.06, .7, false, lights);
  }
  if (kind === 'console') {
    box(g, 2.53, .60, .51, 0, .39, 0, mats.walnut, .022); legs(g, 2.26, .34, .11);
    for (const x of [-.83, 0, .83]) { box(g, .78, .48, .022, x, .4, .267, mats.walnut, .008); box(g, .16, .012, .03, x, .51, .287, mats.brass); }
    screen(g, 0, 1.38, -.04, 1.98, 1.04); legs(g, .62, .12, .72, mats.metal);
  }
  if (kind === 'rug') box(g, 3.78, .021, 2.78, 0, .014, 0, rug, .025);
  if (kind === 'lamp') lamp(g, 0, 0, 0, true, lights);
  if (kind === 'plant' || kind === 'small-plant') plant(g, 0, 0, kind === 'plant' ? .75 : .48, 0);
  if (kind === 'rack') {
    cylinder(g, .035, .035, 1.96, 0, 1.05, 0, mats.walnut, 12);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; rod(g, [0, .22, 0], [Math.cos(a) * .30, .03, Math.sin(a) * .30], .034, mats.walnut); rod(g, [0, 1.58, 0], [Math.cos(a) * .27, 1.92, Math.sin(a) * .27], .025, mats.walnut); sphere(g, .038, Math.cos(a) * .27, 1.92, Math.sin(a) * .27, mats.walnut); }
  }
  mergeStatic(g); return g;
}
export function disposeFurniture(group) {
  group.traverse(object => {
    if (object.isMesh) object.geometry.dispose();
    if (object.isLight) { const index = lampLights.indexOf(object); if (index !== -1) lampLights.splice(index, 1); object.dispose(); }
  });
  group.userData.ownedMaterials?.forEach(material => material.dispose()); group.removeFromParent();
}
