import { useCallback, useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import Modal from "./Modal";
import { useToast } from "./Toast";
import {
  useApiKeys,
  OPEN_API_SETTINGS_EVENT,
} from "../contexts/ApiKeysContext";
import {
  mailSyncRequest,
  type MailSyncState,
  type MailSyncMessage,
} from "../lib/mailSyncClient";
import { MAIL_SYNC_REASONS } from "../lib/mailSyncRules";
import { PROVIDERS, type ProviderId } from "../lib/providers";
import type { Interview } from "../types";
import "./MailAutoSync.css";

export default function MailAutoSync({
  accountId,
  interviews,
  onRepair,
  onView,
  onState,
}: {
  accountId: string;
  interviews: Interview[];
  onRepair: () => void;
  onView: (interview: Interview) => void;
  onState: (state: MailSyncState) => void;
}) {
  const [data, setData] = useState<MailSyncState | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reviewOpen, setReviewOpen] = useState(false),
    [historyOpen, setHistoryOpen] = useState(false);
  const { getActiveConfig } = useApiKeys();
  const toast = useToast();
  const callbacks = useRef({ onState });
  const mounted = useRef(true);
  const requestId = useRef(0);
  useEffect(() => {
    callbacks.current = { onState };
  }, [onState]);
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const next = await mailSyncRequest<MailSyncState>("status", {
        accountId,
      });
      if (!mounted.current || id !== requestId.current) return;
      setData(next);
      setError("");
      callbacks.current.onState(next);
    } catch (e) {
      if (mounted.current && id === requestId.current)
        setError(e instanceof Error ? e.message : "同步状态读取失败");
    }
  }, [accountId]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const check = () => {
      if (!document.hidden) void refresh();
    };
    const review = () => setReviewOpen(true);
    const history = () => setHistoryOpen(true);
    const timer = setInterval(check, 30000);
    window.addEventListener("sugar:mail-sync-settings-changed", check);
    window.addEventListener("sugar:review-mail", review);
    window.addEventListener("sugar:open-sync-history", history);
    document.addEventListener("visibilitychange", check);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener("sugar:mail-sync-settings-changed", check);
      window.removeEventListener("sugar:review-mail", review);
      window.removeEventListener("sugar:open-sync-history", history);
      document.removeEventListener("visibilitychange", check);
    };
  }, [refresh]);
  const act = async (action: string, params: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      await mailSyncRequest(action, { accountId, ...params }, true);
      await refresh();
      window.dispatchEvent(new Event("sugar:interviews-changed"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败，请重试");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const suggestions = data?.messages.filter((m) => m.status === "review") || [];
  const s = data?.settings;
  const provider = s?.provider
    ? PROVIDERS[s.provider as ProviderId]?.label || s.provider
    : null;
  const problem = s?.error_code
    ? MAIL_SYNC_REASONS[s.error_code] || "检查暂时失败，会稍后重试"
    : null;
  const title = error
    ? "同步状态暂不可用"
    : !data
      ? "正在获取同步状态…"
      : problem ||
        (!s?.provider
          ? "配置 AI 后自动识别面试安排"
          : s?.enabled
            ? "自动加入面试日历 · 已开启"
            : "自动加入面试日历 · 已暂停");
  return (
    <>
      <section className="mail-auto-sync" aria-label="面试自动同步">
        <div className="mail-auto-sync-info">
          <div className="mail-auto-sync-title">
            <button
              type="button"
              role="switch"
              aria-label="自动加入面试日历"
              aria-checked={!!s?.enabled}
              disabled={!data}
              className="mail-auto-sync-switch"
              onClick={() => void act("settings", { enabled: !s?.enabled })}
            />
            <strong
              role="status"
              className={problem || error ? "has-problem" : ""}
            >
              {title}
            </strong>
          </div>
          <p>
            {error ||
              `${provider ? `使用 ${provider} · ` : ""}每 5 分钟检查收件箱${s?.last_success_at ? ` · 最近成功 ${new Date(s.last_success_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}${data?.pending ? ` · ${data.pending} 封等待识别` : ""}`}
          </p>
        </div>
        <div className="mail-auto-sync-actions">
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            disabled={!data}
          >
            待确认 {suggestions.length}
          </button>
          <button
            type="button"
            disabled={busy || !s?.enabled || !s.provider}
            onClick={() => void act("check")}
          >
            {busy || s?.checking ? "正在检查…" : "立即检查"}
          </button>
          {problem?.includes("邮箱") ? (
            <button type="button" onClick={onRepair}>
              修复邮箱
            </button>
          ) : !s?.provider || s?.error_code?.startsWith("AI_") ? (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new Event(OPEN_API_SETTINGS_EVENT))
              }
            >
              AI 设置
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            disabled={!data}
          >
            同步记录
          </button>
        </div>
      </section>
      <p className="mail-auto-sync-note">
        仅将候选面试邮件的必要内容交给你选用的 AI
        识别；明确安排自动保存，不明确的安排等待确认。
      </p>
      <Modal
        open={reviewOpen}
        title="待确认的面试安排"
        onClose={() => setReviewOpen(false)}
        maxWidth={680}
      >
        {suggestions.length ? (
          suggestions.map((m) => (
            <ReviewMail
              key={m.id}
              message={m}
              zone={s?.timezone || "Asia/Shanghai"}
              interviews={interviews}
              busy={busy}
              resolve={(params) =>
                act("resolve", { messageId: m.id, ...params })
              }
            />
          ))
        ) : (
          <p className="mail-auto-sync-empty">
            没有待确认的邮件。新安排会在检查后自动显示。
          </p>
        )}
      </Modal>
      <Modal
        open={historyOpen}
        title="面试同步记录"
        onClose={() => setHistoryOpen(false)}
        maxWidth={620}
      >
        <div className="mail-auto-sync-actions">
          <button
            type="button"
            disabled={busy || !s?.enabled || !getActiveConfig()}
            onClick={() => {
              void act("check", { backfill: true });
            }}
          >
            补充最近 7 天安排
          </button>
          <button type="button" onClick={() => void refresh()}>
            刷新记录
          </button>
        </div>
        <p className="mail-auto-sync-note">
          自动检查从启用时间开始。历史补充可能产生已过期的候选，请核对后保存。
        </p>
        {data?.messages.length ? (
          data.messages.map((m) => (
            <div key={m.id} className="mail-sync-history-row">
              <strong>{m.source_data.subject}</strong>
              <p>
                {m.status === "review"
                  ? "待确认"
                  : m.status === "suppressed"
                    ? "已删除，后续不会重新添加"
                    : m.analysis?.action === "cancel"
                      ? "面试已取消，历史保留"
                      : m.analysis?.action === "reschedule"
                        ? "已更新原面试"
                        : m.reason === "DUPLICATE"
                          ? "重复通知，已关联原安排"
                          : "已加入面试日历"}{" "}
                · {new Date(m.received_at).toLocaleString("zh-CN")}
              </p>
              {m.interview_id &&
                interviews.find((i) => i.id === m.interview_id) && (
                  <button
                    type="button"
                    onClick={() => {
                      const interview = interviews.find(
                        (i) => i.id === m.interview_id,
                      );
                      if (interview) {
                        setHistoryOpen(false);
                        onView(interview);
                      }
                    }}
                  >
                    查看安排
                  </button>
                )}
            </div>
          ))
        ) : (
          <p className="mail-auto-sync-empty">暂时没有自动录入记录。</p>
        )}
      </Modal>
    </>
  );
}
function ReviewMail({
  message: m,
  zone,
  interviews,
  busy,
  resolve,
}: {
  message: MailSyncMessage;
  zone: string;
  interviews: Interview[];
  busy: boolean;
  resolve: (params: Record<string, unknown>) => Promise<void>;
}) {
  const a = m.analysis;
  const [company, setCompany] = useState(a?.company_name || ""),
    [role, setRole] = useState(a?.position_name || ""),
    [time, setTime] = useState(
      a?.interview_time
        ? DateTime.fromISO(a.interview_time)
            .setZone(zone)
            .toFormat("yyyy-MM-dd'T'HH:mm")
        : "",
    ),
    [target, setTarget] = useState(a?.target_id || "");
  const cancellation = a?.action === "cancel";
  const update = a?.action === "reschedule" || cancellation;
  return (
    <form
      className="mail-sync-review"
      onSubmit={(e) => {
        e.preventDefault();
        void resolve({
          decision: "accept",
          company_name: company,
          position_name: role,
          local_start: time,
          ...(target
            ? {
                target_id: target,
                target_version:
                  target === a?.target_id
                    ? a?.target_version
                    : interviews.find((i) => i.id === target)?.version,
              }
            : {}),
        });
      }}
    >
      <h3>{m.source_data.subject}</h3>
      <p className="mail-sync-review-reason">
        {MAIL_SYNC_REASONS[m.reason || ""] || "请核对邮件中的具体安排"}
      </p>
      <blockquote>
        {m.evidence?.length
          ? m.evidence.map((e) => e.text).join("\n")
          : m.source_data.snippet ||
            "正文需要人工核对，请在原邮箱确认详细安排。"}
      </blockquote>
      {a?.current && (
        <p className="mail-sync-current">
          当前手动时间：
          {a.current.interview_time
            ? new Date(String(a.current.interview_time)).toLocaleString("zh-CN")
            : "尚未填写"}
          <br />
          邮件建议：
          {a.interview_time
            ? new Date(a.interview_time).toLocaleString("zh-CN")
            : "尚未确定"}
        </p>
      )}
      <fieldset disabled={busy}>
        <div className="mail-sync-review-fields">
          <label>
            公司名称
            <input
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </label>
          <label>
            岗位
            <input value={role} onChange={(e) => setRole(e.target.value)} />
          </label>
          {!cancellation && (
            <label>
              面试日期与时间
              <input
                required
                type="datetime-local"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
          )}
          <label>
            {update ? "要更新的面试" : "关联现有面试（可选）"}
            <select
              required={update && !a?.target_id}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">
                {update ? "请选择对应安排" : "新增一场面试"}
              </option>
              {interviews.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.company_name} · {i.position_name || "岗位未填"} ·{" "}
                  {i.interview_time
                    ? new Date(i.interview_time).toLocaleString("zh-CN")
                    : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mail-auto-sync-actions">
          <button
            type="button"
            onClick={() => void resolve({ decision: "ignore" })}
          >
            {m.reason === "MANUAL_EDIT_CONFLICT"
              ? "保留手动安排"
              : "忽略此建议"}
          </button>
          <button type="submit" className="mail-sync-primary">
            {cancellation
              ? "确认取消这场面试"
              : update
                ? "采用邮件安排"
                : "确认并保存安排"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
