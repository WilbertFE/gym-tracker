import { cookies } from "next/headers";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { XpWatcher } from "@/components/xp-watcher";
import { isDemoMode } from "@/lib/demo";
import { LEVEL_COOKIE, parseLevelCookie, SHOW_ALL_COOKIE } from "@/lib/feature-prefs";

/**
 * The navigation, with the items that have not unlocked yet left out. The level comes from a cookie the
 * XP watcher keeps up to date, so this costs no database work on every page. It only decides what the
 * menu shows: each locked page still checks the real level itself.
 */
async function Nav() {
  const jar = await cookies();
  return <AppNav level={parseLevelCookie(jar.get(LEVEL_COOKIE)?.value)} showAll={jar.get(SHOW_ALL_COOKIE)?.value === "1"} />;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex-1 md:pl-56">
      {/* usePathname() and cookies are runtime data on dynamic routes, so the nav streams in. */}
      <Suspense fallback={null}>
        <Nav />
      </Suspense>
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 md:pb-8">
        {isDemoMode() && (
          <p
            role="status"
            className="tabular mb-4 border border-dashed px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground"
          >
            Demo mode: dummy data, resets on server restart
          </p>
        )}
        {children}
      </div>
      <XpWatcher />
    </div>
  );
}
