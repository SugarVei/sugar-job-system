import { createHmac, timingSafeEqual } from 'node:crypto';

type NativeRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};
type NativeResponse = { status(code: number): NativeResponse; json(body: unknown): void; setHeader(name: string, value: string): void; end(body?: unknown): void };

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
function objectUrl(bucket: 'company-resumes' | 'resumes', path: string) {
  return `${required('SUPABASE_URL').replace(/\/$/, '')}/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
function serviceHeaders(contentType?: string) {
  const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY');
  return { authorization: `Bearer ${serviceKey}`, apikey: serviceKey, ...(contentType ? { 'Content-Type': contentType } : {}) };
}
function queryValue(request: NativeRequest, name: string) {
  const value = request.query?.[name];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
function signDownloadToken(token: string) {
  return createHmac('sha256', required('SUPABASE_SERVICE_ROLE_KEY')).update(token).digest('base64url');
}
function createDownloadUrl(path: string, userId: string) {
  const token = Buffer.from(JSON.stringify({ path, userId, expiresAt: Date.now() + 60_000 })).toString('base64url');
  const signature = signDownloadToken(token);
  return `/api/resume-company-upload?download=${encodeURIComponent(token)}&signature=${encodeURIComponent(signature)}`;
}
function readDownloadToken(token: string, signature: string) {
  const expected = Buffer.from(signDownloadToken(token), 'base64url');
  const actual = Buffer.from(signature, 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error('INVALID_DOWNLOAD_TOKEN');
  const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as {
    path?: string;
    userId?: string;
    expiresAt?: number;
  };
  if (
    typeof payload.path !== 'string'
    || typeof payload.userId !== 'string'
    || typeof payload.expiresAt !== 'number'
    || payload.expiresAt < Date.now()
    || payload.expiresAt > Date.now() + 120_000
    || !payload.path.startsWith(`${payload.userId}/`)
    || !/\.(pdf|docx)$/i.test(payload.path)
  ) throw new Error('INVALID_DOWNLOAD_TOKEN');
  return payload.path;
}
async function ownsResume(userId: string, resumeId: string) {
  const query = new URLSearchParams({ id: `eq.${resumeId}`, user_id: `eq.${userId}`, select: 'id', limit: '1' });
  const result = await fetch(`${required('SUPABASE_URL').replace(/\/$/, '')}/rest/v1/resumes?${query}`, {
    headers: serviceHeaders('application/json'),
  });
  if (!result.ok) throw new Error('RESUME_LOOKUP_FAILED');
  const rows = await result.json() as Array<{ id?: string }>;
  return rows[0]?.id === resumeId;
}
async function insertResumeFile(input: {
  userId: string;
  resumeId: string;
  fileName: string;
  path: string;
  kind: 'resume' | 'script';
  size: number;
}) {
  const result = await fetch(`${required('SUPABASE_URL').replace(/\/$/, '')}/rest/v1/resume_files`, {
    method: 'POST',
    headers: { ...serviceHeaders('application/json'), Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: input.userId,
      resume_id: input.resumeId,
      file_name: input.fileName,
      file_path: input.path,
      kind: input.kind,
      size: input.size,
      source: 'upload',
    }),
  });
  if (!result.ok) throw new Error('RESUME_FILE_INSERT_FAILED');
  const rows = await result.json() as Array<Record<string, unknown>>;
  if (!rows[0]) throw new Error('RESUME_FILE_INSERT_FAILED');
  return rows[0];
}

export default async function handler(request: NativeRequest, response: NativeResponse) {
  setCors(request, response);
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method === 'GET') {
    try {
      const path = readDownloadToken(queryValue(request, 'download'), queryValue(request, 'signature'));
      const downloaded = await fetch(objectUrl('resumes', path), { headers: serviceHeaders() });
      if (!downloaded.ok) return response.status(downloaded.status === 404 ? 404 : 503).json({ error: '简历文件读取失败。' });
      const extension = path.split('.').pop()?.toLowerCase();
      response.setHeader('Content-Type', extension === 'pdf' ? 'application/pdf' : DOCX_MIME_TYPE);
      response.setHeader('Content-Disposition', 'inline');
      return response.status(200).end(Buffer.from(await downloaded.arrayBuffer()));
    } catch {
      return response.status(403).json({ error: '简历下载地址无效或已过期。' });
    }
  }
  if (!['POST', 'DELETE'].includes(request.method ?? '')) return response.status(405).json({ error: 'Method not allowed' });
  try {
    const userId = await requireUserId(request);
    if (!rateLimit(`resume-upload:${userId}:${clientIp(request)}`)) return response.status(429).json({ error: '上传请求过于频繁，请稍后再试。' });
    const body = readBody(request);
    const resumeLibrary = body.storage_scope === 'resume-library';
    const bucket = resumeLibrary ? 'resumes' : 'company-resumes';
    if (request.method === 'POST' && resumeLibrary && body.action === 'create-download-url') {
      const path = typeof body.path === 'string' ? body.path : '';
      if (!path.startsWith(`${userId}/`) || !/\.(pdf|docx)$/i.test(path)) {
        return response.status(400).json({ error: '无效的简历路径。' });
      }
      return response.status(200).json({ url: createDownloadUrl(path, userId) });
    }
    if (request.method === 'DELETE') {
      const path = typeof body.path === 'string' ? body.path : '';
      if (!path.startsWith(`${userId}/`) || !/\.(pdf|docx)$/i.test(path)) return response.status(400).json({ error: '无效的简历路径。' });
      const deleted = await fetch(objectUrl(bucket, path), { method: 'DELETE', headers: serviceHeaders() });
      if (!deleted.ok && deleted.status !== 404) throw new Error('STORAGE_DELETE_FAILED');
      return response.status(200).json({ ok: true });
    }

    const { extension, file, baseName } = fileFromBody(body);
    const resumeId = typeof body.resume_id === 'string' ? body.resume_id : '';
    const kind = body.kind === 'script' ? 'script' : 'resume';
    if (resumeLibrary && (!UUID_PATTERN.test(resumeId) || !await ownsResume(userId, resumeId))) {
      return response.status(403).json({ error: '无权向这份简历上传文件。' });
    }
    const path = resumeLibrary
      ? `${userId}/${resumeId}/${Date.now()}_${crypto.randomUUID()}.${extension}`
      : `${userId}/${Date.now()}_${crypto.randomUUID()}_${baseName}.${extension}`;
    const contentType = extension === 'pdf' ? 'application/pdf' : DOCX_MIME_TYPE;
    const uploaded = await fetch(objectUrl(bucket, path), { method: 'POST', headers: { ...serviceHeaders(contentType), 'x-upsert': 'false', 'cache-control': '3600' }, body: file });
    if (!uploaded.ok) {
      console.error('resume-company-upload storage failure', { status: uploaded.status, userId, bucket });
      throw new Error('STORAGE_UPLOAD_FAILED');
    }
    if (resumeLibrary) {
      try {
        const resumeFile = await insertResumeFile({
          userId,
          resumeId,
          fileName: typeof body.file_name === 'string' ? body.file_name.slice(0, 180) : `${baseName}.${extension}`,
          path,
          kind,
          size: file.length,
        });
        return response.status(200).json({ path, file: resumeFile });
      } catch (error) {
        await fetch(objectUrl(bucket, path), { method: 'DELETE', headers: serviceHeaders() });
        throw error;
      }
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
