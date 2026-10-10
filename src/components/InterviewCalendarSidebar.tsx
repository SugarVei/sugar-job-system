import type { Interview, InterviewType } from '../types';
import { IconPlus } from './icons';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const TYPES: InterviewType[] = ['电话', '视频', '现场'];
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfWeek = (date: Date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - (result.getDay() + 6) % 7);
  return result;
};

export default function InterviewCalendarSidebar({ month, weekStart, selectedDay, interviews, visibleCount, activeTypes, onMonthChange, onSelectDay, onToggleType, onCreate }: {
  month: Date;
  weekStart: Date;
  selectedDay: Date;
  interviews: Interview[];
  visibleCount: number;
  activeTypes: InterviewType[];
  onMonthChange: (offset: number) => void;
  onSelectDay: (day: Date) => void;
  onToggleType: (type: InterviewType) => void;
  onCreate: () => void;
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const calendarStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(day.getDate() + index);
    return day;
  });
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const lastRowStarts = startOfWeek(last);
  const shownDays = days.slice(0, sameDay(lastRowStarts, days[35]) ? 42 : 35);
  const eventDates = new Set(interviews.filter(item => item.interview_time).map(item => {
    const date = new Date(item.interview_time!);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return <aside className="interview-board-sidebar" aria-label="日历导航与筛选">
    <button className="interview-side-add" type="button" onClick={onCreate}><IconPlus size={16} /> 新增面试</button>
    <section className="interview-side-card">
      <div className="interview-month-head">
        <button type="button" onClick={() => onMonthChange(-1)} aria-label="上个月">‹</button>
        <strong>{month.getFullYear()} 年 {month.getMonth() + 1} 月</strong>
        <button type="button" onClick={() => onMonthChange(1)} aria-label="下个月">›</button>
      </div>
      <div className="interview-month-weekdays">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div>
      <div className="interview-month-dates">
        {shownDays.map(day => day.getMonth() === month.getMonth() ? <button key={day.toDateString()} type="button" onClick={() => onSelectDay(day)} className={`${day >= weekStart && day <= weekEnd ? 'is-week ' : ''}${sameDay(day, selectedDay) ? 'is-selected ' : ''}${sameDay(day, new Date()) ? 'is-today' : ''}`} aria-label={`选择${day.getMonth() + 1}月${day.getDate()}日`} aria-pressed={sameDay(day, selectedDay)}>
          {day.getDate()}{eventDates.has(`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`) && <i aria-hidden="true" />}
        </button> : <span key={day.toDateString()} aria-hidden="true" />)}
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
      <div className="interview-side-count"><strong>{visibleCount}</strong><span>场面试 · {weekStart.getMonth() + 1}/{weekStart.getDate()}–{weekEnd.getMonth() + 1}/{weekEnd.getDate()}</span></div>
    </section>
  </aside>;
}
