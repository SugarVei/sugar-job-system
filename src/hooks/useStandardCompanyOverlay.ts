import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { StandardCompanyOverlay } from '../lib/standardCompanyCatalog';

export function useStandardCompanyOverlay() {
  const [items, setItems] = useState<StandardCompanyOverlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('standard_companies')
      .select('company_key,company_name,industry,city,url,group_name,updated_at')
      .limit(3000);

    if (queryError) {
      setItems([]);
      setError(/does not exist|schema cache/i.test(queryError.message)
        ? '标准公司库数据表尚未创建'
        : queryError.message);
    } else {
      setItems((data ?? []) as StandardCompanyOverlay[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const latestUpdatedAt = items.reduce<string | null>((latest, row) => {
    if (!row.updated_at) return latest;
    if (!latest || row.updated_at > latest) return row.updated_at;
    return latest;
  }, null);

  return { items, loading, error, refresh, latestUpdatedAt };
}
