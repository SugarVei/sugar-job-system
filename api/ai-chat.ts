export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(
      'data: {"error":"未配置 DEEPSEEK_API_KEY，请在 Vercel 项目设置 → Environment Variables 中添加"}\n\n',
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } },
    );
  }

  const body = await req.json();
  const { messages, maxTokens = 2048 } = body as {
    messages: { role: string; content: string }[];
    maxTokens?: number;
  };

  const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(`data: {"error":"DeepSeek API 错误：${err}"}\n\n`, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  }

  return new Response(upstream.body, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
