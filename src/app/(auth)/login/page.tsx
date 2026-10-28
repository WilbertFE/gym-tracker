import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";
import { SITE_NAME } from "@/lib/site";
import { LoginForm } from "./components/login-form";

export const metadata: Metadata = buildMetadata({
  title: "Sign in",
  description: `Sign in to ${SITE_NAME} to log workouts, weight and check-ins and keep leveling up.`,
  path: "/login",
  keywords: ["muscles leveling login", "gym tracker login", "sign in"],
  index: true,
});

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-4">
      <header className="flex flex-col gap-2">
        <p className="tabular text-[11px] uppercase tracking-widest text-primary">{SITE_NAME}</p>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Log workouts, weight and check-ins.</p>
      </header>
      <section aria-label="Sign in form" className="border bg-card p-4">
        <LoginForm />
      </section>
    </main>
  );
}
