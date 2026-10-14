import { supabase } from "./supabase";
import type { MailSyncAnalysis } from "./mailSyncRules";
import type { MailboxMessage } from "../types";
export interface MailSyncMessage {
  id: string;
  uid: number;
  uidvalidity: string;
  status: string;
  reason: string | null;
  analysis: MailSyncAnalysis | null;
  interview_id: string | null;
  received_at: string;
  source_data: {
    subject: string;
    from: string;
    date: string | null;
    snippet: string;
  };
  evidence: { field: string; text: string }[];
  updated_at: string;
}
export interface MailSyncState {
  settings: {
    enabled: boolean;
    provider: string | null;
    timezone: string;
    folder: string;
    last_checked_at: string | null;
    last_success_at: string | null;
    error_code: string | null;
    config_version: number;
    next_scan_at: string;
    checking: boolean;
  };
  messages: MailSyncMessage[];
  changes: {
    id: string;
    interview_id: string | null;
    action: string;
    created_at: string;
  }[];
  pending: number;
}
export async function authenticatedMailRequest<T>(
  url: string,
  payload?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("请先登录");
  const response = await fetch(url, {
    method: payload ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(payload ? { "Content-Type": "application/json" } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    signal,
  });
  const result = await response
    .json()
    .catch(() => ({ error: "邮件服务暂时不可用，请稍后重试" }));
  if (!response.ok) throw new Error(result.error || "邮件同步未完成");
  return result as T;
}
export function mailSyncRequest<T>(
  action: string,
  params: Record<string, unknown> = {},
  write = false,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    action,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
  });
  return authenticatedMailRequest<T>(
    `/api/mail-interview-sync?${write ? new URLSearchParams({ action }) : query}`,
    write ? params : undefined,
    signal,
  );
}
export function automaticMailStatus(
  data: MailSyncState | null,
  message: MailboxMessage | null,
) {
  return message
    ? data?.messages.find(
        (m) =>
          m.uid === message.uid &&
          (!message.uidvalidity || m.uidvalidity === message.uidvalidity),
      )
    : undefined;
}
