import * as XLSX from 'xlsx-js-style';
import type { Application, Company, ReferralCode, SharedReferralCode } from '../types';
import { C, style, merged, cell, distribution, metricCard, detailSheet, styleWorkbookPackage, downloadExcel, localDate } from './excelStyle';
import { countApplicationsBy, normalizeApplicationCity } from './applicationsOverview';

export interface CompanyExportRow { company: Company; applications: Application[] }
export type ReferralExportRow = (ReferralCode & { owned: true; access: 'private' | 'shared' }) | (SharedReferralCode & { owned: false; access: 'shared' });

function overview(title: string, date: Date, scope: string) {
  const ws: XLSX.WorkSheet = {};
  merged(ws, 1, 1, 7, `Sugar 求职系统 · ${title}`, style('FFFFFF', C.text, 16, true, false));
  merged(ws, 2, 1, 7, `数据更新至 ${localDate(date)} · ${scope}`, style('FFFFFF', C.textLight, 9.5, false, false));
  ws['!cols'] = [4, 32, 12, 14, 4, 32, 12, 14].map(wch => ({ wch }));
  return ws;
}

function finishOverview(ws: XLSX.WorkSheet, end: number) {
  ws['!ref'] = `B1:H${end}`;
  ws['!rows'] = Array.from({ length: end }, (_, i) => ({ hpt: i === 0 ? 36 : i === 1 ? 22 : [4, 8].includes(i) ? 38 : [2, 6, 10].includes(i) ? 12 : 28 }));
  return ws;
}

async function serialize(sheets: [string, XLSX.WorkSheet][]) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(([name, ws]) => XLSX.utils.book_append_sheet(wb, ws, name));
  const zip = await styleWorkbookPackage(wb, sheets.map((_, i) => i + 1).slice(1));
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}

export async function createCompaniesExcel(rows: CompanyExportRow[], asOf = new Date(), scope = '全部公司') {
  const sorted = [...rows].sort((a, b) => a.company.company_name.localeCompare(b.company.company_name, 'zh-CN'));
  const applications = rows.flatMap(row => row.applications);
  const industries = countApplicationsBy(rows, row => row.company.industry?.trim() || '未填写');
  const cities = countApplicationsBy(rows, row => normalizeApplicationCity(row.company.city) || '未填写');
  const summary = overview('公司库概览', asOf, scope);
  metricCard(summary, 4, 1, 3, '公司总数', rows.length, '当前导出范围', 'F0F4FA', '1D6FB8');
  metricCard(summary, 4, 5, 3, '关联投递', applications.length, '公司关联的全部岗位', 'F4F1FA', '6351A2');
  metricCard(summary, 8, 1, 3, '获得 Offer', applications.filter(a => a.status === 'Offer').length, '当前状态为 Offer', 'F0F7F2', '2E7D47');
  metricCard(summary, 8, 5, 3, '招聘链接', rows.filter(r => r.company.website?.trim()).length, '已填写官网 / 招聘链接', 'FAF4EF', 'B25E28');
  distribution(summary, 12, 1, ['行业', '公司数', '占比'], industries, rows.length);
  distribution(summary, 12, 5, ['城市', '公司数', '占比'], cities, rows.length);
  finishOverview(summary, Math.max(16, 13 + industries.length, 13 + cities.length));
  const detail = detailSheet('Sugar 求职系统 · 公司明细', ['公司名称', '行业', '城市', '公司规模', '官网 / 招聘链接', '关联投递数', '关联岗位与进度', '备注', '录入日期', '最近更新'], sorted.map(({ company: c, applications: apps }) => [c.company_name, c.industry, c.city, c.scale, c.website, apps.length, apps.map(a => `${a.position_name || '未填写岗位'} · ${a.status}`).join('\n'), c.notes, c.created_at?.slice(0, 10), c.updated_at?.slice(0, 10)]), [24, 20, 18, 20, 44, 14, 56, 56, 16, 16]);
  sorted.forEach(({ company }, i) => { if (/^https?:\/\//i.test(company.website ?? '')) detail[`F${i + 3}`].l = { Target: company.website! }; });
  const linked = detailSheet('Sugar 求职系统 · 公司关联投递', ['公司名称', '岗位名称', '城市', '当前状态', '投递日期', '薪资范围', '下一步动作', '下一步时间', '备注'], sorted.flatMap(row => row.applications.map(a => [row.company.company_name, a.position_name, a.city, a.status, a.apply_date, a.salary_range, a.next_action, a.next_action_at, a.notes])), [24, 34, 18, 16, 16, 20, 40, 28, 56]);
  return serialize([['公司概览', summary], ['公司明细', detail], ['关联投递', linked]]);
}

export async function createReferralCodesExcel(items: ReferralExportRow[], asOf = new Date(), scope = '全部内推码') {
  const sorted = [...items].sort((a, b) => a.company_name.localeCompare(b.company_name, 'zh-CN') || a.created_at.localeCompare(b.created_at));
  const companyCounts = countApplicationsBy(items, i => i.company_name?.trim() || '未填写');
  const statusCounts = countApplicationsBy(items, i => i.status || '未填写');
  const summary = overview('内推码概览', asOf, scope);
  const privateCount = items.filter(i => i.access === 'private').length;
  metricCard(summary, 4, 1, 3, '内推码总数', items.length, '当前导出范围', 'F0F4FA', '1D6FB8');
  metricCard(summary, 4, 5, 3, '覆盖公司', companyCounts.filter(([name]) => name !== '未填写').length, '按公司名称去重', 'F4F1FA', '6351A2');
  metricCard(summary, 8, 1, 3, '仅我可见', privateCount, '本人保存的私有记录', 'FAF4EF', 'B25E28');
  metricCard(summary, 8, 5, 3, '所有用户可见', items.length - privateCount, '共享记录 · 推荐人保密', 'F0F7F2', '2E7D47');
  distribution(summary, 12, 1, ['公司', '内推码数', '占比'], companyCounts, items.length);
  distribution(summary, 12, 5, ['状态', '数量', '占比'], statusCounts, items.length);
  const end = Math.max(18, 14 + companyCounts.length, 14 + statusCounts.length);
  merged(summary, end, 1, 7, '内推码按文本保存，保留前导零；共享记录的推荐人显示“保密”。', style('FFFFFF', C.textLight, 9, false, false));
  finishOverview(summary, end);
  const detail = detailSheet('Sugar 求职系统 · 内推码明细', ['公司名称', '内推码', '推荐人', '可见范围', '记录来源', '状态', '适用岗位', '城市', '招聘届次', '有效期', '备注', '录入日期', '最近更新'], sorted.map(i => [i.company_name, i.referral_code, i.access === 'shared' || !i.owned ? '保密' : i.referrer_name, i.access === 'private' ? '仅我可见' : '所有用户可见', i.owned ? i.source || '本人保存' : '共享记录', i.status, i.owned ? i.position_name : null, i.owned ? i.city : null, i.owned ? null : i.recruitment_year, i.owned ? i.expires_at : null, i.notes, i.created_at?.slice(0, 10), i.updated_at?.slice(0, 10)]), [26, 26, 20, 20, 24, 18, 34, 18, 16, 20, 56, 16, 16]);
  sorted.forEach((item, i) => {
    detail[`C${i + 3}`].z = '@';
    const bg = item.access === 'private' ? 'FAF4EF' : 'F0F7F2';
    const fg = item.access === 'private' ? 'B25E28' : '2E7D47';
    cell(detail, i + 3, 4, item.access === 'private' ? '仅我可见' : '所有用户可见', style(bg, fg, 10, true));
  });
  return serialize([['内推码概览', summary], ['内推码明细', detail]]);
}

export async function exportCompaniesToExcel(rows: CompanyExportRow[], scope?: string) {
  const asOf = new Date();
  downloadExcel(await createCompaniesExcel(rows, asOf, scope), `Sugar公司库_${localDate(asOf)}.xlsx`);
}

export async function exportReferralCodesToExcel(items: ReferralExportRow[], scope?: string) {
  const asOf = new Date();
  downloadExcel(await createReferralCodesExcel(items, asOf, scope), `Sugar内推码_${localDate(asOf)}.xlsx`);
}
