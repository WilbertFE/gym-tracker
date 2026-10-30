import { HeroArt } from "@/components/battle/hero-art";
import { RankBadge } from "@/components/rank-badge";
import type { FrameStyle, Item } from "@/lib/items";
import { auraKindFor } from "@/lib/item-art";
import type { Rank } from "@/lib/ranks";
import type { ShareTemplate } from "@/lib/share-render";
import { AuraArt } from "./aura-art";
import { LookThumb } from "./look-thumb";
import { Nameplate } from "./nameplate";

/**
 * What an item looks like, whatever it is: a frame on your own badge, an aura around it, a nameplate in its grade's
 * dress, or the real share look drawn small. `animated` lets an aura move, for one that is shown large.
 */
export function ItemArt({ item, rank, size = 88, animated = false }: { item: Item; rank: Rank; size?: number; animated?: boolean }) {
  if (item.slot === "frame") {
    return <RankBadge rank={rank} size={size} decor={item.value as FrameStyle} />;
  }

  if (item.slot === "aura") {
    const inner = Math.round(size * 0.62);
    return (
      <span className="flex items-center justify-center" style={{ width: size, height: size }}>
        <AuraArt color={item.value} kind={auraKindFor(item.id)} size={inner} animated={animated}>
          <RankBadge rank={rank} size={inner} />
        </AuraArt>
      </span>
    );
  }

  if (item.slot === "weapon" || item.slot === "outfit") {
    // Gear is shown on the hero herself, so you see what it does to her.
    return (
      <span className="flex items-end justify-center overflow-visible" style={{ width: size, height: size }}>
        <HeroArt size={Math.round(size * 0.82)} blade={item.slot === "weapon" ? item.value : undefined} outfit={item.slot === "outfit" ? item.value : null} />
      </span>
    );
  }

  if (item.slot === "plate") {
    return <Nameplate text={item.value} grade={item.grade} size="md" />;
  }

  return <LookThumb template={item.value as ShareTemplate} width={Math.round(size * 0.72)} label={`${item.name} share look`} />;
}
