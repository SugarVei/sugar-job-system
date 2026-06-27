export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const res = await fetch('https://api.deepseek.com/user/balance', {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return Response.json(
        { error: `DeepSeek API error: ${res.status}` },
        { status: res.status, headers: cors },
      );
    }

    const data = await res.json();
    return Response.json(data, { headers: cors });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500, headers: cors },
    );
  }
}
