"use client";

import {
  BarbellIcon,
  CalendarBlankIcon,
  GaugeIcon,
  GearSixIcon,
  IdentificationCardIcon,
  SealCheckIcon,
  RankingIcon,
  PersonSimpleIcon,
  SignOutIcon,
  TreasureChestIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SITE_NAME } from "@/lib/site";
import { isUnlocked, type FeatureId } from "@/lib/unlocks";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof GaugeIcon;
  /** Also highlighted for these paths. */
  alsoActive?: string;
  /** Phones have room for five tabs, so Membership is reached from Settings there. */
  desktopOnly?: boolean;
  /** Hidden until this feature has opened. */
  feature?: FeatureId;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: GaugeIcon },
  { href: "/workouts", label: "Workouts", icon: BarbellIcon },
  { href: "/body", label: "Body", icon: PersonSimpleIcon },
  { href: "/schedule", label: "Schedule", icon: CalendarBlankIcon },
  { href: "/status", label: "Status", icon: SealCheckIcon, desktopOnly: true, feature: "status" },
  { href: "/collection", label: "Collection", icon: TreasureChestIcon, desktopOnly: true, feature: "chests" },
  { href: "/leaderboard", label: "Leaderboard", icon: RankingIcon, desktopOnly: true, feature: "leaderboard" },
  { href: "/membership", label: "Membership", icon: IdentificationCardIcon, desktopOnly: true },
  { href: "/settings", label: "Settings", icon: GearSixIcon, alsoActive: "/membership" },
];

const isActive = (pathname: string, item: NavItem, desktop: boolean) =>
  pathname.startsWith(item.href) || (!desktop && !!item.alsoActive && pathname.startsWith(item.alsoActive));

function useSignOut() {
  const router = useRouter();
  return async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };
}

export function AppNav({ level, showAll }: { level: number; showAll: boolean }) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const items = NAV_ITEMS.filter((item) => !item.feature || isUnlocked(item.feature, level, showAll));

  return (
    <>
      {/* Desktop left rail */}
      <nav
        aria-label="Primary"
        className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-primary/25 bg-sidebar p-4 shadow-[8px_0_40px_-20px_var(--primary)] md:flex"
      >
        <p className="font-display mb-8 text-xs font-semibold uppercase tracking-[0.25em] text-primary [text-shadow:0_0_12px_var(--primary)]">
          {SITE_NAME}
        </p>
        <ul className="flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const { href, label, icon: Icon } = item;
            const active = isActive(pathname, item, true);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 border-l-2 px-3 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-foreground shadow-[inset_10px_0_18px_-14px_var(--primary)]"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/30 bg-sidebar/95 shadow-[0_-8px_30px_-16px_var(--primary)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {items.filter((item) => !item.desktopOnly).map((item) => {
            const { href, label, icon: Icon } = item;
            const active = isActive(pathname, item, false);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-wider transition-colors",
                    active ? "text-primary [&_svg]:drop-shadow-[0_0_6px_var(--primary)]" : "text-muted-foreground",
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
