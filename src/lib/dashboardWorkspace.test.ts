import assert from 'node:assert/strict';
import test from 'node:test';
import type { Application, Interview, Resume, ResumeFile } from '../types';
import { buildDashboardWorkspace } from './dashboardWorkspace';

const older = '2026-10-01T08:00:00Z', newer = '2026-10-10T08:00:00Z';
const resume = (id: string, user_id = 'owner', updated_at = older) => ({ id, user_id, resume_name: id, created_at: older, updated_at }) as Resume;
const file = (id: string, resume_id: string, user_id = 'owner') => ({ id, user_id, resume_id, created_at: newer, file_name: `${id}.pdf`, kind: 'resume', source: 'upload' }) as ResumeFile;
const application = (id: string, resume_id: string, user_id = 'owner') => ({ id, user_id, resume_id, company_name: id, status: '已投递', created_at: older, updated_at: older }) as Application;

test('添加文件使关联版本升至最新，只形成一条版本更新', () => {
  const result = buildDashboardWorkspace('owner', [resume('first', 'owner', '2026-10-05T08:00:00Z'), resume('second')], [file('new', 'second')], [application('job', 'second')], []);
  assert.equal(result.versions[0].resume.id, 'second');
  assert.equal(result.versions[0].links, 1);
  assert.equal(result.activities[0].fileId, 'new');
  assert.equal(result.activities.filter(a => a.resumeId === 'second' && a.kind === 'resume').length, 1);
  assert.equal(result.activities[0].subtitle, '简历文件 · 文件已添加');
});
test('账号切换时不合并其他账号的记录、文件或关联投递', () => {
  const result = buildDashboardWorkspace('owner', [resume('own'), resume('other', 'stranger')], [file('wrong', 'own', 'stranger'), file('orphan', 'missing'), file('foreign', 'other', 'stranger')], [application('foreignjob', 'own', 'stranger')], [{ id: 'foreigniv', user_id: 'stranger', updated_at: newer }] as Interview[]);
  assert.deepEqual(result.versions.map(v => [v.resume.id, v.files.length, v.links]), [['own', 0, 0]]);
  assert.equal(result.activities.length, 1);
  assert.deepEqual(buildDashboardWorkspace(undefined, [resume('own')], [file('file', 'own')], [application('job', 'own')], []).activities, []);
});
test('无效更新时间回退创建时间；完全无时间不伪造今日动态', () => {
  const result = buildDashboardWorkspace('owner', [resume('valid', 'owner', 'invalid'), { ...resume('bad'), created_at: '', updated_at: 'invalid' }], [], [], []);
  assert.equal(result.activities.length, 1);
  assert.equal(result.activities[0].resumeId, 'valid');
  assert.equal(result.activities[0].updatedAt, Date.parse(older));
});
test('面试只通过明确投递关系查找简历，同名公司不猜测关联', () => {
  const interview = (id: string, application_id: string | null) => ({ id, user_id: 'owner', application_id, company_name: 'job', interview_time: newer, updated_at: newer }) as Interview;
  const result = buildDashboardWorkspace('owner', [resume('cv')], [], [application('job', 'cv')], [interview('linked', 'job'), interview('unlinked', null)]);
  assert.equal(result.activities.find(a => a.id === 'interview:linked')?.resumeId, 'cv');
  assert.equal(result.activities.find(a => a.id === 'interview:unlinked')?.resumeId, undefined);
});
