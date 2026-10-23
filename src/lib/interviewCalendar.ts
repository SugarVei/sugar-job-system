import { DateTime } from 'luxon';

export const INTERVIEW_TIME_ZONE = 'Asia/Shanghai';

/** Calendar dates and form inputs always use Beijing time, independently of the device. */
export function interviewDate(value?: string): DateTime {
  return value === undefined
    ? DateTime.now().setZone(INTERVIEW_TIME_ZONE)
    : DateTime.fromISO(value, { zone: INTERVIEW_TIME_ZONE });
}

export function interviewTimeInput(value: string): string {
  const date = interviewDate(value);
  return date.isValid ? date.toFormat("yyyy-MM-dd'T'HH:mm") : '';
}

export function interviewInputToISO(value: string): string {
  const date = interviewDate(value);
  if (!date.isValid) throw new Error('面试时间无效，请重新选择。');
  return date.toUTC().toISO()!;
}

export function moveInterviewToHour(currentTime: string, targetDay: DateTime, hour: number): string {
  const current = interviewDate(currentTime);
  if (!current.isValid || !targetDay.isValid || !Number.isInteger(hour) || hour < 8 || hour > 20) {
    throw new Error('面试时间无效，无法拖动改期。');
  }

  return targetDay.setZone(INTERVIEW_TIME_ZONE).set({
    hour, minute: current.minute, second: current.second, millisecond: current.millisecond,
  }).toUTC().toISO()!;
}
