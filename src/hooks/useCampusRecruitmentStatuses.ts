import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type CampusRecruitmentState = 'pending' | 'not_started' | 'started' | 'error';

export interface CampusRecruitmentStatus {
  company_key: string;
  company_name: string;
  official_url: string;
  status: CampusRecruitmentState;
  evidence_text: string | null;
  evidence_url: string | null;
  last_checked_at: string | null;
  next_check_at: string | null;
  started_at: string | null;
  error_message: string | null;
  check_count: number;
}

export function useCampusRecruitmentStatuses() {
  const [items, setItems] = useState<CampusRecruitmentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('campus_recruitment_statuses')
      .select('company_key,company_name,official_url,status,evidence_text,evidence_url,last_checked_at,next_check_at,started_at,error_message,check_count');

    if (queryError) {
      setError(queryError.message);
    } else {
      setItems((data ?? []) as CampusRecruitmentStatus[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}
