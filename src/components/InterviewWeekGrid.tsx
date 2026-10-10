import { useState } from 'react';
import type { Interview } from '../types';
import Modal from './Modal';
import './InterviewWeekGrid.css';

type Entry = { ev: Interview; date: Date };
const HOURS = Array.from({ length: 14 }, (_, index) => index + 8);
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const time = (date: Date) => date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
const offsetHours = -new Date().getTimezoneOffset() / 60;
const timezone = `GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`;

export default function InterviewWeekGrid({ days, entries, onOpen, onCreate, onDay }: {
  days: Date[]; entries: Entry[][]; onOpen: (ev: Interview) => void;
  onCreate: (date: Date) => void; onDay: (date: Date) => void;
}) {
  const [outsideOpen, setOutsideOpen] = useState(false);
  const today = new Date().toDateString();
  const outside = entries.flat().filter(({ date }) => date.getHours() < 8 || date.getHours() >= 22);
  const slotEntries = (day: number, hour: number) => entries[day]
    .filter(({ date }) => date.getHours() === hour)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return <>
    <section className="interview-week" aria-label="面试周日历">
      <div className="interview-week-head">
        <div className="interview-timezone"><span>时间</span><strong>{timezone}</strong></div>
        {days.map((day, index) => <button type="button" key={day.toDateString()} onClick={() => onDay(day)} className={`interview-day-chip${day.toDateString() === today ? ' is-today' : ''}`} aria-label={`查看${day.getMonth() + 1}月${day.getDate()}日面试`}>
          <span>{WEEKDAYS[index]}</span><strong>{day.getDate()}</strong>
        </button>)}
      </div>
      <div className="interview-week-scroll">
        {HOURS.map(hour => {
          const busiest = Math.max(...days.map((_, index) => slotEntries(index, hour).length));
          return <div className="interview-hour-row" key={hour} style={{ minHeight: Math.max(112, busiest * 54 + 10) }}>
            <div className="interview-hour-label">{hourLabel(hour)}</div>
            {days.map((day, index) => {
              const events = slotEntries(index, hour);
              return <div className="interview-hour-cell" key={day.toDateString()} onDoubleClick={event => {
                if (event.target === event.currentTarget) onCreate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour));
              }} title="双击空白处新增面试">
                {events.map(({ ev, date }, eventIndex) => <button type="button" key={ev.id} onClick={() => onOpen(ev)} className={`interview-event-card tone-${(index + eventIndex) % 5}${events.length > 1 ? ' is-compact' : ''}`} title={`${ev.company_name} · ${time(date)} · ${ev.round || '面试'}`}>
                  <span className="interview-event-avatar" aria-hidden="true">{ev.company_name.trim().slice(0, 1) || '面'}</span>
                  <span className="interview-event-copy">
                    <strong>{ev.company_name}</strong>
                    <span>{ev.position_name || ev.round || '面试'}</span>
                    <small>{time(date)} · {ev.round || ev.interview_type || '面试'}</small>
                  </span>
                </button>)}
              </div>;
            })}
          </div>;
        })}
      </div>
      {outside.length > 0 && <button className="interview-outside" type="button" onClick={() => setOutsideOpen(true)}>08:00 前 / 22:00 后另有 {outside.length} 场面试 · 点击查看</button>}
    </section>
    <Modal open={outsideOpen} title="其他时间的面试" onClose={() => setOutsideOpen(false)}>
      <div className="interview-slot-details">
        {[...outside].sort((a, b) => a.date.getTime() - b.date.getTime()).map(({ ev, date }) => <button type="button" key={ev.id} onClick={() => { setOutsideOpen(false); onOpen(ev); }}>
          <strong>{ev.company_name}</strong><span>{date.getMonth() + 1}/{date.getDate()} {time(date)} · {ev.round || '面试'}{ev.position_name ? ` · ${ev.position_name}` : ''}</span>
        </button>)}
      </div>
    </Modal>
  </>;
}
