export const MIN_ELEVATION = 12;
export const MAX_ELEVATION = 85;
export const DEFAULT_AZIMUTH = Math.atan2(130, 180);
export const CAMERA_PRESETS = { low: 18, oblique: 38, overhead: 82 } as const;
export type CameraViewState = { elevation: number; autoTilt: boolean };

export function clampElevation(value: number) {
  return Math.max(MIN_ELEVATION, Math.min(MAX_ELEVATION, value));
}

// Relative to the viewport's overview zoom, so phones start at the same angle.
export function elevationForZoom(zoom: number, overviewZoom: number) {
  const stops = Math.log2(zoom / overviewZoom);
  return clampElevation(stops < 0
    ? CAMERA_PRESETS.oblique - Math.max(-2, stops) * 10
    : CAMERA_PRESETS.oblique - Math.min(3.4, stops) * (18 / 3.4));
}

export function shortestAngleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
