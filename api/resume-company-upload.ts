type NativeRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type NativeResponse = { status(code: number): NativeResponse; json(body: unknown): void; setHeader(name: string, value: string): void; end(): void };

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const requests = new Map<string, { count: number; reset: number }>();

function header(request: NativeRequest, name: string) { const value = request.headers[name]; return Array.isArray(value) ? value[0] ?? '' : value ?? ''; }
function clientIp(request: NativeRequest) { return header(request, 'x-forwarded-for').split(',')[0]?.trim() || 'unknown'; }
function required(name: string) { const value = process.env[name]; if (!value) throw new Error(`${name} is not configured`); return value; }
function safeFileName(fileName: string) { return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'resume'; }
function rateLimit(key: string) {
  const now = Date.now(); const item = requests.get(key);
  if (!item || item.reset <= now) { requests.set(key, { count: 1, reset: now + 60_000 }); return true; }
  item.count += 1; return item.count <= 8;
}
function setCors(request: NativeRequest, response: NativeResponse) {
  const origin = header(request, 'origin');
  const allowed = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080']);
  if (process.env.ALLOWED_ORIGIN) allowed.add(process.env.ALLOWED_ORIGIN);
  if (process.env.VERCEL_URL) allowed.add(`https://${process.env.VERCEL_URL}`);
  if (allowed.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Vary', 'Origin');
}
async function requireUserId(request: NativeRequest) {
  const authorization = header(request, 'authorization');
  if (!authorization.startsWith('Bearer ')) throw new Error('Unauthorized');
  const result = await fetch(`${required('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: required('SUPABASE_ANON_KEY'), authorization } });
  if (!result.ok) throw new Error('Unauthorized');
  const user = await result.json() as { id?: string };
  if (!user.id) throw new Error('Unauthorized');
  return user.id;
}
function readBody(request: NativeRequest) {
  if (typeof request.body === 'string') return JSON.parse(request.body) as Record<string, unknown>;
  return (request.body ?? {}) as Record<string, unknown>;
}
function fileFromBody(body: Record<string, unknown>) {
  const fileName = typeof body.file_name === 'string' ? body.file_name.slice(0, 180) : '';
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const encoded = typeof body.file_data === 'string' ? body.file_data : '';
  const dataUrl = /^data:[^;,]+;base64,([A-Za-z0-9+/=]+)$/.exec(encoded);
  if (!['pdf', 'docx'].includes(extension) || !dataUrl) throw new Error('INVALID_FILE');
  const file = Buffer.from(dataUrl[1], 'base64');
  if (!file.length || file.length > MAX_FILE_SIZE) throw new Error('FILE_TOO_LARGE');
  if (extension === 'pdf' && file.subarray(0, 5).toString() !== '%PDF-') throw new Error('INVALID_FILE');
  if (extension === 'docx' && file.subarray(0, 2).toString() !== 'PK') throw new Error('INVALID_FILE');
  const baseName = safeFileName(fileName).replace(/\.[^.]+$/, '') || 'resume';
  return { extension, file, baseName };
}
function objectUrl(path: string) {
  return `${required('SUPABASE_URL').replace(/\/$/, '')}/storage/v1/object/company-resumes/${path.split('/').map(encodeURIComponent).join('/')}`;
}
function serviceHeaders(contentType?: string) {
  const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY');
  return { authorization: `Bearer ${serviceKey}`, apikey: serviceKey, ...(contentType ? { 'Content-Type': contentType } : {}) };
}

export default async function handler(request: NativeRequest, response: NativeResponse) {
  setCors(request, response);
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (!['POST', 'DELETE'].includes(request.method ?? '')) return response.status(405).json({ error: 'Method not allowed' });
  try {
    const userId = await requireUserId(request);
    if (!rateLimit(`resume-upload:${userId}:${clientIp(request)}`)) return response.status(429).json({ error: '上传请求过于频繁，请稍后再试。' });
    const body = readBody(request);
    if (request.method === 'DELETE') {
      const path = typeof body.path === 'string' ? body.path : '';
      if (!path.startsWith(`${userId}/`) || !/\.(pdf|docx)$/i.test(path)) return response.status(400).json({ error: '无效的简历路径。' });
      const deleted = await fetch(objectUrl(path), { method: 'DELETE', headers: serviceHeaders() });
      if (!deleted.ok && deleted.status !== 404) throw new Error('STORAGE_DELETE_FAILED');
      return response.status(200).json({ ok: true });
    }

    const { extension, file, baseName } = fileFromBody(body);
    const path = `${userId}/${Date.now()}_${crypto.randomUUID()}_${baseName}.${extension}`;
    const contentType = extension === 'pdf' ? 'application/pdf' : DOCX_MIME_TYPE;
    const uploaded = await fetch(objectUrl(path), { method: 'POST', headers: { ...serviceHeaders(contentType), 'x-upsert': 'false', 'cache-control': '3600' }, body: file });
    if (!uploaded.ok) {
      console.error('resume-company-upload storage failure', { status: uploaded.status, userId });
      throw new Error('STORAGE_UPLOAD_FAILED');
    }
    return response.status(200).json({ path });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Unauthorized') return response.status(401).json({ error: '登录已失效，请重新登录后再试。' });
    if (message === 'FILE_TOO_LARGE') return response.status(413).json({ error: '简历文件不能超过 10MB。' });
    if (message === 'INVALID_FILE') return response.status(400).json({ error: '请上传未加密的 PDF 或 DOCX 简历。' });
    if (message !== 'STORAGE_UPLOAD_FAILED' && message !== 'STORAGE_DELETE_FAILED') console.error('resume-company-upload failed', error);
    return response.status(503).json({ error: '简历上传服务暂时不可用，请稍后重试。' });
  }
}
