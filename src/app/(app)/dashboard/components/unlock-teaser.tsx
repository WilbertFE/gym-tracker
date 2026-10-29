import { LockSimpleIcon } from "@phosphor-icons/react/ssr";
import { Panel } from "@/components/panel";
import { nextUnlocks } from "@/lib/unlocks";
import { xpForLevel } from "@/lib/xp";

/**
 * The next one or two things that open, with how far away they are. Everything else stays hidden, so a
 * new user sees a short list of what is coming instead of the whole app at once.
 */
export function UnlockTeaser({ level, totalXp }: { level: number; totalXp: number }) {
  const upcoming = nextUnlocks(level, 2);
  if (upcoming.length === 0) return null;

  // Features that open at the same level are shown together under one line.
  const first = upcoming[0].level;
  const group = upcoming.filter((f) => f.level === first);
  const away = Math.max(0, xpForLevel(first) - totalXp);

  return (
    <Panel label="Next unlock" variant="system" tour="next-unlock">
      <div className="flex items-center gap-4">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center border border-primary/60 text-primary">
          <LockSimpleIcon className="size-6" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm font-medium">{group.map((f) => f.name).join(" and ")}</p>
          <p className="text-xs text-muted-foreground">{group[0].blurb}</p>
        </div>
        <div className="tabular shrink-0 text-right text-xs">
          <p className="text-primary">Level {first}</p>
          <p className="text-muted-foreground">{away.toLocaleString("en-US")} XP away</p>
        </div>
      </div>
    </Panel>
  );
}
