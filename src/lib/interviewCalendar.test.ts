import assert from 'node:assert/strict';
import test from 'node:test';
import { Settings } from 'luxon';
import { interviewDate, interviewInputToISO, interviewTimeInput, moveInterviewToHour } from './interviewCalendar';

test('moving an interview changes its day and hour while retaining minutes and seconds', () => {
  const moved = moveInterviewToHour('2026-10-08T09:34:12.123+08:00', interviewDate('2026-10-11'), 15);
  assert.equal(moved, '2026-10-11T07:34:12.123Z');
});

test('moving to an invalid hour is rejected', () => {
  for (const hour of [7, 21, NaN, 9.5]) {
    assert.throws(() => moveInterviewToHour('2026-10-23T10:00:00Z', interviewDate(), hour), /面试时间无效/);
  }
  assert.throws(() => moveInterviewToHour('invalid', interviewDate(), 15), /面试时间无效/);
  assert.throws(() => moveInterviewToHour('2026-10-23T10:00:00Z', interviewDate('invalid'), 15), /面试时间无效/);
});

for (const deviceZone of ['America/New_York', 'America/Los_Angeles', 'UTC', 'Asia/Shanghai']) {
  test(`Beijing display, date grouping, input and rescheduling are independent of ${deviceZone}`, () => {
    const previousZone = process.env.TZ;
    const previousNow = Settings.now;
    try {
      process.env.TZ = deviceZone;
      Settings.resetCaches();
      Settings.now = () => Date.parse('2026-10-23T23:30:00Z');

      assert.equal(interviewTimeInput('2026-10-23T10:15:00Z'), '2026-10-23T18:15');
      assert.equal(interviewInputToISO('2026-10-23T18:15'), '2026-10-23T10:15:00.000Z');
      assert.equal(interviewDate('2026-10-23T16:15:00Z').toISODate(), '2026-10-24');
      assert.equal(interviewDate('2026-10-23T16:15:00Z').hour, 0);
      assert.equal(interviewDate().toISODate(), '2026-10-24');
      assert.equal(interviewDate().startOf('week').toISODate(), '2026-10-19');
      assert.equal(interviewDate('2026-12-31T16:15:00Z').startOf('month').toISODate(), '2027-01-01');
      assert.equal(moveInterviewToHour('2026-10-23T10:15:12.123Z', interviewDate('2026-10-25'), 20), '2026-10-25T12:15:12.123Z');
      // Beijing has no DST gap or repeated hour when the device enters/leaves US DST.
      assert.equal(interviewInputToISO('2026-03-08T02:30'), '2026-03-07T18:30:00.000Z');
      assert.equal(interviewInputToISO('2026-11-01T01:30'), '2026-10-31T17:30:00.000Z');
    } finally {
      if (previousZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousZone;
      Settings.now = previousNow;
      Settings.resetCaches();
    }
  });
}

test('invalid calendar inputs are rejected instead of saving a shifted or normalized date', () => {
  assert.equal(interviewTimeInput('invalid'), '');
  assert.throws(() => interviewInputToISO('2026-02-30T10:15'), /面试时间无效/);
});
