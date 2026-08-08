/**
 * 网易 163/126/yeah IMAP（纯 TLS 命令）
 * 顺序：CONNECT → CAPABILITY → ID → LOGIN → SELECT → FETCH
 * 绝不打印授权码。
 */
import tls from 'node:tls';

export const config = { maxDuration: 30 };

type MailItem = {
  uid: number;
  subject: string;
  from: string;
  date: string | null;
  snippet: string;
  seen: boolean;
  hasAttachment: boolean;
};

function isNeteaseEmail(email: string) {
  return /^[^\s@]+@(163|126|yeah)\.com$/i.test(email.trim());
}

function setCors(res: any, req: any) {
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

function stripHtml(input: string) {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeMimeWord(value: string): string {
  if (!value) return '';
  return value
    .replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_m, _cs: string, enc: string, data: string) => {
      try {
        if (enc.toUpperCase() === 'B') return Buffer.from(data, 'base64').toString('utf8');
        const bytes = data
          .replace(/_/g, ' ')
          .replace(/=([0-9A-Fa-f]{2})/g, (_x, hex: string) => String.fromCharCode(parseInt(hex, 16)));
        return Buffer.from(bytes, 'binary').toString('utf8');
      } catch {
        return data;
      }
    })
    .replace(/^"+|"+$/g, '')
    .trim();
}

function decodeQuotedPrintable(input: string) {
  try {
    const normalized = input.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_m, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
    return Buffer.from(normalized, 'binary').toString('utf8');
  } catch {
    return input;
  }
}

function imapQuoted(s: string) {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** 支持 IMAP literal {n} 的会话 */
class ImapSession {
  private socket: tls.TLSSocket | null = null;
  private chunks: Buffer[] = [];
  private tagSeq = 0;

  async connect(host: string, port: number) {
    await new Promise<void>((resolve, reject) => {
      const socket = tls.connect(
        { host, port, servername: host, rejectUnauthorized: true, minVersion: 'TLSv1.2' },
        () => resolve(),
      );
      socket.setTimeout(28000);
      socket.on('timeout', () => socket.destroy(new Error('连接网易邮箱超时')));
      socket.on('error', reject);
      socket.on('data', (buf: Buffer) => {
        this.chunks.push(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
      });
      this.socket = socket;
    });
    // greeting
    await this.readLine();
  }

  private buf(): Buffer {
    if (this.chunks.length === 0) return Buffer.alloc(0);
    if (this.chunks.length === 1) return this.chunks[0];
    const b = Buffer.concat(this.chunks);
    this.chunks = [b];
    return b;
  }

  private consume(n: number) {
    const b = this.buf();
    const out = b.subarray(0, n);
    const rest = b.subarray(n);
    this.chunks = rest.length ? [rest] : [];
    return out;
  }

  private async waitBytes(min: number, ms = 20000) {
    const start = Date.now();
    while (this.buf().length < min) {
      if (!this.socket || this.socket.destroyed) throw new Error('连接已断开');
      if (Date.now() - start > ms) throw new Error('读取超时');
      await new Promise((r) => setTimeout(r, 15));
    }
  }

  private async readLine(): Promise<string> {
    const start = Date.now();
    while (true) {
      const b = this.buf();
      const idx = b.indexOf(0x0a); // \n
      if (idx >= 0) {
        const lineBuf = this.consume(idx + 1);
        return lineBuf.toString('utf8').replace(/\r?\n$/, '');
      }
      if (!this.socket || this.socket.destroyed) throw new Error('连接已断开');
      if (Date.now() - start > 20000) throw new Error('读取行超时');
      await new Promise((r) => setTimeout(r, 15));
    }
  }

  private async readLiteral(size: number): Promise<Buffer> {
    await this.waitBytes(size);
    return this.consume(size);
  }

  private nextTag() {
    this.tagSeq += 1;
    return `A${String(this.tagSeq).padStart(3, '0')}`;
  }

  async command(cmd: string): Promise<string[]> {
    if (!this.socket || this.socket.destroyed) throw new Error('未连接');
    const tag = this.nextTag();
    this.socket.write(`${tag} ${cmd}\r\n`);

    const lines: string[] = [];
    while (true) {
      const line = await this.readLine();
      // literal marker at end: ... {123}
      const lit = line.match(/\{(\d+)\}$/);
      if (lit && !line.startsWith(tag)) {
        const size = Number(lit[1]);
        const data = await this.readLiteral(size);
        lines.push(line);
        lines.push(data.toString('utf8'));
        // after literal, IMAP may send closing ) on next lines without extra wait
        continue;
      }
      lines.push(line);
      if (line.startsWith(`${tag} `)) {
        if (line.startsWith(`${tag} NO`) || line.startsWith(`${tag} BAD`)) {
          throw new Error(line.slice(tag.length + 1).trim());
        }
        return lines;
      }
    }
  }

  async logout() {
    try {
      if (this.socket && !this.socket.destroyed) {
        await this.command('LOGOUT').catch(() => undefined);
        this.socket.end();
      }
    } catch {
      this.socket?.destroy();
    }
  }
}

function parseHeaderBlock(headers: string) {
  const get = (name: string) => {
    const re = new RegExp(`^${name}:\\s*([\\s\\S]*?)(?=\\r?\\n\\S|\\r?\\n\\r?\\n|$)`, 'im');
    const m = headers.match(re);
    if (!m) return '';
    return decodeMimeWord(m[1].replace(/\r?\n[ \t]+/g, ' ').trim());
  };
  return {
    subject: get('Subject') || '（无主题）',
    from: get('From'),
    dateRaw: get('Date'),
  };
}

function parseFetchResponse(lines: string[]): MailItem[] {
  const items: MailItem[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!/^\* \d+ FETCH \(/i.test(line)) {
      i += 1;
      continue;
    }

    // accumulate structured lines + literals until matching close for this FETCH is hard;
    // walk forward collecting uid/flags/header/body
    let uid = 0;
    let flags = '';
    let headers = '';
    let body = '';
    let j = i;
    while (j < lines.length) {
      const L = lines[j];
      const uidM = L.match(/UID (\d+)/i);
      if (uidM) uid = Number(uidM[1]);
      const flagsM = L.match(/FLAGS \(([^)]*)\)/i);
      if (flagsM) flags = flagsM[1];

      if (/BODY\[HEADER/i.test(L) && /\{(\d+)\}$/.test(L) && lines[j + 1] != null) {
        headers = lines[j + 1];
        j += 2;
        continue;
      }
      if (/BODY\[TEXT/i.test(L) && /\{(\d+)\}$/.test(L) && lines[j + 1] != null) {
        body = lines[j + 1];
        j += 2;
        continue;
      }
      // end of this fetch block roughly when we see next * n FETCH or tag line
      if (j > i && (/^\* \d+ FETCH \(/i.test(L) || /^A\d{3} /.test(L))) break;
      j += 1;
    }

    if (uid) {
      const meta = parseHeaderBlock(headers);
      const date = meta.dateRaw ? new Date(meta.dateRaw) : null;
      items.push({
        uid,
        subject: meta.subject,
        from: meta.from,
        date: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
        snippet: stripHtml(decodeQuotedPrintable(body)).slice(0, 200),
        seen: /\\Seen/i.test(flags),
        hasAttachment: /attachment/i.test(headers + body),
      });
    }
    i = Math.max(j, i + 1);
  }
  return items;
}

async function fetchMails(email: string, authCode: string, limit: number, focusUid: number | null) {
  const lower = email.toLowerCase();
  const host = lower.endsWith('@126.com')
    ? 'imap.126.com'
    : lower.endsWith('@yeah.com')
      ? 'imap.yeah.net'
      : 'imap.163.com';

  const session = new ImapSession();
  try {
    await session.connect(host, 993);
    await session.command('CAPABILITY');
    await session.command(
      'ID ("name" "SugarJobSystem" "version" "1.0.0" "vendor" "Sugar" "support-email" "noreply@sugar.local")',
    );
    await session.command(`LOGIN ${imapQuoted(email)} ${imapQuoted(authCode)}`);

    const selectLines = await session.command('SELECT INBOX');
    const existsLine = selectLines.find((l) => /\* (\d+) EXISTS/i.test(l));
    const total = existsLine ? Number(existsLine.match(/\* (\d+) EXISTS/i)![1]) : 0;

    let unseen = 0;
    try {
      const st = await session.command('STATUS INBOX (MESSAGES UNSEEN)');
      const joined = st.join('\n');
      const um = joined.match(/UNSEEN (\d+)/i);
      if (um) unseen = Number(um[1]);
    } catch {
      /* optional */
    }

    if (total === 0) return { messages: [] as MailItem[], total: 0, unseen: 0 };

    if (focusUid != null && Number.isFinite(focusUid)) {
      const lines = await session.command(
        `UID FETCH ${focusUid} (UID FLAGS BODY.PEEK[HEADER.FIELDS (SUBJECT FROM DATE)] BODY.PEEK[TEXT]<0.8000>)`,
      );
      const items = parseFetchResponse(lines);
      const one = items[0];
      if (!one) throw new Error('邮件不存在或无法解析');
      return {
        message: { ...one, snippet: one.snippet.slice(0, 800) },
      };
    }

    const start = Math.max(1, total - limit + 1);
    const lines = await session.command(
      `FETCH ${start}:${total} (UID FLAGS BODY.PEEK[HEADER.FIELDS (SUBJECT FROM DATE)] BODY.PEEK[TEXT]<0.2500>)`,
    );
    const messages = parseFetchResponse(lines).sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });

    return { messages: messages.slice(0, limit), total, unseen };
  } finally {
    await session.logout();
  }
}

function friendlyError(raw: string, authCode: string) {
  const safe = raw.split(authCode).join('***');
  if (/Login error|password error|AUTHENTICATION|Invalid credentials|NO LOGIN/i.test(safe)) {
    return '登录失败：邮箱或授权码不正确。请到 163 网页版 → 设置 → POP3/SMTP/IMAP → 关闭再开启 IMAP → 重新生成授权码 → 本页点「更新账号」后再同步。';
  }
  if (/Unsafe Login/i.test(safe)) {
    return '网易拒绝不安全登录。请确认 IMAP 已开启后重试。';
  }
  if (/timeout|超时|ECONN|ENOTFOUND|断开|ECONNRESET|EAI_AGAIN/i.test(safe)) {
    return '连接网易服务器失败（网络波动或云主机被限制）。请 1 分钟后重试。';
  }
  if (/Too many|limit|频繁|rate/i.test(safe)) {
    return '操作太频繁，请等几分钟再同步。';
  }
  return (safe || '同步失败').slice(0, 220);
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
  const authCode = (body.authCode ?? '').trim().replace(/\s+/g, '');
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
    res.status(400).json({ error: '授权码长度不对。163 客户端授权码一般为 16 位，请重新生成后完整粘贴。' });
    return;
  }

  try {
    const result = await fetchMails(email, authCode, limit, focusUid);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(502).json({ error: friendlyError(message, authCode) });
  }
}
