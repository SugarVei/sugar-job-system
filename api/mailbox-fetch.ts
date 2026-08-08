/**
 * 多邮箱 IMAP：网易 / QQ / Gmail / Outlook / 自定义学校邮箱
 * 列表 ENVELOPE；详情优先 HTML，净化后返回
 */
import tls from 'node:tls';

export const config = { maxDuration: 30 };

type MailItem = {
  uid: number;
  subject: string;
  from: string;
  date: string | null;
  snippet: string;
  html?: string;
  seen: boolean;
  hasAttachment: boolean;
};

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

function decodeTransfer(body: string, encoding: string) {
  const enc = encoding.toLowerCase();
  if (enc.includes('base64')) {
    try {
      return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8');
    } catch {
      return body;
    }
  }
  if (enc.includes('quoted-printable')) return decodeQuotedPrintable(body);
  return body;
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

function sanitizeEmailHtml(html: string): string {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<link[\s\S]*?>/gi, '')
    .replace(/<meta[\s\S]*?>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, 'data:blocked');
  if (h.length > 400_000) h = h.slice(0, 400_000);
  return h;
}

function extractMimeParts(raw: string): { text: string; html: string; hasAttachment: boolean } {
  const hasAttachment = /Content-Disposition:\s*attachment/i.test(raw) || /filename=/i.test(raw);
  if (!/Content-Type:/i.test(raw) && !/^--/.test(raw.trim())) {
    if (/<\/?(html|body|div|p|table|span)\b/i.test(raw)) {
      return { text: stripHtml(raw), html: sanitizeEmailHtml(raw), hasAttachment };
    }
    return { text: raw.trim(), html: '', hasAttachment };
  }

  const boundaryM = raw.match(/boundary="?([^";\r\n]+)"?/i);
  const parts = boundaryM
    ? raw.split(new RegExp(`--${boundaryM[1].replace(/^"+|"+$/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:--)?`))
    : [raw];

  let bestText = '';
  let bestHtml = '';

  for (const part of parts) {
    if (!part || part.length < 8) continue;
    const headerEnd = part.search(/\r?\n\r?\n/);
    if (headerEnd < 0) continue;
    const headers = part.slice(0, headerEnd);
    let body = part.slice(headerEnd).replace(/^\r?\n\r?\n/, '').replace(/^\r?\n/, '');
    const ctype = (headers.match(/Content-Type:\s*([^\r\n;]+)/i)?.[1] || '').toLowerCase();
    const cte = headers.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i)?.[1] || '7bit';
    if (/multipart\//i.test(ctype)) {
      const nested = extractMimeParts(part);
      if (nested.html && nested.html.length > bestHtml.length) bestHtml = nested.html;
      if (nested.text && nested.text.length > bestText.length) bestText = nested.text;
      continue;
    }
    body = decodeTransfer(body, cte);
    if (ctype.includes('text/html')) {
      const cleaned = sanitizeEmailHtml(body);
      if (cleaned.length > bestHtml.length) bestHtml = cleaned;
    } else if (ctype.includes('text/plain')) {
      if (body.trim().length > bestText.length) bestText = body.trim();
    }
  }

  if (!bestHtml && !bestText) {
    const headerEnd = raw.search(/\r?\n\r?\n/);
    const headers = headerEnd >= 0 ? raw.slice(0, headerEnd) : '';
    let body = headerEnd >= 0 ? raw.slice(headerEnd).replace(/^\r?\n\r?\n/, '') : raw;
    const cte = headers.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i)?.[1] || '';
    body = decodeTransfer(body, cte);
    if (/<\/?[a-z][\s\S]*>/i.test(body)) bestHtml = sanitizeEmailHtml(body);
    else bestText = body.trim();
  }

  if (!bestText && bestHtml) bestText = stripHtml(bestHtml);
  if (!bestHtml && bestText) {
    bestHtml = sanitizeEmailHtml(
      `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.75;color:#222;white-space:pre-wrap">${bestText
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')}</div>`,
    );
  }

  return { text: bestText, html: bestHtml, hasAttachment };
}

function imapQuoted(s: string) {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function resolveImapHost(email: string, provider?: string, customHost?: string): { host: string; port: number; needId: boolean } {
  if (customHost && customHost.trim()) {
    return { host: customHost.trim(), port: 993, needId: false };
  }
  const lower = email.toLowerCase();
  const domain = lower.split('@')[1] || '';
  const p = (provider || '').toLowerCase();

  if (p === 'qq' || domain === 'qq.com' || domain === 'foxmail.com') {
    return { host: 'imap.qq.com', port: 993, needId: false };
  }
  if (p === 'gmail' || domain === 'gmail.com' || domain === 'googlemail.com') {
    return { host: 'imap.gmail.com', port: 993, needId: false };
  }
  if (p === 'outlook' || /outlook\.|hotmail\.|live\.|msn\./i.test(domain)) {
    return { host: 'outlook.office365.com', port: 993, needId: false };
  }
  if (domain === '126.com') return { host: 'imap.126.com', port: 993, needId: true };
  if (domain === 'yeah.com') return { host: 'imap.yeah.net', port: 993, needId: true };
  if (p === 'netease163' || domain === '163.com' || !p) {
    return { host: 'imap.163.com', port: 993, needId: true };
  }
  return { host: `imap.${domain}`, port: 993, needId: false };
}

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
      socket.on('timeout', () => socket.destroy(new Error('连接邮箱服务器超时')));
      socket.on('error', reject);
      socket.on('data', (buf: Buffer) => {
        this.chunks.push(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
      });
      this.socket = socket;
    });
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

  private async readLine(): Promise<string> {
    const start = Date.now();
    while (true) {
      const b = this.buf();
      const idx = b.indexOf(0x0a);
      if (idx >= 0) return this.consume(idx + 1).toString('utf8').replace(/\r?\n$/, '');
      if (!this.socket || this.socket.destroyed) throw new Error('连接已断开');
      if (Date.now() - start > 20000) throw new Error('读取行超时');
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  private async readLiteral(size: number): Promise<Buffer> {
    const start = Date.now();
    while (this.buf().length < size) {
      if (!this.socket || this.socket.destroyed) throw new Error('连接已断开');
      if (Date.now() - start > 20000) throw new Error('读取超时');
      await new Promise((r) => setTimeout(r, 10));
    }
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
      const lit = line.match(/\{(\d+)\}$/);
      if (lit && !line.startsWith(tag)) {
        const data = await this.readLiteral(Number(lit[1]));
        lines.push(line);
        lines.push(data.toString('utf8'));
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

function tokenizeImapList(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const s = input;
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\t') {
      i += 1;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push(ch);
      i += 1;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let out = '';
      while (j < s.length) {
        if (s[j] === '\\' && j + 1 < s.length) {
          out += s[j + 1];
          j += 2;
          continue;
        }
        if (s[j] === '"') break;
        out += s[j];
        j += 1;
      }
      tokens.push(out);
      i = j + 1;
      continue;
    }
    let j = i;
    while (j < s.length && !/[\s()]/.test(s[j])) j += 1;
    tokens.push(s.slice(i, j));
    i = j;
  }
  return tokens;
}

function parseListValue(tokens: string[], idx: { i: number }): unknown {
  const t = tokens[idx.i];
  if (t === '(') {
    idx.i += 1;
    const arr: unknown[] = [];
    while (idx.i < tokens.length && tokens[idx.i] !== ')') {
      arr.push(parseListValue(tokens, idx));
    }
    if (tokens[idx.i] === ')') idx.i += 1;
    return arr;
  }
  idx.i += 1;
  if (t === 'NIL' || t === 'nil') return null;
  return t ?? null;
}

function formatAddressList(addr: unknown): string {
  if (!addr || !Array.isArray(addr) || addr.length === 0) return '';
  const first = addr[0];
  if (!Array.isArray(first) || first.length < 4) return '';
  const name = first[0] ? decodeMimeWord(String(first[0])) : '';
  const mailbox = first[2] ? String(first[2]) : '';
  const host = first[3] ? String(first[3]) : '';
  const email = mailbox && host ? `${mailbox}@${host}` : mailbox || host;
  if (name && email) return `${name} <${email}>`;
  return email || name;
}

function parseEnvelopeFetch(lines: string[]): MailItem[] {
  const items: MailItem[] = [];
  const full = lines.join('\n');
  const blocks = full.split(/\n(?=\* \d+ FETCH \()/i);
  for (const block of blocks) {
    if (!/^\* \d+ FETCH \(/i.test(block.trim())) continue;
    const uidM = block.match(/\bUID (\d+)\b/i);
    const flagsM = block.match(/\bFLAGS \(([^)]*)\)/i);
    const envM = block.match(/\bENVELOPE (\([\s\S]*)$/i);
    if (!uidM || !envM) continue;
    let envSrc = envM[1];
    let depth = 0;
    let end = -1;
    for (let i = 0; i < envSrc.length; i++) {
      if (envSrc[i] === '(') depth += 1;
      else if (envSrc[i] === ')') {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end < 0) continue;
    envSrc = envSrc.slice(0, end);
    try {
      const tokens = tokenizeImapList(envSrc);
      const idx = { i: 0 };
      const env = parseListValue(tokens, idx) as unknown[];
      if (!Array.isArray(env) || env.length < 3) continue;
      const dateRaw = env[0] ? String(env[0]) : '';
      const subject = env[1] ? decodeMimeWord(String(env[1])) : '（无主题）';
      const from = formatAddressList(env[2]);
      const date = dateRaw ? new Date(dateRaw) : null;
      items.push({
        uid: Number(uidM[1]),
        subject: subject || '（无主题）',
        from,
        date: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
        snippet: '',
        seen: /\\Seen/i.test(flagsM?.[1] || ''),
        hasAttachment: false,
      });
    } catch {
      /* skip */
    }
  }
  return items;
}

function extractLiteralBodies(lines: string[]): string {
  let raw = '';
  for (let i = 0; i < lines.length - 1; i++) {
    if (/\{(\d+)\}$/.test(lines[i]) && /BODY\[/i.test(lines[i])) {
      raw += lines[i + 1];
    }
  }
  return raw;
}

async function fetchMails(opts: {
  email: string;
  authCode: string;
  limit: number;
  focusUid: number | null;
  provider?: string;
  imapHost?: string;
  imapPort?: number;
}) {
  const { email, authCode, limit, focusUid, provider, imapHost } = opts;
  const resolved = resolveImapHost(email, provider, imapHost);
  const port = opts.imapPort && opts.imapPort > 0 ? opts.imapPort : resolved.port;

  const session = new ImapSession();
  try {
    await session.connect(resolved.host, port);
    await session.command('CAPABILITY');
    if (resolved.needId) {
      await session.command(
        'ID ("name" "SugarJobSystem" "version" "1.0.0" "vendor" "Sugar" "support-email" "noreply@sugar.local")',
      );
    }
    await session.command(`LOGIN ${imapQuoted(email)} ${imapQuoted(authCode)}`);

    const selectLines = await session.command('SELECT INBOX');
    const existsLine = selectLines.find((l) => /\* (\d+) EXISTS/i.test(l));
    const total = existsLine ? Number(existsLine.match(/\* (\d+) EXISTS/i)![1]) : 0;

    let unseen = 0;
    try {
      const st = await session.command('STATUS INBOX (MESSAGES UNSEEN)');
      const um = st.join('\n').match(/UNSEEN (\d+)/i);
      if (um) unseen = Number(um[1]);
    } catch {
      /* optional */
    }

    if (total === 0) return { messages: [] as MailItem[], total: 0, unseen: 0 };

    if (focusUid != null && Number.isFinite(focusUid)) {
      const envLines = await session.command(`UID FETCH ${focusUid} (UID FLAGS ENVELOPE)`);
      const items = parseEnvelopeFetch(envLines);
      const one = items[0];
      if (!one) throw new Error('邮件不存在或无法解析');
      try {
        const bodyLines = await session.command(`UID FETCH ${focusUid} (BODY.PEEK[]<0.200000>)`);
        const raw = extractLiteralBodies(bodyLines);
        const parsed = extractMimeParts(raw);
        one.snippet = (parsed.text || stripHtml(parsed.html)).slice(0, 400);
        one.html = parsed.html || undefined;
        one.hasAttachment = parsed.hasAttachment;
      } catch {
        try {
          const bodyLines = await session.command(`UID FETCH ${focusUid} (BODY.PEEK[TEXT]<0.12000>)`);
          const raw = extractLiteralBodies(bodyLines);
          const parsed = extractMimeParts(raw);
          one.snippet = (parsed.text || '').slice(0, 400);
          one.html = parsed.html || undefined;
        } catch {
          one.snippet = '';
        }
      }
      return { message: one };
    }

    const take = Math.min(50, Math.max(5, limit));
    const start = Math.max(1, total - take + 1);
    const lines = await session.command(`FETCH ${start}:${total} (UID FLAGS ENVELOPE)`);
    const messages = parseEnvelopeFetch(lines).sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });

    return { messages: messages.slice(0, take), total, unseen };
  } finally {
    await session.logout();
  }
}

function friendlyError(raw: string, authCode: string) {
  const safe = raw.split(authCode).join('***');
  if (/Login error|password error|AUTHENTICATION|Invalid credentials|NO LOGIN|AUTHENTICATE/i.test(safe)) {
    return '登录失败：邮箱或授权码/应用专用密码不正确。请按所选邮箱服务商的说明重新生成后重试。';
  }
  if (/Unsafe Login/i.test(safe)) {
    return '邮箱拒绝了不安全登录。请确认已开启 IMAP。';
  }
  if (/timeout|超时|ECONN|ENOTFOUND|断开|ECONNRESET|EAI_AGAIN|getaddrinfo/i.test(safe)) {
    return '连接邮箱服务器失败。请检查 IMAP 主机是否正确，或稍后重试。';
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
    provider?: string;
    imapHost?: string;
    imapPort?: number;
  };

  const email = (body.email ?? '').trim();
  const authCode = (body.authCode ?? '').trim().replace(/\s+/g, '');
  const limit = Math.min(50, Math.max(5, Number(body.limit) || 40));
  const focusUid = body.uid != null ? Number(body.uid) : null;

  if (!email || !authCode) {
    res.status(400).json({ error: '请提供邮箱地址与授权码' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: '邮箱地址格式不正确' });
    return;
  }
  if (authCode.length < 6 || authCode.length > 128) {
    res.status(400).json({ error: '授权码长度不对，请重新生成后完整粘贴。' });
    return;
  }

  try {
    const result = await fetchMails({
      email,
      authCode,
      limit,
      focusUid,
      provider: body.provider,
      imapHost: body.imapHost,
      imapPort: body.imapPort,
    });
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(502).json({ error: friendlyError(message, authCode) });
  }
}
