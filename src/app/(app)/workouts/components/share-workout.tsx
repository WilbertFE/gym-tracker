"use client";

import { ShareNetworkIcon } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { RankBadge } from "@/components/rank-badge";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ShareCard } from "@/lib/share";
import {
  drawShareCard,
  SHARE_FORMATS,
  SHARE_SIZES,
  SHARE_TEMPLATES,
  shareFileName,
  type ShareBadge,
  type ShareFonts,
  type ShareFormat,
  type ShareTemplate,
} from "@/lib/share-render";

/** The fonts the page already loaded, so the image matches the app. Falls back to system fonts. */
function pageFonts(): ShareFonts {
  const css = getComputedStyle(document.documentElement);
  const sans = css.getPropertyValue("--font-plex-sans").trim();
  const mono = css.getPropertyValue("--font-jetbrains-mono").trim();
  return {
    sans: `${sans ? `${sans}, ` : ""}system-ui, sans-serif`,
    mono: `${mono ? `${mono}, ` : ""}ui-monospace, monospace`,
  };
}

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));

/** Turns the rank badge on the page into an image the canvas can draw. Null if the browser refuses. */
async function badgeImage(host: HTMLElement | null): Promise<ShareBadge | null> {
  const svg = host?.querySelector("svg");
  if (!svg) return null;
  const markup = new XMLSerializer().serializeToString(svg);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  try {
    await image.decode();
    return { image, width: image.naturalWidth, height: image.naturalHeight };
  } catch {
    return null;
  }
}

/**
 * A dialog with the workout as an image, in a few looks and two sizes, to share or save. The image is
 * drawn here in the browser when the dialog is open and is never stored. `defaultOpen` is for the
 * moment right after finishing a workout.
 */
export function ShareWorkout({ card, date, defaultOpen = false }: { card: ShareCard; date: string; defaultOpen?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const badgeHost = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [template, setTemplate] = useState<ShareTemplate>("classic");
  const [format, setFormat] = useState<ShareFormat>("story");
  const [busy, setBusy] = useState(false);
  const [showLocation, setShowLocation] = useState(true);
  // The card actually drawn: with the location left out when the switch is off.
  const shown = useMemo(() => (showLocation ? card : { ...card, location: null }), [card, showLocation]);

  // Redraw whenever the dialog opens or a choice changes. The canvas mounts a moment after `open`.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      await document.fonts?.ready;
      const badge = await badgeImage(badgeHost.current);
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const { width, height } = SHARE_SIZES[format];
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) drawShareCard(ctx, shown, template, format, pageFonts(), badge);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, shown, template, format]);

  async function makeFile(): Promise<File | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const blob = await toBlob(canvas);
    return blob ? new File([blob], shareFileName(card, date, format), { type: "image/png" }) : null;
  }

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      const file = await makeFile();
      if (!file) throw new Error("no image");
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${card.title} on GymTrack` });
      } else {
        download(file);
      }
    } catch (error) {
      // Closing the share sheet is not a failure.
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Could not share the image");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    const file = await makeFile();
    setBusy(false);
    if (!file) {
      toast.error("Could not create the image");
      return;
    }
    download(file);
  }

  function download(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Image saved");
  }

  const { width, height } = SHARE_SIZES[format];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Opened by the finish redirect: drop ?share=1 so a refresh does not open it again.
        if (!next && defaultOpen) router.replace(pathname, { scroll: false });
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12">
          <ShareNetworkIcon className="size-4" aria-hidden />
          Share workout
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share your workout</DialogTitle>
          <DialogDescription>
            Pick a look and a size. The image shows only what you see here. It never has your name or exact position.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <SegmentedControl
            label="Look"
            className="w-full"
            value={template}
            onChange={setTemplate}
            options={SHARE_TEMPLATES}
          />
          <SegmentedControl
            label="Size"
            className="w-full"
            value={format}
            onChange={setFormat}
            options={SHARE_FORMATS.map((f) => ({ value: f.value, label: `${f.label} ${f.hint}` }))}
          />
        </div>

        {card.location && (
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={showLocation}
              onChange={(e) => setShowLocation(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            Show where I trained ({card.location})
          </label>
        )}

        {card.progress && (
          // The badge is drawn into the image from this hidden copy, so it is the very same artwork.
          <div ref={badgeHost} hidden aria-hidden>
            <RankBadge rank={card.progress.rank} size={360} />
          </div>
        )}

        <div className="flex justify-center bg-surface p-2">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            role="img"
            aria-label={`${card.title} on ${card.dateLabel}: ${card.sets} sets, ${card.volume} ${card.unit} volume`}
            className="h-auto max-h-[50vh] w-auto max-w-full border"
          />
        </div>

        <DialogFooter className="gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="h-11" onClick={save} disabled={busy}>
            Save image
          </Button>
          <Button type="button" className="h-11" onClick={share} disabled={busy}>
            {busy ? "Preparing" : "Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
