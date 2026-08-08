import { useEffect, useMemo, useState } from 'react';
import type { MailboxAccount, MailboxMessage, NewMailboxAccount } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';
import { CARD } from '../lib/appHelpers';
import { Field, FormError, GhostButton, PrimaryButton, TextInput } from '../components/Field';
import EmptyState from '../components/EmptyState';
import { IconMail, IconEye, IconEyeOff } from '../components/icons';

const GUIDE_URL = 'https://help.mail.163.com/faqDetail.do?code=d7a5dc8471cd0c0e8b4b8f4f8e49998b374173cfe9171305fa1ce630d7f67ac2cda80145a1742516';

export default function Mailbox() {
  const db = useCollection<MailboxAccount>('mailbox_accounts');
  const { registerAdd } = useAppShell();
  const { theme } = useTheme();
  const toast = useToast();

  const account = db.items[0] ?? null;
  const [email, setEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [loadingMail, setLoadingMail] = useState(false);
  const [mailError, setMailError] = useState('');
  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [unseen, setUnseen] = useState(0);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<MailboxMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    registerAdd(() => {
      document.getElementById('mailbox-email')?.focus();
    });
    return () => registerAdd(null);
  }, [registerAdd]);

  useEffect(() => {
    if (account) {
      setEmail(account.email);
      setAuthCode(account.auth_code);
    }
  }, [account]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) =>
      [m.subject, m.from, m.snippet].some((v) => v.toLowerCase().includes(q)),
    );
  }, [messages, keyword]);

  const interviewHint = (m: MailboxMessage) => {
    const text = `${m.subject} ${m.snippet}`.toLowerCase();
    return /面试|interview|笔试|机考|offer|录用|通知|hr|日程|腾讯会议|飞书|zoom|meeting/.test(text);
  };

  const saveAccount = async () => {
    const e = email.trim();
    const code = authCode.trim();
    if (!e || !code) {
      setFormError('邮箱与客户端授权码均为必填。');
      return;
    }
    if (!/^[^\s@]+@(163|126|yeah)\.com$/i.test(e)) {
      setFormError('目前仅支持 @163.com / @126.com / @yeah.com');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: NewMailboxAccount = {
        provider: 'netease163',
        email: e,
        auth_code: code,
        display_name: e.split('@')[0],
      };
      if (account) {
        await db.update(account.id, payload);
      } else {
        await db.create(payload);
      }
      toast.success('邮箱账号已保存（仅你本人可见）');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const fetchMail = async () => {
    const e = (account?.email || email).trim();
    const code = (account?.auth_code || authCode).trim();
    if (!e || !code) {
      setMailError('请先保存邮箱与授权码。');
      return;
    }
    setLoadingMail(true);
    setMailError('');
    try {
      const res = await fetch('/api/mailbox-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, authCode: code, limit: 30 }),
      });
      const data = await res.json() as {
        error?: string;
        messages?: MailboxMessage[];
        unseen?: number;
        total?: number;
      };
      if (!res.ok || data.error) throw new Error(data.error || '拉取失败');
      setMessages(data.messages ?? []);
      setUnseen(data.unseen ?? 0);
      setTotal(data.total ?? 0);
      if (account) {
        await db.update(account.id, { last_synced_at: new Date().toISOString() });
      }
      toast.success(`已同步 ${data.messages?.length ?? 0} 封最近邮件`);
    } catch (err) {
      setMailError(err instanceof Error ? err.message : String(err));
      toast.error('同步邮件失败');
    } finally {
      setLoadingMail(false);
    }
  };

  const openDetail = async (msg: MailboxMessage) => {
    setSelected(msg);
    setDetailLoading(true);
    try {
      const e = (account?.email || email).trim();
      const code = (account?.auth_code || authCode).trim();
      const res = await fetch('/api/mailbox-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, authCode: code, uid: msg.uid }),
      });
      const data = await res.json() as { error?: string; message?: MailboxMessage };
      if (!res.ok || data.error) throw new Error(data.error || '读取失败');
      if (data.message) setSelected(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '读取正文失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const removeAccount = async () => {
    if (!account) return;
    if (!confirm('确定解除绑定？授权码将从你的账号中删除。')) return;
    await db.remove(account.id);
    setAuthCode('');
    setMessages([]);
    toast.info('已解除邮箱绑定');
  };

  return (
    <div className="flex flex-col gap-[18px] animate-rise">
      {db.error && <FormError message={db.error} />}

      <section style={{ ...CARD, padding: 22, borderRadius: 22 }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div style={{ width: 44, height: 44, borderRadius: 14, background: theme.accentSoft, color: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconMail size={22} />
            </div>
            <div>
              <div style={{ fontFamily: 'Poppins', fontSize: 17, fontWeight: 700 }}>连接网易邮箱</div>
              <div style={{ fontSize: 12.5, color: '#8a8478', marginTop: 3 }}>
                使用客户端授权码登录 IMAP，面试通知可在本页直接查看
              </div>
            </div>
          </div>
          <a href={GUIDE_URL} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: theme.accent }}>
            如何获取授权码 →
          </a>
        </div>

        <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: '#faf7f0', fontSize: 12.5, color: '#5d584d', lineHeight: 1.7 }}>
          <strong>安全说明：</strong>
          授权码仅保存在你自己的 Supabase 账号下（RLS 隔离），服务端不会写入日志。
          请勿使用登录密码；请在 163 设置中开启 IMAP 并生成「客户端授权码」。
        </div>

        <FormError message={formError} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3" style={{ marginTop: 14 }}>
          <Field label="邮箱地址">
            <TextInput
              id="mailbox-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@163.com"
              autoComplete="username"
            />
          </Field>
          <Field label="客户端授权码">
            <div style={{ position: 'relative' }}>
              <TextInput
                type={showCode ? 'text' : 'password'}
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="授权码，不是登录密码"
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowCode((v) => !v)}
                aria-label={showCode ? '隐藏授权码' : '显示授权码'}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#8a8478',
                  display: 'flex',
                }}
              >
                {showCode ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
          <PrimaryButton accent={theme.accent} onClick={() => void saveAccount()} disabled={saving}>
            {saving ? '保存中…' : account ? '更新账号' : '保存并绑定'}
          </PrimaryButton>
          <PrimaryButton accent="#1b1a17" onClick={() => void fetchMail()} disabled={loadingMail}>
            {loadingMail ? '同步中…' : '同步最近邮件'}
          </PrimaryButton>
          {account && (
            <GhostButton onClick={() => void removeAccount()}>解除绑定</GhostButton>
          )}
        </div>
        {account?.last_synced_at && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#9a9488' }}>
            上次同步：{new Date(account.last_synced_at).toLocaleString('zh-CN')}
            {total > 0 && ` · 收件箱 ${total} 封 · 未读 ${unseen}`}
          </div>
        )}
      </section>

      {mailError && <FormError message={mailError} />}

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_.85fr] gap-4">
        <section style={{ ...CARD, padding: 18, borderRadius: 22, minHeight: 360 }}>
          <div className="flex items-center justify-between gap-3 flex-wrap" style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 16 }}>最近邮件</div>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="筛选主题 / 发件人…"
              style={{
                height: 38,
                borderRadius: 12,
                border: '1px solid #e0d8c9',
                background: '#fffdf8',
                padding: '0 12px',
                fontSize: 13,
                minWidth: 180,
                outline: 'none',
              }}
            />
          </div>
          {db.loading ? (
            <EmptyState text="加载账号中…" />
          ) : messages.length === 0 ? (
            <EmptyState
              text="还没有同步邮件。绑定 163 后点「同步最近邮件」。"
              actionLabel="同步邮件"
              onAction={() => void fetchMail()}
            />
          ) : filtered.length === 0 ? (
            <EmptyState text="没有匹配的邮件。" />
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((m) => {
                const hot = interviewHint(m);
                const active = selected?.uid === m.uid;
                return (
                  <button
                    key={m.uid}
                    type="button"
                    onClick={() => void openDetail(m)}
                    className="btn-press"
                    style={{
                      textAlign: 'left',
                      borderRadius: 14,
                      border: active ? '1.5px solid #1b1a17' : hot ? '1px solid #d7b56f' : '1px solid #f0ebe0',
                      background: active ? '#f5f0e7' : hot ? '#fff8e8' : '#faf7f0',
                      padding: '12px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong style={{ fontSize: 13.5, color: '#1b1a17' }}>{m.subject}</strong>
                      <div className="flex gap-1 flex-none">
                        {hot && (
                          <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#fbeec2', color: '#7a5a12' }}>
                            可能面试
                          </span>
                        )}
                        {!m.seen && (
                          <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#e4e0f7', color: '#4a3f96' }}>
                            未读
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#8a8478', marginTop: 4 }}>
                      {m.from || '未知发件人'}
                      {m.date ? ` · ${new Date(m.date).toLocaleString('zh-CN')}` : ''}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#5d584d', marginTop: 6, lineHeight: 1.5 }}>
                      {m.snippet || '（无摘要）'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside style={{ ...CARD, padding: 18, borderRadius: 22, minHeight: 360 }}>
          <div style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>邮件详情</div>
          {!selected ? (
            <div style={{ fontSize: 13.5, color: '#8a8478', lineHeight: 1.7 }}>
              点击左侧邮件查看摘要。为降低风险，系统只展示纯文本摘要，不渲染原始 HTML。
            </div>
          ) : detailLoading ? (
            <EmptyState text="读取中…" />
          ) : (
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{selected.subject}</h3>
              <div style={{ fontSize: 12.5, color: '#8a8478', lineHeight: 1.7 }}>
                <div>发件人：{selected.from || '—'}</div>
                <div>时间：{selected.date ? new Date(selected.date).toLocaleString('zh-CN') : '—'}</div>
                {selected.hasAttachment && <div>含附件（请到 163 网页端下载）</div>}
              </div>
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 14,
                  background: '#faf7f0',
                  fontSize: 13.5,
                  lineHeight: 1.75,
                  color: '#3f3a32',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {selected.snippet || '（无正文摘要）'}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
