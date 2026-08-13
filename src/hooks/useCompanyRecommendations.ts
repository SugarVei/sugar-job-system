import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type CompanyRecommendationType = 'standard' | 'private';
export type CompanyRecommendationSource = 'resume' | 'ai_search';

export interface CompanyRecommendation {
  id: string;
  user_id: string;
  run_id: string | null;
  source: CompanyRecommendationSource;
  recommendation_type: CompanyRecommendationType;
  company_name: string;
  industry: string | null;
  city: string | null;
  company_type: string | null;
  website: string | null;
  match_score: number | null;
  reason: string | null;
  created_at: string;
}

export function useCompanyRecommendations() {
  const { user } = useAuth();
  const [items, setItems] = useState<CompanyRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('company_recommendations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setItems((data ?? []) as CompanyRecommendation[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('company_recommendations').delete().eq('id', id);
    if (error) throw error;
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return { items, loading, refresh, remove };
}
