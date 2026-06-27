export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

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
