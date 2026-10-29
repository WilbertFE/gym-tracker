import { RankBadge } from "@/components/rank-badge";
import { GRADES, LOOK_COLORS, type FrameStyle, type Item } from "@/lib/items";
import type { Rank } from "@/lib/ranks";

/**
 * What an item looks like, by slot: a frame around your rank badge, an aura around a number, a nameplate,
 * or a swatch of a share look. Used on the reveal card and in the collection.
 */
export function ItemPreview({ item, rank, size = 88 }: { item: Item; rank: Rank; size?: number }) {
  const grade = GRADES[item.grade].color;

  if (item.slot === "frame") {
    return <RankBadge rank={rank} size={size} decor={item.value as FrameStyle} />;
  }

  if (item.slot === "aura") {
    return (
      <span
        aria-hidden
        className="flex items-center justify-center"
        style={{ width: size, height: size, background: `radial-gradient(circle, ${item.value}55 0%, transparent 68%)` }}
      >
        <span className="tabular text-3xl font-bold" style={{ color: item.value, textShadow: `0 0 18px ${item.value}` }}>
          42
        </span>
      </span>
    );
  }

  if (item.slot === "plate") {
    return (
      <span
        aria-hidden
        className="font-display inline-flex h-9 items-center border px-3 text-xs font-semibold uppercase tracking-[0.2em]"
        style={{ borderColor: grade, color: grade, boxShadow: `0 0 14px -4px ${grade}` }}
      >
        {item.value}
      </span>
    );
  }

  const look = LOOK_COLORS[item.value];
  return (
    <span
      aria-hidden
      className="relative block border"
      style={{
        width: size * 0.62,
        height: size,
        borderColor: look?.accent ?? grade,
        background: `linear-gradient(170deg, ${look?.from ?? "#111"}, ${look?.to ?? "#000"})`,
      }}
    >
      <span className="absolute left-2 top-2 h-1 w-6" style={{ background: look?.accent }} />
      <span className="absolute inset-x-2 bottom-3 h-px" style={{ background: look?.accent, opacity: 0.6 }} />
      <span className="absolute inset-x-2 bottom-6 h-px" style={{ background: look?.accent, opacity: 0.35 }} />
    </span>
  );
}
