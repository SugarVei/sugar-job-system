export function moveInterviewToHour(currentTime: string, targetDay: Date, hour: number): string {
  const current = new Date(currentTime);
  if (Number.isNaN(current.getTime()) || Number.isNaN(targetDay.getTime()) || hour < 8 || hour > 20) {
    throw new Error('面试时间无效，无法拖动改期。');
  }

  return new Date(
    targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), hour,
    current.getMinutes(), current.getSeconds(), current.getMilliseconds(),
  ).toISOString();
}
