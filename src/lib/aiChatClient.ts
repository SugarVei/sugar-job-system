import type { ActiveConfig } from '../contexts/ApiKeysContext';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function streamAIChat({
  config,
  messages,
  maxTokens = 4096,
  onToken,
  timeoutMs = 120_000,
}: {
  config: ActiveConfig;
  messages: AIMessage[];
  maxTokens?: number;
  onToken?: (fullText: string) => void;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch('/api/ai-chat', {
      signal: controller.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        maxTokens,
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model,
      }),
    });

    if (!response.ok) throw new Error(`AI 服务请求失败（${response.status}）`);
    if (!response.headers.get('content-type')?.includes('text/event-stream')) {
      throw new Error('AI 接口未返回分析数据，请检查服务是否正常部署后重试。');
    }
    if (!response.body) throw new Error('AI 服务没有返回可读取的内容');

    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let finished = false;

    const consumeLine = (line: string) => {
      if (!line.startsWith('data:')) return;
      const raw = line.slice(5).trim();
      if (raw === '[DONE]') { finished = true; return; }
      if (!raw) return;
      try {
        const payload = JSON.parse(raw) as {
          error?: string | { message?: string };
          choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
        };
        if (payload.error) throw new Error(typeof payload.error === 'string' ? payload.error : payload.error.message || 'AI 服务返回错误，请重试');
        if (payload.choices?.[0]?.finish_reason === 'length') throw new Error('AI 返回内容被截断，请缩短输入后重试。');
        const token = payload.choices?.[0]?.delta?.content;
        if (token) {
          fullText += token;
          onToken?.(fullText);
        }
      } catch (error) {
        if (error instanceof SyntaxError) throw Object.assign(new Error('AI 返回的数据格式不完整，请重试。'), { cause: error });
        throw error;
      }
    };

    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(consumeLine);
    }
    if (buffer.trim()) consumeLine(buffer);
    if (!fullText.trim()) throw new Error('AI 没有生成内容，请重试');
    return fullText.trim();
  } catch (error) {
    if (controller.signal.aborted) throw Object.assign(new Error('AI 分析超时，请稍后重试或切换 AI 服务商。'), { cause: error });
    throw error;
  } finally {
    clearTimeout(timeout);
    void reader?.cancel().catch(() => {});
    reader?.releaseLock();
  }
}

export function parseAIJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = (fenced ?? raw).trim();
  const start = Math.min(
    ...[candidate.indexOf('{'), candidate.indexOf('[')].filter((index) => index >= 0),
  );
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  const normalized = Number.isFinite(start) && end >= start ? candidate.slice(start, end + 1) : candidate;
  try {
    const parsed = JSON.parse(normalized) as T;
    if (parsed === null || typeof parsed !== 'object') throw new Error('Empty result');
    return parsed;
  } catch {
    throw new Error('AI 返回格式不完整，请重试');
  }
}

export async function callAIJson<T>(args: Parameters<typeof streamAIChat>[0]) {
  return parseAIJson<T>(await streamAIChat(args));
}

