import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BaseRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

function stringifyErrorValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Error) return value.message;

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const parts = ['message', 'error_description', 'error', 'details', 'hint', 'statusCode', 'status']
      .map((key) => stringifyErrorValue(record[key]))
      .filter(Boolean);

    if (parts.length > 0) return parts.join(' | ');

    try {
      return JSON.stringify(value);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }

  return String(value);
}

function readableDbError(error: unknown, table: string) {
  const message = stringifyErrorValue(error);

  if (/row-level security|new row violates|violates row-level/i.test(message)) {
    return `Supabase 权限策略拒绝了 ${table} 操作。原始错误：${message}`;
  }

  if (table === 'referral_codes' && /relation.*does not exist|schema cache|referral_codes/i.test(message)) {
    return '数据库缺少内推码表，请在 Supabase SQL Editor 执行 supabase/migration_referral_codes.sql。';
  }

  if (table === 'mailbox_accounts' && /relation.*does not exist|schema cache|mailbox_accounts/i.test(message)) {
    return '数据库缺少邮箱账号表，请在 Supabase SQL Editor 执行 supabase/migration_mailbox_accounts.sql。';
  }

  if (['offers', 'interview_reviews', 'interview_review_questions'].includes(table)
    && /relation.*does not exist|schema cache|permission denied|does not exist/i.test(message)) {
    return '数据库缺少第二阶段职业模块表或 Data API 授权，请在 Supabase SQL Editor 执行 supabase/migration_phase2_career_modules.sql。';
  }

  if (/relation.*does not exist/i.test(message)) {
    return `数据库表不存在，请检查 Supabase 数据库配置。原始错误：${message}`;
  }

  if (/resume_id|resume_files/i.test(message)) {
    return 'Supabase 数据库缺少最新简历关联字段/文件表，请在 Supabase SQL Editor 执行 supabase/migration_resume_files.sql。';
  }

  if (/jd_text|jd_keywords|match_score|next_action|deadline_at|priority/i.test(message)) {
    return 'Supabase 数据库缺少投递看板/JD/提醒字段，请在 Supabase SQL Editor 执行 supabase/migration_application_status_and_p0_fields.sql。';
  }

  if (/failed to fetch|network/i.test(message)) {
    return '无法连接 Supabase，请检查 Vercel 环境变量和 Supabase 项目状态。';
  }

  return message || `${table} 操作失败，但 Supabase 没有返回可读错误信息。`;
}

function isMissingResumeId(error: unknown) {
  const message = stringifyErrorValue(error);
  return /resume_id|schema cache/i.test(message);
}

function requiresLegacyResumeFields(error: unknown) {
  const message = stringifyErrorValue(error);
  return /version_name|target_role/i.test(message);
}

function stripResumeId(payload: Record<string, unknown>) {
  const rest = { ...payload };
  delete rest.resume_id;
  return rest;
}

export function useCollection<T extends BaseRow>(
  table: 'applications' | 'companies' | 'resumes' | 'interviews' | 'offers' | 'interview_reviews' | 'interview_review_questions' | 'referral_codes' | 'mailbox_accounts',
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

    try {
      const { data, error: err } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', user.id)
        .order(orderBy.column, { ascending: orderBy.ascending ?? false });

      if (err) {
        setError(readableDbError(err, table));
        setItems([]);
      } else {
        setItems((data ?? []) as T[]);
      }
    } catch (err) {
      setError(readableDbError(err, table));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user, table, orderBy.column, orderBy.ascending]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const create = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!user) throw new Error('未登录');
      if (!isSupabaseConfigured) throw new Error('Supabase 尚未配置，无法保存数据。');

      const insertPayload = { ...payload, user_id: user.id };
      const { data, error: err } = await supabase
        .from(table)
        .insert(insertPayload)
        .select()
        .single();

      if (err && table === 'resumes' && requiresLegacyResumeFields(err)) {
        const resumePayload = payload as Record<string, unknown>;
        const { data: retryData, error: retryErr } = await supabase
          .from(table)
          .insert({
            ...insertPayload,
            version_name: resumePayload.resume_name,
            target_role: resumePayload.target_position,
          })
          .select()
          .single();

        if (retryErr) throw new Error(readableDbError(retryErr, table));

        setItems((prev) => [retryData as T, ...prev]);
        return retryData as T;
      }

      if (err && table === 'applications' && 'resume_id' in payload && isMissingResumeId(err)) {
        const { data: retryData, error: retryErr } = await supabase
          .from(table)
          .insert({ ...stripResumeId(payload), user_id: user.id })
          .select()
          .single();

        if (retryErr) throw new Error(readableDbError(retryErr, table));

        setError('投递已保存，但数据库缺少 resume_id 字段，暂时无法关联简历。请执行 supabase/migration_resume_files.sql。');
        setItems((prev) => [retryData as T, ...prev]);
        return retryData as T;
      }

      if (err) {
        if (table !== 'referral_codes') console.error(`[${table}] create error:`, err);
        throw new Error(readableDbError(err, table));
      }

      setItems((prev) => [data as T, ...prev]);
      return data as T;
    },
    [user, table],
  );

  const update = useCallback(
    async (id: string, payload: Record<string, unknown>) => {
      if (!user) throw new Error('未登录');
      const updatePayload = { ...payload, updated_at: new Date().toISOString() };
      const { data, error: err } = await supabase
        .from(table)
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (err && table === 'applications' && 'resume_id' in payload && isMissingResumeId(err)) {
        const { data: retryData, error: retryErr } = await supabase
          .from(table)
          .update({ ...stripResumeId(payload), updated_at: updatePayload.updated_at })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (retryErr) throw new Error(readableDbError(retryErr, table));

        setError('投递已更新，但数据库缺少 resume_id 字段，暂时无法关联简历。请执行 supabase/migration_resume_files.sql。');
        setItems((prev) => prev.map((it) => (it.id === id ? (retryData as T) : it)));
        return retryData as T;
      }

      if (err) throw new Error(readableDbError(err, table));

      setItems((prev) => prev.map((it) => (it.id === id ? (data as T) : it)));
      return data as T;
    },
    [table, user],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!user) throw new Error('未登录');
      const { error: err } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id);
      if (err) throw new Error(readableDbError(err, table));
      setItems((prev) => prev.filter((it) => it.id !== id));
    },
    [table, user],
  );

  return { items, loading, error, refresh: fetchAll, create, update, remove };
}
