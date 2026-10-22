import { useEffect, useRef, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useApiKeys } from '../../contexts/ApiKeysContext';
import { PROVIDERS } from '../../lib/providers';

interface BalanceInfo {
  currency: string;
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
}

// 原投递总览底部的 AI API 余额卡片，压缩成一行
export default function ApiBalanceStrip() {
  const { keys, activeProvider } = useApiKeys();
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const provider = PROVIDERS[activeProvider];
  const apiKey = keys[activeProvider];

  const fetch_ = async () => {
    if (!apiKey) return;
    if (!provider.supportsBalance) { setBalance(null); setAvailable(null); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/deepseek-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json() as { error?: string; is_available?: boolean; balance_infos?: BalanceInfo[] };
      if (data.error) throw new Error(data.error);
      setAvailable(data.is_available ?? true);
      setBalance(data.balance_infos?.[0] ?? null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setBalance(null); setAvailable(null); setError(''); setLastUpdated(null);
    fetch_();
    timerRef.current = setInterval(fetch_, 5 * 60 * 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProvider, apiKey]);

  const fmt = (v: string) => `¥${parseFloat(v).toFixed(2)}`;
  const hhmm = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  let detail;
  if (!apiKey) detail = <span>请在侧边栏「⚙️ AI 设置」中配置 {provider.label} 的 API Key，即可在此查看余额</span>;
  else if (!provider.supportsBalance) detail = <span>该服务商不提供余额查询 API</span>;
  else if (error) detail = <span className="do-strip-error">{error}</span>;
  else if (balance) detail = <>
    <span className="do-strip-amount">{fmt(balance.total_balance)}</span>
    {available !== null && <span className={`do-strip-state${available ? '' : ' is-down'}`}>● {available ? '正常' : '不可用'}</span>}
    <span>充值 {fmt(balance.topped_up_balance)} · 赠送 {fmt(balance.granted_balance)}{lastUpdated ? ` · 更新于 ${hhmm(lastUpdated)}` : ''}</span>
  </>;
  else detail = <span>{loading ? '正在获取余额…' : '暂无数据'}</span>;

  return (
    <div className="do-strip">
      <span className="do-strip-icon"><Wallet size={17} /></span>
      <strong>{provider.label} API 余额</strong>
      {detail}
      {apiKey && (
        <div className="do-strip-actions">
          {provider.supportsBalance && <button type="button" className="do-link" onClick={fetch_} disabled={loading}>{loading ? '刷新中…' : '↺ 刷新'}</button>}
          <a className="do-link" href={provider.topUpUrl} target="_blank" rel="noopener noreferrer">去充值 ›</a>
        </div>
      )}
    </div>
  );
}
