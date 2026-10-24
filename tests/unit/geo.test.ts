import { describe, expect, it } from "vitest";
import {
  formatCoordinates,
  isValidCoordinates,
  mapsUrl,
  parseNominatimResults,
  parseNominatimReverse,
  roundCoordinate,
  shortenAddress,
} from "@/lib/geo";

describe("isValidCoordinates", () => {
  it("accepts real points including the limits", () => {
    expect(isValidCoordinates(0, 0)).toBe(true);
    expect(isValidCoordinates(-6.2088, 106.8456)).toBe(true);
    expect(isValidCoordinates(90, 180)).toBe(true);
    expect(isValidCoordinates(-90, -180)).toBe(true);
  });

  it("rejects out of range, non numeric and non finite values", () => {
    expect(isValidCoordinates(90.0001, 0)).toBe(false);
    expect(isValidCoordinates(0, -180.1)).toBe(false);
    expect(isValidCoordinates(NaN, 10)).toBe(false);
    expect(isValidCoordinates(Infinity, 10)).toBe(false);
    expect(isValidCoordinates("1", "2")).toBe(false);
    expect(isValidCoordinates(null, 2)).toBe(false);
    expect(isValidCoordinates(undefined, undefined)).toBe(false);
  });
});

describe("number formatting", () => {
  it("rounds to six decimals", () => {
    expect(roundCoordinate(-6.20881234567)).toBe(-6.208812);
    expect(roundCoordinate(106.8456)).toBe(106.8456);
  });

  it("formats with six decimals", () => {
    expect(formatCoordinates(-6.2088, 106.8456)).toBe("-6.208800, 106.845600");
  });
});

describe("shortenAddress", () => {
  it("keeps short addresses and tidies whitespace", () => {
    expect(shortenAddress("  Gym   X,\n Main Street ")).toBe("Gym X, Main Street");
  });

  it("cuts long addresses at a comma and stays within the limit", () => {
    const long =
      "Gold's Gym Kuningan City, Jalan Prof. DR. Satrio Kav. 18, Kuningan, Setiabudi, Daerah Khusus Ibukota Jakarta, 12940, Indonesia";
    const short = shortenAddress(long);
    expect(short.length).toBeLessThanOrEqual(120);
    expect(short.endsWith(",")).toBe(false);
    expect(long.startsWith(short)).toBe(true);
    // Cut at the last comma that fits, so the postcode stays and "Indonesia" goes.
    expect(short).toBe(
      "Gold's Gym Kuningan City, Jalan Prof. DR. Satrio Kav. 18, Kuningan, Setiabudi, Daerah Khusus Ibukota Jakarta, 12940",
    );
  });

  it("cuts at a word when there is no useful comma", () => {
    const text = "word ".repeat(40).trim();
    const short = shortenAddress(text, 50);
    expect(short.length).toBeLessThanOrEqual(50);
    expect(text.startsWith(short)).toBe(true);
    expect(short.endsWith(" ")).toBe(false);
  });

  it("respects a custom maximum", () => {
    expect(shortenAddress("a,b,c,d,e,f", 5).length).toBeLessThanOrEqual(5);
  });
});

describe("mapsUrl", () => {
  const base = { gymName: "Iron Gym", location: null, latitude: null, longitude: null };

  it("is null with neither an address nor a pin", () => {
    expect(mapsUrl(base)).toBeNull();
    expect(mapsUrl({ ...base, location: "" })).toBeNull();
  });

  it("prefers coordinates over the address", () => {
    const url = mapsUrl({ ...base, location: "Main St", latitude: -6.2088, longitude: 106.8456 });
    expect(url).toBe("https://www.google.com/maps/search/?api=1&query=-6.2088%2C106.8456");
  });

  it("uses the gym name and address when there is no pin", () => {
    expect(mapsUrl({ ...base, location: "Main St" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Iron%20Gym%20Main%20St",
    );
  });

  it("ignores a half set or impossible pin", () => {
    expect(mapsUrl({ ...base, location: "Main St", latitude: -6.2, longitude: null })).toContain("Iron%20Gym");
    expect(mapsUrl({ ...base, location: "Main St", latitude: 200, longitude: 10 })).toContain("Iron%20Gym");
    expect(mapsUrl({ ...base, latitude: 200, longitude: 10 })).toBeNull();
  });
});

describe("Nominatim parsing", () => {
  it("keeps valid results, converts strings and rounds", () => {
    const results = parseNominatimResults([
      { display_name: "Gym A, City", lat: "-6.2088123456", lon: "106.8456" },
      { display_name: "Gym B", lat: -7.25, lon: 112.75 },
    ]);
    expect(results).toEqual([
      { name: "Gym A, City", latitude: -6.208812, longitude: 106.8456 },
      { name: "Gym B", latitude: -7.25, longitude: 112.75 },
    ]);
  });

  it("drops entries with a bad name or point and survives junk input", () => {
    expect(
      parseNominatimResults([
        { display_name: "", lat: "1", lon: "2" },
        { display_name: "No point" },
        { display_name: "Far away", lat: "95", lon: "10" },
        { display_name: 12, lat: "1", lon: "2" },
        null,
        "string",
        { display_name: "Good", lat: "1", lon: "2" },
      ]),
    ).toEqual([{ name: "Good", latitude: 1, longitude: 2 }]);
    expect(parseNominatimResults(null)).toEqual([]);
    expect(parseNominatimResults({ error: "rate limited" })).toEqual([]);
    expect(parseNominatimResults("<html>")).toEqual([]);
  });

  it("reads the reverse geocode name or returns null", () => {
    expect(parseNominatimReverse({ display_name: "Main St, City" })).toBe("Main St, City");
    expect(parseNominatimReverse({ error: "Unable to geocode" })).toBeNull();
    expect(parseNominatimReverse({ display_name: "  " })).toBeNull();
    expect(parseNominatimReverse(null)).toBeNull();
    expect(parseNominatimReverse("x")).toBeNull();
  });
});
