// Node runtime is required by pdf-parse.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore pdf-parse ships CommonJS; Vercel bundles it for Node functions.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { requireUserFromJwt } from './_lib/auth';
import { handleOptions, json } from './_lib/cors';
import { clientIp, rateLimit } from './_lib/rate-limit';

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') return handleOptions(request);
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405);
  try {
    const user = await requireUserFromJwt(request);
    if (!rateLimit(`resume-parse:${user.id}:${clientIp(request)}`, 8, 60_000)) return json(request, { error: '解析请求过于频繁，请稍后再试。' }, 429);
    const body = await request.json() as { file_data?: unknown; file_name?: unknown };
    const fileName = typeof body.file_name === 'string' ? body.file_name.slice(0, 180) : '';
    const encoded = typeof body.file_data === 'string' ? body.file_data : '';
    if (!/\.pdf$/i.test(fileName)) return json(request, { error: '服务器解析仅支持 PDF；DOCX 会在浏览器本地读取。' }, 400);
    if (!/^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(encoded)) return json(request, { error: 'PDF 文件格式无效。' }, 400);
    const base64 = encoded.slice(encoded.indexOf(',') + 1);
    if (base64.length > 14_000_000) return json(request, { error: 'PDF 不能超过 10MB。' }, 413);
    const result = await pdfParse(Buffer.from(base64, 'base64'));
    const text = String(result.text ?? '').split(String.fromCharCode(0)).join('').trim().slice(0, 60_000);
    if (text.length < 20) return json(request, { error: '没有从 PDF 中读取到足够文字；扫描版请先转换为可复制文字的 PDF。' }, 422);
    return json(request, { text });
  } catch (error) {
    const unauthorized = error instanceof Error && /Unauthorized/.test(error.message);
    return json(request, { error: unauthorized ? 'Unauthorized' : 'PDF 解析失败。' }, unauthorized ? 401 : 500);
  }
}
