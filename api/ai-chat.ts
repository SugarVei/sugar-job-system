export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sseError(msg: string): Response {
  return new Response(
    `data: ${JSON.stringify({ error: msg })}\n\ndata: [DONE]\n\n`,
    { status: 200, headers: { ...CORS, 'Content-Type': 'text/event-stream' } },
  );
}

// Normalize Claude's SSE stream to OpenAI format so the frontend stays unchanged
async function handleClaude(
  messages: { role: string; content: string }[],
  maxTokens: number,
  apiKey: string,
  model: string,
): Promise<Response> {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: chatMessages,
      stream: true,
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return sseError(`Claude API 错误：${err}`);
  }

  // Transform Claude SSE events → OpenAI SSE format
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  (async () => {
    const reader = upstream.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          try {
            const json = JSON.parse(raw) as { type: string; delta?: { type: string; text?: string } };
            if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta' && json.delta.text) {
              const chunk = JSON.stringify({ choices: [{ delta: { content: json.delta.text } }] });
              await writer.write(enc.encode(`data: ${chunk}\n\n`));
            } else if (json.type === 'message_stop') {
              await writer.write(enc.encode('data: [DONE]\n\n'));
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } finally {
      await writer.write(enc.encode('data: [DONE]\n\n'));
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

// OpenAI-compatible providers: DeepSeek, OpenAI, Kimi
async function handleOpenAICompatible(
  messages: { role: string; content: string }[],
  maxTokens: number,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<Response> {
  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, stream: true, max_tokens: maxTokens, temperature: 0.7 }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return sseError(`API 错误（${model}）：${err}`);
  }

  return new Response(upstream.body, {
    headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.json() as {
    messages: { role: string; content: string }[];
    maxTokens?: number;
    provider?: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };

  const { messages, maxTokens = 2048, provider, apiKey, baseUrl, model } = body;

  // If the caller supplies their own key, use it; otherwise fall back to server env var (DeepSeek only)
  const resolvedKey = apiKey || process.env.DEEPSEEK_API_KEY;
  if (!resolvedKey) return sseError('未配置 API Key，请在 ⚙️ AI 设置 中填入你的 API Key');

  const resolvedProvider = provider ?? 'deepseek';
  const resolvedBase = baseUrl ?? 'https://api.deepseek.com/v1';
  const resolvedModel = model ?? 'deepseek-chat';

  if (resolvedProvider === 'claude') {
    return handleClaude(messages, maxTokens, resolvedKey, resolvedModel);
  }
  return handleOpenAICompatible(messages, maxTokens, resolvedKey, resolvedBase, resolvedModel);
}
