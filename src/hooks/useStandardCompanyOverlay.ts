import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { StandardCompanyOverlay } from '../lib/standardCompanyCatalog';
import { STANDARD_CATALOG_OVERLAY_LIMIT } from '../lib/standardCompanyImport';

const OVERLAY_PAGE_SIZE = 1000;
const REFRESH_INTERVAL_MS = 5 * 60_000;

export function useStandardCompanyOverlay() {
  const [items, setItems] = useState<StandardCompanyOverlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    const request = load().finally(() => { inFlight.current = null; });
    inFlight.current = request;
    return request;

    async function load() {
      if (!isSupabaseConfigured) {
        setItems([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const rows: StandardCompanyOverlay[] = [];
        for (let from = 0; from < STANDARD_CATALOG_OVERLAY_LIMIT; from += OVERLAY_PAGE_SIZE) {
          const { data, error } = await supabase
            .from('standard_companies')
            .select('company_key,company_name,source_update_date,company_type,industry,city,deadline_text,notice_url,apply_url,url,group_name,updated_at')
            .order('company_key')
            .range(from, Math.min(from + OVERLAY_PAGE_SIZE - 1, STANDARD_CATALOG_OVERLAY_LIMIT - 1));
          if (error) {
            setError(/does not exist|schema cache/i.test(error.message)
              ? '标准公司库数据表尚未创建'
              : error.message);
            return;
          }
          const page = (data ?? []) as StandardCompanyOverlay[];
          rows.push(...page);
          if (page.length < OVERLAY_PAGE_SIZE) break;
        }

        setItems(rows);
        setError(null);
      } catch (error) {
        setError(error instanceof Error ? error.message : '标准公司库刷新失败');
      } finally {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    // Cloud imports happen outside this tab. Reload the catalogue so date
    // options and the default latest-date selection follow the new rows.
    const interval = window.setInterval(refreshWhenVisible, REFRESH_INTERVAL_MS);
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('online', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refresh]);

  const latestUpdatedAt = items.reduce<string | null>((latest, row) => {
    if (!row.updated_at) return latest;
    if (!latest || row.updated_at > latest) return row.updated_at;
    return latest;
  }, null);

  return { items, loading, error, refresh, latestUpdatedAt };
}
