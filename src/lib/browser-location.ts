/** The device is precise enough to stop waiting for a better reading, in meters. */
export const GOOD_ENOUGH_METERS = 50;
/** The longest we wait for a better reading once the first one is in, in milliseconds. */
export const BEST_FIX_WINDOW_MS = 10_000;

export type PositionResult =
  | { ok: true; latitude: number; longitude: number; accuracy: number }
  | { ok: false; message: string };

/** The device's current position, fresh and as precise as it can be. Never throws. */
export function getCurrentPosition(): Promise<PositionResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve({ ok: false, message: "This browser cannot share its location, so it cannot check you in at the gym." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          ok: true,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (error) =>
        resolve({
          ok: false,
          message:
            error.code === error.PERMISSION_DENIED
              ? "Location access is blocked. Allow it for this site in your browser settings, then try again."
              : "Could not get your location. Move to a spot with a better signal and try again.",
        }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}

const geoFailure = (error: GeolocationPositionError): PositionResult => ({
  ok: false,
  message:
    error.code === error.PERMISSION_DENIED
      ? "Location access is blocked. Allow it for this site in your browser settings, then try again."
      : "Could not get your location. Move to a spot with a better signal and try again.",
});

/**
 * The most precise position the device gives within a few seconds. Indoors a phone first returns a coarse cell or Wi-Fi
 * fix and only later the GPS one, so this watches the position, keeps the reading with the smallest error and stops as
 * soon as one is good enough, or after {@link BEST_FIX_WINDOW_MS}. `onProgress` gets the best accuracy so far. Never throws.
 */
export function getBestPosition(onProgress?: (accuracy: number) => void): Promise<PositionResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve({ ok: false, message: "This browser cannot share its location, so it cannot check you in at the gym." });
      return;
    }
    let best: { latitude: number; longitude: number; accuracy: number } | null = null;
    let finished = false;
    let watchId = 0;
    const timer: { id?: ReturnType<typeof setTimeout> } = {};

    const finish = (result: PositionResult) => {
      if (finished) return;
      finished = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer.id);
      resolve(result);
    };
    const finishWithBest = (fallback: PositionResult) => finish(best ? { ok: true, ...best } : fallback);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.accuracy) {
          best = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
          onProgress?.(best.accuracy);
        }
        if (best.accuracy <= GOOD_ENOUGH_METERS) finishWithBest({ ok: false, message: "" });
      },
      (error) => {
        // A blocked permission ends it at once. Any other hiccup keeps what we already have.
        if (error.code === error.PERMISSION_DENIED || !best) finish(geoFailure(error));
        else finishWithBest(geoFailure(error));
      },
      { enableHighAccuracy: true, timeout: BEST_FIX_WINDOW_MS + 5_000, maximumAge: 0 },
    );
    timer.id = setTimeout(
      () => finishWithBest({ ok: false, message: "Could not get your location. Move to a spot with a better signal and try again." }),
      BEST_FIX_WINDOW_MS,
    );
  });
}
