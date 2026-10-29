import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeraArt } from "@/components/mascot/sera-art";
import { isDemoMode } from "@/lib/demo";
import { AVAILABLE, SPRITE_IDS, spriteFor, spriteSrc } from "@/lib/mascot/sprites";
import { MOODS, POSES, QUIRKS } from "@/lib/mascot/types";
import { PlayButtons } from "./play-buttons";

export const metadata: Metadata = {
  title: "Sera sheet",
  description: "Every sprite, mood, pose and quirk of Sera, for reviewing her art. Demo mode only.",
  robots: { index: false, follow: false },
};

/** A dev only sheet: every sprite she has, what each mood, pose and quirk shows, and the big appearances and tours to play. It does not exist outside demo mode. */
export default function SeraSheetPage() {
  if (!isDemoMode()) notFound();
  const missing = SPRITE_IDS.filter((id) => !AVAILABLE.includes(id));

  return (
    <main className="flex flex-col gap-6">
      <header className="border-b border-primary/30 pb-4">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">[ Dev ]</p>
        <h1 className="text-2xl font-semibold">Sera, every sprite</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {AVAILABLE.length} of {SPRITE_IDS.length} sprites have a picture.{" "}
          {missing.length > 0 ? `Missing, so they fall back to the nearest: ${missing.join(", ")}.` : "None are missing."}
        </p>
      </header>

      <PlayButtons />

      <section aria-labelledby="sprites" className="flex flex-col gap-3">
        <h2 id="sprites" className="font-display text-sm font-semibold uppercase tracking-[0.18em]">
          Sprites
        </h2>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {AVAILABLE.map((id) => (
            <li key={id} className="system-window flex flex-col items-center gap-3 p-4">
              <SeraArt view="half" src={spriteSrc(id)} size={150} />
              <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{id}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="moods" className="flex flex-col gap-3">
        <h2 id="moods" className="font-display text-sm font-semibold uppercase tracking-[0.18em]">
          Moods, as the round avatar
        </h2>
        <ul className="grid grid-cols-3 gap-4 lg:grid-cols-9">
          {MOODS.map((mood) => (
            <li key={mood} className="flex flex-col items-center gap-2">
              <span className="size-14 overflow-hidden rounded-full border-2 border-primary/70 bg-card">
                <SeraArt mood={mood} view="avatar" size={56} />
              </span>
              <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{mood}</p>
              <p className="tabular text-[10px] text-muted-foreground">{spriteFor(mood)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="poses" className="flex flex-col gap-3">
        <h2 id="poses" className="font-display text-sm font-semibold uppercase tracking-[0.18em]">
          Poses
        </h2>
        <ul className="grid grid-cols-4 gap-4 lg:grid-cols-8">
          {POSES.map((pose) => (
            <li key={pose} className="flex flex-col items-center gap-2">
              <SeraArt view="half" pose={pose} size={80} />
              <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{pose}</p>
              <p className="tabular text-[10px] text-muted-foreground">{spriteFor("calm", pose)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="quirks" className="flex flex-col gap-3">
        <h2 id="quirks" className="font-display text-sm font-semibold uppercase tracking-[0.18em]">
          Quirks
        </h2>
        <ul className="grid grid-cols-4 gap-4">
          {QUIRKS.map((quirk) => (
            <li key={quirk} className="flex flex-col items-center gap-2">
              <SeraArt view="half" quirk={quirk} size={80} />
              <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{quirk}</p>
              <p className="tabular text-[10px] text-muted-foreground">{spriteFor("calm", "idle", quirk)}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
