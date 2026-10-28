const POPUPS_KEY = "gymtrack:xp-popups";
const SCREEN_KEY = "ml:levelup-screen";

const readOff = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === "off";
  } catch {
    return false;
  }
};

const write = (key: string, on: boolean): void => {
  try {
    if (on) localStorage.removeItem(key);
    else localStorage.setItem(key, "off");
  } catch {
    // Storage can be blocked. The preference then lasts until the page is reloaded, which is fine.
  }
};

/** Whether to show XP pop-ups. On unless the user turned them off on this device. */
export const xpPopupsEnabled = (): boolean => !readOff(POPUPS_KEY);
export const setXpPopupsEnabled = (on: boolean): void => write(POPUPS_KEY, on);

/** Whether a big level up, new rank or unlock takes over the screen. On unless turned off on this device. */
export const levelUpScreenEnabled = (): boolean => !readOff(SCREEN_KEY);
export const setLevelUpScreenEnabled = (on: boolean): void => write(SCREEN_KEY, on);
