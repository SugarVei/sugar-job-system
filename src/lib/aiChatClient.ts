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
}: {
  config: ActiveConfig;
  messages: AIMessage[];
  maxTokens?: number;
  onToken?: (fullText: string) => void;
}) {
  const response = await fetch('/api/ai-chat', {
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
  if (!response.body) throw new Error('AI 服务没有返回可读取的内容');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  const consumeLine = (line: string) => {
    if (!line.startsWith('data: ')) return;
    const raw = line.slice(6).trim();
    if (!raw || raw === '[DONE]') return;
    try {
      const payload = JSON.parse(raw) as {
        error?: string;
        choices?: Array<{ delta?: { content?: string } }>;
      };
      if (payload.error) throw new Error(payload.error);
      const token = payload.choices?.[0]?.delta?.content;
      if (token) {
        fullText += token;
        onToken?.(fullText);
      }
    } catch (error) {
      if (error instanceof Error && error.message !== 'Unexpected end of JSON input') throw error;
    }
  };

  while (true) {
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
    return JSON.parse(normalized) as T;
  } catch {
    throw new Error('AI 返回格式不完整，请重试');
  }
}

export async function callAIJson<T>(args: Parameters<typeof streamAIChat>[0]) {
  return parseAIJson<T>(await streamAIChat(args));
}

