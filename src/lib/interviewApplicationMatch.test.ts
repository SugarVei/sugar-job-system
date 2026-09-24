import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Application, Interview } from '../types';
import { automaticInterviewCompany, matchingInterviewPosition, rankInterviewCompanies } from './interviewApplicationMatch';

const app = (company: string, position: string): Application => ({
  id: `${company}-${position}`, company_name: company, position_name: position,
} as Application);

test('numbered calendar labels and shortened company names find the application', () => {
  const records = [app('欣旺达股份有限公司', 'IE工程师'), app('中芯国际', '工艺工程师')];
  for (const label of ['欣旺达2', '欣旺', '旺达']) {
    assert.equal(automaticInterviewCompany(rankInterviewCompanies(label, records))?.name, '欣旺达股份有限公司');
  }
});

test('a shared abbreviation does not choose between two different companies', () => {
  const records = [app('中芯国际', '工程师'), app('中芯集成', '工程师')];
  assert.equal(automaticInterviewCompany(rankInterviewCompanies('中芯', records)), null);
  assert.equal(rankInterviewCompanies('中芯', records).length, 2);
});

test('an exact company beats its longer subsidiary name', () => {
  const records = [app('欣旺达', 'IE工程师'), app('欣旺达科技', '测试工程师')];
  assert.equal(automaticInterviewCompany(rankInterviewCompanies('欣旺达', records))?.name, '欣旺达');
});

test('a very short fragment cannot silently match a company', () => {
  assert.equal(rankInterviewCompanies('芯', [app('中芯国际', '工程师')]).length, 0);
});

test('matching role selects one application but does not guess among multiple roles', () => {
  const records = [app('欣旺达', 'IE工程师'), app('欣旺达', '工艺工程师')];
  assert.equal(matchingInterviewPosition({ position_name: 'IE工程师' } as Interview, records)?.position_name, 'IE工程师');
  assert.equal(matchingInterviewPosition({ position_name: null } as Interview, records), null);
});
