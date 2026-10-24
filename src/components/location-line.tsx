import { MapPinIcon } from "@phosphor-icons/react/dist/ssr";
import { formatCoordinates, mapsUrl } from "@/lib/geo";

type LocationLineProps = {
  gymName: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
};

/**
 * Where the gym is, with a link that opens the place in a maps app. A pinned
 * position is used for the link when there is one. Renders nothing if the
 * gym has neither an address nor a pin.
 */
export function LocationLine({ gymName, location, latitude, longitude }: LocationLineProps) {
  const href = mapsUrl({ gymName, location, latitude, longitude });
  if (!href) return null;

  const hasPin = latitude !== null && longitude !== null;

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        <MapPinIcon className="size-4 shrink-0" aria-hidden />
        {location ?? (hasPin ? <span className="tabular">{formatCoordinates(latitude, longitude)}</span> : null)}
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs underline underline-offset-4 hover:text-foreground"
      >
        Open in maps
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );
}
