/**
 * 网易 163 IMAP 拉取（Node.js runtime，非 Edge）
 * - 前端传入邮箱 + 客户端授权码（不落服务端日志）
 * - 仅返回主题/发件人/时间/摘要，不转发完整 HTML 正文（降低 XSS 风险）
 * - CORS 白名单与其他 API 一致
 */
import { ImapFlow } from 'imapflow';

export const config = { runtime: 'nodejs', maxDuration: 30 };

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowed = new Set<string>([
    'http://localhost:5173',
    'http://localhost:8080',
    'https://sugar-job-system.vercel.app',
  ]);
  const envOrigin = process.env.ALLOWED_ORIGIN;
  const vercelUrl = process.env.VERCEL_URL;
  if (envOrigin) allowed.add(envOrigin);
  if (vercelUrl) allowed.add(`https://${vercelUrl}`);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (allowed.has(origin) || host.endsWith('.vercel.app')) {
        headers['Access-Control-Allow-Origin'] = origin;
      }
    } catch {
      /* ignore invalid origin */
    }
  }
  return headers;
}

function isNeteaseEmail(email: string) {
  return /^[^\s@]+@(163|126|yeah)\.com$/i.test(email.trim());
}

function stripHtml(input: string) {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/&/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeMimeWord(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_m, _charset: string, enc: string, data: string) => {
      try {
        if (enc.toUpperCase() === 'B') {
          return Buffer.from(data, 'base64').toString('utf8');
        }
        const bytes = data
          .replace(/_/g, ' ')
          .replace(/=([0-9A-Fa-f]{2})/g, (_x, hex: string) => String.fromCharCode(parseInt(hex, 16)));
        return Buffer.from(bytes, 'binary').toString('utf8');
      } catch {
        return data;
      }
    })
    .trim();
}

function formatAddress(addr: { name?: string; address?: string } | undefined) {
  if (!addr) return '';
  const name = decodeMimeWord(addr.name);
  if (name && addr.address) return `${name} <${addr.address}>`;
  return addr.address || name || '';
}

export default async function handler(req: Request): Promise<Response> {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors });
  }

  let body: {
    email?: string;
    authCode?: string;
    limit?: number;
    uid?: number;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '无效的 JSON' }, { status: 400, headers: cors });
  }

  const email = (body.email ?? '').trim();
  const authCode = (body.authCode ?? '').trim();
  const limit = Math.min(50, Math.max(5, Number(body.limit) || 20));
  const focusUid = body.uid != null ? Number(body.uid) : null;

  if (!email || !authCode) {
    return Response.json({ error: '请提供邮箱地址与客户端授权码' }, { status: 400, headers: cors });
  }
  if (!isNeteaseEmail(email)) {
    return Response.json({ error: '目前仅支持 163/126/yeah 网易邮箱' }, { status: 400, headers: cors });
  }
  if (authCode.length < 6 || authCode.length > 64) {
    return Response.json({ error: '授权码格式不正确' }, { status: 400, headers: cors });
  }

  const client = new ImapFlow({
    host: 'imap.163.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: authCode },
    logger: false,
    emitLogs: false,
  });

  try {
    await client.connect();
    // 网易 IMAP 可能要求客户端 ID（可选）
    try {
      const anyClient = client as unknown as { id?: (info: Record<string, string>) => Promise<unknown> };
      if (typeof anyClient.id === 'function') {
        await anyClient.id({ name: 'SugarJobSystem', version: '1.0.0' });
      }
    } catch {
      /* optional */
    }

    const lock = await client.getMailboxLock('INBOX');
    try {
      const status = await client.status('INBOX', { messages: true, unseen: true });
      const total = status.messages ?? 0;
      if (total === 0) {
        return Response.json({ messages: [], total: 0, unseen: 0 }, { headers: cors });
      }

      if (focusUid != null && Number.isFinite(focusUid)) {
        const msg = await client.fetchOne(String(focusUid), {
          uid: true,
          envelope: true,
          flags: true,
          bodyStructure: true,
          source: { start: 0, maxLength: 12000 },
        }, { uid: true });
        if (!msg) {
          return Response.json({ error: '邮件不存在' }, { status: 404, headers: cors });
        }
        const env = msg.envelope;
        const raw = msg.source ? msg.source.toString('utf8') : '';
        const snippet = stripHtml(raw).slice(0, 800);
        return Response.json({
          message: {
            uid: msg.uid,
            subject: decodeMimeWord(env?.subject) || '（无主题）',
            from: formatAddress(env?.from?.[0]),
            date: env?.date ? new Date(env.date).toISOString() : null,
            snippet,
            seen: msg.flags?.has('\\Seen') ?? false,
            hasAttachment: Boolean(msg.bodyStructure && JSON.stringify(msg.bodyStructure).includes('"disposition":"attachment"')),
          },
        }, { headers: cors });
      }

      const start = Math.max(1, total - limit + 1);
      const messages: Array<{
        uid: number;
        subject: string;
        from: string;
        date: string | null;
        snippet: string;
        seen: boolean;
        hasAttachment: boolean;
      }> = [];

      for await (const msg of client.fetch(`${start}:*`, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        source: { start: 0, maxLength: 4000 },
      })) {
        const env = msg.envelope;
        const raw = msg.source ? msg.source.toString('utf8') : '';
        messages.push({
          uid: msg.uid,
          subject: decodeMimeWord(env?.subject) || '（无主题）',
          from: formatAddress(env?.from?.[0]),
          date: env?.date ? new Date(env.date).toISOString() : null,
          snippet: stripHtml(raw).slice(0, 180),
          seen: msg.flags?.has('\\Seen') ?? false,
          hasAttachment: Boolean(msg.bodyStructure && JSON.stringify(msg.bodyStructure).includes('"disposition":"attachment"')),
        });
      }

      messages.sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0;
        const tb = b.date ? new Date(b.date).getTime() : 0;
        return tb - ta;
      });

      return Response.json({
        messages: messages.slice(0, limit),
        total,
        unseen: status.unseen ?? 0,
      }, { headers: cors });
    } finally {
      lock.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const safe = message
      .replace(authCode, '***')
      .replace(/password[^\s]*/gi, '***');
    let hint = safe;
    if (/AUTHENTICATIONFAILED|Invalid login|LOGIN failed|auth/i.test(safe)) {
      hint = '登录失败：请确认已开启 IMAP，并使用「客户端授权码」而非登录密码。';
    } else if (/timeout|ECONN|ENOTFOUND|certificate/i.test(safe)) {
      hint = '无法连接网易 IMAP，请稍后重试或检查网络。';
    }
    return Response.json({ error: hint }, { status: 502, headers: cors });
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}
