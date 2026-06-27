// AI 服务商配置表
export const PROVIDERS = {
  deepseek: {
    label: 'DeepSeek',
    emoji: '🔵',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    keyHint: 'sk-xxxxxxxxxxxxxxxx',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    topUpUrl: 'https://platform.deepseek.com/top_up',
    supportsBalance: true,
  },
  openai: {
    label: 'OpenAI',
    emoji: '🟢',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyHint: 'sk-xxxxxxxxxxxxxxxx',
    keyUrl: 'https://platform.openai.com/api-keys',
    topUpUrl: 'https://platform.openai.com/settings/organization/billing',
    supportsBalance: false,
  },
  claude: {
    label: 'Claude（Anthropic）',
    emoji: '🟠',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-haiku-4-5-20251001',
    keyHint: 'sk-ant-xxxxxxxxxxxxxxxx',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    topUpUrl: 'https://console.anthropic.com/settings/billing',
    supportsBalance: false,
  },
  kimi: {
    label: 'Kimi（月之暗面）',
    emoji: '🌙',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    keyHint: 'sk-xxxxxxxxxxxxxxxx',
    keyUrl: 'https://platform.moonshot.cn/console/api-keys',
    topUpUrl: 'https://platform.moonshot.cn/console/billing',
    supportsBalance: false,
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;
