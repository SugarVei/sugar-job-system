import { useEffect, useMemo, useState } from 'react';
import type { MailboxAccount, MailboxMessage, MailboxProvider, NewMailboxAccount } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';
import { CARD } from '../lib/appHelpers';
import { Field, FormError, GhostButton, PrimaryButton, TextInput } from '../components/Field';
import EmptyState from '../components/EmptyState';
import { IconMail, IconEye, IconEyeOff } from '../components/icons';

type ProviderOption = {
  id: MailboxProvider;
  label: string;
  short: string;
  hint: string;
  placeholder: string;
  secretLabel: string;
  guide: string;
  guideUrl?: string;
  needCustomHost?: boolean;
};

const PROVIDERS: ProviderOption[] = [
  {
    id: 'netease163',
    label: '网易邮箱',
    short: '163',
    hint: '163 / 126 / yeah',
    placeholder: 'you@163.com',
    secretLabel: '客户端授权码',
    guide: '设置 → POP3/SMTP/IMAP → 开启 IMAP → 生成客户端授权码',
    guideUrl: 'https://help.mail.163.com/',
  },
  {
    id: 'qq',
    label: 'QQ 邮箱',
    short: 'QQ',
    hint: 'qq.com / foxmail',
    placeholder: 'you@qq.com',
    secretLabel: '授权码',
    guide: '设置 → 账户 → 开启 IMAP/SMTP → 生成授权码',
    guideUrl: 'https://service.mail.qq.com/',
  },
  {
    id: 'gmail',
    label: 'Gmail',
    short: 'Gmail',
    hint: '需开启两步验证',
    placeholder: 'you@gmail.com',
    secretLabel: '应用专用密码',
    guide: 'Google 账号 → 安全性 → 两步验证 → 应用专用密码',
    guideUrl: 'https://myaccount.google.com/apppasswords',
  },
  {
    id: 'outlook',
    label: 'Outlook',
    short: 'Outlook',
    hint: 'outlook / hotmail',
    placeholder: 'you@outlook.com',
    secretLabel: '应用密码 / 授权码',
    guide: 'Microsoft 账号安全设置中生成应用密码，并开启 IMAP',
    guideUrl: 'https://account.microsoft.com/security',
  },
  {
    id: 'custom',
    label: '学校/其他',
    short: '自定义',
    hint: '自填 IMAP 主机',
    placeholder: 'name@university.edu.cn',
    secretLabel: '邮箱密码或授权码',
    guide: '向学校网信办索取 IMAP 服务器地址（一般 SSL 端口 993）',
    needCustomHost: true,
  },
];

async function readApiJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const clipped = text.replace(/\s+/g, ' ').trim().slice(0, 160);
    if (/FUNCTION_INVOCATION_FAILED|A server error has occurred/i.test(text)) {
      throw new Error('邮件服务暂时不可用，请稍后重试。');
    }
    if (clipped.startsWith('<!DOCTYPE') || clipped.startsWith('<html')) {
      throw new Error('邮件接口未正确部署，请等待最新部署完成后再试。');
    }
    throw new Error(clipped || `请求失败（HTTP ${res.status}）`);
  }
}

function providerOfEmail(email: string): MailboxProvider {
  const d = email.toLowerCase().split('@')[1] || '';
  if (['163.com', '126.com', 'yeah.com'].includes(d)) return 'netease163';
  if (['qq.com', 'foxmail.com'].includes(d)) return 'qq';
  if (['gmail.com', 'googlemail.com'].includes(d)) return 'gmail';
  if (/outlook\.|hotmail\.|live\.|msn\./.test(d)) return 'outlook';
  return 'custom';
}

export default function Mailbox() {
  const db = useCollection<MailboxAccount>('mailbox_accounts');
  const { registerAdd } = useAppShell();
  const { theme } = useTheme();
  const toast = useToast();

  const [activeId, setActiveId] = useState<string | null>(null);
  const account = useMemo(() => {
    if (activeId) return db.items.find((a) => a.id === activeId) ?? db.items[0] ?? null;
    return db.items[0] ?? null;
  }, [db.items, activeId]);

  const [provider, setProvider] = useState<MailboxProvider>('netease163');
  const [email, setEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
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
  const [addingNew, setAddingNew] = useState(false);

  const providerMeta = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];

  useEffect(() => {
    registerAdd(() => {
      setAddingNew(true);
      document.getElementById('mailbox-email')?.focus();
    });
    return () => registerAdd(null);
  }, [registerAdd]);

  useEffect(() => {
    if (account && !addingNew) {
      setActiveId(account.id);
      setProvider(account.provider || providerOfEmail(account.email));
      setEmail(account.email);
      setAuthCode(account.auth_code);
      setImapHost(account.imap_host || '');
      setImapPort(String(account.imap_port || 993));
    }
  }, [account, addingNew]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) =>
      [m.subject, m.from, m.snippet].some((v) => (v || '').toLowerCase().includes(q)),
    );
  }, [messages, keyword]);

  const interviewHint = (m: MailboxMessage) => {
    const text = `${m.subject} ${m.snippet}`.toLowerCase();
    return /面试|interview|笔试|机考|测评|offer|录用|通知|hr|日程|腾讯会议|飞书|zoom|meeting|校招/.test(text);
  };

  const saveAccount = async () => {
    const e = email.trim();
    const code = authCode.trim().replace(/\s+/g, '');
    if (!e || !code) {
      setFormError('邮箱与授权码均为必填。');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setFormError('邮箱地址格式不正确');
      return;
    }
    if (provider === 'custom' && !imapHost.trim()) {
      setFormError('自定义邮箱请填写 IMAP 服务器地址，例如 imap.xxx.edu.cn');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: NewMailboxAccount = {
        provider,
        email: e,
        auth_code: code,
        display_name: e.split('@')[0],
        imap_host: provider === 'custom' ? imapHost.trim() : null,
        imap_port: provider === 'custom' ? Number(imapPort) || 993 : 993,
      };
      if (account && !addingNew) {
        await db.update(account.id, payload);
        toast.success('账号已更新');
      } else {
        const created = await db.create(payload);
        setActiveId((created as MailboxAccount).id);
        setAddingNew(false);
        toast.success('邮箱已绑定');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const fetchMail = async (target?: MailboxAccount | null) => {
    const acc = target ?? account;
    const e = (acc?.email || email).trim();
    const code = (acc?.auth_code || authCode).trim().replace(/\s+/g, '');
    const prov = acc?.provider || provider;
    const host = acc?.imap_host || imapHost;
    const port = acc?.imap_port || Number(imapPort) || 993;
    if (!e || !code) {
      setMailError('请先保存邮箱与授权码。');
      return;
    }
    setLoadingMail(true);
    setMailError('');
    setSelected(null);
    try {
      const res = await fetch('/api/mailbox-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: e,
          authCode: code,
          limit: 40,
          provider: prov,
          imapHost: host || undefined,
          imapPort: port,
        }),
      });
      const data = await readApiJson(res) as {
        error?: string;
        messages?: MailboxMessage[];
        unseen?: number;
        total?: number;
      };
      if (!res.ok || data.error) throw new Error((data.error as string) || '拉取失败');
      setMessages(data.messages ?? []);
      setUnseen(data.unseen ?? 0);
      setTotal(data.total ?? 0);
      if (acc) await db.update(acc.id, { last_synced_at: new Date().toISOString() });
      toast.success(`已同步 ${data.messages?.length ?? 0} 封最近邮件`);
    } catch (err) {
      setMailError(err instanceof Error ? err.message : String(err));
      toast.error('同步邮件失败');
    } finally {
      setLoadingMail(false);
    }
  };

  const openDetail = async (msg: MailboxMessage) => {
    setSelected({ ...msg });
    setDetailLoading(true);
    try {
      const e = (account?.email || email).trim();
      const code = (account?.auth_code || authCode).trim().replace(/\s+/g, '');
      const res = await fetch('/api/mailbox-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: e,
          authCode: code,
          uid: msg.uid,
          provider: account?.provider || provider,
          imapHost: account?.imap_host || imapHost || undefined,
          imapPort: account?.imap_port || Number(imapPort) || 993,
        }),
      });
      const data = await readApiJson(res) as { error?: string; message?: MailboxMessage };
      if (!res.ok || data.error) throw new Error((data.error as string) || '读取失败');
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
    setSelected(null);
    setAddingNew(db.items.length <= 1);
    toast.info('已解除邮箱绑定');
  };

  const startAdd = () => {
    setAddingNew(true);
    setActiveId(null);
    setEmail('');
    setAuthCode('');
    setImapHost('');
    setImapPort('993');
    setProvider('netease163');
    setMessages([]);
    setSelected(null);
  };

  return (
    <div className="flex flex-col gap-[16px] animate-rise">
      {db.error && <FormError message={db.error} />}

      {db.items.length > 0 && (
        <div style={{ ...CARD, padding: 12, borderRadius: 18, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: '#8a8478', fontWeight: 600, marginRight: 4 }}>我的邮箱</span>
          {db.items.map((item) => {
            const active = !addingNew && account?.id === item.id;
            const meta = PROVIDERS.find((p) => p.id === item.provider);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setAddingNew(false);
                  setActiveId(item.id);
                  setMessages([]);
                  setSelected(null);
                }}
                className="btn-press"
                style={{
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 999,
                  border: active ? '1.5px solid #1b1a17' : '1px solid #e0d8c9',
                  background: active ? '#1b1a17' : '#fffdf8',
                  color: active ? '#f4f1ea' : '#5d584d',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {meta?.short || '邮箱'} · {item.email.split('@')[0]}
              </button>
            );
          })}
          <button
            type="button"
            onClick={startAdd}
            className="btn-press"
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 999,
              border: addingNew ? '1.5px solid #1b1a17' : '1px dashed #cfc5b4',
              background: addingNew ? '#f5f0e7' : 'transparent',
              color: '#6b665c',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + 绑定新邮箱
          </button>
        </div>
      )}

      <section style={{ ...CARD, padding: 20, borderRadius: 22 }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div style={{ width: 42, height: 42, borderRadius: 14, background: theme.accentSoft, color: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconMail size={20} />
            </div>
            <div>
              <div style={{ fontFamily: 'Poppins', fontSize: 16, fontWeight: 700 }}>
                {addingNew || !account ? '选择邮箱服务商并绑定' : '邮箱连接'}
              </div>
              <div style={{ fontSize: 12.5, color: '#8a8478', marginTop: 2 }}>
                支持网易 / QQ / Gmail / Outlook / 学校邮箱
              </div>
            </div>
          </div>
          {providerMeta.guideUrl && (
            <a href={providerMeta.guideUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: theme.accent }}>
              如何获取授权码 →
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2" style={{ marginTop: 14 }}>
          {PROVIDERS.map((p) => {
            const active = provider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvider(p.id)}
                className="btn-press"
                style={{
                  textAlign: 'left',
                  borderRadius: 14,
                  border: active ? '1.5px solid #1b1a17' : '1px solid #e8e0d2',
                  background: active ? '#1b1a17' : '#fffdf8',
                  color: active ? '#f4f1ea' : '#4a463e',
                  padding: '10px 12px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800 }}>{p.label}</div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{p.hint}</div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: '#faf7f0', fontSize: 12.5, color: '#5d584d', lineHeight: 1.65 }}>
          <strong>{providerMeta.label}：</strong>{providerMeta.guide}
          <br />
          授权信息仅保存在你的账号下（RLS），服务端不写日志。
        </div>

        <FormError message={formError} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3" style={{ marginTop: 12 }}>
          <Field label="邮箱地址">
            <TextInput
              id="mailbox-email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (addingNew || !account) {
                  const detected = providerOfEmail(e.target.value);
                  if (detected !== 'custom') setProvider(detected);
                }
              }}
              placeholder={providerMeta.placeholder}
              autoComplete="username"
            />
          </Field>
          <Field label={providerMeta.secretLabel}>
            <div style={{ position: 'relative' }}>
              <TextInput
                type={showCode ? 'text' : 'password'}
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder={providerMeta.secretLabel}
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowCode((v) => !v)}
                aria-label={showCode ? '隐藏' : '显示'}
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
          {provider === 'custom' && (
            <>
              <Field label="IMAP 服务器">
                <TextInput value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="imap.xxx.edu.cn" />
              </Field>
              <Field label="端口（SSL）">
                <TextInput value={imapPort} onChange={(e) => setImapPort(e.target.value)} placeholder="993" />
              </Field>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
          <PrimaryButton accent={theme.accent} onClick={() => void saveAccount()} disabled={saving}>
            {saving ? '保存中…' : account && !addingNew ? '更新账号' : '保存并绑定'}
          </PrimaryButton>
          <PrimaryButton accent="#1b1a17" onClick={() => void fetchMail()} disabled={loadingMail}>
            {loadingMail ? '同步中…' : '同步最近邮件'}
          </PrimaryButton>
          {account && !addingNew && (
            <GhostButton onClick={() => void removeAccount()}>解除绑定</GhostButton>
          )}
        </div>
        {account?.last_synced_at && !addingNew && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#9a9488' }}>
            上次同步：{new Date(account.last_synced_at).toLocaleString('zh-CN')}
            {total > 0 && ` · 收件箱 ${total} 封 · 未读 ${unseen}`}
          </div>
        )}
      </section>

      {mailError && <FormError message={mailError} />}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,0.95fr)_minmax(320px,1.15fr)] gap-3" style={{ minHeight: 480 }}>
        <section
          style={{
            ...CARD,
            padding: 0,
            borderRadius: 18,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 420,
          }}
        >
          <div
            className="flex items-center justify-between gap-2"
            style={{ padding: '12px 14px', borderBottom: '1px solid #efe8db', background: '#faf7f0' }}
          >
            <div style={{ fontWeight: 800, fontSize: 14 }}>收件箱</div>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索邮件"
              style={{
                height: 32,
                borderRadius: 8,
                border: '1px solid #e0d8c9',
                background: '#fff',
                padding: '0 10px',
                fontSize: 12.5,
                minWidth: 120,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {db.loading ? (
              <div style={{ padding: 24 }}><EmptyState text="加载账号中…" /></div>
            ) : messages.length === 0 ? (
              <div style={{ padding: 24 }}>
                <EmptyState text="还没有同步邮件。绑定后点「同步最近邮件」。" actionLabel="同步邮件" onAction={() => void fetchMail()} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24 }}><EmptyState text="没有匹配的邮件。" /></div>
            ) : (
              filtered.map((m) => {
                const hot = interviewHint(m);
                const active = selected?.uid === m.uid;
                return (
                  <button
                    key={m.uid}
                    type="button"
                    onClick={() => void openDetail(m)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      borderBottom: '1px solid #f0ebe0',
                      borderLeft: active ? `3px solid ${theme.accent}` : '3px solid transparent',
                      background: active ? '#fff8ee' : hot ? '#fffdf6' : '#fffdf8',
                      padding: '12px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="flex items-center gap-2" style={{ marginBottom: 3 }}>
                          {!m.seen && (
                            <span style={{ width: 7, height: 7, borderRadius: 99, background: '#3b82f6', flex: 'none' }} />
                          )}
                          <span
                            style={{
                              fontSize: 12.5,
                              fontWeight: m.seen ? 600 : 800,
                              color: '#3a342c',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {(m.from || '未知发件人').replace(/<.*>/, '').trim() || m.from}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: m.seen ? 600 : 800,
                            color: '#1b1a17',
                            lineHeight: 1.35,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {m.subject}
                        </div>
                        {m.snippet && (
                          <div style={{ fontSize: 12, color: '#8a8478', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.snippet}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 'none', textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#9a9488', whiteSpace: 'nowrap' }}>
                          {m.date ? new Date(m.date).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                        {hot && (
                          <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: '#fbeec2', color: '#7a5a12' }}>
                            可能面试
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <aside
          style={{
            ...CARD,
            padding: 0,
            borderRadius: 18,
            overflow: 'hidden',
            minHeight: 420,
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
          }}
        >
          {!selected ? (
            <div style={{ margin: 'auto', padding: 32, textAlign: 'center', color: '#8a8478', fontSize: 13.5, lineHeight: 1.7 }}>
              从左侧选择一封邮件阅读
              <br />
              正文将按接近网页邮箱的版式展示
            </div>
          ) : detailLoading ? (
            <div style={{ padding: 28 }}><EmptyState text="正在加载正文…" /></div>
          ) : (
            <>
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #efe8db', background: '#faf7f0' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, lineHeight: 1.35, color: '#1b1a17' }}>
                  {selected.subject}
                </h2>
                <div style={{ marginTop: 10, fontSize: 13, color: '#5d584d', lineHeight: 1.7 }}>
                  <div><span style={{ color: '#9a9488' }}>发件人：</span>{selected.from || '—'}</div>
                  <div>
                    <span style={{ color: '#9a9488' }}>时间：</span>
                    {selected.date ? new Date(selected.date).toLocaleString('zh-CN') : '—'}
                  </div>
                  {selected.hasAttachment && (
                    <div style={{ color: '#89631c' }}>含附件（请到原邮箱网页端下载）</div>
                  )}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px 16px', background: '#f3f0ea' }}>
                <div
                  style={{
                    margin: '12px 12px 0',
                    background: '#fff',
                    borderRadius: 8,
                    boxShadow: '0 2px 12px rgba(60,50,35,.06)',
                    padding: '22px 24px',
                    minHeight: 240,
                  }}
                >
                  {selected.html ? (
                    <div
                      className="mail-html-body"
                      dangerouslySetInnerHTML={{ __html: selected.html }}
                      style={{
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
                        fontSize: 14,
                        lineHeight: 1.75,
                        color: '#222',
                        wordBreak: 'break-word',
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, lineHeight: 1.8, color: '#333', whiteSpace: 'pre-wrap' }}>
                      {selected.snippet || '（无正文）'}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
