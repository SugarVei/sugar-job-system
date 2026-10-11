import assert from 'node:assert/strict';
import test from 'node:test';
import type { Application, ApplicationStatus, Interview } from '../types';
import { APPLICATION_STATUSES } from './applicationStatus';
import { buildApplicationTrend, resolveTrendRange } from './applicationTrend';
import {
  countApplicationsBy,
  normalizeApplicationCity,
  normalizeApplicationPosition,
  relatedInterviews,
  summarizeApplications,
  weeklyApplicationTrend,
} from './applicationsOverview';

function application(status: ApplicationStatus, company = '示例科技', role = '产品运营'): Application {
  return { id: `${company}-${role}-${status}`, company_name: company, position_name: role, status } as Application;
}
function interview(id: string, time: string | null, company = '示例科技', role: string | null = '产品运营'): Interview {
  return { id, company_name: company, position_name: role, interview_time: time } as Interview;
}

test('时间范围覆盖近几周、日历月、跨年与闰月', () => {
  const now = new Date(2026, 9, 11);
  assert.deepEqual(resolveTrendRange('fourWeeks', now), { start: '2026-09-14', end: '2026-10-11', unit: 'week' });
  assert.deepEqual(resolveTrendRange('twoWeeks', now), { start: '2026-09-28', end: '2026-10-11', unit: 'day' });
  assert.deepEqual(resolveTrendRange('previousMonth', now), { start: '2026-09-01', end: '2026-09-30', unit: 'day' });
  assert.deepEqual(resolveTrendRange('threeMonths', new Date(2027, 0, 4)), { start: '2026-11-01', end: '2027-01-31', unit: 'month' });
  assert.equal(resolveTrendRange('previousMonth', new Date(2024, 2, 31))!.end, '2024-02-29');
});

test('周、月汇总不重复计数，部分首尾周仅计入选定范围，未来及待投递不计入', () => {
  const rows = ['2026-09-14', '2026-09-20', '2026-09-21', '2026-09-30', '2026-10-11', '2026-10-12'].map(apply_date => ({ ...application('已投递'), apply_date }));
  rows.push({ ...application('待投递'), apply_date: '2026-10-11' });
  const now = new Date(2026, 9, 11);
  assert.deepEqual(buildApplicationTrend(rows, resolveTrendRange('fourWeeks', now)!, now).map(day => day.count), [2, 1, 1, 1]);
  assert.deepEqual(buildApplicationTrend(rows, resolveTrendRange('threeMonths', now)!, now).map(day => day.count), [0, 4, 1]);
  const partial = buildApplicationTrend(rows, { start: '2026-09-16', end: '2026-09-30', unit: 'week' }, now);
  assert.deepEqual(partial.map(day => day.count), [1, 1, 1]);
  assert.equal(partial[0].key, '2026-09-16');
  assert.equal(partial[2].endKey, '2026-09-30');
  assert.ok(buildApplicationTrend(rows, resolveTrendRange('threeMonths', now)!, now, '一面').every(day => day.count === 0));
});

test('自定义日期包含两端、单日和空范围，拒绝非法和倒置日期，按跨度调整粒度', () => {
  const now = new Date(2026, 9, 11);
  const custom = (start: string, end: string) => resolveTrendRange('custom', now, { start, end });
  assert.equal(custom('2026-09-30', '2026-10-11')!.unit, 'day');
  assert.equal(custom('2026-08-01', '2026-10-11')!.unit, 'week');
  assert.equal(custom('2026-01-01', '2026-10-11')!.unit, 'month');
  assert.equal(custom('2026-02-30', '2026-10-11'), null);
  assert.equal(custom('', '2026-10-11'), null);
  assert.equal(custom('2026-10-12', '2026-10-11'), null);
  const rows = ['2026-09-30', '2026-10-01', '2026-10-02'].map(apply_date => ({ ...application('已投递'), apply_date }));
  assert.deepEqual(buildApplicationTrend(rows, custom('2026-09-30', '2026-10-01')!, now).map(day => day.count), [1, 1]);
  assert.deepEqual(buildApplicationTrend(rows, custom('2026-10-01', '2026-10-01')!, now).map(day => day.count), [1]);
  assert.ok(buildApplicationTrend([], custom('2026-09-30', '2026-10-11')!, now).every(day => day.count === 0));
});

test('周趋势按投递日期计数，排除待投递、缺失日期、区间外日期并保留状态筛选', () => {
  const rows = [
    { ...application('已投递'), apply_date: '2026-10-05' },
    { ...application('一面'), apply_date: '2026-10-05' },
    { ...application('待投递'), apply_date: '2026-10-05' },
    { ...application('Offer'), apply_date: '2026-10-11' },
    { ...application('已投递'), apply_date: '2026-10-04' },
    { ...application('已投递'), apply_date: null },
  ];
  const now = new Date(2026, 9, 11);
  assert.deepEqual(weeklyApplicationTrend(rows, now).map(day => day.count), [2, 0, 0, 0, 0, 0, 1]);
  assert.equal(weeklyApplicationTrend(rows, now, false, '一面')[0].count, 1);
  assert.equal(weeklyApplicationTrend(rows, now, true)[6].count, 1);
  assert.ok(weeklyApplicationTrend(rows, now, false, '待投递').every(day => day.count === 0));
});

test('周一跨年仍生成正确周日期，未到来的日期不显示为已发生的投递', () => {
  const rows = [{ ...application('已投递'), apply_date: '2027-01-01' }];
  const days = weeklyApplicationTrend(rows, new Date(2026, 11, 28));
  assert.equal(days[0].key, '2026-12-28');
  assert.equal(days[6].key, '2027-01-03');
  assert.deepEqual(days.map(day => day.future), [false, true, true, true, true, true, true]);
  assert.equal(days[4].count, 0);
  assert.ok(weeklyApplicationTrend([], new Date(2026, 11, 28), true).every(day => !day.future && day.count === 0));
});

test('统计覆盖全部状态：不把待投递当累计投递、不重复累计漏斗阶段', () => {
  const summary = summarizeApplications(APPLICATION_STATUSES.map(status => application(status)));
  assert.equal(summary.applied, 11);
  assert.equal(summary.companies, 1);
  assert.equal(summary.interviewing, 4);
  assert.equal(summary.offers, 1);
  assert.equal(summary.followUp, 1);
  assert.ok(summary.stages.every(stage => stage.count === 1));
  assert.equal(Object.values(summary.counts).reduce((sum, value) => sum + value, 0), 12);
});

test('同公司多岗位分别计数、公司去重、零数据统计正常', () => {
  const summary = summarizeApplications([
    application('已投递', '示例科技', '产品运营'), application('一面', ' 示例科技 ', '供应链'),
    application('待投递', '未投递公司'), application('Offer', '另一家公司'),
  ]);
  assert.equal(summary.applied, 3);
  assert.equal(summary.companies, 2);
  assert.equal(summarizeApplications([]).applied, 0);
  assert.ok(summarizeApplications([]).stages.every(stage => stage.count === 0));
});

test('城市名称使用规范行政区名汇总，非城市标签保持原样', () => {
  const rows = [
    { city: '上海' }, { city: ' 上海市 ' },
    { city: '深圳' }, { city: '深圳市' },
    { city: '远程' }, { city: null },
  ];
  assert.deepEqual(
    countApplicationsBy(rows, row => normalizeApplicationCity(row.city)),
    [['上海市', 2], ['深圳市', 2], ['远程', 1]],
  );
  assert.equal(normalizeApplicationCity('成都'), '成都市');
  assert.equal(normalizeApplicationCity('合肥市'), '合肥市');
});

test('IE工程师与工业工程师按同一岗位汇总，其他岗位不受影响', () => {
  const rows = [
    { position: 'IE工程师' }, { position: '工业工程师' },
    { position: ' ie 工程师 ' }, { position: '质量工程师' },
  ];
  assert.deepEqual(
    countApplicationsBy(rows, row => normalizeApplicationPosition(row.position)),
    [['IE工程师', 3], ['质量工程师', 1]],
  );
});

test('面试关联同时匹配公司与岗位，不误配同公司其他岗位或未指明岗位', () => {
  const rows = [application('一面'), application('HR面', '示例科技', '供应链')];
  const events = [interview('exact', null), interview('other-role', null, '示例科技', '算法'), interview('ambiguous', null, '示例科技', null), interview('other-company', null, '其他公司')];
  assert.deepEqual(relatedInterviews(events, rows).map(event => event.id), ['exact']);
  assert.deepEqual(relatedInterviews(events, rows.slice(0, 1), Date.now(), rows).map(event => event.id), ['exact']);
  assert.deepEqual(relatedInterviews([events[2]], rows.slice(0, 1)).map(event => event.id), ['ambiguous']);
});

test('面试动态优先最近将来的安排，其次最近历史，未定和错误日期排最后', () => {
  const now = Date.parse('2026-09-19T00:00:00Z');
  const events = [interview('past-old', '2026-09-10T00:00:00Z'), interview('invalid', 'invalid'), interview('future-later', '2026-09-22T00:00:00Z'), interview('past-recent', '2026-09-18T00:00:00Z'), interview('future-soon', '2026-09-20T00:00:00Z')];
  assert.deepEqual(relatedInterviews(events, [application('一面')], now).map(event => event.id), ['future-soon', 'future-later', 'past-recent', 'past-old', 'invalid']);
});
