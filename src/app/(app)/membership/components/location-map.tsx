"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type MapPoint = { latitude: number; longitude: number };

type LocationMapProps = {
  /** The pinned position, if any. */
  value: MapPoint | null;
  /** Where to move the view, for example after a search. Clicking the map never moves it. */
  focus: MapPoint | null;
  onPick: (point: MapPoint) => void;
};

// A plain CSS pin: Leaflet's default marker images do not survive bundling.
const pinIcon = L.divIcon({
  className: "",
  html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#22d3ee;border:3px solid #0a0b0d;box-shadow:0 0 0 1px #22d3ee"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const round = (n: number) => Math.round(n * 1e6) / 1e6;

function ClickToPin({ onPick }: { onPick: LocationMapProps["onPick"] }) {
  useMapEvents({
    click(e) {
      onPick({ latitude: round(e.latlng.lat), longitude: round(e.latlng.lng) });
    },
  });
  return null;
}

function FlyTo({ focus }: { focus: MapPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.latitude, focus.longitude], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [focus, map]);
  return null;
}

/**
 * OpenStreetMap view with one draggable pin. Tiles come from
 * tile.openstreetmap.org, and the required attribution stays visible.
 * The tile layer is inverted so the map matches the dark interface.
 */
export default function LocationMap({ value, focus, onPick }: LocationMapProps) {
  return (
    <MapContainer
      center={value ? [value.latitude, value.longitude] : [20, 0]}
      zoom={value ? 16 : 2}
      minZoom={2}
      scrollWheelZoom
      className="h-72 w-full border bg-background [&_.leaflet-tile-pane]:[filter:invert(1)_hue-rotate(180deg)_brightness(0.95)_contrast(0.9)] [&_.leaflet-control-attribution]:!bg-card/80 [&_.leaflet-control-attribution]:!text-muted-foreground [&_.leaflet-control-attribution_a]:!text-muted-foreground"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <ClickToPin onPick={onPick} />
      <FlyTo focus={focus} />
      {value && (
        <Marker
          position={[value.latitude, value.longitude]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend(e) {
              const { lat, lng } = (e.target as L.Marker).getLatLng();
              onPick({ latitude: round(lat), longitude: round(lng) });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
