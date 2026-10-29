import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/metadata";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  path: "/",
  keywords: ["muscles leveling", "gym tracker", "workout rpg", "workout log", "muscle heatmap"],
  index: true,
});

const STEPS = [
  { tag: "Check in", text: "Gym, home or rest day, every one counts." },
  { tag: "Train", text: "Log your sets and see which muscles you worked." },
  { tag: "Level up", text: "Earn XP, climb 13 ranks and clear a boss every week." },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10">
      <section aria-label="Welcome" className="system-window p-6 sm:p-8" data-glow>
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
          [ System ] {SITE_NAME}
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight">You have been chosen as a Player.</h1>
        <p className="mt-3 text-muted-foreground">{SITE_DESCRIPTION}</p>
        <ul className="mt-6 flex flex-col gap-3 border-t border-primary/25 pt-5">
          {STEPS.map((step) => (
            <li key={step.tag} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
              <span className="font-display w-24 shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                [ {step.tag} ]
              </span>
              <span className="text-sm">{step.text}</span>
            </li>
          ))}
        </ul>
        <nav aria-label="Get started" className="mt-8">
          <Link
            href="/login"
            className="font-display inline-flex h-11 items-center bg-primary px-6 text-sm font-semibold tracking-wide text-primary-foreground shadow-[0_0_18px_-3px_var(--primary)] transition-shadow hover:shadow-[0_0_26px_-2px_var(--primary)]"
          >
            Sign in
          </Link>
        </nav>
      </section>
    </main>
  );
}
