import type { Coordinates } from "@/lib/geo";
import { isValidCoordinates } from "@/lib/geo";

/** How close to the gym a check-in has to be, in meters. */
export const GYM_RADIUS_METERS = 200;

/**
 * A phone usually reports 5 to 50 m, a laptop on Wi-Fi often hundreds. Beyond this the position says
 * too little to prove anything, so the check-in asks for a better one instead of guessing.
 */
export const MAX_ACCURACY_METERS = 500;

/** The error margin the device reports is forgiven up to this much, so a poor fix at the door still counts. */
const ACCURACY_ALLOWANCE_METERS = 100;

export type Position = Coordinates & { accuracy?: number | null };

export type LocationReason = "no_gym_location" | "no_position" | "inaccurate" | "too_far";

export type LocationVerdict =
  | { ok: true; distance: number }
  | { ok: false; reason: LocationReason; distance?: number };

export const LOCATION_MESSAGES: Record<Exclude<LocationReason, "too_far">, string> = {
  no_gym_location: "Pin your gym on the map in Membership first, so the check-in knows where the gym is.",
  no_position: "Your location is needed to check in at the gym. Allow location access and try again.",
  inaccurate: "Your location is not accurate enough. Turn on GPS or move near a window or outside, then try again.",
};

const EARTH_RADIUS_METERS = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great circle distance between two points, in meters (haversine). */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "850 m" or "1.4 km". */
export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

/** Whether a reported position is at the gym. The gym is null when the user never pinned one. */
export function verifyAtGym(gym: Coordinates | null, position: Position | null | undefined): LocationVerdict {
  if (!gym || !isValidCoordinates(gym.latitude, gym.longitude)) return { ok: false, reason: "no_gym_location" };
  if (!position || !isValidCoordinates(position.latitude, position.longitude)) {
    return { ok: false, reason: "no_position" };
  }
  const accuracy = position.accuracy ?? 0;
  if (accuracy > MAX_ACCURACY_METERS) return { ok: false, reason: "inaccurate" };

  const distance = distanceMeters(gym, position);
  const effective = distance - Math.min(accuracy, ACCURACY_ALLOWANCE_METERS);
  if (effective > GYM_RADIUS_METERS) return { ok: false, reason: "too_far", distance };
  return { ok: true, distance };
}

/** The sentence shown to the user for a failed verdict. */
export function verdictMessage(verdict: Extract<LocationVerdict, { ok: false }>, gymName?: string): string {
  if (verdict.reason === "too_far") {
    const where = gymName ? gymName : "your gym";
    return `You are ${formatDistance(verdict.distance ?? 0)} from ${where}. Check in once you are within ${GYM_RADIUS_METERS} m of it.`;
  }
  return LOCATION_MESSAGES[verdict.reason];
}
