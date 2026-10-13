import * as XLSX from 'xlsx-js-style';
import type { Application, Interview } from '../types';
import { APPLICATION_STATUSES, APPLICATION_STATUS_FLOW } from './applicationStatus';
import { countApplicationsBy, normalizeApplicationCity, normalizeApplicationPosition, relatedInterviews, summarizeApplications, timestamp } from './applicationsOverview';
import { buildApplicationTrend, resolveTrendRange } from './applicationTrend';
import { C, cell, merged, style, metricCard, distribution, localDate, pct, displayWidth } from './excelStyle';
import type { ExcelChart } from './excelDrawing';

const counts = (items: Application[], pick: (a: Application) => string | null | undefined) => countApplicationsBy(items, a => pick(a) || '未填写').sort((a, b) => Number(a[0] === '未填写') - Number(b[0] === '未填写'));
function dateTime(value: string | null | undefined) {
  const time = timestamp(value);
  if (time === null) return '时间待定';
  const d = new Date(time);
  return `${localDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function buildApplicationOverview(items: Application[], interviews: Interview[], asOf: Date) {
  const ws: XLSX.WorkSheet = {};
  const summary = summarizeApplications(items);
  const total = items.length;
  const entered = summary.interviewing + summary.offers;
  const pending = items.filter(a => ['在线测评', 'AI面', 'HR面', '待跟进'].includes(a.status)).length;
  merged(ws, 1, 1, 6, 'Sugar 求职系统 · 投递情况总览', style('FFFFFF', C.text, 16, true, false));
  merged(ws, 2, 1, 6, `数据更新至 ${localDate(asOf)} · 全部 ${total} 条记录`, style('FFFFFF', C.textLight, 9.5, false, false));
  metricCard(ws, 4, 1, 3, '投递总数', total, '全部记录', 'F0F4FA', '1D6FB8');
  metricCard(ws, 4, 4, 3, '进入面试', entered, `进面率 ${pct(entered, total)}`, 'F4F1FA', '6351A2');
  metricCard(ws, 8, 1, 3, '获得 Offer', summary.offers, `Offer 率 ${pct(summary.offers, total)}`, 'F0F7F2', '2E7D47');
  metricCard(ws, 8, 4, 3, '待跟进事项', pending, '测评 / AI面 / HR面 / 待跟进', 'FAF4EF', 'B25E28');
  const cities = counts(items, a => normalizeApplicationCity(a.city));
  const statuses = APPLICATION_STATUSES.map(s => [s, summary.counts[s]] as [string, number]);
  distribution(ws, 12, 1, ['状态', '数量', '占比'], statuses, total);
  distribution(ws, 12, 4, ['城市', '数量', '占比'], cities, total);
  const channelStart = Math.max(28, 14 + cities.length);
  const channels = counts(items, a => a.channel?.trim());
  distribution(ws, channelStart, 1, ['渠道', '数量', '占比'], channels, total);
  const leftEnd = Math.max(channelStart + channels.length, channelStart + 10);
  for (let r = channelStart + 1; r <= leftEnd; r++) for (let c = 4; c <= 6; c++) cell(ws, r, c, '', style('F8F9FA', C.text, 10, false, false));
  const insightRow = channelStart + 1;
  ws[`E${insightRow}`].v = `求职洞察\n\n当前进面率 ${pct(entered, total)}\n\n${pending} 项测评 / AI面 / HR面 / 待跟进事项\n\n“待跟进”卡片仅统计当前状态为待跟进的记录`;
  ws['!merges']!.push({ s: { r: insightRow - 1, c: 4 }, e: { r: leftEnd - 1, c: 6 } });

  merged(ws, 1, 8, 23, '投递总览 · 进展与分布', style('FFFFFF', C.text, 16, true, false));
  merged(ws, 2, 8, 23, '统计、趋势和完整记录 · 导出时的数据快照', style('FFFFFF', C.textLight, 9.5, false, false));
  metricCard(ws, 11, 8, 4, '累计投递', summary.applied, `${summary.companies} 家公司 · 不含待投递`, 'F0F7F2', '2E7D47');
  metricCard(ws, 11, 12, 4, '面试进行中', summary.interviewing, 'AI面 / HR面 / 一面 / 二面', 'F0F4FA', '1D6FB8');
  metricCard(ws, 11, 16, 4, '获得 Offer', summary.offers, '当前投递结果', 'F0F7F2', '2E7D47');
  metricCard(ws, 11, 20, 4, '待跟进', summary.followUp, '当前状态为待跟进', 'FAF4EF', 'B25E28');
  const high = items.filter(a => a.priority === 'high' || a.priority === 'urgent').length;
  const deadlines = items.filter(a => { const t = timestamp(a.deadline_at); return t !== null && t <= asOf.getTime() + 3 * 86400000; }).length;
  const jd = items.filter(a => Boolean(a.jd_text?.trim())).length;
  metricCard(ws, 16, 8, 5, '高优先级投递', high, 'high / urgent', 'FEF7EB', 'B25E09');
  metricCard(ws, 16, 14, 5, '临近截止', deadlines, '3 天内或已过期', 'FDECEE', 'C93B47');
  metricCard(ws, 16, 19, 5, '有 JD 记录', jd, `覆盖率 ${pct(jd, total)}`, 'F4F1FA', '6351A2');
  for (const [r, c, end, text] of [[21, 8, 15, '投递岗位分布 · 前 6 项'], [21, 16, 23, '本周投递趋势 · 不含待投递'], [32, 8, 15, '状态分布'], [32, 16, 23, '投递城市分布 · 前 6 项']] as const) merged(ws, r, c, end, text, style('FFFFFF', C.text, 11, true, false));

  const ranges = [[8, 10], [11, 14], [15, 16], [17, 20], [21, 23]];
  const wideTable = (row: number, headers: string[], values: unknown[][]) => {
    headers.forEach((h, i) => merged(ws, row, ranges[i][0], ranges[i][1], h, style(C.headerBg, C.headerFg, 10, true)));
    values.forEach((valuesRow, i) => {
      let lines = 1;
      valuesRow.forEach((v, c) => {
        const [from, to] = ranges[c];
        const color = c === 2 && C.status[String(v)];
        merged(ws, row + i + 1, from, to, v, style(color ? color.bg : i % 2 === 0 ? 'FBFBFC' : 'FFFFFF', color ? color.fg : C.text, 10, c === 0));
        lines = Math.max(lines, Math.ceil(displayWidth(v) / ((to - from + 1) * 8 - 2)), String(v ?? '').split('\n').length);
      });
      ws['!rows']![row + i] = { hpt: Math.min(409, Math.max(28, lines * 15 + 10)) };
    });
    if (!values.length) merged(ws, row + 1, 8, 23, '暂无记录', style('FBFBFC', C.textLight));
    return row + Math.max(1, values.length) + 3;
  };
  ws['!rows'] = Array.from({ length: 46 }, (_, i) => ({ hpt: i === 0 ? 36 : i === 1 ? 22 : [4, 8, 11, 16].includes(i) ? 38 : 24 }));
  merged(ws, 44, 8, 23, '面试动态', style('FFFFFF', C.text, 13, true, false));
  const activity = relatedInterviews(interviews, items, asOf.getTime(), items);
  let next = wideTable(45, ['公司', '岗位', '轮次', '面试时间', '方式'], activity.map(i => [i.company_name, i.position_name, i.round, dateTime(i.interview_time), i.interview_type]));
  merged(ws, next, 8, 23, `公司与岗位进展 · 全部 ${total} 条`, style('FFFFFF', C.text, 13, true, false));
  const sorted = [...items].sort((a, b) => (timestamp(b.updated_at) ?? timestamp(b.created_at) ?? 0) - (timestamp(a.updated_at) ?? timestamp(a.created_at) ?? 0) || a.company_name.localeCompare(b.company_name, 'zh-CN') || a.id.localeCompare(b.id));
  next = wideTable(next + 1, ['公司', '岗位', '当前进度', '下一步', '最近更新'], sorted.map(a => [a.company_name, a.position_name, a.status, [a.next_action, a.next_action_at ? dateTime(a.next_action_at) : ''].filter(Boolean).join('\n'), dateTime(a.updated_at)]));
  const dataRow = next + 2;
  merged(ws, next, 8, 15, '完整岗位分布', style('FFFFFF', C.text, 13, true, false));
  merged(ws, next, 16, 23, '本周与最近 7 天 · 趋势数据', style('FFFFFF', C.text, 13, true, false));
  const positions = counts(items, a => normalizeApplicationPosition(a.position_name));
  merged(ws, dataRow - 1, 8, 13, '岗位', style(C.headerBg, C.headerFg, 10, true));
  cell(ws, dataRow - 1, 14, '数量', style(C.headerBg, C.headerFg, 10, true));
  cell(ws, dataRow - 1, 15, '占比', style(C.headerBg, C.headerFg, 10, true));
  positions.forEach(([label, n], i) => {
    const s = style(i % 2 === 0 ? 'FBFBFC' : 'FFFFFF');
    merged(ws, dataRow + i, 8, 13, label, s);
    cell(ws, dataRow + i, 14, n, s);
    cell(ws, dataRow + i, 15, total ? n / total : 0, s);
    ws[`P${dataRow + i}`].z = '0.0%';
    ws['!rows']![dataRow + i - 1] = { hpt: Math.max(28, Math.ceil(displayWidth(label) / 44) * 15 + 10) };
  });
  const week = buildApplicationTrend(items, resolveTrendRange('week', asOf)!, asOf, null);
  const recent = Array.from({ length: 7 }, (_, i) => { const d = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - 6 + i); const key = localDate(d); return { key, count: items.filter(a => a.status !== '待投递' && a.apply_date?.slice(0, 10) === key).length }; });
  const trendRows = [...week.map(d => ['本周', d.key, d.future ? null : d.count]), ...recent.map(d => ['最近 7 天', d.key, d.count])];
  ['周期', '日期', '投递数'].forEach((h, i) => merged(ws, dataRow - 1, 16 + i * 2, 17 + i * 2, h, style(C.headerBg, C.headerFg, 10, true)));
  trendRows.forEach((values, i) => values.forEach((v, c) => merged(ws, dataRow + i, 16 + c * 2, 17 + c * 2, v, style(i % 2 === 0 ? 'FBFBFC' : 'FFFFFF'))));
  const ref = (col: string, start: number, n: number) => `'投递总览'!$${col}$${start}:$${col}$${start + n - 1}`;
  const charts: ExcelChart[] = [];
  const validPositions = positions.filter(([label]) => label !== '未填写').slice(0, 6);
  if (validPositions.length) charts.push({ kind: 'bar', labels: validPositions.map(v => v[0]), values: validPositions.map(v => v[1]), labelRef: ref('I', dataRow, validPositions.length), valueRef: ref('O', dataRow, validPositions.length), col: 8, row: 21, endCol: 16, endRow: 30 });
  const elapsedWeek = week.filter(d => !d.future);
  charts.push({ kind: 'line', labels: elapsedWeek.map(d => d.key), values: elapsedWeek.map(d => d.count), labelRef: ref('S', dataRow, elapsedWeek.length), valueRef: ref('U', dataRow, elapsedWeek.length), col: 16, row: 21, endCol: 24, endRow: 30 });
  if (total) charts.push({ kind: 'doughnut', labels: statuses.map(v => v[0]), values: statuses.map(v => v[1]), labelRef: ref('B', 13, statuses.length), valueRef: ref('C', 13, statuses.length), col: 8, row: 32, endCol: 16, endRow: 41, colors: APPLICATION_STATUSES.map(s => C.status[s].fg) });
  const topCities = cities.filter(([label]) => label !== '未填写').slice(0, 6);
  if (topCities.length) charts.push({ kind: 'bar', labels: topCities.map(v => v[0]), values: topCities.map(v => v[1]), labelRef: ref('E', 13, topCities.length), valueRef: ref('F', 13, topCities.length), col: 16, row: 32, endCol: 24, endRow: 41 });
  const end = Math.max(leftEnd, dataRow + Math.max(positions.length, trendRows.length));
  for (let i = 0; i < end; i++) ws['!rows']![i] ??= { hpt: 24 };
  ws['!ref'] = `B1:X${end}`;
  ws['!cols'] = [4, 24, 12, 16, 24, 12, 16, 4, ...Array(16).fill(8)].map(wch => ({ wch }));
  return { ws, charts, stages: summary.stages, other: APPLICATION_STATUSES.filter(s => !(APPLICATION_STATUS_FLOW as readonly string[]).includes(s)).map(s => `${s} ${summary.counts[s]}`).join('    ') };
}
