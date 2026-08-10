import type { AutofillRun } from '../../types/resumeAssistant';
import { creamCard, muted } from './styles';
export function RecentRuns({ runs }: { runs: AutofillRun[] }) { return <section style={creamCard}><strong>最近填写记录</strong>{runs.length ? <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>{runs.slice(0, 4).map(run => <div key={run.id} style={muted}>{run.origin_host} · {run.fields_filled}/{run.fields_total} · {run.status}</div>)}</div> : <p style={muted}>还没有记录。记录只保存统计和错误码，不保存填写内容。</p>}</section>; }
