/**
 * 网易 163 IMAP 拉取（Node.js serverless，与 parse-resume 相同 handler 风格）
 * - 前端传入邮箱 + 客户端授权码（不写日志）
 * - 仅返回主题/发件人/时间/纯文本摘要
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — imapflow CJS interop on Vercel
import { ImapFlow } from 'imapflow';

export const config = {
  maxDuration: 30,
};

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

function setCors(res: { setHeader: (k: string, v: string) => void }, req: { headers?: Record<string, string | string[] | undefined> }) {
  const originRaw = req.headers?.origin;
  const origin = Array.isArray(originRaw) ? originRaw[0] : originRaw || '';
  const allowed = new Set<string>([
    'http://localhost:5173',
    'http://localhost:8080',
    'https://sugar-job-system.vercel.app',
  ]);
  if (process.env.ALLOWED_ORIGIN) allowed.add(process.env.ALLOWED_ORIGIN);
  if (process.env.VERCEL_URL) allowed.add(`https://${process.env.VERCEL_URL}`);

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (allowed.has(origin) || host.endsWith('.vercel.app')) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    } catch {
      /* ignore */
    }
  }
}

export default async function handler(req: any, res: any) {
  setCors(res, req);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const body = (req.body || {}) as {
    email?: string;
    authCode?: string;
    limit?: number;
    uid?: number;
  };

  const email = (body.email ?? '').trim();
  const authCode = (body.authCode ?? '').trim();
  const limit = Math.min(50, Math.max(5, Number(body.limit) || 20));
  const focusUid = body.uid != null ? Number(body.uid) : null;

  if (!email || !authCode) {
    res.status(400).json({ error: '请提供邮箱地址与客户端授权码' });
    return;
  }
  if (!isNeteaseEmail(email)) {
    res.status(400).json({ error: '目前仅支持 163/126/yeah 网易邮箱' });
    return;
  }
  if (authCode.length < 6 || authCode.length > 64) {
    res.status(400).json({ error: '授权码格式不正确' });
    return;
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

    try {
      const anyClient = client as unknown as { id?: (info: Record<string, string>) => Promise<unknown> };
      if (typeof anyClient.id === 'function') {
        await anyClient.id({ name: 'SugarJobSystem', version: '1.0.0' });
      }
    } catch {
      /* 网易 ID 命令可选 */
    }

    const lock = await client.getMailboxLock('INBOX');
    try {
      const status = await client.status('INBOX', { messages: true, unseen: true });
      const total = status.messages ?? 0;
      if (total === 0) {
        res.status(200).json({ messages: [], total: 0, unseen: 0 });
        return;
      }

      if (focusUid != null && Number.isFinite(focusUid)) {
        const msg = await client.fetchOne(
          String(focusUid),
          {
            uid: true,
            envelope: true,
            flags: true,
            bodyStructure: true,
            source: { start: 0, maxLength: 12000 },
          },
          { uid: true },
        );
        if (!msg) {
          res.status(404).json({ error: '邮件不存在' });
          return;
        }
        const env = msg.envelope;
        const raw = msg.source ? msg.source.toString('utf8') : '';
        res.status(200).json({
          message: {
            uid: msg.uid,
            subject: decodeMimeWord(env?.subject) || '（无主题）',
            from: formatAddress(env?.from?.[0]),
            date: env?.date ? new Date(env.date).toISOString() : null,
            snippet: stripHtml(raw).slice(0, 800),
            seen: msg.flags?.has('\\Seen') ?? false,
            hasAttachment: Boolean(
              msg.bodyStructure && JSON.stringify(msg.bodyStructure).includes('"disposition":"attachment"'),
            ),
          },
        });
        return;
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
          hasAttachment: Boolean(
            msg.bodyStructure && JSON.stringify(msg.bodyStructure).includes('"disposition":"attachment"'),
          ),
        });
      }

      messages.sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0;
        const tb = b.date ? new Date(b.date).getTime() : 0;
        return tb - ta;
      });

      res.status(200).json({
        messages: messages.slice(0, limit),
        total,
        unseen: status.unseen ?? 0,
      });
    } finally {
      lock.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // 脱敏：绝不回显授权码
    const safe = message.replace(authCode, '***').replace(/password[^\s]*/gi, '***');
    let hint = safe;
    if (/AUTHENTICATIONFAILED|Invalid login|LOGIN failed|auth/i.test(safe)) {
      hint = '登录失败：请确认已开启 IMAP，并使用「客户端授权码」而非登录密码。';
    } else if (/timeout|ECONN|ENOTFOUND|certificate/i.test(safe)) {
      hint = '无法连接网易 IMAP，请稍后重试。';
    } else if (/FUNCTION_INVOCATION|socket|TLS/i.test(safe)) {
      hint = '邮件服务暂时不可用，请稍后重试。';
    }
    res.status(502).json({ error: hint });
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}
