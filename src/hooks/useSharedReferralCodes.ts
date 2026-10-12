import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { SharedReferralCode } from '../types';

/** Curated codes contain no account IDs or recommender identities. */
export function useSharedReferralCodes() {
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState<SharedReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems([]);
    setError(null);
    if (!userId || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    async function load() {
      try {
        const { data, error: fetchError } = await supabase
          .from('shared_referral_codes')
          .select('id,company_name,referral_code,referrer_name,recruitment_year,status,notes,created_at,updated_at')
          .order('company_name');
        if (cancelled) return;
        if (fetchError) {
          setError('共享内推码加载失败，请稍后重试。');
        } else {
          setItems((data ?? []) as SharedReferralCode[]);
        }
      } catch {
        if (!cancelled) setError('共享内推码加载失败，请稍后重试。');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [userId]);

  return { items, loading, error };
}
