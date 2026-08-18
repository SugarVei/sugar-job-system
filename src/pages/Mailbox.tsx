import { useEffect, useMemo, useState } from 'react';
import type { MailboxAccount, MailboxMessage, MailboxProvider, NewMailboxAccount } from '../types';
import { useCollection } from '../hooks/useCollection';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';
import { CARD } from '../lib/appHelpers';
import { Field, FormError, GhostButton, PrimaryButton, TextInput } from '../components/Field';
import EmptyState from '../components/EmptyState';
import {
  IconCheck,
  IconClock,
  IconEye,
  IconEyeOff,
  IconInterviews,
  IconMail,
  IconSearch,
  IconSettings,
} from '../components/icons';

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

function cleanSender(from: string) {
  return (from || '未知发件人').replace(/<.*>/, '').replace(/^['"]|['"]$/g, '').trim() || '未知发件人';
}

function senderMeta(message: MailboxMessage) {
  const text = `${message.from} ${message.subject}`.toLowerCase();
  const match = [
    { test: /字节|bytedance|抖音/, short: '字节', bg: '#3478e5', color: '#fff' },
    { test: /腾讯|tencent/, short: '腾讯', bg: '#2776e8', color: '#fff' },
    { test: /美团|meituan/, short: '美团', bg: '#ffd323', color: '#1b1a17' },
    { test: /阿里|alibaba|淘天|蚂蚁/, short: '阿里', bg: '#ff7a1a', color: '#fff' },
    { test: /网易|netease/, short: '网易', bg: '#ef3f3a', color: '#fff' },
  ].find((item) => item.test.test(text));
  if (match) return match;
  const sender = cleanSender(message.from);
  return { short: sender.slice(0, 2).toUpperCase(), bg: '#e9e3d8', color: '#5d584d' };
}

function formatMailDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function mailSummary(message: MailboxMessage) {
  const raw = `${message.subject} ${message.snippet} ${(message.html || '').replace(/<[^>]+>/g, ' ')}`.replace(/&nbsp;/g, ' ');
  const dateMatch = raw.match(/(20\d{2})[年/.-](\d{1,2})[月/.-](\d{1,2})日?/);
  const timeMatch = raw.match(/(?:上午|下午)?\s*([01]?\d|2[0-3])[:：]([0-5]\d)/);
  const form = /腾讯会议/i.test(raw)
    ? '腾讯会议'
    : /飞书/i.test(raw)
      ? '飞书会议'
      : /zoom/i.test(raw)
        ? 'Zoom'
        : /线下|现场|到店|到场/.test(raw)
          ? '线下面试'
          : /线上|视频|远程/.test(raw)
            ? '线上面试'
            : '查看邮件正文';
  const positionMatch = raw.match(/([\u4e00-\u9fa5A-Za-z0-9+.#-]{2,24}(?:实习生|工程师|分析师|设计师|产品经理|管培生|专员))/);
  const date = dateMatch ? `${Number(dateMatch[2])}月${Number(dateMatch[3])}日` : '查看邮件';
  const time = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '';
  return { interviewTime: `${date}${time ? ` ${time}` : ''}`, form, position: positionMatch?.[1] || '查看邮件主题' };
}

export default function Mailbox() {
  const db = useCollection<MailboxAccount>('mailbox_accounts');
  const { registerAdd, navigate } = useAppShell();
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unreadFirst, setUnreadFirst] = useState(false);
  const [processed, setProcessed] = useState<Set<number>>(() => new Set());

  const providerMeta = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];

  useEffect(() => {
    registerAdd(() => {
      setAddingNew(true);
      setSettingsOpen(true);
      document.getElementById('mailbox-email')?.focus();
    });
    return () => registerAdd(null);
  }, [registerAdd]);

  useEffect(() => {
    if (!db.loading && db.items.length === 0) setSettingsOpen(true);
  }, [db.items.length, db.loading]);

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
    const result = q ? messages.filter((m) =>
      [m.subject, m.from, m.snippet].some((v) => (v || '').toLowerCase().includes(q)),
    ) : [...messages];
    return unreadFirst ? result.sort((a, b) => Number(a.seen) - Number(b.seen)) : result;
  }, [messages, keyword, unreadFirst]);

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
      setSettingsOpen(false);
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
      const nextMessages = data.messages ?? [];
      setMessages(nextMessages);
      setSelected(nextMessages[0] ?? null);
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
    setSettingsOpen(true);
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
    setSettingsOpen(true);
  };

  const selectedMeta = selected ? senderMeta(selected) : null;
  const selectedSummary = selected ? mailSummary(selected) : null;
  const selectedProcessed = selected ? processed.has(selected.uid) : false;

  const toggleProcessed = () => {
    if (!selected) return;
    setProcessed((current) => {
      const next = new Set(current);
      if (next.has(selected.uid)) next.delete(selected.uid);
      else next.add(selected.uid);
      return next;
    });
  };

  const addToInterviewCalendar = () => {
    toast.info('已进入面试日历，请确认时间后新增安排');
    navigate('interviews');
  };

  return (
    <div className="flex flex-col gap-[12px]">
      {db.error && <FormError message={db.error} />}

      <section style={{ ...CARD, padding: '14px 18px', borderRadius: 18 }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: theme.accentSoft, color: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <IconMail size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="flex items-center gap-3 flex-wrap">
                <strong style={{ fontFamily: 'Poppins', fontSize: 16.5 }}>{account ? `${PROVIDERS.find((p) => p.id === account.provider)?.short || '邮箱'} · ${account.email.split('@')[0]}` : '尚未绑定邮箱'}</strong>
                {account && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#2f7a45', fontSize: 12.5, fontWeight: 700 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: '#2f9b50' }} />已连接</span>}
                {account && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#9a9488', fontSize: 12 }}><IconClock size={14} />{account.last_synced_at ? `同步于 ${new Date(account.last_synced_at).toLocaleString('zh-CN')}` : '尚未同步'}</span>}
              </div>
              <div style={{ marginTop: 3, color: '#8a8478', fontSize: 12 }}>
                {account ? account.email : '支持网易、QQ、Gmail、Outlook 与学校邮箱'}
                {total > 0 && ` · 共 ${total} 封 · 未读 ${unseen}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-press" disabled={!account || loadingMail} onClick={() => void fetchMail()} style={outlineAction}>
              <span style={{ fontSize: 17, lineHeight: 1 }}>{loadingMail ? '…' : '↻'}</span>{loadingMail ? '同步中' : '同步邮件'}
            </button>
            <button type="button" className="btn-press" onClick={() => setSettingsOpen((open) => !open)} style={outlineAction}>
              <IconSettings size={16} />{account ? '管理邮箱' : '绑定邮箱'}
            </button>
          </div>
        </div>
      </section>

      {settingsOpen && (
        <section style={{ ...CARD, padding: 18, borderRadius: 18, border: '1px solid #ece4d6' }}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{addingNew || !account ? '绑定邮箱' : '邮箱设置'}</div>
              <div style={{ fontSize: 12, color: '#8a8478', marginTop: 3 }}>授权信息仅保存在你的账号下（RLS），服务端不写日志。</div>
            </div>
            {providerMeta.guideUrl && <a href={providerMeta.guideUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: theme.accent }}>如何获取授权码 →</a>}
          </div>

          {db.items.length > 0 && (
            <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
              {db.items.map((item) => {
                const active = !addingNew && account?.id === item.id;
                return <button key={item.id} type="button" className="btn-press" onClick={() => { setAddingNew(false); setActiveId(item.id); setMessages([]); setSelected(null); }} style={{ ...accountChip, background: active ? '#1b1a17' : '#fffdf8', color: active ? '#fffdf8' : '#5d584d', borderColor: active ? '#1b1a17' : '#e0d8c9' }}>{PROVIDERS.find((p) => p.id === item.provider)?.short || '邮箱'} · {item.email.split('@')[0]}</button>;
              })}
              <button type="button" className="btn-press" onClick={startAdd} style={{ ...accountChip, borderStyle: 'dashed', background: 'transparent' }}>＋ 绑定新邮箱</button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2" style={{ marginTop: 12 }}>
            {PROVIDERS.map((p) => {
              const active = provider === p.id;
              return <button key={p.id} type="button" onClick={() => setProvider(p.id)} className="btn-press" style={{ textAlign: 'left', borderRadius: 12, border: active ? '1.5px solid #1b1a17' : '1px solid #e8e0d2', background: active ? '#1b1a17' : '#fffdf8', color: active ? '#f4f1ea' : '#4a463e', padding: '9px 11px', cursor: 'pointer' }}><div style={{ fontSize: 12.5, fontWeight: 800 }}>{p.label}</div><div style={{ fontSize: 10.5, opacity: 0.75, marginTop: 2 }}>{p.hint}</div></button>;
            })}
          </div>
          <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 10, background: '#faf7f0', fontSize: 12, color: '#5d584d' }}><strong>{providerMeta.label}：</strong>{providerMeta.guide}</div>
          <FormError message={formError} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3" style={{ marginTop: 8 }}>
            <Field label="邮箱地址"><TextInput id="mailbox-email" value={email} onChange={(e) => { setEmail(e.target.value); if (addingNew || !account) { const detected = providerOfEmail(e.target.value); if (detected !== 'custom') setProvider(detected); } }} placeholder={providerMeta.placeholder} autoComplete="username" /></Field>
            <Field label={providerMeta.secretLabel}><div style={{ position: 'relative' }}><TextInput type={showCode ? 'text' : 'password'} value={authCode} onChange={(e) => setAuthCode(e.target.value)} placeholder={providerMeta.secretLabel} autoComplete="current-password" style={{ paddingRight: 44 }} /><button type="button" onClick={() => setShowCode((v) => !v)} aria-label={showCode ? '隐藏' : '显示'} style={eyeButton}>{showCode ? <IconEyeOff size={16} /> : <IconEye size={16} />}</button></div></Field>
            {provider === 'custom' && <><Field label="IMAP 服务器"><TextInput value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="imap.xxx.edu.cn" /></Field><Field label="端口（SSL）"><TextInput value={imapPort} onChange={(e) => setImapPort(e.target.value)} placeholder="993" /></Field></>}
          </div>
          <div className="flex flex-wrap gap-2" style={{ marginTop: 6 }}>
            <PrimaryButton accent={theme.accent} onClick={() => void saveAccount()} disabled={saving}>{saving ? '保存中…' : account && !addingNew ? '更新账号' : '保存并绑定'}</PrimaryButton>
            {account && !addingNew && <GhostButton onClick={() => void removeAccount()}>解除绑定</GhostButton>}
            <GhostButton onClick={() => setSettingsOpen(false)}>收起设置</GhostButton>
          </div>
        </section>
      )}

      {mailError && <FormError message={mailError} />}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(330px,0.42fr)_minmax(430px,0.58fr)] gap-3" style={{ minHeight: 535 }}>
        <section
          style={{
            ...CARD,
            padding: 0,
            borderRadius: 20,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 500,
          }}
        >
          <div
            className="flex items-center justify-between gap-2"
            style={{ padding: '14px 14px 12px', borderBottom: '1px solid #efe8db', background: '#fffdf8' }}
          >
            <div style={{ fontWeight: 800, fontSize: 15 }}>面试邮件</div>
            <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
              <label style={{ height: 34, display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #e0d8c9', background: '#fff', borderRadius: 9, padding: '0 10px', color: '#9a9488', minWidth: 0 }}><IconSearch size={14} /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索邮件" style={{ border: 0, outline: 0, background: 'transparent', width: 104, minWidth: 0, fontSize: 12 }} /></label>
              <button type="button" className="btn-press" aria-pressed={unreadFirst} onClick={() => setUnreadFirst((value) => !value)} style={{ height: 34, borderRadius: 9, border: `1px solid ${unreadFirst ? '#1b1a17' : '#e0d8c9'}`, background: unreadFirst ? '#1b1a17' : '#fffdf8', color: unreadFirst ? '#fffdf8' : '#5d584d', padding: '0 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}>未读优先</button>
            </div>
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
                const meta = senderMeta(m);
                const isProcessed = processed.has(m.uid);
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
                      borderLeft: active ? '3px solid #f0613f' : '3px solid transparent',
                      background: active ? '#fff8e9' : '#fffdf8',
                      padding: '13px 14px 13px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', flex: 'none', background: meta.bg, color: meta.color, fontSize: meta.short.length > 2 ? 10 : 12, fontWeight: 800 }}>{meta.short}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="flex items-start justify-between gap-2" style={{ marginBottom: 3 }}>
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
                            {cleanSender(m.from)}
                          </span>
                          <span style={{ fontSize: 10.5, color: '#9a9488', whiteSpace: 'nowrap' }}>{formatMailDate(m.date)}</span>
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
                        <div className="flex items-center justify-between gap-2" style={{ marginTop: 6, minHeight: 18 }}>
                          <div>{(hot || isProcessed) && <span style={{ display: 'inline-block', fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: isProcessed ? '#e7eee2' : '#fbeec2', color: isProcessed ? '#477051' : '#7a5a12' }}>{isProcessed ? '已处理' : '待处理'}</span>}</div>
                          {!m.seen && <span title="未读" style={{ width: 7, height: 7, borderRadius: 99, background: '#f0613f', flex: 'none' }} />}
                        </div>
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
            borderRadius: 20,
            overflow: 'hidden',
            minHeight: 500,
            display: 'flex',
            flexDirection: 'column',
            background: '#fffdf8',
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
              <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #efe8db', background: '#fffdf8' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                    <span style={{ width: 42, height: 42, borderRadius: 13, display: 'grid', placeItems: 'center', flex: 'none', background: selectedMeta?.bg, color: selectedMeta?.color, fontSize: selectedMeta && selectedMeta.short.length > 2 ? 10 : 12, fontWeight: 800 }}>{selectedMeta?.short}</span>
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 800 }}>{cleanSender(selected.from)}</div><div style={{ fontSize: 11.5, color: '#9a9488', marginTop: 2 }}>发送至 {account?.email || '我的邮箱'}</div></div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}><span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: selectedProcessed ? '#e7eee2' : '#fbeec2', color: selectedProcessed ? '#477051' : '#7a5a12' }}>{selectedProcessed ? '已处理' : '待处理'}</span><div style={{ fontSize: 11, color: '#9a9488', marginTop: 6 }}>{formatMailDate(selected.date)}</div></div>
                </div>
                <h2 style={{ margin: '14px 0 0', fontSize: 19, fontWeight: 800, lineHeight: 1.35, color: '#1b1a17' }}>{selected.subject}</h2>
                {selected.hasAttachment && <div style={{ marginTop: 6, color: '#89631c', fontSize: 11.5 }}>含附件（请到原邮箱网页端下载）</div>}
                <div className="grid grid-cols-1 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-0" style={{ marginTop: 16, padding: '14px 14px', border: '1px solid #e8e0d2', borderRadius: 14, background: '#faf7f0' }}>
                  <SummaryCell icon={<IconInterviews size={16} />} label="面试时间" value={selectedSummary?.interviewTime || '查看邮件'} />
                  <SummaryCell icon={<IconMail size={16} />} label="面试形式" value={selectedSummary?.form || '查看邮件正文'} />
                  <SummaryCell icon={<IconSettings size={16} />} label="岗位" value={selectedSummary?.position || '查看邮件主题'} />
                  <div className="flex flex-col justify-center gap-2" style={{ paddingLeft: 12 }}><button type="button" className="btn-press" onClick={addToInterviewCalendar} style={{ height: 38, padding: '0 14px', border: 0, borderRadius: 10, background: '#1b1a17', color: '#fffdf8', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}><span className="flex items-center gap-2"><IconInterviews size={15} />添加到面试日历</span></button><button type="button" className="btn-press" onClick={toggleProcessed} style={{ height: 36, padding: '0 14px', border: '1px solid #d9d0c1', borderRadius: 10, background: '#fffdf8', color: '#4a463e', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}><span className="flex items-center gap-2"><IconCheck size={15} />{selectedProcessed ? '取消已处理' : '标记已处理'}</span></button></div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '2px 4px 16px', background: '#fffdf8' }}>
                <div
                  style={{
                    margin: '10px 12px 0',
                    background: '#fffdf8',
                    borderRadius: 10,
                    padding: '14px 18px',
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

function SummaryCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div style={{ minWidth: 0, padding: '2px 14px', borderRight: '1px solid #e8e0d2' }}><div className="flex items-center gap-2" style={{ color: '#8a8478', fontSize: 11.5 }}>{icon}{label}</div><div title={value} style={{ marginTop: 8, color: '#1b1a17', fontSize: 13.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div></div>;
}

const outlineAction: React.CSSProperties = { height: 40, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 14px', border: '1px solid #ded5c7', borderRadius: 11, background: '#fffdf8', color: '#3f3b34', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };
const accountChip: React.CSSProperties = { height: 32, padding: '0 11px', border: '1px solid #e0d8c9', borderRadius: 999, color: '#5d584d', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
const eyeButton: React.CSSProperties = { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#8a8478', display: 'flex' };
