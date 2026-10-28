const KEY = "gymtrack:xp-popups";

/** Whether to show XP pop-ups. On unless the user turned them off on this device. */
export function xpPopupsEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setXpPopupsEnabled(on: boolean): void {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "off");
  } catch {
    // Storage can be blocked. The preference then lasts until the page is reloaded, which is fine.
  }
}
