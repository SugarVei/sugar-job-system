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
    baseUrl: 'https://api.minimaxi.com/v1',
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

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type CompanyCandidate = {
  name: string;
  industry: string;
  city: string;
  regionType: string;
  reason: string;
  url: string;
  sourceNote: string;
};

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

function json(data: unknown, status: number, corsHeaders: Record<string, string>) {
  return Response.json(data, { status, headers: corsHeaders });
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('AI 没有返回 JSON 对象');
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeCompanies(value: unknown): CompanyCandidate[] {
  const record = value as { companies?: unknown };
  if (!Array.isArray(record.companies)) return [];
  return record.companies
    .map((item) => item as Partial<CompanyCandidate>)
    .filter((item) => item.name && item.industry)
    .slice(0, 12)
    .map((item) => ({
      name: String(item.name ?? '').trim(),
      industry: String(item.industry ?? '').trim(),
      city: String(item.city ?? '').trim(),
      regionType: String(item.regionType ?? '').trim() || '待确认',
      reason: String(item.reason ?? '').trim(),
      url: String(item.url ?? '').trim(),
      sourceNote: String(item.sourceNote ?? '').trim() || 'AI 推荐结果，请人工核对官网与校招入口',
    }));
}

async function callClaude(messages: ChatMessage[], apiKey: string, model: string, maxTokens: number) {
  const systemMsg = messages.find((message) => message.role === 'system');
  const chatMessages = messages.filter((message) => message.role !== 'system');
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
      temperature: 0.35,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: chatMessages,
    }),
  });

  if (!upstream.ok) throw new Error(await upstream.text());
  const data = await upstream.json() as { content?: Array<{ type: string; text?: string }> };
  return data.content?.map((part) => part.text ?? '').join('\n') ?? '';
}

async function callOpenAICompatible(messages: ChatMessage[], apiKey: string, baseUrl: string, model: string, maxTokens: number, provider: ProviderId) {
  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      ...(provider === 'minimax'
        ? { max_completion_tokens: Math.min(maxTokens, 2048) }
        : { max_tokens: maxTokens }),
      temperature: 0.35,
    }),
  });

  if (!upstream.ok) throw new Error(await upstream.text());
  const data = await upstream.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? '';
}

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, corsHeaders);

  try {
    const body = await req.json() as {
      prompt?: string;
      provider?: string;
      apiKey?: string;
      model?: string;
      existingCompanies?: string[];
    };

    const prompt = body.prompt?.trim();
    if (!prompt) return json({ error: '请输入你想找的公司需求' }, 400, corsHeaders);

    const requestedProvider = body.provider ?? 'deepseek';
    if (!isProviderId(requestedProvider)) {
      return json({ error: '不支持的 AI 服务商。' }, 400, corsHeaders);
    }

    const providerConfig = PROVIDER_CONFIG[requestedProvider];
    const resolvedKey = body.apiKey || (requestedProvider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : undefined);
    const resolvedModel = body.model ?? providerConfig.defaultModel;
    if (!resolvedKey) return json({ error: '当前服务商未配置 API Key。' }, 400, corsHeaders);

    const existing = (body.existingCompanies ?? []).slice(0, 180).join('、');
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `你是求职公司研究助手。根据用户需求推荐适合投递或关注的公司。若模型或供应商具备联网检索能力，可以结合公开信息；若不具备联网能力，请基于通用公开知识给出候选，并明确提示需要人工核对。只返回 JSON，不要 Markdown。JSON 格式：{"companies":[{"name":"公司名","industry":"行业/方向","city":"主要城市或中国办公室","regionType":"外企/国企/民企/合资/待确认","reason":"推荐理由，40字以内","url":"官网或招聘入口 URL，未知则留空","sourceNote":"核对说明"}]}。最多返回 8 家，优先给真实公司和官网/招聘入口。避免重复这些已有公司：${existing || '无'}。`,
      },
      { role: 'user', content: prompt },
    ];

    const text = providerConfig.type === 'claude'
      ? await callClaude(messages, resolvedKey, resolvedModel, 1800)
      : await callOpenAICompatible(messages, resolvedKey, providerConfig.baseUrl, resolvedModel, 1800, requestedProvider);

    const parsed = extractJsonObject(text);
    const companies = normalizeCompanies(parsed);
    return json({ companies, raw: text }, 200, corsHeaders);
  } catch (error) {
    console.error('[company-search] request failed:', error);
    return json({ error: 'AI 服务请求失败，请检查 API Key 或余额。' }, 500, corsHeaders);
  }
}
