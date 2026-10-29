import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeraArt } from "@/components/mascot/sera-art";
import { isDemoMode } from "@/lib/demo";
import { MOODS, POSES, QUIRKS, type Mood } from "@/lib/mascot/types";
import { PlayButtons } from "./play-buttons";

export const metadata: Metadata = {
  title: "Sera sheet",
  description: "Every mood, pose and quirk of Sera, for reviewing her drawing. Demo mode only.",
  robots: { index: false, follow: false },
};

/** The face that goes with each pose on this sheet. */
const POSE_MOOD: Record<(typeof POSES)[number], Mood> = {
  idle: "calm",
  wave: "happy",
  point: "smug",
  cheer: "cheer",
  smug: "smug",
  crossed: "annoyed",
  taunt: "smug",
  hairflip: "smug",
};

/** A dev only sheet: Sera in every mood, pose and quirk at the sizes the app uses, and the big appearances and tours to play. It does not exist outside demo mode. */
export default function SeraSheetPage() {
  if (!isDemoMode()) notFound();

  return (
    <main className="flex flex-col gap-6">
      <header className="border-b border-primary/30 pb-4">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">[ Dev ]</p>
        <h1 className="text-2xl font-semibold">Sera, every mood, pose and quirk</h1>
      </header>

      <PlayButtons />

      <section aria-labelledby="moods" className="flex flex-col gap-3">
        <h2 id="moods" className="font-display text-sm font-semibold uppercase tracking-[0.18em]">
          Moods
        </h2>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {MOODS.map((mood) => (
            <li key={mood} className="system-window flex flex-col items-center gap-3 p-4">
              <SeraArt mood={mood} size={200} />
              <div className="flex items-center gap-4">
                {[false, true].map((talking) => (
                  <span key={String(talking)} className="size-14 overflow-hidden rounded-full border-2 border-primary/70 bg-card">
                    <SeraArt mood={mood} view="avatar" size={60} talking={talking} className="mx-auto mt-0.5" />
                  </span>
                ))}
              </div>
              <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{mood}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="poses" className="flex flex-col gap-3">
        <h2 id="poses" className="font-display text-sm font-semibold uppercase tracking-[0.18em]">
          Poses, half body
        </h2>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {POSES.map((pose) => (
            <li key={pose} className="system-window flex flex-col items-center gap-3 overflow-hidden p-4 pb-0">
              <SeraArt view="half" pose={pose} mood={POSE_MOOD[pose]} size={190} />
              <p className="tabular -mt-6 pb-3 text-[11px] uppercase tracking-widest text-muted-foreground">{pose}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="quirks" className="flex flex-col gap-3">
        <h2 id="quirks" className="font-display text-sm font-semibold uppercase tracking-[0.18em]">
          Quirks
        </h2>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {QUIRKS.map((quirk) => (
            <li key={quirk} className="system-window flex flex-col items-center gap-3 p-4">
              <SeraArt quirk={quirk} mood="smug" size={150} />
              <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{quirk}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
