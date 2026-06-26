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

// 事件配色循环（移植自原设计的 5 套）
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

/** 取某天所在周的周一 0 点 */
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // 周一=0
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

export default function Interviews() {
  const { items, loading, create, update, remove } = useCollection<Interview>('interviews', {
    column: 'interview_time',
    ascending: true,
  });
  const { registerAdd } = useAppShell();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerAdd]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = addDays(weekStart, 6);
  const WD = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  // 按天分组事件（仅本周、有时间的）
  const eventsByDay = useMemo(() => {
    const cols: { ev: Interview; date: Date }[][] = Array.from({ length: 7 }, () => []);
    items.forEach((ev) => {
      if (!ev.interview_time) return;
      const dt = new Date(ev.interview_time);
      for (let i = 0; i < 7; i++) {
        if (sameDay(dt, weekDays[i])) cols[i].push({ ev, date: dt });
      }
    });
    return cols;
  }, [items, weekDays]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setFormError('');
    setModalOpen(true);
  };
  const openEdit = (ev: Interview) => {
    setEditing(ev);
    setForm({
      company_name: ev.company_name,
      position_name: ev.position_name ?? '',
      // datetime-local 需要 'YYYY-MM-DDTHH:mm'
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
      setFormError('保存失败：' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (ev: Interview) => {
    if (!confirm(`确定删除「${ev.company_name}」的面试吗？`)) return;
    await remove(ev.id);
  };

  return (
    <div className="flex flex-col gap-[18px] animate-rise">
      {/* 周导航 */}
      <div
        className="flex items-center justify-between flex-wrap gap-3"
        style={{ ...CARD, borderRadius: 18, padding: '14px 18px' }}
      >
        <div style={{ fontFamily: 'Poppins', fontSize: 15, fontWeight: 600 }}>
          {weekStart.getFullYear()}/{fmtMD(weekStart)} - {fmtMD(weekEnd)}
        </div>
        <div className="flex gap-2">
          <GhostButton style={{ height: 38 }} onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ‹ 上一周
          </GhostButton>
          <PrimaryButton style={{ height: 38, padding: '0 16px' }} onClick={() => setWeekStart(startOfWeek(new Date()))}>
            本周
          </PrimaryButton>
          <GhostButton style={{ height: 38 }} onClick={() => setWeekStart(addDays(weekStart, 7))}>
            下一周 ›
          </GhostButton>
          <PrimaryButton accent={theme.accent} style={{ height: 38 }} onClick={openCreate}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconPlus size={15} /> 新增
            </span>
          </PrimaryButton>
        </div>
      </div>

      {/* ===== 桌面：周时间网格（md+） ===== */}
      <div className="hidden md:block" style={{ ...CARD, borderRadius: 22, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(7,1fr)', borderBottom: '1px solid #f0ebe0' }}>
          <div style={{ padding: '14px 8px', fontSize: 12, color: '#a39d90' }}>时间</div>
          {weekDays.map((d, i) => {
            const today = sameDay(d, new Date());
            return (
              <div key={i} style={{ padding: '12px 8px', textAlign: 'center', borderLeft: '1px solid #f4efe5' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: today ? theme.accent : '#1b1a17' }}>{WD[i]}</div>
                <div style={{ fontSize: 11.5, color: '#a39d90', marginTop: 2 }}>{fmtMD(d)}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(7,1fr)' }}>
          {/* 时间标签列 */}
          <div style={{ position: 'relative', height: (END_HOUR - START_HOUR) * HOUR_PX }}>
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
          {/* 7 天列 */}
          {eventsByDay.map((dayEvents, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                height: (END_HOUR - START_HOUR) * HOUR_PX,
                borderLeft: '1px solid #f4efe5',
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${HOUR_PX - 1}px, #f6f1e9 ${HOUR_PX - 1}px ${HOUR_PX}px)`,
              }}
            >
              {dayEvents.map(({ ev, date }, k) => {
                const c = EVENT_COLORS[(ev.company_name.charCodeAt(0) + k) % EVENT_COLORS.length];
                const minutes = (date.getHours() - START_HOUR) * 60 + date.getMinutes();
                const top = Math.max(0, (minutes / 60) * HOUR_PX);
                const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
                return (
                  <div
                    key={ev.id}
                    onClick={() => openEdit(ev)}
                    style={{
                      position: 'absolute',
                      left: 5,
                      right: 5,
                      top,
                      minHeight: 120,
                      background: c.bg,
                      border: `1px solid ${c.bd}`,
                      borderRadius: 14,
                      padding: '9px 11px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="flex items-center justify-between gap-[6px]">
                      <span style={{ display: 'inline-block', background: c.ac, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                        {ev.round || '面试'}
                      </span>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: c.sub }}>{timeStr}</span>
                    </div>
                    <div style={{ fontFamily: 'Poppins', fontSize: 13.5, fontWeight: 700, color: c.ac, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.company_name}
                    </div>
                    {ev.position_name && <div style={{ fontSize: 11.5, color: c.sub, marginTop: 1 }}>{ev.position_name}</div>}
                    <div style={{ fontSize: 10.5, color: c.sub, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconMapPin size={11} /> {ev.interview_type || '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ===== 手机：议程列表（< md） ===== */}
      <div className="md:hidden flex flex-col gap-3">
        {loading ? (
          <EmptyState text="加载中…" />
        ) : eventsByDay.every((d) => d.length === 0) ? (
          <EmptyState text="本周暂无面试安排" actionLabel="新增面试" onAction={openCreate} />
        ) : (
          weekDays.map((d, i) =>
            eventsByDay[i].length === 0 ? null : (
              <div key={i} style={{ ...CARD, padding: 16 }}>
                <div style={{ fontFamily: 'Poppins', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                  {WD[i]} · {fmtMD(d)}
                </div>
                <div className="flex flex-col gap-2">
                  {eventsByDay[i].map(({ ev, date }) => {
                    const c = EVENT_COLORS[ev.company_name.charCodeAt(0) % EVENT_COLORS.length];
                    return (
                      <div key={ev.id} style={{ background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 14, padding: '12px 14px' }}>
                        <div className="flex items-center justify-between">
                          <span style={{ background: c.ac, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                            {ev.round || '面试'}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: c.sub }}>
                            {date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        </div>
                        <div style={{ fontFamily: 'Poppins', fontWeight: 700, color: c.ac, marginTop: 6 }}>
                          {ev.company_name} {ev.position_name && `· ${ev.position_name}`}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span style={{ fontSize: 12, color: c.sub, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IconMapPin size={11} /> {ev.interview_type || '—'}
                          </span>
                          <span className="flex gap-2">
                            <button onClick={() => openEdit(ev)} aria-label="编辑" className="btn-press" style={miniBtn}>
                              <IconEdit size={13} />
                            </button>
                            <button onClick={() => del(ev)} aria-label="删除" className="btn-press" style={miniBtn}>
                              <IconTrash size={13} />
                            </button>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          )
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? '编辑面试' : '新增面试'}
        onClose={() => setModalOpen(false)}
        scrollTopSignal={scrollSig}
        footer={
          <>
            {editing && (
              <GhostButton onClick={() => { del(editing); setModalOpen(false); }} style={{ marginRight: 'auto', color: '#a23d24' }}>
                删除
              </GhostButton>
            )}
            <GhostButton onClick={() => setModalOpen(false)}>取消</GhostButton>
            <PrimaryButton accent={theme.accent} onClick={save} disabled={saving}>
              {saving ? '保存中…' : '保存'}
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
              style={!form.company_name.trim() && formError ? { borderColor: '#f0613f', background: '#fff' } : undefined}
            />
          </Field>
          <Field label="岗位">
            <TextInput value={form.position_name ?? ''} onChange={(e) => setForm({ ...form, position_name: e.target.value })} />
          </Field>
          <Field label="面试时间">
            <TextInput type="datetime-local" value={form.interview_time ?? ''} onChange={(e) => setForm({ ...form, interview_time: e.target.value })} />
          </Field>
          <Field label="面试轮次">
            <TextInput value={form.round ?? ''} onChange={(e) => setForm({ ...form, round: e.target.value })} placeholder="如 一面 / 二面 / HR面" />
          </Field>
        </div>
        <Field label="面试形式">
          <Select value={form.interview_type ?? '视频'} onChange={(e) => setForm({ ...form, interview_type: e.target.value as InterviewType })}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="备注">
          <TextArea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="会议链接、地点、面试官等" />
        </Field>
      </Modal>
    </div>
  );
}

/** ISO -> 本地 datetime-local 值 */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const miniBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 9,
  border: '1px solid rgba(0,0,0,0.08)',
  background: 'rgba(255,255,255,0.5)',
  color: '#5d584d',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};
