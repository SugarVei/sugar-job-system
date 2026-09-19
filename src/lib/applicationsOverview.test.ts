import assert from 'node:assert/strict';
import test from 'node:test';
import type { Application, ApplicationStatus, Interview } from '../types';
import { APPLICATION_STATUSES } from './applicationStatus';
import { relatedInterviews, summarizeApplications } from './applicationsOverview';

function application(status: ApplicationStatus, company = '示例科技', role = '产品运营'): Application {
  return { id: `${company}-${role}-${status}`, company_name: company, position_name: role, status } as Application;
}
function interview(id: string, time: string | null, company = '示例科技', role: string | null = '产品运营'): Interview {
  return { id, company_name: company, position_name: role, interview_time: time } as Interview;
}

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
