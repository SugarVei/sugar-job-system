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
import { IMPORTED_EXPERIENCE_ARTICLES } from '../data/interviewExperienceData';

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

type ExperienceCategory = 'common' | 'company';

export interface ExperienceArticle {
  id: string;
  category: ExperienceCategory;
  group: string;
  title: string;
  company?: string;
  role?: string;
  intent: string;
  keyPoints: string[];
  answer: string;
  source: string;
}

const CURATED_EXPERIENCE_ARTICLES: ExperienceArticle[] = [
  {
    id: 'common-06', category: 'common', group: '基础信息类', title: '你有哪些兴趣爱好？',
    intent: '了解你的性格特点、生活状态，以及兴趣是否能体现持续投入和自我管理能力。',
    keyPoints: ['选择真实且稳定的兴趣', '说明兴趣带来的具体能力或收获', '自然连接到工作中的状态和习惯'],
    answer: '我主要的兴趣爱好是读书和跑步。读书让我保持对新知识的好奇心，拓展视野，也提高了我的思维能力和表达能力。我特别喜欢读管理学和心理学方面的书，这对我理解人际关系和团队合作很有帮助。跑步则让我保持良好的身体状态和意志品质，准备马拉松的过程中，我学会了制定计划、坚持目标、克服困难。这些兴趣不仅丰富了我的生活，也培养了我的自律性和持续学习能力。',
    source: '《校招面试通用常见问题及参考答案》· 个人能力类',
  },
  {
    id: 'common-01', category: 'common', group: '基础信息类', title: '请简单介绍一下自己',
    intent: '判断表达是否清晰，并快速确认你的经历、能力与目标岗位的匹配度。',
    keyPoints: ['控制在 1-2 分钟', '按经历、能力、岗位匹配组织', '用具体经历代替空泛形容词'],
    answer: '可以按照“我是谁—做过什么—为什么适合这个岗位”的顺序展开。先用一句话交代学校和专业，再挑选与岗位最相关的实习或项目，说明自己承担的工作和结果，最后补充希望在目标岗位继续发挥和提升的能力。',
    source: '《校招面试通用常见问题及参考答案》· 基础信息类',
  },
  {
    id: 'common-08', category: 'common', group: '个人能力类', title: '请描述一个你解决过的困难或挑战',
    intent: '考查面对困难时的分析、行动和复盘能力，而不是只听一个“我很努力”的故事。',
    keyPoints: ['交代困难发生的背景', '突出你采取的关键行动', '说明结果和之后的改进'],
    answer: '建议用 STAR 结构回答：先说清楚当时的任务和限制，再说明你如何拆解问题、协调资源并推进执行，最后给出结果。不要只描述团队做了什么，要明确自己的判断、动作和贡献。',
    source: '《校招面试通用常见问题及参考答案》· 个人能力类',
  },
  {
    id: 'common-13', category: 'common', group: '岗位认知类', title: '你为什么选择我们公司？',
    intent: '了解你是否真的研究过公司，以及求职动机是否稳定、具体。',
    keyPoints: ['先谈公司业务或产品的具体观察', '再谈岗位和个人经历的匹配', '最后说明希望获得的成长'],
    answer: '不要只说“公司平台大、发展好”。可以结合公司近期业务、产品体验或行业位置，说明你观察到的具体特点，再联系自己的项目、实习和能力，解释为什么这个岗位是自然的下一步。',
    source: '《校招面试通用常见问题及参考答案》· 岗位认知类',
  },
  {
    id: 'company-meituan', category: 'company', group: '产品与运营', title: '美团产品运营一面', company: '美团', role: '产品运营',
    intent: '围绕简历深挖经历，判断候选人的业务理解、团队协作和自我认知。',
    keyPoints: ['简历中的每一个数字都要能解释', '准备团队合作和问题解决的真实例子', '提前梳理 Python、SQL 等简历关键词'],
    answer: '这场面试重点不是背标准答案，而是把简历上的项目讲完整：背景是什么、你负责什么、怎么做、结果如何、如果重来会怎么改。涉及岗位要求的技能，即使使用不深，也要诚实说明学习路径和当前能完成的任务。',
    source: '《面经分享》· 美团产品运营一面',
  },
  {
    id: 'company-didi', category: 'company', group: '产品与运营', title: '滴滴产品与用户运营岗', company: '滴滴', role: '产品与用户运营',
    intent: '考查场景分析、用户调研和数据分析之间的关系，以及临场表达能力。',
    keyPoints: ['先定义问题和目标指标', '区分问卷调研与后台数据的作用', '回答卡顿时先复述问题，再分步骤作答'],
    answer: '例如单品销量下降，可以先拆成流量、转化、复购和供给几个环节，再结合后台数据定位问题，必要时用问卷或访谈补充用户动机。回答时要说明为什么选择这个方法，以及如何验证结论。',
    source: '《面经分享》· 滴滴产品与用户运营岗',
  },
  {
    id: 'company-mihoyo', category: 'company', group: '游戏与用户增长', title: '米哈游用户增长运营一面', company: '米哈游', role: '用户增长运营',
    intent: '考查用户增长、活动指标、内容策划和游戏行业理解。',
    keyPoints: ['准备一个熟悉地区或用户群的内容方案', '明确活动目标和衡量指标', '把实习经历中的产出讲出因果关系'],
    answer: '回答增长类问题时，可以从目标用户、触达渠道、转化路径和留存机制展开，再补充如何通过数据判断活动是否有效。重点是让面试官看到你会提出假设、设计动作并验证结果。',
    source: '《面经分享》· 米哈游用户增长运营一面',
  },
  {
    id: 'company-netease', category: 'company', group: '游戏与用户增长', title: '网易游戏用户运营', company: '网易游戏', role: '用户运营',
    intent: '了解你对游戏用户、运营指标和用户长期留存的理解。',
    keyPoints: ['从用户需求而非单纯活动数量出发', '能说清关注的核心指标', '结合实际游戏体验表达判断'],
    answer: '可以围绕新增、活跃、留存、付费和内容参与度建立指标框架，并说明不同阶段的重点不同。面对“如何持续吸引用户”，要同时考虑内容更新、社群反馈和用户分层运营。',
    source: '《面经分享》· 网易游戏用户运营',
  },
];

const EXPERIENCE_ARTICLES: ExperienceArticle[] = [...CURATED_EXPERIENCE_ARTICLES, ...IMPORTED_EXPERIENCE_ARTICLES];

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

function ModuleToggle({ active, onChange }: { active: 'calendar' | 'experience'; onChange: (next: 'calendar' | 'experience') => void }) {
  return (
    <div style={{ display: 'inline-flex', padding: 3, gap: 3, borderRadius: 11, background: '#fffdf8', border: '1px solid #e6dfd3', boxShadow: '0 3px 12px rgba(80,60,35,.04)' }}>
      {([
        ['calendar', '面试日历'],
        ['experience', '面试经验分享'],
      ] as const).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          style={{
            height: 30,
            padding: '0 13px',
            border: 'none',
            borderRadius: 8,
            background: active === key ? '#1b1a17' : 'transparent',
            color: active === key ? '#fffdf8' : '#6b665c',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ExperienceShare() {
  const [category, setCategory] = useState<ExperienceCategory>('common');
  const [selectedId, setSelectedId] = useState('common-06');
  const articles = EXPERIENCE_ARTICLES.filter((article) => article.category === category);
  const selected = EXPERIENCE_ARTICLES.find((article) => article.id === selectedId && article.category === category) ?? articles[0];

  if (!selected) return null;

  const switchCategory = (next: ExperienceCategory) => {
    setCategory(next);
    setSelectedId(EXPERIENCE_ARTICLES.find((article) => article.category === next)?.id ?? '');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[308px_minmax(0,1fr)] gap-[18px] min-h-0 flex-1" style={{ height: '100%' }}>
      <aside style={{ ...CARD, borderRadius: 20, overflow: 'hidden', minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid #eee6da' }}>
          <div style={{ fontSize: 12, color: '#a65a3c', fontWeight: 700, letterSpacing: '.03em' }}>资料目录</div>
          <div style={{ fontSize: 18, fontWeight: 750, marginTop: 7 }}>{category === 'common' ? '通用问题导航' : '公司岗位导航'}</div>
          <div style={{ color: '#8a8478', fontSize: 12.5, marginTop: 5 }}>{category === 'common' ? '整理面试中高频出现的问题' : '按公司和岗位整理真实面经'}</div>
        </div>
        <div className="grid grid-cols-2 gap-2" style={{ padding: 12, borderBottom: '1px solid #eee6da' }}>
          {([
            ['common', '通用常见问题分享'],
            ['company', '特定公司岗位问题'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => switchCategory(key)}
              style={{
                minHeight: 42,
                padding: '0 10px',
                borderRadius: 10,
                border: `1px solid ${category === key ? '#cbdcc7' : '#e6dfd3'}`,
                background: category === key ? '#edf6ea' : '#fffdf8',
                color: category === key ? '#355d3d' : '#6b665c',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ padding: '14px 10px 18px', flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {Array.from(new Set(articles.map((article) => article.group))).map((group) => (
            <div key={group} style={{ marginBottom: 14 }}>
              <div style={{ padding: '0 10px 6px', color: '#8a8478', fontSize: 12, fontWeight: 700 }}>{group}</div>
              {articles.filter((article) => article.group === group).map((article, index) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => setSelectedId(article.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    gap: 9,
                    alignItems: 'flex-start',
                    padding: '10px 10px',
                    border: 'none',
                    borderLeft: `2px solid ${selected.id === article.id ? '#e96545' : 'transparent'}`,
                    borderRadius: '0 10px 10px 0',
                    background: selected.id === article.id ? '#fff6f1' : 'transparent',
                    color: selected.id === article.id ? '#3d302b' : '#756f65',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    lineHeight: 1.45,
                  }}
                >
                  <span style={{ color: selected.id === article.id ? '#e96545' : '#aaa397', fontWeight: 800, flex: 'none' }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{article.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <article style={{ ...CARD, borderRadius: 20, padding: '34px clamp(22px, 4vw, 42px)', minHeight: 0, height: '100%', overflowY: 'hidden' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span style={{ display: 'inline-flex', padding: '7px 11px', borderRadius: 9, background: '#edf5eb', color: '#52705a', fontSize: 12, fontWeight: 700 }}>
              {selected.group}
            </span>
            <h2 style={{ fontSize: 'clamp(25px, 3vw, 34px)', lineHeight: 1.2, margin: '20px 0 0', letterSpacing: '-.03em' }}>{selected.title}</h2>
            {selected.company && <div style={{ color: '#8a8478', fontSize: 13, marginTop: 9 }}>{selected.company} · {selected.role}</div>}
          </div>
          <div style={{ color: '#a39d90', fontSize: 12, fontWeight: 700, paddingTop: 5 }}>{category === 'common' ? '通用问题' : '公司岗位面经'}</div>
        </div>

        {selected.intent && <section style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#2c312e', fontWeight: 750, fontSize: 16 }}>
            <span style={{ color: '#ed6548', fontSize: 12, fontWeight: 800 }}>01</span> 面试官考查意图
          </div>
          <p style={{ color: '#5e5a52', fontSize: 14, lineHeight: 1.85, margin: '12px 0 0' }}>{selected.intent}</p>
        </section>}

        {selected.keyPoints.length > 0 && <section style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#456b4c', fontWeight: 750, fontSize: 16 }}>
            <span style={{ color: '#ed6548', fontSize: 12, fontWeight: 800 }}>02</span> 回答思路要点
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 13 }}>
            {selected.keyPoints.map((point) => <div key={point} style={{ display: 'flex', gap: 9, color: '#5e5a52', fontSize: 13.5, lineHeight: 1.7 }}><span style={{ color: '#ed6548', fontWeight: 800 }}>•</span>{point}</div>)}
          </div>
        </section>}

        <section style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#456b4c', fontWeight: 750, fontSize: 16 }}>
            <span style={{ color: '#ed6548', fontSize: 12, fontWeight: 800 }}>{selected.intent ? '03' : '01'}</span> {selected.intent ? '参考回答' : '面经记录'}
          </div>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: 13, padding: '18px 20px', border: '1px solid #f1d4c9', borderLeft: '4px solid #ed6548', borderRadius: 14, background: '#fffaf7', color: '#5e514b', fontSize: 14, lineHeight: 1.9 }}>
            {selected.answer}
          </div>
        </section>

      </article>
    </div>
  );
}

export default function Interviews() {
  const { items, loading, create, update, remove } = useCollection<Interview>('interviews', {
    column: 'interview_time',
    ascending: true,
  });
  const { registerAdd, query, interviewDateFilter, setInterviewDateFilter, setHeaderChrome } = useAppShell();
  const { theme } = useTheme();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Interview | null>(null);
  const [form, setForm] = useState<NewRecord<Interview>>(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [scrollSig, setScrollSig] = useState(0);
  const [activeModule, setActiveModule] = useState<'calendar' | 'experience'>('calendar');
  const companyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    registerAdd(() => openCreate());
    return () => registerAdd(null);
  }, [registerAdd]);

  useEffect(() => {
    setHeaderChrome({
      searchPlaceholder: activeModule === 'calendar' ? '搜索公司、岗位…' : null,
      showAdd: activeModule === 'calendar',
      contentScroll: activeModule === 'calendar',
      inlineContent: <ModuleToggle active={activeModule} onChange={setActiveModule} />,
    });
    return () => setHeaderChrome(null);
  }, [activeModule, setHeaderChrome]);

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
    <div className="flex flex-col gap-[18px] animate-rise" style={activeModule === 'experience' ? { height: '100%', minHeight: 0, overflow: 'hidden' } : undefined}>
      {activeModule === 'experience' ? <ExperienceShare /> : <>
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
      </>}
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
