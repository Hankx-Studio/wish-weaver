// ALL numeric rules from GAME_SPEC §4. No numbers hard-coded in logic.
export const STORAGE_KEY = 'wishweaver.v1';
export const STORAGE_VERSION = 1;
export const XP_PER_WISH = 10;
export const XP_PER_QUEST = 20;
export const DAILY_WISH_CAP = 10;
export const MAX_WISH_LEN = 120;
export const DEMO_MULTIPLIER = 3;
export const SPIRIT_LINE_MAX = 40;
export const HISTORY_LIMIT = 20;
export const WISH_TIMEOUT_MS = 25000;
export const THRESHOLDS = { stage1: 30, stage2: 90, stage3: 180 };
export const ELEMENTS = ['light', 'bloom', 'water', 'wind', 'ember', 'star'];
export const EFFECT_BY_ELEMENT = {
  light: 'sparkle', bloom: 'petals', water: 'ripple',
  wind: 'breeze', ember: 'glow', star: 'constellation',
};
export const RITUALS = [
  { id: 'meal', title: '飯前祝福', sub: '為眼前的一餐，留一句謝謝', icon: 'basket', phrase: '願我珍惜這份食物，也記得付出的人。' },
  { id: 'gratitude', title: '一日感恩', sub: '把今天的小小溫柔，收進心裡', icon: 'leaf', phrase: '今天有一件小事，我想好好謝謝。' },
  { id: 'bedtime', title: '晚安儀式', sub: '讓今天，在溫柔的地方停下', icon: 'moon', phrase: '今天先到這裡，願我好好休息。' },
];
export const SUPPORT_LINES = ['需要有人陪你時，可以撥打 1925 安心專線（24 小時），緊急時請撥 110 或 119。'];
