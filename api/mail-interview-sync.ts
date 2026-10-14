import {
  syncDb,
  syncUser,
  rpc,
  runMailSync,
  validTimezone,
} from "./_lib/mail-sync-runtime";
import { syncProviders, provenance, extractMail } from "./_lib/mail-sync-ai";
import { withMailbox, type SyncMail } from "./_lib/mail-sync-imap";
import {
  localMailTime,
  MAIL_SYNC_REASONS,
  type MailSyncAnalysis,
} from "../src/lib/mailSyncRules";

export const config = { maxDuration: 120 };
const metadata =
  "id,user_id,provider,email,display_name,imap_host,imap_port,last_synced_at,created_at,updated_at";
function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error("DATABASE_UNAVAILABLE");
  return result.data;
}
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (!["GET", "POST"].includes(req.method)) {
    res.status(405).json({ error: "请求方式不支持" });
    return;
  }
  const op = String(req.query?.action || req.body?.action || "status");
  const body = (req.body || {}) as Record<string, any>;
  try {
    const db = syncDb();
    if (op === "cron" || op === "verify") {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }
      const token = String(req.headers.authorization || "").replace(
        /^Bearer /,
        "",
      );
      if (
        token.length !== 64 ||
        !(await rpc<boolean>(db, "mail_sync_authorize_cron", {
          p_token: token,
        }))
      ) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (op === "verify") {
        // Internal deployment check: synthetic mail exercises the owner's provider, never writes a calendar.
        const settings = check(
          await db
            .from("mail_sync_settings")
            .select("user_id,provider,model,timezone")
            .eq("enabled", true)
            .not("provider", "is", null)
            .limit(1)
            .maybeSingle(),
        );
        if (!settings) throw new Error("AI_NOT_CONFIGURED");
        const key = await rpc<string>(db, "mail_sync_credential", {
          p_kind: "ai",
          p_owner: settings.user_id,
          p_provider: settings.provider,
        });
        const future = new Date(Date.now() + 3 * 86400000)
          .toISOString()
          .slice(0, 10);
        const date = `${future.slice(0, 4)}年${Number(future.slice(5, 7))}月${Number(future.slice(8, 10))}日`;
        const mail: SyncMail = {
          uid: 1,
          subject: "测试企业：面试安排确认",
          from: "面试验证 <qa@example.invalid>",
          date: new Date().toISOString(),
          receivedAt: new Date().toISOString(),
          snippet: "",
          body: `测试企业产品经理岗位一面已确定。面试时间：${date} 09:34（北京时间）。形式：视频面试。请准时参加。`,
          seen: false,
          hasAttachment: false,
          messageId: null,
          references: [],
          calendars: [],
          incomplete: false,
        };
        const result = await extractMail(mail, settings, key);
        res
          .status(200)
          .json({
            ok:
              result.action === "create" && result.company_name === "测试企业",
            provider: settings.provider,
            calendarWritten: false,
            result,
          });
        return;
      }
      res.status(200).json({ ok: true, processed: await runMailSync(db) });
      return;
    }
    const user = await syncUser(db, req.headers.authorization);
    if (op === "accounts") {
      const data = check(
        await db
          .from("mailbox_accounts")
          .select(metadata)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      );
      res.status(200).json({
        accounts: (data || []).map((a) => ({
          ...a,
          secret_configured: true,
        })),
      });
      return;
    }
    if (op === "provider") {
      if (req.method !== "POST" || !syncProviders.includes(body.provider))
        throw new Error("INVALID_PROVIDER");
      const existing = check(
        await db
          .from("user_api_keys")
          .select("provider")
          .eq("user_id", user.id)
          .eq("provider", body.provider)
          .maybeSingle(),
      );
      if (!existing) throw new Error("AI_NOT_CONFIGURED");
      const settings = check(
        await db
          .from("mail_sync_settings")
          .select("account_id,provider,config_version")
          .eq("user_id", user.id),
      );
      for (const s of settings || [])
        if (s.provider !== body.provider)
          check(
            await db
              .from("mail_sync_settings")
              .update({
                provider: body.provider,
                config_version: s.config_version + 1,
                lease_token: null,
                lease_until: null,
                error_code: null,
                error_until: null,
                next_scan_at: new Date().toISOString(),
              })
              .eq("account_id", s.account_id)
              .eq("user_id", user.id)
              .eq("config_version", s.config_version),
          );
      res.status(200).json({ ok: true });
      return;
    }
    if (op === "source") {
      const id = String(req.query?.interviewId || "");
      const interview = check(
        await db
          .from("interviews")
          .select("id,notes")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle(),
      );
      if (!interview) throw new Error("TARGET_NOT_IDENTIFIED");
      const message = check(
        await db
          .from("mail_sync_messages")
          .select("account_id,uid,uidvalidity")
          .eq("interview_id", id)
          .eq("user_id", user.id)
          .order("received_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      );
      if (message) {
        res.status(200).json({
          accountId: message.account_id,
          uid: message.uid,
          uidvalidity: message.uidvalidity,
        });
        return;
      }
      const marker = interview.notes?.match(/\[Sugar邮件:([^:]+):([^\]]+)\]/);
      if (!marker) throw new Error("SOURCE_UNAVAILABLE");
      const identity = decodeURIComponent(marker[2]),
        accountId = decodeURIComponent(marker[1]);
      const owned = check(
        await db
          .from("mailbox_accounts")
          .select("id")
          .eq("id", accountId)
          .eq("user_id", user.id)
          .maybeSingle(),
      );
      if (!owned) throw new Error("SOURCE_UNAVAILABLE");
      res.status(200).json({
        accountId,
        uid: Number(identity.split(":")[0]),
        expectedIdentity: identity,
      });
      return;
    }
    if (op === "save-account") {
      if (req.method !== "POST") throw new Error("INVALID_ACTION");
      const id = body.accountId;
      const previous = id
        ? check(
            await db
              .from("mailbox_accounts")
              .select(metadata)
              .eq("id", id)
              .eq("user_id", user.id)
              .maybeSingle(),
          )
        : null;
      if (id && !previous) throw new Error("ACCOUNT_NOT_FOUND");
      const email = String(body.email || "").trim(),
        password = String(body.auth_code || "")
          .trim()
          .replace(/\s/g, "");
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !["netease163", "qq", "gmail", "outlook", "custom"].includes(
          body.provider,
        )
      )
        throw new Error("INVALID_ACCOUNT");
      if (!previous && (password.length < 6 || password.length > 128))
        throw new Error("MAIL_AUTH_REQUIRED");
      if (
        previous &&
        (email !== previous.email || body.provider !== previous.provider) &&
        !password
      )
        throw new Error("MAIL_AUTH_REQUIRED");
      const account = {
        email,
        provider: body.provider,
        imap_host:
          body.provider === "custom"
            ? String(body.imap_host || "").trim()
            : null,
        imap_port: Number(body.imap_port) || 993,
      };
      const effective =
        password ||
        (await rpc<string>(db, "mail_sync_credential", {
          p_kind: "mailbox",
          p_owner: id,
          p_provider: "",
        }));
      await withMailbox(account, effective, async (client) => {
        await client.mailboxOpen("INBOX", { readOnly: true });
      });
      const payload = {
        ...account,
        display_name: email.split("@")[0],
        ...(password ? { auth_code: password } : {}),
      };
      const saved = previous
        ? check(
            await db
              .from("mailbox_accounts")
              .update(payload)
              .eq("id", id)
              .eq("user_id", user.id)
              .select(metadata)
              .single(),
          )
        : check(
            await db
              .from("mailbox_accounts")
              .insert({ ...payload, user_id: user.id })
              .select(metadata)
              .single(),
          );
      check(
        await db
          .from("mailbox_accounts")
          .update({ auth_code: "[已安全保存]" })
          .eq("id", saved.id)
          .eq("user_id", user.id),
      );
      if (syncProviders.includes(body.aiProvider)) {
        const key = check(
          await db
            .from("user_api_keys")
            .select("provider")
            .eq("user_id", user.id)
            .eq("provider", body.aiProvider)
            .maybeSingle(),
        );
        if (key)
          check(
            await db
              .from("mail_sync_settings")
              .update({
                provider: body.aiProvider,
                error_code: null,
                error_until: null,
                next_scan_at: new Date().toISOString(),
              })
              .eq("account_id", saved.id)
              .eq("user_id", user.id),
          );
      }
      res.status(200).json({ account: { ...saved, secret_configured: true } });
      return;
    }
    const accountId = String(req.query?.accountId || body.accountId || "");
    const account = check(
      await db
        .from("mailbox_accounts")
        .select(metadata)
        .eq("id", accountId)
        .eq("user_id", user.id)
        .maybeSingle(),
    );
    if (!account) {
      res.status(404).json({ error: "找不到该邮箱账号" });
      return;
    }
    if (op === "delete-account") {
      if (req.method !== "POST") throw new Error("INVALID_ACTION");
      check(
        await db
          .from("mailbox_accounts")
          .delete()
          .eq("id", accountId)
          .eq("user_id", user.id),
      );
      res.status(200).json({ ok: true });
      return;
    }
    const settings = check(
      await db
        .from("mail_sync_settings")
        .select("*")
        .eq("account_id", accountId)
        .eq("user_id", user.id)
        .single(),
    );
    if (op === "status") {
      const messages = check(
        await db
          .from("mail_sync_messages")
          .select(
            "id,uid,uidvalidity,status,reason,analysis,interview_id,received_at,source_data,updated_at",
          )
          .eq("account_id", accountId)
          .eq("user_id", user.id)
          .in("status", ["review", "done", "suppressed"])
          .order("updated_at", { ascending: false })
          .limit(100),
      );
      const changes = check(
        await db
          .from("interview_change_log")
          .select("id,interview_id,action,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(15),
      );
      const { count, error } = await db
        .from("mail_sync_messages")
        .select("id", { head: true, count: "exact" })
        .eq("account_id", accountId)
        .eq("user_id", user.id)
        .eq("status", "pending");
      if (error) throw new Error("DATABASE_UNAVAILABLE");
      const targetIds = [
        ...new Set(
          (messages || [])
            .filter((m) => m.status === "review" && m.analysis?.target_id)
            .map((m) => m.analysis.target_id as string),
        ),
      ];
      const targets = targetIds.length
        ? check(
            await db
              .from("interviews")
              .select("id,version,interview_time,company_name,position_name")
              .eq("user_id", user.id)
              .in("id", targetIds),
          )
        : [];
      const safe = (messages || []).map((m) => {
        const target = targets?.find((t) => t.id === m.analysis?.target_id);
        return {
          ...m,
          ...(target
            ? {
                analysis: {
                  ...m.analysis,
                  target_version: target.version,
                  current: target,
                },
              }
            : {}),
          source_data: {
            subject: m.source_data?.subject,
            from: m.source_data?.from,
            date: m.source_data?.date,
            snippet: m.source_data?.snippet,
          },
          evidence: m.analysis?.evidence || [],
        };
      });
      res.status(200).json({
        settings: {
          enabled: settings.enabled,
          provider: settings.provider,
          timezone: settings.timezone,
          folder: settings.folder,
          last_checked_at: settings.last_checked_at,
          last_success_at: settings.last_success_at,
          error_code: settings.error_code,
          config_version: settings.config_version,
          next_scan_at: settings.next_scan_at,
          checking:
            !!settings.lease_until &&
            new Date(settings.lease_until) > new Date(),
        },
        messages: safe,
        changes,
        pending: count || 0,
      });
      return;
    }
    if (op === "settings") {
      if (req.method !== "POST" || typeof body.enabled !== "boolean")
        throw new Error("INVALID_ACTION");
      if (body.timezone && !validTimezone(body.timezone))
        throw new Error("INVALID_TIMEZONE");
      check(
        await db
          .from("mail_sync_settings")
          .update({
            enabled: body.enabled,
            config_version: settings.config_version + 1,
            lease_token: null,
            lease_until: null,
            ...(body.timezone ? { timezone: body.timezone } : {}),
            next_scan_at: new Date().toISOString(),
          })
          .eq("account_id", accountId)
          .eq("user_id", user.id)
          .eq("config_version", settings.config_version),
      );
      res.status(200).json({ ok: true });
      return;
    }
    if (op === "check") {
      if (req.method !== "POST") throw new Error("INVALID_ACTION");
      if (!settings.enabled) throw new Error("SYNC_PAUSED");
      if (!settings.provider) throw new Error("AI_NOT_CONFIGURED");
      if (settings.lease_until && new Date(settings.lease_until) > new Date()) {
        res.status(202).json({ queued: true });
        return;
      }
      const recent =
        settings.last_checked_at &&
        Date.now() - new Date(settings.last_checked_at).getTime() < 60000;
      if (recent && !body.backfill && !settings.error_code) {
        res.status(202).json({ queued: true });
        return;
      }
      check(
        await db
          .from("mail_sync_settings")
          .update({
            next_scan_at: new Date().toISOString(),
            error_code: null,
            error_until: null,
            ...(body.backfill
              ? {
                  backfill_since: new Date(
                    Date.now() - 7 * 86400000,
                  ).toISOString(),
                }
              : {}),
          })
          .eq("account_id", accountId)
          .eq("user_id", user.id)
          .eq("config_version", settings.config_version),
      );
      res
        .status(200)
        .json({ ok: true, processed: await runMailSync(db, accountId, 70000) });
      return;
    }
    if (op === "resolve") {
      if (req.method !== "POST") throw new Error("INVALID_ACTION");
      const m = check(
        await db
          .from("mail_sync_messages")
          .select("*")
          .eq("id", body.messageId)
          .eq("account_id", accountId)
          .eq("user_id", user.id)
          .eq("status", "review")
          .maybeSingle(),
      );
      if (!m) throw new Error("SUGGESTION_ALREADY_RESOLVED");
      if (body.decision === "ignore") {
        check(
          await db
            .from("mail_sync_messages")
            .update({
              status: "ignored",
              reason: "IGNORED_BY_USER",
              updated_at: new Date().toISOString(),
            })
            .eq("id", m.id)
            .eq("user_id", user.id)
            .eq("status", "review"),
        );
        res.status(200).json({ ok: true });
        return;
      }
      const analysis = {
        ...(m.analysis || {}),
        company_name: String(
          body.company_name || m.analysis?.company_name || "",
        )
          .trim()
          .slice(0, 200),
        position_name: String(
          body.position_name || m.analysis?.position_name || "",
        )
          .trim()
          .slice(0, 200),
      } as MailSyncAnalysis;
      if (!analysis.company_name) throw new Error("COMPANY_REQUIRED");
      if (body.local_start) {
        analysis.interview_time = localMailTime(
          body.local_start,
          settings.timezone,
        );
        if (!analysis.interview_time) throw new Error("TIME_REQUIRED");
      }
      if (!["create", "reschedule", "cancel"].includes(analysis.action))
        analysis.action = "create";
      if (analysis.action !== "cancel" && !analysis.interview_time)
        throw new Error("TIME_REQUIRED");
      if (body.target_id) {
        const target = check(
          await db
            .from("interviews")
            .select("id,version")
            .eq("id", body.target_id)
            .eq("user_id", user.id)
            .maybeSingle(),
        );
        if (!target) throw new Error("TARGET_NOT_IDENTIFIED");
        analysis.target_id = target.id;
        analysis.target_version = Number.isInteger(body.target_version)
          ? body.target_version
          : (analysis.target_version ?? target.version);
      }
      res.status(200).json(
        await rpc(db, "mail_sync_apply", {
          p_id: m.id,
          p_token: null,
          p_version: settings.config_version,
          p_analysis: await provenance(
            analysis,
            user.id,
            accountId,
            m.source_data as SyncMail,
          ),
          p_manual: true,
        }),
      );
      return;
    }
    res.status(400).json({ error: "未知操作" });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      Unauthorized: "请先登录",
      SYNC_SERVICE_NOT_CONFIGURED: "后台同步服务尚未配置",
      DATABASE_UNAVAILABLE: "暂时无法读取同步数据，请稍后重试",
      SYNC_PAUSED: "请先恢复自动同步",
      MAIL_AUTH_REQUIRED: "请填写有效的邮箱授权码",
      INVALID_ACCOUNT: "请检查邮箱地址与服务商",
      COMPANY_REQUIRED: "请填写公司名称",
      TIME_REQUIRED: "请确认有效的面试时间",
      INTERVIEW_CHANGED: "安排已发生变化，请刷新后再确认",
      SUGGESTION_ALREADY_RESOLVED: "这条建议已处理，请刷新",
    };
    res
      .status(
        code === "Unauthorized"
          ? 401
          : code === "SYNC_SERVICE_NOT_CONFIGURED" ||
              code === "DATABASE_UNAVAILABLE"
            ? 503
            : 400,
      )
      .json({
        error:
          messages[code] ||
          MAIL_SYNC_REASONS[code] ||
          "操作未完成，请检查邮箱连接后重试",
        code:
          code in messages || code in MAIL_SYNC_REASONS ? code : "SYNC_FAILED",
      });
  }
}
