// Node runtime is required by pdf-parse.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore pdf-parse ships CommonJS without TypeScript declarations.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
type NativeRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type NativeResponse = { status(code: number): NativeResponse; json(body: unknown): void; setHeader(name: string, value: string): void; end(): void };

const buckets = new Map<string, { count: number; reset: number }>();
function header(request: NativeRequest, name: string) { const value = request.headers[name]; return Array.isArray(value) ? value[0] ?? '' : value ?? ''; }
function clientIp(request: NativeRequest) { return header(request, 'x-forwarded-for').split(',')[0]?.trim() || 'unknown'; }
function rateLimit(key: string) { const now = Date.now(); const item = buckets.get(key); if (!item || item.reset <= now) { buckets.set(key, { count: 1, reset: now + 60_000 }); return true; } item.count += 1; return item.count <= 8; }
function setCors(request: NativeRequest, response: NativeResponse) {
  const origin = header(request, 'origin');
  const allowed = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080']);
  if (process.env.ALLOWED_ORIGIN) allowed.add(process.env.ALLOWED_ORIGIN);
  if (process.env.VERCEL_URL) allowed.add(`https://${process.env.VERCEL_URL}`);
  if (allowed.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Vary', 'Origin');
}
async function requireUserId(request: NativeRequest) {
  const authorization = header(request, 'authorization');
  if (!authorization.startsWith('Bearer ')) throw new Error('Unauthorized');
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase is not configured');
  const result = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, authorization } });
  if (!result.ok) throw new Error('Unauthorized');
  const user = await result.json() as { id?: string };
  if (!user.id) throw new Error('Unauthorized');
  return user.id;
}

export default async function handler(request: NativeRequest, response: NativeResponse) {
  setCors(request, response);
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  try {
    const userId = await requireUserId(request);
    if (!rateLimit(`resume-parse:${userId}:${clientIp(request)}`)) return response.status(429).json({ error: '解析请求过于频繁，请稍后再试。' });
    const body = (typeof request.body === 'string' ? JSON.parse(request.body) : request.body ?? {}) as { file_data?: unknown; file_name?: unknown };
    const fileName = typeof body.file_name === 'string' ? body.file_name.slice(0, 180) : '';
    const encoded = typeof body.file_data === 'string' ? body.file_data : '';
    if (!/\.pdf$/i.test(fileName)) return response.status(400).json({ error: '服务器解析仅支持 PDF；DOCX 会在浏览器本地读取。' });
    // FileReader MIME metadata differs across browsers. The client validates
    // the extension and normalizes it, while the PDF signature below validates
    // the actual file before it is passed to the parser.
    const dataUrl = /^data:[^;,]+;base64,([A-Za-z0-9+/=]+)$/.exec(encoded);
    if (!dataUrl) return response.status(400).json({ error: 'PDF 文件格式无效。' });
    const base64 = dataUrl[1];
    if (base64.length > 14_000_000) return response.status(413).json({ error: 'PDF 不能超过 10MB。' });
    const pdfBuffer = Buffer.from(base64, 'base64');
    if (pdfBuffer.subarray(0, 5).toString() !== '%PDF-') return response.status(400).json({ error: '所选文件不是有效的 PDF。' });
    const result = await pdfParse(pdfBuffer);
    const text = String(result.text ?? '').split(String.fromCharCode(0)).join('').trim().slice(0, 60_000);
    if (text.length < 20) return response.status(422).json({ error: '没有从 PDF 中读取到足够文字；扫描版请先转换为可复制文字的 PDF。' });
    return response.status(200).json({ text });
  } catch (error) {
    const unauthorized = error instanceof Error && /Unauthorized/.test(error.message);
    if (!unauthorized) console.error('profile-resume-parse failed', error);
    return response.status(unauthorized ? 401 : 500).json({ error: unauthorized ? 'Unauthorized' : 'PDF 解析失败。' });
  }
}
