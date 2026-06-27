import * as XLSX from 'xlsx';
import type { Application, ApplicationStatus } from '../types';

const STATUS_ORDER: ApplicationStatus[] = ['已投递', '笔试', '面试', 'Offer', '待跟进', '拒绝'];

function statusEmoji(status: ApplicationStatus) {
  const map: Record<ApplicationStatus, string> = {
    '已投递': '📤',
    '笔试': '✏️',
    '面试': '🤝',
    'Offer': '🎉',
    '待跟进': '⏳',
    '拒绝': '❌',
  };
  return map[status] ?? '';
}

export function exportApplicationsToExcel(items: Application[]) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1：投递总览 ──────────────────────────────
  const statusCount: Record<string, number> = {};
  STATUS_ORDER.forEach((s) => (statusCount[s] = 0));
  const channelCount: Record<string, number> = {};
  const cityCount: Record<string, number> = {};

  items.forEach((app) => {
    statusCount[app.status] = (statusCount[app.status] ?? 0) + 1;
    const ch = app.channel?.trim() || '未填写';
    channelCount[ch] = (channelCount[ch] ?? 0) + 1;
    const ci = app.city?.trim() || '未填写';
    cityCount[ci] = (cityCount[ci] ?? 0) + 1;
  });

  const activeCount = items.filter((a) => !['拒绝'].includes(a.status)).length;
  const offerCount = statusCount['Offer'] ?? 0;
  const rejectCount = statusCount['拒绝'] ?? 0;
  const offerRate = items.length > 0 ? ((offerCount / items.length) * 100).toFixed(1) + '%' : '-';

  const overviewRows: unknown[][] = [
    ['📊 Sugar 求职系统 · 投递情况总览'],
    [],
    ['📈 核心数据'],
    ['指标', '数值'],
    ['总投递数', items.length],
    ['进行中', activeCount],
    ['已拿 Offer', offerCount],
    ['已拒绝', rejectCount],
    ['Offer 转化率', offerRate],
    [],
    ['📋 状态分布'],
    ['状态', '数量', '占比'],
    ...STATUS_ORDER.map((s) => {
      const cnt = statusCount[s] ?? 0;
      const pct = items.length > 0 ? ((cnt / items.length) * 100).toFixed(1) + '%' : '-';
      return [`${statusEmoji(s)} ${s}`, cnt, pct];
    }),
    [],
    ['🌆 城市分布（Top 10）'],
    ['城市', '数量'],
    ...Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([city, cnt]) => [city, cnt]),
    [],
    ['📡 渠道分布'],
    ['渠道', '数量'],
    ...Object.entries(channelCount)
      .sort((a, b) => b[1] - a[1])
      .map(([ch, cnt]) => [ch, cnt]),
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(overviewRows);
  ws1['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, '投递总览');

  // ── Sheet 2：投递明细 ──────────────────────────────
  const headers = ['公司名称', '岗位名称', '城市', '投递渠道', '投递日期', '当前状态', '薪资范围', '岗位链接', '备注', '录入时间'];
  const detailRows = items.map((app) => [
    app.company_name,
    app.position_name,
    app.city ?? '',
    app.channel ?? '',
    app.apply_date ?? '',
    app.status,
    app.salary_range ?? '',
    app.job_url ?? '',
    app.notes ?? '',
    app.created_at ? app.created_at.slice(0, 10) : '',
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet([headers, ...detailRows]);
  ws2['!cols'] = [
    { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 14 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 30 },
    { wch: 28 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '投递明细');

  // ── Sheet 3：时间线 ────────────────────────────────
  const byMonth: Record<string, number> = {};
  items.forEach((app) => {
    if (app.apply_date) {
      const month = app.apply_date.slice(0, 7);
      byMonth[month] = (byMonth[month] ?? 0) + 1;
    }
  });

  const timelineRows: unknown[][] = [
    ['📅 按月投递趋势'],
    [],
    ['月份', '投递数'],
    ...Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, cnt]) => [month, cnt]),
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(timelineRows);
  ws3['!cols'] = [{ wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws3, '月度趋势');

  // 导出文件
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Sugar求职记录_${date}.xlsx`);
}
