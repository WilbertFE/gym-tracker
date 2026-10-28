import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { FEATURES } from "@/lib/unlocks";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "How it works",
  description: "A short guide to check-ins, XP, levels, ranks, quests, boosters and the leaderboard.",
  path: "/guide",
  keywords: ["how it works", "xp", "levels"],
});

const CARDS = [
  {
    title: "Check in",
    body: "Once a day, say how you trained: at the gym, a workout at home, or a rest day. Only a gym check-in needs you to be at your gym. Rest days count too, they keep your streak alive.",
  },
  {
    title: "XP and levels",
    body: "Check-ins, workouts, sets, weigh-ins, measurements and photos all earn XP. Levels come fast at the start and take a little more each time.",
  },
  {
    title: "Ranks",
    body: "Every few levels you earn a new rank with its own badge, from Warm-Up up to God of Gains. The level page shows the whole ladder.",
  },
  {
    title: "Quests",
    body: "Three small goals every day and three every week, for bonus XP. They tick themselves as you log, there is nothing to claim.",
  },
  {
    title: "Boosters",
    body: "New accounts get double XP for the first week. After that, training earns Double XP Day boosters that you use on a day you choose.",
  },
  {
    title: "Leaderboard",
    body: "Join with a nickname to compare XP with others, worldwide or in your country, all time or this week. You stay hidden until you join.",
  },
] as const;

export default function GuidePage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader label="Help" title="How it works" description="Everything in a minute. You do not need to read it all, the app shows you the next step." />

      <ul className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card, i) => (
          <li key={card.title} className="flex flex-col gap-2 border bg-card p-4">
            <p className="tabular text-[11px] uppercase tracking-widest text-primary">Step {i + 1}</p>
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="text-sm text-muted-foreground">{card.body}</p>
          </li>
        ))}
      </ul>

      <section aria-label="What opens when" className="border bg-card p-4">
        <h2 className="mb-1 text-lg font-semibold">What opens when</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          The app shows itself in steps. Each of these opens when you reach the level, so the first days stay simple.
        </p>
        <ol className="flex flex-col divide-y border">
          {FEATURES.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
              <span>{f.name}</span>
              <span className="tabular text-xs text-muted-foreground">Level {f.level}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          Want everything now? Turn on &quot;Show all features&quot; in{" "}
          <Link href="/settings" className="underline underline-offset-4">
            Settings
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
