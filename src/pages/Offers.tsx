import { useEffect, useMemo, useState } from 'react';
import type { Application, NewOffer, Offer, OfferStatus } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import { Field, FormError, GhostButton, PrimaryButton, Select, TextArea, TextInput } from '../components/Field';
import EmptyState from '../components/EmptyState';
import { CARD } from '../lib/appHelpers';
import AIRecordImporter, { type OfferExtraction } from '../components/AIRecordImporter';

const blank: NewOffer = {
  application_id: null, company_name: '', position_name: '', city: '', department: '', manager_or_contact: '',
  workplace: '', work_schedule: '', join_date: null, reply_deadline: null, offer_status: '待考虑',
  base_salary: null, salary_months: 12, bonus: null, subsidy: null, annual_package: null, social_security: '',
  housing_fund: '', stock_or_options: '', probation_months: null, probation_ratio: null, overtime_policy: '',
  salary_score: null, match_score: null, growth_score: null, stability_score: null, city_score: null,
  workload_score: null, total_score: null, hr_offer: '', expect: '', negotiation_notes: '', next_action: '',
  next_action_at: null, is_big_week: false, is_overtime: false, is_remote: false, probation_cut: false,
  has_penalty: false, risk_notes: '', decision_notes: '', final_decision: '', notes: '',
};
const statuses: OfferStatus[] = ['待考虑', '谈薪中', '已接受', '已拒绝', '已过期'];
const n = (v: string) => v === '' ? null : Number(v);
const dt = (v: string | null) => v ? new Date(v).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const money = (v: number | null) => v == null ? '—' : `¥${Number(v).toLocaleString('zh-CN')}`;
const risks = (o: Offer) => [
  o.is_big_week && '大小周', o.is_overtime && '加班', o.probation_cut && '试用期折薪',
  o.has_penalty && '违约金', o.is_remote && '可远程',
].filter(Boolean) as string[];

export default function Offers() {
  const db = useCollection<Offer>('offers', { column: 'reply_deadline', ascending: true });
  const apps = useCollection<Application>('applications');
  const { query, registerAdd } = useAppShell();
  const { theme } = useTheme();
  const [form, setForm] = useState<NewOffer>(blank);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState<Offer | null>(null);
  const [status, setStatus] = useState('全部状态');
  const [sort, setSort] = useState('reply_deadline');
  const [compare, setCompare] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const openCreate = () => { setEditing(null); setForm(blank); setFormError(''); setModal(true); };
  useEffect(() => { registerAdd(openCreate); return () => registerAdd(null); }, [registerAdd]);
  useEffect(() => {
    if (!savedToast) return;
    const timer = window.setTimeout(() => setSavedToast(false), 2600);
    return () => window.clearTimeout(timer);
  }, [savedToast]);
  const patch = <K extends keyof NewOffer>(key: K, value: NewOffer[K]) => setForm(v => ({ ...v, [key]: value }));
  const selectApplication = (id: string) => {
    const app = apps.items.find(x => x.id === id);
    setForm(v => ({ ...v, application_id: id || null, company_name: app?.company_name ?? v.company_name,
      position_name: app?.position_name ?? v.position_name, city: app?.city ?? v.city }));
  };
  const openEdit = (o: Offer) => { setEditing(o); setForm({ ...o }); setFormError(''); setModal(true); };
  const applyAIExtraction = (data: OfferExtraction) => {
    setForm(current => ({
      ...current,
      company_name: data.company_name ?? current.company_name,
      position_name: data.position_name ?? current.position_name,
      city: data.city ?? current.city,
      department: data.department ?? current.department,
      manager_or_contact: data.manager_or_contact ?? current.manager_or_contact,
      workplace: data.workplace ?? current.workplace,
      work_schedule: data.work_schedule ?? current.work_schedule,
      join_date: data.join_date ?? current.join_date,
      reply_deadline: data.reply_deadline ?? current.reply_deadline,
      offer_status: statuses.includes(data.offer_status as OfferStatus) ? data.offer_status as OfferStatus : current.offer_status,
      base_salary: data.base_salary ?? current.base_salary,
      salary_months: data.salary_months ?? current.salary_months,
      bonus: data.bonus ?? current.bonus,
      subsidy: data.subsidy ?? current.subsidy,
      annual_package: data.annual_package ?? current.annual_package,
      social_security: data.social_security ?? current.social_security,
      housing_fund: data.housing_fund ?? current.housing_fund,
      stock_or_options: data.stock_or_options ?? current.stock_or_options,
      probation_months: data.probation_months ?? current.probation_months,
      probation_ratio: data.probation_ratio ?? current.probation_ratio,
      overtime_policy: data.overtime_policy ?? current.overtime_policy,
      hr_offer: data.hr_offer ?? current.hr_offer,
      negotiation_notes: data.negotiation_notes ?? current.negotiation_notes,
      next_action: data.next_action ?? current.next_action,
      next_action_at: data.next_action_at ?? current.next_action_at,
      is_big_week: data.is_big_week,
      is_overtime: data.is_overtime,
      is_remote: data.is_remote,
      probation_cut: data.probation_cut,
      has_penalty: data.has_penalty,
      risk_notes: data.risk_notes ?? current.risk_notes,
      decision_notes: data.decision_notes ?? current.decision_notes,
      final_decision: data.final_decision ?? current.final_decision,
      notes: data.notes ?? current.notes,
    }));
    setFormError('');
  };
  const save = async () => {
    if (!form.company_name.trim() || !form.position_name.trim()) return setFormError('公司名称和岗位名称为必填项。');
    setSaving(true); setFormError('');
    const scores = [form.salary_score, form.match_score, form.growth_score, form.stability_score, form.city_score, form.workload_score].filter(x => x != null) as number[];
    const autoAnnual = (form.base_salary ?? 0) * (form.salary_months ?? 12) + (form.bonus ?? 0) + (form.subsidy ?? 0);
    const payload = { ...form, annual_package: form.annual_package ?? (autoAnnual || null),
      total_score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null };
    try {
      if (editing) await db.update(editing.id, payload);
      else await db.create(payload);
      setModal(false);
      setSavedToast(true);
    }
    catch (e) { setFormError(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
  };
  const del = async (o: Offer) => { if (confirm(`确定删除「${o.company_name} · ${o.position_name}」吗？`)) await db.remove(o.id); };
  const list = useMemo(() => db.items.filter(o => status === '全部状态' || o.offer_status === status)
    .filter(o => !query || [o.company_name, o.position_name, o.city].some(x => x?.toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => sort === 'annual_package' ? (b.annual_package ?? 0) - (a.annual_package ?? 0)
      : sort === 'total_score' ? (b.total_score ?? 0) - (a.total_score ?? 0)
      : +(new Date(a.reply_deadline ?? '2999')) - +(new Date(b.reply_deadline ?? '2999'))), [db.items, status, query, sort]);
  const selected = db.items.filter(o => compare.includes(o.id));
  const nearest = db.items.filter(o => o.reply_deadline).sort((a,b) => +new Date(a.reply_deadline!) - +new Date(b.reply_deadline!))[0];
  const stats = [
    ['Offer 总数', db.items.length, '全部记录'], ['待回复', db.items.filter(x => ['待考虑','谈薪中'].includes(x.offer_status)).length, '需要处理'],
    ['已接受', db.items.filter(x => x.offer_status === '已接受').length, '确认入职'], ['拒绝 / 过期', db.items.filter(x => ['已拒绝','已过期'].includes(x.offer_status)).length, '已结束'],
    ['最高年包', money(Math.max(...db.items.map(x => x.annual_package ?? 0)) || null), '总包估算'], ['最近截止', nearest ? dt(nearest.reply_deadline) : '—', nearest?.company_name ?? '暂无'],
  ];

  return <div className="flex flex-col gap-[18px]">
    {db.error && <FormError message={db.error} />}
    <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">{stats.map(([a,b,c],i) =>
      <div key={String(a)} style={{ ...CARD, padding: 16, background: ['#f9dfe7','#fbeec2','#dcebd5','#e6e2da','#dde8fb',theme.accentSoft][i] }}>
        <div className="text-xs font-semibold opacity-70">{a}</div><div className="text-xl font-bold mt-1 truncate">{b}</div><div className="text-[11px] opacity-60 mt-1 truncate">{c}</div>
      </div>)}</div>
    <div className="module-toolbar offer-toolbar" style={{ ...CARD, borderRadius: 18 }}>
      <div className="segmented-control">
        <button style={tab(!compareMode)} onClick={() => setCompareMode(false)}>列表</button>
        <button style={tab(compareMode)} onClick={() => setCompareMode(true)}>对比 {compare.length ? `(${compare.length})` : ''}</button>
      </div>
      <Select className="toolbar-select" value={status} onChange={e => setStatus(e.target.value)}><option>全部状态</option>{statuses.map(x => <option key={x}>{x}</option>)}</Select>
      <Select className="toolbar-select" value={sort} onChange={e => setSort(e.target.value)}><option value="reply_deadline">按回复截止</option><option value="annual_package">按年包</option><option value="total_score">按综合评分</option></Select>
      <PrimaryButton accent={theme.accent} onClick={openCreate} style={{ minWidth: 128, padding: '0 18px' }}>＋ 新增 Offer</PrimaryButton>
    </div>
    {db.loading ? <EmptyState text="正在加载 Offer…" /> : compareMode ? <Compare offers={selected} /> : list.length === 0 ?
      <EmptyState text="还没有收到 Offer，可以先从投递记录中标记 Offer，或手动新增一个 Offer。" actionLabel="新增 Offer" onAction={openCreate} /> :
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{list.map(o => {
        const urgent = o.reply_deadline && (+new Date(o.reply_deadline) - Date.now()) / 86400000 <= 4;
        return <article key={o.id} className="card-hover" style={{ ...CARD, padding: 20 }}>
          <div className="flex justify-between gap-3"><div><h3 className="font-bold text-lg m-0">{o.company_name}</h3><p className="text-sm text-[#8a8478] mt-1">{o.position_name} · {o.city || '城市未填'}</p></div><span style={pill(o.offer_status)}>{o.offer_status}</span></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 text-sm"><Metric label="月薪" value={money(o.base_salary)} /><Metric label="年包" value={money(o.annual_package)} /><Metric label="回复截止" value={dt(o.reply_deadline)} warn={!!urgent} /><Metric label="综合评分" value={o.total_score == null ? '—' : `${o.total_score} 分`} /></div>
          <div className="flex flex-wrap gap-2 mb-4">{risks(o).map(x => <span key={x} className="text-xs px-2 py-1 rounded-full bg-[#fbe0d8] text-[#a23d24]">{x}</span>)}</div>
          <div className="flex flex-wrap items-center gap-2 border-t border-[#f0ebe0] pt-3">
            <label className="text-sm mr-auto"><input type="checkbox" checked={compare.includes(o.id)} onChange={e => setCompare(v => e.target.checked ? v.length < 5 ? [...v,o.id] : v : v.filter(x => x !== o.id))} /> 加入对比</label>
            <GhostButton onClick={() => setDetail(o)}>查看详情</GhostButton><GhostButton onClick={() => openEdit(o)}>编辑</GhostButton><GhostButton onClick={() => void del(o)}>删除</GhostButton>
          </div>
        </article>;
      })}</div>}
    {detail && <Drawer title={`${detail.company_name} · ${detail.position_name}`} onClose={() => setDetail(null)}>
      <Section title="基本信息">{detail.city || '—'} · {detail.department || '部门未填'}<br/>入职日期：{detail.join_date || '—'}<br/>回复截止：{dt(detail.reply_deadline)}</Section>
      <Section title="薪资结构">月薪 {money(detail.base_salary)} × {detail.salary_months ?? 12} 薪<br/>奖金 {money(detail.bonus)} · 补贴 {money(detail.subsidy)}<br/>年包 {money(detail.annual_package)}</Section>
      <Section title="决策评分">薪资 {detail.salary_score ?? '—'} · 匹配 {detail.match_score ?? '—'} · 成长 {detail.growth_score ?? '—'} · 稳定 {detail.stability_score ?? '—'}<br/>综合：{detail.total_score ?? '—'} 分</Section>
      <Section title="谈薪与风险">{detail.negotiation_notes || '暂无谈薪记录'}<br/>{detail.risk_notes || '暂无风险备注'}</Section>
      <Section title="关联投递">{detail.application_id ? '已关联投递记录' : '未关联'}</Section>
      <PrimaryButton accent={theme.accent} onClick={() => openEdit(detail)}>编辑 Offer</PrimaryButton>
    </Drawer>}
    <Modal
      open={modal}
      title={editing ? '编辑 Offer' : '新增 Offer'}
      onClose={() => setModal(false)}
      maxWidth={980}
      maxHeight="86vh"
      panelClassName="offer-form-modal"
      bodyClassName="offer-form-modal-body"
      footer={<><GhostButton onClick={() => setModal(false)}>取消</GhostButton><PrimaryButton accent="#1b1a17" onClick={() => void save()} disabled={saving} style={{ minWidth: 128 }}>{saving ? '保存中…' : '保存 Offer'}</PrimaryButton></>}
    >
      <FormError message={formError} />
      {!editing && <AIRecordImporter<OfferExtraction> kind="offer" onApply={applyAIExtraction} />}
      <FormSection title="基本信息">
        <Field label="关联投递记录"><Select value={form.application_id ?? ''} onChange={e => selectApplication(e.target.value)}><option value="">手动录入</option>{apps.items.filter(x => x.status === 'Offer').map(x => <option value={x.id} key={x.id}>{x.company_name} · {x.position_name}</option>)}</Select></Field>
        <div className="offer-form-grid offer-form-grid--4"><Field label="公司名称 *"><TextInput value={form.company_name} onChange={e => patch('company_name',e.target.value)} /></Field><Field label="岗位名称 *"><TextInput value={form.position_name} onChange={e => patch('position_name',e.target.value)} /></Field><Field label="城市"><TextInput value={form.city ?? ''} onChange={e => patch('city',e.target.value)} /></Field><Field label="状态"><Select value={form.offer_status} onChange={e => patch('offer_status',e.target.value as OfferStatus)}>{statuses.map(x => <option key={x}>{x}</option>)}</Select></Field></div>
      </FormSection>
      <div className="offer-form-section-row">
        <FormSection title="时间信息">
          <div className="offer-form-grid offer-form-grid--2"><Field label="回复截止"><TextInput type="datetime-local" value={form.reply_deadline?.slice(0,16) ?? ''} onChange={e => patch('reply_deadline', e.target.value || null)} /></Field><Field label="入职日期"><TextInput type="date" value={form.join_date ?? ''} onChange={e => patch('join_date',e.target.value || null)} /></Field></div>
        </FormSection>
        <FormSection title="评分（0–100）">
          <div className="offer-form-grid offer-form-grid--3">{(['salary_score','match_score','growth_score','stability_score','city_score','workload_score'] as const).map((k,i) => <Field key={k} label={['薪资','匹配','成长','稳定','城市','工作量'][i]}><TextInput type="number" min="0" max="100" value={form[k] ?? ''} onChange={e => patch(k,n(e.target.value))} /></Field>)}</div>
        </FormSection>
      </div>
      <FormSection title="薪资结构（元）">
        <div className="offer-form-grid offer-form-grid--5">{(['base_salary','salary_months','bonus','subsidy','annual_package'] as const).map((k,i) => <Field key={k} label={['月薪','薪数','奖金','年度补贴','年包（可手填）'][i]}><TextInput type="number" value={form[k] ?? ''} onChange={e => patch(k,n(e.target.value))} /></Field>)}</div>
        <div className="text-[11px] text-[#8a8478] -mt-2">年包未手填时，将按“月薪 × 薪数 + 奖金 + 补贴”自动估算。</div>
      </FormSection>
      <FormSection title="谈薪、风险与备注">
        <div className="offer-form-grid offer-form-grid--2"><Field label="谈薪记录"><TextArea className="offer-compact-textarea" value={form.negotiation_notes ?? ''} onChange={e => patch('negotiation_notes',e.target.value)} /></Field><Field label="风险备注"><TextArea className="offer-compact-textarea" value={form.risk_notes ?? ''} onChange={e => patch('risk_notes',e.target.value)} /></Field></div>
        <div className="flex flex-wrap gap-3 mb-3">{(['is_big_week','is_overtime','is_remote','probation_cut','has_penalty'] as const).map((k,i) => <label className="offer-risk-check" key={k}><input type="checkbox" checked={form[k]} onChange={e => patch(k,e.target.checked)} /> {['大小周','加班','可远程','试用期折薪','违约金'][i]}</label>)}</div>
        <Field label="备注"><TextArea className="offer-compact-textarea" value={form.notes ?? ''} onChange={e => patch('notes',e.target.value)} /></Field>
      </FormSection>
    </Modal>
    {savedToast && <div role="status" className="save-toast">✓ Offer 已保存</div>}
  </div>;
}

function Metric({ label, value, warn }: { label:string; value:string; warn?:boolean }) { return <div className={warn ? 'text-[#a23d24]' : ''}><div className="text-xs text-[#9a9488]">{label}</div><b className="block mt-1">{value}</b></div>; }
function Section({ title, children }: { title:string; children:React.ReactNode }) { return <section className="mb-6"><h3 className="text-base">{title}</h3><div className="text-sm leading-7 text-[#5d584d] bg-[#faf7f0] rounded-2xl p-4">{children}</div></section>; }
function FormSection({ title, children }: { title:string; children:React.ReactNode }) { return <section className="offer-form-section"><h3>{title}</h3>{children}</section>; }
function Drawer({ title, onClose, children }: { title:string; onClose:()=>void; children:React.ReactNode }) { return <div className="fixed inset-0 z-[90] bg-black/25" onClick={onClose}><aside className="absolute right-0 top-0 h-full w-full sm:w-[560px] overflow-y-auto bg-[#fffdf8] p-6 shadow-2xl" onClick={e => e.stopPropagation()}><div className="flex justify-between gap-4 mb-5"><h2>{title}</h2><button className="w-11 h-11 rounded-xl border" onClick={onClose}>×</button></div>{children}</aside></div>; }
function Compare({ offers }: { offers:Offer[] }) { if (!offers.length) return <EmptyState text="勾选最多 5 个 Offer 后在这里进行对比。" />; return <div style={{...CARD,padding:18,overflowX:'auto'}}><table className="hidden sm:table w-full text-sm"><thead><tr><th className="text-left p-3">指标</th>{offers.map(x => <th className="p-3" key={x.id}>{x.company_name}<br/><span className="font-normal">{x.position_name}</span></th>)}</tr></thead><tbody>{[['年包',(x:Offer)=>money(x.annual_package)],['综合评分',(x:Offer)=>`${x.total_score ?? '—'} 分`],['回复截止',(x:Offer)=>dt(x.reply_deadline)],['风险',(x:Offer)=>risks(x).join('、') || '低风险']].map(([l,f]) => <tr className="border-t" key={String(l)}><td className="p-3 font-semibold">{String(l)}</td>{offers.map(x => <td className="p-3 text-center" key={x.id}>{(f as (x:Offer)=>string)(x)}</td>)}</tr>)}</tbody></table><div className="sm:hidden grid gap-3">{offers.map(x => <div className="rounded-2xl bg-[#faf7f0] p-4" key={x.id}><b>{x.company_name} · {x.position_name}</b><p>年包 {money(x.annual_package)} · {x.total_score ?? '—'} 分</p><p>{risks(x).join('、') || '低风险'}</p></div>)}</div></div>; }
const tab = (active:boolean):React.CSSProperties => ({ height:38,padding:'0 18px',border:0,borderRadius:10,background:active?'#fffdf8':'transparent',fontWeight:700,whiteSpace:'nowrap',flexShrink:0 });
const pill = (s:OfferStatus):React.CSSProperties => ({ padding:'5px 11px',borderRadius:999,fontSize:12,fontWeight:700,height:'fit-content',background:s==='已接受'?'#dcebd5':s==='谈薪中'?'#dde8fb':s==='待考虑'?'#fbeec2':'#e6e2da',color:'#4a463e' });
