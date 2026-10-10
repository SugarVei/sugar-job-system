import assert from 'node:assert/strict';
import test from 'node:test';
import { moveInterviewToHour } from './interviewCalendar';

test('moving an interview changes its day and hour while retaining minutes and seconds', () => {
  const original = new Date(2026, 9, 8, 9, 34, 12);
  const moved = new Date(moveInterviewToHour(original.toISOString(), new Date(2026, 9, 11), 15));
  assert.deepEqual(
    [moved.getFullYear(), moved.getMonth(), moved.getDate(), moved.getHours(), moved.getMinutes(), moved.getSeconds()],
    [2026, 9, 11, 15, 34, 12],
  );
});

test('moving to an invalid hour is rejected', () => {
  assert.throws(() => moveInterviewToHour(new Date().toISOString(), new Date(), 21), /面试时间无效/);
});
