import type { Application, ApplicationStatus } from '../types';

export type TrendPreset = 'week' | 'previousWeek' | 'twoWeeks' | 'fourWeeks' | 'month' | 'previousMonth' | 'threeMonths' | 'sixMonths' | 'custom';
export type TrendRange = { start: string; end: string; unit: 'day' | 'week' | 'month' };

const calendarSpan = (start: Date, end: Date) => (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000 + 1;

export function trendDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return trendDateKey(date) === value ? date : null;
}

export function resolveTrendRange(preset: TrendPreset, now = new Date(), custom?: { start: string; end: string }): TrendRange | null {
  if (preset === 'custom') {
    const start = calendarDate(custom?.start ?? '');
    const end = calendarDate(custom?.end ?? '');
    if (!start || !end || start > end) return null;
    // UTC calendar arithmetic measures day counts across daylight-saving changes.
    const span = calendarSpan(start, end);
    return { start: custom!.start, end: custom!.end, unit: span <= 31 ? 'day' : span <= 120 ? 'week' : 'month' };
  }
  const year = now.getFullYear();
  const month = now.getMonth();
  if (['month', 'previousMonth', 'threeMonths', 'sixMonths'].includes(preset)) {
    const offset = preset === 'previousMonth' ? 1 : 0;
    const months = preset === 'threeMonths' ? 3 : preset === 'sixMonths' ? 6 : 1;
    return {
      start: trendDateKey(new Date(year, month - offset - months + 1, 1)),
      end: trendDateKey(new Date(year, month - offset + 1, 0)),
      unit: months === 1 ? 'day' : 'month',
    };
  }
  const offset = preset === 'previousWeek' ? 7 : 0;
  const weeks = preset === 'twoWeeks' ? 2 : preset === 'fourWeeks' ? 4 : 1;
  const monday = now.getDate() - (now.getDay() + 6) % 7 - offset;
  return {
    start: trendDateKey(new Date(year, month, monday - (weeks - 1) * 7)),
    end: trendDateKey(new Date(year, month, monday + 6)),
    unit: weeks === 4 ? 'week' : 'day',
  };
}

export function buildApplicationTrend(applications: Application[], range: TrendRange, now = new Date(), status: ApplicationStatus | null = null) {
  const start = calendarDate(range.start);
  const end = calendarDate(range.end);
  if (!start || !end || start > end) return [];
  const today = trendDateKey(now);
  const bucketKey = (date: Date) => range.unit === 'month'
    ? trendDateKey(new Date(date.getFullYear(), date.getMonth(), 1))
    : range.unit === 'week'
      ? trendDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - (date.getDay() + 6) % 7))
      : trendDateKey(date);
  const counts = new Map<string, number>();
  for (const application of applications) {
    if (application.status === '待投递' || (status && application.status !== status)) continue;
    const key = application.apply_date?.slice(0, 10);
    if (!key || key < range.start || key > range.end || key > today) continue;
    const date = calendarDate(key);
    if (!date) continue;
    const bucket = bucketKey(date);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  const short = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
  const full = (date: Date) => trendDateKey(date).replace(/-/g, '/');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const isSingleWeek = range.unit === 'day' && calendarSpan(start, end) <= 7;
  const points = [];
  let cursor = start;
  while (cursor <= end) {
    const next = range.unit === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + (range.unit === 'week' ? 7 - (cursor.getDay() + 6) % 7 : 1));
    const bucketEnd = new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1);
    const last = bucketEnd > end ? end : bucketEnd;
    const key = trendDateKey(cursor);
    const label = range.unit === 'month' ? (start.getFullYear() === end.getFullYear() ? `${cursor.getMonth() + 1}月` : `${cursor.getFullYear()}/${cursor.getMonth() + 1}`)
      : isSingleWeek ? weekdays[cursor.getDay()] : short(cursor);
    points.push({ key, endKey: trendDateKey(last), label, dateLabel: key === trendDateKey(last) ? full(cursor) : `${full(cursor)} — ${full(last)}`, count: counts.get(bucketKey(cursor)) ?? 0, future: key > today });
    cursor = next;
  }
  return points;
}
