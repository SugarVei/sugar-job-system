import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useApiKeys } from '../contexts/ApiKeysContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  systemPrompt: string;
  placeholder?: string;
  buttonLabel?: string;
}

async function streamChat(
  messages: Message[],
  systemPrompt: string,
  providerConfig: { apiKey: string; model: string; provider: string } | null,
  onToken: (t: string) => void,
  onError: (e: string) => void,
) {
  const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];
  let res: Response;
  try {
    res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: fullMessages,
        maxTokens: 2048,
        ...(providerConfig ? {
          provider: providerConfig.provider,
          apiKey: providerConfig.apiKey,
          model: providerConfig.model,
        } : {}),
      }),
    });
  } catch {
    onError('网络错误，无法连接 AI 接口。');
    return;
  }

  if (!res.body) { onError('无响应流'); return; }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        if (json.error) { onError(json.error); return; }
        const token: string | undefined = json.choices?.[0]?.delta?.content;
        if (token) onToken(token);
      } catch { /* skip */ }
    }
  }
}

export default function AIChatDialog({
  systemPrompt,
  placeholder = '输入你的问题…',
  buttonLabel = '💬 AI 分析助手',
}: Props) {
  const { theme } = useTheme();
  const { requireActiveConfig } = useApiKeys();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 120);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const providerConfig = requireActiveConfig(buttonLabel.replace(/^\p{Extended_Pictographic}+\s*/u, ''));
    if (!providerConfig) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    const assistantIdx = newMessages.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    await streamChat(
      newMessages,
      systemPrompt,
      providerConfig,
      (token) => {
        setMessages(prev => {
          const next = [...prev];
          next[assistantIdx] = { role: 'assistant', content: (next[assistantIdx]?.content ?? '') + token };
          return next;
        });
      },
      (err) => {
        setMessages(prev => {
          const next = [...prev];
          next[assistantIdx] = { role: 'assistant', content: `⚠️ ${err}` };
          return next;
        });
      },
    );
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const openChat = () => {
    if (!requireActiveConfig(buttonLabel.replace(/^\p{Extended_Pictographic}+\s*/u, ''))) return;
    setOpen(true);
  };

  const modal = open ? createPortal(
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(40,30,25,0.34)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        animation: 'fadeIn .2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          height: 'min(560px, calc(100vh - 80px))',
          background: 'rgba(255,253,250,0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 26,
          boxShadow: '0 30px 80px rgba(120,40,70,.24)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'popIn .26s ease both',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f0ebe0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <div style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 15, color: '#1b1a17' }}>AI 求职分析助手</div>
              <div style={{ fontSize: 11.5, color: '#a39d90', marginTop: 1 }}>基于你的真实数据进行分析</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} style={{ fontSize: 12, color: '#a39d90', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px', borderRadius: 6 }}>清空</button>
            )}
            <button
              onClick={() => setOpen(false)}
              style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #e4ddcf', background: '#faf7f0', color: '#8a8478', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}
            >✕</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#a39d90', fontSize: 13, marginTop: 40 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💡</div>
              <div style={{ fontWeight: 600, color: '#6b665c', marginBottom: 8 }}>可以问我：</div>
              <div style={{ lineHeight: 2.2, color: '#8a8478' }}>
                「我的投递情况怎么样？」<br />
                「哪个渠道效果最好？」<br />
                「给我一些求职建议」
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? theme.accent : '#f5f0e7',
                  color: msg.role === 'user' ? '#fff' : '#2a2720',
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content || (loading && i === messages.length - 1 ? '▌' : '')}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f0ebe0', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0, background: '#faf7f0' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            rows={1}
            disabled={loading}
            style={{
              flex: 1, resize: 'none', border: '1.5px solid #e4ddcf', borderRadius: 12,
              padding: '9px 12px', fontSize: 13.5, lineHeight: 1.5, outline: 'none',
              background: '#fff', color: '#1b1a17', fontFamily: 'inherit',
              maxHeight: 100, overflowY: 'auto',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: 38, height: 38, borderRadius: 11, border: 'none', flexShrink: 0,
              background: !input.trim() || loading ? '#e4ddcf' : theme.accent,
              color: '#fff', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}
          >
            {loading ? '…' : '↑'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      {/* 触发按钮 —— 内联放置，由调用方控制位置 */}
      <button
        onClick={openChat}
        className="btn-press"
        style={{
          height: 44,
          padding: '0 18px',
          background: theme.accent,
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          fontWeight: 700,
          fontSize: 13.5,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          whiteSpace: 'nowrap',
          transition: 'opacity 160ms',
        }}
      >
        {buttonLabel}
      </button>

      {modal}
    </>
  );
}
