/** Keep the render deadline separate from actual simulation time on high-refresh screens. */
export class RenderCadence {
  private readonly intervalMs: number;
  private nextDeadline: number | null = null;
  private previousAccepted: number | null = null;
  // RAF timestamps can differ slightly from an exact refresh interval.
  private readonly toleranceMs = 0.1;

  constructor(targetFps = 60) {
    if (!Number.isFinite(targetFps) || targetFps <= 0) throw new RangeError('targetFps must be positive');
    this.intervalMs = 1000 / targetFps;
  }

  /** null skips this callback; an accepted callback returns its real elapsed milliseconds. */
  accept(timestampMs: number): number | null {
    if (!Number.isFinite(timestampMs)) return null;
    if (this.previousAccepted === null || this.nextDeadline === null || timestampMs < this.previousAccepted) {
      this.previousAccepted = timestampMs;
      this.nextDeadline = timestampMs + this.intervalMs;
      return 0;
    }
    if (timestampMs + this.toleranceMs < this.nextDeadline) return null;

    const elapsed = timestampMs - this.previousAccepted;
    this.previousAccepted = timestampMs;
    if (elapsed >= 250) {
      // Resume with one frame, not a backlog of frames after a hidden tab or a stall.
      this.nextDeadline = timestampMs + this.intervalMs;
    } else {
      // Carry the original phase, skipping missed deadlines without accumulating drift.
      const intervals = Math.floor((timestampMs + this.toleranceMs - this.nextDeadline) / this.intervalMs) + 1;
      this.nextDeadline += intervals * this.intervalMs;
    }
    return elapsed;
  }
}
