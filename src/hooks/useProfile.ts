import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// ============================================================
// 个人资料（昵称 + 头像）
// 昵称和头像同时保存到 Supabase 用户资料，并保留 localStorage 作为离线兜底。
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
      const localAvatar = localStorage.getItem(avatarKey);
      const cloudAvatar = user?.user_metadata?.avatar_url;
      const a = cloudAvatar ?? localAvatar;
      setName(n ?? defaultName);
      setAvatar(a ?? '');
      // 将旧版本只保存在本机的头像迁移到云端，用户无需重新选择图片。
      if (user && !cloudAvatar && localAvatar) {
        void supabase.auth.updateUser({ data: { avatar_url: localAvatar } });
      }
    } catch {
      /* ignore */
    }
  }, [nameKey, avatarKey, user, user?.user_metadata?.avatar_url, defaultName]);

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
    async (dataUrl: string) => {
      const optimized = await optimizeAvatar(dataUrl);
      setAvatar(optimized);
      try {
        localStorage.setItem(avatarKey, optimized);
      } catch {
        /* ignore */
      }
      if (user && supabase) {
        const { error } = await supabase.auth.updateUser({ data: { avatar_url: optimized } });
        if (error) console.warn('头像云端保存失败，已保留本地头像。', error.message);
      }
    },
    [avatarKey, user],
  );

  return { name, avatar, updateName, updateAvatar };
}

function optimizeAvatar(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const maxSize = 256;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) return resolve(dataUrl);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}
