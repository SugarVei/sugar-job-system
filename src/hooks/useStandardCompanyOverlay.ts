import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { StandardCompanyOverlay } from '../lib/standardCompanyCatalog';
import { STANDARD_CATALOG_OVERLAY_LIMIT } from '../lib/standardCompanyImport';

const OVERLAY_PAGE_SIZE = 1000;

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
    const rows: StandardCompanyOverlay[] = [];
    let queryError: { message: string } | null = null;
    for (let from = 0; from < STANDARD_CATALOG_OVERLAY_LIMIT; from += OVERLAY_PAGE_SIZE) {
      const { data, error } = await supabase
        .from('standard_companies')
        .select('company_key,company_name,source_update_date,company_type,industry,city,deadline_text,notice_url,apply_url,url,group_name,updated_at')
        .order('company_key')
        .range(from, Math.min(from + OVERLAY_PAGE_SIZE - 1, STANDARD_CATALOG_OVERLAY_LIMIT - 1));
      if (error) {
        queryError = error;
        break;
      }
      const page = (data ?? []) as StandardCompanyOverlay[];
      rows.push(...page);
      if (page.length < OVERLAY_PAGE_SIZE) break;
    }

    if (queryError) {
      setItems([]);
      setError(/does not exist|schema cache/i.test(queryError.message)
        ? '标准公司库数据表尚未创建'
        : queryError.message);
    } else {
      setItems(rows);
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
