import * as T from 'three';

// Local deterministic textures keep the preview independent of external assets.
let seed = 4217;
export function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function texture(width, height, paint, repeat = [1, 1]) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(...repeat); map.anisotropy = 8;
  return map;
}
export const wood = texture(1024, 256, (ctx, w, h) => {
  ctx.fillStyle = '#e8d1ae'; ctx.fillRect(0, 0, w, h);
  for (let j = 0; j < 650; j++) {
    const y = random() * h; const amplitude = 1 + random() * 5;
    ctx.strokeStyle = `rgba(102,64,35,${.025 + random() * .075})`; ctx.lineWidth = .25 + random() * .8;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, y + Math.sin(x / 130 + j) * amplitude);
    ctx.stroke();
  }
  for (let k = 0; k < 9; k++) {
    const x = random() * w, y = random() * h;
    for (let j = 1; j < 7; j++) { ctx.strokeStyle = '#79553315'; ctx.beginPath(); ctx.ellipse(x, y, 12 + j * 9, 1 + j * 1.8, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
});
export const fabric = texture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#ece8df'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < w; i += 2) { ctx.strokeStyle = i % 4 ? '#5d514115' : '#ffffff55'; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
}, [3, 3]);
export const plaster = texture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#f5f1e8'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 12000; i++) { ctx.fillStyle = random() > .5 ? '#80735d0d' : '#ffffff35'; ctx.fillRect(random() * w, random() * h, 1, 1); }
}, [4, 4]);
export const rugTexture = texture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#e0d6c5'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 58000; i++) { ctx.fillStyle = ['#a89b8155', '#fef9e855', '#81766544'][i % 3]; ctx.fillRect(random() * w, random() * h, 1, 1 + random() * 3); }
  ctx.strokeStyle = '#b5a990'; ctx.lineWidth = 6; ctx.strokeRect(14, 14, w - 28, h - 28);
});
export const mats = {
  floor: new T.MeshStandardMaterial({ color: '#d2ac7d', map: wood, roughness: .56, bumpMap: wood, bumpScale: .014 }),
  walnut: new T.MeshStandardMaterial({ color: '#967451', map: wood, roughness: .55, bumpMap: wood, bumpScale: .012 }),
  wall: new T.MeshStandardMaterial({ color: '#ece3cf', map: plaster, roughness: .92, bumpMap: plaster, bumpScale: .018 }),
  cream: new T.MeshStandardMaterial({ color: '#efe5d2', map: fabric, roughness: .93, bumpMap: fabric, bumpScale: .022 }),
  quilt: new T.MeshStandardMaterial({ color: '#647387', map: fabric, roughness: .94, bumpMap: fabric, bumpScale: .02 }),
  rust: new T.MeshStandardMaterial({ color: '#ac643e', map: fabric, roughness: .92 }),
  metal: new T.MeshStandardMaterial({ color: '#303a3b', metalness: .55, roughness: .38 }),
  brass: new T.MeshStandardMaterial({ color: '#b29152', metalness: .65, roughness: .3 }),
  plinth: new T.MeshStandardMaterial({ color: '#323b42', roughness: .85 }),
  rug: new T.MeshStandardMaterial({ color: '#ded6c7', map: rugTexture, bumpMap: rugTexture, bumpScale: .045, roughness: 1 }),
  lamp: new T.MeshStandardMaterial({ color: '#ffebc7', map: fabric, emissive: '#ffbb61', emissiveIntensity: .7, roughness: .8 }),
};
const solidCache = new Map();
export function solid(color, roughness = .65) {
  const key = `${color}/${roughness}`;
  if (!solidCache.has(key)) solidCache.set(key, new T.MeshStandardMaterial({ color, roughness }));
  return solidCache.get(key);
}
