"use client";

import { useEffect, useState } from "react";
import { pageFonts } from "@/lib/share-fonts";
import { drawShareCard, SHARE_SIZES, type ShareTemplate } from "@/lib/share-render";
import { sampleShareCard } from "@/lib/share-sample";

/** Looks already drawn, by look and width, so a look shown twice is drawn once. */
const drawn = new Map<string, string>();

/**
 * What a share look really looks like: the share image renderer draws a made up workout in that look, scaled down.
 * It is drawn once in the browser and kept. Until then (and on the server) an empty frame of the same shape holds the place.
 */
export function LookThumb({ template, width = 72, label }: { template: ShareTemplate; width?: number; label?: string }) {
  const key = `${template}:${width}`;
  const [src, setSrc] = useState<string | null>(drawn.get(key) ?? null);
  const height = Math.round((width * SHARE_SIZES.story.height) / SHARE_SIZES.story.width);

  useEffect(() => {
    if (drawn.has(key)) return;
    let cancelled = false;
    (async () => {
      await document.fonts?.ready;
      // The display face loads only for the weights the page uses, so ask for the one the title needs.
      const display = getComputedStyle(document.documentElement).getPropertyValue("--font-chakra").trim();
      if (display) await document.fonts?.load(`700 100px ${display}`).catch(() => []);
      if (cancelled) return;

      const { width: w, height: h } = SHARE_SIZES.story;
      const full = document.createElement("canvas");
      full.width = w;
      full.height = h;
      const ctx = full.getContext("2d");
      if (!ctx) return;
      drawShareCard(ctx, sampleShareCard(), template, "story", pageFonts(), null);

      // Scaled down at twice the size shown, so it stays sharp on a dense screen.
      const small = document.createElement("canvas");
      small.width = width * 2;
      small.height = height * 2;
      const small2d = small.getContext("2d");
      if (!small2d) return;
      small2d.imageSmoothingQuality = "high";
      small2d.drawImage(full, 0, 0, small.width, small.height);
      const url = small.toDataURL("image/png");
      drawn.set(key, url);
      if (!cancelled) setSrc(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [key, template, width, height]);

  return (
    <span className="block border border-primary/30 bg-background" style={{ width, height }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label ?? `Share look ${template}`} width={width} height={height} className="block size-full" />
      )}
    </span>
  );
}
