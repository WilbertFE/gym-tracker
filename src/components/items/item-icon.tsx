import {
  AxeIcon,
  CoatHangerIcon,
  CrownIcon,
  DiamondIcon,
  FeatherIcon,
  FireIcon,
  FlameIcon,
  FlowerLotusIcon,
  GearSixIcon,
  HexagonIcon,
  HoodieIcon,
  KnifeIcon,
  LeafIcon,
  LightningIcon,
  MoonIcon,
  MoonStarsIcon,
  MountainsIcon,
  PaletteIcon,
  ShieldCheckIcon,
  ShieldIcon,
  SkullIcon,
  SnowflakeIcon,
  SparkleIcon,
  StarIcon,
  SunHorizonIcon,
  SunIcon,
  WindIcon,
} from "@phosphor-icons/react/ssr";
import type { CSSProperties } from "react";
import { GRADES, type Item } from "@/lib/items";
import { ITEM_ICONS, type ItemIconName } from "@/lib/item-art";
import { cn } from "@/lib/utils";

const ICONS: Record<ItemIconName, typeof ShieldIcon> = {
  Shield: ShieldIcon,
  Diamond: DiamondIcon,
  Star: StarIcon,
  Hexagon: HexagonIcon,
  Crown: CrownIcon,
  Snowflake: SnowflakeIcon,
  Leaf: LeafIcon,
  Wind: WindIcon,
  FlowerLotus: FlowerLotusIcon,
  MoonStars: MoonStarsIcon,
  Sparkle: SparkleIcon,
  Sun: SunIcon,
  Feather: FeatherIcon,
  SunHorizon: SunHorizonIcon,
  Moon: MoonIcon,
  GearSix: GearSixIcon,
  ShieldCheck: ShieldCheckIcon,
  Flame: FlameIcon,
  Mountains: MountainsIcon,
  Fire: FireIcon,
  Palette: PaletteIcon,
  Knife: KnifeIcon,
  Axe: AxeIcon,
  Lightning: LightningIcon,
  Hoodie: HoodieIcon,
  CoatHanger: CoatHangerIcon,
  Skull: SkullIcon,
};

/** The icon of an item. Decorative: the name is always written next to it. */
export function ItemIcon({ id, className }: { id: string; className?: string }) {
  const Icon = ICONS[ITEM_ICONS[id] ?? "Sparkle"];
  return <Icon aria-hidden weight="duotone" className={className} />;
}

/** The item's icon in a round medal tinted with its grade colour. */
export function ItemMedal({ item, size = 28, className }: { item: Pick<Item, "id" | "grade">; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("item-medal shrink-0", className)}
      style={{ "--grade": GRADES[item.grade].color, width: size, height: size } as CSSProperties}
    >
      <ItemIcon id={item.id} className="size-[58%]" />
    </span>
  );
}
