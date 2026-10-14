import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { withMailbox, parseSyncMail, mailboxHighUid, type SyncMail } from "./mail-sync-imap";
import { extractMail, provenance } from "./mail-sync-ai";
import { mailCandidate } from "../../src/lib/mailSyncRules";

export function syncDb() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SYNC_SERVICE_NOT_CONFIGURED");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function rpc<T>(
  db: SupabaseClient,
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export async function syncUser(db: SupabaseClient, header: unknown) {
  const token =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice(7)
      : "";
  if (!token) throw new Error("Unauthorized");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}
export type SyncSettings = {
  account_id: string;
  user_id: string;
  provider: string;
  model?: string;
  timezone: string;
  folder: string;
  enabled_at: string;
  backfill_since: string | null;
  last_uid: number | null;
  uidvalidity: string | null;
  lease_token: string;
  config_version: number;
};
type ScanClaim = {
  settings: SyncSettings;
  account: {
    id: string;
    email: string;
    provider: string;
    imap_host?: string;
    imap_port?: number;
  };
  password: string;
};
type MessageClaim = {
  message: {
    id: string;
    user_id: string;
    account_id: string;
    lease_token: string;
    attempts: number;
    source_data: SyncMail;
  };
  settings: SyncSettings;
  apiKey: string;
};
export function syncError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (
    /AI_NOT_CONFIGURED|AI_AUTH_INVALID|AI_QUOTA_EXCEEDED|AI_FAILED/.test(
      message,
    )
  )
    return message;
  if (
    /AUTHENTICATION|Invalid credentials|Login error|password|AUTHENTICATE|LOGIN.*failed|authenticationfailed/i.test(
      message,
    )
  )
    return "MAIL_AUTH_INVALID";
  return "MAIL_FAILED";
}
export async function scanAccount(db: SupabaseClient, claim: ScanClaim) {
  const s = claim.settings;
  try {
    await withMailbox(claim.account, claim.password, async (client) => {
      const box = await client.mailboxOpen(s.folder, { readOnly: true });
      const validity = box.uidValidity.toString();
      const high = await mailboxHighUid(client, box, s.folder);
      const reset =
        s.uidvalidity !== validity || s.last_uid === null || !!s.backfill_since;
      const start = reset ? 0 : Number(s.last_uid);
      const since = new Date(s.backfill_since || s.enabled_at);
      const uids =
        high > start
          ? await client.search(
              reset ? { since } : { uid: `${start + 1}:${high}` },
              { uid: true },
            )
          : [];
      const batch = (uids || [])
        .filter((uid) => uid > start && uid <= high)
        .sort((a, b) => a - b)
        .slice(0, 50);
      const messages: SyncMail[] = [];
      if (batch.length) {
        const meta = await client.fetchAll(
          batch,
          {
            envelope: true,
            uid: true,
            flags: true,
            internalDate: true,
            size: true,
          },
          { uid: true },
        );
        for (const m of meta) {
          if (reset && m.internalDate && m.internalDate < since) continue;
          let full = m;
          if ((m.size || 0) <= 2_000_000) {
            const found = await client.fetchOne(
              m.uid,
              {
                source: { start: 0, maxLength: 2000001 },
                envelope: true,
                uid: true,
                flags: true,
                internalDate: true,
                size: true,
              },
              { uid: true },
            );
            if (found) full = found;
          }
          messages.push(await parseSyncMail(full, validity));
        }
      }
      const last = batch.length === 50 ? batch[batch.length - 1] : high;
      const minimized = messages.map((m) => {
        const safe = { ...m };
        delete safe.html;
        const candidate = mailCandidate(m.subject, m.body, m.calendars);
        return {
          ...safe,
          candidate,
          ...(!candidate ? { body: "", snippet: "" } : {}),
        };
      });
      await rpc(db, "mail_sync_store_scan", {
        p_account: s.account_id,
        p_token: s.lease_token,
        p_validity: validity,
        p_last: last,
        p_messages: minimized,
      });
      if (batch.length === 50)
        await db
          .from("mail_sync_settings")
          .update({ next_scan_at: new Date().toISOString() })
          .eq("account_id", s.account_id);
    });
    return { status: "scanned" };
  } catch (error) {
    if (error instanceof Error && /SYNC_SUPERSEDED/.test(error.message))
      return { status: "superseded" };
    const code = syncError(error);
    const retry = new Date(
      Date.now() + (code === "MAIL_AUTH_INVALID" ? 24 * 3600000 : 5 * 60000),
    ).toISOString();
    await db
      .from("mail_sync_settings")
      .update({
        error_code: code,
        error_until: retry,
        next_scan_at: retry,
        lease_token: null,
        lease_until: null,
      })
      .eq("account_id", s.account_id)
      .eq("lease_token", s.lease_token);
    return { status: "error", code };
  }
}
export async function processMessage(db: SupabaseClient, claim: MessageClaim) {
  const m = claim.message;
  try {
    const analysis = await extractMail(
      m.source_data,
      claim.settings,
      claim.apiKey,
    );
    const enriched = await provenance(
      analysis,
      m.user_id,
      m.account_id,
      m.source_data,
    );
    // Application linkage is only used when the company and role uniquely match an owned record.
    if (analysis.company_name && analysis.position_name) {
      const { data } = await db
        .from("applications")
        .select("id")
        .eq("user_id", m.user_id)
        .eq("company_name", analysis.company_name)
        .eq("position_name", analysis.position_name)
        .limit(2);
      if (data?.length === 1)
        Object.assign(enriched, { application_id: data[0].id });
    }
    const result = await rpc<Record<string, unknown>>(db, "mail_sync_apply", {
      p_id: m.id,
      p_token: m.lease_token,
      p_version: claim.settings.config_version,
      p_analysis: enriched,
    });
    await db
      .from("mail_sync_settings")
      .update({ error_code: null, error_until: null })
      .eq("account_id", m.account_id)
      .eq("config_version", claim.settings.config_version)
      .like("error_code", "AI_%");
    return result;
  } catch (error) {
    if (error instanceof Error && /SYNC_SUPERSEDED/.test(error.message))
      return { status: "superseded" };
    const code =
      error instanceof Error && /AI_/.test(error.message)
        ? error.message
        : "AI_FAILED";
    const delay = [1, 5, 15, 60][Math.min(m.attempts - 1, 3)] * 60000;
    await db
      .from("mail_sync_messages")
      .update({
        status: m.attempts >= 5 ? "review" : "pending",
        reason: m.attempts >= 5 ? "EXTRACTION_FAILED" : code,
        next_attempt_at: new Date(Date.now() + delay).toISOString(),
        lease_token: null,
        lease_until: null,
      })
      .eq("id", m.id)
      .eq("lease_token", m.lease_token);
    await db
      .from("mail_sync_settings")
      .update({
        error_code: code,
        error_until: new Date(Date.now() + delay).toISOString(),
      })
      .eq("account_id", m.account_id)
      .eq("config_version", claim.settings.config_version);
    return { status: "error", code };
  }
}
export async function runMailSync(
  db: SupabaseClient,
  accountId?: string,
  budget = 85000,
) {
  const until = Date.now() + budget,
    results: unknown[] = [];
  // Account claiming prevents overlap; bounded requests persist unfinished messages for the next tick.
  const scans = await Promise.all(
    [0, 1, 2, 3].map(async () => {
      if (Date.now() > until - 25000) return null;
      const c = await rpc<ScanClaim | null>(db, "mail_sync_claim_account", {
        p_account: accountId || null,
      });
      return c ? scanAccount(db, c) : null;
    }),
  );
  results.push(...scans.filter(Boolean));
  while (Date.now() < until - 38000) {
    const claim = await rpc<MessageClaim | null>(
      db,
      "mail_sync_claim_message",
      { p_account: accountId || null },
    );
    if (!claim) break;
    results.push(await processMessage(db, claim));
  }
  return results;
}
export function validTimezone(zone: unknown) {
  return typeof zone === "string" && DateTime.now().setZone(zone).isValid;
}
