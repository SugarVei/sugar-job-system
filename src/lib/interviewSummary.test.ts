import test from 'node:test';
import assert from 'node:assert/strict';
import { groupInterviewsByTime } from './interviewSummary.ts';

const now = Date.parse('2026-10-04T12:00:00+08:00');
test('groups at the exact scheduled boundary and sorts past newest first, future nearest first', () => {
  const rows = [
    { id: 'later', interview_time: '2026-10-05T10:00:00+08:00' },
    { id: 'old', interview_time: '2026-09-01T10:00:00+08:00' },
    { id: 'now', interview_time: '2026-10-04T04:00:00Z' },
    { id: 'recent', interview_time: '2026-10-04T11:59:59+08:00' },
    { id: 'near', interview_time: '2026-10-04T13:00:00+08:00' },
  ];
  const before = structuredClone(rows);
  const groups = groupInterviewsByTime(rows, now);
  assert.deepEqual(groups.past.map((row) => row.id), ['recent', 'old']);
  assert.deepEqual(groups.upcoming.map((row) => row.id), ['now', 'near', 'later']);
  assert.deepEqual(rows, before);
  assert.equal(groupInterviewsByTime(rows, now + 1).past[0].id, 'now');
});

test('retains every interview beyond five and puts missing or invalid dates last in upcoming', () => {
  const rows = Array.from({ length: 24 }, (_, id) => ({ id, interview_time: new Date(now + (id - 12) * 86400000).toISOString() as string | null }));
  rows.unshift({ id: 24, interview_time: null }, { id: 25, interview_time: 'invalid-date' });
  const groups = groupInterviewsByTime(rows, now);
  assert.equal(groups.past.length, 12);
  assert.equal(groups.upcoming.length, 14);
  assert.deepEqual(groups.upcoming.slice(-2).map((row) => row.id), [24, 25]);
  assert.equal(new Set([...groups.past, ...groups.upcoming].map((row) => row.id)).size, rows.length);
  assert.deepEqual(groupInterviewsByTime([], now), { past: [], upcoming: [] });
});
