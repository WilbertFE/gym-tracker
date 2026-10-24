export const MAX_LOCATION_LENGTH = 120;

export type Coordinates = { latitude: number; longitude: number };

const isFiniteNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** True for a real point on Earth. */
export function isValidCoordinates(lat: unknown, lng: unknown): boolean {
  return isFiniteNumber(lat) && isFiniteNumber(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** Six decimals is about 11 cm, far more precise than a gym door needs. */
export const roundCoordinate = (n: number): number => Math.round(n * 1e6) / 1e6;

/** "-6.208800, 106.845600" for display. */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Shortens a long geocoder address to fit the location field, cutting at a
 * comma boundary when possible so it never ends mid word.
 */
export function shortenAddress(address: string, max = MAX_LOCATION_LENGTH): string {
  const clean = address.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max);
  const lastComma = cut.lastIndexOf(",");
  // Only back up to a comma if it keeps most of the text.
  const trimmed = lastComma > max * 0.5 ? cut.slice(0, lastComma) : cut.replace(/\s+\S*$/, "");
  return trimmed.trim();
}

/**
 * Link that opens the place in a maps app. Exact coordinates win over text,
 * because a typed address can match the wrong place. Returns null with neither.
 */
export function mapsUrl(input: {
  gymName: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
}): string | null {
  const { gymName, location, latitude, longitude } = input;
  const base = "https://www.google.com/maps/search/?api=1&query=";

  if (latitude !== null && longitude !== null && isValidCoordinates(latitude, longitude)) {
    return `${base}${encodeURIComponent(`${latitude},${longitude}`)}`;
  }
  if (location) return `${base}${encodeURIComponent(`${gymName} ${location}`)}`;
  return null;
}

export type PlaceResult = { name: string; latitude: number; longitude: number };

/**
 * Reads results from the OpenStreetMap Nominatim search API, keeping only
 * entries with a name and a valid point. The response is untrusted input.
 */
export function parseNominatimResults(data: unknown): PlaceResult[] {
  if (!Array.isArray(data)) return [];
  const results: PlaceResult[] = [];
  for (const item of data) {
    if (typeof item !== "object" || item === null) continue;
    const { display_name, lat, lon } = item as Record<string, unknown>;
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (typeof display_name !== "string" || !display_name.trim()) continue;
    if (!isValidCoordinates(latitude, longitude)) continue;
    results.push({
      name: display_name,
      latitude: roundCoordinate(latitude),
      longitude: roundCoordinate(longitude),
    });
  }
  return results;
}

/** Name from a Nominatim reverse geocode response, or null if there is none. */
export function parseNominatimReverse(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const name = (data as Record<string, unknown>).display_name;
  return typeof name === "string" && name.trim() ? name : null;
}
