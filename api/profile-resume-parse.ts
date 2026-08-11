// Node runtime is required by pdf-parse.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore pdf-parse ships CommonJS without TypeScript declarations.
// Import the public package entry so Vercel traces the complete dependency.
import pdfParse from 'pdf-parse';
import { requireUserFromToken } from './_lib/auth';
import { header, nodeClientIp, parseNodeBody, setNodeCors, type NodeRequest, type NodeResponse } from './_lib/node-http';
import { rateLimit } from './_lib/rate-limit';

export default async function handler(request: NodeRequest, response: NodeResponse) {
  setNodeCors(request, response);
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await requireUserFromToken(header(request, 'authorization'));
    if (!rateLimit(`resume-parse:${user.id}:${nodeClientIp(request)}`, 8, 60_000)) return response.status(429).json({ error: '解析请求过于频繁，请稍后再试。' });
    const body = parseNodeBody<{ file_data?: unknown; file_name?: unknown }>(request);
    const fileName = typeof body.file_name === 'string' ? body.file_name.slice(0, 180) : '';
    const encoded = typeof body.file_data === 'string' ? body.file_data : '';
    if (!/\.pdf$/i.test(fileName)) return response.status(400).json({ error: '服务器解析仅支持 PDF；DOCX 会在浏览器本地读取。' });
    if (!/^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(encoded)) return response.status(400).json({ error: 'PDF 文件格式无效。' });
    const base64 = encoded.slice(encoded.indexOf(',') + 1);
    if (base64.length > 14_000_000) return response.status(413).json({ error: 'PDF 不能超过 10MB。' });
    const result = await pdfParse(Buffer.from(base64, 'base64'));
    const text = String(result.text ?? '').split(String.fromCharCode(0)).join('').trim().slice(0, 60_000);
    if (text.length < 20) return response.status(422).json({ error: '没有从 PDF 中读取到足够文字；扫描版请先转换为可复制文字的 PDF。' });
    return response.status(200).json({ text });
  } catch (error) {
    const unauthorized = error instanceof Error && /Unauthorized/.test(error.message);
    if (!unauthorized) console.error('profile-resume-parse failed', error);
    return response.status(unauthorized ? 401 : 500).json({ error: unauthorized ? 'Unauthorized' : 'PDF 解析失败。' });
  }
}
