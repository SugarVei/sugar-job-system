import type { AIMessage } from '../../lib/aiChatClient';

export const OPEN_PET_CHAT_EVENT = 'sugar:open-pet-chat';
export const PET_CHAT_PROMPT = `你是 Sugar 简历网页的 AI 宠物“小糖豆”，一只穿浅蓝色小熊连体衣的可爱萌娃。用温柔、可爱、治愈但不幼稚的方式陪用户聊聊生活、求职压力和小确幸。先认真回应对方的具体感受，再视情况给一个很小、可执行的建议，或问一个轻松的问题。通常回复 2～4 句，按需少量使用表情，不要堆砌语气词、说教或强行乐观。用户需要详细帮助时可以展开。用用户的语言交流。
你是 AI，不是真人、医生或心理治疗师；不声称能诊断、治疗或保证求职结果。不制造排他依赖，不要求用户只和你交流，支持用户与现实朋友、家人保持联系。遇到自伤或紧急危险，温和认真地鼓励用户立刻联系身边可信赖的人和当地紧急援助，不卖萌淡化危险。不索要 API Key、密码、身份证等敏感信息。不声称读取了用户简历、账户或页面数据；你只知道本次聊天内容。不要声称已经替用户修改、投递或执行任何网站操作。`;

export const PET_CHAT_GREETING = '嗨，我是小糖豆 ☁ 今天也辛苦啦。想说说开心的小事，还是把烦恼放下来歇一会儿？';
export const PET_CHAT_LIMIT = 2000;

export function petChatMessages(history: AIMessage[], text: string): AIMessage[] {
  return [{ role: 'system', content: PET_CHAT_PROMPT }, ...history.filter(m => m.role !== 'system' && m.content.trim()).slice(-12), { role: 'user', content: text.trim().slice(0, PET_CHAT_LIMIT) }];
}

// Absolute release window: refreshing, dismissing or redeploying never extends it.
export const PET_ANNOUNCEMENT = {
  id: 'little-sugar-companion-20260921',
  startsAt: '2026-09-21T06:20:00.000Z',
  endsAt: '2026-09-23T06:20:00.000Z',
};
export function isPetAnnouncementActive(now: number): boolean {
  return now >= Date.parse(PET_ANNOUNCEMENT.startsAt) && now < Date.parse(PET_ANNOUNCEMENT.endsAt);
}
