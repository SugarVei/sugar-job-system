export const elephantClips = [
  { id: 'walk', name: '慢慢走', icon: '↗', start: 0.15, end: 3.8, description: '小小的步子，也在认真向前。' },
  { id: 'hello', name: '打招呼', icon: '♡', start: 4.1, end: 7.8, description: '抬起小鼻子，和你说声你好。' },
  { id: 'curious', name: '甩甩鼻子', icon: '⌁', start: 10.1, end: 15.8, description: '对这个世界，保持一点点好奇。' },
  { id: 'sit', name: '坐一会儿', icon: '◡', start: 20.1, end: 24.8, description: '忙碌的间隙，陪你休息一下。' },
  { id: 'sleep', name: '睡个好觉', icon: '☾', start: 26.2, end: 29.8, description: '今天也辛苦啦，做一个柔软的梦。' },
  { id: 'play', name: '一起玩球', icon: '⚽', start: 32.2, end: 39.8, description: '快乐很简单，一个小球就够了。' },
] as const;
export type ElephantClip = typeof elephantClips[number];
