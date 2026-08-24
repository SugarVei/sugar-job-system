import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ResumeFile, ResumeFileKind } from '../types';

const BUCKET = 'resumes';
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const UPLOAD_CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function getExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function getSafeExtension(fileName: string) {
  const ext = getExtension(fileName);
  return /^[a-z0-9]{1,10}$/.test(ext) ? `.${ext}` : '';
}

async function validateUploadContents(file: File, extension: string) {
  if (file.size === 0) throw new Error('文件内容为空，请重新选择简历文件。');
  if (file.size > MAX_UPLOAD_SIZE) throw new Error('简历文件不能超过 10MB。');

  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (extension === 'pdf') {
    const header = String.fromCharCode(...signature);
    if (header !== '%PDF-') throw new Error('所选文件不是有效的 PDF，请重新导出后上传。');
  }
  if (extension === 'docx' && (signature[0] !== 0x50 || signature[1] !== 0x4b)) {
    throw new Error('所选文件不是有效的 DOCX，请用 Word 重新另存后上传。');
  }
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
    return 'Supabase 数据库缺少简历文件表或最新字段，请在 Supabase SQL Editor 执行 supabase/migration_resume_files.sql 和 supabase/migration_resume_files_ai_scripts.sql 后再上传。';
  }

  if (/failed to fetch|network/i.test(message)) {
    return '无法连接 Supabase，请检查 Vercel 环境变量和 Supabase 项目状态。';
  }

  if (/mime|content.?type/i.test(message)) {
    return `文件类型被存储服务拒绝。系统已按 PDF / DOCX 扩展名修正上传类型；原始错误：${message}`;
  }

  if (/http 400/i.test(message)) {
    return `存储服务拒绝了上传请求（HTTP 400）。请刷新页面并重新登录后再试。原始错误：${message}`;
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

      const extension = getExtension(file.name);
      const contentType = UPLOAD_CONTENT_TYPES[extension];
      if (!contentType) throw new Error('暂不支持该格式，请上传 PDF 或 DOCX 文件。');
      await validateUploadContents(file, extension);

      const path = buildStoragePath(user.id, resumeId, file.name);
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        // Browser-provided File.type may be empty or application/octet-stream.
        // Storage bucket restrictions require the canonical MIME type.
        contentType,
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
          source: 'upload',
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

  const saveAIContent = useCallback(
    async (resumeId: string, fileName: string, kind: ResumeFileKind, content: string) => {
      if (!user) throw new Error('未登录');
      if (!isSupabaseConfigured) throw new Error('Supabase 尚未配置');

      const { data, error } = await supabase
        .from('resume_files')
        .insert({
          user_id: user.id,
          resume_id: resumeId,
          file_name: fileName,
          file_path: null,
          kind,
          size: null,
          content,
          source: 'ai',
        })
        .select()
        .single();

      if (error) throw new Error(readableSupabaseError(error));
      setFiles((prev) => [data as ResumeFile, ...prev]);
      return data as ResumeFile;
    },
    [user],
  );

  const saveAIScript = useCallback(
    (resumeId: string, resumeName: string, content: string) => (
      saveAIContent(resumeId, `${resumeName}-面试稿件`, 'script', content)
    ),
    [saveAIContent],
  );

  return { files, loading, refresh: fetchAll, upload, getDownloadUrl, remove, saveAIContent, saveAIScript };
}
