import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { parseAIJson, streamAIChat } from './aiChatClient';
import { analyzeJd, analyzeResumeProfile, createInterviewPlan, scoreInterviewAnswer } from './jobAssistAI';
import { extractResumeText } from './resumeText';
import type { ResumeFile } from '../types';
import JSZip from 'jszip';

const config = { provider: 'deepseek' as const, model: 'test-model', apiKey: 'synthetic-test-key' };
const profile = {
  snapshot: ['工程专业'], strengths: [{ conclusion: '需求分析', evidence: 'ERP项目' }],
  weaknesses: [], directions: [{ title: '业务分析', typical_titles: ['分析师'], reason: '项目经历', gaps: [] }], needs_confirmation: [],
};
const args = {
  config, route: 'campus' as const, resumeText: '合成测试简历', profile, confirmedFacts: [],
  preferences: { cities: '上海', directions: '分析', industries: '', preferred_companies: '', excluded_companies: '', daily_quota: 5 },
  jdText: '合成测试JD',
};
function response(t: TestContext, raw: unknown) {
  t.mock.method(globalThis, 'fetch', async () => new Response(
    `data: ${JSON.stringify({ choices: [{ delta: { content: JSON.stringify(raw) } }] })}\n\ndata: [DONE]\n\n`,
    { headers: { 'Content-Type': 'text/event-stream' } },
  ));
}

test('SSE preserves Chinese across byte chunks and accepts data without a space', async (t) => {
  const bytes = new TextEncoder().encode('data:{"choices":[{"delta":{"content":"画像完成"}}]}\r\n\r\ndata: [DONE]\n\n');
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
    start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); },
  }), { headers: { 'Content-Type': 'text/event-stream' } }));
  assert.equal(await streamAIChat({ config, messages: [] }), '画像完成');
});

test('API key errors are surfaced instead of an empty result', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('data: {"error":{"message":"API Key 无效"}}\n\n', {
    headers: { 'Content-Type': 'text/event-stream' },
  }));
  await assert.rejects(streamAIChat({ config, messages: [] }), /API Key 无效/);
});

test('HTML fallback is reported as an unavailable AI endpoint', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>SPA</html>', { headers: { 'Content-Type': 'text/html' } }));
  await assert.rejects(streamAIChat({ config, messages: [] }), /未返回分析数据/);
});

test('a hung AI request times out and can be retried', async (t) => {
  t.mock.method(globalThis, 'fetch', (_input: unknown, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  await assert.rejects(streamAIChat({ config, messages: [], timeoutMs: 5 }), /分析超时/);
});

test('truncated output is not treated as a complete answer', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('data: {"choices":[{"delta":{"content":"{}"},"finish_reason":"length"}]}\n\n', {
    headers: { 'Content-Type': 'text/event-stream' },
  }));
  await assert.rejects(streamAIChat({ config, messages: [] }), /被截断/);
});

test('JSON parsing accepts fenced results and rejects null or incomplete data', () => {
  assert.deepEqual(parseAIJson('```json\n{"snapshot":["test"]}\n```'), { snapshot: ['test'] });
  for (const value of ['null', '', '{"snapshot":', '42']) assert.throws(() => parseAIJson(value), /格式不完整/);
});

test('a profile requires evidence and directions', async (t) => {
  response(t, { snapshot: ['test'] });
  await assert.rejects(analyzeResumeProfile(args), /画像字段不完整/);
});

test('failed or unknown hard requirements cannot be overridden by a high score', async (t) => {
  for (const passed of [false, null]) {
    response(t, { eligible: true, hard_requirements: [{ requirement: '毕业届别', evidence: '待确认', passed }], summary: 'test', match_score: 99 });
    const result = await analyzeJd(args);
    assert.equal(result.eligible, false);
    assert.equal(result.match_score, null);
    t.mock.restoreAll();
  }
});

test('malformed eligibility is rejected instead of coercing string false to true', async (t) => {
  response(t, { eligible: 'false', hard_requirements: [], summary: 'test' });
  await assert.rejects(analyzeJd(args), /JD 匹配字段不完整/);
});

test('interview total is calculated from capped dimensions', async (t) => {
  response(t, { scores: { relevance: 40, evidence: 20, structure: 16, role_fit: 18, clarity: 8 }, total_score: 999 });
  const result = await scoreInterviewAnswer({ ...args, question: { type: 'test', question: 'test', focus: 'test' }, answer: '合成回答' });
  assert.equal(result.total_score, 87);
});

test('missing interview scores are not silently saved as zero', async (t) => {
  response(t, {});
  await assert.rejects(scoreInterviewAnswer({ ...args, question: { type: 'test', question: 'test', focus: 'test' }, answer: '合成回答' }), /评分字段不完整/);
});

test('interview plans discard empty questions', async (t) => {
  response(t, [{ question: '请介绍自己' }, {}]);
  const questions = await createInterviewPlan(args);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].type, '综合题');
});

test('PDF parsing retries a transient XRef failure once', async (t) => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => ++requests === 1
    ? new Response(JSON.stringify({ error: 'bad XRef entry' }), { status: 500 })
    : new Response(JSON.stringify({ text: '解析完成' })));
  const file = { file_name: 'test.pdf', file_path: 'test.pdf' } as ResumeFile;
  assert.equal(await extractResumeText(file, async () => 'https://example.test/test.pdf'), '解析完成');
  assert.equal(requests, 2);
});

test('PDF retries are bounded and unrelated errors are not retried', async (t) => {
  for (const error of ['bad XRef entry', '文件不存在']) {
    let requests = 0;
    t.mock.method(globalThis, 'fetch', async () => { requests++; return new Response(JSON.stringify({ error }), { status: 500 }); });
    await assert.rejects(extractResumeText({ file_name: 'test.pdf', file_path: 'test.pdf' } as ResumeFile, async () => 'test'), new RegExp(error));
    assert.equal(requests, error === 'bad XRef entry' ? 2 : 1);
    t.mock.restoreAll();
  }
});

test('DOCX extraction preserves text and decodes XML entities', async (t) => {
  const zip = new JSZip();
  zip.file('word/document.xml', '<w:document><w:p><w:r><w:t>需求 &amp; 验收</w:t></w:r></w:p><w:p><w:r><w:t>&lt;SQL&gt; &#20013;&#x6587;</w:t></w:r></w:p></w:document>');
  const data = await zip.generateAsync({ type: 'uint8array' });
  t.mock.method(globalThis, 'fetch', async () => new Response(new Uint8Array(data).buffer));
  const text = await extractResumeText({ file_name: 'test.docx', file_path: 'test.docx' } as ResumeFile, async () => 'test');
  assert.equal(text, '需求 & 验收\n<SQL> 中文');
});
