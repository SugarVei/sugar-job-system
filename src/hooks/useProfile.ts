import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// ============================================================
// 个人资料（昵称 + 头像）
// 昵称和头像保存到独立资料表，避免大型头像 Data URL 进入登录 JWT。
// localStorage 继续作为离线兜底。
// ============================================================
export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  const nameKey = `sugar_name_${userId ?? 'guest'}`;
  const avatarKey = `sugar_avatar_${userId ?? 'guest'}`;

  const defaultName = user?.email ? user.email.split('@')[0] : '你';
  const [name, setName] = useState(defaultName);
  const [avatar, setAvatar] = useState('');

  useEffect(() => {
    let cancelled = false;
    try {
      const n = localStorage.getItem(nameKey);
      const localAvatar = localStorage.getItem(avatarKey);
      setName(n ?? defaultName);
      setAvatar(localAvatar ?? '');
    } catch {
      /* ignore */
    }

    if (userId) {
      void supabase
        .from('user_profiles')
        .select('display_name,avatar_url')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (cancelled || error || !data) return;
          if (data.display_name) {
            setName(data.display_name);
            try { localStorage.setItem(nameKey, data.display_name); } catch { /* ignore */ }
          }
          if (data.avatar_url) {
            setAvatar(data.avatar_url);
            try { localStorage.setItem(avatarKey, data.avatar_url); } catch { /* ignore */ }
          }
        });
    }

    return () => { cancelled = true; };
  }, [nameKey, avatarKey, userId, defaultName]);

  const updateName = useCallback(
    (v: string) => {
      setName(v);
      try {
        localStorage.setItem(nameKey, v);
      } catch {
        /* ignore */
      }
      if (userId) {
        void supabase.from('user_profiles').upsert({
          user_id: userId,
          display_name: v.slice(0, 100),
          updated_at: new Date().toISOString(),
        });
      }
    },
    [nameKey, userId],
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
      if (userId) {
        const { error } = await supabase.from('user_profiles').upsert({
          user_id: userId,
          avatar_url: optimized,
          updated_at: new Date().toISOString(),
        });
        if (error) console.warn('头像云端保存失败，已保留本地头像。', error.message);
      }
    },
    [avatarKey, userId],
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
