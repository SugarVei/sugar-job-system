export const config = { runtime: 'edge' };

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

export default async function handler(req: Request): Promise<Response> {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const body = await req.json() as { apiKey?: string };
  const apiKey = body.apiKey || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json({ error: '未配置 DeepSeek API Key' }, { status: 400, headers: cors });
  }

  try {
    const res = await fetch('https://api.deepseek.com/user/balance', {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    });

    if (!res.ok) {
      return Response.json({ error: `DeepSeek API error: ${res.status}` }, { status: res.status, headers: cors });
    }

    const data = await res.json();
    return Response.json(data, { headers: cors });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500, headers: cors });
  }
}
