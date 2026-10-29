import { NextResponse } from "next/server";
import { badRequest, guard } from "@/lib/api";
import { itemById } from "@/lib/items";
import { loadLevel } from "@/lib/level";
import { setEquipment } from "@/lib/repositories/chests";
import { equipSchema } from "@/lib/validation/chest";

/** What is worn, one item per slot. */
export async function GET() {
  const g = await guard("equipment", { write: false });
  if (g.error) return g.error;
  const { collection } = await loadLevel(g.userId);
  return NextResponse.json({ data: collection.equipment });
}

/** Puts an owned item on, or takes a slot's item off with `itemId: null`. */
export async function PUT(request: Request) {
  const g = await guard("equipment", { write: true, limit: 30 });
  if (g.error) return g.error;

  const parsed = equipSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest();
  const { slot, itemId } = parsed.data;

  const { collection } = await loadLevel(g.userId);
  if (itemId !== null) {
    const item = itemById(itemId);
    if (!item || item.slot !== slot) return badRequest("That item does not fit this slot.");
    if (!collection.owned.includes(item.id)) return badRequest("You do not own that item yet.");
  }

  const equipment = { ...collection.equipment, [slot]: itemId };
  await setEquipment(g.userId, equipment);
  return NextResponse.json({ data: equipment });
}
