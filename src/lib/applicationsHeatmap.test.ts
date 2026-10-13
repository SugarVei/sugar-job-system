import assert from 'node:assert/strict';
import test from 'node:test';
import type { Application, ApplicationStatus } from '../types';
import { APPLICATION_STATUSES } from './applicationStatus';
import { filterHeatmapCompanies, heatmapStatusColors, summarizeApplicationHeatmap } from './applicationsHeatmap';
import { contrastRatio, hexToLch } from './colorScience';
import { THEMES } from '../styles/theme';
import { buildPaletteTheme } from './customPalette';

function record(id: string, company_name: string, status: ApplicationStatus, apply_date: string | null = '2026-10-12'): Application {
  return { id, company_name, status, apply_date, position_name: `岗位${id}`, city: '深圳', updated_at: '2026-10-12', created_at: '2026-10-12' } as Application;
}

test('企业合并保留所有已投岗位，待投递不增加企业数，也不覆盖当前阶段', () => {
  const applications = [record('1', '示例企业', '二面'), record('2', '示例企业', '已拒绝', '2026-10-13'), record('3', ' 示例企业 ', '已投递'), record('4', '示例企业', '待投递'), record('5', '只待投递', '待投递')];
  const before = structuredClone(applications);
  const summary = summarizeApplicationHeatmap(applications);
  assert.equal(summary.companies.length, 1);
  assert.equal(summary.applied, 3);
  assert.equal(summary.pending, 2);
  assert.equal(summary.companies[0].stage, '二面');
  assert.equal(summary.companies[0].applications.length, 3);
  assert.equal(summary.counts.二面, 1);
  assert.deepEqual(applications, before);
});

test('非流程状态不推断历史面试轮次，所有状态均能展示，空记录正常', () => {
  const summary = summarizeApplicationHeatmap(APPLICATION_STATUSES.map((status, index) => record(String(index), `公司${index}`, status)));
  assert.equal(summary.companies.length, APPLICATION_STATUSES.length - 1);
  assert.equal(summary.interviewing, 5);
  assert.equal(summary.offers, 1);
  assert.equal(summary.counts.已拒绝, 1);
  assert.equal(summary.counts.待跟进, 1);
  assert.equal(summary.counts.人才库, 1);
  assert.equal(summarizeApplicationHeatmap([record('1', '同公司', '人才库'), record('2', '同公司', '待跟进')]).companies[0].stage, '待跟进');
  assert.equal(summarizeApplicationHeatmap([record('1', '同公司', '已拒绝'), record('2', '同公司', '已放弃', '2026-10-13')]).companies[0].stage, '已放弃');
  assert.equal(summarizeApplicationHeatmap([]).applied, 0);
});

test('企业名称只合并空白和大小写，不合并未经确认的别名，缺失名称不丢记录', () => {
  const summary = summarizeApplicationHeatmap([record('1', ' Apple ', '已投递'), record('2', 'apple', 'Offer'), record('3', 'TCL华星', '已投递'), record('4', 'TCL华星光电技术有限公司', '已投递'), record('5', '', 'HR面'), record('6', '', 'AI面')]);
  assert.equal(summary.companies.length, 5);
  assert.equal(summary.applied, 6);
  assert.equal(summary.companies[0].stage, 'Offer');
  assert.equal(summary.companies[0].applications.length, 2);
  assert.equal(summary.companies.filter(company => company.name === '企业名称未填写').length, 2);
});

test('企业级筛选仍保留完整岗位，搜索匹配岗位和城市，排序不修改汇总', () => {
  const { companies } = summarizeApplicationHeatmap([record('1', '甲企业', 'Offer', null), record('2', '甲企业', '已投递'), { ...record('3', '乙企业', 'HR面', '2026-10-13'), city: '成都' }]);
  assert.equal(filterHeatmapCompanies(companies, ' 岗位2 ', 'Offer', 'progress')[0].applications.length, 2);
  assert.equal(filterHeatmapCompanies(companies, '成都', 'all', 'progress')[0].name, '乙企业');
  assert.equal(filterHeatmapCompanies(companies, '', 'all', 'date')[0].name, '乙企业');
  assert.equal(filterHeatmapCompanies(companies, '', 'all', 'count')[0].name, '甲企业');
  assert.equal(filterHeatmapCompanies(companies, '没有的企业', 'all', 'progress').length, 0);
  assert.equal(companies[0].name, '甲企业');
});

test('当前记录推进后重新汇总会同步改变企业色阶、阶段数量和 Offer 数量', () => {
  const original = [record('1', '同公司', 'AI面'), record('2', '同公司', '已投递')];
  const before = summarizeApplicationHeatmap(original);
  const after = summarizeApplicationHeatmap(original.map(application => application.id === '2' ? { ...application, status: 'Offer' as const } : application));
  assert.equal(before.counts.AI面, 1);
  assert.equal(after.counts.AI面, 0);
  assert.equal(after.offers, 1);
  assert.equal(after.companies[0].stage, 'Offer');
});

test('各预设和极端自定义主题色阶逐级加深，文字对比度至少 4.5', () => {
  const themes = [...Object.values(THEMES), buildPaletteTheme(['#000000', '#ffffff', '#ff00ff', '#00ff00', '#0000ff']).theme];
  for (const theme of themes) {
    let previousLightness = 1;
    for (const status of ['已投递', '在线测评', 'AI面', 'HR面', '一面', '二面', 'Offer'] as const) {
      const style = heatmapStatusColors(status, theme.accent, theme.accentSoft);
      const lightness = hexToLch(style.backgroundColor)[0];
      assert.ok(lightness < previousLightness, `${theme.name} ${status}`);
      assert.ok(contrastRatio(style.backgroundColor, style.color) >= 4.5, `${theme.name} ${status}`);
      previousLightness = lightness;
    }
  }
});
