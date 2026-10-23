import type { DateTime } from 'luxon';
import { interviewDate } from '../lib/interviewCalendar';
import type { Interview, InterviewType } from '../types';
import { IconPlus } from './icons';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const TYPES: InterviewType[] = ['电话', '视频', '现场'];
const sameDay = (a: DateTime, b: DateTime) => a.hasSame(b, 'day');
const startOfWeek = (date: DateTime) => date.startOf('week');

export default function InterviewCalendarSidebar({ month, weekStart, selectedDay, interviews, visibleCount, activeTypes, onMonthChange, onSelectDay, onToggleType, onCreate }: {
  month: DateTime;
  weekStart: DateTime;
  selectedDay: DateTime;
  interviews: Interview[];
  visibleCount: number;
  activeTypes: InterviewType[];
  onMonthChange: (offset: number) => void;
  onSelectDay: (day: DateTime) => void;
  onToggleType: (type: InterviewType) => void;
  onCreate: () => void;
}) {
  const first = month.startOf('month');
  const calendarStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, index) => {
    return calendarStart.plus({ days: index });
  });
  const last = month.endOf('month');
  const lastRowStarts = startOfWeek(last);
  const shownDays = days.slice(0, sameDay(lastRowStarts, days[35]) ? 42 : 35);
  const eventDates = new Set(interviews.filter(item => item.interview_time).map(item => {
    return interviewDate(item.interview_time!).toISODate();
  }));
  const weekEnd = weekStart.plus({ days: 6 });
  const today = interviewDate();

  return <aside className="interview-board-sidebar" aria-label="日历导航与筛选">
    <button className="interview-side-add" type="button" onClick={onCreate}><IconPlus size={16} /> 新增面试</button>
    <section className="interview-side-card">
      <div className="interview-month-head">
        <button type="button" onClick={() => onMonthChange(-1)} aria-label="上个月">‹</button>
        <strong>{month.year} 年 {month.month} 月</strong>
        <button type="button" onClick={() => onMonthChange(1)} aria-label="下个月">›</button>
      </div>
      <div className="interview-month-weekdays">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div>
      <div className="interview-month-dates">
        {shownDays.map(day => day.month === month.month ? <button key={day.toISODate()!} type="button" onClick={() => onSelectDay(day)} className={`${day >= weekStart && day <= weekEnd ? 'is-week ' : ''}${sameDay(day, selectedDay) ? 'is-selected ' : ''}${sameDay(day, today) ? 'is-today' : ''}`} aria-label={`选择${day.month}月${day.day}日`} aria-pressed={sameDay(day, selectedDay)}>
          {day.day}{eventDates.has(day.toISODate()) && <i aria-hidden="true" />}
        </button> : <span key={day.toISODate()!} aria-hidden="true" />)}
      </div>
    </section>
    <section className="interview-side-card">
      <h3>我的面试</h3>
      {TYPES.map(type => <button className={`interview-type-option${activeTypes.includes(type) ? ' is-active' : ''}`} key={type} type="button" onClick={() => onToggleType(type)} aria-pressed={activeTypes.includes(type)}>
        <span className="check">{activeTypes.includes(type) ? '✓' : ''}</span><span>{type}面试</span>
        <small>{interviews.filter(item => item.interview_type === type).length}</small>
      </button>)}
    </section>
    <section className="interview-side-card">
      <h3>本周安排</h3>
      <div className="interview-side-count"><strong>{visibleCount}</strong><span>场面试 · {weekStart.month}/{weekStart.day}–{weekEnd.month}/{weekEnd.day}</span></div>
    </section>
  </aside>;
}
