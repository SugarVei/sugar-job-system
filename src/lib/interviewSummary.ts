import type { Interview } from '../types';

/** Groups by scheduled start time, not completion status (which interviews do not store). */
export function groupInterviewsByTime<T extends Pick<Interview, 'interview_time'>>(interviews: readonly T[], now: number) {
  const dated = interviews.map((interview) => ({
    interview,
    time: interview.interview_time ? Date.parse(interview.interview_time) : NaN,
  }));
  return {
    past: dated.filter(({ time }) => Number.isFinite(time) && time < now)
      .sort((a, b) => b.time - a.time).map(({ interview }) => interview),
    upcoming: dated.filter(({ time }) => !Number.isFinite(time) || time >= now)
      .sort((a, b) => (Number.isFinite(a.time) ? a.time : Infinity) - (Number.isFinite(b.time) ? b.time : Infinity))
      .map(({ interview }) => interview),
  };
}
