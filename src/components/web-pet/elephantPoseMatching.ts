export type PoseSample = { time: number; pixels: readonly number[] };

/** Wait at most 350 ms for a nearby compatible pose instead of cutting mid-step. */
export function chooseElephantExitTime(currentTime: number, duration: number, target: readonly number[], samples: readonly PoseSample[]) {
  const candidates = samples.filter(sample => sample.time >= currentTime && sample.time <= Math.min(currentTime + .35, duration - .3));
  if (!target.length || candidates.length < 2) return currentTime;
  const distance = (sample: PoseSample) => sample.pixels.length === target.length
    ? sample.pixels.reduce((sum, pixel, i) => sum + (pixel - target[i]) ** 2, 0) : Infinity;
  const first = distance(candidates[0]);
  let score = first, time = currentTime;
  for (const sample of candidates) {
    const candidate = distance(sample);
    if (candidate < score) { score = candidate; time = sample.time; }
  }
  return score < first * .8 ? time : currentTime;
}

/** A small luminance signature is sufficient for matching body/trunk silhouettes. */
export function chooseElephantEntryPose(current: readonly number[], samples: readonly PoseSample[]) {
  const distance = (sample: PoseSample) => sample.pixels.length === current.length
    ? sample.pixels.reduce((sum, pixel, i) => sum + (pixel - current[i]) ** 2, 0) : Infinity;
  if (!samples.length || !current.length) return 0;
  const initial = distance(samples[0]);
  let score = initial, time = 0;
  for (const sample of samples) {
    const candidate = distance(sample);
    if (candidate < score) { score = candidate; time = sample.time; }
  }
  // Don't introduce a seek for an insignificant visual improvement.
  return score < initial * .88 ? time : 0;
}

let catalog: Promise<Record<string, PoseSample[]>> | undefined;
export function loadElephantPoses() {
  return catalog ??= fetch('/pet/elephant-v4/pose-samples.json')
    .then(async response => {
      if (!response.ok) throw new Error('Pose catalog unavailable');
      const raw: Record<string, { time: number; pixels: string }[]> = await response.json();
      return Object.fromEntries(Object.entries(raw).map(([asset, poses]) => [asset,
        poses.map(pose => ({ time: pose.time, pixels: Array.from(atob(pose.pixels), value => value.charCodeAt(0)) }))]));
    }).catch(() => ({}));
}
