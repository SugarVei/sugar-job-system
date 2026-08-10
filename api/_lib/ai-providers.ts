export const AI_PROVIDERS: Record<string, { baseUrl: string; model: string }> = {
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' }, openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }, kimi: { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' }, qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' }, minimax: { baseUrl: 'https://api.minimaxi.com/v1', model: 'MiniMax-M2.5' }, gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash' },
};
export function isAiProvider(value: string) { return value in AI_PROVIDERS; }
