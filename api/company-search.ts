export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS });
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

async function callOpenAICompatible(messages: ChatMessage[], apiKey: string, baseUrl: string, model: string, maxTokens: number) {
  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      max_tokens: maxTokens,
      temperature: 0.35,
      response_format: { type: 'json_object' },
    }),
  });

  if (!upstream.ok) throw new Error(await upstream.text());
  const data = await upstream.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? '';
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json() as {
      prompt?: string;
      provider?: string;
      apiKey?: string;
      baseUrl?: string;
      model?: string;
      existingCompanies?: string[];
    };

    const prompt = body.prompt?.trim();
    if (!prompt) return json({ error: '请输入你想找的公司需求' }, 400);

    const resolvedProvider = body.provider ?? 'deepseek';
    const resolvedKey = body.apiKey || process.env.DEEPSEEK_API_KEY;
    const resolvedBase = body.baseUrl ?? 'https://api.deepseek.com/v1';
    const resolvedModel = body.model ?? 'deepseek-chat';
    if (!resolvedKey) return json({ error: '未配置 API Key，请先在 AI 设置里配置 DeepSeek/OpenAI/Claude/Kimi，或在 Vercel 配置 DEEPSEEK_API_KEY' }, 400);

    const existing = (body.existingCompanies ?? []).slice(0, 180).join('、');
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `你是求职公司研究助手。根据用户需求推荐适合投递或关注的公司。若模型或供应商具备联网检索能力，可以结合公开信息；若不具备联网能力，请基于通用公开知识给出候选，并明确提示需要人工核对。只返回 JSON，不要 Markdown。JSON 格式：{"companies":[{"name":"公司名","industry":"行业/方向","city":"主要城市或中国办公室","regionType":"外企/国企/民企/合资/待确认","reason":"推荐理由，40字以内","url":"官网或招聘入口 URL，未知则留空","sourceNote":"核对说明"}]}。最多返回 8 家，优先给真实公司和官网/招聘入口。避免重复这些已有公司：${existing || '无'}。`,
      },
      { role: 'user', content: prompt },
    ];

    const text = resolvedProvider === 'claude'
      ? await callClaude(messages, resolvedKey, resolvedModel, 1800)
      : await callOpenAICompatible(messages, resolvedKey, resolvedBase, resolvedModel, 1800);

    const parsed = extractJsonObject(text);
    const companies = normalizeCompanies(parsed);
    return json({ companies, raw: text });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: `AI 公司搜索失败：${message}` }, 500);
  }
}