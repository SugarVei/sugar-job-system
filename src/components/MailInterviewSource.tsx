import { useState } from "react";
import type { Interview } from "../types";
import { mailSyncRequest } from "../lib/mailSyncClient";
import { useAppShell } from "../contexts/AppShellContext";
import { useToast } from "./Toast";
export default function MailInterviewSource({
  interview,
  onClose,
}: {
  interview: Interview;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const { navigate } = useAppShell();
  const toast = useToast();
  if (interview.source !== "email" && !interview.notes?.includes("[Sugar邮件:"))
    return null;
  const open = async () => {
    setBusy(true);
    try {
      const source = await mailSyncRequest<{
        accountId: string;
        uid: number;
        uidvalidity?: string;
        expectedIdentity?: string;
      }>("source", { interviewId: interview.id });
      sessionStorage.setItem(
        "sugar.mail.source-selection",
        JSON.stringify(source),
      );
      onClose();
      navigate("mailbox");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "原邮件无法读取");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mail-source-status">
      来自邮箱 ·{" "}
      {interview.status === "cancelled"
        ? "已取消"
        : interview.source === "email"
          ? "自动同步"
          : "手动确认"}
      <button
        type="button"
        disabled={busy}
        onClick={() => void open()}
        style={{
          marginLeft: 12,
          border: 0,
          background: "transparent",
          color: "var(--sugar-accent,#9a5b62)",
          font: "inherit",
          cursor: "pointer",
        }}
      >
        {busy ? "正在读取…" : "查看来源邮件 →"}
      </button>
    </div>
  );
}
