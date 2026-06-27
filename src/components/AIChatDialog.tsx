import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

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
  onToken: (t: string) => void,
  onError: (e: string) => void,
) {
  const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];
  let res: Response;
  try {
    res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: fullMessages, maxTokens: 2048 }),
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

export default function AIChatDialog({ systemPrompt, placeholder = '输入你的问题…', buttonLabel = '💬 AI 分析助手' }: Props) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
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

  return (
    <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
      {/* Chat window */}
      {open && (
        <div
          style={{
            pointerEvents: 'all',
            width: 'min(420px, calc(100vw - 32px))',
            height: 460,
            background: '#fffdf8',
            border: '1.5px solid #e4ddcf',
            borderRadius: 20,
            boxShadow: '0 12px 48px rgba(0,0,0,0.14)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          {/* Header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0ebe0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#faf7f0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🤖</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1b1a17' }}>AI 求职分析助手</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} style={{ fontSize: 12, color: '#a39d90', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>清空</button>
              )}
              <button onClick={() => setOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e4ddcf', background: '#fff', cursor: 'pointer', color: '#8a8478', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✕</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#a39d90', fontSize: 13, marginTop: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>💡</div>
                <div>可以问我：</div>
                <div style={{ marginTop: 8, lineHeight: 2, color: '#8a8478' }}>「我的投递情况怎么样？」<br />「哪个渠道效果最好？」<br />「给我一些求职建议」</div>
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
          <div style={{ padding: '12px 14px', borderTop: '1px solid #f0ebe0', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
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
                background: '#faf7f0', color: '#1b1a17', fontFamily: 'inherit',
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
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          pointerEvents: 'all',
          height: 44, padding: '0 20px',
          background: open ? '#f0ebe0' : theme.accent,
          color: open ? '#4a463e' : '#fff',
          border: 'none', borderRadius: 22,
          fontWeight: 700, fontSize: 14,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'background 200ms',
          whiteSpace: 'nowrap',
        }}
      >
        {open ? '✕ 关闭' : buttonLabel}
      </button>
    </div>
  );
}
