import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { SharedReferralCode } from '../types';

/** Shared projections contain no account IDs or recommender identities. */
export function useSharedReferralCodes() {
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState<SharedReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setError(null);
    if (!userId || !isSupabaseConfigured) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('shared_referral_codes')
        .select('id,company_name,referral_code,referrer_name,recruitment_year,owner_referral_id,status,notes,created_at,updated_at')
        .order('company_name');
      if (version !== requestVersion.current) return;
      if (fetchError) {
        setError('共享内推码加载失败，请稍后重试。');
      } else {
        setItems((data ?? []) as SharedReferralCode[]);
      }
    } catch {
      if (version === requestVersion.current) setError('共享内推码加载失败，请稍后重试。');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setItems([]);
    void refresh();
    return () => { requestVersion.current += 1; };
  }, [refresh]);

  return { items, loading, error, refresh };
}
