import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ResumeFile, ResumeFileKind } from '../types';

const BUCKET = 'resumes';

function getSafeExtension(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return /^[a-z0-9]{1,10}$/.test(ext) ? `.${ext}` : '';
}

function safePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function buildStoragePath(userId: string, resumeId: string, fileName: string) {
  return [
    safePathPart(userId),
    safePathPart(resumeId),
    `${Date.now()}_${crypto.randomUUID()}${getSafeExtension(fileName)}`,
  ].join('/');
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

function readableSupabaseError(error: unknown) {
  const message = stringifyErrorValue(error);

  if (/invalid key/i.test(message)) {
    return '文件存储路径包含 Supabase 不支持的字符。系统已改为安全路径，请重新上传一次。';
  }

  if (/bucket/i.test(message) && /(not found|does not exist)/i.test(message)) {
    return 'Supabase 缺少 resumes 存储桶，请在 Supabase SQL Editor 执行 supabase/migration_resume_files.sql 后再上传。';
  }

  // RLS check must come before table-name check: RLS errors mention the table name
  // e.g. "new row violates row-level security policy for table "resume_files""
  if (/row-level security|new row violates|violates row-level/i.test(message)) {
    return `Supabase 权限策略拒绝了本次操作。原始错误：${message}`;
  }

  if (/relation.*does not exist|schema cache/i.test(message)) {
    return 'Supabase 数据库缺少简历文件表，请在 Supabase SQL Editor 执行 supabase/migration_resume_files.sql 后再上传。';
  }

  if (/failed to fetch|network/i.test(message)) {
    return '无法连接 Supabase，请检查 Vercel 环境变量和 Supabase 项目状态。';
  }

  return message || '未知上传错误，请打开浏览器开发者工具查看 Network/Console 里的 Supabase 返回内容。';
}

export function useResumeFiles() {
  const { user } = useAuth();
  const [files, setFiles] = useState<ResumeFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setFiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resume_files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error) setFiles((data ?? []) as ResumeFile[]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const upload = useCallback(
    async (resumeId: string, kind: ResumeFileKind, file: File) => {
      if (!user) throw new Error('未登录');
      if (!isSupabaseConfigured) throw new Error('Supabase 尚未配置，无法上传文件。');

      const path = buildStoragePath(user.id, resumeId, file.name);
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || undefined,
        upsert: false,
      });

      if (upErr) {
        console.error('[upload] storage error raw:', upErr);
        throw new Error(readableSupabaseError(upErr));
      }

      const { data, error: insErr } = await supabase
        .from('resume_files')
        .insert({
          user_id: user.id,
          resume_id: resumeId,
          file_name: file.name,
          file_path: path,
          kind,
          size: file.size,
        })
        .select()
        .single();

      if (insErr) {
        console.error('[upload] resume_files insert error raw:', insErr);
        await supabase.storage.from(BUCKET).remove([path]);
        throw new Error(readableSupabaseError(insErr));
      }

      setFiles((prev) => [data as ResumeFile, ...prev]);
      return data as ResumeFile;
    },
    [user],
  );

  const getDownloadUrl = useCallback(async (filePath: string) => {
    if (!filePath) throw new Error('文件路径为空，无法下载。');

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60, {
      download: true,
    });

    if (error) throw new Error(readableSupabaseError(error));
    return data.signedUrl;
  }, []);

  const remove = useCallback(async (f: ResumeFile) => {
    if (f.file_path) await supabase.storage.from(BUCKET).remove([f.file_path]);

    const { error } = await supabase.from('resume_files').delete().eq('id', f.id);
    if (error) throw new Error(readableSupabaseError(error));

    setFiles((prev) => prev.filter((x) => x.id !== f.id));
  }, []);

  return { files, loading, refresh: fetchAll, upload, getDownloadUrl, remove };
}
