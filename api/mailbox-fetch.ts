/**
 * 网易 163/126/yeah IMAP — 列表用 ENVELOPE（稳定拿齐多封），详情再取正文摘要
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

/** 从 multipart / base64 / qp 正文里抽出可读摘要 */
function readableSnippet(raw: string, max = 220): string {
  if (!raw) return '';
  let text = raw;

  // 去掉明显的 MIME 外壳
  if (/Content-Type:/i.test(text) || /------=_Part_/i.test(text) || /--[0-9a-zA-Z._-]+/.test(text)) {
    // 优先 text/plain 段
    const plain = text.match(/Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\nContent-Type:|$)/i);
    const html = text.match(/Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\nContent-Type:|$)/i);
    const chunk = plain?.[1] || html?.[1] || text;

    if (/Content-Transfer-Encoding:\s*base64/i.test(text) && plain?.[1]) {
      try {
        text = Buffer.from(plain[1].replace(/\s+/g, ''), 'base64').toString('utf8');
      } catch {
        text = chunk;
      }
    } else if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(text)) {
      text = decodeQuotedPrintable(chunk);
    } else {
      text = decodeQuotedPrintable(chunk);
    }
  } else {
    text = decodeQuotedPrintable(text);
  }

  text = stripHtml(text)
    .replace(/------=_Part_[\s\S]{0,80}/g, ' ')
    .replace(/Content-Type:[^;]+;?/gi, ' ')
    .replace(/Content-Transfer-Encoding:[^\s]+/gi, ' ')
    .replace(/charset=[^\s]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.slice(0, max);
}

function imapQuoted(s: string) {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
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
      socket.on('timeout', () => socket.destroy(new Error('连接网易邮箱超时')));
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
      if (idx >= 0) {
        return this.consume(idx + 1).toString('utf8').replace(/\r?\n$/, '');
      }
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

/** 极简 IMAP s-expression 分词（够解析 ENVELOPE） */
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
    // atom / NIL
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
  // addr is list of (name adl mailbox host)
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
  // 把整段拼起来，按 "* n FETCH" 切开
  const full = lines.join('\n');
  const blocks = full.split(/\n(?=\* \d+ FETCH \()/i);
  for (const block of blocks) {
    if (!/^\* \d+ FETCH \(/i.test(block.trim())) continue;
    const uidM = block.match(/\bUID (\d+)\b/i);
    const flagsM = block.match(/\bFLAGS \(([^)]*)\)/i);
    const envM = block.match(/\bENVELOPE (\([\s\S]*)$/i);
    if (!uidM || !envM) continue;

    // ENVELOPE (...) 可能后面还有 ) 关闭 FETCH
    let envSrc = envM[1];
    // 截到与 ENVELOPE 匹配的列表结束：用括号计数
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
      /* skip bad block */
    }
  }
  return items;
}

function parseBodyFetch(lines: string[]): { snippet: string; hasAttachment: boolean } {
  const full = lines.join('\n');
  // BODY[TEXT]<0> {n}\n data
  const lit = full.match(/BODY\[(?:TEXT|1|1\.1)[^\]]*\](?:<\d+>)? \{(\d+)\}\n([\s\S]*)/i);
  let raw = '';
  if (lit) {
    const size = Number(lit[1]);
    raw = lit[2].slice(0, size);
  } else {
    // 拼接所有 literal 行
    for (let i = 0; i < lines.length - 1; i++) {
      if (/\{(\d+)\}$/.test(lines[i]) && /BODY\[/i.test(lines[i])) {
        raw += lines[i + 1];
      }
    }
  }
  return {
    snippet: readableSnippet(raw, 800),
    hasAttachment: /attachment|filename=/i.test(raw),
  };
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
      const um = st.join('\n').match(/UNSEEN (\d+)/i);
      if (um) unseen = Number(um[1]);
    } catch {
      /* optional */
    }

    if (total === 0) return { messages: [] as MailItem[], total: 0, unseen: 0 };

    // 单封详情
    if (focusUid != null && Number.isFinite(focusUid)) {
      const envLines = await session.command(`UID FETCH ${focusUid} (UID FLAGS ENVELOPE)`);
      const items = parseEnvelopeFetch(envLines);
      const one = items[0];
      if (!one) throw new Error('邮件不存在或无法解析');
      try {
        const bodyLines = await session.command(
          `UID FETCH ${focusUid} (BODY.PEEK[TEXT]<0.12000>)`,
        );
        const body = parseBodyFetch(bodyLines);
        one.snippet = body.snippet;
        one.hasAttachment = body.hasAttachment;
      } catch {
        one.snippet = '';
      }
      return { message: one };
    }

    // 列表：只拉 ENVELOPE，一次拿齐最近 N 封
    const take = Math.min(50, Math.max(5, limit));
    const start = Math.max(1, total - take + 1);
    const lines = await session.command(
      `FETCH ${start}:${total} (UID FLAGS ENVELOPE)`,
    );
    const messages = parseEnvelopeFetch(lines).sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });

    return {
      messages: messages.slice(0, take),
      total,
      unseen,
    };
  } finally {
    await session.logout();
  }
}

function friendlyError(raw: string, authCode: string) {
  const safe = raw.split(authCode).join('***');
  if (/Login error|password error|AUTHENTICATION|Invalid credentials|NO LOGIN/i.test(safe)) {
    return '登录失败：邮箱或授权码不正确。请重新生成客户端授权码后点「更新账号」再同步。';
  }
  if (/Unsafe Login/i.test(safe)) {
    return '网易拒绝不安全登录。请确认 IMAP 已开启后重试。';
  }
  if (/timeout|超时|ECONN|ENOTFOUND|断开|ECONNRESET|EAI_AGAIN/i.test(safe)) {
    return '连接网易服务器失败，请稍后重试。';
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
  const limit = Math.min(50, Math.max(5, Number(body.limit) || 40));
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
    res.status(400).json({ error: '授权码长度不对，请重新生成后完整粘贴。' });
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
