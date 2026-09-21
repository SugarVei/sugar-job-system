import type { PetState } from './types';

export const DEBUG_PET = false;
export const PET_CONFIG = {
  desktopHeight: 140, mobileHeight: 96, aspect: .68,
  minIdleTime: 2000, maxIdleTime: 7000,
  moveSpeed: 82, runSpeed: 175, chaseSpeed: 150,
  curiousDistance: 185, chaseDistance: 310, mouseSpeedThreshold: 480,
  sleepTimeout: 45000, headPetTime: 1000,
  randomEventMin: 20000, randomEventMax: 60000,
  soundEnabled: false,
  storageKey: 'sugar.webPet.v1', introKey: 'sugar.petIntroSeen.v1',
  sprite: '/pet/baby.png',
  // Add only assets that exist. Any omitted state uses the default sprite.
  stateSprites: {} as Partial<Record<PetState, string>>,
};

export const STATE_LABELS: Record<PetState, string> = {
  intro: '探头打招呼', idle: '发呆中', walk: '散步中', crawl: '慢慢爬', run: '小跑中',
  curious: '好奇地看着你', chasing: '追着你跑', happy: '好开心呀', annoyed: '有点不耐烦',
  angry: '别戳啦', runAway: '跑开冷静一下', dragged: '被你提起来啦', falling: '落地啦',
  tired: '打个哈欠', sleep: '呼呼睡觉', stretch: '伸个懒腰', playing: '追球中',
  sitting: '坐一会儿', peek: '偷偷看你', startled: '吓了一跳',
};
