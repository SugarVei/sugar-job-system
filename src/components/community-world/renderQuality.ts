export type WorldRenderQuality = 'adaptive' | 'high' | 'ultra';

// Bound the drawing buffer by pixel count as well as the GPU's texture limit.
// 4K mode renders 3840 × 2160 at a 1920 × 1080 desktop viewport.
export function worldPixelRatio(quality: WorldRenderQuality, width: number, height: number, deviceRatio: number, maxSize: number) {
  if (quality === 'adaptive') return Math.min(deviceRatio, 1);
  const budget = quality === 'ultra' ? 3840 * 2160 : 2560 * 1440;
  const maxRatio = width < 700 ? 2 : 3;
  const desired = quality === 'ultra' ? Math.sqrt(budget / (width * height)) : Math.max(1.5, Math.min(deviceRatio, 2));
  return Math.min(maxRatio, desired, Math.sqrt(budget / (width * height)), maxSize / width, maxSize / height);
}
