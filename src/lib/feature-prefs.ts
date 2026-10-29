/**
 * Two small cookies that let the server decide what to show. Neither is a secret or a permission:
 * they only control what the interface hides, and the pages that matter check the real level.
 */
export const SHOW_ALL_COOKIE = "ml_show_all";
export const LEVEL_COOKIE = "ml_level";
/** "1" turns the comeback quest off. */
export const NO_RECOVERY_COOKIE = "ml_no_recovery";

const YEAR = 60 * 60 * 24 * 365;

/** Writes a cookie from the browser. */
export function writeCookie(name: string, value: string | null): void {
  document.cookie =
    value === null ? `${name}=; path=/; max-age=0; samesite=lax` : `${name}=${value}; path=/; max-age=${YEAR}; samesite=lax`;
}

/** A level read from a cookie value, 1 when it is missing or not a sensible number. */
export function parseLevelCookie(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 100_000 ? n : 1;
}
