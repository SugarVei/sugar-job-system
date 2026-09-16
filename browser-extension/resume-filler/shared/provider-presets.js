(function (root) {
  "use strict";
  // Official provider endpoints, reviewed 2026-09-16. No credentials are shipped.
  const presets = [
    { id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-v4-flash", thinking: { type: "disabled" }, docs: "https://api-docs.deepseek.com/updates/" },
    { id: "qwen", name: "通义千问 · 北京", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus", enable_thinking: false, docs: "https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope" },
    { id: "kimi", name: "Kimi · 中国站", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-128k", docs: "https://platform.kimi.com/docs/models" },
    { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", docs: "https://developers.openai.com/api/docs/models/gpt-4.1-mini" },
    { id: "zhipu", name: "智谱 GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4.7-flash", thinking: { type: "disabled" }, docs: "https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash" },
  ].map(Object.freeze);
  function match(config) {
    return presets.find(p => p.baseUrl.replace(/\/$/, "") === String(config?.baseUrl || "").replace(/\/$/, ""));
  }
  function requestOptions(config) {
    const preset = match(config);
    if (!preset || config.model !== preset.model) return {};
    if (preset.thinking) return { thinking: preset.thinking };
    if (preset.enable_thinking === false) return { enable_thinking: false };
    return {};
  }
  root.ResumeProviderPresets = Object.freeze({ presets: Object.freeze(presets), match, requestOptions });
})(globalThis);
