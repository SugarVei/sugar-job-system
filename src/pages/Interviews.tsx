import { useEffect, useMemo, useRef, useState } from 'react';
import type { Interview, InterviewType, NewRecord } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import { Field, TextInput, TextArea, Select, PrimaryButton, GhostButton, FormError } from '../components/Field';
import { IconEdit, IconTrash, IconPlus, IconMapPin } from '../components/icons';
import { CARD } from '../lib/appHelpers';
import EmptyState from '../components/EmptyState';

const TYPES: InterviewType[] = ['电话', '视频', '现场'];
const START_HOUR = 9;
const END_HOUR = 21;
const HOUR_PX = 64;

const EVENT_COLORS = [
  { bg: '#ece8fb', bd: '#cfc6f2', ac: '#5a4fb0', sub: '#8076c4' },
  { bg: '#fbeec2', bd: '#ecd17e', ac: '#7a5a12', sub: '#9a7d2a' },
  { bg: '#dde8fb', bd: '#b3cbf0', ac: '#345b9a', sub: '#5c7fb5' },
  { bg: '#dcebd5', bd: '#b4d9ab', ac: '#2f5d36', sub: '#4a7a51' },
  { bg: '#fbe0d8', bd: '#f3b3a1', ac: '#a23d24', sub: '#bd6047' },
];

const empty: NewRecord<Interview> = {
  company_name: '',
  position_name: '',
  interview_time: '',
  round: '',
  interview_type: '视频',
  notes: '',
};

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtMD(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function parseDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
function toDateKey(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Interviews() {
  const { items, loading, create, update, remove } = useCollection<Interview>('interviews', {
    column: 'interview_time',
    ascending: true,
  });
  const { registerAdd, query, interviewDateFilter, setInterviewDateFilter } = useAppShell();
  const { theme } = useTheme();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Interview | null>(null);
  const [form, setForm] = useState<NewRecord<Interview>>(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [scrollSig, setScrollSig] = useState(0);
  const companyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    registerAdd(() => openCreate());
    return () => registerAdd(null);
  }, [registerAdd]);

  useEffect(() => {
    if (!interviewDateFilter) return;
    const d = parseDateKey(interviewDateFilter);
    if (d) setWeekStart(startOfWeek(d));
  }, [interviewDateFilter]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = addDays(weekStart, 6);
  const WD = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const focusDay = interviewDateFilter ? parseDateKey(interviewDateFilter) : null;

  const eventsByDay = useMemo(() => {
    const cols: { ev: Interview; date: Date }[][] = Array.from({ length: 7 }, () => []);
    items.forEach((ev) => {
      if (!ev.interview_time) return;
      if (query) {
        const q = query.toLowerCase();
        const hit = [ev.company_name, ev.position_name, ev.round, ev.notes]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q));
        if (!hit) return;
      }
      const dt = new Date(ev.interview_time);
      for (let i = 0; i < 7; i++) {
        if (sameDay(dt, weekDays[i])) cols[i].push({ ev, date: dt });
      }
    });
    return cols;
  }, [items, weekDays, query]);

  const dayList = useMemo(() => {
    if (!focusDay) return null;
    return items
      .filter((ev) => {
        if (!ev.interview_time) return false;
        if (!sameDay(new Date(ev.interview_time), focusDay)) return false;
        if (!query) return true;
        const q = query.toLowerCase();
        return [ev.company_name, ev.position_name, ev.round, ev.notes]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q));
      })
      .sort((a, b) => new Date(a.interview_time!).getTime() - new Date(b.interview_time!).getTime());
  }, [items, focusDay, query]);

  const openCreate = (prefill?: Date) => {
    setEditing(null);
    const next = { ...empty };
    if (prefill) {
      const p = (n: number) => String(n).padStart(2, '0');
      next.interview_time = `${prefill.getFullYear()}-${p(prefill.getMonth() + 1)}-${p(prefill.getDate())}T${p(prefill.getHours())}:${p(prefill.getMinutes())}`;
    }
    setForm(next);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (ev: Interview) => {
    setEditing(ev);
    setForm({
      company_name: ev.company_name,
      position_name: ev.position_name ?? '',
      interview_time: ev.interview_time ? toLocalInput(ev.interview_time) : '',
      round: ev.round ?? '',
      interview_type: ev.interview_type ?? '视频',
      notes: ev.notes ?? '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.company_name.trim()) {
      setFormError('「公司名称」为必填项，请补全后再保存。');
      setScrollSig((n) => n + 1);
      setTimeout(() => companyRef.current?.focus(), 320);
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        interview_time: form.interview_time ? new Date(form.interview_time).toISOString() : null,
      };
      if (editing) await update(editing.id, payload);
      else await create(payload);
      setModalOpen(false);
    } catch (e) {
      setFormError('保存失败：' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const del = async (ev: Interview) => {
    if (!confirm(`确定删除「${ev.company_name}」的面试吗？`)) return;
    await remove(ev.id);
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const today = new Date();

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ ...CARD, borderRadius: 18, padding: '14px 18px' }}>
        <div style={{ fontFamily: 'Poppins', fontSize: 15, fontWeight: 600 }}>
          {weekStart.getFullYear()}/{fmtMD(weekStart)} - {fmtMD(weekEnd)}
        </div>
        <div className="flex gap-2 flex-wrap">
          <GhostButton style={{ height: 38 }} onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ‹ 上一周
          </GhostButton>
          <PrimaryButton style={{ height: 38, padding: '0 16px' }} onClick={() => setWeekStart(startOfWeek(new Date()))}>
            本周
          </PrimaryButton>
          <GhostButton style={{ height: 38 }} onClick={() => setWeekStart(addDays(weekStart, 7))}>
            下一周 ›
          </GhostButton>
          <PrimaryButton accent={theme.accent} style={{ height: 38 }} onClick={() => openCreate()}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconPlus size={15} /> 新增
            </span>
          </PrimaryButton>
        </div>
      </div>

      {focusDay && (
        <div style={{ ...CARD, padding: '14px 18px', borderRadius: 18, border: '1px solid #d8e8d2', background: '#f4faf1' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 15 }}>
                {focusDay.getMonth() + 1} 月 {focusDay.getDate()} 日面试
              </div>
              <div style={{ fontSize: 12.5, color: '#6b665c', marginTop: 3 }}>
                来自总览日历 · 共 {dayList?.length ?? 0} 场
              </div>
            </div>
            <div className="flex gap-2">
              <GhostButton onClick={() => openCreate(new Date(focusDay.getFullYear(), focusDay.getMonth(), focusDay.getDate(), 10, 0))}>
                当天新增
              </GhostButton>
              <GhostButton onClick={() => setInterviewDateFilter(null)}>清除日期筛选</GhostButton>
            </div>
          </div>
          {dayList && dayList.length > 0 ? (
            <div className="flex flex-col gap-2" style={{ marginTop: 12 }}>
              {dayList.map((ev, idx) => {
                const col = EVENT_COLORS[idx % EVENT_COLORS.length];
                const t = new Date(ev.interview_time!);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => openEdit(ev)}
                    className="btn-press"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: `1px solid ${col.bd}`,
                      background: col.bg,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: col.ac }}>{ev.company_name} · {ev.round || '面试'}</div>
                      <div style={{ fontSize: 12.5, color: col.sub, marginTop: 3 }}>
                        {t.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        {ev.position_name ? ` · ${ev.position_name}` : ''}
                        {ev.interview_type ? ` · ${ev.interview_type}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: col.ac }}>编辑</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#8a8478', marginTop: 10 }}>这天还没有面试安排。</div>
          )}
        </div>
      )}

      {loading ? (
        <EmptyState text="加载中…" />
      ) : (
        <>
          {/* 桌面周网格 */}
          <div className="hidden md:block" style={{ ...CARD, borderRadius: 22, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(7,1fr)', borderBottom: '1px solid #f0ebe0' }}>
              <div style={{ padding: '14px 8px', fontSize: 12, color: '#a39d90' }}>时间</div>
              {weekDays.map((d, i) => {
                const isToday = sameDay(d, today);
                const isFocus = focusDay ? sameDay(d, focusDay) : false;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInterviewDateFilter(toDateKey(d))}
                    className="btn-press"
                    style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      border: 'none',
                      borderLeft: '1px solid #f4efe5',
                      background: isFocus ? '#e8f3e4' : isToday ? '#fff8e8' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: isToday ? theme.accent : '#1b1a17' }}>{WD[i]}</div>
                    <div style={{ fontSize: 11.5, color: '#a39d90', marginTop: 2 }}>{fmtMD(d)}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(7,1fr)', maxHeight: 520, overflowY: 'auto' }}>
              <div style={{ position: 'relative', height: (END_HOUR - START_HOUR) * HOUR_PX, borderRight: '1px solid #f0ebe0' }}>
                {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i).map((h) => (
                  <div
                    key={h}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: (h - START_HOUR) * HOUR_PX,
                      fontSize: 11,
                      color: '#a39d90',
                      transform: 'translateY(-6px)',
                    }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
              {weekDays.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  style={{
                    position: 'relative',
                    height: (END_HOUR - START_HOUR) * HOUR_PX,
                    borderLeft: '1px solid #f4efe5',
                    background: focusDay && sameDay(day, focusDay) ? 'rgba(220,235,213,.28)' : 'transparent',
                  }}
                >
                  {hours.map((h) => (
                    <div
                      key={h}
                      style={{ height: HOUR_PX, borderBottom: '1px solid #f5f0e7' }}
                      onDoubleClick={() => openCreate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0))}
                    />
                  ))}
                  {eventsByDay[dayIdx].map(({ ev, date }, idx) => {
                    const col = EVENT_COLORS[idx % EVENT_COLORS.length];
                    const hour = date.getHours() + date.getMinutes() / 60;
                    const top = Math.max(0, Math.min((END_HOUR - START_HOUR - 0.7) * HOUR_PX, (hour - START_HOUR) * HOUR_PX));
                    return (
                      <div
                        key={ev.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openEdit(ev)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') openEdit(ev);
                        }}
                        style={{
                          position: 'absolute',
                          left: 4,
                          right: 4,
                          top,
                          minHeight: 44,
                          background: col.bg,
                          border: `1.5px solid ${col.bd}`,
                          borderLeft: `3px solid ${col.ac}`,
                          borderRadius: 10,
                          padding: '6px 8px',
                          cursor: 'pointer',
                          zIndex: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: col.ac, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ev.company_name}
                        </div>
                        <div style={{ fontSize: 11, color: col.sub, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <IconMapPin size={10} />
                          {date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          {ev.round ? ` · ${ev.round}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 移动端列表 */}
          <div className="md:hidden" style={{ ...CARD, padding: 18, borderRadius: 18 }}>
            <div style={{ fontFamily: 'Poppins', fontWeight: 700, marginBottom: 12 }}>本周面试</div>
            {eventsByDay.flat().length === 0 ? (
              <EmptyState text="本周暂无面试，点右上角新增。" actionLabel="新增面试" onAction={() => openCreate()} />
            ) : (
              <div className="flex flex-col gap-2">
                {eventsByDay.flat().map(({ ev, date }, idx) => {
                  const col = EVENT_COLORS[idx % EVENT_COLORS.length];
                  return (
                    <div
                      key={ev.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: 12,
                        borderRadius: 13,
                        background: col.bg,
                        border: `1px solid ${col.bd}`,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: col.ac }}>{ev.company_name}</div>
                        <div style={{ fontSize: 12, color: col.sub, marginTop: 3 }}>
                          {fmtMD(date)} {date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          {ev.position_name ? ` · ${ev.position_name}` : ''}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-none">
                        <button type="button" aria-label="编辑" className="btn-press" onClick={() => openEdit(ev)} style={iconBtn}>
                          <IconEdit size={14} />
                        </button>
                        <button type="button" aria-label="删除" className="btn-press" onClick={() => void del(ev)} style={iconBtn}>
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        title={editing ? '编辑面试' : '新增面试'}
        onClose={() => setModalOpen(false)}
        scrollTopSignal={scrollSig}
        footer={
          <>
            {editing && (
              <GhostButton
                onClick={() => {
                  void del(editing);
                  setModalOpen(false);
                }}
                style={{ marginRight: 'auto', color: '#a23d24' }}
              >
                删除
              </GhostButton>
            )}
            <GhostButton onClick={() => setModalOpen(false)}>取消</GhostButton>
            <PrimaryButton accent={theme.accent} onClick={() => void save()} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </PrimaryButton>
          </>
        }
      >
        <FormError message={formError} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Field label="公司名称 *">
            <TextInput
              ref={companyRef}
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              placeholder="如：美团"
            />
          </Field>
          <Field label="岗位名称">
            <TextInput value={form.position_name ?? ''} onChange={(e) => setForm({ ...form, position_name: e.target.value })} placeholder="如：产品经理" />
          </Field>
          <Field label="面试时间">
            <TextInput type="datetime-local" value={form.interview_time ?? ''} onChange={(e) => setForm({ ...form, interview_time: e.target.value })} />
          </Field>
          <Field label="轮次">
            <TextInput value={form.round ?? ''} onChange={(e) => setForm({ ...form, round: e.target.value })} placeholder="如：一面 / HR面" />
          </Field>
          <Field label="形式">
            <Select value={form.interview_type ?? '视频'} onChange={(e) => setForm({ ...form, interview_type: e.target.value as InterviewType })}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="备注">
          <TextArea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="面试官、会议室、准备事项…" />
        </Field>
      </Modal>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: '1px solid #e4ddcf',
  background: '#fffdf8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#6b665c',
};
