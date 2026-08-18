export function getCorsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  const allowed = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'https://sugarv.mom',
    'https://www.sugarv.mom',
    'https://sugar-job-system.vercel.app',
  ]);
  if (process.env.ALLOWED_ORIGIN) allowed.add(process.env.ALLOWED_ORIGIN);
  if (process.env.VERCEL_URL) allowed.add(`https://${process.env.VERCEL_URL}`);
  return { ...(allowed.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}), 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Device-Token', 'Access-Control-Expose-Headers': 'X-Device-Token', Vary: 'Origin' };
}
export function handleOptions(request: Request) { return new Response(null, { status: 204, headers: getCorsHeaders(request) }); }
export function json(request: Request, body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }); }
