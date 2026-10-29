import type { CSSProperties } from "react";
import { RankBadge } from "@/components/rank-badge";
import { auraKindFor } from "@/lib/item-art";
import { itemById, type Equipment, type FrameStyle } from "@/lib/items";
import type { Rank } from "@/lib/ranks";
import type { ShareTemplate } from "@/lib/share-render";
import { AuraArt } from "./aura-art";
import { LookThumb } from "./look-thumb";
import { Nameplate } from "./nameplate";

type LoadoutPreviewProps = {
  rank: Rank;
  level: number;
  /** The name shown. */
  name: string;
  title: string | null;
  /** What is worn, or what is being tried on. */
  equipment: Equipment;
  /** Tell the viewer this is a preview, not what is saved. */
  previewing?: boolean;
};

/**
 * You, wearing a set of items: your badge with its frame inside its aura, your name with its nameplate, your title
 * and your level glowing in the aura colour, and the share look if one is chosen. Shows what is saved, or a preview of it.
 */
export function LoadoutPreview({ rank, level, name, title, equipment, previewing = false }: LoadoutPreviewProps) {
  const frame = equipment.frame ? itemById(equipment.frame) : null;
  const aura = equipment.aura ? itemById(equipment.aura) : null;
  const plate = equipment.plate ? itemById(equipment.plate) : null;
  const look = equipment.look ? itemById(equipment.look) : null;
  const badge = <RankBadge rank={rank} size={96} decor={(frame?.value as FrameStyle | undefined) ?? null} />;

  return (
    <div className="flex flex-col gap-3" style={aura ? ({ "--aura": aura.value } as CSSProperties) : undefined}>
      {previewing && (
        <p role="status" className="tabular border border-primary/60 bg-primary/10 px-2 py-1 text-[11px] uppercase tracking-widest text-primary">
          Previewing, not saved
        </p>
      )}
      <div className="flex items-center gap-5">
        <span className="flex size-[132px] shrink-0 items-center justify-center">
          {aura ? (
            <AuraArt color={aura.value} kind={auraKindFor(aura.id)} size={96} animated>
              {badge}
            </AuraArt>
          ) : (
            badge
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="break-words text-xl font-bold leading-tight">{name}</p>
          {plate && (
            <p>
              <Nameplate text={plate.value} grade={plate.grade} />
            </p>
          )}
          {title && <p className="text-sm text-muted-foreground">{title}</p>}
          <p className="tabular flex flex-wrap items-baseline gap-x-2">
            <span className="whitespace-nowrap text-[11px] uppercase tracking-widest text-muted-foreground">[ {rank.name} ]</span>
            <span className="text-sm text-muted-foreground">Level</span>
            <span className="text-3xl font-bold leading-none [text-shadow:0_0_18px_var(--aura,var(--primary))]">{level}</span>
          </p>
        </div>
      </div>
      {look && (
        <div className="flex items-center gap-3 border-t pt-3">
          <LookThumb template={look.value as ShareTemplate} width={44} label={`${look.name} share look`} />
          <p className="text-xs text-muted-foreground">
            Share look: <span className="text-foreground">{look.name}</span>
          </p>
        </div>
      )}
    </div>
  );
}
