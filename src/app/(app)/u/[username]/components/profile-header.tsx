import type { CSSProperties } from "react";
import { HeroFigure } from "@/components/battle/hero-art";
import { Nameplate } from "@/components/items/nameplate";
import { NO_EQUIPMENT, type Equipment } from "@/lib/items";
import type { PublicProfile } from "@/lib/profile";

/** What the player wears, as the hero needs it. Only the worn items the profile exposes are here, so a hidden collection gives a plain hero. */
export function equipmentOf(worn: NonNullable<PublicProfile["collection"]>["worn"] | undefined): Equipment {
  const equipment: Equipment = { ...NO_EQUIPMENT };
  for (const [slot, item] of Object.entries(worn ?? {})) {
    if (item) equipment[slot as keyof Equipment] = item.id;
  }
  return equipment;
}

/**
 * The top of a profile: the player's character, wearing the aura, frame, weapon and outfit they chose (when the collection
 * is shared) and the badge of their rank (when the level is shared), then the name, nameplate, rank and level.
 */
export function ProfileHeader({ view }: { view: PublicProfile }) {
  const worn = view.collection?.worn ?? {};
  const aura = worn.aura?.value;
  const style = aura ? ({ "--aura": aura } as CSSProperties) : undefined;
  const rank = view.level ? view.level.rank : undefined;
  const wornNames = Object.values(worn).map((item) => item.name);

  return (
    <section aria-label="Player" data-tour="player" className="system-window p-4 sm:p-6" data-glow style={style}>
      <div className="flex items-center gap-4 sm:gap-6">
        <span className="flex w-[150px] shrink-0 items-center justify-center" data-testid="profile-hero">
          <HeroFigure rank={rank} equipment={equipmentOf(worn)} size={160} />
          <span className="sr-only">
            The character of {view.displayName}
            {wornNames.length > 0 ? `, wearing ${wornNames.join(", ")}` : ""}.
          </span>
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">@{view.username}</p>
          <h1 className="break-words text-3xl font-bold leading-tight">{view.displayName}</h1>
          {(worn.plate || view.level?.title) && (
            <p className="flex flex-wrap items-center gap-2">
              {worn.plate && <Nameplate text={worn.plate.value} grade={worn.plate.grade} />}
              {view.level?.title && <span className="text-sm text-muted-foreground">{view.level.title}</span>}
            </p>
          )}
          {view.level && (
            <p className="tabular flex flex-wrap items-baseline gap-x-2">
              <span className="whitespace-nowrap text-[11px] uppercase tracking-widest text-muted-foreground">[ {view.level.rank.name} ]</span>
              <span className="text-sm text-muted-foreground">Level</span>
              <span className="text-3xl font-bold leading-none [text-shadow:0_0_18px_var(--aura,var(--primary))]">{view.level.level}</span>
            </p>
          )}
        </div>
      </div>
      {view.bio && <p className="mt-4 border-t pt-4 text-sm">{view.bio}</p>}
      {view.level && (
        <p className="tabular mt-3 text-xs text-muted-foreground">{view.level.xp.toLocaleString("en-US")} XP in total</p>
      )}
    </section>
  );
}
