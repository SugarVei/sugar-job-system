import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMailDate, mailIdentity, mailSourceMarker, mailInterviewId } from './mailInterview.ts';
import type { MailboxMessage } from '../types/index.ts';
const message: MailboxMessage = { uid: 12, subject: '面试邀请', from: '测试', date: '2026-10-11T02:00:00Z', snippet: '', seen: true, hasAttachment: false };
test('parse explicit year, afternoon, and minutes without inferring a missing time', () => {
  assert.equal(parseMailDate('2026年10月13日（周二）下午2:30 视频面试', message.date), '2026-10-13T14:30');
  assert.equal(parseMailDate('10月13日 09:45', message.date), '2026-10-13T09:45');
  assert.equal(parseMailDate('2027/1/2 16:05', message.date), '2027-01-02T16:05');
  assert.equal(parseMailDate('明天面试', message.date), '');
  assert.equal(parseMailDate('10月13日', message.date), '');
});
test('invalid dates and times are left for user confirmation', () => {
  for (const text of ['2026-2-30 12:30', '2026/13/1 14:00', '2026年10月13日 24:00', '2026年10月13日 09:99']) assert.equal(parseMailDate(text, message.date), '');
});
test('mail identity distinguishes a reused UID, and interview ID isolates accounts and users', async () => {
  const reused = { ...message, date: '2026-10-12T02:00:00Z' };
  assert.notEqual(mailIdentity(message), mailIdentity(reused));
  assert.notEqual(mailSourceMarker('account1', message), mailSourceMarker('account2', message));
  const id = await mailInterviewId('user1', 'account1', message);
  assert.equal(id, await mailInterviewId('user1', 'account1', message));
  assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-8[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.notEqual(id, await mailInterviewId('user2', 'account1', message));
  assert.notEqual(id, await mailInterviewId('user1', 'account2', message));
  assert.notEqual(id, await mailInterviewId('user1', 'account1', reused));
});
