export type Triple = [number, number, number];
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const hue = (value: number) => (value % 360 + 360) % 360;
export function hexToRgb(hex: string): Triple {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255) as Triple;
}
const linear = (value: number) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
const gamma = (value: number) => value <= .0031308 ? 12.92 * value : 1.055 * Math.max(0, value) ** (1 / 2.4) - .055;
export function rgbToLab(rgb: Triple): Triple {
  const [r, g, b] = rgb.map(linear);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
function labToLinear([L, a, b]: Triple): Triple {
  const l = (L + .3963377774 * a + .2158037573 * b) ** 3;
  const m = (L - .1055613458 * a - .0638541728 * b) ** 3;
  const s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s];
}
const lchToLab = ([L, C, H]: Triple): Triple => [L, C * Math.cos(H * Math.PI / 180), C * Math.sin(H * Math.PI / 180)];
export function hexToLch(hex: string): Triple {
  const [L, a, b] = rgbToLab(hexToRgb(hex));
  const C = Math.hypot(a, b);
  return [L, C, C < .00001 ? 0 : hue(Math.atan2(b, a) * 180 / Math.PI)];
}
const inGamut = (rgb: Triple) => rgb.every(value => value >= -.0000001 && value <= 1.0000001);
export function lchToHex([L, C, H]: Triple): string {
  let rgb = labToLinear(lchToLab([clamp(L), Math.max(0, C), H]));
  if (!inGamut(rgb)) {
    let lo = 0, hi = Math.max(0, C);
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(labToLinear(lchToLab([clamp(L), mid, H])))) lo = mid; else hi = mid;
    }
    rgb = labToLinear(lchToLab([clamp(L), lo, H]));
  }
  return '#' + rgb.map(value => Math.round(clamp(gamma(value)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
const luminance = (hex: string) => hexToRgb(hex).map(linear).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
export function contrastRatio(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
