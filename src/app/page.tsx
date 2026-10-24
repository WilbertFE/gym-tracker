import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/metadata";
import { SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "GymTrack",
  description: SITE_DESCRIPTION,
  path: "/",
  keywords: ["gym tracker", "workout log", "muscle heatmap", "body weight"],
  index: true,
});

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-8 px-4">
      <header className="flex flex-col gap-3">
        <p className="tabular text-[11px] uppercase tracking-widest text-primary">GymTrack</p>
        <h1 className="text-4xl font-semibold">Train with data, not guesswork.</h1>
        <p className="text-muted-foreground">{SITE_DESCRIPTION}</p>
      </header>
      <nav aria-label="Get started">
        <Link
          href="/login"
          className="inline-flex h-11 items-center bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          Sign in
        </Link>
      </nav>
    </main>
  );
}
