import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { PROVIDERS, type ProviderId } from '../lib/providers';
import ApiRequiredDialog from '../components/ApiRequiredDialog';
import { mailSyncRequest } from '../lib/mailSyncClient';

type KeyMap = Partial<Record<ProviderId, string>>;

const STORAGE_KEY = 'sugar_active_provider';
export const OPEN_API_SETTINGS_EVENT = 'sugar:open-api-settings';

export interface ActiveConfig {
  apiKey: string;
  model: string;
  provider: ProviderId;
}

interface ApiKeysValue {
  keys: KeyMap;
  loading: boolean;
  activeProvider: ProviderId;
  setActiveProvider: (p: ProviderId) => void;
  saveKey: (provider: ProviderId, apiKey: string) => Promise<void>;
  removeKey: (provider: ProviderId) => Promise<void>;
  getActiveConfig: () => ActiveConfig | null;
  requireActiveConfig: (featureName?: string) => ActiveConfig | null;
}

const Ctx = createContext<ApiKeysValue | null>(null);

export function ApiKeysProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [keys, setKeys] = useState<KeyMap>({});
  const [loading, setLoading] = useState(true);
  const [activeProvider, setActiveProviderState] = useState<ProviderId>(
    () => (localStorage.getItem(STORAGE_KEY) as ProviderId | null) ?? 'deepseek',
  );
  const [requiredFeature, setRequiredFeature] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) { setKeys({}); setLoading(false); return; }
    const { data } = await supabase
      .from('user_api_keys')
      .select('provider, api_key')
      .eq('user_id', userId);
    const map: KeyMap = {};
    for (const row of (data ?? [])) map[row.provider as ProviderId] = row.api_key as string;
    setKeys(map);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  useEffect(() => {
    if (!userId || loading || !keys[activeProvider]) return;
    const controller = new AbortController();
    void mailSyncRequest('provider', { provider: activeProvider }, true, controller.signal)
      .then(() => window.dispatchEvent(new Event('sugar:mail-sync-settings-changed')))
      .catch(() => { /* Mailbox status reports configuration failures; existing AI features stay usable. */ });
    return () => controller.abort();
  }, [userId, loading, activeProvider, keys]);

  const saveKey = useCallback(async (provider: ProviderId, apiKey: string) => {
    if (!user) throw new Error('未登录');
    const { error } = await supabase.from('user_api_keys').upsert(
      { user_id: user.id, provider, api_key: apiKey, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,provider' },
    );
    if (error) throw new Error('AI Key 未保存成功，请重试');
    setKeys(prev => ({ ...prev, [provider]: apiKey }));
  }, [user]);

  const removeKey = useCallback(async (provider: ProviderId) => {
    if (!user) throw new Error('未登录');
    const { error } = await supabase.from('user_api_keys').delete().eq('user_id', user.id).eq('provider', provider);
    if (error) throw new Error('AI Key 未删除成功，请重试');
    setKeys(prev => { const next = { ...prev }; delete next[provider]; return next; });
  }, [user]);

  const setActiveProvider = useCallback((p: ProviderId) => {
    localStorage.setItem(STORAGE_KEY, p);
    setActiveProviderState(p);
  }, []);

  const getActiveConfig = useCallback((): ActiveConfig | null => {
    const apiKey = keys[activeProvider];
    if (!apiKey) return null;
    const { model } = PROVIDERS[activeProvider];
    return { apiKey, model, provider: activeProvider };
  }, [keys, activeProvider]);

  const requireActiveConfig = useCallback((featureName = 'AI 功能'): ActiveConfig | null => {
    const config = getActiveConfig();
    if (config) return config;
    setRequiredFeature(featureName);
    return null;
  }, [getActiveConfig]);

  const openSettings = useCallback(() => {
    setRequiredFeature(null);
    window.dispatchEvent(new Event(OPEN_API_SETTINGS_EVENT));
  }, []);

  return (
    <Ctx.Provider value={{ keys, loading, activeProvider, setActiveProvider, saveKey, removeKey, getActiveConfig, requireActiveConfig }}>
      {children}
      <ApiRequiredDialog
        open={requiredFeature !== null}
        featureName={requiredFeature ?? 'AI 功能'}
        onClose={() => setRequiredFeature(null)}
        onOpenSettings={openSettings}
      />
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApiKeys() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApiKeys must be used within ApiKeysProvider');
  return ctx;
}
