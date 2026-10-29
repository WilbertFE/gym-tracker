import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeraArt } from "@/components/mascot/sera-art";
import { isDemoMode } from "@/lib/demo";
import { MOODS } from "@/lib/mascot/types";

export const metadata: Metadata = {
  title: "Sera sheet",
  description: "Every mood of Sera, for reviewing her drawing. Demo mode only.",
  robots: { index: false, follow: false },
};

/** A dev only sheet of Sera in every mood, at chat size and avatar size. It does not exist outside demo mode. */
export default function SeraSheetPage() {
  if (!isDemoMode()) notFound();

  return (
    <main className="flex flex-col gap-6">
      <header className="border-b border-primary/30 pb-4">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">[ Dev ]</p>
        <h1 className="text-2xl font-semibold">Sera, every mood</h1>
      </header>

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {MOODS.map((mood) => (
          <li key={mood} className="system-window flex flex-col items-center gap-3 p-4">
            <SeraArt mood={mood} size={200} />
            <div className="flex items-center gap-4">
              <SeraArt mood={mood} view="avatar" size={56} />
              <SeraArt mood={mood} view="avatar" size={56} talking />
            </div>
            <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{mood}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
