import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// 通用数据集合 Hook —— 封装某张表的增删改查
// RLS 保证只能读写自己的数据（见 supabase/schema.sql）
// ============================================================

interface BaseRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function useCollection<T extends BaseRow>(
  table: 'applications' | 'companies' | 'resumes' | 'interviews',
  orderBy: { column: string; ascending?: boolean } = { column: 'created_at', ascending: false },
) {
  const { user } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', user.id)
      .order(orderBy.column, { ascending: orderBy.ascending ?? false });
    if (err) {
      setError(err.message);
      setItems([]);
    } else {
      setItems((data ?? []) as T[]);
    }
    setLoading(false);
  }, [user, table, orderBy.column, orderBy.ascending]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /** 新增一条记录（自动带上当前 user_id） */
  const create = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!user) throw new Error('未登录');
      const { data, error: err } = await supabase
        .from(table)
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (err) throw err;
      setItems((prev) => [data as T, ...prev]);
      return data as T;
    },
    [user, table],
  );

  /** 更新一条记录 */
  const update = useCallback(
    async (id: string, payload: Record<string, unknown>) => {
      const { data, error: err } = await supabase
        .from(table)
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (err) throw err;
      setItems((prev) => prev.map((it) => (it.id === id ? (data as T) : it)));
      return data as T;
    },
    [table],
  );

  /** 删除一条记录 */
  const remove = useCallback(
    async (id: string) => {
      const { error: err } = await supabase.from(table).delete().eq('id', id);
      if (err) throw err;
      setItems((prev) => prev.filter((it) => it.id !== id));
    },
    [table],
  );

  return { items, loading, error, refresh: fetchAll, create, update, remove };
}
