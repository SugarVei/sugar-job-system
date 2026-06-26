import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// 个人资料（昵称 + 头像）
// 这两项属于轻量本地偏好，按用户 ID 存于 localStorage；
// 核心业务数据（投递/公司/简历/面试）才走 Supabase 云端。
// ============================================================
export function useProfile() {
  const { user } = useAuth();
  const nameKey = `sugar_name_${user?.id ?? 'guest'}`;
  const avatarKey = `sugar_avatar_${user?.id ?? 'guest'}`;

  const defaultName = user?.email ? user.email.split('@')[0] : '你';
  const [name, setName] = useState(defaultName);
  const [avatar, setAvatar] = useState('');

  useEffect(() => {
    try {
      const n = localStorage.getItem(nameKey);
      const a = localStorage.getItem(avatarKey);
      setName(n ?? defaultName);
      setAvatar(a ?? '');
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameKey, avatarKey]);

  const updateName = useCallback(
    (v: string) => {
      setName(v);
      try {
        localStorage.setItem(nameKey, v);
      } catch {
        /* ignore */
      }
    },
    [nameKey],
  );

  const updateAvatar = useCallback(
    (dataUrl: string) => {
      setAvatar(dataUrl);
      try {
        localStorage.setItem(avatarKey, dataUrl);
      } catch {
        /* ignore */
      }
    },
    [avatarKey],
  );

  return { name, avatar, updateName, updateAvatar };
}
