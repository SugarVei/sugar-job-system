import type { MailboxMessage } from '../types';

export function mailIdentity(message: MailboxMessage): string {
  return `${message.uid}:${message.date ?? ''}:${message.subject}`;
}
export function mailSourceMarker(accountId: string, message: MailboxMessage): string {
  return `[Sugar邮件:${encodeURIComponent(accountId)}:${encodeURIComponent(mailIdentity(message))}]`;
}
export function parseMailDate(text: string, receivedAt: string | null, now = new Date()): string {
  const match = text.match(/(?:(\d{4})[年/.-])?(\d{1,2})[月/.-](\d{1,2})[日号]?\s*(?:[（(][^）)]*[）)]\s*)?(?:上午|下午|晚上|早上)?\s*(\d{1,2})[:：](\d{2})/);
  if (!match) return '';
  const reference = receivedAt ? new Date(receivedAt) : now;
  const year = match[1] ? +match[1] : (Number.isNaN(reference.getTime()) ? now.getFullYear() : reference.getFullYear());
  const month = +match[2], day = +match[3], minute = +match[5];
  let hour = +match[4];
  if (/下午|晚上/.test(match[0]) && hour < 12) hour += 12;
  const date = new Date(year, month - 1, day, hour, minute);
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${year}-${p(month)}-${p(day)}T${p(hour)}:${p(minute)}`;
}

export async function mailInterviewId(userId: string, accountId: string, message: MailboxMessage): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${userId}:${mailSourceMarker(accountId, message)}`)));
  digest[6] = (digest[6] & 15) | 128; digest[8] = (digest[8] & 63) | 128;
  const h = Array.from(digest.slice(0, 16), b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
