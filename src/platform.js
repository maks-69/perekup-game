const SAVE_KEY = 'perekup-save-v1';

export const platform = {
  kind: 'browser',

  async init() {
    // Точка подключения YaGames.init() на следующем этапе.
    return this;
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  save(state) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  },

  async showRewarded() {
    // В Yandex Games эта функция будет вызывать ysdk.adv.showRewardedVideo().
    return true;
  },
};
