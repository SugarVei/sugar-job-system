import test from 'node:test';
import assert from 'node:assert/strict';
import { isPetAnnouncementActive, PET_ANNOUNCEMENT, petChatMessages, PET_CHAT_PROMPT } from './petChatConfig';
import { streamAIChat, type AIMessage } from '../../lib/aiChatClient';

test('announcement is exactly 48 hours with exclusive expiry', () => {
  const start = Date.parse(PET_ANNOUNCEMENT.startsAt), end = Date.parse(PET_ANNOUNCEMENT.endsAt);
  assert.equal(end - start, 48 * 60 * 60 * 1000);
  assert.equal(isPetAnnouncementActive(start - 1), false);
  assert.equal(isPetAnnouncementActive(start), true);
  assert.equal(isPetAnnouncementActive(end - 1), true);
  assert.equal(isPetAnnouncementActive(end), false);
  assert.equal(isPetAnnouncementActive(end + 100000), false);
});
test('chat sends only a bounded explicit conversation and fixed companion prompt', () => {
  const history: AIMessage[] = [{ role: 'system', content: 'untrusted system' }, ...Array.from({ length: 20 }, (_, i): AIMessage => ({ role: i % 2 ? 'assistant' : 'user', content: `turn${i}` }))];
  const result = petChatMessages(history, '你好'.repeat(2000));
  assert.equal(result.length, 14);
  assert.equal(result[0].content, PET_CHAT_PROMPT);
  assert.equal(result[1].content, 'turn8');
  assert.equal(result[result.length - 1].content.length, 2000);
  assert.equal(result.filter(m => m.role === 'system').length, 1);
  assert.match(result[0].content, /温柔、可爱、治愈/);
});
test('caller can cancel streaming and receives AbortError rather than timeout', async t => {
  const cancel = new AbortController();
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      cancel.abort();
    });
  });
  await assert.rejects(streamAIChat({ config: { apiKey: 'synthetic-test-key', model: 'test', provider: 'deepseek' }, messages: [], signal: cancel.signal }), { name: 'AbortError' });
});
