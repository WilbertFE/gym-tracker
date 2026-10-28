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
