import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ResumeFile, ResumeFileKind } from '../types';

const BUCKET = 'resumes';

// ============================================================
// 简历附件管理 —— 上传/下载/删除，文件存 Supabase Storage，
// 元数据存 resume_files 表。按 用户ID/简历ID/文件 路径隔离。
// ============================================================
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
    const { data, error } = await supabase
      .from('resume_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setFiles((data ?? []) as ResumeFile[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /** 上传一个文件到指定简历下 */
  const upload = useCallback(
    async (resumeId: string, kind: ResumeFileKind, file: File) => {
      if (!user) throw new Error('未登录');
      // 去掉文件名里的特殊字符，避免 Storage 路径报错
      const safe = file.name.replace(/[^\w.\-一-龥]/g, '_');
      const path = `${user.id}/${resumeId}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (upErr) throw upErr;

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
        // 元数据写入失败则回滚已上传的对象
        await supabase.storage.from(BUCKET).remove([path]);
        throw insErr;
      }
      setFiles((prev) => [data as ResumeFile, ...prev]);
      return data as ResumeFile;
    },
    [user],
  );

  /** 获取临时下载链接（私有桶，签名 URL 有效期 60s） */
  const getDownloadUrl = useCallback(async (filePath: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60, {
      download: true,
    });
    if (error) throw error;
    return data.signedUrl;
  }, []);

  /** 删除文件（先删存储对象，再删元数据） */
  const remove = useCallback(async (f: ResumeFile) => {
    await supabase.storage.from(BUCKET).remove([f.file_path]);
    const { error } = await supabase.from('resume_files').delete().eq('id', f.id);
    if (error) throw error;
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
  }, []);

  return { files, loading, refresh: fetchAll, upload, getDownloadUrl, remove };
}
