import { createClient } from '@supabase/supabase-js';

// ============================================================
// Supabase 客户端
// 密钥只从环境变量读取，绝不硬编码（见 .env.example）
// ============================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** 是否已正确配置 Supabase。未配置时前端给出友好提示，而不是直接崩溃。 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // 仅在开发期提醒，方便排查“没填 .env”的情况
  // eslint-disable-next-line no-console
  console.warn(
    '[Sugar] 未检测到 Supabase 环境变量。请复制 .env.example 为 .env 并填写 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY。',
  );
}

// 即便未配置也创建一个占位 client，避免 import 处报错；真实调用时会失败并被捕获。
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
