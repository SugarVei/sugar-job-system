import { useCallback, useEffect, useState } from 'react';
import { resumeAssistantApi } from '../lib/resumeAssistantApi';
import type { ExtensionDevice } from '../types/resumeAssistant';

export function useExtensionDevices() {
  const [devices, setDevices] = useState<ExtensionDevice[]>([]);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [pairExpiresAt, setPairExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [localOnly, setLocalOnly] = useState(false);
  const refresh = useCallback(async () => {
    try { const { devices: next } = await resumeAssistantApi.listDevices(); setDevices(next); setLocalOnly(false); }
    catch { setLocalOnly(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const requestPair = useCallback(async () => {
    try {
      const pair = await resumeAssistantApi.requestPairCode(); setPairCode(pair.pair_code); setPairExpiresAt(pair.expires_at); setLocalOnly(false);
    } catch {
      const demoCode = String(Math.floor(100000 + Math.random() * 900000)); setPairCode(demoCode); setPairExpiresAt(new Date(Date.now() + 300000).toISOString()); setLocalOnly(true);
    }
  }, []);
  const revoke = useCallback(async (id: string) => { await resumeAssistantApi.revokeDevice(id); setDevices(current => current.filter(device => device.id !== id)); }, []);
  return { devices, pairCode, pairExpiresAt, loading, localOnly, requestPair, revoke, refresh, closePair: () => setPairCode(null) };
}
