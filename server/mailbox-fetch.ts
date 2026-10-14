import { syncDb, syncUser, rpc } from "./_lib/mail-sync-runtime";
import { withMailbox, parseSyncMail } from "./_lib/mail-sync-imap";
export const config = { maxDuration: 30 };
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const db = syncDb();
    const user = await syncUser(db, req.headers.authorization);
    const body = req.body || {};
    const { data: account, error } = await db
      .from("mailbox_accounts")
      .select("id,email,provider,imap_host,imap_port")
      .eq("id", body.accountId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !account) {
      res.status(404).json({ error: "找不到该邮箱账号" });
      return;
    }
    const password = await rpc<string>(db, "mail_sync_credential", {
      p_kind: "mailbox",
      p_owner: account.id,
      p_provider: "",
    });
    const result = await withMailbox(account, password, async (client) => {
      const box = await client.mailboxOpen("INBOX", { readOnly: true });
      const validity = box.uidValidity.toString();
      if (body.uid != null) {
        const uid = Number(body.uid);
        if (!Number.isSafeInteger(uid) || uid <= 0)
          throw new Error("MAIL_NOT_FOUND");
        if (body.uidvalidity && String(body.uidvalidity) !== validity)
          throw new Error("MAIL_NOT_FOUND");
        const meta = await client.fetchOne(
          uid,
          {
            uid: true,
            envelope: true,
            flags: true,
            internalDate: true,
            size: true,
          },
          { uid: true },
        );
        if (!meta) throw new Error("MAIL_NOT_FOUND");
        const m =
          meta.size <= 2_000_000
            ? await client.fetchOne(
                uid,
                {
                  uid: true,
                  envelope: true,
                  flags: true,
                  internalDate: true,
                  size: true,
                  source: { start: 0, maxLength: 2000001 },
                },
                { uid: true },
              )
            : meta;
        if (!m) throw new Error("MAIL_NOT_FOUND");
        return { message: await parseSyncMail(m, validity) };
      }
      const total = box.exists;
      const take = Math.min(50, Math.max(5, Number(body.limit) || 40));
      const status = await client.status("INBOX", { unseen: true });
      const items = total
        ? await client.fetchAll(`${Math.max(1, total - take + 1)}:${total}`, {
            uid: true,
            envelope: true,
            flags: true,
            internalDate: true,
            size: true,
          })
        : [];
      return {
        messages: (
          await Promise.all(items.map((m) => parseSyncMail(m, validity)))
        ).reverse(),
        total,
        unseen: status.unseen || 0,
      };
    });
    await db
      .from("mailbox_accounts")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", account.id)
      .eq("user_id", user.id);
    res.status(200).json(result);
  } catch (error) {
    const m = error instanceof Error ? error.message : "";
    res
      .status(m === "Unauthorized" ? 401 : 502)
      .json({
        error:
          m === "Unauthorized"
            ? "请先登录"
            : m === "MAIL_NOT_FOUND"
              ? "原邮件已不存在或邮箱标识已变化"
              : "无法连接邮箱，请确认授权码和 IMAP 设置有效。",
      });
  }
}
