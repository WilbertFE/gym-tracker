import type { ShareFonts } from "@/lib/share-render";

/** The fonts the page already loaded, so a share image matches the app. Falls back to system fonts. Browser only. */
export function pageFonts(): ShareFonts {
  const css = getComputedStyle(document.documentElement);
  const sans = css.getPropertyValue("--font-plex-sans").trim();
  const mono = css.getPropertyValue("--font-jetbrains-mono").trim();
  const display = css.getPropertyValue("--font-chakra").trim();
  return {
    display: `${display ? `${display}, ` : ""}system-ui, sans-serif`,
    sans: `${sans ? `${sans}, ` : ""}system-ui, sans-serif`,
    mono: `${mono ? `${mono}, ` : ""}ui-monospace, monospace`,
  };
}
