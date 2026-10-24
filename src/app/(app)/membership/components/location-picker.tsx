"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCoordinates,
  isValidCoordinates,
  parseNominatimResults,
  parseNominatimReverse,
  roundCoordinate,
  shortenAddress,
  type PlaceResult,
} from "@/lib/geo";
import type { MapPoint } from "./location-map";

// Leaflet touches `window`, so the map is loaded in the browser only.
const LocationMap = dynamic(() => import("./location-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full" />,
});

const NOMINATIM = "https://nominatim.openstreetmap.org";
/** OpenStreetMap asks for at most one request per second. */
const MIN_GAP_MS = 1100;

type LocationPickerProps = {
  value: MapPoint | null;
  /** Called when the pin moves. `address` is a suggested address text, when one is known. */
  onChange: (point: MapPoint | null, address?: string) => void;
};

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [busy, setBusy] = useState<"search" | "locate" | null>(null);
  const [focus, setFocus] = useState<MapPoint | null>(null);
  const lastRequest = useRef(0);

  /** Waits so requests to OpenStreetMap stay under its fair use limit. */
  async function politeFetch(url: string): Promise<unknown> {
    const wait = lastRequest.current + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequest.current = Date.now();
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function reverseLookup(point: MapPoint): Promise<string | undefined> {
    try {
      const data = await politeFetch(
        `${NOMINATIM}/reverse?format=jsonv2&zoom=18&lat=${point.latitude}&lon=${point.longitude}`,
      );
      const name = parseNominatimReverse(data);
      return name ? shortenAddress(name) : undefined;
    } catch {
      return undefined; // The pin still works without an address.
    }
  }

  /** Pin placed by clicking, dragging or "use my location": fill the address afterwards. */
  async function placePin(point: MapPoint) {
    onChange(point);
    const address = await reverseLookup(point);
    if (address) onChange(point, address);
  }

  async function search() {
    const q = query.trim();
    if (q.length < 3 || busy) return;

    setBusy("search");
    try {
      const data = await politeFetch(`${NOMINATIM}/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`);
      const found = parseNominatimResults(data);
      setResults(found);
      if (found.length === 0) toast.message("No places found. Try another name, or tap the map.");
    } catch {
      toast.error("Search is unavailable right now. You can still tap the map.");
    } finally {
      setBusy(null);
    }
  }

  function choose(place: PlaceResult) {
    const point = { latitude: place.latitude, longitude: place.longitude };
    onChange(point, shortenAddress(place.name));
    setFocus(point);
    setResults([]);
  }

  function useMyLocation() {
    if (busy) return;
    if (!("geolocation" in navigator)) {
      toast.error("Your browser cannot share its location.");
      return;
    }
    setBusy("locate");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(null);
        const { latitude, longitude } = pos.coords;
        if (!isValidCoordinates(latitude, longitude)) return;
        const point = { latitude: roundCoordinate(latitude), longitude: roundCoordinate(longitude) };
        setFocus(point);
        void placePin(point);
      },
      () => {
        setBusy(null);
        toast.error("Could not get your location. Allow location access, or search instead.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Not a <form>: this sits inside the membership form, and forms cannot nest. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end" role="search">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="place-search" className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Find on map
          </Label>
          <Input
            id="place-search"
            className="h-11"
            placeholder="Gym name or address"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
            maxLength={120}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => void search()}
          disabled={busy !== null || query.trim().length < 3}
        >
          {busy === "search" ? "Searching" : "Search"}
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={useMyLocation} disabled={busy !== null}>
          {busy === "locate" ? "Locating" : "Use my location"}
        </Button>
      </div>

      {results.length > 0 && (
        <ul className="flex flex-col divide-y border" aria-label="Search results">
          {results.map((place) => (
            <li key={`${place.latitude},${place.longitude}`}>
              <button
                type="button"
                onClick={() => choose(place)}
                className="min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-surface-raised"
              >
                {place.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div role="group" aria-label="Map. Tap to place the pin, drag the pin to adjust.">
        <LocationMap value={value} focus={focus} onPick={(p) => void placePin(p)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        {value ? (
          <>
            <span className="tabular">Pinned: {formatCoordinates(value.latitude, value.longitude)}</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="min-h-11 px-2 underline underline-offset-4 hover:text-foreground"
            >
              Clear pin
            </button>
          </>
        ) : (
          <span>Search, use your location, or tap the map to drop a pin. You can drag it to adjust.</span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Map data from OpenStreetMap. Searching and the map send what you look at to OpenStreetMap servers.
      </p>
    </div>
  );
}
