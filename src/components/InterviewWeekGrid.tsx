import { useState } from 'react';
import type { Interview } from '../types';
import Modal from './Modal';
import './InterviewWeekGrid.css';

type Entry = { ev: Interview; date: Date };
const SLOTS = [8, 10, 12, 14, 16, 18, 20];
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const time = (date: Date) => date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

export default function InterviewWeekGrid({ days, entries, onOpen, onCreate, onDay }: {
  days: Date[]; entries: Entry[][]; onOpen: (ev: Interview) => void;
  onCreate: (date: Date) => void; onDay: (date: Date) => void;
}) {
  const [expanded, setExpanded] = useState<{ dayIndex?: number; hour?: number; outside?: boolean } | null>(null);
  const today = new Date().toDateString();
  const outside = entries.flat().filter(({ date }) => date.getHours() < 8 || date.getHours() >= 22);
  const slotEntries = (day: number, hour: number) => entries[day]
    .filter(({ date }) => date.getHours() >= hour && date.getHours() < hour + 2)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const expandedEntries = expanded?.outside ? outside : expanded ? slotEntries(expanded.dayIndex!, expanded.hour!) : [];
  const title = expanded?.outside ? '其他时间的面试' : expanded ? `${days[expanded.dayIndex!].getMonth() + 1}/${days[expanded.dayIndex!].getDate()} · ${hourLabel(expanded.hour!)}–${hourLabel(expanded.hour! + 2)}` : '';
  return <>
    <section className="interview-week" aria-label="面试周日历">
      <div className="interview-week-head">
        <span>时间段</span>
        {days.map((day, index) => <button type="button" key={day.toISOString()} onClick={() => onDay(day)} className={day.toDateString() === today ? 'is-today' : ''}>
          <strong>{WEEKDAYS[index]}</strong><small>{day.getMonth() + 1}/{day.getDate()}</small>
        </button>)}
      </div>
      <div className="interview-week-body">
        {SLOTS.map(hour => <div className="interview-slot-row" key={hour}>
          <div className="interview-slot-label"><span>{hourLabel(hour)}</span><span>– {hourLabel(hour + 2)}</span></div>
          {days.map((day, index) => {
            const events = slotEntries(index, hour);
            return <div className="interview-slot" key={day.toISOString()} data-slot={`${index}-${hour}`} onDoubleClick={e => {
              if (e.target === e.currentTarget) onCreate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour));
            }}>
              {events.map(({ ev, date }) => <button type="button" key={ev.id} onClick={() => onOpen(ev)} className={`interview-slot-event tone-${index % 4}${events.length > 1 ? ' is-compact' : ''}`} title={`${ev.company_name} · ${time(date)} · ${ev.round || '面试'}`}>
                <strong>{ev.company_name}</strong><span>{time(date)} · {ev.round || '面试'}</span>
              </button>)}
            </div>;
          })}
        </div>)}
      </div>
      {outside.length > 0 && <button className="interview-outside" type="button" onClick={() => setExpanded({ outside: true })}>08:00 前 / 22:00 后另有 {outside.length} 场面试 · 点击查看</button>}
    </section>
    <Modal open={expanded !== null} title={title} onClose={() => setExpanded(null)}>
      <div className="interview-slot-details">
        {[...expandedEntries].sort((a, b) => a.date.getTime() - b.date.getTime()).map(({ ev, date }) => <button type="button" key={ev.id} onClick={() => { setExpanded(null); onOpen(ev); }}>
          <strong>{ev.company_name}</strong><span>{expanded?.outside ? `${date.getMonth() + 1}/${date.getDate()} ` : ''}{time(date)} · {ev.round || '面试'}{ev.position_name ? ` · ${ev.position_name}` : ''}</span>
        </button>)}
      </div>
    </Modal>
  </>;
}
