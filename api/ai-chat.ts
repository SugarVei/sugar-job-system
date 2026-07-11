export const config = { runtime: 'edge' };

const PROVIDER_CONFIG = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    type: 'openai-compatible',
    defaultModel: 'deepseek-chat',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    type: 'openai-compatible',
    defaultModel: 'gpt-4o-mini',
  },
  kimi: {
    baseUrl: 'https://api.moonshot.cn/v1',
    type: 'openai-compatible',
    defaultModel: 'moonshot-v1-8k',
  },
  claude: {
    baseUrl: 'https://api.anthropic.com',
    type: 'claude',
    defaultModel: 'claude-haiku-4-5-20251001',
  },
  doubao: {
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    type: 'openai-compatible',
    defaultModel: 'doubao-seed-1-6-vision-250815',
  },
  qwen: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    type: 'openai-compatible',
    defaultModel: 'qwen-vl-max',
  },
  minimax: {
    baseUrl: 'https://api.minimax.io/v1',
    type: 'openai-compatible',
    defaultModel: 'MiniMax-M2.5',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    type: 'openai-compatible',
    defaultModel: 'gemini-2.5-flash',
  },
} as const;

type ProviderId = keyof typeof PROVIDER_CONFIG;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowed = new Set<string>(['http://localhost:5173']);
  const envOrigin = process.env.ALLOWED_ORIGIN;
  const vercelUrl = process.env.VERCEL_URL;
  if (envOrigin) allowed.add(envOrigin);
  if (vercelUrl) allowed.add(`https://${vercelUrl}`);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (allowed.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function isProviderId(value: string): value is ProviderId {
  return value in PROVIDER_CONFIG;
}

function sseError(msg: string, corsHeaders: Record<string, string>): Response {
  return new Response(
    `data: ${JSON.stringify({ error: msg })}\n\ndata: [DONE]\n\n`,
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } },
  );
}

// Normalize Claude's SSE stream to OpenAI format so the frontend stays unchanged
async function handleClaude(
  messages: { role: string; content: string }[],
  maxTokens: number,
  apiKey: string,
  model: string,
  corsHeaders: Record<string, string>,
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
    console.error('[ai-chat] claude upstream error:', await upstream.text());
    return sseError('AI 服务请求失败，请检查 API Key 或余额。', corsHeaders);
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
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

// OpenAI-compatible providers: DeepSeek, OpenAI, Kimi
async function handleOpenAICompatible(
  messages: { role: string; content: string }[],
  maxTokens: number,
  apiKey: string,
  baseUrl: string,
  model: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, stream: true, max_tokens: maxTokens, temperature: 0.7 }),
  });

  if (!upstream.ok) {
    console.error('[ai-chat] openai-compatible upstream error:', await upstream.text());
    return sseError('AI 服务请求失败，请检查 API Key 或余额。', corsHeaders);
  }

  return new Response(upstream.body, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.json() as {
    messages: { role: string; content: string }[];
    maxTokens?: number;
    provider?: string;
    apiKey?: string;
    model?: string;
  };

  const { messages, maxTokens = 2048, provider, apiKey, model } = body;
  const requestedProvider = provider ?? 'deepseek';
  if (!isProviderId(requestedProvider)) {
    return sseError('不支持的 AI 服务商。', corsHeaders);
  }

  const providerConfig = PROVIDER_CONFIG[requestedProvider];
  const resolvedKey = apiKey || (requestedProvider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : undefined);
  if (!resolvedKey) return sseError('当前服务商未配置 API Key。', corsHeaders);

  const resolvedModel = model ?? providerConfig.defaultModel;

  if (providerConfig.type === 'claude') {
    return handleClaude(messages, maxTokens, resolvedKey, resolvedModel, corsHeaders);
  }
  return handleOpenAICompatible(messages, maxTokens, resolvedKey, providerConfig.baseUrl, resolvedModel, corsHeaders);
}
