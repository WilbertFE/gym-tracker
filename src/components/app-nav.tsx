"use client";

import {
  BarbellIcon,
  CalendarBlankIcon,
  DotsThreeIcon,
  GaugeIcon,
  IdentificationCardIcon,
  PersonSimpleIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: GaugeIcon },
  { href: "/workouts", label: "Workouts", icon: BarbellIcon },
  { href: "/body", label: "Body", icon: PersonSimpleIcon },
  { href: "/schedule", label: "Schedule", icon: CalendarBlankIcon },
  { href: "/membership", label: "More", icon: DotsThreeIcon },
] as const;

function useSignOut() {
  const router = useRouter();
  return async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };
}

export function AppNav() {
  const pathname = usePathname();
  const signOut = useSignOut();

  return (
    <>
      {/* Desktop left rail */}
      <nav
        aria-label="Primary"
        className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r bg-card p-4 md:flex"
      >
        <p className="tabular mb-8 text-[11px] uppercase tracking-widest text-primary">
          GymTrack
        </p>
        <ul className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 border-l-2 px-3 text-sm transition-colors",
                    active
                      ? "border-primary bg-surface-raised text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label === "More" ? (
                    <IdentificationCardIcon className="size-4" aria-hidden />
                  ) : (
                    <Icon className="size-4" aria-hidden />
                  )}
                  {label === "More" ? "Membership" : label}
                </Link>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-11 items-center gap-3 px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <SignOutIcon className="size-4" aria-hidden />
          Sign out
        </button>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card md:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-wider transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
