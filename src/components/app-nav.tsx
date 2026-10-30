"use client";

import {
  BarbellIcon,
  DotsThreeOutlineIcon,
  CalendarBlankIcon,
  GaugeIcon,
  GearSixIcon,
  IdentificationCardIcon,
  SealCheckIcon,
  RankingIcon,
  PersonSimpleIcon,
  SignOutIcon,
  TreasureChestIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePathname, useRouter } from "next/navigation";
import { SITE_NAME } from "@/lib/site";
import { isUnlocked, type FeatureId } from "@/lib/unlocks";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof GaugeIcon;
  /** Highlighted on every page under this prefix too, on desktop and phones. */
  matchPrefix?: string;
  /** A tab of the phone bar. Every other page is reached from its More tab, so a phone can open any page in two taps. */
  mobileTab?: boolean;
  /** Hidden until this feature has opened. */
  feature?: FeatureId;
  /** The section it sits in, in the rail and in the More sheet. The three tabs have none. */
  group?: NavGroup;
};

type NavGroup = "progress" | "social" | "manage";

/** The sections in order, with the heading each one has. */
const GROUPS: { id: NavGroup; label: string }[] = [
  { id: "progress", label: "Progress" },
  { id: "social", label: "Social" },
  { id: "manage", label: "Manage" },
];

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: GaugeIcon, mobileTab: true },
  { href: "/workouts", label: "Workouts", icon: BarbellIcon, mobileTab: true },
  { href: "/body", label: "Body", icon: PersonSimpleIcon, mobileTab: true, feature: "body" },
  { href: "/status", label: "Status", icon: SealCheckIcon, feature: "status", group: "progress" },
  { href: "/collection", label: "Collection", icon: TreasureChestIcon, feature: "collection", group: "progress" },
  { href: "/profile", label: "Profile", icon: UserCircleIcon, matchPrefix: "/u/", feature: "profile", group: "progress" },
  { href: "/leaderboard", label: "Leaderboard", icon: RankingIcon, feature: "leaderboard", group: "social" },
  { href: "/friends", label: "Friends", icon: UsersThreeIcon, feature: "friends", group: "social" },
  { href: "/schedule", label: "Schedule", icon: CalendarBlankIcon, feature: "schedule", group: "manage" },
  { href: "/membership", label: "Membership", icon: IdentificationCardIcon, feature: "membership", group: "manage" },
  { href: "/settings", label: "Settings", icon: GearSixIcon, group: "manage" },
];

const isActive = (pathname: string, item: NavItem) =>
  pathname.startsWith(item.href) || (!!item.matchPrefix && pathname.startsWith(item.matchPrefix));

function useSignOut() {
  const router = useRouter();
  return async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };
}

/** One entry of the desktop rail. */
function railItem(item: NavItem, pathname: string) {
  const { href, label, icon: Icon } = item;
  const active = isActive(pathname, item);
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
}

export function AppNav({ level, showAll }: { level: number; showAll: boolean }) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = NAV_ITEMS.filter((item) => !item.feature || isUnlocked(item.feature, level, showAll));
  const tabs = items.filter((item) => item.mobileTab);
  // Every page that is not a tab lives in the More sheet, so nothing is out of reach on a phone. A section with nothing open yet is left out.
  const sections = GROUPS.map((g) => ({ ...g, items: items.filter((item) => item.group === g.id) })).filter((g) => g.items.length > 0);
  const moreActive = sections.some((g) => g.items.some((item) => isActive(pathname, item)));

  return (
    <>
      {/* Desktop left rail */}
      <nav
        aria-label="Primary"
        data-tour="nav"
        className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-primary/25 bg-sidebar p-4 shadow-[8px_0_40px_-20px_var(--primary)] md:flex"
      >
        <p className="font-display mb-8 text-xs font-semibold uppercase tracking-[0.25em] text-primary [text-shadow:0_0_12px_var(--primary)]">
          {SITE_NAME}
        </p>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          <ul className="flex flex-col gap-1">{tabs.map((item) => railItem(item, pathname))}</ul>
          {sections.map((g) => (
            <section key={g.id} aria-labelledby={`nav-${g.id}`} className="flex flex-col gap-1">
              <h2 id={`nav-${g.id}`} className="font-display px-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                {g.label}
              </h2>
              <ul className="flex flex-col gap-1">{g.items.map((item) => railItem(item, pathname))}</ul>
            </section>
          ))}
        </div>
        <ConfirmDialog
          title="Sign out?"
          description="You will need to sign in again to see your training."
          confirmLabel="Sign out"
          onConfirm={signOut}
          trigger={
            <button
              type="button"
              className="flex min-h-11 items-center gap-3 px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              <SignOutIcon className="size-4" aria-hidden />
              Sign out
            </button>
          }
        />
      </nav>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Primary"
        data-tour="nav"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/30 bg-sidebar/95 shadow-[0_-8px_30px_-16px_var(--primary)] backdrop-blur md:hidden"
      >
        <ul className="grid auto-cols-fr grid-flow-col">
          {tabs.map((item) => {
            const { href, label, icon: Icon } = item;
            const active = isActive(pathname, item);
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
          <li>
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-current={moreActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-wider transition-colors",
                    moreActive ? "text-primary [&_svg]:drop-shadow-[0_0_6px_var(--primary)]" : "text-muted-foreground",
                  )}
                >
                  <DotsThreeOutlineIcon className="size-5" aria-hidden />
                  More
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto border-primary/30 pb-[env(safe-area-inset-bottom)]">
                <SheetHeader>
                  <SheetTitle className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-primary">More</SheetTitle>
                  <SheetDescription className="sr-only">Every other page of the app.</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 px-4">
                  {sections.map((g) => (
                    <section key={g.id} aria-labelledby={`more-${g.id}`} className="flex flex-col gap-2">
                      <h3 id={`more-${g.id}`} className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                        {g.label}
                      </h3>
                      <ul className="grid grid-cols-3 gap-2">
                        {g.items.map((item) => {
                          const { href, label, icon: Icon } = item;
                          const active = isActive(pathname, item);
                          return (
                            <li key={href}>
                              <Link
                                href={href}
                                onClick={() => setMoreOpen(false)}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                  "flex min-h-20 flex-col items-center justify-center gap-2 border p-2 text-center text-xs transition-colors",
                                  active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                                )}
                              >
                                <Icon className="size-6" aria-hidden />
                                {label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
                <SheetFooter>
                  <ConfirmDialog
                    title="Sign out?"
                    description="You will need to sign in again to see your training."
                    confirmLabel="Sign out"
                    onConfirm={signOut}
                    trigger={
                      <button
                        type="button"
                        className="flex min-h-11 items-center justify-center gap-2 border border-border text-sm text-muted-foreground hover:text-foreground"
                      >
                        <SignOutIcon className="size-4" aria-hidden />
                        Sign out
                      </button>
                    }
                  />
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </li>
        </ul>
      </nav>
    </>
  );
}
