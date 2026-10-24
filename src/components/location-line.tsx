import { MapPinIcon } from "@phosphor-icons/react/dist/ssr";

type LocationLineProps = {
  gymName: string;
  location: string | null;
};

/** Where the gym is, with a link that opens the place in a maps app. Renders nothing if unset. */
export function LocationLine({ gymName, location }: LocationLineProps) {
  if (!location) return null;

  // The link only carries the text the user typed, URL encoded.
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${gymName} ${location}`)}`;

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        <MapPinIcon className="size-4 shrink-0" aria-hidden />
        {location}
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
