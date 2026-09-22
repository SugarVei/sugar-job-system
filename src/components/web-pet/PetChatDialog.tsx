import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ActiveConfig } from '../../contexts/ApiKeysContext';
import { streamAIChat, type AIMessage } from '../../lib/aiChatClient';
import { PROVIDERS } from '../../lib/providers';
import { PET_CHAT_GREETING, PET_CHAT_LIMIT, petChatMessages } from './petChatConfig';
import './PetChat.css';

export default function PetChatDialog({ config, loadingConfig, onClose, onSettings }: { config: ActiveConfig | null; loadingConfig: boolean; onClose: () => void; onSettings: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const request = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryText, setRetryText] = useState('');
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const modal = dialog.current;
    modal?.showModal();
    return () => { request.current?.abort(); modal?.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => { const el = transcript.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, reply, error]);

  async function send(text = draft, retry = false) {
    const value = text.trim();
    if (!value || !config || loadingConfig || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const history = retry ? messages.slice(0, -1) : messages;
    const next: AIMessage[] = [...history, { role: 'user', content: value }];
    setMessages(next); setDraft(''); setReply(''); setError(''); setRetryText(''); setStopped(false); setBusy(true);
    try {
      const result = await streamAIChat({ config, messages: petChatMessages(history, value), maxTokens: 1024, signal: controller.signal,
        onToken: text => { if (!controller.signal.aborted) setReply(text); } });
      if (!controller.signal.aborted) { setMessages([...next, { role: 'assistant', content: result }]); setReply(''); }
    } catch {
      if (!controller.signal.aborted) {
        // Never echo upstream error text: some providers include credentials or request data.
        setReply(''); setError('小糖豆暂时没连上 AI。请检查 API 配置、额度或网络，再试一次。'); setRetryText(value);
      }
    } finally {
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  }
  function stop() { request.current?.abort(); setStopped(true); }

  return createPortal(<dialog ref={dialog} className="pet-chat-dialog" aria-modal="true" aria-labelledby="pet-chat-title" onCancel={e => { e.preventDefault(); onClose(); }} onKeyDown={e => {
    if (e.key !== 'Tab') return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), [tabindex="0"]'));
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }}>
    <div className="pet-chat-panel">
      <header className="pet-chat-header"><div className="pet-chat-avatar"><img src="/pet/elephant-poster.png" alt="大象宝宝小糖豆" /></div><div><small>A LITTLE COMPANY</small><h2 id="pet-chat-title">和小糖豆聊聊</h2><p>大耳朵听你说，小鼻子陪着你。</p></div><button className="pet-chat-close" onClick={onClose} aria-label="关闭聊天">×</button></header>
      <div className="pet-chat-transcript" ref={transcript} role="log" aria-label="聊天记录" aria-live="polite" aria-busy={busy}>
        <div className="pet-chat-message assistant"><span>小糖豆 · AI</span><p>{PET_CHAT_GREETING}</p></div>
        {messages.map((message, i) => <div key={i} className={`pet-chat-message ${message.role}`}><span>{message.role === 'user' ? '你' : '小糖豆 · AI'}</span><p>{message.content}</p></div>)}
        {(busy || reply) && <div className="pet-chat-message assistant"><span>小糖豆 · AI</span><p>{reply || '正在想怎么回复你…'}</p>{stopped && <small>已停止回复</small>}</div>}
        {stopped && !reply && <p className="pet-chat-status" role="status">已停止回复</p>}
        {error && <div className="pet-chat-error" role="alert"><p>{error}</p><button onClick={() => void send(retryText, true)} disabled={busy}>重试这条消息</button><button onClick={onSettings}>检查 AI 设置</button></div>}
      </div>
      <footer className="pet-chat-footer">
        {!config ? <div className="pet-chat-setup"><strong>{loadingConfig ? '正在读取你的 AI 配置…' : '先接入 AI，就可以开聊啦'}</strong><p>使用网页左下角「AI 设置」中你选择的服务商和 API Key。还没配置也没关系，小糖豆依然可以陪你玩。</p><button className="pet-chat-primary" onClick={onSettings} disabled={loadingConfig}>去设置 AI API ↗</button></div> : <>
          {messages.length === 0 && <div className="pet-chat-suggestions">{['今天有点累', '分享一个小开心', '给我一点面试鼓励'].map(text => <button key={text} disabled={busy} onClick={() => { setDraft(text); inputRef.current?.focus(); }}>{text}</button>)}</div>}
          <form onSubmit={e => { e.preventDefault(); void send(); }}><label className="sr-only" htmlFor="pet-chat-input">想对小糖豆说什么</label><textarea ref={inputRef} id="pet-chat-input" value={draft} maxLength={PET_CHAT_LIMIT} placeholder="慢慢说，我在听…" disabled={busy} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); void send(); } }} /><div className="pet-chat-compose-actions"><small>{draft.length}/{PET_CHAT_LIMIT}</small>{busy ? <button type="button" className="pet-chat-primary" onClick={stop}>停止回复</button> : <button type="submit" className="pet-chat-primary" disabled={!draft.trim() || loadingConfig}>发送 ↑</button>}</div></form>
        </>}
        <p className="pet-chat-privacy">{config ? `当前：${PROVIDERS[config.provider].label} · ` : ''}仅发送本次聊天给你选择的 AI 服务商，费用按其规则计费。不会自动读取简历；请勿发送敏感信息。关闭聊天即清空记录。AI 陪伴不能替代专业帮助。</p>
      </footer>
    </div>
  </dialog>, document.body);
}
