import { ImapFlow, type FetchMessageObject } from "imapflow";
import { simpleParser } from "mailparser";
import sanitizeHtml from "sanitize-html";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { latestMailBody } from "../../src/lib/mailSyncRules";

export type SyncMail = {
  uid: number;
  subject: string;
  from: string;
  date: string | null;
  receivedAt: string;
  snippet: string;
  body: string;
  html?: string;
  seen: boolean;
  hasAttachment: boolean;
  messageId: string | null;
  references: string[];
  calendars: string[];
  incomplete: boolean;
  uidvalidity?: string;
};
export function publicAddress(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const s = ip.toLowerCase();
  return isIP(ip) === 6 && !/^(::|fc|fd|fe8|fe9|fea|feb|ff)/.test(s);
}
export async function mailboxClient(
  account: {
    email: string;
    provider: string;
    imap_host?: string | null;
    imap_port?: number | null;
  },
  password: string,
) {
  const domain = account.email.split("@")[1]?.toLowerCase();
  const hosts: Record<string, string> = {
    qq: "imap.qq.com",
    gmail: "imap.gmail.com",
    outlook: "outlook.office365.com",
    netease163:
      domain === "126.com"
        ? "imap.126.com"
        : domain === "yeah.com"
          ? "imap.yeah.net"
          : "imap.163.com",
  };
  const host =
    account.provider === "custom"
      ? String(account.imap_host || "").trim()
      : hosts[account.provider];
  if (!host || !/^[a-z0-9.-]+$/i.test(host) || isIP(host))
    throw new Error("MAIL_HOST_INVALID");
  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error("MAIL_HOST_INVALID");
  const port = account.imap_port || 993;
  if (![993, 995].includes(port)) throw new Error("MAIL_PORT_INVALID");
  // Connect to the verified address; TLS authenticates the original hostname, avoiding DNS rebinding.
  return new ImapFlow({
    host: (addresses.find((a) => a.family === 4) || addresses[0]).address,
    port,
    secure: true,
    tls: { servername: host, rejectUnauthorized: true, minVersion: "TLSv1.2" },
    auth: { user: account.email, pass: password },
    logger: false,
    socketTimeout: 20000,
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    clientInfo: { name: "SugarJobSystem", version: "1.0.0" },
  });
}
export async function parseSyncMail(
  message: FetchMessageObject,
  validity: string,
): Promise<SyncMail> {
  const tooLarge =
    (message.size || 0) > 2_000_000 ||
    (message.source?.length || 0) > 2_000_000;
  const mail =
    message.source && !tooLarge
      ? await simpleParser(message.source, {
          skipImageLinks: true,
          skipTextLinks: true,
          maxHtmlLengthToParse: 250_000,
        })
      : null;
  const text = latestMailBody(mail?.text || "");
  const body = text.slice(0, 60000);
  const subject = mail?.subject || message.envelope?.subject || "（无主题）";
  const from =
    mail?.from?.text ||
    message.envelope?.from
      ?.map((a) => `${a.name || ""} <${a.address || ""}>`)
      .join(", ") ||
    "";
  const rawDate = mail?.date || message.envelope?.date;
  const date =
    rawDate instanceof Date ? rawDate : rawDate ? new Date(rawDate) : null;
  const rawReceived = message.internalDate || date || new Date();
  const received =
    rawReceived instanceof Date ? rawReceived : new Date(rawReceived);
  const calendars =
    mail?.attachments
      .filter(
        (a) =>
          a.contentType === "text/calendar" || /\.ics$/i.test(a.filename || ""),
      )
      .map((a) => a.content.toString("utf8").slice(0, 60000)) || [];
  const refs =
    typeof mail?.references === "string"
      ? [mail.references]
      : mail?.references || [];
  if (mail?.inReplyTo) refs.push(mail.inReplyTo);
  const html = mail?.html
    ? sanitizeHtml(String(mail.html), {
        allowedTags: [
          ...sanitizeHtml.defaults.allowedTags,
          "table",
          "thead",
          "tbody",
          "tr",
          "td",
          "th",
        ],
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          "*": ["style", "class"],
          a: ["href", "target", "rel"],
        },
        allowedSchemes: ["https", "http", "mailto"],
        allowedStyles: {
          "*": {
            color: [
              /^#[0-9a-f]{3,8}$/i,
              /^rgb\(\d+,\s*\d+,\s*\d+\)$/,
              /^[a-z]+$/i,
            ],
            "background-color": [/^#[0-9a-f]{3,8}$/i],
            "text-align": [/^(left|right|center)$/],
            "font-size": [/^\d+(px|pt|em|%)$/],
            "font-weight": [/^(bold|normal|[1-9]00)$/],
            "line-height": [/^[\d.]+(px|em|%)?$/],
            padding: [/^[\d.]+(px|em|%)$/],
          },
        },
        transformTags: {
          a: sanitizeHtml.simpleTransform("a", {
            target: "_blank",
            rel: "noopener noreferrer",
          }),
        },
      })
    : undefined;
  return {
    uid: message.uid,
    uidvalidity: validity,
    subject,
    from,
    date: date?.toISOString() || null,
    receivedAt: received.toISOString(),
    snippet: body.slice(0, 400),
    body,
    html,
    seen: message.flags?.has("\\Seen") || false,
    hasAttachment: !!mail?.attachments.length,
    messageId: mail?.messageId || message.envelope?.messageId || null,
    references: [...new Set(refs)],
    calendars,
    incomplete:
      tooLarge || text.length > 60000 || (!body && calendars.length === 0),
  };
}
export async function withMailbox<T>(
  account: Parameters<typeof mailboxClient>[0],
  password: string,
  run: (client: ImapFlow) => Promise<T>,
) {
  const client = await mailboxClient(account, password);
  try {
    await client.connect();
    return await run(client);
  } finally {
    await client.logout().catch(() => client.close());
  }
}
